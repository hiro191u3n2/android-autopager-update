// Isolated DOM/lifecycle tests. Browser paint/append order is covered separately.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const moduleText = await readFile(new URL('../src/google-import-staging.js', import.meta.url), 'utf8');
const originalNext = 'https://www.google.com/search?q=staging&start=10';
const next = originalNext + '&hl=ja';
const related = '<section data-native-related><h2>他の人はこちらも検索</h2><a href="/search?q=related-one">関連語1</a><a href="/search?q=related-two">関連語2</a></section>';
const native = '<article id="native-result"><a href="https://article.example/one"><h3>他の人はこちらも検索</h3></a><p>これは同じ語を含む通常の検索結果です。</p></article>';
const html = `<!doctype html><header><input id="query" value="staging"></header><main id="search"><div id="rso">${native}</div></main>${related}<nav id="manual-next" style="display:inline-flex!important"><a id="pnnext" href="/search?q=staging&start=10">その他の検索結果</a></nav><footer id="footer" style="display:grid!important">日本・ヘルプ・プライバシー</footer>`;
let passed = 0;

function create(url = 'https://www.google.com/search?q=staging') {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(moduleText);
  return dom;
}

{
  const dom = create(), { window } = dom, doc = window.document;
  try {
    const target = doc.getElementById('rso'), original = target.outerHTML;
    const relatedNode = doc.querySelector('[data-native-related]'), relatedMarkup = relatedNode.outerHTML;
    const footer = doc.getElementById('footer'), manual = doc.getElementById('manual-next');
    window.syncGenericGoogleTailV663(target, true, next);
    for (const node of [relatedNode, footer, manual]) assert.equal(node.style.display, 'none', 'Native tail stays hidden while paging is active');
    assert.equal(target.outerHTML, original, 'Ordinary result and same-word external title remain unchanged');
    assert.equal(doc.getElementById('query').value, 'staging', 'Search editor is unchanged');
    window.syncGenericGoogleTailV663(target, false, next);
    assert.equal(relatedNode.outerHTML, relatedMarkup, 'Pause/failure restores a previously unstyled module exactly');
    assert.equal(footer.style.getPropertyValue('display'), 'grid');
    assert.equal(footer.style.getPropertyPriority('display'), 'important');
    assert.equal(manual.style.getPropertyValue('display'), 'inline-flex');
    assert.equal(manual.style.getPropertyPriority('display'), 'important');
    assert.equal(doc.getElementById('pnnext').href, next, 'Manual next link remains intact');
    const later = 'https://www.google.com/search?q=staging&start=30';
    window.syncGenericGoogleTailV663(target, true, later);
    assert.equal(footer.style.display, 'none', 'Resume hides tail before another load');
    window.syncGenericGoogleTailV663(target, false, later);
    assert.equal(doc.getElementById('pnnext').href, later, 'Failure after page 3 restores the actual next page, not initial page 2');
    assert.notEqual(doc.getElementById('pnnext').style.display, 'none', 'Actual manual next is available after failure');
    window.syncGenericGoogleTailV663(target, true, later);
    window.history.pushState({ intact: true }, '', '/maps');
    assert.equal(footer.style.display, 'grid', 'Leaving search restores the native footer synchronously');
    assert.equal(doc.getElementById('pnnext').href, originalNext, 'Leaving search restores this module\'s original link attribute');
    assert.deepEqual(window.history.state, { intact: true }, 'History state is preserved');
    window.history.replaceState(null, '', '/search?q=staging');
    window.syncGenericGoogleTailV663(target, true, next);
    assert.equal(footer.style.display, 'none', 'Returning and resuming can hide the original tail again');
    window.dispatchEvent(new window.Event('pagehide'));
    assert.equal(footer.style.display, 'grid', 'Pagehide does not persist hidden tail into history');
    window.dispatchEvent(new window.Event('pageshow'));
    assert.equal(footer.style.display, 'none', 'Resumed paging after pageshow hides its tail again');
    window.history.pushState(null, '', '/search?q=new-query');
    assert.equal(footer.style.display, 'grid', 'New search identity restores old hidden state');
    window.syncGenericGoogleTailV663(target, true, next);
    assert.equal(footer.style.display, 'grid', 'Delayed status from the old query cannot hide the new query tail');
    doc.getElementById('pnnext').href = '/search?q=new-query&start=10';
    window.syncGenericGoogleTailV663(target, true, '/search?q=new-query&start=10');
    assert.equal(footer.style.display, 'none', 'The same result root reused for a new search gets a fresh state');
    window.syncGenericGoogleTailV663(target, false, '');
    assert.equal(footer.style.display, 'grid');
    assert.equal(doc.getElementById('pnnext').style.display, 'none', 'Final page does not expose the obsolete initial next link');
    doc.getElementById('pnnext').href = '/search?q=site-updated&start=40';
    window.history.replaceState(null, '', '/maps');
    assert(doc.getElementById('pnnext').href.endsWith('/search?q=site-updated&start=40'), 'Route cleanup does not overwrite a link independently updated by Google');
    console.log('PASS staging unit: native tail lifecycle, pause/failure/resume, manual next, route and pageshow restoration');
    passed++;
  } finally { window.close(); }
}

