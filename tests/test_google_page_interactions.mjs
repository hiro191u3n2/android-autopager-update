import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { interactionPage, residualGaps, preservedStarts, operateThirdPage, gridWidths } from './fixtures/google-page-interactions.mjs';
import { measureGap } from './fixtures/google-leading-gap.mjs';

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.80.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
try {
  for (const [previous, script] of [[true, old], [false, await buildUserscript()]]) {
    for (const sample of [...residualGaps, ...preservedStarts, 'controls']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== 'https://www.google.com' || url.pathname !== '/search') return route.abort();
          const n = 1 + Number(url.searchParams.get('start')) / 10;
          return route.fulfill({ contentType: 'text/html; charset=utf-8', body: n <= 4 ? interactionPage(n, sample) : '<main>終了</main>' });
        });
        await page.addInitScript({ content: script });
        await page.goto('https://www.google.com/search?q=ぶしのいちぶん');
        for (const n of [2, 3, 4]) {
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          await page.locator('.generic-autopager-page[data-page="' + n + '"] [data-item]').first().waitFor();
          if (n === 3 && sample === 'late') await page.locator('[data-transient]').last().evaluate(el => el.remove());
        }
        if (sample === 'controls') {
          const result = await page.evaluate(operateThirdPage);
          if (previous) assert(!result.checkedHere && result.checkedFirst && !result.jumpHere && !result.otherRadios);
          else assert.deepEqual(result, { checkedHere: true, checkedFirst: false, jumpHere: true, otherRadios: true,
            radioHere: true, formHere: true, external: 'https://other.example/#day', details: true });
          for (const width of [660, 320]) {
            await page.setViewportSize({ width, height: 780 });
            const [box, columns] = await page.evaluate(gridWidths);
            if (previous) assert.notEqual(box, columns);
            else assert.equal(box, columns);
          }
        } else {
          if (sample === 'late') await page.waitForTimeout(430);
          const { gap, normalGap, cards } = await page.evaluate(measureGap);
          assert.equal(cards.length, 2);
          if (previous && sample === 'caption') assert(gap < 80);
          else if (previous || preservedStarts.includes(sample)) assert(gap >= 235, sample + ' ' + gap);
          else assert(Math.abs(gap - normalGap) <= 1, sample + ' ' + gap);
        }
        assert.deepEqual(errors, []);
        console.log(previous ? 'v6.80' : 'candidate', sample, 'PASS');
      } finally { await page.close(); }
    }
  }
} finally { await browser.close(); }
