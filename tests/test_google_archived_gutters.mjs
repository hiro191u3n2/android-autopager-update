// Replay the archived mobile Google response at its original URL with all
// external requests blocked. Keep its stylesheet and result markup together.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';

const require = createRequire(import.meta.url);
const { PNG } = require('playwright-core/lib/utilsBundle');
const archive = await readFile(process.env.GOOGLE_MOBILE_ARCHIVE_FILE);
assert.equal(createHash('sha256').update(archive).digest('hex'),
  '9d550fe7b1c62f42ee4cfa975607a7bedbb4038f44e911908fe7dfc0f96152de');
const url = 'https://www.google.com/search?q=fixture';
const dom = new JSDOM(archive.toString('utf8'), { url: url + '&start=10' });
dom.window.document.querySelectorAll('script,base,link,iframe,meta[http-equiv]').forEach(n => n.remove());
const sourcePage = dom.serialize();
dom.window.close();
const firstPage = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style>body{margin:0}article{min-height:1500px}</style><main id="search"><div id="rso">' +
  '<article><a href="https://fixture.example/"><h3>First result</h3></a></article></div></main>' +
  '<a id="pnnext" href="/search?q=fixture&amp;start=10">Next</a>';
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const shell = (await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE)).default;
  launch.executablePath = await shell.executablePath();
  launch.args = shell.args.filter(a => !['--single-process', '--disable-web-security'].includes(a));
}
const browser = await chromium.launch(launch);
async function measure(script) {
  const context = await browser.newContext({ viewport: { width: 500, height: 995 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.route('**/*', route => {
      const address = new URL(route.request().url());
      const start = address.searchParams.get('start') || '';
      if (address.origin !== 'https://www.google.com' || address.pathname !== '/search' ||
          address.searchParams.get('q') !== 'fixture' || !['', '10'].includes(start)) return route.abort();
      return route.fulfill({ contentType: 'text/html; charset=utf-8',
        headers: { 'Content-Security-Policy': "script-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-src https://www.google.com; connect-src 'none'" },
        body: start ? sourcePage : firstPage });
    });
    if (script) await page.addInitScript({ content: script });
    await page.goto(script ? url : url + '&start=10');
    const root = page.locator(script ? '.generic-autopager-page[data-page="2"] .generic-autopager-google-source-root' : '#rso');
    await root.waitFor();
    // Include the existing delayed import repair before taking a screenshot.
    if (script) await page.waitForTimeout(550);
    const headers = await root.evaluate(node => [...node.querySelectorAll('a[href]')].flatMap(a => {
      const title = a.querySelector('h3,[role="heading"]'), box = a.getBoundingClientRect();
      return title && box.height ? [{ title: title.innerText, y: Math.round(box.top + scrollY) - 4 }] : [];
    }));
    const shot = PNG.sync.read(await page.screenshot({ fullPage: true, scale: 'css', animations: 'disabled' }));
    const areas = await root.evaluate(node => {
      const map = node.querySelector('[data-src*="/maps/vt/"]');
      const action = [...node.querySelectorAll('a')].find(a => a.textContent.includes('View 1,411 hotels'));
      const label = [...action.querySelectorAll('*')].find(el => getComputedStyle(el).display === 'flex');
      return [map, label, action].map(el => Math.round(el.getBoundingClientRect().height));
    });
    const gutters = headers.map(({ title, y }) => ({ title, gutter: [4, 40, 240, 470, 494].map(x => {
      assert(y >= 0 && y < shot.height && x < shot.width);
      return shot.data.readUInt32BE((y * shot.width + x) * 4);
    }) }));
    return { gutters, areas };
  } finally { await context.close(); }
}
try {
  const { gutters: native, areas } = await measure(null);
  const { gutters: previous } = await measure(await readFile(new URL('../Android_Generic_AutoPager_v6.67.js', import.meta.url), 'utf8'));
  const old = await measure(await readFile(new URL('../Android_Generic_AutoPager_v6.79.js', import.meta.url), 'utf8'));
  const { gutters: current, areas: restored } = await measure(await buildUserscript());
  assert.deepEqual(areas, [120, 40, 56]);
  assert.deepEqual(old.areas, [0, 20, 36]);
  assert.deepEqual(restored, areas);
  console.log('PASS archived Google hotel map, footer button and tap area:', old.areas, '=>', restored);
  assert.deepEqual(previous.map(r => r.title), native.map(r => r.title));
  assert.deepEqual(current.map(r => r.title), native.map(r => r.title));
  const nativeGrey = 0xf1f3f4ff;
  const indices = native.flatMap((r, i) => r.gutter.every(c => c === nativeGrey) ? [i] : []);
  assert.equal(indices.length, 8, 'Eight native grey gutters in the archived page');
  for (const i of indices) {
    assert(previous[i].gutter.every(c => c === 0xffffffff), 'Frozen v6.67 loses the native gutter at ' + i);
    assert.deepEqual(current[i].gutter, native[i].gutter, 'Candidate restores the entire original gutter at ' + i);
  }
  console.log('PASS archived Google mobile page: eight original grey gutters turn white in v6.67 and match the source in the candidate');
} finally { await browser.close(); }
