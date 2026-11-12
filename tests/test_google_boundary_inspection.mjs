// Pure inspector tests. Explicit rectangles model classifier branches; these
// are not a claim about Google's live DOM or browser rendering.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const layout = await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8');
const inspector = await readFile(new URL('../src/google-boundary-inspection.js', import.meta.url), 'utf8');
const zero = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
const ROOT_GAP_CASES = ['root-gap', 'root-native-gutter', 'root-interrupted', 'root-nearwhite', 'root-alpha', 'root-ring', 'root-native-ring', 'root-native-conflict', 'root-ring-small', 'root-painted'];

function fixture(mode) {
  const rootGapCase = ROOT_GAP_CASES.includes(mode);
  const source = n => rootGapCase && n === 2
    ? '<div class="source"><div><div>gnavi.co.jp</div></div><div><span>https://r.gnavi.co.jp</span></div></div>'
    : mode === 'header-split-url'
    ? `<header class="source">https://<span>shop${n}</span><span>.example</span><textarea>HEADER_PRIVATE</textarea><span role="menu">HEADER_MENU_PRIVATE</span></header>`
    : mode === 'split-url' ? `<div class="source">https://<span>shop${n}</span><span>.example</span></div>`
    : `<div class="source"${mode === 'aria-hidden' ? ' aria-hidden="true"' : ''}>https://shop${n}.example${mode === 'privacy' ? '/menu?q=QUERY_SENTINEL#HASH_SENTINEL' : ''}</div>`;
  const card = n => {
    const hiddenHeading = mode === 'hidden-heading' ? '<h3 hidden>Hidden alternative</h3>' : '';
    const privacy = mode === 'privacy' ? '<input value="INPUT_SENTINEL"><textarea>TEXTAREA_SENTINEL</textarea><script>window.SECRET_SCRIPT_SENTINEL=1</script><img src="data:image/png;base64,BASE64_SENTINEL" onerror="SCRIPT_ATTRIBUTE_SENTINEL">' : '';
    const href = rootGapCase && n === 2 ? 'https://r.gnavi.co.jp/menu' : `https://user:pass@shop${n}.example/menu?q=LINK_QUERY_SENTINEL#LINK_HASH_SENTINEL`;
    const link = `<a href="${href}">${rootGapCase ? source(n) : ''}${hiddenHeading}<h3>Visible restaurant ${n}</h3></a>`;
    const contents = `${rootGapCase ? '' : source(n)}${link}<p>Ordinary description</p>${privacy}`;
    const value = `<div class="result" data-result="${n}">${rootGapCase ? `<div class="transparent"><div class="surface">${contents}</div></div>` : contents}</div>`;
    return mode === 'contents' ? `<div class="contents">${value}</div>` : value;
  };
  const cards = [1, 2, 3].map(n => card(n) + (mode === 'root-interrupted' && n === 1 ? '<div class="interruption">Related module</div>' : '')).join('') + (mode === 'root-native-conflict' ? '<div class="distant-native-band"></div>' : '');
  const backdrop = mode === 'root-native-conflict' ? '#dce0e6' : ['root-native-gutter', 'root-native-ring'].includes(mode) ? '#e8eaed' : mode === 'root-nearwhite' ? '#f8f9fa' : mode === 'root-alpha' ? 'rgba(0,0,0,.01)' : '#fff';
  const ring = ['root-ring', 'root-native-ring', 'root-native-conflict', 'root-ring-small'].includes(mode) ? 'box-shadow:rgb(235, 237, 239) 0px 0px 0px 1px;' : '';
  const rootStyle = rootGapCase ? `html,body{background:${backdrop}}section,#rso,.result,.transparent{background:transparent}.surface{background:#fff;${ring}}.distant-native-band{height:8px;background:#e8eaed}` : '';
  const dom = new JSDOM(`<style>*{visibility:visible;opacity:1;background:#fff}.group{border-bottom:8px solid #e8eaed}.contents{display:contents}[hidden]{display:none}${rootStyle}</style><section class="generic-autopager-page" data-page="2" data-source-url="https://www.google.com/search?q=SOURCE_QUERY_SENTINEL#SOURCE_HASH_SENTINEL"><div id="rso" class="generic-autopager-google-source-root">${mode === 'common-root' || rootGapCase ? cards : `<div class="group">${cards}</div>`}</div></section>`, { url: 'https://www.google.com/search?q=LOCATION_QUERY_SENTINEL#LOCATION_HASH_SENTINEL', runScripts: 'outside-only' });
  const w = dom.window;
  const originalStyle = w.getComputedStyle.bind(w);
  w.getComputedStyle = (node, pseudo) => pseudo ? { content: 'none', display: 'none', visibility: 'visible', opacity: '1', getPropertyValue: () => '' } : originalStyle(node);
  w.Element.prototype.getBoundingClientRect = function () {
    if (this.matches('.contents') || this.closest('[hidden]')) return zero;
    if (this.matches('.distant-native-band')) return { left: 0, right: 360, top: 800, bottom: 808, width: 360, height: 8 };
    const n = Number(this.closest('[data-result]')?.getAttribute('data-result')) || 0;
    const width = mode === 'narrow' && n ? 260 : mode === 'root-width' ? 1000 : 360;
    let top = n ? 20 + (n - 1) * (mode === 'root-ring-small' ? 182 : rootGapCase ? 188 : 180) : 20, height = n ? 180 : 548;
    if (this.closest('.source')) { top += 10; height = 20; }
    else if (this.matches('h3,a')) { top += 45; height = 26; }
    else if (this.matches('p')) { top += 85; height = 50; }
    return { left: 0, right: width, top, bottom: top + height, width, height };
  };
  w.Element.prototype.getClientRects = function () { const r = this.getBoundingClientRect(); return r.width && r.height ? [r] : []; };
  w.eval(layout + '\n' + inspector);
  const page = w.document.querySelector('.generic-autopager-page');
  if (mode === 'marker') for (const n of ['2', '3']) page.querySelector(`[data-result="${n}"]`).setAttribute('data-generic-google-boundary-v658', '1');
  if (mode === 'root-painted') for (const n of ['2', '3']) {
    const node = page.querySelector(`[data-result="${n}"]`);
    node.setAttribute('data-generic-google-boundary-v658', '1');
    node.style.setProperty('box-shadow', '0px -8px 0px 0px rgb(232, 234, 237)', 'important');
  }
  return { dom, w, page };
}

