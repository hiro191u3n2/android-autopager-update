/**
 * Exercise the real built userscript on an offline Google fixture. This checks
 * removal of the Google diagnostic feature, including its gesture interception,
 * while retaining the actual pager's pause/resume button. It is not an Android,
 * Berry, AdGuard or live-Google rendering test.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';

const built = await buildUserscript();
for (const marker of [
  'installGenericGoogleResultDiagnosticsV659',
  'inspectGenericGoogleResultBoundariesV659',
  '__genericGoogleResultDiagnosticsV659',
  'generic-google-result-diagnostics-v659',
  'generic-google-diagnostics-v659',
  'generic-google-diagnostics-text-v659',
  'android-autopager-google-diagnostics/v659',
  'google-boundary-inspection/v659',
  'repairHistoryAvailable',
  'selectedPageRepairCalls',
  'autopager-google-v${VERSION',
  'Google表示の診断',
]) assert(!built.includes(marker), 'Removed Google diagnostic code or UI remains: ' + marker);
assert(built.includes('function repairGenericGoogleResultBoundariesV658('), 'Actual result repair must remain');
assert(built.includes('__genericCityhillAutoPagerDiagnostics'), 'Unrelated CITYHILL diagnostics must remain');
console.log('PASS Google diagnostic code, inspection, repair history and export UI absent from the full userscript');

// Useful where only Node is available; the normal test invocation always also
// executes the browser checks below, including in the release validation suite.
if (process.argv.includes('--static-only')) process.exit(0);

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

const STATUS = '#generic-autopager-status-v2';
const fixture = `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;font:16px/1.5 Arial,sans-serif}article{box-sizing:border-box;min-height:500px;padding:16px;border-bottom:8px solid #e8eaed}h3{font-weight:400}</style>
  </head><body><main id="search"><div id="rso">${Array.from({ length: 24 }, (_, n) =>
    `<article class="MjjYud"><div>Fixture ${n + 1}<br>https://result${n + 1}.example</div><a href="https://result${n + 1}.example/article"><h3>検索結果 ${n + 1}</h3></a><p>停止と再開を確認する通常の検索結果です。</p></article>`).join('')}</div></main>
  <nav><a id="pnnext" href="/search?q=diagnostic-removal&amp;start=10">次へ</a></nav></body></html>`;

// Probe browser side effects without replacing the pager or its event handlers.
// Its ordinary next-page loader is kept idle by the real, tall document layout.
const probe = `(() => {
  const state = window.__noDiagnosticsTest = {
    copies: 0, objectURLs: 0, downloads: 0, diagnosticNodes: 0,
    clicks: [], contextMenus: []
  };
  Object.defineProperty(navigator, 'clipboard', { configurable: true,
    value: { writeText: async () => { state.copies++; } } });
  const execCommand = document.execCommand.bind(document);
  document.execCommand = function (command, ...args) {
    if (String(command).toLowerCase() === 'copy') { state.copies++; return false; }
    return execCommand(command, ...args);
  };
  const createObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (...args) { state.objectURLs++; return createObjectURL(...args); };
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (...args) {
    if (this.hasAttribute('download')) state.downloads++;
    return anchorClick.apply(this, args);
  };
  const selector = '[id^="generic-google-diagnostics"],[data-generic-google-diagnostics-v659]';
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))) state.diagnosticNodes++;
    }
  }).observe(document, { childList: true, subtree: true });
  for (const [type, key] of [['click', 'clicks'], ['contextmenu', 'contextMenus']]) {
    document.addEventListener(type, event => {
      if (event.target.closest?.('#generic-autopager-status-v2')) state[key].push({ defaultPrevented: event.defaultPrevented });
    });
  }
})();`;

const browser = await chromium.launch(launch);
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage(), errors = [], requests = [], downloads = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('download', download => downloads.push(download.suggestedFilename()));
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  requests.push(url.href);
  if (url.hostname === 'www.google.com' && url.pathname === '/search') {
    return route.fulfill({ contentType: 'text/html', body: fixture });
  }
  return route.abort();
});

async function state() {
  return page.evaluate(() => {
    const status = document.getElementById('generic-autopager-status-v2');
    return {
      ...window.__noDiagnosticsTest,
      statusCount: document.querySelectorAll('#generic-autopager-status-v2').length,
      text: status?.textContent,
      label: status?.getAttribute('aria-label'),
      opacity: status ? getComputedStyle(status).opacity : null,
      installed: window.__genericGoogleResultDiagnosticsV659 === true,
      dialogs: document.querySelectorAll('[role="dialog"],[id^="generic-google-diagnostics"]').length,
      appended: document.querySelectorAll('.generic-autopager-page').length,
      native: document.getElementById('rso').innerHTML,
      scrollY,
    };
  });
}

function noDiagnosticEffects(value, label) {
  assert.equal(value.installed, false, label + ': no diagnostic initializer');
  assert.equal(value.dialogs, 0, label + ': no diagnostic dialog');
  assert.equal(value.diagnosticNodes, 0, label + ': no transient diagnostic UI');
  assert.equal(value.copies, 0, label + ': no clipboard writes or fallback copies');
  assert.equal(value.objectURLs, 0, label + ': no JSON export object URL');
  assert.equal(value.downloads, 0, label + ': no export anchor activation');
  assert.deepEqual(downloads, [], label + ': no browser downloads');
  assert.equal(value.statusCount, 1, label + ': one original pager button');
  assert.equal(value.appended, 0, label + ': tall first-page fixture leaves loading idle');
}

try {
  await page.addInitScript({ content: probe + '\n' + built });
  await page.goto('https://www.google.com/search?q=diagnostic-removal', { waitUntil: 'load' });
  await page.locator(STATUS).waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => /^自動 1\//.test(document.getElementById('generic-autopager-status-v2')?.textContent || ''));
  const initial = await state();
  noDiagnosticEffects(initial, 'Initial state');
  assert.match(initial.text, /^自動 1\/\d+$/);

  await page.locator(STATUS).click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('generic-autopager-status-v2')).opacity === '0');
  const paused = await state();
  assert.equal(paused.label, '一時中断中。タップで再開', 'Short tap invokes the real pause handler');
  assert.equal(paused.opacity, '0', 'Paused button keeps its original transparent appearance');
  await page.locator(STATUS).click();
  const resumed = await state();
  assert.equal(resumed.text, initial.text, 'Second short tap invokes the real resume handler');
  assert.deepEqual(resumed.clicks, [{ defaultPrevented: false }, { defaultPrevented: false }], 'Ordinary clicks propagate');

  const box = await page.locator(STATUS).boundingBox();
  assert(box && box.width > 0 && box.height > 0, 'The status button has a real browser hit area');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100); // Exceeds the removed diagnostic's 900 ms hold.
  noDiagnosticEffects(await state(), 'Held pointer');
  await page.mouse.up();
  const afterHold = await state();
  assert.equal(afterHold.label, '一時中断中。タップで再開', 'Release click after a hold still reaches the normal pause handler');
  assert.equal(afterHold.clicks.length, 3, 'Long-press release click is not consumed');
  assert.equal(afterHold.clicks.at(-1).defaultPrevented, false);
  await page.locator(STATUS).click();
  assert.equal((await state()).text, initial.text, 'Resume remains usable after a held pointer');

  await page.locator(STATUS).click({ button: 'right' });
  const afterContextMenu = await state();
  noDiagnosticEffects(afterContextMenu, 'Context menu');
  assert.equal(afterContextMenu.text, initial.text, 'Context menu does not toggle the pager');
  assert.deepEqual(afterContextMenu.contextMenus, [{ defaultPrevented: false }], 'Removed logging does not intercept context menus');
  await page.locator(STATUS).click();
  assert.equal((await state()).label, '一時中断中。タップで再開', 'Next ordinary click is not suppressed after a context menu');
  await page.locator(STATUS).click();
  const final = await state();
  noDiagnosticEffects(final, 'Final state');
  assert.equal(final.text, initial.text, 'Pager resumes after all tested gestures');
  assert.equal(final.clicks.length, 6, 'All six ordinary/release clicks reached the existing handler');
  assert(final.clicks.every(event => !event.defaultPrevented), 'No click is consumed by removed diagnostics');
  assert.equal(final.native, initial.native, 'Button gestures leave the actual search results unchanged');
  assert.equal(final.scrollY, initial.scrollY, 'Button gestures do not move the result list');
  assert.equal(requests.filter(url => new URL(url).searchParams.has('start')).length, 0, 'No next-page network request is caused by the test gestures');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS full userscript: short-tap pause/resume, held-pointer release and context-menu clicks; no diagnostic UI, copying or downloads');
} finally {
  await context.close();
  await browser.close();
}
