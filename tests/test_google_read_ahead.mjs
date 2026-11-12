/**
 * Complete-script scroll-continuity checks against controlled Google fixtures.
 * Network delays are intentional; these are not live Google/Berry measurements.
 */
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
const output = process.env.GOOGLE_READ_AHEAD_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const current = await buildUserscript();
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.64.js'), 'utf8');
const browser = await chromium.launch(launch);
const observations = [];
const STATUS = '#generic-autopager-status-v2';
let passed = 0;

function fixture(start, short = false) {
  // Natural padding survives the existing importer. A min-height-only spacer
  // would test its unrelated normalization instead of scheduling headroom.
  const count = short ? 3 : 8, padding = short ? 16 : 324;
  const cards = Array.from({ length: count }, (_, n) => `<article class="result" data-result="${start}-${n}">
    <div class="source">結果 ${start + n + 1}<br>https://result${start + n + 1}.example</div>
    <a href="https://result${start + n + 1}.example/article"><h3>次ページへ続く検索結果 ${start + n + 1}</h3></a>
    <p>この検索結果の文章と配置は読み込み前後で変わりません。</p></article>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>*{box-sizing:border-box}body{margin:0;font:14px/20px Arial,sans-serif;background:#fff;color:#202124}header{height:44px}.result{padding:${padding}px 16px;border-bottom:8px solid #e8eaed;background:white}h3{font-size:20px;line-height:26px;margin:8px 0;font-weight:400}p{margin:0}a{color:#1967d2}.source{font-size:12px;line-height:18px}</style>
    </head><body>${start ? '' : '<header><form><input id="query" name="q" value="continuity"></form></header>'}
    <main id="search"><div id="rso">${cards}</div></main>
    <nav><a id="pnnext" href="/search?q=continuity&amp;start=${start + 10}">次へ</a></nav></body></html>`;
}

async function open(code, { delay = 0, gated = false, short = false, firstPageError = false, afterInitialPageShow = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 500, height: 983 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const state = { requests: [], active: 0, maxActive: 0, errorsSent: 0 };
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
    const start = Number(url.searchParams.get('start')) || 0;
    if (start) {
      state.requests.push({ start, at: Date.now() });
      state.active++;
      state.maxActive = Math.max(state.maxActive, state.active);
      try {
        if (gated && start === 10) await gate;
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        const blocked = firstPageError && start === 10 && state.errorsSent === 0;
        if (blocked) state.errorsSent++;
        await route.fulfill({ contentType: 'text/html', body: blocked
          ? '<!doctype html><html><head><title>unusual traffic</title></head><body>通常と異なるトラフィック</body></html>'
          : fixture(start, short) });
      } catch (error) {
        // Closing a context may cancel an intentionally delayed test request.
        if (!page.isClosed()) throw error;
      } finally { state.active--; }
      return;
    }
    return route.fulfill({ contentType: 'text/html', body: fixture(0, short) });
  });
  await page.addInitScript(() => {
    if (window.top !== window.self) return;
    const scroll = window.scrollTo.bind(window);
    const probe = window.__continuity = { outerScrollWrites: [], appends: [], maxFrames: 0, lifecycle: [] };
    for (const type of ['pagehide', 'pageshow']) window.addEventListener(type, event => {
      probe.lifecycle.push({ type, at: performance.now(), persisted: event.persisted, trusted: event.isTrusted });
    });
    window.__readerScroll = y => scroll(0, y);
    window.scrollTo = (...args) => { probe.outerScrollWrites.push(args); return scroll(...args); };
    const frames = () => { probe.maxFrames = Math.max(probe.maxFrames, document.querySelectorAll('#generic-autopager-google-frame').length); };
    new MutationObserver(frames).observe(document, { childList: true, subtree: true });
    document.addEventListener('GenericAutoPagerLoaded', event => {
      probe.appends.push({ page: event.detail.page, y: scrollY, at: performance.now() });
    });
  });
  if (!afterInitialPageShow) await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=continuity', { waitUntil: afterInitialPageShow ? 'load' : 'domcontentloaded' });
  if (afterInitialPageShow) {
    // A gated read-ahead iframe can hold the parent's very first load/pageshow.
    // Dispatching a synthetic pagehide before that real pageshow would create
    // a fictitious resume when the gate opens. Establish the initial lifecycle
    // first, then start the exact same userscript and its pending preparation.
    await page.waitForFunction(() => window.__continuity.lifecycle.some(event => event.type === 'pageshow' && event.trusted));
    await page.addScriptTag({ content: code });
  }
  await page.locator(STATUS).waitFor({ state: 'attached', timeout: 10000 });
  const initial = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, y: scrollY,
    native: document.querySelector('#rso > .result').outerHTML }));
  return { context, page, state, errors, initial, release, close: async () => { release(); await context.close(); } };
}

