/**
 * Continuous scroll/load-throughput regressions, with v6.65 as the failure
 * control. These controlled Chromium fixtures are not native Berry evidence.
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
const output = process.env.GOOGLE_CONTINUOUS_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const current = await buildUserscript();
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.65.js'), 'utf8');
const browser = await chromium.launch(launch);
const observations = [];
let passed = 0;

function fixture(start, { videos = false, ample = false } = {}) {
  const count = ample && !start ? 70 : 10;
  const cards = Array.from({ length: count }, (_, n) => {
    const video = videos && start && n === 0;
    const number = start + n + 1;
    const href = video ? `https://www.youtube.com/watch?v=smooth0000${start}` : `https://result${number}.example/article`;
    return `<article class="result" data-result="${start}-${n}"><div class="source">検索元 ${number}<br>https://${video ? 'www.youtube.com' : 'result' + number + '.example'}</div><a href="${href}"><h3>${video ? 'Googleの動画タイトル ' : '通常の検索結果 '}${number}</h3></a><p>本文とリンクを保ったまま次の検索結果へ続きます。</p></article>`;
  }).join('');
  // Every result is 190px tall from actual text, padding and border. There are
  // no artificial tall spacers, min-height tricks or large source-only boxes.
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:14px/20px Arial,sans-serif;background:#fff;color:#202124}.result{padding:42px 16px;border-bottom:8px solid #e8eaed;background:white}.source{font-size:12px;line-height:18px}h3{font-size:20px;font-weight:400;line-height:26px;margin:8px 0}p{margin:0;line-height:20px}a{color:#1967d2}</style></head><body><main id="search"><div id="rso">${cards}</div></main><nav><a id="pnnext" href="/search?q=continuous&amp;start=${start + 10}">次へ</a></nav></body></html>`;
}

async function open(code, options = {}) {
  const context = await browser.newContext({ viewport: { width: 500, height: 983 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const state = { requests: [], titleRequests: [], active: 0, maxActive: 0 };
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.youtube.com' && url.pathname === '/oembed') {
      const video = new URL(url.searchParams.get('url')).searchParams.get('v');
      state.titleRequests.push({ video, at: Date.now() });
      await new Promise(resolve => setTimeout(resolve, 1800));
      try {
        return await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ title: '確定した動画のタイトル ' + video }) });
      } catch (error) { if (!page.isClosed()) throw error; return; }
    }
    if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
    const start = Number(url.searchParams.get('start')) || 0;
    if (!start) return route.fulfill({ contentType: 'text/html', body: fixture(0, options) });
    state.requests.push({ start, at: Date.now() });
    state.active++;
    state.maxActive = Math.max(state.maxActive, state.active);
    try {
      if (options.gated && start === 10) await gate;
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.fulfill({ contentType: 'text/html', body: fixture(start, options) });
    } catch (error) { if (!page.isClosed()) throw error; }
    finally { state.active--; }
  });
  await page.addInitScript(() => {
    if (window.top !== window.self) return;
    const nativeScrollBy = window.scrollBy.bind(window), nativeScrollTo = window.scrollTo.bind(window);
    const probe = window.__continuous = { frames: [], longTasks: [], appends: [], titleChanges: [], outerWrites: [], touches: [], maxFrames: 0, sampling: true };
    window.__readerRelativeScroll = distance => nativeScrollBy(0, distance);
    window.scrollBy = (...args) => { probe.outerWrites.push({ kind: 'scrollBy', args }); return nativeScrollBy(...args); };
    window.scrollTo = (...args) => { probe.outerWrites.push({ kind: 'scrollTo', args }); return nativeScrollTo(...args); };
    const titles = new Map();
    document.addEventListener('GenericAutoPagerLoaded', event => {
      const section = event.detail.container;
      probe.appends.push({ page: event.detail.page, at: performance.now(), y: scrollY,
        top: section.getBoundingClientRect().top + scrollY, height: section.getBoundingClientRect().height });
      for (const title of section.querySelectorAll('h3')) titles.set(title, title.textContent);
    });
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(type, () => {
      probe.touches.push({ type, at: performance.now(), y: scrollY });
    }, { passive: true });
    new MutationObserver(records => {
      probe.maxFrames = Math.max(probe.maxFrames, document.querySelectorAll('#generic-autopager-google-frame').length);
      for (const record of records) {
        const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        const title = node?.closest?.('h3');
        if (title && titles.has(title) && title.textContent !== titles.get(title)) {
          probe.titleChanges.push({ at: performance.now(), old: titles.get(title), text: title.textContent });
          titles.set(title, title.textContent);
        }
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) probe.longTasks.push({ at: entry.startTime, duration: entry.duration });
      }).observe({ type: 'longtask', buffered: true });
    } catch { /* Timing observations are supporting evidence, not a CPU gate. */ }
    const sample = at => {
      if (!probe.sampling) return;
      probe.frames.push({ at, y: scrollY, remaining: Math.max(0, (document.scrollingElement?.scrollHeight || 0) - innerHeight - scrollY) });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  if (code) await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=continuous', { waitUntil: 'domcontentloaded' });
  // Identical fixed reading time for the frozen and current versions. Never
  // wait for an appended page or a prepared-title request before moving.
  await page.waitForTimeout(250);
  const initial = await page.evaluate(() => ({ height: document.documentElement.scrollHeight,
    nativeHeight: document.querySelector('#rso > article').getBoundingClientRect().height * 10,
    viewport: innerHeight, y: scrollY }));
  return { context, page, state, errors, initial, release, close: async () => { release(); await context.close(); } };
}

