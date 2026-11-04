// Offline fixtures derived from the location component inspected on live Google
// desktop search in this session. Mobile variants below are synthetic: these
// tests are not a captured Android DOM or native userscript-manager verification.
// The hidden dialog input is a deliberate stress variant; it was not present in
// the inspected desktop component.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
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
const browser = await chromium.launch(options);
const sourceURL = process.env.GOOGLE_CLEANUP_SOURCE || new URL('../src/google-search-cleanup.js', import.meta.url);
const source = await readFile(sourceURL, 'utf8');
const locationIcon = '<span aria-label="検索の場所:" role="img"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 10 12 2l9 8v11H3Z"></path></svg></span>';
const overflowIcon = '<span style="display:inline-block;width:18px;height:18px"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg></span>';
function band(id, { native = false, h2 = false, longDialog = false, important = false, iconOutside = false } = {}) {
  const headingTag = h2 ? 'h2' : 'div';
  const explanation = longDialog ? '現在地情報の使用方法について詳しく説明します。'.repeat(60) : '現在地情報の使用方法';
  return `<div id="${id}" class="location-row vqkKIe wHYlTd mzYw6b" style="align-items:baseline;display:flex${important ? '!important;height:44px!important' : ''}">
    ${iconOutside ? locationIcon : ''}<${headingTag} class="eKPi4 BUSxSd" role="heading" aria-level="2">${iconOutside ? '' : locationIcon}<span class="BBwThe">例示市テスト町</span></${headingTag}>
    ${native ? '<div class="pTm6Gf"><update-location><button>正確な現在地を使用</button><g-dialog hidden><div role="dialog"><p>現在地を更新できません</p><input value="現在地"></div></g-dialog><g-snackbar hidden>現在地を更新中</g-snackbar></update-location></div>' : ''}
    <div class="R0cdZ"><div><a role="button" tabindex="0" aria-label="現在地情報の使用方法">${overflowIcon}</a><g-dialog hidden><div role="dialog"><p>${explanation}</p><a href="https://support.google.com/websearch/answer/179386">ヘルプ</a></div></g-dialog></div></div>
  </div>`;
}
const retainedMarkup = `<main id="main"><div id="search"><div id="rso">
  <section id="places" data-ssid="lcl_legacy_tile"><h2>場所</h2><div id="map">地図</div><article id="place-card"><a href="https://business.example/"><h3>店舗の例</h3></a><address id="address">テスト町1-2-3</address></article></section>
  <article id="organic" class="MjjYud"><a href="https://ordinary.example/"><h3>サンプル検索</h3></a><p id="snippet">例示市テスト町の店舗情報</p>${band('organic-location')}</article>
  <section id="questions" jscontroller="Da4hkd"><h2>関連する質問</h2><div class="related-question-pair"><h3>現在地の設定方法は？</h3>${band('question-location')}</div></section>
</div></div></main>${band('after-results')}<footer id="footer">${band('footer-location')}</footer>`;
function html({ row = band('location'), shared = false, lateCSS = false, direct = false } = {}) {
  const component = direct ? row : `<div id="oFNiHe"><dynamic-visibility-control><div class="component-wrapper"><div class="O4T6Pe TPKH4e">${row}</div></div></dynamic-visibility-control></div>`;
  const contents = `<div id="taw">${component}<p id="unrelated-top">検索のヒント</p></div>${retainedMarkup}`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;font:16px/1.5 sans-serif}h2,h3,p{margin:0}.location-row{min-height:44px;width:100%;gap:8px;border-bottom:8px solid #eee}.R0cdZ{margin-left:auto}.location-row svg{width:20px;height:20px}.location-row [role=heading]{display:flex;gap:8px}#map{height:100px;background:#ddd}#header{height:100px}g-dialog[hidden],g-snackbar[hidden]{display:none}
  </style><style id="late-style">${lateCSS ? '#location svg{width:0;height:0}' : ''}</style>
  <header id="header"><input id="query" value="サンプル検索"><nav><a id="image-tab" href="/search?udm=2&q=サンプル検索">画像</a></nav></header>
  <div id="standalone-dialog" role="dialog">${band('dialog-location')}</div>
  ${shared ? '<div id="shared" class="MjjYud" data-q="サンプル検索">' : ''}${contents}${shared ? '</div>' : ''}`;
}
async function setup(config) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: html(config) }) : route.abort());
  await page.addInitScript({ content: source });
  await page.goto('https://www.google.com/search?q=サンプル検索');
  await page.waitForTimeout(100);
  return { context, page, errors };
}
async function visible(page, id) {
  return page.locator('#' + id).evaluate(el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
}
async function retained(page, shared) {
  for (const id of ['query', 'image-tab', 'standalone-dialog', 'dialog-location', 'unrelated-top', 'places', 'map', 'place-card', 'address', 'organic', 'snippet', 'organic-location', 'questions', 'question-location', 'after-results', 'footer', 'footer-location']) {
    assert.equal(await visible(page, id), true, id + ' must remain visible');
  }
  if (shared) assert.equal(await visible(page, 'shared'), true, 'Shared result wrapper must remain');
  assert.equal(await page.locator('#query').inputValue(), 'サンプル検索');
  assert.equal(await page.locator('#organic > a').getAttribute('href'), 'https://ordinary.example/');
}
const results = [];
async function scenario(name, config, after) {
  let run;
  try {
    run = await setup(config);
    if (config.row !== '') assert.equal(await visible(run.page, 'location'), false, 'The complete location row, including heading and overflow menu, must be hidden');
    if (after) await after(run.page);
    await retained(run.page, config.shared);
    assert.deepEqual(run.errors, []);
    results.push({ name, passed: true }); console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message);
  } finally { await run?.context.close(); }
}
try {
  await scenario('observed desktop structure: heading and menu are siblings of update-location', { row: band('location', { native: true }) });
  await scenario('mobile variant: semantic location heading and help menu without native update-location', { row: band('location') });
  await scenario('location heading rendered as h2', { row: band('location', { h2: true }) });
  await scenario('location icon precedes the city heading in a separate sibling', { row: band('location', { h2: true, iconOutside: true }) });
  await scenario('long hidden help dialogs do not poison location classification', { row: band('location', { longDialog: true, native: true }) });
  await scenario('semantic location inside shared data-q/MjjYud wrapper preserves results', { row: band('location'), shared: true });
  await scenario('inline important display does not reveal the semantic location row', { row: band('location', { important: true }), direct: true });
  await scenario('semantic location is hidden before icon layout and stays hidden after late stylesheet', { row: band('location'), lateCSS: true }, async page => {
    await page.evaluate(() => { document.getElementById('late-style').textContent = '#location svg{width:48px;height:48px}'; });
    await page.waitForTimeout(60);
    assert.equal(await visible(page, 'location'), false, 'CSS-only layout changes must not reveal the location row');
  });
  await scenario('site inline display rewrite is suppressed before a frame and latest display is restored off search', { row: band('location', { important: true }), direct: true }, async page => {
    const firstFrame = await page.evaluate(() => new Promise(resolve => {
      const row = document.getElementById('location');
      row.style.setProperty('display', 'grid', 'important');
      requestAnimationFrame(() => resolve({ visible: !!row.getClientRects().length, display: row.style.getPropertyValue('display'), priority: row.style.getPropertyPriority('display') }));
    }));
    assert.deepEqual(firstFrame, { visible: false, display: 'none', priority: 'important' });
    await page.evaluate(() => history.pushState({}, '', '/preferences'));
    await page.waitForTimeout(30);
    assert.equal(await visible(page, 'location'), true, 'Leaving search releases the location row');
    assert.deepEqual(await page.locator('#location').evaluate(row => [row.style.getPropertyValue('display'), row.style.getPropertyPriority('display')]), ['grid', 'important'], 'Latest site display and its priority must survive suppression');
  });
  await scenario('non-search route restores original inline display and priority', { row: band('location', { important: true }), direct: true }, async page => {
    await page.evaluate(() => history.replaceState({}, '', '/preferences'));
    await page.waitForTimeout(30);
    assert.equal(await visible(page, 'location'), true);
    assert.deepEqual(await page.locator('#location').evaluate(row => [row.style.getPropertyValue('display'), row.style.getPropertyPriority('display')]), ['flex', 'important']);
    await page.evaluate(() => history.replaceState({}, '', '/search?q=another'));
    await page.waitForTimeout(30);
    assert.equal(await visible(page, 'location'), false, 'Returning to search suppresses the row again');
  });
  await scenario('recycled location node becomes a visible ordinary result', { row: band('location', { important: true }), direct: true }, async page => {
    await page.evaluate(() => {
      const row = document.getElementById('location');
      row.innerHTML = '<a href="https://new-result.example/"><h3>新しい通常の検索結果</h3></a><p>検索結果の説明</p>';
    });
    await page.waitForTimeout(50);
    assert.equal(await visible(page, 'location'), true, 'Recycled ordinary result must be restored');
    assert.deepEqual(await page.locator('#location').evaluate(row => [row.style.getPropertyValue('display'), row.style.getPropertyPriority('display')]), ['flex', 'important']);
    assert.equal(await page.locator('#location > a').getAttribute('href'), 'https://new-result.example/');
  });
  await scenario('dynamically inserted semantic strip is absent from its first animation frame', { row: '', direct: true }, async page => {
    const frames = await page.evaluate(markup => new Promise(resolve => {
      document.getElementById('taw').insertAdjacentHTML('afterbegin', markup);
      const snapshots = [];
      function sample() {
        const row = document.getElementById('location');
        snapshots.push(!!row.getClientRects().length);
        if (snapshots.length < 3) requestAnimationFrame(sample); else resolve(snapshots);
      }
      requestAnimationFrame(sample);
    }), band('location', { important: true }));
    assert.deepEqual(frames, [false, false, false], 'A dynamically inserted row must not flash in a rendered frame');
  });
  const failed = results.filter(result => !result.passed);
  console.log(JSON.stringify({ kind: 'offline observed-desktop-derived and synthetic mobile semantic fixtures', passed: results.length - failed.length, total: results.length, failures: failed }, null, 2));
  assert.equal(failed.length, 0, 'Location semantics regressions');
} finally { await browser.close(); }
