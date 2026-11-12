/**
 * Rendered iframe import checks for independent results that touch. These are
 * controlled structures derived from the visible missing-boundary symptom,
 * not captured Google HTML or a claim about Berry/AdGuard device rendering.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const deps = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths: deps }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundled = loaded.default || loaded;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const current = await readFile(resolve(ROOT, 'src/google-import-layout.js'), 'utf8');
const frozenRelease = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.63.js'), 'utf8');
const start = frozenRelease.indexOf('// Google loads result-specific CSS in each fetched document.');
const end = frozenRelease.indexOf('// Prepare only a detached Google result page.', start);
assert(start >= 0 && end > start, 'Frozen v6.63 layout module has exact boundaries');
const frozen = frozenRelease.slice(start, end);
const output = process.env.GOOGLE_TOUCHING_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch(launch);
const observations = [];
let passed = 0;

function fixture({ dark = false, gap = 0, outline = false, variant = '' } = {}, imported = true) {
  const face = dark ? '#202124' : '#fff', ink = dark ? '#e8eaed' : '#202124';
  const line = dark ? '#3c4043' : '#e8eaed';
  const extra = {
    native: `.card:not(:first-child) .surface{border-top:8px solid ${line}}`,
    hairline: `.card:not(:first-child) .surface{border-top:1px solid ${line}}`,
    rounded: '.surface{border-radius:12px}',
    transform: '.surface{transform:translateY(0)}',
    clipped: '.surface{clip-path:inset(1px)}',
    transparent: '.surface{background:transparent}',
    'inset-shadow': '.surface{box-shadow:inset 0 8px 0 0 rgb(160,80,20)}',
    'outer-glow': '.surface{box-shadow:0 0 12px 4px rgba(160,80,20,.5)}',
    'inner-opacity': '.surface{padding:0}.copy{padding:16px;opacity:.5}',
    'inner-rounded': '.surface{padding:0}.copy{padding:16px;border-radius:12px}',
    padding: '.surface{padding-top:0}',
    overlap: '.card:not(:first-child){margin-top:-2px}',
    columns: '#rso{display:flex}.card{flex:1;min-width:0}',
  }[variant] || '';
  const css = `*{box-sizing:border-box}html,body{margin:0;background:${face};color:${ink};font:14px/20px Arial,sans-serif}#rso{width:100%}.card{margin:0 0 ${gap}px;background:transparent;position:relative}.surface{padding:16px;background:${face};${outline ? `box-shadow:0 0 0 1px ${dark ? '#484b50' : '#ebedef'};` : ''}}.card:first-child .surface{border-top:8px solid ${line}}.source{font-size:12px;line-height:18px}.source span{display:block}a{display:block;color:${dark ? '#8ab4f8' : '#1967d2'};text-decoration:none}h3{font-size:20px;line-height:26px;font-weight:400;margin:10px 0}p{margin:0;color:${dark ? '#bdc1c6' : '#5f6368'}}#native{padding:16px;height:100px;border-bottom:8px solid ${line}}.blocker{padding:8px;min-height:40px;background:${face}}${extra}`;
  const cards = [1, 2, 3].map(n => {
    const content = `<div class="source"><span>情報サイト ${n}</span><span>https://result${n}.example</span></div><a href="https://result${n}.example/item"><h3>別々の検索結果 ${n}</h3></a><p>検索結果の説明文をそのまま表示します。改行しても元の高さを保ちます。</p>`;
    return `<article class="card" data-result="${n}"><div class="surface">${variant.startsWith('inner-') ? `<div class="copy">${content}</div>` : content}</div></article>`;
  });
  let join = '';
  if (variant === 'intervening') join = '<div class="blocker">別の案内を表示しています</div>';
  if (variant === 'unknown') join = '<div class="blocker"><a href="https://unknown.example/item"><h3>認識できない別の結果</h3></a></div>';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${imported ? `<div id="rso">${cards.join(join)}</div>` : '<main><article id="native"><a href="https://initial.example/item"><h3>初回ページの結果</h3></a></article></main>'}</body></html>`;
}

async function run(code, options, control = false) {
  const context = await browser.newContext({ viewport: { width: options.width || 360, height: 983 },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: options.dark ? 'dark' : 'light' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'www.google.com' || url.pathname !== '/search') return route.abort();
    return route.fulfill({ contentType: 'text/html', body: fixture(options, url.searchParams.has('start')) });
  });
  try {
    await page.goto('https://www.google.com/search?q=touching-results', { waitUntil: 'load' });
    await page.addScriptTag({ content: code });
    const original = await page.evaluate(async () => {
      const frame = document.createElement('iframe');
      frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${innerWidth}px;height:1600px;border:0`;
      frame.src = 'https://www.google.com/search?q=touching-results&start=10';
      const loaded = new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = reject; });
      document.body.appendChild(frame);
      await loaded;
      const source = frame.contentDocument.getElementById('rso');
      const relative = node => {
        const r = node.getBoundingClientRect(), base = source.getBoundingClientRect();
        return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top,
          bottom: r.bottom - base.top, width: r.width, height: r.height };
      };
      const geometry = [...source.querySelectorAll('.card,.surface,.copy,.source,h3,p,.blocker')].map(relative);
      if (!await captureGenericGoogleLayoutV647(source)) throw new Error('Source iframe capture failed');
      const clone = document.importNode(source, true);
      if (!await applyGenericGoogleLayoutV647(source, clone)) throw new Error('Detached clone application failed');
      clone.classList.add('generic-autopager-google-source-root');
      const section = document.createElement('section');
      section.className = 'generic-autopager-page'; section.dataset.page = '2';
      section.appendChild(clone); document.querySelector('main').appendChild(section);
      frame.remove();
      return { geometry, native: document.getElementById('native').outerHTML };
    });
    const before = await measure(page);
    const pngBefore = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css' });
    await page.evaluate(() => repairGenericGoogleResultBoundariesV658(document.querySelector('.generic-autopager-page')));
    const after = await measure(page);
    const pngAfter = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css' });
    const once = await page.locator('.generic-autopager-page').evaluate(node => node.outerHTML);
    await page.evaluate(() => repairGenericGoogleResultBoundariesV658(document.querySelector('.generic-autopager-page')));
    assert.equal(await page.locator('.generic-autopager-page').evaluate(node => node.outerHTML), once, 'A second pass must not add another band');
    const label = `${control ? 'control-v663' : 'current'}-${options.width || 360}-${options.dark ? 'dark' : 'light'}-gap${options.gap || 0}${options.outline ? '-outline' : ''}-${options.variant || 'eligible'}`;
    const expectedPaint = !control && !options.variant;
    assert.deepEqual(errors, [], label + ': no browser errors');
    assert.equal(after.native, original.native, label + ': initial page untouched');
    assert.deepEqual(before.geometry, original.geometry, label + ': iframe import preserves source geometry');
    assert.deepEqual(after.geometry, before.geometry, label + ': repair changes no content or card geometry');
    assert.deepEqual(after.content, before.content, label + ': text and link destinations preserved');
    assert(after.documentWidth <= after.viewportWidth, label + ': no horizontal overflow');
    assert.equal(after.markers, expectedPaint ? 2 : 0, label + ': only the two missing eligible boundaries are marked');
    const pixels = await comparePixels(page, pngBefore, pngAfter, after, options, expectedPaint);
    if (expectedPaint) {
      assert.equal(pixels.changedOutside, 0, label + ': no paint changes outside existing top padding');
      assert.deepEqual(pixels.bandRows, [8, 8], label + ': exactly one full 8px band per missing boundary');
      assert(pixels.changedInside > 0, label + ': correction visibly paints pixels');
    } else {
      assert.equal(pixels.changedInside + pixels.changedOutside, 0, label + ': protected or frozen rendering stays unchanged');
    }
    if (output) {
      await writeFile(resolve(output, label + '-before.png'), pngBefore);
      await writeFile(resolve(output, label + '-after.png'), pngAfter);
    }
    observations.push({ label, expectedPaint, markers: after.markers, geometryDelta: 0, ...pixels });
    passed++;
  } finally { await context.close(); }
}

async function measure(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.generic-autopager-google-source-root');
    const base = root.getBoundingClientRect();
    const relative = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top,
        bottom: r.bottom - base.top, width: r.width, height: r.height };
    };
    return {
      geometry: [...root.querySelectorAll('.card,.surface,.copy,.source,h3,p,.blocker')].map(relative),
      content: [...root.querySelectorAll('.source,h3,p,a[href]')].map(node => ({ text: node.textContent, href: node.getAttribute('href') })),
      bands: [...root.querySelectorAll('.card')].slice(1).map(node => {
        const r = node.querySelector('.surface').getBoundingClientRect();
        return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.top + scrollY + 8 };
      }),
      markers: root.querySelectorAll('[data-generic-google-boundary-v658]').length,
      native: document.getElementById('native').outerHTML,
      viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
    };
  });
}

async function comparePixels(page, before, after, geometry, options, expectedPaint) {
  return page.evaluate(async ({ before, after, bands, dark, expectedPaint }) => {
    const decode = async data => {
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), x => x.charCodeAt(0))], { type: 'image/png' }));
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data; bitmap.close();
      return { width: canvas.width, height: canvas.height, pixels };
    };
    const a = await decode(before), b = await decode(after);
    if (a.width !== b.width || a.height !== b.height) throw new Error('Repair changed screenshot dimensions');
    let changedInside = 0, changedOutside = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const offset = (y * a.width + x) * 4;
      if ([0, 1, 2, 3].every(c => a.pixels[offset + c] === b.pixels[offset + c])) continue;
      if (expectedPaint && bands.some(band => x >= band.left && x < band.right && y >= band.top && y < band.bottom)) changedInside++;
      else changedOutside++;
    }
    const color = dark ? [60, 64, 67] : [232, 234, 237];
    const bandRows = bands.map(band => {
      let matchingRows = 0;
      for (let y = Math.ceil(band.top); y < Math.floor(band.bottom); y++) {
        let matching = 0, count = 0;
        for (let x = Math.ceil(band.left + 3); x < Math.floor(band.right - 3); x++) {
          const offset = (y * b.width + x) * 4; count++;
          if (color.every((c, i) => Math.abs(b.pixels[offset + i] - c) <= 1)) matching++;
        }
        if (count && matching / count >= .99) matchingRows++;
      }
      return matchingRows;
    });
    return { changedInside, changedOutside, bandRows };
  }, { before: before.toString('base64'), after: after.toString('base64'), bands: geometry.bands, dark: !!options.dark, expectedPaint });
}

try {
  for (const gap of [0, 1]) await run(frozen, { width: 360, gap }, true);
  for (const width of [360, 500]) for (const dark of [false, true]) for (const gap of [0, 1]) {
    await run(current, { width, dark, gap, outline: true });
  }
  for (const variant of ['native', 'hairline', 'rounded', 'transform', 'clipped', 'transparent', 'inset-shadow', 'outer-glow', 'inner-opacity', 'inner-rounded', 'padding', 'overlap', 'columns', 'intervening', 'unknown']) {
    await run(current, { width: 500, variant });
  }
  if (output) await writeFile(resolve(output, 'touching-results-observations.json'), JSON.stringify(observations, null, 2) + '\n');
  console.log(`PASS Google touching-result boundaries: ${passed} controlled iframe/pixel scenarios; geometry unchanged; no live-device claim`);
} finally { await browser.close(); }