async function readContinuously(test) {
  return test.page.evaluate(async () => {
    const trace = [], started = performance.now();
    for (let n = 1; n <= 120; n++) {
      const before = scrollY, distance = 120;
      const remainingBefore = document.documentElement.scrollHeight - innerHeight - before;
      window.__readerRelativeScroll(distance);
      const after = scrollY;
      trace.push({ at: performance.now(), requested: distance, before, y: after,
        lost: Math.max(0, distance - (after - before)), remainingBefore,
        remaining: document.documentElement.scrollHeight - innerHeight - after,
        status: document.getElementById('generic-autopager-status-v2')?.textContent });
      await new Promise(resolve => setTimeout(resolve, Math.max(0, started + n * 60 - performance.now())));
    }
    return { started, ended: performance.now(), trace, y: scrollY };
  });
}

async function finish(test, label, extra = {}) {
  const value = await test.page.evaluate(() => {
    window.__continuous.sampling = false;
    return { ...window.__continuous, y: scrollY, viewport: innerHeight,
      status: document.getElementById('generic-autopager-status-v2')?.textContent,
      pages: [...document.querySelectorAll('.generic-autopager-page')].map(node => ({ page: Number(node.dataset.page), top: node.getBoundingClientRect().top + scrollY })) };
  });
  const result = { label, initial: test.initial, requests: test.state.requests, titleRequests: test.state.titleRequests, ...value, ...extra };
  observations.push(result);
  if (output) await test.page.screenshot({ path: resolve(output, label + '.png'), animations: 'disabled' });
  return result;
}

