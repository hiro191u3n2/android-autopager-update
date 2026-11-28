import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { gapCases, emptyGapCases, gapPage, measureGap } from './fixtures/google-leading-gap.mjs';

const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
const frozen = await readFile(new URL('../Android_Generic_AutoPager_v6.78.js', import.meta.url), 'utf8');
try {
  for (const [old, source] of [[true, frozen], [false, await buildUserscript()]]) {
    for (const sample of gapCases) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const failures = [];
        page.on('pageerror', error => failures.push(error.message));
        await page.route('https://**/*', route => {
          const url = new URL(route.request().url());
          if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
          const n = 1 + Number(url.searchParams.get('start')) / 10;
          return route.fulfill({ contentType: 'text/html; charset=utf-8', body: n <= 4 ? gapPage(n, sample) : '<main>終了</main>' });
        });
        await page.addInitScript({ content: source });
        await page.goto('https://www.google.com/search?q=ぶしのいちぶん');
        for (const n of [2, 3, 4]) {
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          await page.locator('.generic-autopager-page[data-page="' + n + '"] [data-item]').first().waitFor();
        }
        const result = await page.evaluate(measureGap);
        const blank = emptyGapCases.includes(sample);
        const expected = sample === 'short' ? 8 : blank && !old ? 0 : 250;
        assert.equal(result.slot, expected, JSON.stringify({ old, sample, result }));
        assert(Math.abs(result.gap - result.normalGap - expected) <= 1, JSON.stringify({ old, sample, result }));
        assert.deepEqual(result.cards, [['武士の一分 [HD DVD]', 'https://www.amazon.co.jp/movie/amazon'],
          ['武士の一分 宅配DVDレンタル', 'https://tsutaya.example/movie/tsutaya']]);
        assert.deepEqual(failures, []);
        console.log(old ? 'v6.78.0' : 'candidate', sample, JSON.stringify(result));
      } finally { await page.close(); }
    }
  }
} finally { await browser.close(); }
