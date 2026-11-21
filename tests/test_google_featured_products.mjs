import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { featuredProductsPage } from './fixtures/google-featured-products.mjs';
import { featuredMobilePage } from './fixtures/google-featured-mobile.mjs';

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
  await page.close();

  const published = await readFile(new URL('../Android_Generic_AutoPager_v6.70.js', import.meta.url), 'utf8');
  for (const [label, script, hidden] of [['v6.70', published, false], ['candidate', await buildUserscript(), true]]) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 768 }, isMobile: true, hasTouch: true });
    try {
      const faults = [];
      mobile.on('pageerror', error => faults.push(String(error)));
      await mobile.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'www.google.co.jp') return route.abort();
        if (url.pathname === '/salmon.svg') return route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="55" height="55"/>'});
        if (url.pathname !== '/search') return route.abort();
        const start = Number(url.searchParams.get('start'));
        return route.fulfill({contentType:'text/html; charset=utf-8', body: start > 20 ? '<html></html>' : featuredMobilePage(start)});
      });
      await mobile.addInitScript({content: script});
      await mobile.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
      const appended = mobile.locator('.generic-autopager-page');
      await appended.first().waitFor();
      await mobile.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await appended.nth(1).waitFor();
      if (hidden) await mobile.waitForFunction(() => !document.querySelector('[data-price-row]').getClientRects().length &&
        ![...document.querySelectorAll('[data-price-row],[data-section-heading],[data-tile]')].some(el => el.getClientRects().length));
      for (const [selector, count] of [['[data-price-row]',6],['[data-section-heading]',3],['[data-tile]',9]]) {
        assert.equal(await mobile.locator(selector + ':visible').count(), hidden ? 0 : count, label + ' ' + selector);
      }
      for (const keep of ['images','rakuten','related']) assert.equal(await mobile.locator('[data-keep=' + keep + ']:visible').count(), 3);
      if (hidden) {
        const heights = await mobile.locator('[data-shelf]').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().height));
        assert(heights.length && heights.every(h => h === 0));
        await mobile.evaluate(() => {
          const area = document.createElement('div');
          area.id = 'mixed-range';
          area.innerHTML = '<h2>注目されている商品</h2><div><img src="/salmon.svg">￥690</div><div><a href="https://outside.example/guide"><h3>価格の調べ方</h3></a></div><button>￥2,000以下</button>';
          document.querySelector('#rso').prepend(area);
          const copy = document.querySelector('[data-shelf]').cloneNode(true);
          for (const el of [copy, ...copy.querySelectorAll('*')]) {
            el.removeAttribute('data-generic-google-cleanup-v648');
            el.style.removeProperty('display');
          }
          const wrapper = document.createElement('div');
          wrapper.setAttribute('data-q', 'salmon');
          wrapper.id = 'generic-query-wrapper';
          wrapper.append(copy);
          area.after(wrapper);
        });
        await mobile.locator('#generic-query-wrapper [data-section-heading]').waitFor({state:'hidden'});
        assert.equal(await mobile.locator('#mixed-range h3:visible').count(), 1);
        assert.equal(await mobile.locator('#mixed-range button:visible').count(), 1);
        await mobile.evaluate(() => history.pushState({}, '', '/search?q=サーモンキャンディ&udm=28'));
        await mobile.locator('#generic-query-wrapper [data-price-row]').first().waitFor();
      }
      assert.deepEqual(faults, []);
      console.log('PASS ' + label + ' screenshot layout: menu, unlinked tiles, thumbnail ranges, mixed organic wrapper and linked module title, three pages');
    } finally { await mobile.close(); }
  }
} finally { await browser.close(); }
