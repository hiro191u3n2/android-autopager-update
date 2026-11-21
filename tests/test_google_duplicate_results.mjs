import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildUserscript } from '../worker/index.js';
import { videoSearchPage } from './fixtures/google-video-duplicates.mjs';

const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const module = await import(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  launch.executablePath = await module.default.executablePath();
  launch.args = module.default.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const card = (id, path = 'guide', title = '料理の手順', snippet = '下ごしらえから焼き上げまでの具体的な手順をご紹介します。', options = {}) => {
  const url = 'https://food.example/' + path;
  const link = options.redirect ? '/url?q=' + encodeURIComponent(url) : url;
  return `<article class="MjjYud" data-result="${id}"><div><cite>https://food.example</cite><a href="${link}"><h3>${title}</h3></a></div><p>${snippet}</p>${options.extra || ''}</article>`;
};
const menu = '<a role="button" aria-haspopup="true" aria-label="この検索結果について" href="/search?about=result">︙</a>';
const first = card('original', undefined, undefined, undefined, { extra: menu }) + card('alternate', 'address', '所在地と交通案内');
const rich = '<g-scrolling-carousel>' + card('rich') + '</g-scrolling-carousel>';
const multi = '<div class="MjjYud"><cite>https://food.example</cite><a href="https://food.example/guide"><h3>料理の手順</h3></a><p>下ごしらえから焼き上げまでの具体的な手順をご紹介します。</p><a href="https://another.example/"><h3>別の結果</h3></a></div>';
const page2 = '<div class="MjjYud" data-outer-repeat><div>' + card('repeat', undefined, undefined, undefined, { redirect: true, extra: menu }) + '</div></div>' + card('different-url', 'place') +
  card('different-title', 'guide', '更新した手順') + card('different-snippet', 'guide', '料理の手順', '別の材料を使った調理方法について最新情報をご案内します。') +
  card('sitelinks', undefined, undefined, undefined, { extra: '<a href="https://food.example/shop">店舗情報</a>' }) +
  rich + multi + card('new', 'new');
const pages = [first, page2, card('later-repeat', 'address', '所在地と交通案内') + card('prior-import-repeat', 'new'), card('last', 'last')];
function html(start) {
  const next = start < 30 ? `<nav><a id="pnnext" href="/search?q=duplicates&amp;start=${start + 10}">次へ</a></nav>` : '';
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}article{padding:10px}h3,p{margin:4px}</style><main id="search"><div id="rso">${pages[start / 10]}</div></main>${next}`;
}
const frozen = await readFile(new URL('../Android_Generic_AutoPager_v6.66.js', import.meta.url), 'utf8');
const browser = await chromium.launch(launch);
try {
  for (const [label, script, fixed] of [['v6.66', frozen, false], ['candidate', await buildUserscript(), true]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
        return route.fulfill({ contentType: 'text/html', body: html(Number(url.searchParams.get('start'))) });
      });
      await page.addInitScript({ content: script });
      await page.goto('https://www.google.com/search?q=duplicates');
      const result = page.locator('.generic-autopager-page');
      await result.nth(0).waitFor();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await result.nth(1).waitFor();
      const ids = (p) => result.nth(p).locator('[data-result]').evaluateAll(nodes => nodes.map(n => n.dataset.result));
      const expected = ['different-url', 'different-title', 'different-snippet', 'sitelinks', 'rich', 'new'];
      assert.deepEqual(await ids(0), fixed ? expected : ['repeat', ...expected]);
      assert.deepEqual(await ids(1), fixed ? [] : ['later-repeat', 'prior-import-repeat']);
      assert.equal(await result.nth(0).locator('[data-outer-repeat]').count(), fixed ? 0 : 1);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await result.nth(2).waitFor();
      assert.deepEqual(await ids(2), ['last'], 'The next populated page loads after an all-duplicate page.');
      assert.equal(await result.nth(0).getByText('別の結果', {exact:true}).count(), 1);
      assert.equal(await page.locator('#rso').first().locator(':scope > [data-result]').evaluateAll(nodes => nodes.map(n => n.outerHTML).join('')), first);
      assert.deepEqual(errors, []);
      console.log('PASS exact duplicate results across pages 1–3: ' + label);
    } finally { await context.close(); }
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', err => errors.push(String(err)));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'www.google.com') return route.abort();
      if (url.pathname === '/search') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: videoSearchPage(Number(url.searchParams.get('start'))) });
      if (/^\/thumb[12]\.svg$/.test(url.pathname)) return route.fulfill({ contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="52"><rect width="80" height="52" fill="' + (url.pathname.includes('1') ? 'red' : 'blue') + '"/></svg>' });
      return route.abort();
    });
    await page.addInitScript({ content: await buildUserscript() });
    await page.goto('https://www.google.com/search?q=サーモンキャンディ');
    const pages = page.locator('.generic-autopager-page');
    await pages.first().waitFor();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pages.nth(1).waitFor();
    const ids = locator => locator.locator('[data-result]').evaluateAll(nodes => nodes.map(n => n.dataset.result));
    assert.equal(await page.locator('#rso > [data-result=original]').count(), 1);
    assert.deepEqual(await ids(pages.first()), ['etsy', 'other-video', 'carousel', 'different-poster']);
    assert.deepEqual(await ids(pages.nth(1)), ['last']);
    assert.deepEqual(errors, []);
    console.log('PASS standalone video overlap, player-only cards, distinct posts/posters and carousel preservation');
  } finally { await context.close(); }
} finally { await browser.close(); }
