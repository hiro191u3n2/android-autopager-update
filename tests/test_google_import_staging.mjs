/**
 * Complete-script append-order checks for the 2026-11-12 recording. All URLs
 * are served from controlled fixtures; this is not live Google/Berry evidence.
 */
import './test_google_import_staging_unit.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const paths = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundled = loaded.default || loaded;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const output = process.env.GOOGLE_STAGING_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const built = await buildUserscript();
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.62.js'), 'utf8');
const browser = await chromium.launch(launch);
const observations = [];
const nativeMarkup = '<article id="staging-native"><a href="https://native.example/first"><h3>初回の通常検索結果</h3></a><p>初回の結果と検索欄を変更しません。</p></article>';
const placeholder = '属性にだけ入っている非常に長い動画の説明文を本当の動画タイトルと誤認して一瞬表示しないことを確認するための仮の文章です';
const finalTitle = start => '確定した日本語の動画タイトル ' + start;
const googleTitle = start => 'Googleの表示タイトル ' + start;
let passed = 0;

function fixture(start) {
  const related = '<section data-staging-related><h2>他の人はこちらも検索</h2><a href="/search?q=staging-related-one">関連語1</a><a href="/search?q=staging-related-two">関連語2</a></section>';
  const head = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px/1.5 Arial,sans-serif;background:#fff;color:#202124}h3{font-size:20px;font-weight:400}a{color:#1a0dab}article{padding:16px}#staging-native{min-height:250px}#footer{padding:20px;background:#e8eaed;min-height:160px}[data-staging-related]{padding:16px}[data-staging-related] a{display:block;padding:12px}#manual-next{padding:12px}</style></head><body>';
  if (!start) return `${head}<header><input id="staging-query" value="staging"></header><main id="search"><div id="rso">${nativeMarkup}</div></main>${related}<nav id="manual-next" style="display:flex"><a id="pnnext" href="/search?q=staging&start=10">次へ</a></nav><footer id="footer" style="display:grid">日本・ヘルプ・プライバシー</footer></body></html>`;
  return `${head}<main id="search"><div id="rso"><article class="MjjYud" data-staging-video="${start}"><cite>YouTube・動画チャンネル</cite><a href="https://www.youtube.com/watch?v=clip00000${start}"><h3>${googleTitle(start)}</h3><img width="100" height="60" alt="${placeholder}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect width='100' height='60' fill='%238ca7bf'/%3E%3C/svg%3E"></a><p>映像の説明文と元のリンクを保持します。</p></article>${related}<footer data-import-footer>追加ページのフッター</footer><div class="fixture-spacer" style="height:2600px" aria-hidden="true"></div></div></main>${start === 10 ? '<nav><a id="pnnext" href="/search?q=staging&start=20">次へ</a></nav>' : ''}</body></html>`;
}

async function open(code, { late = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 500, height: 983 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [];
  let releasePage2, firstTitleRequest;
  const page2Gate = new Promise(resolve => { releasePage2 = resolve; });
  const titleRequested = new Promise(resolve => { firstTitleRequest = resolve; });
  const state = { failNext: false, lateResponses: [], titleRequests: 0, requestedStarts: [] };
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.com' && url.pathname === '/search') {
      const start = Number(url.searchParams.get('start')) || 0;
      state.requestedStarts.push(start);
      if (start === 10) await page2Gate;
      if (start === 20 && state.failNext) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>unusual traffic</title><p>通常と異なるトラフィック</p>' });
      // The existing Google pager synthesizes start+10 when no next link is
      // present. Return the same external-result identity at the end so its
      // unchanged duplicate-signature stop, rather than a new end heuristic,
      // exercises final tail restoration.
      return route.fulfill({ contentType: 'text/html', body: fixture(start >= 30 ? 20 : start) });
    }
    if (url.hostname === 'www.youtube.com' && url.pathname === '/oembed') {
      state.titleRequests++;
      firstTitleRequest();
      const canonical = new URL(url.searchParams.get('url'));
      const start = Number(canonical.searchParams.get('v').slice(-2));
      const response = { contentType: 'application/json', body: JSON.stringify({ title: finalTitle(start) }), headers: { 'access-control-allow-origin': '*' } };
      if (late) {
        state.lateResponses.push(() => route.fulfill(response));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      return route.fulfill(response);
    }
    return route.abort();
  });
  await page.addInitScript(() => {
    if (window.top !== window.self) return;
    window.__stagingTrace = [];
    const previous = new Map();
    const record = kind => {
      for (const section of document.querySelectorAll('.generic-autopager-page')) {
        const value = { page: section.dataset.page, titles: [...section.querySelectorAll('[data-staging-video] h3')].map(node => node.textContent),
          related: section.querySelectorAll('[data-staging-related]').length, footers: section.querySelectorAll('footer').length };
        const identity = JSON.stringify(value);
        if (previous.get(value.page) === identity) continue;
        previous.set(value.page, identity);
        window.__stagingTrace.push({ kind, time: performance.now(), ...value });
      }
    };
    new MutationObserver(() => record('mutation')).observe(document, { childList: true, subtree: true, characterData: true });
    document.addEventListener('GenericAutoPagerLoaded', () => record('loaded'));
  });
  await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=staging', { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('generic-autopager-status-v2')?.textContent.startsWith('読込'), { timeout: 20000 });
  return { context, page, state, errors, releasePage2, titleRequested };
}

