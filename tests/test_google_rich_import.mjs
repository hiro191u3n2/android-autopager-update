/**
 * Full-userscript rendering checks for the video-reported shopping layout,
 * generated stars/stock dots, masks and source-painted result separators.
 * All requests are intercepted; these are controlled structures, not live
 * Google, Berry, AdGuard or Android-device verification.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';
import { GOOGLE_RICH_QUERY, GOOGLE_RICH_NATIVE, GOOGLE_RICH_STAR_SVG,
  GOOGLE_RICH_THUMB_SVG, renderGoogleRichFixture } from './fixtures/google-rich-results.mjs';

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
const output = process.env.GOOGLE_RICH_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const built = await buildUserscript();
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.61.js'), 'utf8');
const moduleText = await readFile(resolve(ROOT, 'src/google-import-layout.js'), 'utf8');
const browser = await chromium.launch(launch);
const observations = [], references = new Map();
let passed = 0;

function configure(code, rendered) {
  if (rendered) return code;
  const preference = 'googleUseRenderedFrame:!0';
  assert.equal(code.split(preference).length, 2, 'Fetch case changes only the existing acquisition preference');
  return code.replace(preference, 'googleUseRenderedFrame:!1');
}

async function verifyAsyncCaptureConsistency() {
  const page = await browser.newPage({ viewport: { width: 500, height: 983 } });
  try {
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body></body>' }));
    await page.goto('https://www.google.com/search?q=async-layout-consistency');
    await page.addScriptTag({ content: moduleText });
    const value = await page.evaluate(async () => {
      const makeSource = () => {
        const root = document.createElement('div');
        root.style.cssText = 'width:400px;min-height:200px';
        root.innerHTML = '<h3>検索結果</h3>' + Array.from({ length: 160 }, (_, i) =>
          `<span data-async-item="${i}" style="display:block;color:rgb(30,40,50)">結果 ${i}</span>`).join('');
        document.body.appendChild(root);
        return root;
      };
      // Keep element count, tag and namespace identical: stale detection must
      // notice node identity, not merely a different number of descendants.
      const replaceLeaf = root => {
        const previous = root.querySelector('[data-async-item="0"]');
        const next = previous.cloneNode(true);
        next.style.color = 'rgb(71, 81, 91)';
        previous.replaceWith(next);
      };
      const changing = makeSource();
      let changedDuringCapture = false;
      setTimeout(() => { replaceLeaf(changing); changedDuringCapture = true; }, 0);
      const rejectedCapture = await captureGenericGoogleLayoutV647(changing);
      const rejectedClone = changing.cloneNode(true), rejectedMarkup = rejectedClone.outerHTML;
      const rejectedApply = await applyGenericGoogleLayoutV647(changing, rejectedClone);
      const rejectedUnchanged = rejectedClone.outerHTML === rejectedMarkup;
      changing.remove();

      const retrying = makeSource();
      const capture = captureGenericGoogleLayoutV647;
      let attempts = 0, changedDuringRetry = false;
      captureGenericGoogleLayoutV647 = function (...args) {
        attempts++;
        if (attempts === 1) setTimeout(() => { replaceLeaf(retrying); changedDuringRetry = true; }, 0);
        return capture.apply(this, args);
      };
      try {
        await captureGenericGoogleLayoutRequiredV662(retrying);
      } finally { captureGenericGoogleLayoutV647 = capture; }
      const stableClone = retrying.cloneNode(true);
      const stableApply = await applyGenericGoogleLayoutV647(retrying, stableClone);
      const retryColor = stableClone.querySelector('[data-async-item="0"]').style.getPropertyValue('color');
      const stableDetached = !stableClone.isConnected;
      retrying.remove();

      const stale = makeSource();
      const initialCapture = await captureGenericGoogleLayoutV647(stale);
      replaceLeaf(stale);
      const staleClone = stale.cloneNode(true), staleMarkup = staleClone.outerHTML;
      const staleApply = await applyGenericGoogleLayoutV647(stale, staleClone);
      const staleUnchanged = staleClone.outerHTML === staleMarkup;
      stale.remove();
      return { changedDuringCapture, rejectedCapture, rejectedApply, rejectedUnchanged,
        changedDuringRetry, attempts, stableApply, retryColor, stableDetached,
        initialCapture, staleApply, staleUnchanged };
    });
    assert.deepEqual(value, {
      changedDuringCapture: true, rejectedCapture: false, rejectedApply: false, rejectedUnchanged: true,
      changedDuringRetry: true, attempts: 2, stableApply: true, retryColor: 'rgb(71, 81, 91)', stableDetached: true,
      initialCapture: true, staleApply: false, staleUnchanged: true,
    }, 'Source replacements during/after yielded capture cannot leak a partial or stale layout');
    observations.push({ label: 'async-capture-consistency', ...value });
    console.log('PASS async capture: same-count source replacement rejected; stable retry captured; stale source rejected before clone mutation');
    passed++;
  } finally { await page.close(); }
}

async function open(code, options, start = 0) {
  const context = await browser.newContext({ viewport: { width: options.width, height: 983 },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: options.dark ? 'dark' : 'light' });
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    requests.push(url.href);
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html',
      body: renderGoogleRichFixture(Number(url.searchParams.get('start')) || 0, options) });
    if (url.hostname === 'www.google.com' && url.pathname === '/fixture-assets/stars.svg') return route.fulfill({ contentType: 'image/svg+xml', body: GOOGLE_RICH_STAR_SVG });
    if (url.hostname === 'www.google.com' && url.pathname === '/fixture-assets/bottle.svg') return route.fulfill({ contentType: 'image/svg+xml', body: GOOGLE_RICH_THUMB_SVG });
    return route.abort();
  });
  if (code) await page.addInitScript({ content: configure(code, options.rendered) });
  await page.goto(`https://www.google.com/search?q=${GOOGLE_RICH_QUERY}${start ? '&start=' + start : ''}`, { waitUntil: 'load' });
  if (code) {
    await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 25000 });
    await page.waitForTimeout(750);
  }
  return { page, context, errors, requests };
}

async function measure(page, start, options, label, original = false) {
  const geometry = await page.evaluate(({ start, original }) => {
    const section = original ? document : document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    const root = section?.querySelector(original ? '#rso' : '.generic-autopager-google-source-root');
    if (!root) throw new Error('Imported result root missing');
    const rect = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left + scrollX, right: box.right + scrollX, top: box.top + scrollY,
        bottom: box.bottom + scrollY, width: box.width, height: box.height };
    };
    const cards = [...root.querySelectorAll('[data-rich-card]')].map(node => ({
      id: node.dataset.richCard, rect: rect(node), title: node.querySelector('h3')?.textContent,
      href: node.querySelector('.rich-product-link')?.href, rating: rect(node.querySelector('.rich-rating')),
      mask: rect(node.querySelector('.rich-mask')), stock: rect(node.querySelector('.rich-stock')),
      thumb: rect(node.querySelector('img')), imageSrc: node.querySelector('img')?.src || null,
      discount: rect(node.querySelector('.rich-discount')), text: node.textContent,
    }));
    const organic = [...root.querySelectorAll('[data-rich-organic]')].map(node => ({
      id: node.dataset.richOrganic, rect: rect(node), title: node.querySelector('h3')?.textContent,
      href: node.querySelector('a')?.href, text: node.textContent,
      rating: rect(node.querySelector('.rich-rating')), stock: rect(node.querySelector('.rich-stock')),
    }));
    const nativeCard = document.querySelector('[data-native-card]');
    const strip = root.querySelector('.rich-strip');
    return { root: rect(root), cards, organic, native: document.getElementById('rich-native')?.outerHTML || null,
      nativeCard: nativeCard ? { rect: rect(nativeCard), background: getComputedStyle(nativeCard).backgroundColor } : null,
      strip: strip ? { rect: rect(strip), scrollWidth: strip.scrollWidth, clientWidth: strip.clientWidth } : null,
      hidden: [...root.querySelectorAll('.rich-hidden-alternative')].map(node => getComputedStyle(node).display),
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      commerceCount: root.querySelectorAll('[data-generic-autopager-commerce-safe]').length,
      nodes: root.querySelectorAll('*').length };
  }, { start, original });
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css',
    style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  if (output && label) await writeFile(resolve(output, label + '.png'), png);
  const paint = await page.evaluate(async ({ bytes, geometry, dark }) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const count = (box, color) => {
      if (!box) return { matches: 0, pixels: 0, coverage: 0 };
      const x0 = Math.max(0, Math.ceil(box.left)), x1 = Math.min(canvas.width, Math.floor(box.right));
      const y0 = Math.max(0, Math.ceil(box.top)), y1 = Math.min(canvas.height, Math.floor(box.bottom));
      if (x1 <= x0 || y1 <= y0) return { matches: 0, pixels: 0, coverage: 0 };
      const pixels = context.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let matches = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (color.every((channel, j) => Math.abs(pixels[i + j] - channel) <= 2)) matches++;
      }
      return { matches, pixels: pixels.length / 4, coverage: matches / (pixels.length / 4) };
    };
    const visibleCards = geometry.cards.filter(card => card.id.startsWith('grid-'));
    const cards = visibleCards.map(card => ({ id: card.id,
      background: count(card.rect, dark ? [48,49,52] : [241,243,244]),
      stars: count(card.rating, [250,187,5]), mask: count(card.mask, [250,187,5]), dot: count(card.stock, [19,115,51]) }));
    const organic = geometry.organic.map(card => ({ id: card.id,
      stars: count(card.rating, [250,187,5]), dot: count(card.stock, [19,115,51]) }));
    const bands = geometry.organic.slice(1).map(card => count({ left: card.rect.left + 2, right: card.rect.right - 2,
      top: card.rect.top - 7, bottom: card.rect.top - 1 }, dark ? [23,23,23] : [232,234,237]));
    image.close();
    return { cards, organic, bands };
  }, { bytes: png.toString('base64'), geometry, dark: options.dark });
  const result = { ...geometry, paint };
  observations.push({ label, ...result });
  return result;
}

async function reference(options) {
  const key = JSON.stringify([options.width, options.dark, options.large]);
  if (references.has(key)) return references.get(key);
  const source = await open(null, options, 10);
  try {
    const value = await measure(source.page, 10, options, `source-${options.width}-${options.dark ? 'dark' : 'light'}-${options.large ? 'large' : 'small'}`, true);
    assert.equal(value.cards.length, 7, 'Source fixture renders all seven product cards');
    if (options.large) assert(value.nodes > 5000, 'Large fixture crosses the old whole-page snapshot limit');
    verifyPaint(value, 'Unmodified source');
    references.set(key, value);
    return value;
  } finally { await source.context.close(); }
}

function verifyPaint(value, label) {
  assert.equal(value.paint.cards.length, 3, label + ': three grid cards remain measurable');
  for (const item of value.paint.cards) {
    assert(item.background.matches > 100, label + ': generated rounded-card background is painted for ' + item.id);
    assert(item.stars.matches > 20, label + ': generated rating stars are painted for ' + item.id);
    assert(item.mask.matches > 50 && item.mask.coverage < 0.85, label + ': masked stars retain their shape for ' + item.id);
    assert(item.dot.matches > 15, label + ': generated stock dot is painted for ' + item.id);
  }
  assert.equal(value.paint.organic.length, 3, label + ': all organic results remain measurable');
  for (const item of value.paint.organic) {
    assert(item.stars.matches > 20, label + ': organic rating stars are painted for ' + item.id);
    assert(item.dot.matches > 15, label + ': organic stock dot is painted for ' + item.id);
  }
  assert.equal(value.paint.bands.length, 2, label + ': two original organic separators remain measurable');
  for (const band of value.paint.bands) assert(band.coverage > 0.95, label + ': original source separator is painted across the existing gap');
}

function verify(value, before, start, label) {
  assert.equal(value.cards.length, 7, label + ': every original product card retained');
  assert.equal(value.organic.length, 3, label + ': every organic result retained');
  assert.equal(value.commerceCount, 0, label + ': preserved source cards are not rebuilt as guessed commerce layouts');
  const grid = value.cards.filter(card => card.id.startsWith('grid-'));
  assert(grid.every(card => Math.abs(card.rect.top - grid[0].rect.top) < 1), label + ': all three grid products stay in one row');
  assert(grid[0].rect.right <= grid[1].rect.left && grid[1].rect.right <= grid[2].rect.left, label + ': grid columns remain separate');
  for (let i = 0; i < value.cards.length; i++) {
    const card = value.cards[i], source = before.cards[i];
    assert(Math.abs(card.rect.width - source.rect.width) < 1.5, label + ': authored card width retained for ' + card.id);
    assert(Math.abs(card.rect.height - source.rect.height) < 2, label + ': card text and media retain their source height for ' + card.id);
    assert.equal(card.title, source.title.replaceAll('10-', `${start}-`), label + ': complete title retained');
    assert.equal(card.href, source.href.replaceAll('-10-', `-${start}-`), label + ': original destination retained');
    assert.equal(card.imageSrc, source.imageSrc, label + ': original thumbnail source retained');
    assert(card.thumb.width > 40 && card.thumb.height >= 100, label + ': thumbnail remains visible');
    assert(card.discount.left >= card.thumb.left - 1 && card.discount.top >= card.thumb.top - 1 && card.discount.right <= card.thumb.right + 1,
      label + ': discount remains inside thumbnail');
  }
  const strip = value.cards.filter(card => card.id.startsWith('strip-'));
  assert(strip.every(card => Math.abs(card.rect.top - strip[0].rect.top) < 1), label + ': carousel products remain horizontal');
  assert(value.strip && value.strip.scrollWidth > value.strip.clientWidth, label + ': overflow remains inside the product scroller');
  assert(value.documentWidth <= value.width + 1, label + ': no horizontal document overflow');
  assert.deepEqual(value.hidden, ['none'], label + ': duplicate alternative image stays hidden');
  assert.equal(value.native, GOOGLE_RICH_NATIVE, label + ': initial-page markup unchanged');
  assert.equal(value.nativeCard.background, 'rgb(245, 235, 225)', label + ': imported CSS does not recolor the first page');
  assert.equal(value.nativeCard.rect.width, 120, label + ': imported CSS does not resize the first page');
  verifyPaint(value, label);
}

try {
  await verifyAsyncCaptureConsistency();
  const scenarios = [
    { name: 'rendered-small-light', rendered: true, large: false, width: 500, dark: false },
    { name: 'rendered-small-dark', rendered: true, large: false, width: 360, dark: true },
    { name: 'rendered-large-light', rendered: true, large: true, width: 500, dark: false },
    { name: 'rendered-large-dark', rendered: true, large: true, width: 360, dark: true },
  ];
  // The production Google acquisition route uses rendered frames. The fetch
  // preference is not a fallback after frame failure and is outside this fix.
  for (const options of scenarios.filter(item => item.name !== 'rendered-small-dark')) {
    const source = await reference(options), old = await open(frozen, options);
    try {
      const value = await measure(old.page, 10, options, 'frozen-' + options.name);
      const grid = value.cards.filter(card => card.id.startsWith('grid-'));
      const widthLost = grid.length !== 3 || grid.some((card, i) => Math.abs(card.rect.width - source.cards[i].rect.width) > 2);
      const starsLost = value.paint.cards.length !== 3 || value.paint.cards.some(card => card.stars.matches <= 20);
      const cardsLost = value.cards.length !== 7 || value.commerceCount > 0;
      assert(widthLost || starsLost || cardsLost, 'Frozen v6.61 must reproduce a rich-result failure: ' + options.name);
      console.log('PASS frozen v6.61 control ' + options.name + ': ' + JSON.stringify({ widthLost, starsLost, cardsLost }));
      passed++;
    } finally { await old.context.close(); }
  }
  for (const options of scenarios) {
    const source = await reference(options), current = await open(built, options);
    try {
      verify(await measure(current.page, 10, options, 'current-' + options.name + '-page2'), source, 10, options.name + ' page 2');
      await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout: 25000 });
      await current.page.waitForTimeout(750);
      verify(await measure(current.page, 20, options, 'current-' + options.name + '-page3'), source, 20, options.name + ' page 3');
      assert.deepEqual(current.errors, [], options.name + ': no runtime errors');
      console.log('PASS ' + options.name + ': pages 2/3, fixed-width columns, local scroller, pseudo paint, masks, hidden state, links and first-page isolation');
      passed++;
    } finally { await current.context.close(); }
  }
  console.log(`Google rich import Chromium tests passed: ${passed} scenarios; all requests intercepted, not live Google or Android verification`);
} finally {
  if (output) await writeFile(resolve(output, 'measurements.json'), JSON.stringify(observations, null, 2) + '\n');
  await browser.close();
}