async function requested(test, start) {
  const end = Date.now() + 15000;
  while (!test.state.requests.some(item => item.start === start)) {
    if (Date.now() >= end) assert.fail(`Expected request start=${start}; got ${JSON.stringify(test.state.requests)}`);
    await test.page.waitForTimeout(20);
  }
}

async function appended(test, page) {
  await test.page.locator(`.generic-autopager-page[data-page="${page}"]`).waitFor({ state: 'attached', timeout: 25000 });
  await test.page.waitForFunction(() => !document.getElementById('generic-autopager-google-frame'), undefined, { timeout: 25000 });
}

async function snapshot(test, label) {
  const value = await test.page.evaluate(() => ({
    y: scrollY, height: document.documentElement.scrollHeight, viewport: innerHeight,
    status: document.getElementById('generic-autopager-status-v2')?.textContent,
    pages: [...document.querySelectorAll('.generic-autopager-page')].map(node => ({ page: node.dataset.page, top: node.getBoundingClientRect().top })),
    probe: window.__continuity,
  }));
  observations.push({ label, requests: test.state.requests, ...value });
  if (output) await test.page.screenshot({ path: resolve(output, label + '.png'), animations: 'disabled' });
  return value;
}

async function rapidReader(test) {
  // Each step represents another swipe's desired displacement. The browser
  // clamps it at the real document end, exposing the recording's wait state.
  return test.page.evaluate(async () => {
    const trace = [];
    for (let n = 1; n <= 16; n++) {
      window.__readerScroll(n * 500);
      await new Promise(resolve => setTimeout(resolve, 60));
      trace.push({ requested: n * 500, y: scrollY, remaining: document.documentElement.scrollHeight - innerHeight - scrollY,
        pages: document.querySelectorAll('.generic-autopager-page').length });
    }
    return trace;
  });
}

