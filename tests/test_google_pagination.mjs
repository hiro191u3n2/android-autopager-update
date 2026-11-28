import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';

const browser = await chromium.launch({ executablePath: process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE || undefined });
const script = await buildUserscript();
const origin = 'https://www.google.com';
const query = 'C++ reCAPTCHA とは';
const filters = { lr: 'lang_ja', cr: 'countryJP', safe: 'active', filter: '1', as_sitesearch: 'example.org' };
function url(term, start, extra = {}) {
  return '/search?' + new URLSearchParams({ q: term, start, tbs: 'qdr:m', ...filters, ...extra });
}
function results(start) {
  const article = (id, title) => '<article><a href="https://example.org/' + id + '"><h3>' + title +
    '</h3></a><p>この検索結果の記事について、本文の概要を表示します。</p></article>';
  const shared = Array.from({ length: 8 }, (_, i) => article(i, '共通の検索結果 ' + i)).join('');
  const nav = [url('別の検索語', start + 10), url(query, start + 10, { udm: 2 }),
    url(query, start + 10, { tbs: 'qdr:y' }), url(query, start + 30), url(query, start + 10)];
  if (start >= 40) {
    for (const key of Object.keys(filters)) {
      const alternative = new URL(url(query, start + 10), origin);
      alternative.searchParams.delete(key);
      nav.unshift(alternative.href);
    }
  }
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>reCAPTCHA とは</title>' +
    '<main id="search"><div id="rso">' + shared + article('p' + start, '確認画面の用語解説 ' + start) +
    '</div></main><nav>' + nav.map(href => '<a href="' + href.replaceAll('&', '&amp;') + '">検索結果</a>').join('') + '</nav>';
}
try {
  for (const stop of ['captcha', 'consent', 'repeated']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
    try {
      const offsets = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const req = new URL(route.request().url());
        if (req.origin !== origin || req.pathname !== '/search') return route.abort();
        assert.equal(req.searchParams.get('q'), query);
        assert.equal(req.searchParams.get('tbs'), 'qdr:m');
        assert.equal(req.searchParams.has('udm'), false);
        for (const [key, value] of Object.entries(filters)) assert.equal(req.searchParams.get(key), value, key);
        const start = Number(req.searchParams.get('start'));
        offsets.push(start);
        const end = stop === 'captcha' ? '<form id="captcha-form">ロボットではありません</form>'
          : stop === 'consent' ? '<title>続行する前に</title><main>Google の同意画面</main>' : results(60);
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: start < 70 ? results(start) : end });
      });
      await page.addInitScript({ content: 'delete Array.prototype.at;\n' + script });
      await page.goto(origin + url(query, 0));
      for (let number = 2; number <= 7; number++) {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        const section = page.locator('.generic-autopager-page[data-page="' + number + '"]');
        await section.locator('a[href="https://example.org/p' + ((number - 1) * 10) + '"]').waitFor();
      }
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => !document.querySelector('#generic-autopager-google-frame') &&
        document.querySelectorAll('.generic-autopager-page').length === 6 &&
        !document.querySelector('#generic-autopager-status-v2')?.textContent.includes('読込'));
      await page.waitForTimeout(350);
      assert.deepEqual(offsets, [0, 10, 20, 30, 40, 50, 60, 70]);
      assert.equal(await page.locator('.generic-autopager-page').count(), 6);
      assert.deepEqual(errors, []);
      console.log('PASS Google page order, filters and shared links through page 7; stop=' + stop);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
