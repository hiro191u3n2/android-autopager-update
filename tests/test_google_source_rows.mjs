// Controlled source-row recognition cases, not a capture of Google's DOM.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const current = await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../Android_Generic_AutoPager_v6.63.js', import.meta.url), 'utf8');
const begin = release.indexOf('const genericGoogleLayoutSourcesV647 =');
const end = release.indexOf('// Prepare only a detached Google result page.', begin);
assert(begin >= 0 && end > begin, 'Extract the frozen v6.63 layout module');
const frozen = release.slice(begin, end);
const zero = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
const rectangle = { left: 0, right: 360, top: 0, bottom: 40, width: 360, height: 40 };

function fixture(code, html) {
  const dom = new JSDOM(`<style>*{visibility:visible;opacity:1}.hidden{display:none}.invisible{visibility:hidden}</style><main id="rso">${html}</main>`,
    { url: 'https://www.google.com/search?q=source-row-fixture', runScripts: 'outside-only' });
  const w = dom.window;
  w.Element.prototype.getBoundingClientRect = function () {
    for (let node = this; node; node = node.parentElement) {
      if (node.hidden || w.getComputedStyle(node).display === 'none') return zero;
    }
    return rectangle;
  };
  w.Element.prototype.getClientRects = function () {
    const box = this.getBoundingClientRect();
    return box.width ? [box] : [];
  };
  w.eval(code);
  const root = w.document.querySelector('#rso');
  return { dom, w, root, records: rendered => w.getGenericGoogleResultRecordsV658(root, rendered) };
}

function card(row, { id = 'one', host = 'example.com', plain = false, sites = false } = {}) {
  return `<article data-card="${id}"><div class="source-header"><div>情報サイト</div>${row}</div><a class="main" href="https://${host}/${id}">${plain ? '<div>検索結果の見出し</div>' : '<h3>検索結果の見出し</h3>'}</a><p>検索結果の説明文。</p>${sites ? `<div class="sitelinks"><a href="https://${host}/menu"><h3>メニュー</h3></a><a href="https://${host}/access">アクセス</a></div>` : ''}</article>`;
}

const positives = [
  ['split domain', '<div data-row>https://exa<span>mple.com</span></div>'],
  ['split protocol and domain', '<div data-row><span>https://</span><span>exa</span><span>mple.com</span></div>'],
  ['word break', '<div data-row>https://example<wbr>.com</div>'],
  ['emphasis', '<div data-row>https://<b>example</b>.com</div>'],
  ['PDF badge', '<div data-row>https://example.com <span>PDF</span></div>'],
  ['nested PDF badge', '<div data-row>https://example.com <span><b>PDF</b></span></div>'],
  ['joined PDF badge', '<div data-row>https://example.com<span>PDF</span></div>'],
  ['nested inline wrapper', '<div data-row><span>https://exa<span>mple.com</span></span></div>'],
  ['www URL', '<div data-row>www.exa<span>mple.com</span></div>'],
  ['path and query', '<div data-row>https://exa<span>mple.com</span>/timetable?lang=ja#station</div>'],
];
let passed = 0;
for (const [label, row] of positives) {
  const run = fixture(frozen, card(row));
  try {
    assert.equal(run.records(true).records.length, 0, `Frozen v6.63 misses ${label}`);
    passed++;
  } finally { run.dom.window.close(); }
}
for (const [label, row] of positives) for (const rendered of [false, true]) {
  const run = fixture(current, card(row, { plain: true, sites: true }));
  try {
    const before = run.root.innerHTML, result = run.records(rendered);
    assert.equal(result.records.length, 1, `${label}: one result, not its sitelinks`);
    assert.equal(result.sources.length, 1, `${label}: one source identity`);
    assert.equal(result.records[0].anchor.href, 'https://example.com/one', label);
    assert.equal(result.records[0].card.dataset.card, 'one', `${label}: retains the whole result wrapper`);
    assert.equal(run.root.innerHTML, before, `${label}: recognition does not mutate the page`);
    passed++;
  } finally { run.dom.window.close(); }
}

