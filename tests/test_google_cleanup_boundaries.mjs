// Synthetic Chromium boundary regressions, not a claim that Google's live
// response places AI attributes on these roots. v6.51 demonstrably hid these
// shared containers even when its JavaScript eligibility check rejected them.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const options = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) options.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const imported = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundle = imported.default || imported;
  options.executablePath = await bundle.executablePath();
  options.args = bundle.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const source = await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8');
const oldRelease = await readFile(new URL('../Android_Generic_AutoPager_v6.51.js', import.meta.url), 'utf8');
const oldStart = oldRelease.indexOf('(function installGoogleSearchCleanupV648()');
const oldEnd = oldRelease.indexOf('\n})();', oldStart);
assert(oldStart >= 0 && oldEnd > oldStart, 'Frozen v6.51 cleanup must be available');
const baseline = oldRelease.slice(oldStart, oldEnd + '\n})();'.length);
const aiAttributes = ['data-attnms="tc"', 'data-aquarium', 'data-subtree="mfc"', 'data-attrid="AIOverview"', 'data-async-type="folsrch"', 'data-mg-cp="YzCcne"'];
const controls = '<header id="header"><form><input id="query" name="q" value="銀座 しゃぶ耀 喫煙所"></form><nav id="tabs"><a id="all-tab" href="/search?q=test">すべて</a><a id="ai-tab" href="/search?q=test&udm=50">AI モード</a></nav></header>';
const organic = '<article id="organic" class="MjjYud"><a id="result-link" href="https://example.com/result"><h3>銀座のお店</h3></a><p id="snippet">店舗の住所と営業時間</p></article>';
const questions = '<section id="questions" jscontroller="Da4hkd"><h2>関連する質問</h2><p>お店の場所は？</p></section>';
function ai(attribute = 'data-attnms="tc"') {
  return `<section id="ai-module" class="MjjYud"><div id="ai-payload" ${attribute}><h2>AI による概要</h2><p>生成された回答の本文です。</p><a href="https://citation.example/"><h3>引用元の記事</h3></a></div></section>`;
}
function html({ wrapper = null, attribute = 'data-attnms="tc"', knownRoot = false } = {}) {
  const content = ai(attribute) + organic + questions;
  let bodyAttribute = '', markup;
  if (wrapper === 'body') {
    bodyAttribute = attribute;
    markup = controls + '<main id="main"><div id="rso">' + content + '</div></main>';
  } else if (knownRoot) {
    const open = wrapper === 'main' ? '<main id="boundary"' : wrapper === 'role-main' ? '<div id="boundary" role="main"' : `<div id="${wrapper === 'main-id' ? 'main' : wrapper}" data-boundary="1"`;
    const close = wrapper === 'main' ? '</main>' : '</div>';
    markup = controls + open + ' ' + attribute + '>' + content + close;
  } else {
    markup = `<div id="shared-shell" ${attribute}>` + controls + '<main id="main"><div id="rso">' + content + '</div></main></div>';
  }
  return '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:16px sans-serif}header,section,article{padding:12px}input{font:inherit}h2,h3,p{margin:0}</style></head><body ' + bodyAttribute + '>' + markup + '</body></html>';
}
const browser = await chromium.launch(options);
let passed = 0;
async function setup(spec, code = source) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: html(spec) }) : route.abort());
  await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=銀座+しゃぶ耀+喫煙所');
  await page.waitForTimeout(80);
  return { context, page, errors };
}
async function visible(page, selector) {
  return page.locator(selector).evaluate(element => {
    if (!element.getClientRects().length) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  });
}
async function assertRetained(run, label) {
  for (const id of ['header', 'query', 'tabs', 'all-tab', 'ai-tab', 'organic', 'result-link', 'snippet', 'questions']) {
    assert.equal(await visible(run.page, '#' + id), true, label + ': ' + id + ' must remain visible');
  }
  assert.equal(await visible(run.page, 'body'), true, label + ': body must remain visible');
  assert.equal(await visible(run.page, '#ai-module'), false, label + ': the legitimate AI module, including citations, must collapse');
  assert.equal(await run.page.locator('#query').inputValue(), '銀座 しゃぶ耀 喫煙所');
  assert.equal(await run.page.locator('#result-link').getAttribute('href'), 'https://example.com/result');
  assert.deepEqual(run.errors, []);
  passed++;
}
try {
  // This control proves that the fixture exercises the old blanket CSS path.
  {
    const run = await setup({ wrapper: 'body' }, baseline);
    assert.equal(await visible(run.page, 'body'), false, 'v6.51 must reproduce blanket CSS hiding body');
    assert.equal(await run.page.locator('body').getAttribute('data-generic-google-cleanup-v648'), null, 'The old JavaScript rejected body; its early CSS bypassed that check');
    await run.context.close();
    passed++;
  }
  // Every early CSS AI attribute must be harmless when attached to body or a
  // shell containing the page controls and the shared result root.
  for (const attribute of aiAttributes) {
    for (const wrapper of ['body', 'shared']) {
      const run = await setup({ wrapper, attribute });
      await assertRetained(run, wrapper + ' / ' + attribute);
      if (wrapper === 'shared') assert.equal(await visible(run.page, '#shared-shell'), true);
      await run.context.close();
    }
  }
  for (const wrapper of ['main', 'role-main', 'main-id', 'search', 'rso', 'center_col', 'taw', 'topstuff']) {
    // main-id distinguishes <div id=main> from the semantic <main> element.
    const spec = { wrapper, knownRoot: true };
    const run = await setup(spec);
    await assertRetained(run, 'known root ' + wrapper);
    await run.context.close();
  }
  {
    const run = await setup({ wrapper: 'shared' }, await buildUserscript());
    await assertRetained(run, 'full packaged script');
    await run.context.close();
  }
  console.log(`PASS: Google cleanup boundaries ${passed} Chromium scenarios; v6.51 failure control, body/shared roots, all AI attributes, real module citations and packaged integration`);
} finally {
  await browser.close();
}