{
  const dom = create(), { window } = dom, doc = window.document;
  try {
    const target = doc.getElementById('rso');
    const imported = doc.createElement('section');
    imported.className = 'generic-autopager-page';
    imported.innerHTML = '<h2>他の人はこちらも検索</h2>' + '<a href="/search?q=ignore">無視する追加結果</a>'.repeat(100);
    target.appendChild(imported);
    let scans = 0;
    imported.querySelectorAll = () => { scans++; throw new Error('Imported result pages must not be traversed by tail state changes'); };
    window.syncGenericGoogleTailV663(target, true, next);
    window.syncGenericGoogleTailV663(target, true, next);
    window.syncGenericGoogleTailV663(target, false, next);
    assert.equal(scans, 0);
    console.log('PASS staging unit: tail state changes exclude accumulated imported pages');
    passed++;
  } finally { window.close(); }
}

{
  const dom = create(), { window } = dom, doc = window.document;
  try {
    const root = doc.createElement('section');
    root.className = 'generic-autopager-page';
    root.innerHTML = `<div class="generic-autopager-google-source-root">${native}${related}<footer>Google footer</footer></div>`;
    window.cleanGenericGoogleImportedTailV663(root);
    assert.equal(root.querySelector('#native-result').outerHTML, native);
    assert.equal(root.querySelector('[data-native-related]'), null);
    assert.equal(root.querySelector('footer'), null);
    assert(doc.querySelector('[data-native-related]'), 'Detached cleanup does not alter the original document');
    for (const parameter of ['q', 'url']) {
      root.innerHTML = `<div id="botstuff"><article><cite>https://ordinary.example</cite><a href="/url?${parameter}=https%3A%2F%2Fordinary.example%2Fone"><h3>通常の転送リンク結果</h3></a></article>${related}</div>`;
      window.cleanGenericGoogleImportedTailV663(root);
      assert.equal(root.querySelector('h3').textContent, '通常の転送リンク結果', 'Shared tail wrapper protects redirected ordinary results');
      assert.equal(root.querySelector('[data-native-related]'), null);
    }
    root.innerHTML = `<div id="bres"><article><cite>https://ordinary.example</cite><a href="/url?q=https%3A%2F%2Fordinary.example%2Fone"><div>見出しタグなしの通常結果</div></a></article>${related}</div>`;
    window.cleanGenericGoogleImportedTailV663(root);
    assert.equal(root.querySelector('article').textContent, 'https://ordinary.example見出しタグなしの通常結果');
    assert.equal(root.querySelector('[data-native-related]'), null);
    root.innerHTML = related + '<footer>Connected original footer</footer>';
    doc.body.appendChild(root);
    const before = root.outerHTML;
    window.cleanGenericGoogleImportedTailV663(root);
    assert.equal(root.outerHTML, before, 'Preparation cannot mutate an already displayed page');
    console.log('PASS staging unit: detached tail cleanup preserves ordinary results and live document');
    passed++;
  } finally { window.close(); }
}