let passed = 0;
for (const mode of ['control', 'split-url', 'header-split-url', 'aria-hidden', 'contents', 'common-root', ...ROOT_GAP_CASES, 'hidden-heading', 'narrow', 'root-width', 'marker', 'privacy']) {
  const { dom, w, page } = fixture(mode);
  try {
    const before = w.document.documentElement.outerHTML;
    const result = w.inspectGenericGoogleResultBoundariesV659(page);
    assert.equal(w.document.documentElement.outerHTML, before, mode + ': inspector must not mutate DOM');
    assert.equal(result.schema, 'google-boundary-inspection/v659');
    assert.notEqual(result.status, 'error', mode + ': inspection completes');
    const plain = JSON.parse(JSON.stringify(result));
    assert(Buffer.byteLength(JSON.stringify(plain)) <= 140000, mode + ': bounded UTF-8 output');
    assert(plain.nearby.structure.length <= 400);
    if (mode === 'control') assert.deepEqual(plain.pairs.map(pair => pair.reason), ['would-repair', 'would-repair']);
    if (mode === 'split-url') {
      assert.equal(plain.counts.sources, 0);
      assert(plain.nearby.sources.some(source => source.observations.includes('source-nonleaf')));
      assert(plain.nearby.structure.some(node => node.text === '.example'));
    }
    if (mode === 'header-split-url') {
      assert.equal(plain.counts.sources, 0);
      assert(plain.nearby.structure.some(node => node.tag === 'header'));
      assert(plain.nearby.structure.some(node => node.text === '.example'));
      assert(plain.nearby.sources.some(source => plain.nodes[source.nodeId]?.tag === 'header' && source.observations.includes('source-tag-not-scanned')));
      assert(!JSON.stringify(plain).includes('HEADER_PRIVATE'));
      assert(!JSON.stringify(plain).includes('HEADER_MENU_PRIVATE'));
      const initialReport = w.inspectGenericGoogleResultBoundariesV659(w.document.querySelector('#rso'));
      assert.equal(initialReport.status, 'root-missing');
      assert(!initialReport.nearby.structure.some(node => node.tag === 'header'));
      assert(!JSON.stringify(initialReport).includes('HEADER_PRIVATE'));
      assert(!JSON.stringify(initialReport).includes('HEADER_MENU_PRIVATE'));
      assert.equal(w.document.documentElement.outerHTML, before);
    }
    if (mode === 'aria-hidden') {
      assert.equal(plain.counts.sources, 0);
      assert(plain.nearby.sources.some(source => source.observations.includes('source-excluded-ancestor')));
    }
    if (mode === 'contents') assert(plain.records.every(record => record.eligibility.reasons.includes('card-display-contents')));
    if (mode === 'common-root') assert.deepEqual(plain.pairs.map(pair => pair.reason), ['root-gap-range', 'root-gap-range']);
    if (ROOT_GAP_CASES.includes(mode)) {
      assert.equal(plain.counts.sources, 3, 'One source per result, including the base-domain/subdomain source header');
      assert.equal(plain.counts.acceptedCards, 3);
      assert(plain.records.every(record => record.surfaceCoversCard && record.surfaceColor === 'rgb(255, 255, 255)'));
    }
    if (mode === 'root-gap') {
      assert.deepEqual(plain.pairs.map(pair => pair.reason), ['would-repair', 'would-repair']);
      assert(plain.pairs.every(pair => pair.paintMode === 'existing-gap-shadow' && pair.gap === 8));
    }
    if (ROOT_GAP_CASES.includes(mode) && mode !== 'root-interrupted') {
      const reason = mode === 'root-painted' ? 'marker' : 'would-repair';
      assert.deepEqual(plain.pairs.map(pair => pair.reason), [reason, reason]);
      const native = ['root-native-gutter', 'root-native-ring', 'root-native-conflict'].includes(mode);
      const ring = ['root-ring', 'root-native-ring', 'root-native-conflict', 'root-ring-small'].includes(mode);
      for (const pair of plain.pairs) {
        assert.equal(pair.paint.current, true);
        assert.equal(pair.paint.color, mode === 'root-native-conflict' ? 'rgb(220, 224, 230)' : 'rgb(232, 234, 237)');
        assert.equal(pair.paint.basis, native ? 'ancestor-background' : 'theme-fallback');
        assert.equal(plain.nodes[pair.paint.backgroundNodeId]?.tag, 'body', 'Evidence identifies the backdrop outside the imported page');
        assert.equal(pair.paint.edgeInset, ring ? 1 : 0);
        assert.equal(pair.paint.shadowHeight, mode === 'root-ring-small' ? 1 : ring ? 7 : 8);
        if (mode === 'root-ring-small') assert.equal(pair.gap, 2);
        if (mode === 'root-nearwhite') {
          assert.equal(pair.paint.backgroundColor, 'rgb(248, 249, 250)');
          assert.equal(pair.paint.backgroundAlpha, 1);
          assert(pair.paint.contrast.length === 2 && pair.paint.contrast.every(ratio => ratio > 1 && ratio < 1.12));
        }
        if (mode === 'root-alpha') {
          assert.equal(pair.paint.backgroundAlpha, .01);
          assert.equal(pair.paint.basis, 'theme-fallback', 'Transparent black cannot be reused as an opaque high-contrast background');
          assert.deepEqual(pair.paint.contrast, [], 'No uncomposited contrast ratio for a translucent background');
        }
        if (native) assert(pair.paint.contrast.length === 2 && pair.paint.contrast.every(ratio => ratio >= 1.12));
      }
      if (mode === 'root-native-conflict') {
        assert(plain.bands.some(band => band.color === 'rgb(232, 234, 237)' && plain.nodes[band.nodeId]?.classes.includes('distant-native-band')), 'Exercise a real competing native-band color elsewhere in the root');
        assert(plain.pairs.every(pair => pair.paint.backgroundColor === 'rgb(220, 224, 230)' && pair.paint.color === pair.paint.backgroundColor), 'The local native gutter keeps its own color rather than borrowing the distant band');
      }
    }
    if (mode === 'root-interrupted') assert.deepEqual(plain.pairs.map(pair => pair.reason), ['root-intervening-content', 'would-repair']);
    if (mode === 'hidden-heading') assert(plain.records.every(record => record.eligibility.reasons.includes('title-no-box')));
    if (mode === 'narrow') assert(plain.records.every(record => record.eligibility.reasons.includes('card-width-below-75pct')));
    if (mode === 'root-width') assert.equal(plain.status, 'root-width-out-of-range');
    if (mode === 'marker') assert.deepEqual(plain.pairs.map(pair => pair.reason), ['marker', 'marker']);
    if (mode === 'privacy') {
      const serialized = JSON.stringify(plain);
      for (const secret of ['QUERY_SENTINEL', 'HASH_SENTINEL', 'INPUT_SENTINEL', 'TEXTAREA_SENTINEL', 'SECRET_SCRIPT_SENTINEL', 'BASE64_SENTINEL', 'SCRIPT_ATTRIBUTE_SENTINEL', 'user:pass@']) assert(!serialized.includes(secret), 'Redact ' + secret);
      assert(plain.records.every(record => record.destination.url === 'https://' + record.destination.host + '/menu'));
      assert.equal(plain.scope.source, 'https://www.google.com/search');
      assert.equal(plain.scope.route, 'https://www.google.com/search');
    }
    passed++;
  } finally { dom.window.close(); }
}

