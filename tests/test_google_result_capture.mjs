/**
 * Browser checks for the separate, one-use evidence collector. These verify
 * capture fidelity and isolation; they do not fix or reproduce Berry's layout.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const helper = await readFile(resolve(ROOT, 'tools/google-result-capture.user.js'), 'utf8');
const require = createRequire(import.meta.url);
const paths = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundled = loaded.default || loaded;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(launch);
const output = await mkdtemp(join(tmpdir(), 'google-result-capture-test-'));
const UI = '#google-result-capture-ui';
const START = '#google-result-capture-start';
const CANCEL = '#google-result-capture-cancel';
const STATUS = '#google-result-capture-status';
const DONE = '__googleResultStructureCaptureDone_v1';
const titles = ['JR東日本の時刻表', '駅探の時刻表', 'Yahoo!路線情報'];
let passed = 0;

function fixture() {
  const result = (title, n) => `<article class="uIV6Ge fqvXQb capture-card"><div class="Ww4FFb vt6azd"><div class="N54PNb BToiNc cvP2Ce">https://rail${n}.example</div><a href="https://user:SECRET_CREDENTIAL@rail${n}.example/timetable?token=SECRET_URL_TOKEN#SECRET_HASH" onclick="window.SECRET_EVENT=true"><h3${n === 2 ? ' id="capture-target"' : ''}>${title}</h3></a><p>本文と参照先を保持する検索結果です。</p></div></article>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;font:16px/1.5 Arial;background:#f8f9fa;color:#202124}header{height:40px}.initial{padding:30px 16px;min-height:1050px}.capture-card{padding:20px 16px;box-shadow:0 0 0 1px rgb(235,237,239);background:#fff;min-height:170px}.capture-card h3{margin:8px 0}.grouped-three{background:white}.source-parent{padding:0;background:rgba(255,255,255,.8)}.capture-card::before{content:"";display:block;height:2px;background:rgb(210,220,230)}.hidden-alternative{display:none!important}.generic-autopager-page[data-page="3"]{padding-bottom:1600px}</style></head><body>
  <header><form><input value="SECRET_HEADER_VALUE"><textarea>SECRET_HEADER_TEXT</textarea></form></header>
  <main id="search"><div id="rso" data-secret-token="SECRET_ROOT_TOKEN"><article id="initial-result" class="initial"><a href="https://first.example/first?token=SECRET_FIRST_TOKEN"><h3>最初のページの結果</h3></a></article>
  <section class="generic-autopager-page" data-page="2" data-source-url="https://www.google.com/search?q=SECRET_QUERY&start=10"><div class="source-parent"><div class="generic-autopager-google-source-root" data-generic-google-layout-v647="1"><div class="MjjYud grouped-three">${titles.map((title, n) => result(title, n + 1)).join('')}</div>
  <div class="hidden-alternative"><h3>非表示の別候補</h3><p>表示してはいけない内容</p></div>
  <form><input type="password" value="SECRET_PASSWORD"><textarea>SECRET_TEXTAREA</textarea><select><option>SECRET_OPTION</option></select></form>
  <div contenteditable="true">SECRET_EDITABLE</div><script>window.__fixtureScript='SECRET_SCRIPT';</script>
  <img width="1" height="1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-secret="SECRET_IMAGE_TOKEN">
  </div></div></section>
  <section class="generic-autopager-page" data-page="3"><div class="generic-autopager-google-source-root"><article><a href="https://last.example/"><h3>別の追加ページの結果</h3></a></article></div></section>
  </div></main><button id="generic-autopager-status-v2">自動 3/30</button></body></html>`;
}

async function open(url = 'https://www.google.com/search?q=SECRET_QUERY&token=SECRET_QUERY_TOKEN', { localStorageWriteFails = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 500, height: 983 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage(), requests = [], errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: fixture() }) : route.abort());
  await page.addInitScript(({ localStorageWriteFails }) => {
    const probe = window.__captureProbe = { cookieReads: 0, storageReads: [], storageReadKinds: [], storageWrites: [], clipboard: 0, scrollWrites: [], clicks: [], downloads: 0 };
    Object.defineProperty(document, 'cookie', { configurable: true, get() { probe.cookieReads++; return 'SECRET_COOKIE'; }, set() {} });
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    set.call(localStorage, 'unrelated-private-state', 'SECRET_STORAGE');
    set.call(sessionStorage, 'unrelated-private-state', 'SECRET_SESSION');
    Storage.prototype.getItem = function (key) {
      probe.storageReads.push(String(key)); probe.storageReadKinds.push(this === localStorage ? 'local' : 'session');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      probe.storageWrites.push([String(key), String(value), this === localStorage ? 'local' : 'session']);
      if (localStorageWriteFails && this === localStorage && key === '__googleResultStructureCaptureDone_v1') {
        throw new DOMException('Fixture localStorage quota exceeded', 'QuotaExceededError');
      }
      return set.call(this, key, value);
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { probe.clipboard++; } } });
    const execCommand = document.execCommand.bind(document);
    document.execCommand = (command, ...args) => {
      if (String(command).toLowerCase() === 'copy') { probe.clipboard++; return false; }
      return execCommand(command, ...args);
    };
    const scroll = window.scrollTo.bind(window);
    window.scrollTo = (...args) => { probe.scrollWrites.push(args); return scroll(...args); };
    document.addEventListener('click', event => {
      const anchor = event.target.closest?.('#rso a[href]');
      if (anchor) { probe.clicks.push({ text: anchor.textContent, prevented: event.defaultPrevented }); event.preventDefault(); }
    });
  }, { localStorageWriteFails });
  await page.goto(url, { waitUntil: 'load' });
  requests.length = 0;
  return { context, page, requests, errors, close: () => context.close() };
}

async function install(test) { await test.page.addScriptTag({ content: helper }); }
async function snapshot(test) {
  return test.page.evaluate(() => ({ html: document.getElementById('rso').outerHTML, y: scrollY,
    x: scrollX, probe: structuredClone(window.__captureProbe) }));
}
async function capture(test, target = '#capture-target') {
  await test.page.locator(target).scrollIntoViewIfNeeded();
  const before = await snapshot(test);
  await test.page.locator(START).click();
  const downloading = test.page.waitForEvent('download', { timeout: 15000 });
  await test.page.locator(target).click();
  const download = await downloading;
  assert.match(download.suggestedFilename(), /^Google_Result_Structure_.*\.json$/);
  const destination = join(output, `${Date.now()}-${download.suggestedFilename()}`);
  await download.saveAs(destination);
  assert.equal(await download.failure(), null);
  const text = await readFile(destination, 'utf8'), report = JSON.parse(text);
  const after = await snapshot(test);
  assert.equal(after.html, before.html, 'Collecting evidence must not modify the result DOM');
  assert.equal(after.y, before.y, 'Collecting evidence must preserve vertical scroll');
  assert.equal(after.x, before.x, 'Collecting evidence must preserve horizontal scroll');
  assert.deepEqual(after.probe.scrollWrites, before.probe.scrollWrites, 'Collector never writes outer scroll positions');
  assert.deepEqual(after.probe.clicks, before.probe.clicks, 'Armed selection suppresses the selected result navigation');
  return { report, text, before, after };
}

try {
  const selected = await open();
  try {
    await install(selected);
    await install(selected);
    assert.equal(await selected.page.locator(UI).count(), 1, 'Repeated injection keeps a single capture UI');
    const { report, text, after } = await capture(selected);
    assert.equal(report.schema, 'google-result-structure/v1');
    assert.equal(Number(report.root.pageNumber), 2, 'A click in page 2 captures page 2 even when page 3 already exists');
    assert(report.root.html.includes('grouped-three') && report.root.html.includes('uIV6Ge fqvXQb'));
    assert(report.root.html.includes('data-generic-google-layout-v647="1"'), 'Existing layout marker is kept');
    for (const title of titles) assert(report.root.html.includes(title), `Actual selected group's title survives: ${title}`);
    assert(!report.root.html.includes('別の追加ページの結果'));
    assert(!report.root.html.includes('最初のページの結果'));
    for (const secret of ['SECRET_PASSWORD', 'SECRET_TEXTAREA', 'SECRET_OPTION', 'SECRET_EDITABLE', 'SECRET_SCRIPT', 'SECRET_EVENT', 'SECRET_CREDENTIAL', 'SECRET_URL_TOKEN', 'SECRET_HASH', 'SECRET_QUERY', 'SECRET_IMAGE_TOKEN', 'SECRET_COOKIE', 'SECRET_STORAGE', 'SECRET_SESSION']) {
      assert(!text.includes(secret), 'Private or executable fixture value must be omitted: ' + secret);
    }
    const mapping = await selected.page.evaluate(report => {
      const doc = new DOMParser().parseFromString(report.root.html, 'text/html');
      return {
        nodes: [...doc.querySelectorAll('[data-capture-node]')].map(node => ({ index: Number(node.getAttribute('data-capture-node')), tag: node.localName,
          parentIndex: node.parentElement?.closest('[data-capture-node]')?.getAttribute('data-capture-node') ?? null })),
        selected: doc.querySelector(`[data-capture-node="${report.selection.index}"]`)?.textContent,
        dangerous: [...doc.querySelectorAll('*')].some(node => /^(?:script|form|input|textarea|select)$/i.test(node.localName) || [...node.attributes].some(attr => /^on/i.test(attr.name) || /^(?:value|srcdoc|data-secret|data-secret-token)$/i.test(attr.name))),
        hrefs: [...doc.querySelectorAll('a[href]')].map(node => node.getAttribute('href')),
        hiddenIndex: Number(doc.querySelector('.hidden-alternative')?.getAttribute('data-capture-node')),
      };
    }, report);
    assert.equal(mapping.dangerous, false, 'Sanitized replay contains no form controls, scripts, event attributes or private token attributes');
    assert(mapping.hrefs.every(href => { const url = new URL(href, 'https://www.google.com'); return !url.search && !url.hash && !url.username && !url.password; }));
    assert(mapping.hrefs.includes('https://rail2.example/timetable'), 'Destination host and path survive URL sanitization');
    const indexed = new Map(report.elements.map(entry => [Number(entry.index), entry]));
    assert.equal(indexed.size, report.elements.length, 'Capture indexes are unique');
    assert.equal(mapping.nodes.length, report.elements.length, 'Every serialized element maps to exactly one geometry/style record');
    for (const node of mapping.nodes) {
      const entry = indexed.get(node.index);
      assert(entry, 'Serialized element index has a matching record');
      assert.equal(entry.tag.toLowerCase(), node.tag);
      assert.equal(entry.parentIndex === null ? null : Number(entry.parentIndex), node.parentIndex === null ? null : Number(node.parentIndex), 'Captured tree indexes preserve real sanitized ancestry');
    }
    assert(mapping.selected?.includes(titles[1]), 'Selected index resolves to the clicked heading in serialized HTML');
    assert.equal(report.styleTable[indexed.get(mapping.hiddenIndex)?.style]?.display, 'none', 'CSS-hidden alternatives remain represented as hidden');
    const chosen = indexed.get(Number(report.selection.index));
    assert(chosen.rect.width > 0 && chosen.rect.height > 0, 'Selected element retains actual rendered geometry');
    assert(report.ancestors.length > 0 && report.ancestors.some(entry => Number.isInteger(entry.style) && report.styleTable[entry.style]), 'Source ancestry carries computed styles');
    assert(report.elements.some(entry => {
      const pseudo = report.styleTable[entry.pseudos?.['::before']];
      return pseudo?.content === '""' && pseudo.height === '2px' && pseudo['background-color'] === 'rgb(210, 220, 230)';
    }), 'Generated separator-like pseudo elements retain actual content, geometry and paint');
    assert(report.styleTable.some(style => style['box-shadow']?.includes('rgb(235, 237, 239)') && style['box-shadow'].includes('1px')), 'Original one-pixel result outlines remain in computed styles');
    assert.deepEqual(report.selection.headings.map(entry => entry.text), titles, 'Visible heading list contains the actual selected page, excluding hidden alternatives');
    assert.equal(after.probe.cookieReads, 0);
    assert.equal(after.probe.clipboard, 0);
    assert(after.probe.storageReads.every(key => key === DONE), 'Only the helper consumption boolean may be read from storage');
    assert(after.probe.storageWrites.every(([key, value]) => key === DONE && value === '1'), 'Storage contains only the consumed boolean');
    assert.deepEqual(selected.requests, [], 'Capturing makes no external requests');
    assert.deepEqual(selected.errors, []);
    passed++; console.log('PASS capture: selected imported page, exact indexed structure, styles/geometry, sanitization and no result mutation/network/clipboard');

    await selected.page.goto('https://www.google.com/search?q=second-tab-check', { waitUntil: 'load' });
    await install(selected);
    assert.equal(await selected.page.locator(UI).count(), 0, 'Consumed helper stays inactive on later navigations');
    passed++; console.log('PASS capture: completed one-use flag suppresses subsequent-page UI');
  } finally { await selected.close(); }

  const fallback = await open('https://www.google.com/search?q=storage-fallback', { localStorageWriteFails: true });
  try {
    await install(fallback);
    await capture(fallback);
    const completed = await fallback.page.evaluate(() => window.__captureProbe);
    assert.deepEqual(completed.storageWrites.map(([key, value, kind]) => ({ key, value, kind })),
      [{ key: DONE, value: '1', kind: 'local' }, { key: DONE, value: '1', kind: 'session' }],
      'A localStorage write failure stores the completed flag in sessionStorage');
    await fallback.page.goto('https://www.google.com/search?q=storage-fallback-next-page', { waitUntil: 'load' });
    await install(fallback);
    assert.equal(await fallback.page.locator(UI).count(), 0, 'A readable but empty localStorage must not conceal the completed sessionStorage flag');
    const resumed = await fallback.page.evaluate(() => window.__captureProbe);
    assert.deepEqual(resumed.storageReadKinds, ['local', 'session'], 'The later page checks both storage locations when localStorage has no flag');
    assert.deepEqual(resumed.storageReads, [DONE, DONE]);
    assert.deepEqual(fallback.errors, []);
    passed++; console.log('PASS capture: sessionStorage completion fallback remains effective when localStorage reads work but writes fail');
  } finally { await fallback.close(); }

  const cancelled = await open();
  try {
    await install(cancelled);
    await cancelled.page.locator('#capture-target').scrollIntoViewIfNeeded();
    await cancelled.page.locator(START).click();
    await cancelled.page.locator(CANCEL).click();
    await cancelled.page.locator('#capture-target').click();
    const state = await cancelled.page.evaluate(() => window.__captureProbe);
    assert.equal(state.clicks.length, 1, 'A result receives normal click handling after cancellation');
    assert.equal(state.clicks[0].prevented, false, 'Collector does not prevent default after cancellation');
    assert.equal(state.storageWrites.length, 0, 'Cancelling does not consume the helper');
    const { report } = await capture(cancelled, '#initial-result h3');
    assert.equal(Number(report.root.pageNumber || 1), 1);
    assert(report.root.html.includes('最初のページの結果'));
    assert(!report.root.html.includes('JR東日本の時刻表') && !report.root.html.includes('別の追加ページの結果'), 'Initial-page capture omits already appended sections');
    assert.deepEqual(cancelled.errors, []);
    passed++; console.log('PASS capture: cancel releases click interception; retry captures the initial page without appended results');
  } finally { await cancelled.close(); }

  for (const url of ['https://example.com/search?q=test', 'https://www.google.com/maps', 'https://www.google.com/search?q=test&udm=50']) {
    const invalid = await open(url);
    try { await install(invalid); assert.equal(await invalid.page.locator(UI).count(), 0, 'No capture UI outside supported Google result pages: ' + url); }
    finally { await invalid.close(); }
  }
  passed++; console.log('PASS capture: unrelated hosts, non-search routes and AI Mode stay untouched');

  const changing = await open();
  try {
    await install(changing);
    await changing.page.locator('#capture-target').scrollIntoViewIfNeeded();
    await changing.page.evaluate(() => {
      const root = document.querySelector('.generic-autopager-page[data-page="2"] .generic-autopager-google-source-root');
      const padding = document.createElement('div'); padding.className = 'mutation-yield-fixture';
      for (let n = 0; n < 300; n++) padding.appendChild(document.createElement('span'));
      root.appendChild(padding);
      const timeout = window.setTimeout.bind(window), originalRect = root.getBoundingClientRect;
      let rootMeasured = false;
      window.__captureMutationOccurred = false;
      root.getBoundingClientRect = function () { rootMeasured = true; return originalRect.call(this); };
      window.setTimeout = (callback, delay, ...args) => {
        if (typeof callback !== 'function') return timeout(callback, delay, ...args);
        return timeout(() => {
          if (delay === 0 && rootMeasured && !window.__captureMutationOccurred &&
              document.getElementById('google-result-capture-status')?.textContent.includes('取得しています')) {
            const added = document.createElement('div'); added.className = 'during-capture-change';
            added.textContent = '取得途中に追加された検索結果'; root.appendChild(added);
            window.__captureMutationOccurred = true;
          }
          callback(...args);
        }, delay);
      };
      window.__restoreCaptureMutation = () => { window.setTimeout = timeout; root.getBoundingClientRect = originalRect; };
    });
    let downloads = 0; changing.page.on('download', () => { downloads++; });
    await changing.page.locator(START).click();
    await changing.page.locator('#capture-target').click();
    await changing.page.waitForFunction(selector => /取得中.*更新/.test(document.querySelector(selector)?.textContent || ''), STATUS, { timeout: 15000 });
    assert.equal(await changing.page.evaluate(() => window.__captureMutationOccurred), true, 'The fixture really changes a captured parent during a yield');
    assert.equal(downloads, 0, 'A changed subtree must not be exported as apparently consistent evidence');
    assert.equal((await changing.page.evaluate(() => window.__captureProbe.storageWrites)).length, 0, 'An inconsistent capture does not consume the helper');
    await changing.page.evaluate(() => { window.__restoreCaptureMutation(); document.querySelector('.during-capture-change').remove(); });
    const { report } = await capture(changing);
    assert.equal(Number(report.root.pageNumber), 2);
    assert.equal(downloads, 1, 'Stable retry produces the only downloaded evidence file');
    assert.deepEqual(changing.errors, []);
    passed++; console.log('PASS capture: a retained-parent change during a yield is rejected explicitly and stable retry remains available');
  } finally { await changing.close(); }

  const oversized = await open();
  try {
    await oversized.page.evaluate(() => {
      const root = document.querySelector('.generic-autopager-page[data-page="2"] .generic-autopager-google-source-root');
      const group = document.createElement('div'); group.className = 'oversized-fixture';
      for (let n = 0; n < 12500; n++) group.appendChild(document.createElement('span'));
      root.appendChild(group);
    });
    await install(oversized);
    let downloads = 0; oversized.page.on('download', () => { downloads++; });
    await oversized.page.locator('#capture-target').scrollIntoViewIfNeeded();
    const before = await snapshot(oversized);
    await oversized.page.locator(START).click();
    await oversized.page.locator('#capture-target').click();
    await oversized.page.waitForFunction(selector => /(?:上限|大き|多すぎ|超え|失敗|取得できません)/.test(document.querySelector(selector)?.textContent || ''), STATUS, { timeout: 30000 });
    assert.equal(downloads, 0, 'Oversized capture does not publish an incomplete file');
    const after = await snapshot(oversized);
    assert.equal(after.html, before.html);
    assert.equal(after.y, before.y);
    assert.equal(after.probe.storageWrites.length, 0, 'Failed capture does not consume the helper');
    await oversized.page.evaluate(() => document.querySelector('.oversized-fixture').remove());
    const { report } = await capture(oversized);
    assert.equal(Number(report.root.pageNumber), 2, 'Retry after an explicit size failure remains available');
    assert.deepEqual(oversized.errors, []);
    passed++; console.log('PASS capture: size limit is explicit, creates no truncated file, and permits a valid retry');
  } finally { await oversized.close(); }

  console.log(`Google result capture helper tests passed: ${passed} browser groups; collector checks only, not a Google/Berry divider fix`);
} finally {
  await browser.close();
  await rm(output, { recursive: true, force: true });
}
