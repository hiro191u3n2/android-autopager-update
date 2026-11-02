/**
 * Offline Chromium rendering tests for the real built userscript. All network
 * requests are fulfilled by fixtures; this is not a live Google/Android test.
 * The source iframe owns the rich-result CSS; the parent deliberately does not.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const deps = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths: deps }));
const options = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) options.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundled = loaded.default || loaded;
  options.executablePath = await bundled.executablePath();
  options.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(options);
const built = await buildUserscript();
const moduleText = await readFile(resolve(ROOT, 'src/google-import-layout.js'), 'utf8');
const baseline = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.44.js'), 'utf8');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=', 'base64');
const longTitle = '動画の元の日本語タイトルが長くなっても説明文と画像に重ならず複数行で表示されることを確認するテストです';
let passed = 0;

function fixture(start, dark = false) {
  if (!start) return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{margin:0;font:14px Arial;background:${dark ? '#202124' : '#fff'};color:${dark ? '#e8eaed' : '#202124'}}
    #native{padding:16px;min-height:200px}.source-header{display:block}.video-media{position:static}
    .play-control{position:absolute;left:0;bottom:-22px}.source-description{position:absolute;top:0}
  </style><main id="search"><div id="rso"><article id="native"><h3><a href="https://native.example/one">初回の通常検索結果</a></h3><p>初回ページは変更しません。</p></article></div></main>
  <nav><a id="pnnext" href="/search?q=layout&start=10">次へ</a></nav>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;font:14px/1.5 Arial,sans-serif;background:${dark ? '#202124' : '#fff'};color:${dark ? '#e8eaed' : '#202124'}}
    #rso{width:100%;font:14px/1.5 Arial,sans-serif}.MjjYud{padding:16px;border-bottom:8px solid ${dark ? '#111' : '#e8eaed'};background:${dark ? '#202124' : '#fff'};overflow:hidden}
    .MjjYud[data-kind^="video"]{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto}
    .source-header{display:flex;align-items:center;gap:8px;position:relative}.source-logo{display:block;width:24px;height:24px;border-radius:50%}.source-name{font-size:14px;line-height:20px}.source-url{font-size:12px;line-height:16px}
    .source-title{font-size:20px;line-height:26px;margin:12px 0 10px;font-weight:400;color:${dark ? '#8ab4f8' : '#1a0dab'}}a{color:inherit;text-decoration:none}
    .video-layout{display:grid;grid-template-columns:128px minmax(0,1fr);gap:12px;align-items:start}.video-media{position:relative;width:128px;height:72px;overflow:hidden;border-radius:8px}
    .video-thumb{display:block;width:100%;height:100%;object-fit:cover}.play-control{position:absolute;left:8px;bottom:8px;width:24px;height:24px;border:0;border-radius:50%;background:#000;color:#fff;padding:0;font-size:14px}
    .duration{position:absolute;right:4px;bottom:4px;padding:0 3px;font-size:11px;line-height:16px;background:#000;color:#fff}.source-description{position:static;margin:0;font-size:14px;line-height:21px;color:${dark ? '#bdc1c6' : '#5f6368'}}
    .product-layout{display:flex;gap:12px;align-items:start}.product-copy{flex:1;min-width:0}.product-thumb{width:80px;height:80px;object-fit:cover}.rating{display:block;margin-top:8px}
    .hidden-duplicate{display:none}.source-favicon-row{visibility:hidden;height:0;overflow:hidden}
  </style><main id="search"><div id="rso">
  <article class="MjjYud" data-kind="video-${start}"><div class="source-header"><img class="source-logo" src="/logo.png"><div><div class="source-name">YouTube・動画チャンネル</div><div class="source-url">https://www.youtube.com</div></div></div><a href="https://www.youtube.com/watch?v=abc123def${start}"><h3 class="source-title">短い動画タイトル</h3></a><div class="video-layout"><div class="video-media"><a href="https://www.youtube.com/watch?v=abc123def${start}"><img class="video-thumb" src="/video.png" width="128" height="72" alt="動画サムネイル"></a><button class="play-control" aria-label="再生">▶</button><span class="duration">1:19</span></div><p class="source-description">動画説明です。画像の下の再生ボタンや時間がこの文章に重ならないことを確認します。</p></div><img class="hidden-duplicate" src="/hidden.png" alt="非表示の重複画像"><div class="source-favicon-row"><img src="/hidden-logo.png"></div></article>
  <article class="MjjYud" data-kind="product-${start}"><div class="source-header"><img class="source-logo" src="/logo.png"><div><div class="source-name">NARUMI ONLINE</div><div class="source-url">https://store.example</div></div></div><a href="https://store.example/item/${start}"><h3 class="source-title">ミニスカートの商品情報</h3></a><div class="product-layout"><div class="product-copy"><p class="source-description">写真とレビューから選べる商品です。商品説明がサイト名やロゴと重ならず表示されます。</p><span class="rating">評価 4.7 ★★★★☆ （12件）</span></div><img class="product-thumb" src="/product.png" width="80" height="80"></div></article>
  <article class="MjjYud" data-kind="editorial-${start}"><div class="source-header"><img class="source-logo" src="/logo.png"><div><div class="source-name">ViVi ファッション記事</div><div class="source-url">https://vivi.example</div></div></div><a href="https://vivi.example/article/${start}"><h3 class="source-title">冬のミニスカート着こなし３選</h3></a><p class="source-description">2022/11/30 — トップスをインしてすっきり着こなすコーディネート。ミニスカート ¥6990／EMODA、ブーツ ¥13200／ブランド。編集部がおすすめを紹介します。</p></article>
  </div></main>${start === 10 ? '<nav><a id="pnnext" href="/search?q=layout&start=20">次へ</a></nav>' : ''}`;
}

async function setup(code, width, dark) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/oembed') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ title: longTitle }), headers: { 'access-control-allow-origin': '*' } });
    if (/\.png$/.test(url.pathname)) return route.fulfill({ contentType: 'image/png', body: png });
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html', body: fixture(Number(url.searchParams.get('start')) || 0, dark) });
    return route.abort();
  });
  await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=layout', { waitUntil: 'load' });
  await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 20000 });
  await page.waitForTimeout(450);
  return { context, page, errors };
}

async function geometry(page, start = 10) {
  return page.evaluate(start => {
    const scope = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    const rect = el => { const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
    const video = scope.querySelector(`[data-kind="video-${start}"]`), product = scope.querySelector(`[data-kind="product-${start}"]`), editorial = scope.querySelector(`[data-kind="editorial-${start}"]`);
    const describe = card => card ? {
      card:rect(card), source:rect(card.querySelector('.source-header')), title:rect(card.querySelector('h3')), titleText:card.querySelector('h3').textContent,
      description:rect(card.querySelector('.source-description')), descriptionText:card.querySelector('.source-description').textContent,
      background:getComputedStyle(card).backgroundColor, color:getComputedStyle(card).color,
    } : null;
    return {
      video: video ? { ...describe(video), media:rect(video.querySelector('.video-media')), play:rect(video.querySelector('.play-control')), duration:rect(video.querySelector('.duration')), hidden:getComputedStyle(video.querySelector('.hidden-duplicate')).display, hiddenVisibility:getComputedStyle(video.querySelector('.source-favicon-row')).visibility } : null,
      product:describe(product), editorial:describe(editorial), commerceCount:scope.querySelectorAll('[data-generic-autopager-commerce-safe]').length,
      markerCount:scope.querySelectorAll('[data-generic-google-layout-v647="1"]').length,
      width:innerWidth, documentWidth:document.documentElement.scrollWidth,
      link:product?.querySelector('a[href]')?.href,
      native:document.getElementById('native').outerHTML,
    };
  }, start);
}

function contained(inner, outer, label) {
  assert(inner.left >= outer.left - 1 && inner.top >= outer.top - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1, label + ' stays inside thumbnail');
}

function verify(g, label, dark, start = 10) {
  assert(g.markerCount >= 1, label + ': captured layout is marked');
  assert(g.video && g.product && g.editorial, label + ': all original result nodes preserved');
  contained(g.video.play, g.video.media, label + ': play control');
  contained(g.video.duration, g.video.media, label + ': duration');
  assert(g.video.media.width > 100 && g.video.media.height > 50, label + ': media dimensions preserved');
  for (const [name, card] of Object.entries({ video:g.video, product:g.product, editorial:g.editorial })) {
    assert(card.source.bottom <= card.title.top + 1, label + ': ' + name + ' source precedes title');
    assert(card.title.bottom <= card.description.top + 1, label + ': ' + name + ' title precedes description');
    assert(card.description.bottom <= card.card.bottom + 1, label + ': ' + name + ' description within card');
    assert.equal(card.background, dark ? 'rgb(32, 33, 36)' : 'rgb(255, 255, 255)', label + ': ' + name + ' source theme preserved');
  }
  assert.equal(g.video.hidden, 'none', label + ': CSS-hidden duplicate stays hidden');
  assert.equal(g.video.hiddenVisibility, 'hidden', label + ': invisible source row stays invisible');
  assert.equal(g.commerceCount, 0, label + ': editorial prices do not rebuild normal results');
  assert(g.editorial.descriptionText.includes('¥6990') && g.editorial.descriptionText.includes('¥13200'), label + ': complete editorial snippet retained');
  assert.equal(g.video.titleText, longTitle, label + ': original YouTube title restoration remains active');
  assert(g.video.title.height > 26, label + ': restored title wraps');
  assert.equal(g.link, `https://store.example/item/${start}`, label + ': original destination link retained');
  assert(g.documentWidth <= g.width + 1, label + ': no horizontal page overflow');
  assert.equal(g.native, '<article id="native"><h3><a href="https://native.example/one">初回の通常検索結果</a></h3><p>初回ページは変更しません。</p></article>', label + ': original first-page card untouched');
}

try {
  // The fixture is meaningful only if the old import reproduces a failure.
  const old = await setup(baseline, 360, false);
  try {
    const g = await geometry(old.page);
    const escaped = !g.video || g.video.play.bottom > g.video.media.bottom + 1 || g.video.play.left < g.video.media.left - 1;
    assert(escaped || !g.editorial || g.commerceCount > 0, 'Frozen baseline must reproduce the missing-CSS/false-commerce defect');
    console.log('PASS baseline control reproduces imported rich-result layout failure'); passed++;
  } finally { await old.context.close(); }

  for (const width of [360, 412]) for (const dark of [false, true]) {
    const current = await setup(built, width, dark);
    const label = `${width}px ${dark ? 'dark' : 'light'}`;
    try {
      verify(await geometry(current.page), label, dark);
      await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout:20000 });
      await current.page.waitForTimeout(450);
      verify(await geometry(current.page, 20), label + ' page 3', dark, 20);
      assert.deepEqual(current.errors, [], label + ': no runtime errors');
      if (process.env.GOOGLE_TEST_SCREENSHOT && width === 360 && !dark) {
        await current.page.screenshot({ path:process.env.GOOGLE_TEST_SCREENSHOT, fullPage:true });
      }
      console.log('PASS ' + label + ': real iframe imports on pages 2/3, overlays, snippet/order, title wrapping, theme, hidden state, first page and links'); passed++;
    } finally { await current.context.close(); }
  }

  const isolation = await browser.newPage({ viewport:{width:360,height:850} });
  try {
    await isolation.route('**/*', route => route.fulfill({contentType:'text/html',body:'<!doctype html><main id="rso" style="height:300px"><h3>Other site</h3><img hidden src="data:image/png;base64," style="display:none"></main>'}));
    await isolation.goto('https://brand.example/search?q=layout');
    await isolation.addScriptTag({content:moduleText});
    const result = await isolation.evaluate(() => {
      const source=document.getElementById('rso'), before=source.outerHTML, clone=source.cloneNode(true), cloneBefore=clone.outerHTML;
      return { captured:captureGenericGoogleLayoutV647(source), applied:applyGenericGoogleLayoutV647(source,clone), has:hasGenericGoogleLayoutV647(clone), unchanged:source.outerHTML===before && clone.outerHTML===cloneBefore };
    });
    assert.deepEqual(result,{captured:false,applied:false,has:false,unchanged:true});
    console.log('PASS non-Google document remains untouched'); passed++;
  } finally { await isolation.close(); }
  console.log(`Google imported-layout Chromium tests passed: ${passed} scenarios, all requests intercepted; not live Google or Android verification`);
} finally { await browser.close(); }