// A marked card can later lose its opaque face. Its current paint diagnosis
// must remain readable even though the original repair would now be ineligible.
const markedWithoutFace = fixture('root-painted');
try {
  const { w, page } = markedWithoutFace;
  for (const node of [w.document.documentElement, w.document.body, ...page.querySelectorAll('.surface')]) node.style.backgroundColor = 'transparent';
  const before = w.document.documentElement.outerHTML;
  const result = w.inspectGenericGoogleResultBoundariesV659(page);
  assert.equal(w.document.documentElement.outerHTML, before);
  assert.notEqual(result.status, 'error');
  assert(result.records.every(record => record.surfaceId === null && !record.surfaceCoversCard));
  assert.deepEqual(JSON.parse(JSON.stringify(result.pairs.map(pair => pair.reason))), ['marker', 'marker']);
  for (const pair of result.pairs) {
    assert.equal(pair.paint.current, true);
    assert.equal(pair.paint.basis, 'theme-fallback');
    assert.equal(pair.paint.backgroundNodeId, null);
    assert.equal(pair.paint.edgeInset, 0);
    assert.equal(pair.paint.shadowHeight, 8);
  }
  passed++;
} finally { markedWithoutFace.dom.window.close(); }

const initial = fixture('control');
try {
  const root = initial.w.document.querySelector('#rso');
  const before = root.outerHTML;
  const result = initial.w.inspectGenericGoogleResultBoundariesV659(root);
  assert.equal(result.status, 'root-missing');
  assert.equal(result.scope.initialPage, true);
  assert.equal(root.outerHTML, before);
  passed++;
} finally { initial.dom.window.close(); }

