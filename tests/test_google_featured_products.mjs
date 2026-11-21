import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { featuredProductsPage } from './fixtures/google-featured-products.mjs';

const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const { default: bundle } = await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  launch.executablePath = await bundle.executablePath();
  launch.args = bundle.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const browser = await chromium.launch(launch);
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.co.jp' && url.pathname === '/search') {
      const start = Number(url.searchParams.get('start'));
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: start > 20 ? '<html></html>' : featuredProductsPage(start) });
    }
    if (url.pathname === '/salmon.svg') return route.fulfill({ contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"/>' });
    return route.abort();
  });
  await page.addInitScript({ content: await buildUserscript() });
  await page.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
  const pages = page.locator('.generic-autopager-page');
  await pages.first().waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pages.nth(1).waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-tiles] a,[data-prices] button,[data-section-heading]')].some(e => e.getClientRects().length));
  assert.equal(await page.locator('[data-keep=images]:visible').count(), 3);
  assert.equal(await page.locator('[data-keep=rakuten]:visible').count(), 3);
  assert.equal(await page.locator('[data-keep=related]:visible').count(), 3);
  assert.equal(await page.locator('#feature-0').evaluate(el => el.getBoundingClientRect().height), 0);
  console.log('PASS mobile initial and two appended shelves collapse; image block, price-bearing organic results and related products survive');

  await page.evaluate(() => {
    const mount = document.createElement('section');
    mount.id = 'streamed';
    mount.innerHTML = '<div><span>注目されている商品</span></div>';
    document.querySelector('#rso').prepend(mount);
  });
  await page.waitForTimeout(100);
  assert(await page.locator('#streamed').isVisible());
  await page.evaluate(() => {
    const grid = document.querySelector('#feature-0 [data-tiles]').cloneNode(true);
    document.querySelector('#streamed').append(grid);
  });
  await page.locator('#streamed').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    document.querySelector('#streamed').innerHTML = '<a href="https://example.com/new"><h3>通常の商品情報</h3></a>';
  });
  await page.locator('#streamed h3').waitFor();
  await page.evaluate(() => history.pushState({}, '', '/search?q=サーモンキャンディ&udm=28'));
  await page.locator('#feature-0 [data-prices] button').first().waitFor();
  await page.evaluate(() => history.back());
  await page.waitForURL(url => !url.searchParams.has('udm'));
  await page.locator('#feature-0').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS streamed products, recycled organic result, Shopping tab and back navigation');
} finally { await browser.close(); }
