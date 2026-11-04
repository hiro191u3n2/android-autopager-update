// Hide Google's search notices without changing the query or the results.
// The public AI selectors are hints; ordinary result cards and question panels
// are always outside the text-matching path. No network requests are made.
(function installGoogleSearchCleanupV648() {
  'use strict';
  const googleSuffixes = new Set(('com cat ad ae com.af com.ag com.ai am co.ao com.ar as at com.au az ba com.bd be bf bg com.bh bi bj com.bn com.bo com.br bs bt co.bw by com.bz ca cd cf cg ch ci co.ck cl cm cn com.co co.cr com.cu cv com.cy cz de dj dk dm com.do dz com.ec ee com.eg es com.et fi com.fj fm fr ga ge gg com.gh com.gi gl gm gp gr com.gt gy com.hk hn hr ht hu co.id ie co.il im co.in iq is it je com.jm jo co.jp co.ke com.kh ki kg co.kr com.kw kz la com.lb li lk co.ls lt lu lv com.ly co.ma md me mg mk ml com.mm mn ms com.mt mu mv mw com.mx com.my co.mz com.na com.ng com.ni ne nl no com.np nr nu co.nz com.om com.pa com.pe com.pg com.ph com.pk pl pn com.pr ps pt com.py com.qa ro ru rw com.sa com.sb sc se com.sg sh si sk com.sl sn so sm sr st com.sv td tg co.th com.tj tl tm tn to com.tr tt com.tw co.tz com.ua co.ug co.uk com.uy co.uz com.vc co.ve vg co.vi com.vn vu ws rs co.za co.zm co.zw').split(' '));
  const host = location.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.startsWith('google.') || !googleSuffixes.has(host.slice(7))) return;
  if (window.__genericGoogleSearchCleanupV648) return;
  window.__genericGoogleSearchCleanupV648 = true;

  const MARK = 'data-generic-google-cleanup-v648';
  const ACTIVE = 'data-generic-google-cleanup-active-v648';
  const STYLE_ID = 'generic-google-cleanup-style-v648';
  const BOUNDARY = 'html,body,main,#rso,#search,#main,#center_col,#taw,#topstuff,[role="main"]';
  // .g and .tF2Cxc are reused for UI wrappers on mobile; only real linked
  // result headings protect a result card. Notices can precede #search/#rso.
  const PROTECTED = 'nav,header,footer,aside,#rhs,input,textarea,select,[contenteditable="true"],[role="complementary"],[role="navigation"],[role="dialog"],[role="listbox"],.related-question-pair,[jscontroller="Da4hkd"],[data-initq],[data-q],[data-attrid*="people_also_ask"],[data-ssid="lcl_legacy_tile"]';
  const AI_ROOT = '[data-attnms],[data-aquarium],[data-subtree="mfc"],[data-attrid="AIOverview"],[data-async-type="folsrch"],[data-mg-cp="YzCcne"]';
  const AI_CONTAINER = AI_ROOT + ',[data-mcpr],[data-mcp]';
  const jobs = [];
  const queued = new Set();
  let scheduled = false;
  let enabled = false;
  let currentHref = '';

  function ensureStyle() {
    if (!document.documentElement || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = 'html[' + ACTIVE + '] [' + MARK + ']{display:none!important;min-height:0!important;height:0!important;margin:0!important;padding:0!important;border:0!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  function routeEnabled() {
    try {
      const url = new URL(location.href);
      return /^\/search\/?$/.test(url.pathname) && url.searchParams.get('udm') !== '50';
    } catch (_) { return false; }
  }

  function syncRoute(force) {
    ensureStyle();
    // documentElement can be created after the document-start invocation.
    if (document.documentElement) document.documentElement.toggleAttribute(ACTIVE, enabled);
    if (!force && currentHref === location.href) return;
    currentHref = location.href;
    enabled = routeEnabled();
    if (document.documentElement) document.documentElement.toggleAttribute(ACTIVE, enabled);
    for (const element of document.querySelectorAll('[' + MARK + ']')) element.removeAttribute(MARK);
    jobs.length = 0;
    queued.clear();
    if (enabled && document.documentElement) enqueue(document.documentElement);
  }

  function normalize(text) {
    return String(text || '').replace(/[\u200b-\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Read only a bounded amount, avoiding textContent on an entire result list.
  function shortText(element, limit) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && node.parentElement.closest('script,style,noscript,template,svg,input,textarea,select') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let text = '', node, count = 0;
    while ((node = walker.nextNode())) {
      if (++count > 80 || text.length + node.data.length > limit) return null;
      text += node.data;
    }
    return normalize(text);
  }

  function isExternalLink(anchor) {
    try {
      const url = new URL(anchor.getAttribute('href'), location.href);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
      const linkHost = url.hostname.replace(/^www\./, '');
      return !linkHost.startsWith('google.') || !googleSuffixes.has(linkHost.slice(7)) || url.pathname === '/url';
    } catch (_) { return false; }
  }

  function hasResultHeading(element) {
    for (const heading of element.querySelectorAll('h3')) {
      const link = heading.closest('a[href]') || heading.querySelector('a[href]');
      if (link && isExternalLink(link)) return true;
    }
    return false;
  }

  function eligible(element, strongAI) {
    if (!element || !element.isConnected || element.matches(BOUNDARY) || !document.body?.contains(element) || element.closest(PROTECTED)) return false;
    const enclosingLink = element.closest('a[href]');
    if (enclosingLink && isExternalLink(enclosingLink)) return false;
    if (!strongAI && hasResultHeading(element)) return false;
    // A notice quoted inside its own result/question card is content. A result
    // in a separate sibling card does not disqualify a notice in a shared div.
    for (let parent = element; parent && !parent.matches(BOUNDARY); parent = parent.parentElement) {
      for (const heading of parent.querySelectorAll('h2,[role="heading"]')) {
        const label = shortText(heading, 80);
        if (!label || !/^(?:関連する質問|他の人はこちらも質問|People also ask)$/i.test(label)) continue;
        const panel = heading.closest('.MjjYud,section,article') || heading.parentElement;
        if (panel && panel.contains(element)) return false;
      }
      for (const heading of parent.querySelectorAll('h3')) {
        const link = heading.closest('a[href]') || heading.querySelector('a[href]');
        if (!link || !isExternalLink(link) || (strongAI && element.contains(heading))) continue;
        const card = heading.closest('.MjjYud,.g,.tF2Cxc,article') || link.parentElement;
        if (card && card.contains(element)) return false;
      }
    }
    return true;
  }

  function correctionText(text) {
    return /も含めた検索結果を表示|(?:次の|以下の)検索結果を表示|の検索結果を表示しています|もしかして\s*[:：]|Showing results for|Including results for|Did you mean\s*[:：]/i.test(text);
  }

  function locationText(text) {
    return /(?:地域を選択|場所を選択|Choose area|Choose location)\s*[⋮⋯︙…]*\s*$/i.test(text) && text.length < 180;
  }

  function aiHeading(text) {
    return /^(?:AIによる概要|AI概要|AIOverview|AIOverviews)[:：]?$/.test(text.replace(/\s/g, ''));
  }

  function aiError(text) {
    const compact = text.replace(/\s/g, '');
    return compact.length <= 350 && (/AI(?:による)?概要(?:を|は|が).{0,70}(?:生成できません|表示できません|利用できません)/.test(compact) ||
      /(?:(?:An? )?AI Overview (?:is not available|isn't available|couldn't be generated)|Can't generate an AI overview|Unable to generate an AI overview|We can't generate an AI overview)/i.test(text));
  }

  function beforeResults(element) {
    // Location inference is only for the strip before the first actual result.
    // In particular, addresses and menus inside the Places widget stay intact.
    for (const result of document.querySelectorAll('h3,[data-ssid="lcl_legacy_tile"]')) {
      if (result.closest('header,nav,footer,aside,' + AI_ROOT)) continue;
      const link = result.closest('a[href]') || result.querySelector('a[href]');
      if (result.tagName === 'H3' && (!link || !isExternalLink(link))) continue;
      if (element.contains(result) || !(element.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      return true;
    }
    // Streaming markup may not have a result yet. Only consider the top band.
    const rect = element.getBoundingClientRect();
    return rect.top + scrollY < 650;
  }

  function locationBand(element, text) {
    if (!text || text.length > 160 || !eligible(element, false)) return false;
    if (element.querySelector('h1,h2,h3,img,iframe,video,canvas,input,textarea,select,[data-ssid="lcl_legacy_tile"]')) return false;
    if (Array.from(element.querySelectorAll('a[href]')).some(isExternalLink)) return false;
    const nativeLocation = element.matches('update-location') ||
      (element.matches('dynamic-visibility-control') && element.querySelector('update-location'));
    if (nativeLocation) return beforeResults(element);
    const controls = Array.from(element.querySelectorAll('button,[role="button"],[aria-haspopup]'));
    if (!controls.length || controls.length > 3) return false;
    const menu = controls.find(control => /(?:その他|メニュー|オプション|more|options|menu)/i.test(control.getAttribute('aria-label') || '') ||
      /^[⋮⋯︙…]+$/.test(normalize(control.textContent)) || control.querySelector('svg'));
    if (!menu) return false;
    // The screenshot's location variant has an icon and a trailing middle dot,
    // with no 'Choose area' label. This is independent of the municipality.
    const label = normalize(text.replace(normalize(menu.textContent), '')).replace(/[⋮⋯︙…]+$/g, '').trim();
    if (!/[・·•]\s*$/.test(label)) return false;
    const icons = Array.from(element.querySelectorAll('svg,[aria-label],[data-icon],.material-icons'));
    const locationIcon = icons.some(icon => !menu.contains(icon) &&
      (/(?:現在地|自宅|位置情報|current location|^home$|location_on|^place$)/i.test((icon.getAttribute('aria-label') || '') + (icon.getAttribute('data-icon') || '') + normalize(icon.textContent)) ||
       (icon.tagName.toLowerCase() === 'svg' && Array.from(icon.querySelectorAll('path')).some(path => {
         const d = (path.getAttribute('d') || '').replace(/[\s,]/g, '').toLowerCase();
         return d.startsWith('m1020v-6h4v6') || d.startsWith('m1010v') || d.startsWith('m122c') || d.startsWith('m122a');
       }))));
    if (!locationIcon || !beforeResults(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.width >= Math.min(180, innerWidth * 0.4) && rect.height > 0 && rect.height <= 112;
  }

  function aiTarget(seed) {
    const module = seed.closest('.MjjYud,section,g-section-with-header');
    if (!module || module === seed || !eligible(module, true)) return seed;
    if (module.querySelector('[data-ssid="lcl_legacy_tile"],.related-question-pair,[jscontroller="Da4hkd"]')) return seed;
    if (Array.from(module.querySelectorAll('h3')).some(h => !seed.contains(h))) return seed;
    return module;
  }

  function safelyPromote(seed, kind) {
    let target = seed;
    for (let depth = 0, parent = seed.parentElement; parent && depth < 7; depth++, parent = parent.parentElement) {
      if (!eligible(parent, false) || parent.querySelector('input,textarea,select,iframe,video,canvas,img,nav,[role="navigation"],.related-question-pair,[data-initq],[data-q]')) break;
      const text = shortText(parent, kind === 'correction' ? 700 : 360);
      if (!text) break;
      if (kind === 'location' && !locationText(text) && !locationBand(parent, text)) break;
      if (kind === 'correction' && !correctionText(text)) break;
      if (kind === 'ai' && !aiError(text) && !aiHeading(text)) break;
      if (Array.from(parent.querySelectorAll('a[href]')).some(isExternalLink)) break;
      target = parent;
    }
    return target;
  }

  function mark(element, kind) {
    if (!element || element.matches(BOUNDARY)) return;
    element.setAttribute(MARK, kind);
    // Collapse only transparent wrappers: no sibling text, controls, or result
    // content may be swallowed to remove padding/dividers around a notice.
    let current = element;
    for (let depth = 0; depth < 4; depth++) {
      const parent = current.parentElement;
      if (!parent || !eligible(parent, kind === 'ai') || parent.matches(BOUNDARY)) break;
      const siblings = Array.from(parent.childNodes).filter(n => n !== current && !(n.nodeType === 3 && !n.data.trim()) && !(n.nodeType === 1 && n.matches('script,style,template')));
      if (siblings.length) break;
      parent.setAttribute(MARK, kind);
      current = parent;
    }
  }

  function inspect(element) {
    if (!enabled || element.closest('[' + MARK + ']')) return;
    if (element.matches(AI_ROOT) && eligible(element, true)) {
      mark(aiTarget(element), 'ai');
      return;
    }
    // Google's g-inner-card/update-location custom elements may own text
    // directly. A tag-name whitelist skipped them entirely in v6.48.
    if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    // A form or another shared parent can contain both a search field and a
    // notice. Inspect the child notice without hiding the shared controls.
    if (element.querySelector('input,textarea,select,nav,[role="navigation"]')) return;
    const text = shortText(element, 700);
    if (!text) return;
    if (element.matches('h1,h2,[role="heading"]') && aiHeading(text)) {
      const identified = element.closest(AI_CONTAINER);
      if (identified && eligible(identified, true)) {
        mark(identified, 'ai');
        return;
      }
    }
    if (!eligible(element, false)) return;
    if (locationBand(element, text)) {
      mark(safelyPromote(element, 'location'), 'location');
      return;
    }
    if (correctionText(text) && (element.id === 'fprs' || element.querySelector('a[href*="/search"],a[href*="nfpr="]'))) {
      mark(safelyPromote(element, 'correction'), 'correction');
      return;
    }
    if (locationText(text)) {
      const controls = element.matches('a,button,[role="button"]') ? [element] : element.querySelectorAll('a,button,[role="button"]');
      if (Array.from(controls).some(control => /^(?:地域を選択|場所を選択|Choose area|Choose location)$/i.test(normalize(control.textContent)) && !isExternalLink(control))) {
        mark(safelyPromote(element, 'location'), 'location');
        return;
      }
    }
    if (aiError(text)) {
      mark(safelyPromote(element, 'ai'), 'ai');
      return;
    }
    if (aiHeading(text)) {
      // The complete answer can be long. Only an identified module, with the
      // AI label as its own heading, is eligible for whole-module removal.
      const container = element.closest(AI_CONTAINER);
      if (container && eligible(container, true) && !container.matches(BOUNDARY)) mark(container, 'ai');
      else mark(safelyPromote(element, 'ai'), 'ai');
    }
  }

  function enqueue(root) {
    if (!enabled || !root || root.nodeType !== 1 || !root.isConnected || queued.has(root)) return;
    // Merge only overlapping work. Never replace unrelated mutation roots with
    // a repeated body-wide scan, even during a burst of Google updates.
    // A running walker may already have passed the insertion point. Only a
    // not-yet-started ancestor job can safely cover a newly inserted subtree.
    for (const job of jobs) if (!job.walker && job.root.contains(root)) return;
    queued.add(root);
    jobs.push({ root, walker: null });
    if (!scheduled) { scheduled = true; setTimeout(drain, 0); }
  }

  function drain() {
    scheduled = false;
    if (currentHref !== location.href) syncRoute(false);
    if (!enabled) return;
    const started = performance.now();
    let count = 0;
    while (jobs.length && count < 600 && performance.now() - started < 10) {
      const job = jobs[0];
      if (!job.root.isConnected) { jobs.shift(); queued.delete(job.root); continue; }
      if (!job.walker) {
        inspect(job.root);
        job.walker = document.createTreeWalker(job.root, NodeFilter.SHOW_ELEMENT, {
          acceptNode(node) {
            return node.matches('script,style,noscript,template,svg,[' + MARK + ']') || node.matches(PROTECTED) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
        });
      }
      const node = job.walker.nextNode();
      count++;
      if (node) inspect(node);
      else { jobs.shift(); queued.delete(job.root); }
    }
    if (jobs.length && !scheduled) { scheduled = true; setTimeout(drain, 16); }
  }

  const observer = new MutationObserver(records => {
    syncRoute(false);
    if (!enabled) return;
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target || target.closest('script,style,noscript,template,svg')) continue;
      const marked = target.closest('[' + MARK + ']');
      if (marked) {
        // Google may recycle a notice node for ordinary content on navigation.
        let outer = marked;
        while (outer.parentElement && outer.parentElement.hasAttribute(MARK)) outer = outer.parentElement;
        outer.removeAttribute(MARK);
        for (const old of outer.querySelectorAll('[' + MARK + ']')) old.removeAttribute(MARK);
        enqueue(outer);
      }
      if (record.type === 'characterData' || record.type === 'attributes') enqueue(target);
      else {
        for (const node of record.addedNodes) enqueue(node.nodeType === 1 ? node : target);
      }
      // Parent inspection recognizes a label assembled across sibling nodes;
      // the subtree itself is scanned only through the bounded queue above.
      if (!target.matches(BOUNDARY)) inspect(target);
    }
  });
  observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['id', 'class', 'role', 'aria-label', 'data-attnms', 'data-aquarium', 'data-subtree', 'data-attrid', 'data-async-type', 'data-mg-cp'] });
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    try {
      history[method] = function () {
        const result = original.apply(this, arguments);
        syncRoute(false);
        return result;
      };
    } catch (_) { /* Mutation and navigation events still check the route. */ }
  }
  addEventListener('popstate', () => syncRoute(true));
  addEventListener('pageshow', () => syncRoute(true));
  document.addEventListener('DOMContentLoaded', () => syncRoute(true), { once: true });
  syncRoute(true);
})();
