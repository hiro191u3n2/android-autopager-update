/**
 * Paint-level regressions for grouped organic results. All network responses
 * are controlled fixtures. This suite is not a live Google or Berry test.
 * Old-version failure controls keep the test from merely accepting any DOM.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';
import { ORGANIC_COLORS, ORGANIC_DIVIDER_PX, organicExpectedResults, organicNativeMarkup, renderGoogleOrganicFixture } from './fixtures/google-organic-groups.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const deps = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths: deps }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundled = loaded.default || loaded;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(launch);
const built = await buildUserscript();
const frozen657 = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.57.js'), 'utf8');
const frozen656 = await readFile(resolve(ROOT, 'Android_Generic_AutoPager_v6.56.js'), 'utf8');
const outputDir = process.env.GOOGLE_ORGANIC_ARTIFACT_DIR;
if (outputDir) await mkdir(outputDir, { recursive: true });
const observations = [];
let passed = 0;

function configure(code, rendered) {
  if (rendered) return code;
  const target = 'googleUseRenderedFrame:!0';
  assert.equal(code.split(target).length, 2, 'Fetch control must alter only the existing rendered-frame preference');
  return code.replace(target, 'googleUseRenderedFrame:!1');
}

async function setup(code, { width = 360, dark = false, rendered = true, shape = 'mixed', large = false, price = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.google.com' && url.pathname === '/search') return route.fulfill({ contentType: 'text/html', body: renderGoogleOrganicFixture(Number(url.searchParams.get('start')) || 0, { dark, shape, large, price }) });
    return route.abort();
  });
  await page.addInitScript({ content: configure(code, rendered) });
  await page.goto('https://www.google.com/search?q=organic-fixture', { waitUntil: 'load' });
  await page.waitForSelector('.generic-autopager-page[data-page="2"]', { timeout: 25000 });
  await page.waitForTimeout(750);
  return { context, page, errors };
}

async function measure(page, start, dark, label = '') {
  const geometry = await page.evaluate(start => {
    const root = document.querySelector(`.generic-autopager-page[data-page="${start / 10 + 1}"]`);
    if (!root) throw new Error('Imported page is missing: ' + start);
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height };
    };
    const results = [...root.querySelectorAll('[data-organic-result]')].map(node => {
      // Content edges, rather than a particular wrapper, define the boundary.
      // A valid border may be painted on the outer card or its inner copy box.
      const content = ['.organic-source-header', '.organic-title', '.organic-body', '.organic-sitelinks']
        .map(selector => node.querySelector(selector)).filter(Boolean).map(rect);
      return {
        id: node.getAttribute('data-organic-result'), rect: rect(node), copy: rect(node.querySelector('.organic-copy')),
        content: { top: Math.min(...content.map(item => item.top)), bottom: Math.max(...content.map(item => item.bottom)) },
        title: node.querySelector('.organic-title').textContent,
        snippet: node.querySelector('.organic-snippet').textContent,
        href: node.querySelector('.organic-main-link').href,
        thumbnail: node.querySelector('.organic-thumbnail') ? { src: node.querySelector('.organic-thumbnail').getAttribute('src'), rect: rect(node.querySelector('.organic-thumbnail')) } : null,
      };
    });
    const sites = root.querySelector('.organic-sitelinks');
    const horizontal = root.querySelector('[data-organic-horizontal-panel]');
    const hidden = root.querySelector('[data-organic-hidden]');
    const cssHidden = root.querySelector('[data-organic-css-hidden]');
    const suppressed = (node, origin) => ({
      present: Boolean(node),
      display: node ? getComputedStyle(node).display : null,
      rect: node ? rect(node) : null,
      explicitHidden: node ? node.hasAttribute('hidden') || node.hasAttribute('aria-hidden') : null,
      // Removing a marker alone must not let an exposed alternative pass.
      visibleLinks: [...root.querySelectorAll(`a[href^="${origin}/"]`)].filter(link => {
        const box = link.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(link).visibility === 'visible';
      }).length,
    });
    const groupRect = group => rect(root.querySelector(`[data-organic-group="${group}-${start}"]`));
    return {
      results, groupRects: { main: groupRect('main'), existing: groupRect('existing'), same: groupRect('same') },
      siteRect: rect(sites), siteLinks: [...sites.querySelectorAll('a')].map(node => ({ href: node.href, rect: rect(node) })),
      horizontalRect: rect(horizontal), horizontal: [...horizontal.querySelectorAll('[data-organic-horizontal]')].map(rect),
      hidden: suppressed(hidden, 'https://hidden.example'),
      cssHidden: suppressed(cssHidden, 'https://css-hidden.example'),
      native: document.getElementById('organic-native').outerHTML,
      width: innerWidth, documentWidth: document.documentElement.scrollWidth, importedNodeCount: root.querySelectorAll('*').length,
    };
  }, start);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', scale: 'css', style: '#generic-autopager-status-v2{visibility:hidden!important}' });
  if (outputDir && label) await writeFile(resolve(outputDir, label + '.png'), png);
  const paint = await page.evaluate(async ({ png, geometry, color }) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const sample = (top, bottom, left, right) => {
      const x0 = Math.max(0, Math.ceil(left + 3)), x1 = Math.min(canvas.width, Math.floor(right - 3));
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(canvas.height, Math.ceil(bottom));
      if (x1 <= x0 || y1 <= y0) return { rows: 0, runs: [] };
      const pixels = context.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let rows = 0, run = 0;
      const runs = [];
      for (let y = 0; y < y1 - y0; y++) {
        let matching = 0;
        for (let x = 0; x < x1 - x0; x++) {
          const offset = (y * (x1 - x0) + x) * 4;
          if (color.every((channel, index) => Math.abs(pixels[offset + index] - channel) <= 1)) matching++;
        }
        if (matching / (x1 - x0) >= 0.95) { rows++; run++; }
        else if (run) { runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
      return { rows, runs };
    };
    const groups = {};
    for (const group of ['main', 'existing', 'same']) {
      const cards = geometry.results.filter(result => result.id.startsWith(group + '-'));
      const area = geometry.groupRects[group];
      groups[group] = cards.slice(1).map((card, index) => sample(cards[index].content.bottom, card.content.top, area.left, area.right));
    }
    const allBoundaries = geometry.results.slice(1).map((card, index) => sample(geometry.results[index].content.bottom, card.content.top, geometry.results[index].rect.left, geometry.results[index].rect.right));
    const inside = geometry.results.map(result => sample(result.content.top + 1, result.content.bottom - 1, result.rect.left, result.rect.right));
    const site = sample(geometry.siteRect.top + 1, geometry.siteRect.bottom - 1, geometry.siteRect.left, geometry.siteRect.right);
    const horizontal = sample(geometry.horizontalRect.top + 1, geometry.horizontalRect.bottom - 1, geometry.horizontalRect.left, geometry.horizontalRect.right);
    bitmap.close();
    return { groups, allBoundaries, inside, site, horizontal };
  }, { png: png.toString('base64'), geometry, color: ORGANIC_COLORS[dark ? 'dark' : 'light'].rgb });
  return { ...geometry, paint };
}

function verify(value, label, start, { large = false, price = false } = {}) {
  const expected = organicExpectedResults(start, { price });
  assert.equal(value.results.length, expected.length, label + ': every original organic result survives once');
  for (const group of ['main', 'existing', 'same']) {
    assert.deepEqual(value.paint.groups[group], [{ rows: ORGANIC_DIVIDER_PX, runs: [ORGANIC_DIVIDER_PX] }, { rows: ORGANIC_DIVIDER_PX, runs: [ORGANIC_DIVIDER_PX] }], `${label}: ${group} has exactly two full-width, contiguous, single dividers`);
  }
  assert(value.paint.allBoundaries.every(item => item.rows === ORGANIC_DIVIDER_PX && item.runs.length === 1), label + ': native boundaries between groups are not lost or doubled');
  assert(value.paint.inside.every(item => item.rows === 0), label + ': no band appears within the site header, title, snippet or media');
  for (let index = 0; index < expected.length; index++) {
    const actual = value.results[index], original = expected[index];
    assert.equal(actual.id, original.id, label + ': result order');
    assert.equal(actual.title, original.title, label + ': title ' + original.id);
    assert.equal(actual.snippet, original.snippet, label + ': snippet ' + original.id);
    assert.equal(actual.href, original.href, label + ': destination ' + original.id);
    if (original.thumbnail) {
      assert.equal(actual.thumbnail?.src, original.thumbnail, label + ': thumbnail source remains');
      assert(actual.thumbnail.rect.width >= 60 && actual.thumbnail.rect.height >= 60, label + ': thumbnail remains rendered');
      assert(actual.thumbnail.rect.left >= actual.copy.left && actual.thumbnail.rect.right <= actual.copy.right + 1 && actual.thumbnail.rect.bottom <= actual.copy.bottom + 1, label + ': thumbnail stays within its result');
    }
  }
  assert.equal(value.paint.site.rows, 0, label + ': h3 sitelinks acquire no divider');
  assert.equal(value.siteLinks.length, 2, label + ': both sitelinks remain');
  assert(value.siteLinks[0].rect.bottom <= value.siteLinks[1].rect.top + 1, label + ': sitelink order remains vertical');
  assert(value.siteLinks.every(link => link.href.startsWith(`https://guide.example/organic-fixture/${start}/sitelinks/1/`)), label + ': sitelink URLs remain');
  assert.equal(value.paint.horizontal.rows, 0, label + ': horizontal cards acquire no full-width band');
  assert.equal(value.horizontal.length, 2, label + ': both horizontal cards remain');
  assert(Math.abs(value.horizontal[0].top - value.horizontal[1].top) <= 1 && value.horizontal[1].left >= value.horizontal[0].right, label + ': plain flex cards remain side by side');
  for (const [kind, alternative] of Object.entries({ hidden: value.hidden, cssHidden: value.cssHidden })) {
    assert.equal(alternative.visibleLinks, 0, `${label}: ${kind} alternative has no exposed result link`);
    // The existing importer deliberately removes [hidden]/[inert] subtrees.
    // Either removal or zero-height display:none preserves the required UI.
    if (alternative.present) {
      assert.equal(alternative.display, 'none', `${label}: retained ${kind} alternative stays hidden`);
      assert.equal(alternative.rect.height, 0, `${label}: retained ${kind} alternative creates no spacing`);
    }
  }
  if (value.cssHidden.present) assert.equal(value.cssHidden.explicitHidden, false, label + ': retained CSS-only visibility case has no HTML/ARIA hiding attribute');
  assert.equal(value.native, organicNativeMarkup(), label + ': first-page markup is untouched');
  assert(value.documentWidth <= value.width + 1, label + ': no horizontal overflow');
  if (large) assert(value.importedNodeCount > 6500, label + ': large-DOM guard is actually exercised');
}

async function runScenario(code, options, label, control = false) {
  const current = await setup(code, options);
  try {
    const first = await measure(current.page, 10, options.dark, label + '-page2');
    if (control) {
      assert.deepEqual(first.paint.groups.main, [{ rows: 0, runs: [] }, { rows: 0, runs: [] }], label + ': reproduces both missing boundaries in the three-result group');
      assert.deepEqual(first.paint.groups.existing, [{ rows: 8, runs: [8] }, { rows: 8, runs: [8] }], label + ': existing borders prove the pixel measurement is working');
    } else {
      verify(first, label + ' page 2', 10, options);
      // Existing immediate/RAF/delayed import passes must be idempotent. Also
      // catch delayed cleanup that removes a newly introduced empty divider.
      await current.page.waitForTimeout(1200);
      const settled = await measure(current.page, 10, options.dark);
      assert.deepEqual(settled.paint, first.paint, label + ': divider paint is stable after delayed cleanup');
      await current.page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await current.page.waitForSelector('.generic-autopager-page[data-page="3"]', { timeout: 25000 });
      await current.page.waitForTimeout(750);
      const third = await measure(current.page, 20, options.dark, label + '-page3');
      verify(third, label + ' page 3', 20, options);
      observations.push({ label, page2: first.paint, page3: third.paint, importedNodeCount: first.importedNodeCount });
    }
    assert.deepEqual(current.errors, [], label + ': no runtime errors');
    passed++;
    console.log('PASS ' + label);
  } catch (error) {
    // Print the original failure before attempting diagnostics: a missing node
    // or closed page must not replace the real assertion with a second error.
    console.error('Organic boundary failure: ' + JSON.stringify({ label, error: error?.stack || String(error), runtimeErrors: current.errors }, null, 2));
    try {
      console.error('Organic boundary observation: ' + JSON.stringify({ label, observed: await measure(current.page, 10, options.dark, label + '-failure') }, null, 2));
    } catch (observationError) {
      console.error('Organic boundary observation unavailable: ' + String(observationError));
    }
    throw error;
  } finally { await current.context.close(); }
}

try {
  for (const rendered of [true, false]) {
    await runScenario(frozen657, { rendered, shape: 'mixed' }, `control-v657-${rendered ? 'iframe' : 'fetch'}`, true);
  }
  await runScenario(frozen656, { rendered: true, shape: 'plain' }, 'control-v656-plain-div-titles', true);
  await runScenario(frozen656, { rendered: true, shape: 'mixed', large: true }, 'control-v656-large-dom', true);
  if (!process.env.GOOGLE_ORGANIC_CONTROL_ONLY) {
    for (const rendered of [true, false]) for (const width of [360, 412]) for (const dark of [false, true]) {
      await runScenario(built, { rendered, width, dark, shape: 'mixed' }, `current-${rendered ? 'iframe' : 'fetch'}-${width}-${dark ? 'dark' : 'light'}`);
    }
    await runScenario(built, { rendered: true, width: 360, dark: false, shape: 'plain' }, 'current-plain-div-titles');
    await runScenario(built, { rendered: true, width: 360, dark: false, shape: 'mixed', large: true }, 'current-large-dom-iframe');
    await runScenario(built, { rendered: false, width: 412, dark: true, shape: 'mixed', large: true }, 'current-large-dom-fetch-dark');
    await runScenario(built, { rendered: true, width: 360, dark: false, shape: 'mixed', price: true }, 'current-price-mention-iframe');
    await runScenario(built, { rendered: false, width: 360, dark: false, shape: 'mixed', price: true }, 'current-price-mention-fetch');
  }
  if (outputDir) await writeFile(resolve(outputDir, 'organic-paint-results.json'), JSON.stringify({ passed, fixtureType: 'controlled synthetic DOM, not captured live Google', observations }, null, 2) + '\n');
  console.log(`Google organic grouping paint tests passed: ${passed} scenarios. Controlled mobile Chromium fixtures; not live Android/Berry verification.`);
} finally { await browser.close(); }
