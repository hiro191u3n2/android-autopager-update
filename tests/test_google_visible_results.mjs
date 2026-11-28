import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { visualPage, readVisibleResults } from './fixtures/google-visible-results.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.79.js', import.meta.url), 'utf8');
const candidate = await buildUserscript();
const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
try {
  for (const [width, colorScheme] of [[360, 'light'], [412, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 760 }, colorScheme, isMobile: true, hasTouch: true });
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin !== 'https://www.google.com' || u.pathname !== '/search') return route.abort();
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: visualPage(1 + Number(u.searchParams.get('start')) / 10) });
    });
    try {
      const direct = await context.newPage();
      const url = 'https://www.google.com/search?q=visual';
      const reference = new Map();
      for (let n = 2; n <= 7; n++) {
        await direct.goto(url + '&start=' + (n - 1) * 10);
        reference.set(n, await direct.locator('#rso').evaluate(readVisibleResults));
      }
      await direct.close();
      for (const source of [old, candidate]) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript({ content: source });
        await page.goto(url);
        for (let n = 2; n <= 7; n++) {
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          const root = page.locator('.generic-autopager-page[data-page="' + n + '"] .generic-autopager-google-source-root');
          await root.waitFor();
          const got = await root.evaluate(readVisibleResults);
          const expected = reference.get(n);
          if (source === candidate) assert.deepEqual(got, expected, 'Visible items, spacing or hit targets changed on page ' + n);
          else {
            assert.equal(got.find(e => e.tag === 'img').visibleHeight, 0);
            assert(got.find(e => e.tag === 'button').height < expected.find(e => e.tag === 'button').height);
          }
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
      console.log('PASS source vs appended pages 2–7,', width, colorScheme);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