try {
  const old = await open(frozen, { delay: 1200 });
  try {
    await old.page.waitForTimeout(3000); // Time spent reading the first results.
    assert.equal(old.state.requests.length, 0, 'Frozen v6.64 waits until close to the initial document end');
    const trace = await rapidReader(old);
    assert(trace.some((item, n) => n > 0 && item.remaining <= 1 && item.y === trace[n - 1].y && item.pages === 0),
      'Frozen control clamps repeated scroll attempts at the old page end before the delayed page arrives');
    observations.push({ label: 'frozen-v664-reader-stall', trace });
    await snapshot(old, 'frozen-v664-old-end');
    console.log('PASS frozen v6.64 control: repeated scroll attempts stop at the old document end while the next page loads');
    passed++;
  } finally { await old.close(); }

  const fresh = await open(current, { delay: 1200 });
  try {
    await requested(fresh, 10);
    assert.equal(await fresh.page.evaluate(() => scrollY), 0, 'Page 2 preparation starts before the first swipe');
    await appended(fresh, 2);
    const ready = await snapshot(fresh, 'current-page2-ready-ahead');
    assert.equal(ready.y, 0, 'Ahead append does not move the outer page');
    assert.deepEqual(fresh.state.requests.map(item => item.start), [10], 'Reading the top of page 1 prepares one next page without crawling page 3');
    assert.equal(await fresh.page.locator('#rso > .result').first().evaluate(node => node.outerHTML), fresh.initial.native);
    const trace = await rapidReader(fresh);
    assert(trace.every((item, n) => n === 0 || item.y > trace[n - 1].y), 'The same swipe trajectory keeps advancing across the old document boundary');
    assert(trace.at(-1).y > fresh.initial.height - 983 + 1000, 'Reader travels well beyond the old finite page end');
    await requested(fresh, 20);
    assert.equal(fresh.state.requests.filter(item => item.start === 20).length, 1, 'Approaching page 2 starts exactly one page-3 preparation');
    await appended(fresh, 3);
    const after = await snapshot(fresh, 'current-reader-crosses-boundary');
    assert.equal(after.y, trace.at(-1).y, 'Completion of the next preparation does not jump the reader');
    assert.deepEqual(after.probe.outerScrollWrites, [], 'The pager never forces outer scrolling');
    assert.equal(after.probe.maxFrames, 1, 'Only one rendered next-page frame exists at a time');
    assert.equal(fresh.state.maxActive, 1, 'Next-page network requests do not overlap');
    assert.deepEqual(fresh.errors, []);
    observations.push({ label: 'current-reader-continuity', trace });
    console.log('PASS read-ahead: page 2 is ready before swiping, the old boundary stays scrollable, page 3 starts once, and scroll position is preserved');
    passed++;
  } finally { await fresh.close(); }

  for (const firstPageError of [false, true]) {
    const paused = await open(current, { gated: true, firstPageError });
    try {
      await requested(paused, 10);
      await paused.page.locator(STATUS).evaluate(node => node.click());
      paused.release();
      await paused.page.waitForFunction(() => !document.getElementById('generic-autopager-google-frame'), undefined, { timeout: 25000 });
      assert.equal(await paused.page.locator('.generic-autopager-page').count(), 0, 'Pausing while a response is pending prevents publishing that prepared page');
      const afterPause = await snapshot(paused, 'current-paused-pending' + (firstPageError ? '-blocked-response' : ''));
      assert.equal(afterPause.y, 0);
      assert.notEqual(afterPause.status, '失敗', 'An obsolete blocked response must not overwrite the paused status');
      assert.equal(paused.state.errorsSent, firstPageError ? 1 : 0, 'The intended normal/error response actually settled');
      await paused.page.locator(STATUS).evaluate(node => node.click());
      await appended(paused, 2);
      assert.equal(await paused.page.locator('.generic-autopager-page').count(), 1, 'Explicit resume continues the same next page once');
      assert.deepEqual(paused.errors, []);
      console.log(`PASS pending pause (${firstPageError ? 'blocked' : 'normal'} response): no background append or obsolete error; the original pause/resume control continues correctly`);
      passed++;
    } finally { await paused.close(); }
  }

  for (const lifecycle of ['query-change', 'pagehide']) for (const firstPageError of [false, true]) {
    const pending = await open(current, { gated: true, firstPageError, afterInitialPageShow: true });
    try {
      await requested(pending, 10);
      await pending.page.evaluate(kind => {
        if (kind === 'query-change') history.pushState({}, '', '/search?q=another-query');
        else dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      }, lifecycle);
      if (lifecycle === 'pagehide') {
        const events = await pending.page.evaluate(() => window.__continuity.lifecycle);
        assert.deepEqual(events.map(event => event.type), ['pageshow', 'pagehide'], 'Initial native pageshow precedes the simulated history departure');
        assert.equal(events[0].trusted, true, 'Observe the actual browser lifecycle before simulating BFCache departure');
      }
      pending.release();
      await pending.page.waitForFunction(() => !document.getElementById('generic-autopager-google-frame'), undefined, { timeout: 25000 });
      assert.equal(await pending.page.locator('.generic-autopager-page').count(), 0, `${lifecycle}: a stale pending response cannot append`);
      assert.notEqual(await pending.page.locator(STATUS).textContent(), '失敗', `${lifecycle}: an obsolete blocked response must not overwrite the current status`);
      assert.equal(pending.state.errorsSent, firstPageError ? 1 : 0, 'The intended normal/error response actually settled');
      const starts = pending.state.requests.length;
      await pending.page.evaluate(() => { window.__readerScroll(1000); dispatchEvent(new Event('resize')); });
      await pending.page.waitForTimeout(250);
      assert.equal(pending.state.requests.length, starts, `${lifecycle}: old pager does not start another request`);
      if (lifecycle === 'pagehide') {
        assert.deepEqual(await pending.page.evaluate(() => window.__continuity.lifecycle.map(event => event.type)), ['pageshow', 'pagehide'],
          'Settling the old iframe cannot produce an unintended native pageshow in the suspended interval');
        await pending.page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        await appended(pending, 2);
        assert.equal(await pending.page.locator('.generic-autopager-page').count(), 1, 'BFCache pageshow resumes the same valid query');
      }
      await snapshot(pending, 'current-' + lifecycle + (firstPageError ? '-blocked-response' : ''));
      assert.deepEqual(pending.errors, []);
      console.log(`PASS pending ${lifecycle} (${firstPageError ? 'blocked' : 'normal'} response): stale preparation/error is discarded; ${lifecycle === 'pagehide' ? 'valid pageshow resumes' : 'changed query stays untouched'}`);
      passed++;
    } finally { await pending.close(); }
  }

  const short = await open(current, { short: true });
  try {
    await short.page.waitForFunction(() => {
      const pages = document.querySelectorAll('.generic-autopager-page');
      return pages.length > 0 && pages[pages.length - 1].getBoundingClientRect().top > innerHeight * 2 &&
        !document.getElementById('generic-autopager-google-frame');
    }, undefined, { timeout: 25000 });
    const requests = short.state.requests.length;
    await short.page.waitForTimeout(600);
    assert.equal(short.state.requests.length, requests, 'Short pages stop preparing when enough content is ahead');
    assert(requests > 1 && requests < 10, 'Short pages fill bounded headroom instead of fetching all 30 pages');
    const result = await snapshot(short, 'current-short-pages-bounded');
    assert.equal(result.y, 0);
    assert.equal(result.probe.maxFrames, 1);
    assert.deepEqual(result.probe.outerScrollWrites, []);
    assert.deepEqual(short.errors, []);
    console.log('PASS short pages: sufficient ahead content is prepared, then loading stops without consuming the page limit');
    passed++;
  } finally { await short.close(); }

  console.log(`Google read-ahead Chromium tests passed: ${passed} scenarios; controlled fixtures, not native Android verification`);
} finally {
  if (output) await writeFile(resolve(output, 'read-ahead-observations.json'), JSON.stringify(observations, null, 2) + '\n');
  await browser.close();
}
