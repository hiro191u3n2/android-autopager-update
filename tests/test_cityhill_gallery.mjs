import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const source = await readFile(new URL('../src/cityhill-gallery-compat.js', import.meta.url), 'utf8');
// Live 2026-10-16 evidence: CITYHILL item 945932 uses Swiper 11.2.10.
// Its thumbs module listens to internal `tap`; DOM click merely runs click
// prevention. Evaluating the actual vendor and item.js against the actual
// gallery DOM in jsdom (412px bounded geometry) showed pointerdown/up works,
// click-only and touchstart/end-only do not, identically with/without v6.45.
// These regressions model only its public API: this is not an Android test.
const html = '<section id="imageArea"><div class="swiper mainSlider"><ul class="swiper-wrapper">' +
  '<li class="swiper-slide"><img loading="lazy" src="a.jpg"></li>'.repeat(3) +
  '</ul></div><div class="swiper thumnailSlider"><ul class="colorList swiper-wrapper">' +
  '<li class="swiper-slide"><p class="image"><img loading="lazy" src="t.jpg"></p></li>'.repeat(3) +
  '</ul></div></section>';
let passed = 0;
function fixture(url = 'https://store.cityhill.co.jp/item/945932.html?cc=01', instance = true) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, listeners = new Map();
  const clock = FakeTimers.withGlobal(w).install({ now: 1000, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  const add = w.document.addEventListener.bind(w.document);
  w.document.addEventListener = (type, fn, options) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
    add(type, fn, options);
  };
  const mainEl = w.document.querySelector('.mainSlider'), thumbEl = w.document.querySelector('.thumnailSlider');
  const thumb = { el: thumbEl, enabled: true, destroyed: false };
  const calls = [];
  const main = { realIndex: 0, slides: [...mainEl.querySelectorAll('.swiper-slide')], enabled: true,
    destroyed: false, params: { loop: true }, thumbs: { swiper: thumb },
    slideToLoop(index) { calls.push(['loop', index]); this.realIndex = index; },
    slideTo(index) { calls.push(['plain', index]); this.realIndex = index; } };
  if (instance) { mainEl.swiper = main; thumbEl.swiper = thumb; }
  w.unsafeWindow = w;
  w.eval(source);
  const imgs = [...thumbEl.querySelectorAll('img')];
  const before = w.document.body.innerHTML;
  function fire(type, extra = {}) {
    const e = { type, target: imgs[2], isTrusted: true, defaultPrevented: false,
      button: 0, pointerId: 1, isPrimary: true, clientX: 100, clientY: 100, ...extra };
    for (const fn of listeners.get(type) || []) fn(e);
  }
  const touch = (type, options = {}) => {
    const p = { identifier: 4, clientX: options.x ?? 100, clientY: options.y ?? 100 };
    fire(type, { touches: type === 'touchend' || type === 'touchcancel' ? [] : [p], changedTouches: [p], ...options });
  };
  return { w, main, thumb, mainEl, thumbEl, imgs, calls, clock, fire, touch, listeners,
    close() { assert.equal(w.document.body.innerHTML, before, 'gallery DOM and lazy images are untouched'); clock.uninstall(); w.close(); } };
}
function test(name, action) {
  try { action(); passed++; }
  catch (error) { error.message = name + ': ' + error.message; throw error; }
}
test('trusted click-only fallback waits for native', () => {
  const f = fixture(); f.fire('click'); f.clock.tick(179); assert.equal(f.calls.length, 0);
  f.clock.tick(1); assert.deepEqual(f.calls, [['loop', 2]]); f.close();
});
test('touch-only tap fallback', () => {
  const f = fixture(); f.touch('touchstart'); f.touch('touchend'); f.clock.tick(180);
  assert.deepEqual(f.calls, [['loop', 2]]); f.close();
});
test('pointer-only tap fallback', () => {
  const f = fixture(); f.fire('pointerdown'); f.fire('pointerup'); f.clock.tick(180);
  assert.deepEqual(f.calls, [['loop', 2]]); f.close();
});
test('native success after RAF causes no duplicate', () => {
  const f = fixture(); f.fire('pointerdown'); f.touch('touchstart'); f.fire('pointerup'); f.touch('touchend'); f.fire('click');
  f.clock.setTimeout(() => { f.main.realIndex = 2; }, 16); f.clock.tick(1000);
  assert.equal(f.calls.length, 0); f.close();
});
test('pointer touch click delivery coalesces to one fallback', () => {
  const f = fixture(); f.fire('pointerdown'); f.touch('touchstart'); f.fire('pointerup'); f.touch('touchend'); f.fire('click');
  f.clock.tick(1000); assert.deepEqual(f.calls, [['loop', 2]]); f.close();
});
test('pointer drag and ghost click do not switch', () => {
  const f = fixture(); f.fire('pointerdown'); f.fire('pointermove', { clientX: 106 }); f.fire('pointerup', { clientX: 106 });
  f.fire('click'); f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('vertical touch scrolling does not switch', () => {
  const f = fixture(); f.touch('touchstart'); f.touch('touchmove', { y: 180 }); f.touch('touchend', { y: 180 }); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('touch cancellation and ghost click do not switch', () => {
  const f = fixture(); f.touch('touchstart'); f.touch('touchcancel'); f.touch('touchend'); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('pointer cancellation clears pending fallback', () => {
  const f = fixture(); f.fire('pointerdown'); f.fire('pointerup'); f.fire('pointercancel'); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('multitouch gesture and ghost click do not switch', () => {
  const f = fixture(); f.touch('touchstart'); f.touch('touchstart', { touches: [{ identifier: 4 }, { identifier: 5 }] });
  f.touch('touchend'); f.fire('click'); f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('secondary pointer invalidates gesture', () => {
  const f = fixture(); f.fire('pointerdown'); f.fire('pointerdown', { isPrimary: false, pointerId: 2 }); f.fire('pointerup'); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('initial multitouch without earlier primary cannot create ghost click', () => {
  const f = fixture(); f.touch('touchstart', { touches: [{ identifier: 4 }, { identifier: 5 }] }); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('new genuine tap works after a cancelled gesture', () => {
  const f = fixture(); f.touch('touchstart'); f.touch('touchcancel');
  f.fire('pointerdown'); f.fire('pointerup'); f.fire('click'); f.clock.tick(180);
  assert.deepEqual(f.calls, [['loop', 2]]); f.close();
});
test('long press and ensuing click do not switch', () => {
  const f = fixture(); f.fire('pointerdown'); f.clock.tick(1000); f.fire('pointerup'); f.fire('click');
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('latest genuine tap wins', () => {
  const f = fixture(); f.fire('click'); f.clock.tick(100); f.fire('pointerdown', { target: f.imgs[1] }); f.fire('pointerup', { target: f.imgs[1] });
  f.clock.tick(1000); assert.deepEqual(f.calls, [['loop', 1]]); f.close();
});
test('untrusted events are ignored', () => {
  const f = fixture(); for (const type of ['pointerdown', 'pointerup', 'click']) f.fire(type, { isTrusted: false });
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('cancelled click and non-primary button are ignored', () => {
  const f = fixture(); f.fire('click', { defaultPrevented: true }); f.fire('click', { button: 2 });
  f.clock.tick(1000); assert.equal(f.calls.length, 0); f.close();
});
test('missing or disabled native instance is left alone', () => {
  for (const missing of [false, true]) {
    const f = fixture(undefined, !missing); f.main.enabled = false; f.fire('click'); f.clock.tick(1000);
    assert.equal(f.calls.length, 0); f.close();
  }
});
test('mismatched thumbs instance is left alone', () => {
  const f = fixture(); f.main.thumbs.swiper = {}; f.fire('click'); f.clock.tick(1000);
  assert.equal(f.calls.length, 0); f.close();
});
test('non-loop native gallery uses slideTo', () => {
  const f = fixture(); f.main.params.loop = false; f.fire('click'); f.clock.tick(180);
  assert.deepEqual(f.calls, [['plain', 2]]); f.close();
});
test('host and listing exclusions', () => {
  for (const url of ['https://other.example/item/945932.html', 'https://store.cityhill.co.jp/majesticlegon/item/search.html',
    'https://store.cityhill.co.jp/item/preorder.html']) {
    const f = fixture(url); f.fire('click'); f.clock.tick(1000);
    assert.equal(f.calls.length, 0); assert.equal(f.listeners.has('pointerdown'), false); f.close();
  }
});
test('mobile and brand product route variants', () => {
  for (const path of ['/sp/item/945932.html', '/majesticlegon/item/945932.html', '/sp/majesticlegon/item/945932.html']) {
    const f = fixture('https://store.cityhill.co.jp' + path); f.fire('click'); f.clock.tick(180);
    assert.deepEqual(f.calls, [['loop', 2]]); f.close();
  }
});
assert(!/preventDefault\s*\(|stop(?:Immediate)?Propagation\s*\(|setInterval\s*\(|MutationObserver/.test(source));
console.log(`CITYHILL gallery compatibility: ${passed} scenarios passed (mock API; Android hardware untested).`);
