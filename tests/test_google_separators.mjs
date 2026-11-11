/**
 * Offline Chromium regression fixtures for result dividers on imported Google
 * pages. The fetched iframe owns all divider CSS; the parent does not. These
 * are controlled DOM reproductions, not a captured Google/Android response.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
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
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.53.js'), 'utf8');
const kinds = ['before', 'after', 'pseudo-border', 'anchored', 'empty', 'minheight', 'border'];
const native = '<article id="native"><h3><a href="https://native.example/one">初回の検索結果</a></h3><p>検索欄と初回ページは変更しません。</p></article>';
let passed = 0;

function result(start, kind, position) {
  const id = `${kind}-${start}-${position}`;
  const extras = kind === 'border' && position === 1 ? `
    <div class="sitelinks"><a href="https://result.example/${id}/one"><h3>関連記事その一</h3></a><a href="https://result.example/${id}/two"><h3>関連記事その二</h3></a></div>
    <div class="carousel"><a href="https://item.example/${start}/a"><h3>横並びカードA</h3></a><a href="https://item.example/${start}/b"><h3>横並びカードB</h3></a></div>` : '';
  return `<article class="result ${kind === 'before' && position === 2 ? 'pseudo-before' : ''} ${kind === 'after' && position === 1 ? 'pseudo-after' : ''} ${kind === 'pseudo-border' && position === 1 ? 'pseudo-border' : ''} ${kind === 'anchored' && position === 1 ? 'anchored-line' : ''} ${kind === 'border' && position === 1 ? 'border-line' : ''}" data-result="${id}"><div class="result-copy"><div class="source-header"><span class="logo" aria-hidden="true"></span><div>情報サイト ${id}<div class="source-url">https://result.example</div></div></div><a class="main-link" href="https://result.example/${id}"><h3>検索結果 ${id} の見出し</h3></a><p>検索結果本文。追加したページでも見出しと説明文の順序を保ち、次の結果との区切りを表示します。</p>${extras}</div></article>`;
}

function fixture(start, dark = false) {
  const page = dark ? '#202124' : '#fff';
  const ink = dark ? '#e8eaed' : '#202124';
  const line = dark ? '#111' : '#e8eaed';
  if (!start) return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:${page};color:${ink};font:14px/1.5 Arial,sans-serif}#native{padding:16px;min-height:200px}.pseudo-before::before,.pseudo-after::after,.pseudo-border::after,.anchored-line::after{content:"";display:block;width:100%;height:3px;background:#f00;border-top:2px solid #f0f}</style><main id="search"><div id="rso">${native}</div></main><nav><a id="pnnext" href="/search?q=separator&start=10">次へ</a></nav>`;
  const groups = kinds.map(kind => `<div class="MjjYud" data-group="${kind}-${start}">${result(start, kind, 1)}${kind === 'empty' ? '<div class="empty-line" role="separator"></div>' : kind === 'minheight' ? '<div class="minheight-line" aria-hidden="true"></div>' : ''}${result(start, kind, 2)}</div>`).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;background:${page};color:${ink};font:14px/1.5 Arial,sans-serif}
    #rso{width:100%}.MjjYud{display:block;margin:0;padding:0;border-bottom:8px solid ${line};background:${page}}
    .result{display:block;position:relative;margin:0;padding:0;background:${page}}.result-copy{padding:16px}
    .source-header{display:flex;align-items:center;gap:8px}.source-url{font-size:12px}.logo{display:block;flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:#39ad75}
    h3{font-size:19px;line-height:26px;font-weight:400;margin:10px 0}a{color:${dark ? '#8ab4f8' : '#1a0dab'};text-decoration:none}p{font-size:14px;line-height:21px;margin:0}
    .pseudo-before::before,.pseudo-after::after{content:"";display:block;width:100%;height:8px;background:${line};pointer-events:none}
    .pseudo-border::after{content:"";display:block;width:100%;height:0;border-bottom:8px solid ${line};pointer-events:none}
    .anchored-line{padding-bottom:8px}.anchored-line::after{content:"";position:absolute;left:0;right:0;bottom:0;height:8px;background:${line};pointer-events:none}
    .MjjYud[data-group^="empty-"]{display:flex;flex-direction:column;align-items:flex-start}.MjjYud[data-group^="empty-"]>.result{align-self:stretch}
    .empty-line{display:inline-block;width:100%;height:8px;background:${line}}.minheight-line{display:block;width:100%;min-height:8px;background:${line}}
    .border-line{border-bottom:8px solid ${line}}
    .sitelinks{display:block;padding:6px 0}.sitelinks h3{font-size:15px;line-height:20px;margin:0;padding:4px 0}
    .carousel{display:flex;gap:12px;overflow:hidden}.carousel>a{flex:0 0 120px;min-width:0}.carousel h3{font-size:14px;line-height:20px;margin:0;padding:6px 0}
  </style><main id="search"><div id="rso">${groups}</div></main>${start === 10 ? '<nav><a id="pnnext" href="/search?q=separator&start=20">次へ</a></nav>' : ''}`;
}

async function setup(code, width, dark) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html', body: fixture(Number(url.searchParams.get('start')) || 0, dark) });
    return route.abort();
  });
  await page.addInitScript({ content: code });
  await page.goto('https://www.google.com/search?q=separator', { waitUntil: 'load' });
  await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 20000 });
  await page.waitForTimeout(450);
  return { context, page, errors };
}

async function measure(page, start, dark) {
  const geometry = await page.evaluate(({ start, kinds }) => {
    const scope = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    const rect = node => {
      const value = node.getBoundingClientRect();
      return { left: value.left + scrollX, right: value.right + scrollX, top: value.top + scrollY, bottom: value.bottom + scrollY, width: value.width, height: value.height };
    };
    const groups = kinds.map(kind => {
      const first = scope.querySelector(`[data-result="${kind}-${start}-1"]`);
      const second = scope.querySelector(`[data-result="${kind}-${start}-2"]`);
      return {
        kind, first: rect(first), second: rect(second),
        firstCopy: rect(first.querySelector('.result-copy')), secondCopy: rect(second.querySelector('.result-copy')),
        link: second.querySelector('.main-link').href,
      };
    });
    const internals = scope.querySelector(`[data-result="border-${start}-1"]`);
    const carousel = [...internals.querySelectorAll('.carousel>a')].map(rect);
    return {
      groups, native: document.getElementById('native').outerHTML,
      sourceHeader: rect(internals.querySelector('.source-header')),
      title: rect(internals.querySelector('.main-link h3')),
      paragraph: rect(internals.querySelector('p')), carousel,
      siteLinks: [...internals.querySelectorAll('.sitelinks a')].map(node => node.href),
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    };
  }, { start, kinds });
  // Read the painted rows, so preservation via native pseudo elements, concrete
  // decorative elements, or a border is equally acceptable. A gray DOM node
  // with zero height, wrong width, or no actual paint must not count as a line.
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  if (process.env.GOOGLE_SEPARATOR_SCREENSHOT) await writeFile(process.env.GOOGLE_SEPARATOR_SCREENSHOT, png);
  const rows = await page.evaluate(async ({ png, geometry, color }) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const count = (top, bottom, left, right) => {
      const x0 = Math.max(0, Math.ceil(left + 4));
      const x1 = Math.min(canvas.width, Math.floor(right - 4));
      const y0 = Math.max(0, Math.floor(top));
      const y1 = Math.min(canvas.height, Math.ceil(bottom));
      if (x1 <= x0 || y1 <= y0) return 0;
      const pixels = context.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let total = 0;
      for (let y = 0; y < y1 - y0; y++) {
        let matching = 0;
        for (let x = 0; x < x1 - x0; x++) {
          const offset = (y * (x1 - x0) + x) * 4;
          if (color.every((channel, index) => Math.abs(pixels[offset + index] - channel) <= 1)) matching++;
        }
        if (matching / (x1 - x0) >= 0.95) total++;
      }
      return total;
    };
    const result = geometry.groups.map(group => ({
      kind: group.kind,
      boundary: count(group.firstCopy.bottom, group.secondCopy.top, group.first.left, group.first.right),
      // Fractional DOM edges can share a raster row with the adjacent divider.
      // Sample the content interior; keep the boundary count and 8px gap exact.
      insideFirst: count(group.firstCopy.top + 1, group.firstCopy.bottom - 1, group.first.left, group.first.right),
      insideSecond: count(group.secondCopy.top + 1, group.secondCopy.bottom - 1, group.second.left, group.second.right),
    }));
    bitmap.close();
    return result;
  }, { png: png.toString('base64'), geometry, color: dark ? [17, 17, 17] : [232, 234, 237] });
  return { ...geometry, rows };
}

async function growAnchoredTitle(page, start) {
  const growth = await page.evaluate(start => {
    const title = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"] [data-result="anchored-${start}-1"] .main-link h3`);
    const before = title.getBoundingClientRect().height;
    title.textContent = '読み込み後に元の長い動画タイトルが復元されても区切りは本文より下に表示されることを確認する見出し。'.repeat(5);
    return title.getBoundingClientRect().height - before;
  }, start);
  assert(growth > 80, `Page ${start / 10 + 1}: restored title actually grows before checking its bottom-anchored divider`);
}

function verify(value, label, start) {
  try {
    verifyResults(value, label, start);
  } catch (error) {
    console.error('Divider failure geometry: ' + JSON.stringify({ label, groups: value.groups, rows: value.rows }, null, 2));
    throw error;
  }
}

function verifyResults(value, label, start) {
  for (const group of value.groups) {
    const rows = value.rows.find(row => row.kind === group.kind);
    assert.equal(rows.boundary, 8, `${label}: ${group.kind} paints exactly one 8px divider`);
    assert.equal(rows.insideFirst, 0, `${label}: ${group.kind} has no divider inside first result`);
    assert.equal(rows.insideSecond, 0, `${label}: ${group.kind} has no divider inside second result`);
    assert(Math.abs(group.secondCopy.top - group.firstCopy.bottom - 8) <= 1, `${label}: ${group.kind} does not add a duplicate divider or gap`);
    assert.equal(group.link, `https://result.example/${group.kind}-${start}-2`, `${label}: ${group.kind} preserves result URL`);
  }
  assert.equal(value.native, native, `${label}: first page remains unchanged`);
  assert(value.sourceHeader.bottom <= value.title.top + 1 && value.title.bottom <= value.paragraph.top + 1, `${label}: source header/title/snippet order is preserved`);
  assert.equal(value.siteLinks.length, 2, `${label}: both internal site links remain`);
  assert(value.siteLinks.every(link => link.startsWith(`https://result.example/border-${start}-1/`)), `${label}: site link destinations remain`);
  assert.equal(value.carousel.length, 2, `${label}: both carousel entries remain`);
  assert(Math.abs(value.carousel[0].top - value.carousel[1].top) <= 1 && value.carousel[1].left >= value.carousel[0].right, `${label}: carousel remains horizontal`);
  assert(value.documentWidth <= value.width + 1, `${label}: no horizontal overflow`);
}

try {
  const old = await setup(frozen, 360, false);
  try {
    const value = await measure(old.page, 10, false);
    for (const kind of ['before', 'after', 'pseudo-border', 'anchored', 'empty', 'minheight']) assert.equal(value.rows.find(row => row.kind === kind).boundary, 0, `Frozen v6.53 control must lose ${kind} divider`);
    assert.equal(value.rows.find(row => row.kind === 'border').boundary, 8, 'Frozen control must retain a conventional border');
    console.log('PASS frozen v6.53 reproduces missing generated/empty-element dividers and retains ordinary border');
    passed++;
  } finally { await old.context.close(); }

  if (!process.env.GOOGLE_SEPARATOR_CONTROL_ONLY) {
    for (const width of [360, 412]) for (const dark of [false, true]) {
      const current = await setup(built, width, dark);
      const label = `${width}px ${dark ? 'dark' : 'light'}`;
      try {
        await growAnchoredTitle(current.page, 10);
        verify(await measure(current.page, 10, dark), label + ' page 2', 10);
        await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout: 20000 });
        await current.page.waitForTimeout(450);
        await growAnchoredTitle(current.page, 20);
        verify(await measure(current.page, 20, dark), label + ' page 3', 20);
        assert.deepEqual(current.errors, [], label + ': no runtime errors');
        console.log(`PASS ${label}: pages 2/3, generated/empty/border dividers, nested results, internal links and carousel`);
        passed++;
      } finally { await current.context.close(); }
    }
  }
  console.log(`Google result-divider Chromium tests passed: ${passed} scenarios; controlled fixtures, not live Google/Android verification`);
} finally { await browser.close(); }
