import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { sparsePage } from './fixtures/google-empty-page.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.83.js', import.meta.url),'utf8');
const browser = await chromium.launch({executablePath:process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined});
try {
  for (const [previous,code] of [[true,old],[false,await buildUserscript()]]) {
    for (const variant of ['intermediate','terminal','overlay']) {
      const ending = variant === 'terminal';
      const page = await browser.newPage({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
      const requests=[];
      try {
        await page.route('https://www.google.com/**',route=>{
          const n=1+Number(new URL(route.request().url()).searchParams.get('start'))/10;
          requests.push(n);
          return route.fulfill({contentType:'text/html; charset=utf-8',body:n<=4?sparsePage(n,ending,variant==='overlay'):'<main>終了</main>'});
        });
        await page.addInitScript({content:code});
        await page.goto('https://www.google.com/search?q=ぶしのいちぶん');
        if (ending && !previous) {
          await page.waitForFunction(()=>document.querySelector('#generic-autopager-status-v2')?.classList.contains('generic-autopager-status-hidden') && !document.querySelector('#generic-autopager-google-frame'));
          await page.waitForTimeout(350);
        } else {
          await page.waitForFunction(()=>{scrollTo(0,document.documentElement.scrollHeight);return !!document.querySelector('.generic-autopager-page[data-page="3"]')});
        }
        const state=await page.evaluate(()=>[...document.querySelectorAll('.generic-autopager-page')].map(p=>[+p.dataset.page,Math.round(p.querySelector('.generic-autopager-google-source-root').getBoundingClientRect().height)]));
        console.log(previous?'6.83':'candidate',variant,JSON.stringify({state,requests}));
        if(variant==='overlay') {
          const overlay = page.locator('.generic-autopager-page[data-page="2"] [data-overlay]');
          assert((await overlay.boundingBox())?.width>0);
          assert.equal(await overlay.getAttribute('href'),'https://museum.example/entry');
        } else if(previous) assert(state.some(([n,h])=>n===2&&h===0));
        else if(ending) {assert.deepEqual(requests,[1,2]);assert.deepEqual(state,[]);}
        else {
          assert(state.some(([n,h])=>n===3&&h>0));
          assert(!state.some(([n])=>n===2));
          assert.equal(requests.filter(n=>n===2).length,1);
        }
      } finally {await page.close();}
    }
  }
} finally {await browser.close();}
