/**
 * Pixels and geometry for root-sibling results modeled from the v6.59 user
 * diagnostic. Neutral structural fixtures, not captured/live Google HTML.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';
import { GOOGLE_ROOT_COLORS, GOOGLE_ROOT_GAP_PX, GOOGLE_ROOT_MAX_WIDTH, GOOGLE_ROOT_QUERY,
  googleRootExpectedResults, googleRootNativeMarkup, renderGoogleRootFixture } from './fixtures/google-root-results.mjs';

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
const built = await buildUserscript();
const frozen = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.59.js'), 'utf8');
const output = process.env.GOOGLE_ROOT_ARTIFACT_DIR;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch(launch);
const observations = [], baselines = new Map();
let passed = 0;

function configure(code, rendered) {
  if (rendered) return code;
  const target = 'googleUseRenderedFrame:!0';
  assert.equal(code.split(target).length, 2, 'Fetch scenario changes only the existing preference');
  return code.replace(target, 'googleUseRenderedFrame:!1');
}

async function open(code, options, start = 0) {
  const context = await browser.newContext({ viewport: { width: options.width, height: 983 },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: options.dark ? 'dark' : 'light' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html',
      body: renderGoogleRootFixture(Number(url.searchParams.get('start')) || 0, { ...options, compact: false }) });
    return route.abort();
  });
  if (code) await page.addInitScript({ content: configure(code, options.rendered) });
  await page.goto(`https://www.google.com/search?q=${GOOGLE_ROOT_QUERY}${start ? '&start=' + start : ''}`, { waitUntil: 'load' });
  if (code) {
    await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 25000 });
    await page.waitForTimeout(750);
  }
  return { page, context, errors };
}

async function measure(page, start, options, label, original = false) {
  const geometry = await page.evaluate(({ start, original }) => {
    const section = original ? document : document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    const root = section?.querySelector(original ? '#rso' : '.generic-autopager-google-source-root');
    if (!root) throw new Error('Source root missing for page ' + start);
    const rect = node => {
      const box = node.getBoundingClientRect();
      return { left: box.left + scrollX, right: box.right + scrollX, top: box.top + scrollY,
        bottom: box.bottom + scrollY, width: box.width, height: box.height };
    };
    const results = [...root.querySelectorAll('[data-organic-result]')].map(node => {
      const surface = node.querySelector('[data-root-surface]'), style = getComputedStyle(surface);
      const pieces = [...node.querySelectorAll('.organic-source-header,.organic-title,.organic-body,.organic-sitelinks')].map(rect);
      const image = node.querySelector('.organic-thumbnail');
      return {
        id: node.dataset.organicResult, group: node.dataset.rootCase,
        rect: rect(node), surface: rect(surface), copy: rect(node.querySelector('.organic-copy')),
        content: { top: Math.min(...pieces.map(box => box.top)), bottom: Math.max(...pieces.map(box => box.bottom)) },
        title: node.querySelector('.organic-title').textContent, snippet: node.querySelector('.organic-snippet').textContent,
        href: node.querySelector('.organic-main-link').href, sourceText: node.querySelector('.organic-source-header').textContent,
        thumbnail: image ? { src: image.getAttribute('src'), rect: rect(image) } : null,
        marginBottom: parseFloat(style.marginBottom), surfaceColor: style.backgroundColor,
        shadow: getComputedStyle(node).boxShadow, clip: getComputedStyle(node).clipPath,
        sites: [...node.querySelectorAll('.organic-sitelinks a')].map(link => ({ href: link.href, rect: rect(link) })),
      };
    });
    const sites = root.querySelector('.organic-sitelinks'), columns = root.querySelector('[data-root-columns]');
    return { root: rect(root), results, site: rect(sites), columns: rect(columns),
      blockers: [...root.querySelectorAll('[data-root-blocker]')].map(node => ({ kind: node.dataset.rootBlocker,
        text: node.textContent, href: node.querySelector('a')?.href || null, rect: rect(node) })),
      native: document.getElementById('organic-native')?.outerHTML || null,
      width: innerWidth, documentWidth: document.documentElement.scrollWidth };
  }, { start, original });
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css',
    style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  if (output && label) await writeFile(resolve(output, label + '.png'), png);
  const paint = await page.evaluate(async ({ png, geometry, color }) => {
    const bytes = Uint8Array.from(atob(png), value => value.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const sample = (top, bottom, left, right) => {
      const x0 = Math.max(0, Math.ceil(left + 3)), x1 = Math.min(canvas.width, Math.floor(right - 3));
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(canvas.height, Math.ceil(bottom));
      if (x1 <= x0 || y1 <= y0) return { rows: 0, runs: [] };
      const data = context.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let rows = 0, run = 0;
      const runs = [];
      for (let y = 0; y < y1 - y0; y++) {
        let matching = 0;
        for (let x = 0; x < x1 - x0; x++) {
          const offset = (y * (x1 - x0) + x) * 4;
          if (color.every((channel, index) => Math.abs(data[offset + index] - channel) <= 1)) matching++;
        }
        if (matching / (x1 - x0) >= 0.95) { rows++; run++; }
        else if (run) { runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
      return { rows, runs };
    };
    const pair = (before, after) => sample(before.content.bottom, after.content.top, before.rect.left, before.rect.right);
    const main = geometry.results.filter(item => item.group === 'root');
    const protectedPaint = {};
    for (const group of ['border', 'native-band', 'unknown', 'card', 'shadow', 'clip']) {
      const cards = geometry.results.filter(item => item.group === group);
      protectedPaint[group] = pair(cards[0], cards[1]);
    }
    const result = {
      main: main.slice(1).map((item, index) => pair(main[index], item)), protected: protectedPaint,
      inside: geometry.results.map(item => sample(item.content.top + 1, item.content.bottom - 1, item.rect.left, item.rect.right)),
      site: sample(geometry.site.top + 1, geometry.site.bottom - 1, geometry.site.left, geometry.site.right),
      columns: sample(geometry.columns.top + 1, geometry.columns.bottom - 1, geometry.columns.left, geometry.columns.right),
    };
    bitmap.close();
    return result;
  }, { png: png.toString('base64'), geometry, color: GOOGLE_ROOT_COLORS[options.dark ? 'dark' : 'light'].rgb });
  return { ...geometry, paint };
}

async function baseline(options) {
  const key = JSON.stringify([options.width, options.dark, options.variant]);
  if (baselines.has(key)) return baselines.get(key);
  const original = await open(null, options, 10);
  try {
    const value = await measure(original.page, 10, options, `baseline-${options.width}-${options.dark ? 'dark' : 'light'}-${options.variant}`, true);
    assert.deepEqual(original.errors, [], 'Unmodified structural fixture has no runtime errors');
    baselines.set(key, value);
    return value;
  } finally { await original.context.close(); }
}

function verifyGeometry(value, before, label) {
  let maximum = 0;
  const compare = (actual, original, name) => {
    for (const key of ['left', 'right', 'top', 'bottom', 'width', 'height']) {
      const offset = ['top', 'bottom'].includes(key) ? 'top' : ['left', 'right'].includes(key) ? 'left' : null;
      const delta = Math.abs((actual[key] - (offset ? value.root[offset] : 0)) -
        (original[key] - (offset ? before.root[offset] : 0)));
      maximum = Math.max(maximum, delta);
      assert(delta <= 1 / 64, `${label}: geometry changed at ${name}.${key}: ${delta}px`);
    }
  };
  assert.equal(value.results.length, before.results.length, label + ': same result count');
  value.results.forEach((item, index) => {
    const original = before.results[index];
    for (const key of ['rect', 'surface', 'copy']) compare(item[key], original[key], `${item.id}.${key}`);
    if (item.thumbnail) compare(item.thumbnail.rect, original.thumbnail.rect, `${item.id}.thumbnail`);
    item.sites.forEach((site, i) => compare(site.rect, original.sites[i].rect, `${item.id}.sitelink${i}`));
    assert.equal(item.marginBottom, original.marginBottom, label + ': original bottom margin retained');
    if (item.group === 'shadow') assert.equal(item.shadow, original.shadow, label + ': native shadow retained');
    if (item.group === 'clip') assert.equal(item.clip, original.clip, label + ': clip retained');
  });
  value.blockers.forEach((blocker, index) => compare(blocker.rect, before.blockers[index].rect, blocker.kind));
  return maximum;
}

function verify(value, before, label, start, options, control = false) {
  const expected = googleRootExpectedResults(start, { compact: false });
  assert.equal(value.results.length, expected.length, label + ': every result survives once');
  value.results.forEach((item, index) => {
    const original = expected[index];
    for (const key of ['id', 'title', 'snippet', 'href']) assert.equal(item[key], original[key], `${label}: ${key} preserved`);
    assert(item.rect.width > 0 && item.rect.height > 0, label + ': result visible');
    if (original.thumbnail) {
      assert.equal(item.thumbnail?.src, original.thumbnail, label + ': thumbnail source');
      assert(item.thumbnail.rect.width >= 60 && item.thumbnail.rect.height >= 60, label + ': thumbnail visible');
    }
  });
  const main = value.results.filter(item => item.group === 'root');
  assert(main[1].sourceText.includes('dining.example') && main[1].sourceText.includes('https://r.dining.example'), label + ': base/subdomain identity actually exercised');
  assert.equal(new URL(main[2].href).hostname, new URL(main[3].href).hostname, label + ': adjacent same-host results remain independent');
  main.forEach((item, index) => {
    assert.equal(item.marginBottom, GOOGLE_ROOT_GAP_PX, label + ': 8px source margin retained');
    assert(Math.abs(item.rect.top - item.surface.top) <= 1 / 64 && Math.abs(item.rect.bottom - item.surface.bottom) <= 1 / 64, label + ': opaque interior covers transparent outer card');
    if (index) assert(Math.abs(item.rect.top - main[index - 1].rect.bottom - GOOGLE_ROOT_GAP_PX) <= 1 / 64, label + ': existing gap remains 8px');
  });
  const thickness = control && options.variant === 'missing' ? 0 : GOOGLE_ROOT_GAP_PX;
  assert.deepEqual(value.paint.main, Array.from({ length: 3 }, () => ({ rows: thickness, runs: thickness ? [thickness] : [] })),
    label + ': exactly three single painted boundary bands (or frozen omissions)');
  assert.deepEqual(value.paint.protected, before.paint.protected, label + ': existing borders/gutters and interrupted pairs are unchanged');
  for (const kind of ['border', 'native-band']) assert.deepEqual(value.paint.protected[kind], { rows: 8, runs: [8] }, label + ': native band proves pixel sampling');
  assert(value.paint.inside.every(item => item.rows === 0), label + ': no divider inside source/title/snippet/image');
  assert.equal(value.paint.site.rows, 0, label + ': no divider within sitelinks');
  assert.equal(value.paint.columns.rows, 0, label + ': no divider across horizontal cards');
  assert.deepEqual(main[3].sites.map(site => site.href), [main[3].href + '/menu', main[3].href + '/access'], label + ': sitelinks preserved');
  const columns = value.results.filter(item => item.group === 'columns');
  assert(Math.abs(columns[0].rect.top - columns[1].rect.top) <= 1 / 64 && columns[1].rect.left >= columns[0].rect.right, label + ': columns stay beside each other');
  assert.deepEqual(value.blockers.map(({ kind, text }) => ({ kind, text })), before.blockers.map(({ kind, text }) => ({ kind, text })), label + ': intervening content remains');
  assert.equal(value.blockers.find(item => item.kind === 'card')?.href, `https://special.example/card/${start}`, label + ': intervening card link preserved');
  assert.equal(value.native, googleRootNativeMarkup(), label + ': initial result markup unchanged');
  assert(value.documentWidth <= value.width + 1, label + ': no overflow');
  assert(Math.abs(value.root.width - Math.min(options.width, GOOGLE_ROOT_MAX_WIDTH)) <= 1 / 64, label + ': diagnostic-like fractional root width');
  return verifyGeometry(value, before, label);
}

async function run(code, options, label, control = false) {
  const before = await baseline(options), current = await open(code, options);
  try {
    const second = await measure(current.page, 10, options, label + '-page2');
    const delta = verify(second, before, label + ' page2', 10, options, control);
    const observation = { label, control, rootWidth: second.root.width, maximumGeometryDelta: delta, page2: second.paint };
    if (!control) {
      await current.page.waitForTimeout(1200);
      const settled = await measure(current.page, 10, options);
      assert.deepEqual(settled.paint, second.paint, label + ': repeated/delayed passes do not double or remove bands');
      verifyGeometry(settled, second, label + ' repeated pass');
      await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout: 25000 });
      await current.page.waitForTimeout(750);
      const third = await measure(current.page, 20, options, label + '-page3');
      observation.maximumGeometryDelta = Math.max(delta, verify(third, before, label + ' page3', 20, options));
      observation.page3 = third.paint;
    }
    assert.deepEqual(current.errors, [], label + ': no userscript errors');
    observations.push(observation);
    passed++;
    console.log('PASS ' + label + ' (max geometry delta ' + observation.maximumGeometryDelta + 'px)');
  } catch (error) {
    console.error('Root-result failure: ' + JSON.stringify({ label, error: error?.stack || String(error), runtimeErrors: current.errors }));
    try {
      const failed = await measure(current.page, 10, options, label + '-failure');
      if (output) await writeFile(resolve(output, label + '-failure.json'), JSON.stringify(failed, null, 2));
      console.error('Root-result measured state: ' + JSON.stringify(failed));
    } catch (diagnosticError) { console.error('Failure capture unavailable: ' + String(diagnosticError)); }
    throw error;
  } finally { await current.context.close(); }
}

try {
  for (const rendered of [true, false]) await run(frozen, { width: 500, dark: false, variant: 'missing', rendered },
    `control-v659-${rendered ? 'iframe' : 'fetch'}-500-missing`, true);
  if (!process.env.GOOGLE_ROOT_CONTROL_ONLY) {
    for (const [width, dark, variant, rendered] of [
      [500, false, 'missing', true], [500, true, 'missing', false],
      [500, true, 'native', true], [500, false, 'native', false],
    ]) await run(built, { width, dark, variant, rendered },
      `current-${rendered ? 'iframe' : 'fetch'}-${width}-${dark ? 'dark' : 'light'}-${variant}`);
  }
  console.log(`Google root-result paint tests passed: ${passed} scenarios; diagnosis-derived structural fixtures, not live Google/Berry HTML.`);
} finally {
  if (output) await writeFile(resolve(output, 'root-result-paint-results.json'), JSON.stringify({ passed,
    fixtureType: 'Neutral structural model derived from selected user diagnostic fields; not captured Google DOM', observations }, null, 2) + '\n');
  await browser.close();
}
