// The gesture/capture contract is tested in jsdom; real touch/rendering is
// separately verified by the Android WebView diagnostic smoke harness.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const source = await readFile(new URL('../src/google-result-diagnostics.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8');
const inspector = await readFile(new URL('../src/google-boundary-inspection.js', import.meta.url), 'utf8');
const hostId = 'generic-google-diagnostics-v659';
const areaId = 'generic-google-diagnostics-text-v659';
const statusId = 'generic-autopager-status-v2';
const tests = [];
const test = (label, fn) => tests.push([label, fn]);

function setup(options = {}) {
  const dom = new JSDOM(`<!doctype html><html><head><style>*{visibility:visible;opacity:1;background:#fff}[hidden]{display:none}</style></head><body>
    <div id="rso"><a href="https://first.example/">Initial restaurant</a></div>
    <section class="generic-autopager-page" data-page="2" data-source-url="https://www.google.com/search?q=SOURCE_QUERY_SENTINEL&start=10#SOURCE_HASH_SENTINEL">
      <div class="generic-autopager-google-source-root"><div class="group">${[1, 2, 3].map(n => `<div class="result" data-result="${n}"><div class="source">${options.actual ? `https://<span>shop${n}</span><span>.example</span>` : `https://shop${n}.example`}</div><a href="https://shop${n}.example/menu?q=LINK_QUERY_SENTINEL#LINK_HASH_SENTINEL"><h3>Restaurant ${n}</h3></a><p>Ordinary restaurant description.</p><input value="INPUT_SENTINEL"><textarea>TEXTAREA_SENTINEL</textarea></div>`).join('')}</div></div>
    </section><button id="${statusId}" type="button">自動 2/30</button></body></html>`, { url: options.url || 'https://www.google.com/search?q=LOCATION_QUERY_SENTINEL#LOCATION_HASH_SENTINEL', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  const clock = FakeTimers.withGlobal(w).install({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  Object.defineProperties(w, { innerWidth: { value: 390, configurable: true }, innerHeight: { value: 844, configurable: true }, scrollY: { value: 500, configurable: true }, devicePixelRatio: { value: 2, configurable: true } });
  const originalStyle = w.getComputedStyle.bind(w);
  w.getComputedStyle = (node, pseudo) => pseudo ? { content: 'none', display: 'none', visibility: 'visible', opacity: '1', getPropertyValue: () => '' } : originalStyle(node);
  w.Element.prototype.getBoundingClientRect = function () {
    if (this.id === 'rso') return { left: 0, right: 390, top: -500, bottom: -50, width: 390, height: 450 };
    const n = Number(this.closest('[data-result]')?.getAttribute('data-result')) || 0;
    let top = n ? 20 + (n - 1) * 180 : 20, height = n ? 180 : 548;
    if (this.closest('.source')) { top += 10; height = 20; }
    else if (this.matches('h3,a')) { top += 45; height = 26; }
    else if (this.matches('p')) { top += 85; height = 50; }
    return { left: 0, right: 390, top, bottom: top + height, width: 390, height };
  };
  w.Element.prototype.getClientRects = function () { const r = this.getBoundingClientRect(); return r.width && r.height ? [r] : []; };
  let inspections = 0, repairs = 0, network = 0, taps = 0, copies = 0;
  const repairResult = { preserved: true };
  const repair = options.repair || function () { repairs++; return repairResult; };
  w.repairGenericGoogleResultBoundariesV658 = repair;
  if (options.actual) w.eval(layout + '\n' + inspector);
  const actualInspector = options.actual && w.inspectGenericGoogleResultBoundariesV659;
  w.inspectGenericGoogleResultBoundariesV659 = page => {
    inspections++;
    return options.inspection ? options.inspection(page) : actualInspector ? actualInspector(page) : { schema: 'google-boundary-inspection/v659', status: 'ok', counts: { sources: 3, records: 3 } };
  };
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) w[name] = function () { network++; throw new Error('Unexpected network'); };
  Object.defineProperty(w.navigator, 'sendBeacon', { value: () => { network++; return false; } });
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async text => { copies++; assert.equal(text, d.getElementById(areaId)?.value); } }, configurable: true });
  w.MutationObserver = class { constructor() { throw new Error('No observer is needed'); } };
  w.setInterval = () => { throw new Error('No polling is allowed'); };
  for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(w, name, { get() { throw new Error('No storage is allowed'); } });
  Object.defineProperty(d, 'cookie', { get() { throw new Error('No cookies are allowed'); } });
  const status = d.getElementById(statusId), page = d.querySelector('.generic-autopager-page');
  status.addEventListener('click', () => taps++);
  let startupQueries = 0;
  const restoreQueries = ['querySelector', 'querySelectorAll', 'getElementById'].map(name => {
    const original = d[name];
    d[name] = function (...args) { startupQueries++; return original.apply(this, args); };
    return () => { d[name] = original; };
  });
  w.eval(source);
  w.installGenericGoogleResultDiagnosticsV659('6.59.0');
  restoreQueries.forEach(restore => restore());
  assert.equal(startupQueries, 0, 'Installation must not scan the DOM');
  assert.equal(clock.countTimers(), 0, 'Installation must not schedule work');
  const emit = (type, target = status, extra = {}) => {
    const event = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 350, clientY: 800, button: 0, detail: 1, ...extra });
    target.dispatchEvent(event);
    return event;
  };
  const open = () => { emit('pointerdown'); clock.tick(900); emit('pointerup'); emit('click'); return d.getElementById(hostId); };
  const report = () => JSON.parse(d.getElementById(areaId).value);
  const cleanup = () => { clock.uninstall(); dom.window.close(); };
  return { w, d, clock, status, page, emit, open, report, cleanup, repairResult,
    counts: () => ({ inspections, repairs, network, taps, copies }) };
}

