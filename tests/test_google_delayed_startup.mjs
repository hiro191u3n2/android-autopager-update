import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { visualPage } from './fixtures/google-visible-results.mjs';
import { gotoPage } from './fixtures/google-goto.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.81.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
try {
  for (const [previous, code] of [[true, old], [false, await buildUserscript()]]) {
    for (const kind of ['missing', 'replaced', 'bfcache', 'frame-menu', 'goto', 'signed-goto']) {
      const wrapped = kind === 'goto' || kind === 'signed-goto';
      const page = await browser.newPage({ viewport: { width: 390, height: 760 }, isMobile: true });
      const requests = [], errors = [];
      try {
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', route => {
          const u = new URL(route.request().url());
          if (u.origin !== 'https://www.google.com' || u.pathname !== '/search') return route.abort();
          const n = 1 + Number(u.searchParams.get('start')) / 10;
          requests.push(n);
          let body = n === 1 && kind !== 'frame-menu' && !wrapped ? '<meta name="viewport" content="width=device-width,initial-scale=1"><body>' +
            (kind === 'replaced' ? '<main id="search"><div id="rso"></div></main>' : '') :
            n <= 7 ? (wrapped ? gotoPage(n, kind === 'signed-goto') : visualPage(n)) : '<main>終了</main>';
          if (kind === 'frame-menu' && n === 2) {
            const content = body.slice(body.indexOf('<main'));
            body = body.slice(0, body.indexOf('<main')) + '<main id="search"><div id="rso"><a href="/preferences">設定</a></div></main>' +
              '<script>setTimeout(()=>{document.querySelector("main").remove();document.body.insertAdjacentHTML("beforeend",' +
              JSON.stringify(content) + ')},1000)</script>';
          }
          return route.fulfill({ contentType: 'text/html; charset=utf-8', body });
        });
        await page.addInitScript({ content: code });
        await page.goto('https://www.google.com/search?q=visual');
        await page.waitForTimeout(350);
        if (!previous && kind !== 'frame-menu' && !wrapped) assert.deepEqual(requests, [1], 'Do not fetch while the shell is empty');
        if (kind === 'bfcache') await page.evaluate(() => {
          dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
          dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        });
        if (kind !== 'frame-menu' && !wrapped) await page.evaluate(html => {
          document.querySelector('main')?.remove();
          document.body.insertAdjacentHTML('beforeend', html.slice(html.indexOf('<main')));
        }, visualPage(1));
        if (previous) {
          await page.waitForTimeout(kind === 'frame-menu' ? 1200 : 650);
          assert.equal(await page.locator('.generic-autopager-page').count(), 0);
        } else {
          for (let n = 2; n <= 7; n++) {
            await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
            await page.locator('.generic-autopager-page[data-page="' + n + '"] h3').first().waitFor();
          }
          assert.deepEqual(requests.slice(0, 7), [1, 2, 3, 4, 5, 6, 7]);
          assert.equal(new Set(requests).size, requests.length);
          if (wrapped) {
            const section = page.locator('.generic-autopager-page[data-page="3"]');
            const expected = kind === 'signed-goto' ? 'https://www.google.com/goto?url=token-3-1&gsessionid=session-3' : 'https://guide.example/3';
            assert.equal(await section.locator('h3').first().evaluate(h => h.closest('a').href), expected);
            assert.match(await section.locator('[data-invalid]').getAttribute('href'), /^https:\/\/www\.google\.com\/goto/);
            const heading = section.locator('h3').first();
            let destination;
            await page.route(url => url.href === expected, route => {
              destination = route.request().url();
              return route.fulfill({ contentType: 'text/plain', body: '掲載先' });
            });
            await heading.click();
            await page.waitForURL(url => url.href === expected);
            assert.equal(destination, expected);
          }
        }
        assert.deepEqual(errors, []);
        console.log(previous ? 'v6.81' : 'candidate', kind, 'PASS');
      } finally { await page.close(); }
    }
  }
} finally { await browser.close(); }
