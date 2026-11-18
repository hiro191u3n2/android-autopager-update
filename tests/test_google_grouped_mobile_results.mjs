// Model the recorded 1 + 3 + 1 pattern with independently linked results whose
// headers and bodies are siblings. This is a synthetic mobile Google response.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';
import { ORGANIC_COLORS } from './fixtures/google-organic-groups.mjs';

const require = createRequire(import.meta.url);
const paths = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, process.cwd()].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const module = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundled = module.default || module;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}

const query = 'mobile-group-fixture';
const native = '<article id="native"><h3><a href="https://initial.example/">初回の検索結果</a></h3><p>最初のページです。</p></article>';
const href = (start, index) => `https://shop${index}.example/shop/${start}`;
function fixture(start, { dark, variant }) {
  const c = ORGANIC_COLORS[dark ? 'dark' : 'light'];
  const next = start < 20 ? `<nav><a id="pnnext" href="/search?q=${query}&amp;start=${start + 10}">次へ</a></nav>` : '';
  const result = index => {
    // Sites sometimes use another domain as their display name. The URL on
    // the second line and the main link still agree on the real destination.
    const name = variant === 'branded' && index === 3 ? 'brand-name.jp' : '店舗 ' + index;
    const site = `<div class="source" data-source="${index}"><span>${name}</span><span>https://shop${index}.example</span></div>`;
    const text = `検索結果 ${start} 店舗 ${index}`;
    const title = `<h3 data-title="${index}">${text}</h3>`;
    const destination = `href="${href(start, index)}" data-main="${index}"`;
    let header = variant === 'split'
      ? `<div class="result-header">${site}<a ${destination}>${title}</a></div>`
      : `<a ${destination} class="result-header">${site}${title}</a>`;
    if (variant === 'reversed') {
      header = `<div class="result-header reverse"><h3 data-title="${index}"><a ${destination}>${text}</a></h3>${site}</div>`;
    }
    const sublink = index === 3 ? `<a href="${href(start, index)}/access" data-sitelink>店舗へのアクセス</a>` : '';
    const brief = '営業時間、所在地、お問い合わせ先についてご案内しています。';
    const body = `${header}<div class="result-copy" data-copy="${index}"><p>${brief.repeat(4)}</p>${sublink}</div>`;
    return ['hairline', 'gutter'].includes(variant) ? `<div class="encased">${body}<button class="menu" aria-label="この検索結果について" aria-haspopup="menu">⋮</button></div>` : body;
  };
  const group = indices => `<div class="MjjYud tile">${indices.map(result).join('')}</div>`;
  const carousel = `<g-scrolling-carousel class="rich"><div class="strip">${[1, 2].map(i =>
    `<g-inner-card><span>https://media${i}.example</span><a href="https://media${i}.example/watch"><h3>関連動画 ${i}</h3></a><p>この動画についての説明</p></g-inner-card>`
  ).join('')}</div></g-scrolling-carousel>`;
  const style = `*{box-sizing:border-box}html,body{margin:0;background:${c.page};color:${c.ink};font:14px/20px Arial,sans-serif}
    #native{padding:16px;border-bottom:8px solid ${c.line}}.tile{margin:0;background:${c.page};border-bottom:8px solid ${c.line}}
    .result-header{display:block;padding:14px 16px 0}.source{font-size:13px;line-height:18px}.source span{display:block}
    .reverse{display:flex;flex-direction:column}.reverse .source{order:-1}
    .encased{position:relative;background:${c.page}}.menu{position:absolute;top:12px;right:12px}
    ${variant === 'gutter' ? `.tile{background:${c.line}}.encased+.encased{margin-top:8px}` : `.encased+.encased{border-top:1px solid ${c.line}}`}
    h3{margin:6px 0 0;font-size:18px;line-height:25px;font-weight:400}a{text-decoration:none;color:${c.link}}
    .source{color:${c.ink}}.result-copy{padding:5px 16px 14px}.result-copy p{margin:0}.result-copy a{display:block}
    .rich,g-inner-card{display:block}.strip{display:flex}.strip>g-inner-card{flex:1;min-width:0;padding:12px}`;
  const content = start ? group([1]) + group([2, 3, 4]) + group([5]) + carousel : native;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${style}</style></head><body><main id="search"><div id="rso">${content}</div></main>${next}</body></html>`;
}