test('installation is idle; ordinary taps retain their existing action', () => {
  const s = setup();
  try {
    s.emit('pointerdown'); s.clock.tick(899); s.emit('pointerup'); s.emit('click'); s.clock.tick(1000);
    assert.equal(s.d.getElementById(hostId), null);
    assert.deepEqual(s.counts(), { inspections: 0, repairs: 0, network: 0, taps: 1, copies: 0 });
  } finally { s.cleanup(); }
});

test('long press captures once; resulting click is consumed; closing preserves results and scroll', () => {
  const s = setup();
  try {
    const before = s.page.outerHTML, scroll = s.w.scrollY;
    assert(s.open());
    const area = s.d.getElementById(areaId), report = s.report();
    assert(area.readOnly);
    assert.equal(s.d.getElementById(hostId).getAttribute('role'), 'dialog');
    assert.equal(report.userscriptVersion, '6.59.0');
    assert.equal(report.pager.selectedPage, 2);
    assert.deepEqual(report.pager.source, { origin: 'https://www.google.com', path: '/search', start: 10 });
    assert.equal(report.environment.viewport.width, 390);
    assert.equal(report.environment.viewport.scrollY, scroll);
    assert.deepEqual(s.counts(), { inspections: 1, repairs: 0, network: 0, taps: 0, copies: 0 });
    assert.equal(s.page.outerHTML, before);
    s.emit('click', s.d.getElementById('generic-google-diagnostics-close-v659'));
    assert.equal(s.d.getElementById(hostId), null);
    assert.equal(s.page.outerHTML, before);
    assert.equal(s.w.scrollY, scroll);
    s.emit('pointerdown'); s.emit('pointerup'); s.emit('click');
    assert.equal(s.counts().taps, 1, 'A later ordinary tap is unaffected');
  } finally { s.cleanup(); }
});