try {
  for (const videos of [false, true]) {
    for (const [name, code] of [['frozen-v665', frozen], ['current', current]]) {
      const test = await open(code, { videos });
      try {
        assert(test.initial.nativeHeight >= 1800 && test.initial.nativeHeight <= 2100,
          'The first page must remain about two viewports, not the former 6000px fixture');
        const reading = await readContinuously(test);
        // Allow the deliberately late responses to finish after reading, while
        // keeping all continuity assertions tied to the moving interval.
        if (videos && name === 'current') await test.page.waitForTimeout(2200);
        const result = await finish(test, name + (videos ? '-slow-titles' : '-dense-text'), { reading });
        const lost = reading.trace.reduce((sum, step) => sum + step.lost, 0);
        const clamps = reading.trace.filter(step => step.lost >= 100 && step.remaining <= 1);
        const crossed = result.appends.filter(entry => entry.at <= reading.ended && entry.top <= reading.y + result.viewport).length;
        if (name === 'frozen-v665') {
          assert(clamps.length >= 3 && lost >= 360,
            'Frozen v6.65 must reproduce repeated end clamps during sustained reading');
          console.log(`PASS frozen v6.65 ${videos ? 'slow titles' : 'dense text'} control: ${clamps.length} clamped attempts, ${Math.round(lost)}px lost while continuously reading`);
        } else {
          assert(crossed >= 5, 'Reader must cross at least five appended-page boundaries without stopping the input sequence');
          assert(lost <= 120, `Prepared content should keep up with sustained reading; lost ${lost}px`);
          assert(clamps.length === 0, 'No full input step is swallowed at the loaded document end');
          assert.deepEqual(result.outerWrites, [], 'Pager must not force the outer scroll position');
          assert.equal(result.maxFrames, 1, 'Only one rendered preparation iframe may be active');
          assert.equal(test.state.maxActive, 1, 'Google page requests remain serial');
          assert.equal(new Set(test.state.requests.map(item => item.start)).size, test.state.requests.length, 'No duplicate page requests');
          assert.deepEqual(result.titleChanges, [], 'No already-visible heading is rewritten by a late title response');
          if (videos) assert(test.state.titleRequests.length >= 5, 'Slow-title case must actually exercise multiple independent delayed resolvers');
          console.log(`PASS current ${videos ? 'slow titles' : 'dense text'}: ${crossed} page boundaries crossed, ${Math.round(lost)}px lost, no outer scroll writes or late title changes`);
        }
        assert.deepEqual(test.errors, []);
        passed++;
      } finally { await test.close(); }
    }
  }

  // Native touch input exercises browser scrolling and the post-release fling.
  // Ample initial content separates gesture continuity from network starvation.
  // Release the pending next page only after the touch ends, so preparation and
  // append happen during the period in which the browser can still be flinging.
  for (const [name, code] of [['native-control', ''], ['current-native', current]]) {
    const test = await open(code, { ample: true, gated: true });
    try {
      const cdp = await test.context.newCDPSession(test.page);
      const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: 250, y, id: 1, radiusX: 8, radiusY: 8 }] });
      await touch('touchStart', 850);
      for (const y of [770, 690, 610, 530, 450, 370, 290, 210]) {
        await test.page.waitForTimeout(16);
        await touch('touchMove', y);
      }
      await touch('touchEnd');
      test.release();
      await test.page.waitForTimeout(1600);
      const result = await finish(test, name + '-fling');
      const began = result.touches.find(event => event.type === 'touchstart');
      const ended = result.touches.findLast(event => event.type === 'touchend');
      assert(began && ended, 'Native touchstart/touchend must reach the actual page');
      assert(result.y > ended.y + 30, 'Browser must keep scrolling after touch release, not merely react to programmatic positions');
      assert.deepEqual(result.outerWrites, [], 'Neither the pager nor the test forces outer scroll positions during native gestures');
      assert(result.frames.filter(frame => frame.at >= began.at).every(frame => frame.remaining > 983), 'Ample-content gesture never reaches the document end');
      if (code) {
        assert(result.appends.some(entry => entry.at > ended.at), 'An actual next page is appended after touch release');
        assert.equal(result.maxFrames, 1);
      }
      assert.deepEqual(test.errors, []);
      await cdp.detach();
      console.log(`PASS ${name}: native touch produces ${Math.round(result.y - ended.y)}px of post-release motion with ample content and no forced outer scrolling`);
      passed++;
    } finally { await test.close(); }
  }
  console.log(`Google continuous scroll tests passed: ${passed} scenarios; controlled dense pages and native Chromium touch input, not Berry device verification`);
} finally {
  if (output) await writeFile(resolve(output, 'continuous-scroll-observations.json'), JSON.stringify(observations, null, 2) + '\n');
  await browser.close();
}
