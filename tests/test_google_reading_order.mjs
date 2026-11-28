import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { readingPage, measureReadingOrder } from './fixtures/google-reading-order.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.83.js', import.meta.url), 'utf8');
const browser = await chromium.launch({executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined});
try {
  for (const [previous, code] of [[true,old],[false,await buildUserscript()]]) {
    const page = await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
    try {
      await page.route('https://www.google.com/**', route=>{
        const n=1+Number(new URL(route.request().url()).searchParams.get('start'))/10;
        return route.fulfill({contentType:'text/html; charset=utf-8',body:n<=7?readingPage(n,route.request().url()):'<main>終了</main>'});
      });
      await page.addInitScript({content:code});
      await page.goto('https://www.google.com/search?q=ぶしのいちぶん');
      for(let n=2;n<=7;n++){
        await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
        await page.locator('[data-reading="'+n+'"]').first().waitFor();
      }
      const result = await page.evaluate(measureReadingOrder);
      console.log(previous?'6.83':'candidate',JSON.stringify(result));
      assert.equal(result.firstOpen,!previous);
      assert.equal(result.local,!previous);
      assert.deepEqual(result.thirdOpen,[false,true]);
      assert.equal(result.other,'https://cinema.example/movie#%E6%B3%A8%E9%87%88');
      assert.equal(new URL(result.missing).searchParams.get('start'),'20');
      assert.equal(new URL(result.missing).hash,'#unavailable');
      if(!previous){
        assert(result.defaults.every(Boolean));
        assert.equal(result.label,'第3ページの上映日');
        assert.equal(result.labelHidden,true);
        assert(await page.locator('[data-reading="3"]').getByRole('button',{name: '第3ページの上映日'}).count());
        await page.locator('[data-reading="3"] [data-local]').click();
        assert.equal(await page.evaluate(()=>document.querySelector(':target')===document.querySelector('[data-reading="3"] [data-note]')),true);
        assert(await page.locator('[data-reading="7"]').count());
      } else assert.notEqual(result.label,'第3ページの上映日');
    } finally {await page.close();}
  }
} finally {await browser.close();}