// Keep the aggregate below the source-summary cutoff so private descendants
// cannot be accidentally protected only by the 260-character length limit.
const shortPrivate = fixture('control');
try {
  const card = shortPrivate.page.querySelector('[data-result="1"]');
  card.innerHTML = '<div class="source">https://a.co</div><a href="https://a.co/menu"><h3>TT<textarea>SHORT_PRIVATE</textarea></h3><span role="menu">MENU_PRIVATE</span></a><form><span>FORM_PRIVATE</span><input value="INPUT_PRIVATE"></form><textarea>SHORT_OUTSIDE</textarea><p>x</p>';
  assert(card.textContent.length < 260);
  const before = shortPrivate.w.document.documentElement.outerHTML;
  const result = shortPrivate.w.inspectGenericGoogleResultBoundariesV659(shortPrivate.page);
  assert.equal(shortPrivate.w.document.documentElement.outerHTML, before);
  assert.notEqual(result.status, 'error');
  assert(result.records.some(record => record.title === 'TT'));
  assert(result.nearby.anchors.some(anchor => anchor.text === 'TT'));
  assert(result.nearby.sources.some(source => result.nodes[source.nodeId]?.classes.includes('result') && source.text.includes('a.co')), 'Exercise the short aggregate source summary');
  const serialized = JSON.stringify(result);
  for (const secret of ['SHORT_PRIVATE', 'MENU_PRIVATE', 'FORM_PRIVATE', 'INPUT_PRIVATE', 'SHORT_OUTSIDE']) assert(!serialized.includes(secret), 'Filter private descendants from aggregate text: ' + secret);
  passed++;
} finally { shortPrivate.dom.window.close(); }

const stress = fixture('control');
try {
  const card = stress.page.querySelector('[data-result="1"]');
  const classes = Array.from({ length: 8 }, (_, n) => 'class' + n + 'x'.repeat(48)).join(' ');
  const content = Array.from({ length: 450 }, () => `<div class="${classes}">${'診断用の長い文字列'.repeat(18)}</div>`).join('');
  card.insertAdjacentHTML('beforeend', content);
  const before = stress.w.document.documentElement.outerHTML;
  const result = stress.w.inspectGenericGoogleResultBoundariesV659(stress.page);
  assert.equal(stress.w.document.documentElement.outerHTML, before);
  assert(Buffer.byteLength(JSON.stringify(result)) <= 140000);
  assert(result.nearby.structure.length <= 400);
  assert(result.limits.truncated.length > 0);
  passed++;
} finally { stress.dom.window.close(); }

console.log(`PASS read-only Google boundary inspection: ${passed} scenarios, bounded output, skipped-branch reasons, URL/form/script privacy; explicit DOM geometry mocks, not live Google verification`);
