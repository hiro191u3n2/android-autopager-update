import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { priceAccordionPage } from './fixtures/google-price-accordions.mjs';

const launch = {executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE};
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const {default: bundle} = await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  launch.executablePath = await bundle.executablePath();
  launch.args = bundle.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const old = await readFile(new URL('../Android_Generic_AutoPager_v6.73.js', import.meta.url), 'utf8');
const candidate = await buildUserscript();
const browser = await chromium.launch(launch);
try {
  for (const [name, script] of [['v6.73', old], ['rendered', candidate], ['fetch', candidate.replace('googleUseRenderedFrame:!0', 'googleUseRenderedFrame:!1')]]) {
    const page = await browser.newPage({viewport:{width:390,height:780}, isMobile:true, hasTouch:true});
    const errors = [];
    page.on('pageerror', err => errors.push(String(err)));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/search') return route.fulfill({contentType:'text/html; charset=utf-8', body:priceAccordionPage(Number(url.searchParams.get('start')))});
      return route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
    });
    // The fetch fallback rebuilds some commerce results in a shadow root.
    // Inspect its source clone immediately after pruning, before that rebuild.
    const hook = 'pruneGenericGoogleFeaturedProductsV672?.(u);';
    assert(script.includes(hook));
    const observed = script.replace(hook, hook + 'window.prunedRows.push([u.querySelectorAll("[data-band]").length,u.querySelectorAll("[data-keep]").length]);');
    await page.addInitScript({content:'if (self === top) {\nwindow.prunedRows=[];\n' + observed + '\n}'});
    await page.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
    for (let appended = 0; appended < 2; appended++) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.locator('.generic-autopager-page').nth(appended).waitFor();
    }
    assert.equal(await page.locator('[data-band]:visible').count(), name === 'v6.73' ? 6 : 0, name);
    assert.deepEqual(await page.evaluate(() => window.prunedRows.slice(0,2)), Array(2).fill([name === 'v6.73' ? 2 : 0, 4]));
    for (const keep of ['images','shop','questions','article']) {
      const selector = '[data-keep="' + keep + '"]:visible';
      assert(await page.locator('#rso ' + selector).first().isVisible(), name + ' initial ' + keep);
      if (name !== 'fetch') assert.equal(await page.locator(selector).count(), 3, name + ' ' + keep);
    }
    if (name !== 'v6.73') {
      assert.equal(await page.locator('.generic-autopager-page [data-band]').count(), 0);
      assert.equal(await page.locator('[data-band-box]:visible').count(), 0);
      await page.evaluate(() => history.pushState({}, '', '/search?q=サーモンキャンディ&udm=28'));
      await page.locator('#rso [data-band="price"]').first().waitFor();
      await page.evaluate(() => history.back());
      await page.locator('#rso [data-band="price"]').first().waitFor({state:'hidden'});
      await page.evaluate(() => {
        const root = document.querySelector('#rso');
        const box = document.createElement('div');
        box.id = 'lazy';
        box.innerHTML = '<button aria-expanded="false"><svg></svg></button>';
        root.prepend(box);
        setTimeout(() => box.insertAdjacentHTML('beforeend','<button aria-expanded="false" aria-label="￥2,000–￥6,000"><img src="/salmon.svg"></button>'), 50);
      });
      await page.locator('#lazy img').waitFor({state:'attached'});
      await page.locator('#lazy').waitFor({state:'hidden'});
      await page.locator('#lazy').evaluate(el => {el.innerHTML = '<h3>新しい通常の検索結果</h3>';});
      await page.locator('#lazy h3').waitFor();
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log('PASS ' + name + ' shopping price rows without a heading, initial and appended pages');
  }
} finally { await browser.close(); }
