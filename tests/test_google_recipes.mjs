import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';
import { recipePage } from './fixtures/google-recipes.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.72.js', import.meta.url), 'utf8');
const launch = {executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE};
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const { default: bundle } = await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  launch.executablePath = await bundle.executablePath();
  launch.args = bundle.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const browser = await chromium.launch(launch);
try {
  for (const [label, script] of [['old', old], ['candidate', await buildUserscript()]]) {
    const page = await browser.newPage({viewport:{width:390,height:780}, isMobile:true});
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/search') return route.fulfill({contentType:'text/html; charset=utf-8',body:recipePage(Number(url.searchParams.get('start')))});
      return route.abort();
    });
    await page.addInitScript({content:'if (window === top) {\n' + script + '\n}'});
    await page.goto('https://www.google.co.jp/search?q=サーモンキャンディ');
    await page.locator('.generic-autopager-page').first().waitFor();
    const roots = [page.locator('#rso'), page.locator('.generic-autopager-page').first()];
    for (const root of roots) {
      for (const keep of ['article','questions']) assert(await root.locator('[data-keep="'+keep+'"]').first().isVisible());
      for (const part of ['card','heading','more','feedback']) {
        assert.equal(await root.locator('[data-recipe-'+part+']:visible').count() > 0, label === 'old', label+' '+part);
      }
    }
    if (label === 'candidate') {
      await page.evaluate(() => {
        const section = document.querySelector('[data-recipe-box]');
        const copy = section.cloneNode(true);
        copy.id = 'delayed';
        for (const el of [copy, ...copy.querySelectorAll('*')]) {
          el.removeAttribute('data-generic-google-cleanup-v648');
          el.style.removeProperty('display');
        }
        const children = [...copy.children].slice(1);
        children.forEach(child => child.remove());
        section.before(copy);
        setTimeout(() => copy.append(...children), 60);
      });
      await page.waitForFunction(() => document.querySelector('#delayed [data-recipe-card]') &&
        !document.querySelector('#delayed [data-recipe-card]').getClientRects().length);
      await page.evaluate(() => {
        const link = document.querySelector('#delayed');
        link.innerHTML = '<a href="https://blog.example/cooking"><h3>レシピ</h3></a><p>15分で作れる料理</p>';
      });
      await page.locator('#delayed a').waitFor({state:'visible'});
    }
    await page.close();
    console.log('PASS recipe section and adjacent results: '+label);
  }
} finally { await browser.close(); }
