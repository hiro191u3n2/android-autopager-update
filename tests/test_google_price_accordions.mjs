import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { priceAccordionPage, priceAfterImagesPage, priceToggleCaptionPage } from './fixtures/google-price-accordions.mjs';

const launch = {executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE};
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const {default: bundle} = await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  launch.executablePath = await bundle.executablePath();
  launch.args = bundle.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const old = await readFile(new URL('../Android_Generic_AutoPager_v6.73.js', import.meta.url), 'utf8');
const previous = await readFile(new URL('../Android_Generic_AutoPager_v6.74.js', import.meta.url), 'utf8');
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
  for (const [name, script] of [['v6.74', previous], ['v6.75', candidate]]) {
    const page = await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/search') return route.fulfill({contentType:'text/html; charset=utf-8',body:priceAfterImagesPage(Number(url.searchParams.get('start')))});
      return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
    });
    await page.addInitScript({content:'if (self === top) {\n' + script + '\n}'});
    await page.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
    for (let i=0; i<2; i++) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.locator('.generic-autopager-page').nth(i).waitFor();
    }
    assert.equal(await page.locator('[data-band]:visible').count(), name === 'v6.74' ? 6 : 0);
    assert.equal(await page.locator('[data-suppressed-shelf]:visible').count(), 0);
    for (const keep of ['images','shop','questions','article','videos']) assert.equal(await page.locator('[data-keep="' + keep + '"]:visible').count(), 3);
    assert(await page.locator('[data-keep-chip] button').first().isVisible());
    if (name === 'v6.75') {
      assert.equal(await page.locator('[data-band-box]:visible').count(), 0);
      assert.equal(await page.locator('.generic-autopager-page [data-band]').count(), 0);
      // Reuse the same wrapper for an organic result, then stream back a price.
      const box = page.locator('#rso [data-band-box]').first();
      await box.evaluate(el=>{el.dataset.original=el.innerHTML; el.innerHTML='<a href="https://shop.example/organic"><h3>￥2,000–￥6,000</h3></a>';});
      await box.locator('h3').waitFor();
      await box.evaluate(el=>{el.innerHTML=el.dataset.original;});
      await box.waitFor({state:'hidden'});
      await page.evaluate(()=>history.pushState({},'', '/search?q=サーモンキャンディ&udm=28'));
      await box.waitFor();
      await page.evaluate(()=>history.back());
      await box.waitFor({state:'hidden'});
    }
    await page.close();
    console.log('PASS ' + name + ' price ranges after Images with CSS arrows, shopping links and hidden offer details');
  }
  const v675 = await readFile(new URL('../Android_Generic_AutoPager_v6.75.js', import.meta.url), 'utf8');
  for (const [name, script] of [['v6.75', v675], ['current', candidate], ['fetch', candidate.replace('googleUseRenderedFrame:!0','googleUseRenderedFrame:!1')]]) {
    const page = await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    const errors = [];
    page.on('pageerror', err => errors.push(String(err)));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/search') return route.fulfill({contentType:'text/html; charset=utf-8', body:priceToggleCaptionPage(Number(url.searchParams.get('start')))});
      return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
    });
    const hook = 'pruneGenericGoogleFeaturedProductsV672?.(u);';
    assert(script.includes(hook));
    const observed = script.replace(hook, hook + 'window.framesAfterPrune.push(u.querySelectorAll("[data-price-frame]").length);');
    await page.addInitScript({content:'if (self === top) {\\nwindow.framesAfterPrune=[];\\n' + observed + '\\n}'});
    await page.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
    for (let i=0; i<2; i++) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.locator('.generic-autopager-page').nth(i).waitFor();
    }
    const before = name === 'v6.75';
    assert.deepEqual(await page.evaluate(() => window.framesAfterPrune.slice(0, 2)), before ? [1,1] : [0,0], name + ' imported wrappers');
    const gap = await page.locator('#rso').first().evaluate(root => {
      const bottom = root.querySelector('[data-keep="images"]').getBoundingClientRect().bottom;
      return root.querySelector('[data-keep="shop"]').getBoundingClientRect().top - bottom;
    });
    assert(before ? gap > 20 : Math.abs(gap) <= 1, name + ' gap in CSS pixels: ' + gap);
    assert.equal(await page.locator('#rso [data-price-frame]:visible').count(), before ? 1 : 0);
    if (!before) assert.equal(await page.locator('[data-band]:visible').count(), 0);
    for (const keep of ['images','shop','questions','article','videos']) {
      assert(await page.locator('#rso [data-keep="' + keep + '"]').first().isVisible());
      if (name !== 'fetch') assert.equal(await page.locator('[data-keep="' + keep + '"]:visible').count(), 3);
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log('PASS ' + name + ' price-toggle frame height and both neighboring results');
  }
} finally { await browser.close(); }
