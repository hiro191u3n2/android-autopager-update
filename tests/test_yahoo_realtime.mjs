/**
 * Deterministic, offline jsdom tests of the unmodified Yahoo runtime.
 * Real DOM selectors, MutationObserver and event propagation; geometry and time
 * are controlled fixtures. This is NOT an Android, AdGuard, React or live-browser
 * end-to-end test. No network request or image upload is performed.
 *
 * Dependencies: jsdom@26.1.0, @sinonjs/fake-timers@15.0.0. They may be installed
 * normally or in a temporary prefix supplied as REALTIME_TEST_NODE_MODULES.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const depPaths = [process.env.REALTIME_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { JSDOM, VirtualConsole } = require(require.resolve('jsdom', { paths: depPaths }));
const FakeTimers = require(require.resolve('@sinonjs/fake-timers', { paths: depPaths }));
const source = readFileSync(resolve(ROOT, 'src/yahoo-realtime-autopager.js'), 'utf8');
const BASE = 'https://search.yahoo.co.jp/realtime/search?p=%E3%83%87%E3%82%A3%E3%82%BA%E3%83%8B%E3%83%BC%20%E3%83%81%E3%82%B1%E3%83%83%E3%83%88';
const passed = [];
const post = id => `<div class="Tweet_Tweet__fixture"><a class="Tweet_overallLink__fixture" href="/realtime/search/tweet/${id}">投稿 ${id}</a></div>`;
// Yahoo's inspected More anchor has no href; the site's event handler owns it.
const moreHTML = '<div class="More_More__fixture"><a data-cl-params="_cl_link:more;">もっと見る</a></div>';
const fixtureHTML = ids => `<!doctype html><html><body><input id="search-input"><main><div id="sr">${ids.map(post).join('')}${moreHTML}</div></main></body></html>`;

async function setup(options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(options.html || fixtureHTML(options.ids || [101, 102, 103]), {
    url: options.url || BASE, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const w = dom.window, d = w.document;
  const clock = FakeTimers.withGlobal(w).install({ now: 1_800_000_000_000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  let y = options.scrollY || 0, hidden = false, online = true, position = 2000, clicks = 0;
  let clickHook = null;
  Object.defineProperty(w, 'scrollY', { configurable: true, get: () => y });
  Object.defineProperty(w, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(d.documentElement, 'clientWidth', { configurable: true, value: 412 });
  Object.defineProperty(d, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(d, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => online });
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    let concealed = false;
    for (let el = this; el; el = el.parentElement) {
      const style = w.getComputedStyle(el);
      if (el.hidden || style.display === 'none') concealed = true;
    }
    const top = Number(this.dataset.top ?? position) - y;
    const width = concealed ? 0 : 300, height = concealed ? 0 : 44;
    return { x: 0, y: top, left: 0, right: width, top, bottom: top + height, width, height, toJSON() { return this; } };
  };
  // This is the page's native click listener, not a replacement .click() method.
  d.addEventListener('click', event => {
    const a = event.target.closest?.('a[data-cl-params*="_cl_link:more;"]');
    if (!a) return;
    event.preventDefault();
    if (a.parentElement?.parentElement?.id !== 'sr') return;
    clicks++;
    clickHook?.(event, a);
  });
  const api = {
    dom, w, d, clock, errors,
    get root() { return d.getElementById('sr'); },
    get more() { return this.root?.querySelector(':scope > [class*="More_More__"] > a'); },
    get clicks() { return clicks; },
    get diag() { return w.__genericYahooRealtimeAutoPagerDiagnostics?.(); },
    set position(value) { position = value; },
    set hook(value) { clickHook = value; },
    async advance(ms = 64) {
      // Let jsdom deliver microtask-based MutationObserver callbacks around time.
      await Promise.resolve();
      await clock.tickAsync(ms);
      await Promise.resolve();
    },
    dispatch(type, properties = {}, target = w) {
      const event = new w.Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { configurable: true, value });
      target.dispatchEvent(event);
      return event;
    },
    async scroll(to, gesture = true) {
      if (gesture) this.dispatch('wheel', { deltaY: to - y });
      y = to;
      this.dispatch('scroll');
      await this.advance();
    },
    append(ids) {
      const marker = this.root.querySelector(':scope > [class*="More_More__"]') || null;
      for (const id of ids) {
        const template = d.createElement('template'); template.innerHTML = post(id);
        this.root.insertBefore(template.content.firstElementChild, marker);
      }
    },
    prepend(ids) {
      this.root.insertAdjacentHTML('afterbegin', ids.map(post).join(''));
    },
    loading(on) {
      this.root.querySelector(':scope > .Loading_Loading__fixture')?.remove();
      if (on) this.root.insertAdjacentHTML('beforeend', '<p class="Loading_Loading__fixture">読み込み中</p>');
    },
    fail(kind = 'LoadingError_LoadingError__fixture') {
      this.root.insertAdjacentHTML('beforeend', `<div class="${kind}">読み込みエラー</div>`);
    },
    async hidden(value) { hidden = value; this.dispatch('visibilitychange', {}, d); await this.advance(); },
    async online(value) { online = value; this.dispatch(value ? 'online' : 'offline'); await this.advance(); },
    async start() { w.eval(source); await this.advance(); },
    close() { clock.uninstall(); dom.window.close(); },
  };
  if (options.iframe) Object.defineProperty(w, 'self', { configurable: true, value: {} });
  if (!options.deferStart) await api.start();
  return api;
}

async function test(name, run, options) {
  const f = await setup(options);
  try {
    await run(f);
    assert.equal(f.errors.length, 0, `Unexpected jsdom errors: ${f.errors.map(String).join('; ')}`);
    passed.push(name);
    console.log(`PASS ${name}`);
  } finally { f.close(); }
}

await test('No initial click, restored-scroll click, or scroll-to-bottom on initialization', async f => {
  assert.equal(f.clicks, 0);
  await f.advance(15000);
  assert.equal(f.clicks, 0);
}, { scrollY: 1500 });

await test('Downward user intent plus a near-bottom scroll invokes the native click once', async f => {
  let observed = null;
  f.hook = (event, element) => { observed = { element, bubbles: event.bubbles, target: event.target }; f.loading(true); };
  await f.scroll(900);
  assert.equal(f.clicks, 1);
  assert.equal(observed.element, f.more);
  assert.equal(observed.target, f.more);
  assert.equal(observed.bubbles, true);
  assert.equal(f.diag.inFlight, true);
});

await test('The prefetch threshold is 600 px beyond the viewport, not the whole page', async f => {
  await f.scroll(599);
  assert.equal(f.clicks, 0);
  await f.scroll(600);
  assert.equal(f.clicks, 1);
});

await test('Programmatic scrolling without recent user intent does not click', async f => {
  await f.scroll(900, false);
  assert.equal(f.clicks, 0);
});

await test('Upward wheel and upward scrolling do not arm automatic loading', async f => {
  await f.scroll(1200, false);
  await f.scroll(900);
  assert.equal(f.clicks, 0);
});

await test('Expired wheel intent does not authorize later programmatic scrolling', async f => {
  f.dispatch('wheel', { deltaY: 100 });
  await f.advance(2300);
  await f.scroll(900, false);
  assert.equal(f.clicks, 0);
});

await test('Single-finger upward swipe plus downward scroll loads more', async f => {
  f.dispatch('touchstart', { touches: [{ clientY: 600 }] });
  f.dispatch('touchmove', { touches: [{ clientY: 300 }] });
  await f.scroll(900, false);
  assert.equal(f.clicks, 1);
});

await test('Multitouch gestures do not authorize more loading', async f => {
  f.dispatch('touchstart', { touches: [{ clientY: 600 }, { clientY: 500 }] });
  f.dispatch('touchmove', { touches: [{ clientY: 300 }, { clientY: 200 }] });
  await f.scroll(900, false);
  assert.equal(f.clicks, 0);
});

await test('PageDown plus scrolling loads more, but typing in the search field does not', async f => {
  f.dispatch('keydown', { key: 'PageDown' }, f.d.getElementById('search-input'));
  await f.scroll(800, false);
  assert.equal(f.clicks, 0);
  f.dispatch('keydown', { key: 'PageDown' }, f.d.body);
  await f.scroll(900, false);
  assert.equal(f.clicks, 1);
});

await test('Modified keyboard shortcuts and editable regions do not authorize loading', async f => {
  f.dispatch('keydown', { key: 'End', ctrlKey: true }, f.d.body);
  await f.scroll(800, false);
  const editable = f.d.createElement('div'); editable.contentEditable = 'true'; editable.setAttribute('contenteditable', 'true'); f.d.body.append(editable);
  f.dispatch('keydown', { key: ' ' }, editable);
  await f.scroll(900, false);
  assert.equal(f.clicks, 0);
});

await test('Desktop scrollbar drag authorizes a downward scroll', async f => {
  f.dispatch('pointerdown', { pointerType: 'mouse', clientX: 411 });
  await f.scroll(900, false);
  assert.equal(f.clicks, 1);
  f.dispatch('pointerup');
});

await test('Ordinary pointer clicks away from the scrollbar do not arm scrolling', async f => {
  f.dispatch('pointerdown', { pointerType: 'mouse', clientX: 100 });
  await f.scroll(900, false);
  assert.equal(f.clicks, 0);
});

await test('Repeated scrolling while Yahoo displays its spinner never sends a second click', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  for (let i = 1; i <= 20; i++) await f.scroll(900 + i * 2);
  await f.advance(30000);
  assert.equal(f.clicks, 1);
  assert.equal(f.diag.inFlight, true);
  assert.equal(f.diag.loading, true);
});

await test('A request started by Yahoo itself is respected before any automatic click', async f => {
  f.loading(true); await f.advance();
  await f.scroll(900);
  assert.equal(f.clicks, 0);
  f.append([104, 105]); f.loading(false); f.position = 4000; await f.advance();
  assert.equal(f.clicks, 0);
  await f.scroll(2700);
  assert.equal(f.clicks, 1);
});

await test('Appending older posts allows the next page only when the user reaches it', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  f.append([104, 105]); f.position = 4000; f.loading(false); await f.advance();
  assert.equal(f.diag.inFlight, false);
  assert.equal(f.diag.tail, '105');
  assert.equal(f.clicks, 1);
  await f.advance(15000);
  assert.equal(f.clicks, 1);
  await f.scroll(2700);
  assert.equal(f.clicks, 2);
});

await test('New tweets prepended above the existing tail do not count as older-page success', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  f.prepend([999]); f.loading(false); await f.advance(3000);
  assert.equal(f.diag.tail, '103');
  assert.equal(f.diag.blocked, true);
  assert.equal(f.clicks, 1);
});

await test('A replacement list that removes the old tail disarms and is not false progress', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  f.root.innerHTML = [201, 202, 203].map(post).join('') + moreHTML;
  await f.advance(15000);
  assert.equal(f.clicks, 1);
  assert.equal(f.diag.inFlight, false);
  assert.equal(f.diag.armed, false);
  await f.scroll(1000);
  assert.equal(f.clicks, 2);
});

await test('Unchanged response without a spinner gets one bounded retry, never an endless loop', async f => {
  await f.scroll(900);
  await f.advance(120000);
  assert.equal(f.clicks, 2);
  assert.equal(f.diag.blocked, true);
  assert.equal(f.clock.countTimers(), 0);
  await f.scroll(1000);
  await f.advance(120000);
  assert.equal(f.clicks, 2);
});

await test('Spinner completion without additional posts never automatically retries', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  f.loading(false); await f.advance(120000);
  assert.equal(f.clicks, 1);
  assert.equal(f.diag.blocked, true);
  assert.equal(f.clock.countTimers(), 0);
});

await test('Load-more removed at the final page causes no request or timer spin', async f => {
  f.hook = () => f.loading(true);
  await f.scroll(900);
  f.append([104]); f.more.parentElement.remove(); f.loading(false); await f.advance();
  await f.scroll(1000); await f.advance(120000);
  assert.equal(f.clicks, 1);
  assert.equal(f.diag.more, false);
  assert.equal(f.clock.countTimers(), 0);
});

for (const error of ['LoadingError_LoadingError__fixture', 'Timeline_LoadingError__fixture']) {
  await test(`Yahoo ${error} remains manual and blocks automatic retry`, async f => {
    f.hook = () => f.loading(true);
    await f.scroll(900);
    f.loading(false); f.fail(error); await f.advance(120000);
    await f.scroll(1000);
    assert.equal(f.clicks, 1);
    assert.equal(f.diag.blocked, true);
  });
}

await test('Yahoo resc reload links are never clicked automatically', async f => {
  let retryClicks = 0;
  f.root.insertAdjacentHTML('beforeend', '<a id="reload" href="#" data-cl-params="_cl_link:resc;">再読み込み</a>');
  f.d.getElementById('reload').addEventListener('click', event => { event.preventDefault(); retryClicks++; });
  await f.advance(); await f.scroll(900); await f.advance(120000);
  assert.equal(f.clicks, 0); assert.equal(retryClicks, 0);
});

await test('Manual native click is neither cancelled nor duplicated by an adjacent scroll', async f => {
  let manualDelivered = 0;
  f.more.addEventListener('click', event => { assert.equal(event.defaultPrevented, false); manualDelivered++; });
  f.more.click();
  await f.scroll(900); await f.advance(120000);
  assert.equal(manualDelivered, 1);
  assert.equal(f.clicks, 1);
});

await test('Manual retry remains available after automatic no-progress attempts are exhausted', async f => {
  await f.scroll(900); await f.advance(120000);
  assert.equal(f.clicks, 2);
  f.more.click();
  f.append([104]); await f.advance();
  assert.equal(f.clicks, 3);
  assert.equal(f.diag.blocked, false);
});

await test('Manual click during an automatic no-op flight disables the scheduled automatic retry', async f => {
  await f.scroll(900);
  await f.advance(1500);
  f.more.click();
  await f.advance(120000);
  assert.equal(f.clicks, 2);
  assert.equal(f.diag.blocked, true);
  assert.equal(f.clock.countTimers(), 0);
});

for (const state of ['hidden', 'disabled', 'aria-disabled', 'aria-busy', 'aria-hidden', 'display-none', 'visibility-hidden']) {
  await test(`A ${state} control is not clicked`, async f => {
    if (state === 'display-none') f.more.style.display = 'none';
    else if (state === 'visibility-hidden') f.more.style.visibility = 'hidden';
    else f.more.setAttribute(state, state.startsWith('aria-') ? 'true' : '');
    await f.advance(); await f.scroll(900);
    assert.equal(f.clicks, 0);
  });
}

await test('A hidden or disabled ancestor also blocks automatic activation', async f => {
  f.more.parentElement.setAttribute('aria-disabled', 'true'); await f.advance();
  await f.scroll(900); assert.equal(f.clicks, 0);
});

await test('Controls already above the viewport are not clicked', async f => {
  await f.scroll(2100);
  assert.equal(f.clicks, 0);
});

await test('Background tabs do not click, and foreground requires fresh scrolling', async f => {
  await f.hidden(true); await f.scroll(900); await f.advance(120000);
  assert.equal(f.clicks, 0);
  await f.hidden(false); await f.advance(15000);
  assert.equal(f.clicks, 0);
  await f.scroll(1000); assert.equal(f.clicks, 1);
});

await test('Offline state does not click, and reconnection requires fresh scrolling', async f => {
  await f.online(false); await f.scroll(900); await f.advance(120000);
  assert.equal(f.clicks, 0);
  await f.online(true); await f.advance(15000);
  assert.equal(f.clicks, 0);
  await f.scroll(1000); assert.equal(f.clicks, 1);
});

await test('BFCache pagehide cancels scheduling and pageshow requires fresh scrolling', async f => {
  f.dispatch('pagehide', { persisted: true });
  await f.scroll(900); await f.advance(120000);
  assert.equal(f.clicks, 0);
  assert.equal(f.clock.countTimers(), 0);
  f.dispatch('pageshow', { persisted: true }); await f.advance();
  assert.equal(f.clicks, 0);
  await f.scroll(1000); assert.equal(f.clicks, 1);
});

for (const pause of ['hidden', 'offline', 'pagehide']) {
  await test(`An expired automatic no-op flight cannot retry after ${pause} and resume`, async f => {
    await f.scroll(900); assert.equal(f.clicks, 1);
    if (pause === 'hidden') await f.hidden(true);
    else if (pause === 'offline') await f.online(false);
    else f.dispatch('pagehide', { persisted: true });
    await f.advance(15000);
    if (pause === 'hidden') await f.hidden(false);
    else if (pause === 'offline') await f.online(true);
    else f.dispatch('pageshow', { persisted: true });
    await f.advance(120000);
    assert.equal(f.clicks, 1);
    assert.equal(f.clock.countTimers(), 0);
  });
}

await test('A remounted sr root is rebound without clicking until another downward scroll', async f => {
  const next = f.d.createElement('div'); next.id = 'sr'; next.innerHTML = [201, 202].map(post).join('') + moreHTML;
  f.root.replaceWith(next); await f.advance();
  assert.equal(f.clicks, 0); assert.equal(f.diag.tail, '202');
  await f.scroll(900); assert.equal(f.clicks, 1);
});

await test('A late-rendered sr root is discovered with exact native selector matching', async f => {
  f.d.body.insertAdjacentHTML('beforeend', `<div id="sr">${[101, 102].map(post).join('')}${moreHTML}</div>`);
  await f.advance(); await f.scroll(900);
  assert.equal(f.clicks, 1);
}, { html: '<!doctype html><html><body><main>検索準備中</main></body></html>' });

await test('A changed search query clears old in-flight state and requires new intent', async f => {
  await f.scroll(900); assert.equal(f.clicks, 1);
  f.w.history.pushState({}, '', '/realtime/search?p=changed');
  f.root.innerHTML = [201, 202].map(post).join('') + moreHTML;
  await f.advance(15000);
  assert.equal(f.clicks, 1); assert.match(f.diag.route, /p=changed$/);
  await f.scroll(1000); assert.equal(f.clicks, 2);
});

await test('popstate never immediately reactivates load-more from saved scrolling intent', async f => {
  f.dispatch('wheel', { deltaY: 100 });
  f.w.history.pushState({}, '', '/realtime/search?p=back');
  f.dispatch('popstate'); await f.advance();
  await f.scroll(900, false); assert.equal(f.clicks, 0);
  await f.scroll(1000); assert.equal(f.clicks, 1);
});

await test('popstate during an automatic no-op flight revokes its future retry', async f => {
  await f.scroll(900);
  f.dispatch('popstate');
  await f.advance(120000);
  assert.equal(f.clicks, 1);
  assert.equal(f.clock.countTimers(), 0);
});

await test('An SPA navigation outside the supported route pauses the adapter', async f => {
  f.w.history.pushState({}, '', '/search?p=other');
  await f.scroll(900); await f.advance(15000);
  assert.equal(f.clicks, 0); assert.equal(f.diag.paused, true);
});

await test('Unrelated More links outside sr or nested inside tweets are never clicked', async f => {
  f.more.parentElement.remove();
  f.root.querySelector('.Tweet_Tweet__fixture').insertAdjacentHTML('beforeend', moreHTML);
  f.d.body.insertAdjacentHTML('beforeend', moreHTML);
  let otherClicks = 0;
  for (const a of f.d.querySelectorAll('a[data-cl-params]')) a.addEventListener('click', event => { event.preventDefault(); otherClicks++; });
  await f.advance(); await f.scroll(900); await f.advance(15000);
  assert.equal(otherClicks, 0); assert.equal(f.clicks, 0);
});

await test('A matching-looking label without Yahoo more telemetry marker is ignored', async f => {
  f.more.removeAttribute('data-cl-params');
  await f.advance(); await f.scroll(900);
  assert.equal(f.clicks, 0);
});

await test('No-result pages cannot activate a More control without valid tweet IDs', async f => {
  await f.scroll(900); await f.advance(15000); assert.equal(f.clicks, 0);
}, { ids: [] });

for (const url of ['https://example.com/realtime/search?p=x', 'https://search.yahoo.co.jp/search?p=x', 'https://search.yahoo.co.jp/realtime/search/tweet/123', 'https://search.yahoo.co.jp/realtime/searching?p=x']) {
  await test(`Scope guard excludes ${new URL(url).hostname}${new URL(url).pathname}`, async f => {
    await f.scroll(900); assert.equal(f.clicks, 0); assert.equal(f.diag, undefined);
  }, { url });
}

await test('Subframes are excluded', async f => {
  await f.scroll(900); assert.equal(f.clicks, 0); assert.equal(f.diag, undefined);
}, { iframe: true });

await test('Repeated injection remains a singleton and does not duplicate native requests', async f => {
  f.w.eval(source); await f.advance();
  f.hook = () => f.loading(true);
  await f.scroll(900); assert.equal(f.clicks, 1);
});

// Optional snapshots must be previously fetched public HTML, not network-loaded
// pages. Their scripts and resources are never run or fetched by these tests.
if (process.env.REALTIME_LIVE_FIXTURES) {
  for (const variant of ['mobile', 'desktop']) {
    const html = readFileSync(resolve(process.env.REALTIME_LIVE_FIXTURES, `${variant}.html`), 'utf8');
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, { url: BASE, virtualConsole });
    try {
      const root = dom.window.document.getElementById('sr');
      assert.ok(root, `${variant} public HTML contains #sr`);
      const more = root.querySelector(':scope > [class*="More_More__"] > a[data-cl-params*="_cl_link:more;"]');
      assert.ok(more, `${variant} public HTML matches exact native More selector`);
      assert.equal(more.textContent.trim(), 'もっと見る');
      const links = [...root.querySelectorAll('a[class*="Tweet_overallLink__"][href*="/realtime/search/tweet/"]')];
      assert.ok(links.length > 0, `${variant} public HTML has recognizable tweet links`);
      assert.ok(links.every(a => /\/tweet\/\d+(?:[/?#]|$)/.test(a.getAttribute('href'))), `${variant} IDs match runtime extraction`);
      const name = `Saved public ${variant} HTML matches exact root, native More, and ${links.length} tweet-link selectors`;
      passed.push(name); console.log(`PASS ${name}`);
    } finally { dom.window.close(); }
  }
}

assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|GM_xmlhttpRequest)\s*\(/, 'Runtime must not invent its own network path');
assert.doesNotMatch(source, /(?:preventDefault|stopPropagation|stopImmediatePropagation)\s*\(/, 'Runtime must preserve native user events');
passed.push('Static contract: no direct network requests and no user-event cancellation');
console.log(JSON.stringify({ kind: 'offline jsdom DOM/event fixtures with mocked geometry and clock; NOT live site/Android/AdGuard', passed: passed.length, tests: passed }, null, 2));