test('move, release, cancellation and non-Google routes do not capture', () => {
  for (const cancel of ['pointermove', 'pointerup', 'pointercancel']) {
    const s = setup();
    try {
      s.emit('pointerdown'); s.clock.tick(500); s.emit(cancel, s.status, { clientX: 370 }); s.clock.tick(1000);
      assert.equal(s.counts().inspections, 0, cancel);
    } finally { s.cleanup(); }
  }
  for (const url of ['https://example.com/search', 'https://www.google.com/maps']) {
    const s = setup({ url });
    try { assert.equal(s.open(), null); assert.equal(s.counts().inspections, 0); assert.equal(s.counts().taps, 1); }
    finally { s.cleanup(); }
  }
});

test('context menu fallback captures once and does not duplicate the timer', () => {
  const s = setup();
  try {
    s.emit('pointerdown'); s.clock.tick(500);
    assert.equal(s.emit('contextmenu').defaultPrevented, true);
    s.clock.tick(1000); s.emit('pointerup'); s.emit('click');
    assert.equal(s.counts().inspections, 1);
    assert.equal(s.counts().taps, 0);
  } finally { s.cleanup(); }
});

test('copy is explicit; unavailable clipboard falls back to selected text', async () => {
  const s = setup();
  try {
    s.open(); assert.equal(s.counts().copies, 0);
    s.emit('click', s.d.getElementById('generic-google-diagnostics-copy-v659'));
    await Promise.resolve();
    assert.equal(s.counts().copies, 1);
    Object.defineProperty(s.w.navigator, 'clipboard', { value: undefined });
    s.d.execCommand = command => { assert.equal(command, 'copy'); return false; };
    s.emit('click', s.d.getElementById('generic-google-diagnostics-copy-v659'));
    const area = s.d.getElementById(areaId);
    assert.equal(area.selectionStart, 0); assert.equal(area.selectionEnd, area.value.length);
    assert.match(s.d.getElementById('generic-google-diagnostics-feedback-v659').textContent, /長押ししてコピー/);
    assert.equal(s.counts().network, 0);
  } finally { s.cleanup(); }
});

test('JSON save uses a local Blob only after the explicit button click', () => {
  const s = setup();
  try {
    let made = 0, revoked = 0, clicked = 0;
    s.w.URL.createObjectURL = blob => { made++; assert.equal(blob.type, 'application/json;charset=utf-8'); return 'blob:local-test'; };
    s.w.URL.revokeObjectURL = url => { revoked++; assert.equal(url, 'blob:local-test'); };
    s.w.HTMLAnchorElement.prototype.click = function () { clicked++; assert.equal(this.getAttribute('href'), 'blob:local-test'); assert.equal(this.download, 'autopager-google-v6.59.0-diagnostics.json'); };
    s.open(); assert.equal(made, 0);
    s.emit('click', s.d.getElementById('generic-google-diagnostics-save-v659'));
    assert.equal(made, 1); assert.equal(clicked, 1); s.clock.tick(1500); assert.equal(revoked, 1);
    assert.equal(s.counts().network, 0);
  } finally { s.cleanup(); }
});

test('repair wrapper preserves invocation, this, arguments, return and thrown error identity', () => {
  const seen = [], result = {}, failure = new Error('original failure');
  const s = setup({ repair: function (...args) { seen.push({ self: this, args }); if (args[1] === 'throw') throw failure; return result; } });
  try {
    const receiver = {};
    for (let n = 0; n < 7; n++) { assert.equal(s.w.repairGenericGoogleResultBoundariesV658.call(receiver, s.page, n), result); s.clock.tick(5); }
    assert.throws(() => s.w.repairGenericGoogleResultBoundariesV658.call(receiver, s.page, 'throw'), error => error === failure);
    assert.equal(seen.length, 8); assert(seen.every(call => call.self === receiver && call.args[0] === s.page));
    s.open();
    const history = s.report().runtime.selectedPageRepairCalls;
    assert.equal(history.calls, 8); assert.equal(history.recent.length, 6);
    assert.equal(history.recent.at(-1).outcome, 'threw');
    assert(history.recent.every(call => call.connected && call.sourceRootPresent));
    assert.equal(seen.length, 8, 'Opening diagnostics must not invoke the repair');
  } finally { s.cleanup(); }
});