{
  const dom = create('https://example.com/search?q=staging'), { window } = dom;
  try {
    const before = window.document.body.innerHTML;
    window.syncGenericGoogleTailV663(window.document.getElementById('rso'), true, next);
    const clone = window.document.body.cloneNode(true), cloneBefore = clone.outerHTML;
    window.cleanGenericGoogleImportedTailV663(clone);
    assert.equal(window.document.body.innerHTML, before);
    assert.equal(clone.outerHTML, cloneBefore);
    console.log('PASS staging unit: other hosts untouched');
    passed++;
  } finally { window.close(); }
}

function videoPage(window, count) {
  const root = window.document.createElement('section');
  root.className = 'generic-autopager-page';
  root.innerHTML = Array.from({ length: count }, (_, index) => `<article><a href="https://www.youtube.com/watch?v=video00000${index}"><h3>Googleの元の表示 ${index}</h3><img alt="属性にだけ存在する非常に長い仮の動画説明文 ${index}"></a></article>`).join('');
  return root;
}
const parseVideo = href => ({ videoId: new URL(href).searchParams.get('v') });
const applyTitle = (node, text) => { node.textContent = text; };

{
  const dom = create(), { window } = dom;
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  try {
    const root = videoPage(window, 8);
    let started = 0, finished = false;
    const pending = window.prepareGenericGoogleTitlesV663(root, parseVideo, video => {
      started++;
      return new Promise(resolve => window.setTimeout(() => resolve('確定タイトル ' + video.videoId), 400));
    }, applyTitle).then(() => { finished = true; });
    await clock.tickAsync(1199);
    assert.equal(finished, false);
    assert([...root.querySelectorAll('h3')].every(node => node.textContent.startsWith('Googleの元の表示')), 'No partial placeholder titles during preparation');
    await clock.tickAsync(1);
    await pending;
    assert.equal(started, 8);
    assert([...root.querySelectorAll('h3')].every(node => node.textContent.startsWith('確定タイトル')), 'Final titles applied before the root is connected');
    assert.equal(root.isConnected, false);
    assert.equal(clock.countTimers(), 0, 'Completed batch clears shared deadline timer');
    console.log('PASS staging unit: eight video titles use three workers and one shared wait, no placeholder phase');
    passed++;
  } finally { clock.uninstall(); window.close(); }
}

{
  const dom = create(), { window } = dom;
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  try {
    const root = videoPage(window, 12), original = root.outerHTML;
    let started = 0, finished = false;
    const pending = window.prepareGenericGoogleTitlesV663(root, parseVideo, video => {
      started++;
      return new Promise(resolve => window.setTimeout(() => resolve('遅い確定タイトル ' + video.videoId), 6000));
    }, applyTitle).then(() => { finished = true; });
    await clock.tickAsync(2199);
    assert.equal(finished, false);
    await clock.tickAsync(1);
    await pending;
    assert.equal(finished, true);
    assert.equal(started, 3, 'Deadline stops the queue rather than adding a timeout per video');
    assert.equal(root.outerHTML, original, 'Timeout keeps the exact original headings/attributes');
    window.document.body.appendChild(root);
    await clock.tickAsync(10000);
    assert.equal(root.outerHTML, original, 'Late cached responses cannot rewrite the displayed page');
    assert.equal(started, 3, 'Closed workers do not start more network requests');
    console.log('PASS staging unit: twelve slow videos stop at one 2.2-second deadline; no late visible rewrite');
    passed++;
  } finally { clock.uninstall(); window.close(); }
}

{
  const dom = create(), { window } = dom;
  try {
    const root = videoPage(window, 3), original = root.outerHTML;
    await window.prepareGenericGoogleTitlesV663(root, parseVideo, () => Promise.reject(new Error('offline')), applyTitle);
    assert.equal(root.outerHTML, original, 'Resolver errors keep original visible titles');
    window.document.body.appendChild(root);
    let calls = 0;
    await window.prepareGenericGoogleTitlesV663(root, parseVideo, () => { calls++; return Promise.resolve('変更しない'); }, applyTitle);
    assert.equal(calls, 0, 'Already displayed content cannot restart title replacement');
    assert.equal(root.outerHTML, original);
    console.log('PASS staging unit: failed resolution and connected-root guard preserve original titles');
    passed++;
  } finally { window.close(); }
}
console.log(`Google import staging DOM tests passed: ${passed} scenarios; not browser/Android paint verification`);