// These rows are intentionally not eligible for the new joined-text path.
// Existing complete leaf URLs may remain valid, but no parent may merge them.
const rejectedRows = [
  ['two full URLs', '<div data-row><span>https://example.com</span> <span>https://other.example</span></div>'],
  ['two domains', '<div data-row>https://example.com <span>other.example</span></div>'],
  ['joined URLs', '<div data-row>https://example.com<span>https://other.example</span></div>'],
  ['plain title', '<div data-row>https://example.com <span>検索結果の見出し</span></div>'],
  ['heading title', '<div data-row>https://example.com<h3>検索結果の見出し</h3></div>'],
  ['snippet', '<div data-row>https://example.com <span>こちらは説明文です。</span></div>'],
  ['paragraph', '<div data-row>https://example.com<p>説明文</p></div>'],
  ['linked title', '<div data-row>https://example.com<a href="https://example.com/other">別の結果</a></div>'],
  ['linked badge', '<div data-row>https://example.com<span><a href="https://example.com/file">PDF</a></span></div>'],
  ['button', '<div data-row>https://example.com<span role="button">PDF</span></div>'],
  ['badge before URL', '<div data-row><span>PDF</span>https://example.com</div>'],
  ['badge inside URL', '<div data-row>https://exa<span>PDF</span>mple.com</div>'],
  ['two source rows', '<div data-row><div>https://example.com</div><div>https://other.example</div></div>'],
  ['hidden fragment', '<div data-row>https://exa<span hidden>mple.com</span></div>'],
  ['aria-hidden fragment', '<div data-row>https://exa<span aria-hidden="true">mple.com</span></div>'],
  ['CSS hidden fragment', '<div data-row>https://exa<span class="hidden">mple.com</span></div>'],
  ['CSS invisible fragment', '<div data-row>https://exa<span class="invisible">mple.com</span></div>'],
  ['transparent fragment', '<div data-row>https://exa<span style="opacity:0">mple.com</span></div>'],
];
for (const [label, row] of rejectedRows) {
  const run = fixture(current, card(row));
  try {
    const target = run.root.querySelector('[data-row]');
    assert.equal(run.w.getGenericGoogleInlineSourceTextV664(target, true), '', `${label}: rejects joined row`);
    assert(!run.records(true).sources.some(source => source.node === target), `${label}: parent is not a source`);
    passed++;
  } finally { run.dom.window.close(); }
}

for (const hide of ['hidden', 'style="display:none"', 'style="visibility:hidden"', 'style="opacity:0"']) {
  const run = fixture(current, card(`<div data-row ${hide}>https://exa<span>mple.com</span></div>`));
  try {
    assert.equal(run.records(true).records.length, 0, 'Hidden whole row never identifies a displayed result: ' + hide);
    passed++;
  } finally { run.dom.window.close(); }
}

for (const sameHost of [false, true]) {
  const row = '<div data-row>https://exa<span>mple.com</span></div>';
  const other = sameHost ? row : '<div data-row>https://other<wbr>.example</div>';
  const run = fixture(current, card(row) + card(other, { id: 'two', host: sameHost ? 'example.com' : 'other.example' }));
  try {
    const result = run.records(true);
    assert.equal(result.records.length, 2, 'Separate results retain separate identities');
    assert.equal(result.sources.length, 2);
    assert.deepEqual(Array.from(result.records, record => record.card.dataset.card), ['one', 'two']);
    passed++;
  } finally { run.dom.window.close(); }
}

for (const row of [
  '<div data-row><span>https://example.com</span></div>',
  '<div><span data-row><span>https://example.com</span></span></div>',
  '<div data-row><span>https://example.com</span><span>PDF</span></div>',
  '<div><span data-row><span>https://example.com</span><span>PDF</span></span></div>',
  '<div><div><span data-row><span><span>https://example.com</span><span>PDF</span></span></span></div></div>',
  '<cite>https://example.com</cite>',
  '<span data-dtld="example.com">example.com</span>',
]) {
  const run = fixture(current, card(row));
  try {
    const result = run.records(true);
    assert.equal(result.records.length, 1, 'An existing complete URL remains recognized');
    assert.equal(result.sources.length, 1, 'Nested complete rows neither duplicate nor mutually remove each other');
    assert.equal(result.records[0].card.dataset.card, 'one');
    passed++;
  } finally { run.dom.window.close(); }
}

// Parent-domain site name and split subdomain URL must collapse to the URL,
// while the same site's next independent result still owns its own source.
{
  const row = '<div><div><span>example.com</span></div><div data-row>https://sub.exa<span>mple.com</span></div></div>';
  const run = fixture(current, card(row, { host: 'sub.example.com' }) + card(row, { id: 'two', host: 'sub.example.com' }));
  try {
    const result = run.records(true);
    assert.equal(result.records.length, 2);
    assert.equal(result.sources.length, 2, 'Site-name/URL duplicates do not block result promotion');
    assert.deepEqual(Array.from(result.sources, source => source.host), ['sub.example.com', 'sub.example.com']);
    assert.deepEqual(Array.from(result.records, record => record.card.dataset.card), ['one', 'two']);
    passed++;
  } finally { run.dom.window.close(); }
}

console.log(`PASS Google inline source rows: ${passed} controlled DOM cases; no live Google/Berry DOM claim`);