async function observe(page, number, color) {
  const root = page.locator(`.generic-autopager-page[data-page="${number}"]`);
  await root.waitFor();
  const geometry = await root.evaluate(parent => {
    const rect = node => {
      const { left, right, top, bottom } = node.getBoundingClientRect();
      return { left: left + scrollX, right: right + scrollX, top: top + scrollY, bottom: bottom + scrollY };
    };
    const content = [...parent.querySelectorAll('[data-source]')].map(node => {
      const i = node.dataset.source;
      const copy = parent.querySelector(`[data-copy="${i}"]`);
      return {
        id: i, top: rect(node).top, bottom: rect(copy.lastElementChild).bottom,
        title: parent.querySelector(`[data-title="${i}"]`).textContent,
        href: parent.querySelector(`[data-main="${i}"]`).href,
      };
    });
    const sublink = parent.querySelector('[data-sitelink]');
    return { content, rich: rect(parent.querySelector('.strip')), page: rect(parent), sublink: sublink.href };
  });
  const png = await page.screenshot({ fullPage: true, scale: 'css', animations: 'disabled', style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  const pixels = await page.evaluate(async ({ data, geometry, color }) => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const bandRows = (top, bottom, left, right) => {
      const x = Math.ceil(left) + 4, y = Math.ceil(top), w = Math.floor(right) - 4 - x, h = Math.floor(bottom) - y;
      if (w < 1 || h < 1) return 0;
      const p = ctx.getImageData(x, y, w, h).data;
      let rows = 0;
      for (let dy = 0; dy < h; dy++) {
        let matches = 0;
        for (let dx = 0; dx < w; dx++) {
          const offset = (dy * w + dx) * 4;
          if (color.every((v, i) => Math.abs(p[offset + i] - v) <= 1)) matches++;
        }
        if (matches >= w * .95) rows++;
      }
      return rows;
    };
    const { content, page, rich } = geometry;
    return {
      boundaries: content.slice(1).map((item, index) => bandRows(content[index].bottom, item.top, page.left, page.right)),
      inside: content.map(item => bandRows(item.top, item.bottom, page.left, page.right)),
      carousel: bandRows(rich.top, rich.bottom, rich.left, rich.right),
    };
  }, { data: png.toString('base64'), geometry, color });
  return { ...geometry, ...pixels };
}

const old = await readFile(new URL('../Android_Generic_AutoPager_v6.66.js', import.meta.url), 'utf8');
const current = await buildUserscript();
const browser = await chromium.launch(launch);
try {
  for (const [label, code, variant, dark] of [
    ['v6.66 control', old, 'combined', false],
    ['v6.66 hairline control', old, 'hairline', false],
    ['linked header', current, 'combined', false],
    ['separate title link', current, 'split', true],
    ['different domain as site name', current, 'branded', false],
    ['title precedes attribution in markup', current, 'reversed', false],
    ['thin native line between marked result cards', current, 'hairline', false],
    ['native gutter exposed between marked result cards', current, 'gutter', true],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 770 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
        return route.fulfill({ contentType: 'text/html', body: fixture(Number(url.searchParams.get('start')), { dark, variant }) });
      });
      await page.addInitScript({ content: code });
      await page.goto(`https://www.google.com/search?q=${query}`);
      const color = ORGANIC_COLORS[dark ? 'dark' : 'light'].rgb;
      for (const number of code === old ? [2] : [2, 3]) {
        if (number === 3) {
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          assert(await page.evaluate(() => scrollY > 0), 'Appended pages remain scrollable');
        }
        const result = await observe(page, number, color);
        const start = (number - 1) * 10;
        const ids = [1, 2, 3, 4, 5];
        assert.deepEqual(result.content.map(item => item.title), ids.map(i => `検索結果 ${start} 店舗 ${i}`), label + ': all five results in source order');
        assert.deepEqual(result.content.map(item => item.href), ids.map(i => href(start, i)), label + ': link destinations');
        assert.equal(result.sublink, href(start, 3) + '/access');
        const expectedInternal = code !== old ? 8 : variant === 'hairline' ? 1 : 0;
        assert.deepEqual(result.boundaries, [8, expectedInternal, expectedInternal, 8], label + ': outer dividers intact and both joined boundaries measured in screenshot');
        assert.deepEqual(result.inside, [0, 0, 0, 0, 0], label + ': no separator within ordinary results or sitelinks');
        assert.equal(result.carousel, 0, label + ': no band across related media');
        if (number === 2 && variant === 'combined' && code !== old) {
          // Include the delayed boundary pass and the delayed cleanup pass.
          await page.waitForTimeout(1250);
          const settled = await observe(page, number, color);
          assert.deepEqual(settled.boundaries, result.boundaries, label + ': settled dividers remain single');
          assert.deepEqual(settled.content, result.content, label + ': no delayed content movement');
        }
      }
      assert.equal(await page.locator('#native').evaluate(node => node.outerHTML), native, label + ': first page intact');
      if (code !== old) {
        const last = page.locator('.generic-autopager-page[data-page="3"]');
        await page.evaluate(() => document.addEventListener('click', event => {
          const link = event.target.closest('a');
          if (link) { event.preventDefault(); document.documentElement.dataset.testTapped = link.href; }
        }, true));
        // When the heading wraps an inline link, only its text is clickable.
        const titleTarget = variant === 'reversed' ? '[data-title="3"] a' : '[data-title="3"]';
        for (const selector of [titleTarget, '[data-sitelink]']) {
          const target = last.locator(selector);
          await target.tap();
          assert.equal(await page.locator('html').getAttribute('data-test-tapped'), href(20, 3) + (selector.includes('sitelink') ? '/access' : ''), label + ': touch hits intended link');
        }
      }
      assert.deepEqual(errors, []);
      console.log('PASS grouped mobile results: ' + label);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
