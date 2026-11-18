import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';
import { ORGANIC_COLORS } from './fixtures/google-organic-groups.mjs';
import { MOBILE_FRAME_QUERY, mobileFrameHref, renderGoogleMobileFrameFixture } from './fixtures/google-mobile-frames.mjs';

const require = createRequire(import.meta.url);
const paths = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, process.cwd()].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const { PNG } = require(require.resolve('playwright-core/lib/utilsBundle', { paths }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const module = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundled = module.default || module;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}

function stripeRuns(image, color, top, bottom, left, right) {
  const start = Math.max(0, Math.ceil(left) + 3), end = Math.min(image.width, Math.floor(right) - 3);
  const runs = [];
  let run = 0;
  for (let y = Math.max(0, Math.ceil(top)); y < Math.min(image.height, Math.floor(bottom)); y++) {
    let matches = 0;
    for (let x = start; x < end; x++) {
      const offset = (y * image.width + x) * 4;
      if (color.every((v, i) => Math.abs(image.data[offset + i] - v) <= 1)) matches++;
    }
    if (matches >= (end - start) * .95) run++;
    else if (run) { runs.push(run); run = 0; }
  }
  if (run) runs.push(run);
  return runs;
}

async function measure(page, number, color) {
  const section = page.locator(`.generic-autopager-page[data-page="${number}"]`);
  await section.waitFor();
  const { pageBox, rows, rich } = await section.evaluate(root => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY };
    };
    const rows = [...root.querySelectorAll('[data-observed-source]')].map(source => {
      const id = source.dataset.observedSource;
      const pick = attr => root.querySelector(`[data-observed-${attr}="${id}"]`);
      const image = pick('body').querySelector('.thumb');
      return { id, header: rect(source), favicon: rect(source.querySelector('img')), title: rect(pick('title')),
        menu: rect(pick('menu')), body: rect(pick('body')), thumbnail: image ? rect(image) : null, href: pick('link').href };
    });
    return { pageBox: rect(root), rows, rich: rect(root.querySelector('[data-observed-rich]')) };
  });
  const image = PNG.sync.read(await page.screenshot({ fullPage: true, scale: 'css', animations: 'disabled', style: '#generic-autopager-status-v2{visibility:hidden!important}' }));
  const bands = (top, bottom) => stripeRuns(image, color, top, bottom, pageBox.left, pageBox.right);
  const boundaries = rows.slice(1).map((row, i) => bands(rows[i].body.bottom, Math.min(row.header.top, row.menu.top)));
  const inner = rows.map(row => bands(Math.min(row.header.top, row.menu.top), row.body.bottom));
  return { rows, boundaries, inner, rich: bands(rich.top, rich.bottom) };
}

const frozen = await readFile(new URL('../Android_Generic_AutoPager_v6.67.js', import.meta.url), 'utf8');
const candidate = await buildUserscript();
const browser = await chromium.launch(launch);
const baseline = new Map();
try {
  for (const control of [true, false]) for (const variant of ['captured', 'grid']) {
    const dark = variant === 'grid', color = ORGANIC_COLORS[dark ? 'dark' : 'light'].rgb;
    const context = await browser.newContext({ viewport: { width: 500, height: 925 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, colorScheme: dark ? 'dark' : 'light' });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.href === mobileFrameHref(10, 3)) {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Result destination</title><main>店舗案内</main>' });
        }
        if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
        return route.fulfill({ contentType: 'text/html', body: renderGoogleMobileFrameFixture(Number(url.searchParams.get('start')), { dark, variant }) });
      });
      await page.addInitScript({ content: control ? frozen : candidate });
      await page.goto(`https://www.google.com/search?q=${MOBILE_FRAME_QUERY}`);
      const native = await page.locator('#first').evaluate(node => node.outerHTML);
      for (const number of [2, 3]) {
        if (number === 3) await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        const m = await measure(page, number, color), start = (number - 1) * 10;
        const label = `${control ? 'v6.67' : 'candidate'} ${variant} p${number}`;
        assert.deepEqual(m.rows.map(row => row.href), [1, 2, 3, 4, 5].map(n => mobileFrameHref(start, n)), label + ' links in order');
        assert.deepEqual(m.boundaries, control ? [[8], [], [], [8]] : [[8], [8], [8], [8]], label + ' contiguous near-full-width separator rows');
        assert(m.inner.every(runs => runs.length === 0), label + ' band overlaps a header, menu, snippet or media');
        assert.deepEqual(m.rich, [], label + ' carousel remains intact');
        if (control) baseline.set(variant + number, m.rows);
        else for (const [index, row] of m.rows.entries()) {
          const before = baseline.get(variant + number)[index];
          for (const key of ['header', 'title', 'body', 'menu', 'favicon', 'thumbnail']) {
            if (!before[key]) { assert.equal(row[key], null); continue; }
            assert(Math.abs((row[key].right - row[key].left) - (before[key].right - before[key].left)) <= 1, label + ' stable content width');
            assert(Math.abs((row[key].bottom - row[key].top) - (before[key].bottom - before[key].top)) <= 1, label + ' stable content height');
            assert(Math.abs((row[key].top - row.header.top) - (before[key].top - before.header.top)) <= 1, label + ' within-result spacing preserved');
          }
        }
        console.log('PASS', label, JSON.stringify(m.boundaries));
      }
      if (!control) {
        const sec = page.locator('.generic-autopager-page[data-page="2"]');
        await page.setViewportSize({ width: 390, height: 845 });
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const reflow = await measure(page, 2, color);
        assert.deepEqual(reflow.boundaries, [[8], [8], [8], [8]], variant + ' boundaries follow rewrapped content');
        await page.evaluate(() => {
          window.frameTestHits = new AbortController();
          document.addEventListener('click', event => {
            const target = event.target.closest('[data-observed-link],[data-observed-sitelink],[data-observed-menu]');
            if (!target) return;
            event.preventDefault();
            document.documentElement.dataset.tapped = target.href || target.dataset.observedMenu;
          }, { capture: true, signal: window.frameTestHits.signal });
        });
        for (const [selector, value] of [
          ['[data-observed-title="3"]', mobileFrameHref(10, 3)], ['[data-observed-sitelink]', mobileFrameHref(10, 3) + '/access'], ['[data-observed-menu="3"]', '3'],
        ]) {
          await sec.locator(selector).tap();
          assert.equal(await page.locator('html').getAttribute('data-tapped'), value, variant + ' touch hit ' + selector);
        }
        await page.evaluate(() => window.frameTestHits.abort());
        await Promise.all([page.waitForURL(mobileFrameHref(10, 3)), sec.locator('[data-observed-title="3"]').tap()]);
        await page.goBack();
        assert.equal(new URL(page.url()).searchParams.get('q'), MOBILE_FRAME_QUERY, 'Back returns to the search results');
        assert.deepEqual((await measure(page, 2, color)).boundaries, [[8], [8], [8], [8]], variant + ' single dividers after history return');
      }
      assert.equal(await page.locator('#first').evaluate(node => node.outerHTML), native, 'native page is untouched');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
