import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { movieGeometry, movieGridPage } from './fixtures/google-movie-grid.mjs';

const url = 'https://www.google.com/search?q=ぶしのいちぶん';
const old = await readFile(new URL('../Android_Generic_AutoPager_v6.82.js', import.meta.url), 'utf8');
const originals = new Map();
const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
try {
  for (const [version, source] of [['original', null], ['v6.82', old], ['candidate', await buildUserscript()]]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
    try {
      await page.route('https://www.google.com/**', route => {
        const n = 1 + Number(new URL(route.request().url()).searchParams.get('start')) / 10;
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: n <= 4 ? movieGridPage(n) : '<main>終了</main>' });
      });
      if (source) await page.addInitScript({ content: source });
      await page.goto(source ? url : url + '&start=20');
      if (source) for (const n of [2, 3, 4]) {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.locator('.generic-autopager-page[data-page="' + n + '"] [data-item]').first().waitFor();
      }
      for (const width of [390, 320, 412, 620]) {
        await page.setViewportSize({ width, height: 780 });
        const result = await page.evaluate(movieGeometry);
        const { boxes, areas } = result;
        console.log(version, width, JSON.stringify(result));
        if (width === 390 && process.env.GOOGLE_MOVIE_GRID_DIR) {
          await page.locator('[data-item="movie"]').screenshot({ path: process.env.GOOGLE_MOVIE_GRID_DIR + '/' + version + '.png' });
        }
        if (version === 'original') {
          assert(areas.includes('summary poster') && boxes.h3[0] < 30);
          assert(boxes.p[0] + boxes.p[2] <= boxes.img[0]);
          assert(boxes.h3[1] + boxes.h3[3] <= boxes.p[1]);
          originals.set(width, result);
        } else if (version === 'v6.82') {
          assert.equal(areas, 'none');
          assert(boxes.h3[2] < originals.get(width).boxes.h3[2], 'heading squeezed into implicit column');
          assert(boxes.small[1] < boxes.p[1] + boxes.p[3] && boxes.p[1] < boxes.small[1] + boxes.small[3], 'rating overlaps snippet');
        } else {
          assert.deepEqual(result, originals.get(width), 'match the source card and surrounding result order at ' + width);
        }
      }
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