async function snapshot(current, label) {
  const value = await current.page.evaluate(() => ({
    footerDisplay: getComputedStyle(document.getElementById('footer')).display,
    relatedDisplay: getComputedStyle(document.querySelector('[data-staging-related]')).display,
    nextDisplay: getComputedStyle(document.getElementById('pnnext')).display,
    navDisplay: getComputedStyle(document.getElementById('manual-next')).display,
    nextHref: document.getElementById('pnnext').href,
    native: document.getElementById('staging-native').outerHTML,
    query: document.getElementById('staging-query').value,
    status: document.getElementById('generic-autopager-status-v2').textContent,
    trace: window.__stagingTrace,
  }));
  observations.push({ label, ...value });
  if (output) await current.page.screenshot({ path: resolve(output, label + '.png'), fullPage: true, animations: 'disabled' });
  return value;
}

async function ready(current, pageNumber) {
  await current.page.waitForSelector(`.generic-autopager-page[data-page="${pageNumber}"]`, { timeout: 25000 });
  await current.page.waitForTimeout(150);
}

try {
  const old = await open(frozen);
  try {
    const loading = await snapshot(old, 'frozen-v662-loading');
    assert.notEqual(loading.footerDisplay, 'none', 'Frozen control exposes the native footer while its next page is loading');
    assert.notEqual(loading.relatedDisplay, 'none', 'Frozen control exposes native related searches before the append pushes them away');
    old.releasePage2();
    await old.titleRequested;
    await ready(old, 2);
    await old.page.waitForFunction(expected => document.querySelector('[data-staging-video="10"] h3')?.textContent === expected, finalTitle(10));
    const finished = await snapshot(old, 'frozen-v662-title-changed');
    const titles = finished.trace.filter(entry => entry.page === '2').map(entry => entry.titles[0]);
    assert(titles.includes(placeholder) && titles.includes(finalTitle(10)), 'Frozen control visibly changes placeholder metadata to the fetched title');
    console.log('PASS frozen v6.62 control: loading exposes native tail; displayed title changes from metadata to final title');
    passed++;
  } finally { await old.context.close(); }

  const current = await open(built);
  try {
    const loading = await snapshot(current, 'current-loading-hidden-tail');
    assert.equal(loading.footerDisplay, 'none');
    assert.equal(loading.relatedDisplay, 'none');
    assert.equal(loading.navDisplay, 'none');
    current.releasePage2();
    await current.titleRequested;
    assert.equal(await current.page.locator('.generic-autopager-page[data-page="2"]').count(), 0, 'Page stays detached while its title request is pending');
    await ready(current, 2);
    const finished = await snapshot(current, 'current-first-append-final-title');
    assert.equal(finished.footerDisplay, 'none');
    assert.equal(finished.native, nativeMarkup);
    assert.equal(finished.query, 'staging');
    const page2 = finished.trace.filter(entry => entry.page === '2');
    assert(page2.length >= 1);
    for (const frame of page2) {
      assert.deepEqual(frame.titles, [finalTitle(10)], 'Every observable appended state uses the final title');
      assert.equal(frame.related, 0, 'Imported related searches are removed before append');
      assert.equal(frame.footers, 0, 'Imported footer is removed before append');
    }
    await current.page.locator('#generic-autopager-status-v2').evaluate(node => node.click());
    const paused = await snapshot(current, 'current-paused-manual-next');
    assert.equal(paused.footerDisplay, 'grid');
    assert.equal(paused.navDisplay, 'flex');
    assert.equal(new URL(paused.nextHref).searchParams.get('start'), '20', 'Pause exposes actual page 3, not the initial page 2 link');
    await current.page.locator('#generic-autopager-status-v2').evaluate(node => node.click());
    current.state.failNext = true;
    await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await current.page.waitForFunction(() => document.getElementById('generic-autopager-status-v2')?.textContent === '失敗', { timeout: 20000 });
    const failed = await snapshot(current, 'current-failed-page3-manual-next');
    assert.equal(failed.footerDisplay, 'grid');
    assert.equal(failed.navDisplay, 'flex');
    assert.equal(new URL(failed.nextHref).searchParams.get('start'), '20');
    assert.notEqual(failed.nextDisplay, 'none');
    current.state.failNext = false;
    await current.page.locator('#generic-autopager-status-v2').evaluate(node => node.click());
    await ready(current, 3);
    const retried = await snapshot(current, 'current-retry-page3');
    assert.equal(retried.footerDisplay, 'none', 'No explicit next link still uses the existing synthesized-page continuation');
    assert.equal(new URL(retried.nextHref).searchParams.get('start'), '30');
    const page3 = retried.trace.filter(entry => entry.page === '3');
    assert(page3.length >= 1 && page3.every(entry => entry.titles[0] === finalTitle(20)));
    await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await current.page.waitForFunction(() => document.getElementById('generic-autopager-status-v2')?.style.display === 'none', undefined, { timeout: 20000 });
    const last = await snapshot(current, 'current-duplicate-end-stopped');
    assert(current.state.requestedStarts.includes(30), 'The synthesized next page is actually requested');
    assert.equal(await current.page.locator('.generic-autopager-page[data-page="4"]').count(), 0, 'Existing duplicate-signature end does not append another page');
    assert.equal(last.footerDisplay, 'grid', 'Existing duplicate-result stop restores footer without another pending replacement');
    assert.equal(last.nextDisplay, 'none', 'No stale next link is exposed after the final page');
    assert.deepEqual(current.errors, [], 'Full import/retry sequence has no uncaught runtime errors');
    console.log('PASS current append: prepared title and tail, preserved initial UI, pause/resume, page-3 failure/manual continuation, retry and final-page restoration');
    passed++;
  } finally { await current.context.close(); }

  const late = await open(built, { late: true });
  try {
    late.releasePage2();
    await late.titleRequested;
    await ready(late, 2);
    const first = await snapshot(late, 'current-title-deadline-original');
    assert(first.trace.filter(entry => entry.page === '2').every(entry => entry.titles[0] === googleTitle(10)), 'Deadline keeps the original Google title from the first visible state');
    for (const finish of late.state.lateResponses) await finish();
    await late.page.waitForTimeout(750);
    const after = await snapshot(late, 'current-late-title-no-rewrite');
    assert(after.trace.filter(entry => entry.page === '2').every(entry => entry.titles[0] === googleTitle(10)), 'Late response does not start the old second title-writing pass');
    assert.equal(await late.page.locator('[data-staging-video="10"] h3').textContent(), googleTitle(10));
    assert.deepEqual(late.errors, []);
    console.log('PASS title deadline: first-visible original title remains unchanged after the late resolver response');
    passed++;
  } finally { await late.context.close(); }
  console.log(`Google import staging Chromium tests passed: ${passed} scenarios; controlled fixtures, not live Google or Android verification`);
} finally {
  if (output) await writeFile(resolve(output, 'staging-trace.json'), JSON.stringify(observations, null, 2) + '\n');
  await browser.close();
}
