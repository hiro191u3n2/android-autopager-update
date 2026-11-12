// Classifier/paint decisions with explicit geometry, not live Google rendering.
// The video establishes three distinct results with two absent separators, and
// a note result whose source row has a name/time rather than a displayed URL.
// These fixtures isolate concrete old-code failures; they are not captured DOM.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const current = await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../Android_Generic_AutoPager_v6.62.js', import.meta.url), 'utf8');
const begin = release.indexOf('const genericGoogleLayoutSourcesV647 =');
const end = release.indexOf('\n// On-demand, read-only evidence', begin);
assert(begin >= 0 && end > begin, 'Frozen v6.62 layout module must be extracted exactly');
const frozen = release.slice(begin, end);
const MARK = 'data-generic-google-boundary-v658';
const zero = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };

function fixture(code, { background = '#f8f9fa', named = false, protectedKind = '', native = false } = {}) {
  const source = n => `<div class="source"><img width="24" height="24" alt="" src="data:image/png;base64,"><div><span>情報サイト ${n}</span><div>${named && n === 1 ? '3 時間前' : `https://shop${n}.example`}</div></div></div>`;
  const card = n => `<article class="result" data-result="${n}" style="border-top-width:0px!important;border-top-style:none!important;border-top-color:rgb(32,33,36)!important;box-shadow:none!important;margin-bottom:${n < 3 ? '8' : '0'}px!important"><a class="main" href="https://shop${n}.example/item">${source(n)}<h3>独立した検索結果 ${n}</h3></a><p>元の結果の説明文を保持します。</p>${n === 1 ? '<div class="sitelinks"><a href="https://shop1.example/menu"><h3>関連するページ</h3></a><a href="https://other.example/reference">説明文中の外部リンク</a></div>' : ''}</article>`;
  const extra = protectedKind === 'carousel' ? `<g-scrolling-carousel><article data-extra><a href="https://extra.example/item">${source(9)}<h3>横並びの商品</h3></a></article></g-scrolling-carousel>` :
    protectedKind === 'paa' ? `<g-related-question><a href="https://extra.example/item">${source(9)}<h3>関連する質問</h3></a></g-related-question>` :
    protectedKind === 'large-image' ? '<article data-extra><a href="https://extra.example/item"><div class="source"><img width="160" height="100" alt="" src="data:image/png;base64,"><span>写真の説明</span></div><h3>写真に付いた見出し</h3></a></article>' : '';
  const dom = new JSDOM(`<style>*{visibility:visible;opacity:1;box-shadow:none;transform:none;clip-path:none;mask-image:none;background-image:none}html,body{background:#fff}.group{background:${native ? '#e8eaed' : background};border-bottom:8px solid #e8eaed}.result{background:#fff}.source,.main,p,.sitelinks{background:transparent}h3{font-size:20px}.source{font-size:14px}</style><main><article id="initial">Initial result</article><section class="generic-autopager-page" data-page="2"><div class="generic-autopager-google-source-root"><div class="group">${[1, 2, 3].map(card).join('')}</div>${extra}</div></section></main>`, { url: 'https://www.google.com/search?q=group-gap-fixture', runScripts: 'outside-only' });
  const w = dom.window, originalStyle = w.getComputedStyle.bind(w);
  w.getComputedStyle = (node, pseudo) => pseudo ? { content: 'none', display: 'none', visibility: 'visible', opacity: '1', getPropertyValue: () => '' } : originalStyle(node);
  w.Element.prototype.getBoundingClientRect = function () {
    if (this.closest('[hidden]')) return zero;
    const n = Number(this.closest('[data-result]')?.getAttribute('data-result')) || 0;
    let top = n ? (n - 1) * 188 : 0, height = n ? 180 : 564, width = 360;
    if (this.matches('img')) { width = Number(this.getAttribute('width')); height = Number(this.getAttribute('height')); top += 10; }
    else if (this.closest('.source')) { height = 36; top += 8; }
    else if (this.matches('h3')) { height = 26; top += this.closest('.sitelinks') ? 145 : 50; }
    else if (this.matches('p')) { height = 45; top += 88; }
    if (this.closest('[data-extra]')) top += 700;
    return { left: 0, right: width, top, bottom: top + height, width, height };
  };
  w.Element.prototype.getClientRects = function () { const r = this.getBoundingClientRect(); return r.width && r.height ? [r] : []; };
  w.eval(code);
  return { dom, w, page: w.document.querySelector('.generic-autopager-page'), root: w.document.querySelector('.generic-autopager-google-source-root') };
}

