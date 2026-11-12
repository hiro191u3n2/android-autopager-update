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
  GOOGLE_ROOT_V661_CASES, GOOGLE_ROOT_V661_CUSTOM_CASE, googleRootPaintCase,
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
const frozen660 = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.60.js'), 'utf8');
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
        marginBottom: parseFloat(style.marginBottom), surfaceColor: style.backgroundColor, surfaceShadow: style.boxShadow,
        marked: node.hasAttribute('data-generic-google-boundary-v658'),
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
  const paintCase = googleRootPaintCase(options.variant, options.dark);
  // Suppress only the added outer shadow for an in-place reference. The
  // surface's original 1px outline stays rendered at identical pixel phases.
  // This avoids comparing antialiased edges at different absolute page Y's.
  let reference = png;
  if (paintCase && !original) {
    // A stylesheet cannot override the repair's inline !important declaration.
    // Change only that outer property; leave the native inner outline intact.
    const shadows = await page.evaluate(start => {
      const root = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"] .generic-autopager-google-source-root`);
      return [...root.querySelectorAll(':scope > [data-root-case="root"]')].map(node => {
        const saved = { id: node.dataset.organicResult, value: node.style.getPropertyValue('box-shadow'),
          priority: node.style.getPropertyPriority('box-shadow'), hadStyle: node.hasAttribute('style') };
        node.style.setProperty('box-shadow', 'none', 'important');
        return saved;
      });
    }, start);
    try {
      reference = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css',
        style: '#generic-autopager-status-v2{visibility:hidden!important}' });
    } finally {
      await page.evaluate(({ start, shadows }) => {
        const root = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"] .generic-autopager-google-source-root`);
        for (const saved of shadows) {
          const node = [...root.querySelectorAll(':scope > [data-root-case="root"]')]
            .find(item => item.dataset.organicResult === saved.id);
          if (!node) throw new Error('Reference capture lost original card ' + saved.id);
          if (saved.value) node.style.setProperty('box-shadow', saved.value, saved.priority);
          else node.style.removeProperty('box-shadow');
          if (!saved.hadStyle && !node.getAttribute('style')) node.removeAttribute('style');
        }
      }, { start, shadows });
    }
  }
  if (output && label) await writeFile(resolve(output, label + '.png'), png);
  if (output && label && paintCase && !original) await writeFile(resolve(output, label + '-without-repair.png'), reference);
  const paint = await page.evaluate(async ({ png, reference, geometry, color, paintCase }) => {
    const bytes = Uint8Array.from(atob(png), value => value.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const sample = (top, bottom, left, right, sampleColor = color) => {
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
          if (sampleColor.every((channel, index) => Math.abs(data[offset + index] - channel) <= 1)) matching++;
        }
        if (matching / (x1 - x0) >= 0.95) { rows++; run++; }
        else if (run) { runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
      return { rows, runs };
    };
    const pair = (before, after) => sample(before.content.bottom, after.content.top, before.rect.left, before.rect.right);
    const main = geometry.results.filter(item => item.group === 'root');
    const gapProfiles = async () => Promise.all(main.slice(1).map(async (after, index) => {
      const before = main[index];
      const x0 = Math.ceil(before.rect.left + 3), x1 = Math.floor(before.rect.right - 3);
      return Promise.all(Array.from({ length: 8 }, async (_, row) => {
        const y = Math.floor(before.rect.bottom + row + 0.5);
        const pixels = context.getImageData(x0, y, x1 - x0, 1).data, counts = new Map();
        for (let x = 0; x < x1 - x0; x++) {
          const offset = x * 4, key = `${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const [key, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
        const digest = await crypto.subtle.digest('SHA-256', pixels);
        return { rgb: key.split(',').map(Number), coverage: count / (x1 - x0),
          sha256: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') };
      }));
    }));
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
    if (paintCase) {
      result.gaps = await gapProfiles();
      result.repairColorBands = main.slice(1).map((after, index) => sample(main[index].content.bottom, after.content.top,
        main[index].rect.left, main[index].rect.right, paintCase.paintRgb));
      const referenceBytes = Uint8Array.from(atob(reference), value => value.charCodeAt(0));
      const referenceBitmap = await createImageBitmap(new Blob([referenceBytes], { type: 'image/png' }));
      if (referenceBitmap.width !== bitmap.width || referenceBitmap.height !== bitmap.height) throw new Error('Reference screenshot dimensions changed');
      context.drawImage(referenceBitmap, 0, 0);
      result.referenceGaps = await gapProfiles();
      referenceBitmap.close();
    }
    bitmap.close();
    return result;
  }, { png: png.toString('base64'), reference: reference.toString('base64'), geometry,
    color: GOOGLE_ROOT_COLORS[options.dark ? 'dark' : 'light'].rgb, paintCase });
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
    assert.equal(item.surfaceShadow, original.surfaceShadow, label + ': original inner surface outline retained');
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
  const paintCase = googleRootPaintCase(options.variant, options.dark);
  if (paintCase) {
    const center = control ? paintCase.underlayRgb : paintCase.paintRgb;
    const match = (actual, expected, tolerance) => actual.every((channel, index) => Math.abs(channel - expected[index]) <= tolerance);
    for (let index = 0; index < 3; index++) {
      const gap = value.paint.gaps[index], reference = value.paint.referenceGaps[index];
      for (const row of [1, 2, 3, 4, 5, 6]) {
        assert(reference[row].coverage >= 0.95 && match(reference[row].rgb, paintCase.underlayRgb, 1),
          `${label}: unpainted gap ${index} row ${row} has the representative ancestor color`);
        assert(gap[row].coverage >= 0.95 && match(gap[row].rgb, center, 1),
          `${label}: gap ${index} central row ${row} expected ${center}, got ${gap[row].rgb}`);
      }
      for (const row of [0, 7]) {
        // A subpixel edge may blend a little with its underlying background;
        // native preservation below additionally compares every pixel's hash.
        assert(reference[row].coverage >= 0.95 && match(reference[row].rgb, paintCase.ringRgb, 4),
          `${label}: original 1px ring is present at gap ${index} edge ${row}`);
        assert(gap[row].coverage >= 0.95 && match(gap[row].rgb, paintCase.ringRgb, 4),
          `${label}: original 1px ring survives at gap ${index} edge ${row}`);
      }
      if (paintCase.native) assert.deepEqual(gap, reference, `${label}: all native 8px gap pixels and ring edges are unchanged`);
    }
    const paintedRows = control && !paintCase.native ? 0 : 6;
    assert.deepEqual(value.paint.repairColorBands, Array.from({ length: 3 }, () => ({ rows: paintedRows, runs: paintedRows ? [paintedRows] : [] })),
      label + ': six painted middle rows plus the two retained outline rows, without any extra band');
    if (control) assert(main.every(item => !item.marked), label + ': v6.60 failure control has zero repair markers');
    else if (!paintCase.native) assert.equal(main.filter(item => item.marked).length, 3, label + ': all three formerly rejected gaps repaired');
    assert(main.every(item => item.surfaceShadow !== 'none' && item.surfaceShadow.includes('1px')), label + ': observed inner outline is actually exercised');
  } else {
    const thickness = control && options.variant === 'missing' ? 0 : GOOGLE_ROOT_GAP_PX;
    assert.deepEqual(value.paint.main, Array.from({ length: 3 }, () => ({ rows: thickness, runs: thickness ? [thickness] : [] })),
      label + ': exactly three single painted boundary bands (or frozen omissions)');
  }
  assert.deepEqual(value.paint.protected, before.paint.protected, label + ': existing borders/gutters and interrupted pairs are unchanged');
  if (!paintCase) for (const kind of ['border', 'native-band']) assert.deepEqual(value.paint.protected[kind], { rows: 8, runs: [8] }, label + ': native band proves pixel sampling');
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

async function captureFrozen660Failure(page, label) {
  // Use the frozen userscript's own read-only dialog to prove the classifier
  // failure, not a separately reimplemented explanation of its missing paint.
  await page.locator('#generic-autopager-status-v2').click({ button: 'right' });
  const textarea = page.locator('#generic-google-diagnostics-text-v659');
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  const report = JSON.parse(await textarea.inputValue());
  await page.locator('#generic-google-diagnostics-close-v659').click();
  await textarea.waitFor({ state: 'detached', timeout: 5000 });
  assert.equal(report.userscriptVersion, '6.60.0', label + ': frozen actual userscript version');
  assert.equal(report.pager.selectedPage, 2, label + ': diagnostic targets imported page 2');
  assert.equal(report.inspection.counts.repairMarkers, 0, label + ': old classifier added no repair marker');
  assert.deepEqual(report.inspection.pairs.slice(0, 3).map(pair => pair.reason),
    ['different-background', 'different-background', 'different-background'], label + ': exact v6.60 false-skip reason reproduced');
  if (output) await writeFile(resolve(output, label + '-diagnostic.json'), JSON.stringify(report, null, 2));
  return { version: report.userscriptVersion, counts: report.inspection.counts,
    mainPairReasons: report.inspection.pairs.slice(0, 3).map(pair => pair.reason) };
}

async function run(code, options, label, control = false) {
  const before = await baseline(options), current = await open(code, options);
  try {
    const frozenFailure = control && googleRootPaintCase(options.variant, options.dark)
      ? await captureFrozen660Failure(current.page, label) : null;
    const second = await measure(current.page, 10, options, label + '-page2');
    const delta = verify(second, before, label + ' page2', 10, options, control);
    const observation = { label, control, frozenFailure, rootWidth: second.root.width, maximumGeometryDelta: delta, page2: second.paint };
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
  for (const [variant, rendered] of [['v661-nearwhite', true], ['v661-alpha', false]]) {
    await run(frozen660, { width: 500, dark: false, variant, rendered },
      `control-v660-${rendered ? 'iframe' : 'fetch'}-${variant}`, true);
  }
  if (!process.env.GOOGLE_ROOT_CONTROL_ONLY) {
    for (const [width, dark, variant, rendered] of [
      [500, false, 'missing', true], [500, true, 'missing', false],
      [500, true, 'native', true], [500, false, 'native', false],
    ]) await run(built, { width, dark, variant, rendered },
      `current-${rendered ? 'iframe' : 'fetch'}-${width}-${dark ? 'dark' : 'light'}-${variant}`);
    for (const item of [...GOOGLE_ROOT_V661_CASES, GOOGLE_ROOT_V661_CUSTOM_CASE]) {
      const rendered = !['alpha-light', 'native-dark'].includes(item.id);
      await run(built, { width: 500, dark: item.theme === 'dark', variant: item.variant, rendered },
        `current-${rendered ? 'iframe' : 'fetch'}-${item.id}-outline`);
    }
  }
  console.log(`Google root-result paint tests passed: ${passed} scenarios; diagnosis-derived structural fixtures, not live Google/Berry HTML.`);
} finally {
  if (output) await writeFile(resolve(output, 'root-result-paint-results.json'), JSON.stringify({ passed,
    fixtureType: 'Neutral structural model derived from selected user diagnostic fields; not captured Google DOM', observations }, null, 2) + '\n');
  await browser.close();
}
