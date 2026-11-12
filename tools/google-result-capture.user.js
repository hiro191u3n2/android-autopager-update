// ==UserScript==
// @name         Google 区切り箇所の一度だけ取得
// @namespace    https://hiro191u3n2.github.io/android-autopager-update/
// @version      1.1.0
// @description  タップした検索結果の構造をファイル・共有・コピー用の文字で取得。自動送信・常設ログなし。
// @match        https://www.google.com/search*
// @match        https://google.com/search*
// @match        https://www.google.co.jp/search*
// @match        https://google.co.jp/search*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const DONE = '__googleResultStructureCaptureDone_v1_1';
  const UI = 'google-result-capture-ui';
  const limits = { maxNodes: 12000, maxBytes: 12 * 1024 * 1024, maxAncestors: 64 };
  const route = () => /^(?:www\.)?google\.(?:com|co\.jp)$/.test(location.hostname) &&
    location.pathname === '/search' && new URL(location.href).searchParams.get('udm') !== '50';
  if (window.top !== window.self || !route() || document.getElementById(UI)) return;
  const ownStorage = (write = false) => {
    for (const name of ['localStorage', 'sessionStorage']) {
      try {
        if (write) { window[name].setItem(DONE, '1'); return false; }
        if (window[name].getItem(DONE) === '1') return true;
      } catch (_) { /* Only this helper's boolean key is accessed. */ }
    }
    return false;
  };
  if (ownStorage()) return;
  const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
  const rectOf = node => {
    const r = node.getBoundingClientRect();
    return Object.fromEntries(['x', 'y', 'left', 'top', 'right', 'bottom', 'width', 'height'].map(key => [key, r[key]]));
  };
  function chooseRoot(target) {
    const imported = target.closest('.generic-autopager-google-source-root');
    if (imported) return { root: imported, kind: 'imported', initial: false };
    const page = target.closest('.generic-autopager-page');
    if (page) return { root: page, kind: 'imported-page', initial: false };
    const root = target.closest('#rso') || target.closest('#search');
    if (!root) throw new Error('検索結果の見出しや説明文をタップしてください。');
    return { root, kind: 'initial', initial: true };
  }
  async function capture(target) {
    if (!route()) throw new Error('Google検索の画面で実行してください。');
    const chosen = chooseRoot(target), root = chosen.root;
    const startURL = location.href, omitted = Object.create(null);
    const viewportSnapshot = () => {
      const vv = window.visualViewport;
      return { viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollX, scrollY },
        visualViewport: vv ? { width: vv.width, height: vv.height, scale: vv.scale, offsetTop: vv.offsetTop, offsetLeft: vv.offsetLeft } : null };
    };
    const startViewport = viewportSnapshot();
    const omit = reason => { omitted[reason] = (omitted[reason] || 0) + 1; };
    const safeURL = value => {
      if (!value) return '';
      try {
        let url = new URL(value, root.ownerDocument.baseURI);
        if (/^(?:www\.)?google\.(?:com|co\.jp)$/.test(url.hostname) && url.pathname === '/url') {
          const destination = url.searchParams.get('q') || url.searchParams.get('url');
          if (destination) url = new URL(destination, url);
        }
        if (!/^https?:$/.test(url.protocol)) { omit('non-http URL'); return ''; }
        if (url.username || url.password || url.search || url.hash) omit('URL credentials/query/fragment');
        url.username = ''; url.password = ''; url.search = ''; url.hash = '';
        url.pathname = url.pathname.replace(/\/(token|session|auth|oauth|sso)\/[^/]+/gi, '/$1/[removed]');
        return url.href;
      } catch (_) { omit('invalid URL'); return ''; }
    };
    const safeCSS = value => value.replace(/url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/gi,
      (_, quote, quoted, bare) => { const url = safeURL((quoted || bare || '').trim()); return url ? `url("${url.replace(/["\\]/g, '\\$&')}")` : 'none'; });
    const styleTable = [], styleIds = new Map();
    const styleOf = (node, pseudo) => {
      const computed = getComputedStyle(node, pseudo), entries = [];
      for (const name of computed) {
        if (name.startsWith('--')) continue;
        entries.push([name, safeCSS(computed.getPropertyValue(name))]);
      }
      const value = Object.fromEntries(entries), key = JSON.stringify(value);
      if (!styleIds.has(key)) { styleIds.set(key, styleTable.length); styleTable.push(value); }
      return styleIds.get(key);
    };
    const pseudoOf = node => {
      const result = {};
      for (const name of ['::before', '::after']) {
        const css = getComputedStyle(node, name);
        if (css.content && !/^(?:none|normal)$/.test(css.content) && css.display !== 'none') result[name] = styleOf(node, name);
      }
      return result;
    };
    const allowed = /^(?:id|class|title|alt|dir|lang|role|hidden|inert|width|height|colspan|rowspan|open|aria-[a-z-]+|data-dtld|data-snhf|data-page|data-generic-[a-z0-9-]+)$/i;
    const skipped = 'script,noscript,style,link,meta,base,iframe,object,embed,form,input,textarea,select,[contenteditable]:not([contenteditable="false"]),#gb,[data-ogpc],[data-google-account]';
    if (target.closest(skipped)) throw new Error('入力欄ではなく、検索結果の見出しや説明文を選んでください。');
    const excluded = node => node.matches(skipped) || node.id === UI || chosen.initial && node !== root &&
      node.matches('.generic-autopager-page,.generic-autopager-google-source-root');
    const countWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: node => excluded(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let nodeCount = 1;
    while (countWalker.nextNode()) if (++nodeCount > limits.maxNodes) {
      throw new Error(`対象ページが大きすぎます（上限${limits.maxNodes}要素）。別の区切り箇所を選んでください。`);
    }
    const inert = document.implementation.createHTMLDocument('');
    const holder = inert.createElement('div'), elements = [], originals = [], texts = [], headings = [];
    const stack = [{ node: root, parent: holder, parentIndex: null }];
    let selectedIndex = null, batchStart = performance.now(), visited = 0;
    while (stack.length) {
      if (++visited % 64 === 0 || performance.now() - batchStart >= 6) {
        await yieldTask(); batchStart = performance.now();
        if (!root.isConnected || location.href !== startURL) throw new Error('取得中にページが変わりました。もう一度取得してください。');
      }
      const { node, parent, parentIndex } = stack.pop();
      if (node.nodeType === Node.TEXT_NODE) {
        texts.push({ node, value: node.data, parent: node.parentNode });
        parent.appendChild(inert.createTextNode(node.data)); continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (excluded(node)) { omit('excluded subtree'); continue; }
      if (elements.length >= limits.maxNodes) throw new Error(`対象ページが大きすぎます（上限${limits.maxNodes}要素）。別の区切り箇所を選んでください。`);
      const copy = inert.createElementNS(node.namespaceURI, node.localName), index = elements.length;
      for (const attribute of node.attributes) {
        const { name, value } = attribute;
        if (allowed.test(name)) copy.setAttribute(name, value);
        else if (/^(?:href|src|poster|xlink:href)$/i.test(name)) {
          const url = safeURL(value); if (url) copy.setAttribute(name, url);
        } else if (name === 'style') {
          const entries = [];
          for (const property of node.style) if (!property.startsWith('--')) {
            entries.push(`${property}:${safeCSS(node.style.getPropertyValue(property))}${node.style.getPropertyPriority(property) ? '!important' : ''}`);
          }
          if (entries.length) copy.setAttribute('style', entries.join(';'));
        } else omit('non-layout attribute');
      }
      copy.setAttribute('data-capture-node', String(index)); parent.appendChild(copy);
      const rect = rectOf(node), style = styleOf(node), computed = styleTable[style];
      elements.push({ index, parentIndex, tag: node.localName, rect, style, pseudos: pseudoOf(node) });
      originals.push({ node, parent: node.parentNode, children: [...node.childNodes],
        attributes: [...node.attributes].map(attribute => [attribute.name, attribute.value]) });
      if (node === target || node.contains(target)) selectedIndex = index;
      if (node.matches('h1,h2,h3,h4,h5,h6,[role="heading"],[aria-level]') && rect.width > 0 && rect.height > 0 &&
          computed.visibility === 'visible' && Number.parseFloat(computed.opacity || '1') !== 0) headings.push({ index });
      for (let n = node.childNodes.length - 1; n >= 0; n--) stack.push({ node: node.childNodes[n], parent: copy, parentIndex: index });
    }
    if (selectedIndex === null) throw new Error('選択箇所を安全に取得できませんでした。見出しを選び直してください。');
    for (const heading of headings) heading.text = holder.querySelector(`[data-capture-node="${heading.index}"]`).textContent.trim();
    const ancestors = [];
    for (let node = root.parentElement; node; node = node.parentElement) {
      if (ancestors.length >= limits.maxAncestors) throw new Error('親要素が多すぎるため取得を中止しました。');
      ancestors.push({ tag: node.localName, id: node.id, class: node.getAttribute('class') || '', rect: rectOf(node), style: styleOf(node), pseudos: pseudoOf(node) });
    }
    if (!root.isConnected || location.href !== startURL || originals.some(entry => !root.contains(entry.node) ||
        entry.node.parentNode !== entry.parent || entry.node.childNodes.length !== entry.children.length ||
        entry.children.some((child, index) => entry.node.childNodes[index] !== child) ||
        entry.node.attributes.length !== entry.attributes.length ||
        entry.attributes.some(([name, value]) => entry.node.getAttribute(name) !== value)) ||
        texts.some(entry => entry.node.data !== entry.value || entry.node.parentNode !== entry.parent) ||
        JSON.stringify(viewportSnapshot()) !== JSON.stringify(startViewport)) {
      throw new Error('取得中に検索結果が更新されました。もう一度取得してください。');
    }
    const page = root.closest('.generic-autopager-page');
    const payload = {
      schema: 'google-result-structure/v1', capturedAt: new Date().toISOString(),
      root: { kind: chosen.kind, pageNumber: page?.dataset.page || root.dataset.genericAutopagerPage || '1', html: holder.innerHTML },
      selection: { index: selectedIndex, headings }, elements, styleTable, ancestors,
      environment: { userAgent: navigator.userAgent, url: safeURL(location.href), ...startViewport },
      pager: { installedVersion: 'unknown', statusText: document.getElementById('generic-autopager-status-v2')?.textContent || '',
        markers: [...root.attributes].filter(attribute => /^data-generic-/.test(attribute.name)).map(attribute => [attribute.name, attribute.value]) },
      omissions: { counts: omitted, notes: ['Scripts, forms, input values and known account UI are excluded.', 'URL credentials, queries and fragments; non-HTTP media URLs; custom CSS properties; event/tracking attributes are excluded.', 'Hidden result branches and their layout are retained. Computed styles are shared through styleTable indexes.', 'Capture uses no cookies, unrelated storage or network requests. No automatic clipboard use or remote upload; export happens only on user action.'] }, limits,
    };
    const json = JSON.stringify(payload);
    if (new Blob([json]).size > limits.maxBytes) throw new Error('取得内容が12MBを超えるため保存を中止しました。別の区切り箇所を選んでください。');
    return json;
  }
  async function prepareExport(json) {
    const now = new Date(), day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    const filename = `Google_Result_Structure_${day}.json`;
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    let body = json, format = 'GOOGLE_RESULT_CAPTURE_JSON_V1';
    try {
      if (typeof CompressionStream === 'function') {
        const compressed = new Uint8Array(await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < compressed.length; offset += 24576) binary += String.fromCharCode(...compressed.subarray(offset, offset + 24576));
        body = btoa(binary); format = 'GOOGLE_RESULT_CAPTURE_GZIP_V1';
      }
    } catch (_) { /* The original JSON remains available when compression is unsupported. */ }
    const captureId = `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const chunks = [];
    for (let offset = 0; offset < body.length;) {
      let end = Math.min(offset + 12000, body.length);
      if (end < body.length && /[\uD800-\uDBFF]/.test(body[end - 1]) && /[\uDC00-\uDFFF]/.test(body[end])) end--;
      chunks.push(body.slice(offset, end)); offset = end;
    }
    const packets = chunks.map((chunk, index) => `${format} ${captureId} ${index + 1}/${chunks.length}\n${chunk}`);
    let file = null;
    if (typeof File === 'function' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      for (const [name, type] of [[filename, 'application/json'], [filename.replace(/\.json$/, '.txt'), 'text/plain']]) {
        try {
          const candidate = new File([json], name, { type });
          if (navigator.canShare({ files: [candidate] })) { file = candidate; break; }
        } catch (_) { /* File sharing may reject a format even when the API is present. */ }
      }
    }
    let blobURL = null;
    try { blobURL = URL.createObjectURL(blob); } catch (_) { /* Text and supported file sharing remain available. */ }
    return { filename, blobURL, file, packets, part: 0 };
  }
  /* capture-test-export */
  const ui = document.createElement('div'); ui.id = UI;
  ui.style.cssText = 'position:fixed;left:8px;bottom:12px;z-index:2147483647;max-width:min(360px,calc(100vw - 32px));max-height:70vh;overflow:auto;box-sizing:border-box;padding:8px;background:#fff;color:#202124;border:1px solid #777;border-radius:8px;font:13px/1.4 sans-serif;box-shadow:0 2px 8px #0003';
  const start = document.createElement('button'); start.id = 'google-result-capture-start'; start.type = 'button'; start.textContent = '区切り箇所を取得';
  const cancel = document.createElement('button'); cancel.id = 'google-result-capture-cancel'; cancel.type = 'button'; cancel.textContent = 'キャンセル'; cancel.hidden = true;
  const download = document.createElement('a'); download.id = 'google-result-capture-download'; download.textContent = 'ファイル保存'; download.hidden = true;
  download.style.cssText = 'margin:4px;color:#1558d6;text-decoration:underline';
  const share = document.createElement('button'); share.id = 'google-result-capture-share'; share.type = 'button'; share.textContent = 'ファイルを共有'; share.hidden = true;
  const showText = document.createElement('button'); showText.id = 'google-result-capture-show-text'; showText.type = 'button'; showText.textContent = '文字で表示'; showText.hidden = true;
  const textPanel = document.createElement('div'); textPanel.hidden = true;
  const textHint = document.createElement('div'); textHint.id = 'google-result-capture-text-hint';
  const text = document.createElement('textarea'); text.id = 'google-result-capture-text'; text.readOnly = true; text.rows = 6; text.setAttribute('aria-label', 'チャットに貼り付ける取得データ');
  text.style.cssText = 'width:100%;box-sizing:border-box;font:12px/1.4 monospace;white-space:pre;overflow:auto;-webkit-user-select:text;user-select:text';
  const copy = document.createElement('button'); copy.id = 'google-result-capture-copy'; copy.type = 'button'; copy.textContent = 'この文字をコピー';
  const prev = document.createElement('button'); prev.id = 'google-result-capture-prev'; prev.type = 'button'; prev.textContent = '前の部分';
  const next = document.createElement('button'); next.id = 'google-result-capture-next'; next.type = 'button'; next.textContent = '次の部分';
  textPanel.append(textHint, text, copy, prev, next);
  const finish = document.createElement('button'); finish.id = 'google-result-capture-finish'; finish.type = 'button'; finish.textContent = '送信・保存できたので終了'; finish.hidden = true;
  const status = document.createElement('div'); status.id = 'google-result-capture-status'; status.setAttribute('role', 'status');
  ui.append(start, cancel, status, download, share, showText, textPanel, finish); document.body.appendChild(ui);
  let armed = false, busy = false, exporting = false, exportData = null;
  const active = () => route() && ui.isConnected;
  const clearExport = () => {
    if (exportData?.blobURL) URL.revokeObjectURL(exportData.blobURL);
    exportData = null; text.value = ''; download.removeAttribute('href'); download.removeAttribute('download');
    download.hidden = share.hidden = showText.hidden = textPanel.hidden = finish.hidden = true;
  };
  const dismiss = () => { armed = false; clearExport(); ui.remove(); };
  const updatePart = () => {
    if (!exportData) return;
    text.value = exportData.packets[exportData.part];
    const count = exportData.packets.length;
    textHint.textContent = count === 1 ? 'この文字をコピーし、チャットにそのまま貼り付けてください。' :
      `${exportData.part + 1}/${count}部分です。この部分をチャットに貼り付け、次の部分へ進んで、全部を順番に送ってください。`;
    prev.disabled = exportData.part === 0; next.disabled = exportData.part === count - 1;
    prev.hidden = next.hidden = count === 1;
  };
  const selectText = () => {
    textPanel.hidden = false;
    try { text.focus({ preventScroll: true }); } catch (_) { text.focus(); }
    text.select();
    status.textContent = '文字欄を長押しして「すべて選択」→「コピー」で取り出せます。チャットに貼り付けてください。';
  };
  start.addEventListener('click', () => {
    if (!active()) { dismiss(); return; }
    if (busy || exporting) return; armed = true; cancel.hidden = false; status.textContent = '枠がない検索結果の見出しや説明文をタップしてください。';
  });
  cancel.addEventListener('click', () => { armed = false; cancel.hidden = true; status.textContent = ''; });
  download.addEventListener('click', event => {
    if (!active() || busy || !exportData?.blobURL) { event.preventDefault(); return; }
    status.textContent = '保存を試みています。保存先や完了は確認できません。ファイルが見つからなければ「文字で表示」を使ってください。';
  });
  showText.addEventListener('click', () => {
    if (!active() || busy || !exportData) return;
    textPanel.hidden = false; updatePart();
    status.textContent = 'ファイルを保存せず、この文字をチャットに貼り付けられます。';
  });
  for (const [button, direction] of [[prev, -1], [next, 1]]) button.addEventListener('click', () => {
    if (!active() || busy || !exportData) return;
    exportData.part = Math.max(0, Math.min(exportData.packets.length - 1, exportData.part + direction)); updatePart();
  });
  copy.addEventListener('click', () => {
    if (!active() || busy || !exportData) return;
    const data = exportData, part = data.part;
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') { selectText(); return; }
      const copying = navigator.clipboard.writeText(text.value);
      Promise.resolve(copying).then(() => {
        if (active() && exportData === data && data.part === part) status.textContent = 'コピーしました。チャットに貼り付けてください。';
      }, () => { if (active() && exportData === data && data.part === part) selectText(); });
    } catch (_) { selectText(); }
  });
  share.addEventListener('click', () => {
    if (!active() || busy || exporting || !exportData?.file) return;
    const data = exportData;
    exporting = true; share.disabled = start.disabled = finish.disabled = true;
    const settled = () => { exporting = false; share.disabled = start.disabled = finish.disabled = false; };
    try {
      const sharing = navigator.share({ files: [data.file] });
      Promise.resolve(sharing).then(() => {
        if (active() && exportData === data) status.textContent = '共有先のアプリで添付を確認してください。ファイルが渡らなければ「文字で表示」を使えます。';
      }, error => {
        if (active() && exportData === data) status.textContent = error?.name === 'AbortError' ?
          '共有をキャンセルしました。もう一度共有するか「文字で表示」を使えます。' : '共有できませんでした。「文字で表示」を使ってください。';
      }).finally(settled);
    } catch (_) { if (active()) status.textContent = '共有できませんでした。「文字で表示」を使ってください。'; settled(); }
  });
  finish.addEventListener('click', () => { if (busy || exporting || !active() || !exportData) return; ownStorage(true); dismiss(); });
  document.addEventListener('click', async event => {
    if (!route()) { dismiss(); return; }
    if (!armed || busy || ui.contains(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const target = event.target.nodeType === Node.ELEMENT_NODE ? event.target : event.target.parentElement;
    armed = false; busy = true; clearExport(); start.disabled = true; finish.disabled = true; cancel.hidden = true; status.textContent = 'このページの構造を取得しています…';
    try {
      const data = await prepareExport(await capture(target));
      if (!active()) { if (data.blobURL) URL.revokeObjectURL(data.blobURL); return; }
      exportData = data;
      if (data.blobURL) { download.href = data.blobURL; download.download = data.filename; download.hidden = false; }
      share.hidden = !data.file; showText.hidden = finish.hidden = false;
      updatePart();
      status.textContent = '取得できました。保存は未確認です。「文字で表示」でチャットへ貼り付けるか、ファイル保存・共有を選んでください。';
    } catch (error) { status.textContent = error.message || '取得できませんでした。もう一度お試しください。'; }
    finally { busy = false; start.disabled = false; finish.disabled = false; }
  }, true);
})();