test('unavailable metrics cannot change the original repair or prevent a report', () => {
  const s = setup();
  try {
    s.page.querySelector = () => { throw new Error('metric unavailable'); };
    assert.equal(s.w.repairGenericGoogleResultBoundariesV658(s.page), s.repairResult);
    assert.equal(s.counts().repairs, 1);
    assert(s.open()); assert.equal(s.report().runtime.selectedPageRepairCalls.calls, 0);
  } finally { s.cleanup(); }
});

test('oversized and circular inspector data produce bounded valid JSON', () => {
  const circular = {}; circular.loop = circular;
  for (const [value, status] of [[{ text: '診断'.repeat(100000) }, 'inspection-too-large'], [circular, 'unserializable-inspection']]) {
    const s = setup({ inspection: () => value });
    try {
      assert(s.open()); assert.equal(s.report().inspection.status, status);
      assert(Buffer.byteLength(s.d.getElementById(areaId).value, 'utf8') <= 200000);
    } finally { s.cleanup(); }
  }
});

test('large bounded inspection is retained in compact form when pretty printing exceeds the limit', () => {
  const value = { status: 'ok', counts: { sources: 3 }, nearby: { structure: Array.from({ length: 1000 }, (_, n) => ({ id: String(n), style: { display: 'block', visibility: 'visible', opacity: '1' }, rect: { x: 0, y: 0, width: 390, height: 20 } })) } };
  assert(Buffer.byteLength(JSON.stringify(value)) < 140000);
  assert(Buffer.byteLength(JSON.stringify(value, null, 2)) > 200000);
  const s = setup({ inspection: () => value });
  try {
    assert(s.open());
    const report = s.report();
    assert.equal(report.inspection.status, 'ok');
    assert.equal(report.inspection.counts.sources, 3);
    assert.equal(report.inspection.nearby.structure.length, 1000);
    assert(Buffer.byteLength(s.d.getElementById(areaId).value, 'utf8') <= 200000);
  } finally { s.cleanup(); }
});

test('oversized source metadata is bounded independently of inspector output', () => {
  const s = setup();
  try {
    s.page.setAttribute('data-source-url', 'https://www.google.com/' + 'x'.repeat(210000) + '?q=SOURCE_QUERY_SENTINEL#SOURCE_HASH_SENTINEL');
    assert(s.open());
    assert.equal(s.report().pager.source.path.length, 2048);
    assert(Buffer.byteLength(s.d.getElementById(areaId).value, 'utf8') <= 200000);
  } finally { s.cleanup(); }
});

test('actual source-parser blind spot remains visible in read-only evidence, with URL/form secrets omitted', () => {
  const s = setup({ actual: true });
  try {
    const before = s.page.outerHTML;
    assert(s.open());
    const report = s.report(), text = s.d.getElementById(areaId).value;
    assert.equal(report.inspection.counts.sources, 0);
    assert(report.inspection.nearby.sources.some(item => item.observations.includes('source-nonleaf')));
    assert(report.inspection.nearby.structure.some(item => item.text === '.example'));
    for (const secret of ['QUERY_SENTINEL', 'HASH_SENTINEL', 'INPUT_SENTINEL', 'TEXTAREA_SENTINEL']) assert(!text.includes(secret), 'Omit ' + secret);
    assert.equal(s.page.outerHTML, before);
    assert.equal(s.counts().network, 0);
    assert(Buffer.byteLength(text, 'utf8') <= 200000);
  } finally { s.cleanup(); }
});

for (const [label, fn] of tests) {
  await fn();
  console.log('PASS ' + label);
}
console.log(`PASS Google diagnostic UI: ${tests.length} tests; idle installation, explicit export, gesture behavior, unchanged repair delegation and bounded private evidence`);