let passed = 0;
for (const background of ['#f8f9fa', 'rgba(255,255,255,.8)']) {
  const run = fixture(frozen, { background });
  try {
    assert.equal(run.w.getGenericGoogleResultRecordsV658(run.root, true).records.length, 3, 'Frozen control recognizes all three records');
    run.w.repairGenericGoogleResultBoundariesV658(run.page);
    assert.equal(run.root.querySelectorAll(`[${MARK}]`).length, 0, 'Frozen v6.62 rejects both grouped gaps because the background string differs');
    passed++;
  } finally { run.dom.window.close(); }
}
{
  const run = fixture(frozen, { named: true });
  try {
    assert.equal(run.w.getGenericGoogleResultRecordsV658(run.root, true).records.length, 2, 'Frozen v6.62 cannot identify the URL-less named source');
    passed++;
  } finally { run.dom.window.close(); }
}

if (!process.env.GOOGLE_GROUP_GAP_CONTROL_ONLY) {
  for (const background of ['#f8f9fa', 'rgba(255,255,255,.8)']) for (const native of [false, true]) {
    const run = fixture(current, { background, native });
    try {
      const before = [...run.root.querySelectorAll('.result')].map(node => ({ content: node.innerHTML, margin: node.style.marginBottom, border: node.style.borderTop, rect: node.getBoundingClientRect() }));
      const initial = run.w.document.querySelector('#initial').outerHTML;
      run.w.repairGenericGoogleResultBoundariesV658(run.page);
      assert.equal(run.root.querySelectorAll(`[${MARK}]`).length, 2, 'Both grouped gaps receive their one explicit paint');
      [...run.root.querySelectorAll('.result')].forEach((node, index) => {
        assert.equal(node.innerHTML, before[index].content, 'Content, destination links, images and sitelinks remain unchanged');
        assert.equal(node.style.marginBottom, before[index].margin, 'Existing margins are not enlarged');
        assert.deepEqual(node.getBoundingClientRect(), before[index].rect, 'The repair does not touch modeled geometry');
        assert.equal(node.style.borderTop, before[index].border, 'Snapshot inline-important border longhands are not replaced');
        if (index) assert.match(node.style.boxShadow, /-8px.*rgb\(232,\s*234,\s*237\)/, 'The existing 8px gap is painted with the native color');
      });
      const once = run.root.outerHTML;
      run.w.repairGenericGoogleResultBoundariesV658(run.page);
      assert.equal(run.root.outerHTML, once, 'Repeated repairs are idempotent');
      assert.equal(run.w.document.querySelector('#initial').outerHTML, initial, 'First-page result remains untouched');
      passed++;
    } finally { run.dom.window.close(); }
  }
  for (const protectedKind of ['', 'carousel', 'paa', 'large-image']) {
    const run = fixture(current, { named: true, protectedKind });
    try {
      const records = run.w.getGenericGoogleResultRecordsV658(run.root, true).records;
      assert.equal(records.length, 3, 'Named sources join their own main heading only; ' + protectedKind);
      assert.deepEqual(Array.from(records, record => record.anchor.href), [1, 2, 3].map(n => `https://shop${n}.example/item`), 'No sitelink, body link, question, carousel or large-image caption becomes a primary result');
      run.w.repairGenericGoogleResultBoundariesV658(run.page);
      assert.equal(run.root.querySelectorAll(`[${MARK}]`).length, 2, 'Both boundaries are repaired with a named first source');
      assert.equal(run.root.querySelectorAll('.sitelinks [' + MARK + '], [data-extra][' + MARK + '], [data-extra] [' + MARK + ']').length, 0, 'Protected content acquires no repair');
      passed++;
    } finally { run.dom.window.close(); }
  }
}
console.log(`PASS Google grouped-gap classifier decisions: ${passed} controlled DOM scenarios; no claim of real browser pixels or live Google DOM`);
