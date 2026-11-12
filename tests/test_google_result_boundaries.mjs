/**
 * End-to-end imported-result boundary regression. Unlike the source-paint
 * fixtures, this source has NO divider between its first three full results.
 * The shape follows the supplied screenshot; it is not captured Google DOM.
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
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.55.js'), 'utf8');
const favicon = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Ccircle cx="12" cy="12" r="11" fill="%2339ad75"/%3E%3C/svg%3E';
const titles = [
  '時刻表 停車駅一覧（特急成田エクスプレス25号）',
  '［特急］成田エクスプレス 下り - 時刻表',
  '成田エクスプレス号の運行情報 - 乗換案内',
  '成田エクスプレス - チケットとスケジュール',
  '時刻表 成田駅 成田エクスプレス',
  '成田空港への交通案内と関連リンク',
];
const hosts = ['timetables.jreast.example', 'timetables.jreast.example', 'transit.yahoo.example', 'travel.example', 'timetables.jreast.example', 'airport.example'];

function native(dark) {
  return `<article id="native"><h3><a href="https://native.example/one">初回の検索結果</a></h3><p>初回ページの内容と区切りを保ちます。</p></article>`;
}

function card(start, index, line) {
  const url = `https://${hosts[index - 1]}/result-${start}-${index}`;
  const title = index === 2 ? `<div class="main-title" role="heading" aria-level="3">${titles[index - 1]}</div>` : `<h3 class="main-title">${titles[index - 1]}</h3>`;
  const identity = index === 3 ? `<div class="source-url">https://${hosts[index - 1]}</div>` : `<cite>https://${hosts[index - 1]}</cite>`;
  const sitelinks = index === 6 ? `<div class="sitelinks"><a data-dtld="airport.example" href="${url}/one"><h3>乗り換えの案内</h3></a><a data-dtld="airport.example" href="${url}/two"><h3>各駅の設備</h3></a></div>` : '';
  return `<article class="ordinary-result" data-result="${start}-${index}"${index >= 4 ? ` style="border-bottom:8px solid ${line}"` : ''}><div class="result-copy"><div class="source-header"><img class="favicon" width="24" height="24" alt="" src='${favicon}'><div>情報サイト ${index}${identity}</div></div><a class="main-link" href="${url}">${title}</a><p class="snippet">検索結果 ${start}-${index} の説明文。検索結果ごとの見出し・サイト情報・本文とリンク先を変更せずに、間の区切りを補います。</p>${sitelinks}</div></article>`;
}

function fixture(start, dark) {
  const page = dark ? '#202124' : '#fff', ink = dark ? '#e8eaed' : '#202124', line = dark ? '#3c4043' : '#e8eaed';
  const css = `*{box-sizing:border-box}body{margin:0;background:${page};color:${ink};font:14px/1.5 Arial,sans-serif}#native{padding:16px;min-height:220px;border-bottom:8px solid ${line}}#rso{width:100%}.MjjYud,.ordinary-result,.horizontal-panel{display:block;margin:0;padding:0;background:${page}}.result-copy{padding:16px}.source-header{display:flex;align-items:center;gap:8px}.source-header img{display:block;flex:0 0 24px;width:24px;height:24px}.source-url,cite{display:block;font-size:12px;font-style:normal}.main-title{font-size:19px;line-height:26px;font-weight:400;margin:10px 0}a{color:${dark ? '#8ab4f8' : '#1a0dab'};text-decoration:none}p{margin:0;line-height:21px}.sitelinks{display:block;padding-top:12px}.sitelinks a{display:block;padding:5px 0}.sitelinks h3{margin:0;font-size:15px;font-weight:400}.horizontal{display:flex;gap:12px;padding:16px}.horizontal-card{flex:1 1 0;min-width:0}.horizontal-card h3{font-size:14px;line-height:20px;margin:10px 0}.horizontal-card .source-url{overflow-wrap:anywhere}.horizontal-card .source-header{display:block}`;
  if (!start) return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="search"><div id="rso">${native(dark)}</div></main><nav><a id="pnnext" href="/search?q=boundary&start=10">次へ</a></nav>`;
  const horizontal = `<div class="MjjYud horizontal-panel" data-panel="${start}" style="border-bottom:8px solid ${line}"><div class="horizontal">${[1, 2].map(index => `<article class="horizontal-card" data-horizontal="${start}-${index}"><div class="source-header"><img class="favicon" width="24" height="24" alt="" src='${favicon}'><cite class="source-url">https://horizontal${index}.example</cite></div><a href="https://horizontal${index}.example/${start}"><h3>横並び記事 ${index}</h3></a><p>同じ段のカードを分割しません。</p></article>`).join('')}</div></div>`;
  const contents = `<div class="MjjYud grouped-three" data-group="${start}" style="border-bottom:8px solid ${line}">${[1, 2, 3].map(index => card(start, index, line)).join('')}</div>${[4, 5, 6].map(index => `<div class="MjjYud"${index === 4 ? ' style="padding-bottom:12px"' : ''}>${card(start, index, line)}</div>`).join('')}${horizontal}`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="search"><div id="rso">${contents}</div></main>${start === 10 ? '<nav><a id="pnnext" href="/search?q=boundary&start=20">次へ</a></nav>' : ''}`;
}

function configure(code, rendered) {
  if (rendered) return code;
  const target = 'googleUseRenderedFrame:!0';
  assert.equal(code.split(target).length, 2, 'Fetch-path control changes only the public rendered-frame configuration');
  return code.replace(target, 'googleUseRenderedFrame:!1');
}

async function setup(code, width, dark, rendered) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html', body: fixture(Number(url.searchParams.get('start')) || 0, dark) });
    return route.abort();
  });
  await page.addInitScript({ content: configure(code, rendered) });
  await page.goto('https://www.google.com/search?q=boundary', { waitUntil: 'load' });
  await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 20000 });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

async function measure(page, start, dark) {
  const geometry = await page.evaluate(start => {
    const scope = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    const rect = node => {
      const value = node.getBoundingClientRect();
      return { left: value.left + scrollX, right: value.right + scrollX, top: value.top + scrollY, bottom: value.bottom + scrollY, width: value.width, height: value.height };
    };
    const results = [...scope.querySelectorAll('[data-result]')].map(node => ({
      rect: rect(node), copy: rect(node.querySelector('.result-copy')),
      title: node.querySelector('.main-title').textContent,
      snippet: node.querySelector('.snippet').textContent,
      href: node.querySelector('.main-link').href,
    }));
    const sites = scope.querySelector('.sitelinks');
    return {
      results, siteLinks: [...sites.querySelectorAll('a')].map(node => ({ href: node.href, rect: rect(node) })),
      siteRect: rect(sites), horizontal: [...scope.querySelectorAll('[data-horizontal]')].map(rect),
      horizontalRect: rect(scope.querySelector('.horizontal')),
      native: document.getElementById('native').outerHTML,
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    };
  }, start);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  if (process.env.GOOGLE_BOUNDARY_SCREENSHOT) await writeFile(process.env.GOOGLE_BOUNDARY_SCREENSHOT, png);
  const paint = await page.evaluate(async ({ png, geometry, color }) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const count = (top, bottom, left, right) => {
      const x0 = Math.max(0, Math.ceil(left + 4)), x1 = Math.min(canvas.width, Math.floor(right - 4));
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(canvas.height, Math.ceil(bottom));
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
    const boundaries = geometry.results.slice(1).map((current, index) => {
      const previous = geometry.results[index];
      return count(previous.copy.bottom, current.copy.top, previous.rect.left, previous.rect.right);
    });
    const inside = geometry.results.map(result => count(result.copy.top + 1, result.copy.bottom - 1, result.rect.left, result.rect.right));
    const sitelinks = count(geometry.siteRect.top + 1, geometry.siteRect.bottom - 1, geometry.siteRect.left, geometry.siteRect.right);
    const horizontal = count(geometry.horizontalRect.top + 1, geometry.horizontalRect.bottom - 1, geometry.horizontalRect.left, geometry.horizontalRect.right);
    bitmap.close();
    return { boundaries, inside, sitelinks, horizontal };
  }, { png: png.toString('base64'), geometry, color: dark ? [60, 64, 67] : [232, 234, 237] });
  return { ...geometry, paint };
}

function verify(value, label, start, dark) {
  assert.equal(value.results.length, 6, `${label}: all six ordinary results survive`);
  assert.deepEqual(value.paint.boundaries, [8, 8, 8, 8, 8], `${label}: every result boundary paints exactly one 8px strip`);
  assert.deepEqual(value.paint.inside, [0, 0, 0, 0, 0, 0], `${label}: no separator is inserted into a result body`);
  for (let index = 0; index < value.results.length; index++) {
    const result = value.results[index];
    assert.equal(result.title, titles[index], `${label}: primary title ${index + 1} remains unchanged`);
    assert.equal(result.href, `https://${hosts[index]}/result-${start}-${index + 1}`, `${label}: primary destination ${index + 1} remains unchanged`);
    assert.equal(result.snippet, `検索結果 ${start}-${index + 1} の説明文。検索結果ごとの見出し・サイト情報・本文とリンク先を変更せずに、間の区切りを補います。`, `${label}: snippet ${index + 1} remains unchanged`);
  }
  assert.equal(value.siteLinks.length, 2, `${label}: both sitelinks remain`);
  assert.equal(value.paint.sitelinks, 0, `${label}: vertical h3 sitelinks do not acquire separators`);
  assert(value.siteLinks[0].rect.bottom <= value.siteLinks[1].rect.top + 1, `${label}: sitelinks retain their vertical arrangement`);
  assert(value.siteLinks.every(link => link.href.startsWith(`https://airport.example/result-${start}-6/`)), `${label}: sitelink destinations remain unchanged`);
  assert.equal(value.horizontal.length, 2, `${label}: both horizontal result cards remain`);
  assert.equal(value.paint.horizontal, 0, `${label}: plain flex cards do not acquire a full-width separator`);
  assert(Math.abs(value.horizontal[0].top - value.horizontal[1].top) <= 1 && value.horizontal[1].left >= value.horizontal[0].right, `${label}: cards remain side by side without relying on carousel tags`);
  assert.equal(value.native, native(dark), `${label}: first-page markup remains unchanged`);
  assert(value.documentWidth <= value.width + 1, `${label}: no horizontal overflow`);
}

let passed = 0;
try {
  for (const rendered of [true, false]) {
    const old = await setup(frozen, 360, false, rendered);
    try {
      const value = await measure(old.page, 10, false);
      assert.deepEqual(value.paint.boundaries, [0, 0, 8, 8, 8], 'Frozen v6.55 must reproduce exactly the two grouped-result omissions');
      assert.deepEqual(old.errors, [], 'Frozen control has no runtime error');
      console.log(`PASS frozen v6.55 ${rendered ? 'iframe' : 'fetch'}: grouped first-three result omissions reproduced`);
      passed++;
    } finally { await old.context.close(); }
  }
  if (!process.env.GOOGLE_BOUNDARY_CONTROL_ONLY) {
    for (const rendered of [true, false]) for (const width of [360, 412]) for (const dark of [false, true]) {
      const current = await setup(built, width, dark, rendered);
      const label = `${rendered ? 'iframe' : 'fetch'} ${width}px ${dark ? 'dark' : 'light'}`;
      try {
        const pageTwo = await measure(current.page, 10, dark);
        verify(pageTwo, label + ' page 2', 10, dark);
        // The integration calls the normalizer after append, on RAF and after
        // 350ms. Recheck paint after settling to detect duplicated dividers.
        await current.page.waitForTimeout(500);
        assert.deepEqual((await measure(current.page, 10, dark)).paint, pageTwo.paint, label + ': repeated import repair does not duplicate separators');
        await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout: 20000 });
        await current.page.waitForTimeout(600);
        verify(await measure(current.page, 20, dark), label + ' page 3', 20, dark);
        assert.deepEqual(current.errors, [], label + ': no runtime errors');
        console.log(`PASS ${label}: pages 2/3, grouped/same-domain/role-heading results, native dividers, sitelinks, horizontal cards`);
        passed++;
      } catch (error) {
        console.error('Boundary failure: ' + JSON.stringify({ label, observed: await measure(current.page, 10, dark) }, null, 2));
        throw error;
      } finally { await current.context.close(); }
    }
  }
  console.log(`Google primary-result boundary Chromium tests passed: ${passed} scenarios; controlled fixtures, not live Android verification`);
} finally { await browser.close(); }
