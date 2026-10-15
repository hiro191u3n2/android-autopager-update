/**
 * Offline full-userscript regression and operation-count profiling.
 * jsdom does not emulate Android rendering, Swiper, or layout cost. The fixture
 * supplies geometry/time, and HTTP/image resources are never requested.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const deps = [process.env.FASHION_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { JSDOM, VirtualConsole } = require(require.resolve('jsdom', { paths: deps }));
const FakeTimers = require(require.resolve('@sinonjs/fake-timers', { paths: deps }));
const PRODUCT = 'https://store.cityhill.co.jp/item/945932.html?cc=01';
const baseline = readFileSync(resolve(ROOT, 'Android_Generic_AutoPager_v6.45.js'), 'utf8');
let generated = await buildUserscript();
// Development-only: exercise an adapter before the build owner integrates it.
if (process.argv.includes('--candidate-cityhill')) {
  const start = generated.indexOf('/* generic-cityhill-product-autopager-v644 */');
  const end = generated.indexOf('/* generic-fashion-product-autopager-v641 */', start);
  assert(start >= 0 && end > start, 'CITYHILL module boundaries must be unique');
  generated = generated.slice(0, start) + readFileSync(resolve(ROOT, 'src/cityhill-autopager.js'), 'utf8') + '\n' + generated.slice(end);
}
const SYNTHETIC = `<!doctype html><html><head><title>商品詳細</title></head><body>
  <main><h1>商品詳細</h1><div id="imageArea">
  <div class="swiper mainSlider"><ul id="sp_image_slick" class="slickImage swiper-wrapper">
    <li class="swiper-slide swiper-slide-active"><img id="main-image" src="/image/01.jpg" data-src="/image/01.jpg" data-original="/image/01.jpg" loading="lazy"></li>
    <li class="swiper-slide" aria-hidden="true" style="opacity:0;visibility:hidden"><img src="/image/02.jpg" loading="lazy"></li>
  </ul></div><div class="swiper thumnailSlider"><ul class="swiper-wrapper">
    <li class="swiper-slide"><button data-image="01"><img src="/image/01.jpg" loading="lazy"></button></li>
    <li class="swiper-slide"><button data-image="02"><img src="/image/02.jpg" loading="lazy"></button></li>
  </ul></div><div class="pagenation"><span>1</span> / <span>2</span></div></div>
  <section class="recommend"><a href="/item/945933.html">別の商品</a></section></main></body></html>`;

async function setup(source, { html = SYNTHETIC, url = PRODUCT, respond = null } = {}) {
  const errors = [], metrics = { queries: 0, queryNodes: 0, rectReads: 0, styleReads: 0, writes: 0, srcWrites: 0, observerCalls: 0, mutationRecords: 0, fetches: [], listenerTypes: {} };
  const console = new VirtualConsole(); console.on('jsdomError', error => errors.push(String(error)));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window, d = w.document;
  // A representative page-owned handler: native event delivery must survive.
  d.querySelector('[data-image="02"]')?.addEventListener('click', event => {
    if (!event.defaultPrevented) d.getElementById('main-image').setAttribute('src', '/image/selected-after-tap.jpg');
  });
  const clock = FakeTimers.withGlobal(w).install({ now: 1_800_000_000_000, loopLimit: 1000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  let y = 0;
  Object.defineProperty(w, 'scrollY', { get: () => y });
  Object.defineProperty(w, 'innerHeight', { value: 800 });
  Object.defineProperty(w, 'innerWidth', { value: 412 });
  Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36' });
  w.performance.getEntriesByType = () => [];
  Object.defineProperty(d.documentElement, 'scrollHeight', { get: () => 10000 });
  Object.defineProperty(d.documentElement, 'scrollTop', { get: () => y, set: value => { y = value; } });
  for (const proto of [w.Document.prototype, w.Element.prototype]) {
    for (const name of ['querySelector', 'querySelectorAll']) {
      const native = proto[name];
      proto[name] = function (...args) {
        const result = Reflect.apply(native, this, args); metrics.queries++;
        metrics.queryNodes += name === 'querySelectorAll' ? result.length : result ? 1 : 0;
        return result;
      };
    }
  }
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    metrics.rectReads++;
    const top = Number(this.dataset.top || 4000) - y;
    const zero = this.dataset.displayContents === 'true';
    const width = zero ? 0 : 360, height = zero ? 0 : this.matches('img') ? 480 : 50;
    return { top, bottom: top + height, left: 0, right: width, x: 0, y: top, width, height, toJSON() { return this; } };
  };
  const selectContents = w.Range.prototype.selectNodeContents;
  w.Range.prototype.selectNodeContents = function (node) { this.fixtureNode = node; return Reflect.apply(selectContents, this, [node]); };
  w.Range.prototype.getBoundingClientRect = function () {
    metrics.rectReads++;
    const top = Number(this.fixtureNode?.dataset.top || 4000) - y;
    return { top, bottom: top + 50, left: 0, right: 360, x: 0, y: top, width: 360, height: 50, toJSON() { return this; } };
  };
  const getStyle = w.getComputedStyle.bind(w);
  w.getComputedStyle = (...args) => { metrics.styleReads++; return getStyle(...args); };
  const attr = w.Element.prototype.setAttribute;
  w.Element.prototype.setAttribute = function (name, value) {
    metrics.writes++; if (name === 'src') metrics.srcWrites++;
    return Reflect.apply(attr, this, [name, value]);
  };
  const observe = w.MutationObserver;
  w.MutationObserver = class extends observe {
    constructor(callback) {
      super((records, observer) => {
        metrics.observerCalls++; metrics.mutationRecords += records.length;
        if (metrics.observerCalls > 1000) { observer.disconnect(); errors.push('Observer budget exceeded'); return; }
        callback(records, observer);
      });
    }
  };
  const listen = w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (this === w || this === d) metrics.listenerTypes[type] = (metrics.listenerTypes[type] || 0) + 1;
    return Reflect.apply(listen, this, [type, listener, options]);
  };
  w.fetch = async input => {
    metrics.fetches.push(String(input));
    if (!respond) return { ok: false, status: 503, headers: new Map() };
    return { ok: true, status: 200, url: String(input), headers: new Map([['content-type', 'text/html']]), text: async () => respond(String(input)) };
  };
  w.GM_addStyle = () => {}; w.GM_getValue = (_key, value) => value; w.GM_setValue = () => {}; w.unsafeWindow = w;
  const api = {
    dom, w, d, clock, metrics, errors,
    async advance(ms) { await Promise.resolve(); await clock.tickAsync(ms); await Promise.resolve(); },
    async start() { if (source) w.eval(source); await this.advance(1000); },
    async scroll(to) { y = to; w.dispatchEvent(new w.Event('scroll')); await this.advance(250); },
    async exercise(maximumY = 3480) {
      // Represents native carousel animation and native lazy-image replacement.
      const main = d.querySelector('#sp_image_slick'), image = d.querySelector('#main-image') || main?.querySelector('img');
      const thumbnail = d.querySelector('[data-image="02"]');
      if (thumbnail) thumbnail.click();
      else if (image) image.setAttribute('src', '/image/selected-after-tap.jpg');
      for (let i = 0; i < 30; i++) {
        y = i * maximumY / 29;
        d.body.classList.toggle('hfix', i % 2 === 0);
        if (main) main.style.transform = `translate3d(${-i * 300}px,0,0)`;
        main?.classList.toggle('swiper-animating', i % 2 === 0);
        w.dispatchEvent(new w.Event('scroll'));
        await this.advance(16);
      }
      await this.advance(3000);
      return image?.getAttribute('src');
    },
    close() { clock.uninstall(); dom.window.close(); },
  };
  await api.start();
  return api;
}

async function profile(source, options = {}) {
  const f = await setup(source, options);
  try {
    const startup = structuredClone(f.metrics);
    const selected = await f.exercise(options.maximumY);
    return { startup, total: f.metrics, selected, sentinel: Boolean(f.d.querySelector('#generic-autopager-sentinel')), errors: f.errors };
  } finally { f.close(); }
}

function listingHTML(size, site = 'city', { offset = 0, page = 1, next = true, contents = false } = {}) {
  const link = i => site === 'pal' ? `/display/item/P${i}/?cl=01` : site === 'atomic' ? `/ap/item/i/P${i}` : `/item/${900000 + i}.html`;
  const items = Array.from({ length: size }, (_, j) => { const i = j + offset; return `<li class="item" ${contents ? 'data-display-contents="true" style="display:contents"' : ''}><a href="${link(i)}"><img loading="lazy" src="/image/${i}.jpg"><span>商品 ${i}</span></a></li>`; }).join('');
  const list = site === 'city' ? `<ul class="item-list">${items}</ul>` : site === 'pal' ? `<div id="item_pic_block"><ul id="item_list">${items}</ul></div>` : `<ul id="item_container">${items}</ul>`;
  const pager = site === 'city' ? `<div class="pagination"><span class="current">${page}</span>${next ? `<a href="?pno=${page + 1}">${page + 1}</a><a class="next" href="?pno=${page + 1}">次へ</a>` : '<a href="?pno=1">1</a>'}</div>` : site === 'pal' ? '<div class="pager_wrap"><span class="current">1</span><a id="2" class="arrow_r" href="#">2</a></div>' : '<ol class="pager"><li class="pager_number">1</li><li><a class="next" href="?rows=30&start=30">次へ</a></li></ol>';
  return `<!doctype html><html><body><main>${list}${pager}</main><footer></footer></body></html>`;
}

async function listingProfile(source, size, site = 'city') {
  const url = site === 'city' ? 'https://store.cityhill.co.jp/majesticlegon/item/search.html' : site === 'pal' ? 'https://www.palcloset.jp/display/display/' : 'https://atomicboxx.com/ap/s/s?rows=30';
  const f = await setup(source, { html: listingHTML(size, site), url });
  try {
    await f.advance(1500);
    const before = structuredClone(f.metrics);
    await f.exercise(600);
    const delta = {};
    for (const key of ['queries', 'queryNodes', 'rectReads', 'styleReads', 'writes', 'observerCalls', 'mutationRecords']) delta[key] = f.metrics[key] - before[key];
    return { size, ...delta, fetches: f.metrics.fetches.length, errors: f.errors };
  } finally { f.close(); }
}

async function imageChurnProfile(source, size) {
  const f = await setup(source, { html: listingHTML(size), url: 'https://store.cityhill.co.jp/majesticlegon/item/search.html' });
  try {
    await f.advance(1500);
    const image = f.d.querySelector('.item-list img'), before = structuredClone(f.metrics);
    for (let i = 0; i < 15; i++) {
      image.style.opacity = String(i % 2); image.classList.toggle('lazyloaded', i % 2 === 0);
      image.setAttribute('src', `/image/switched-${i}.jpg`);
      f.d.body.classList.toggle('hfix', i % 2 === 0);
      await f.advance(32);
    }
    await f.advance(240);
    return { queries: f.metrics.queries - before.queries, rectReads: f.metrics.rectReads - before.rectReads, observerCalls: f.metrics.observerCalls - before.observerCalls };
  } finally { f.close(); }
}

if (process.argv.includes('--baseline-report')) {
  console.log(JSON.stringify({ fixture: await profile(baseline), ...(existsSync('/tmp/cityhill-945932.html') ? { liveSnapshot: await profile(baseline, { html: readFileSync('/tmp/cityhill-945932.html', 'utf8') }) } : {}), listings: await Promise.all([listingProfile(baseline, 30), listingProfile(baseline, 300)]) }, null, 2));
} else if (process.argv.includes('--profile-current')) {
  console.log(JSON.stringify({ listings: await Promise.all([listingProfile(generated, 30), listingProfile(generated, 300)]), imageChurn: await imageChurnProfile(generated, 300) }, null, 2));
} else {
  const result = await profile(generated);
  assert.equal(result.selected, '/image/selected-after-tap.jpg', 'Native gallery image change must persist');
  assert.equal(result.total.fetches.length, 0, 'Product gallery must not trigger paging fetches');
  assert.deepEqual(result.errors, []);
  console.log('PASS native product gallery image updates and offline full userscript execution');
  for (const [url, declare] of [
    [PRODUCT, ''],
    ['https://www.palcloset.jp/display/item/P100/?cl=01', ''],
    ['https://atomicboxx.com/ap/item/i/P100', ''],
    ['https://fashion.example/products/dress', 'class'],
    ['https://fashion.example/product/dress', 'meta'],
  ]) {
    let html = SYNTHETIC.replace('</main>', '<nav class="bx-pager"><a rel="next" href="?page=2">次の商品</a><a href="?page=2">2</a></nav></main>');
    if (declare === 'class') html = html.replace('<body>', '<body class="template-product">');
    if (declare === 'meta') html = html.replace('</head>', '<meta property="og:type" content="product"></head>');
    const guarded = await profile(generated, { html, url });
    assert.equal(guarded.sentinel, false, `Detail page must ignore next-product/thumbnail pager: ${url}`);
    assert.equal(guarded.total.fetches.length, 0);
    assert.deepEqual(guarded.errors, []);
  }
  console.log('PASS product-detail guards ignore next-product and numeric gallery pagers');
  const ordinaryList = await setup(generated, {
    url: 'https://fashion.example/collections/dresses',
    html: listingHTML(6).replaceAll('class="item"', 'class="item" itemscope itemtype="https://schema.org/Product"').replace('class="next"', 'rel="next" class="next"'),
  });
  try {
    assert(ordinaryList.d.querySelector('#generic-autopager-sentinel'), 'Product microdata on list cards must not exclude the listing');
    assert.deepEqual(ordinaryList.errors, []);
    console.log('PASS product microdata on ordinary list cards preserves generic pagination');
  } finally { ordinaryList.close(); }
  const [small, large] = await Promise.all([listingProfile(generated, 30), listingProfile(generated, 300)]);
  assert(large.rectReads < 100 && large.rectReads <= small.rectReads + 12, 'Scroll geometry reads must not scale with the product count');
  assert(large.styleReads < 60 && large.styleReads <= small.styleReads + 12, 'Scroll style reads must remain bounded');
  assert(large.queries < 100 && large.queries <= small.queries + 20, 'Unchanged listing must not rescan all product keys');
  assert.equal(large.fetches, 0); assert.deepEqual(large.errors, []);
  console.log(`PASS bounded listing work: 30/300 cards = ${small.rectReads}/${large.rectReads} geometry reads`);
  const churn = await imageChurnProfile(generated, 300);
  assert(churn.queries < 50 && churn.rectReads < 70, 'Lazy image/style updates must not rebuild the full product cache');
  console.log('PASS native body.hfix and image class/src/style churn keep product cache');
  for (const kind of ['ordinary', 'display:contents', 'hidden-tail', 'replace-grid', 'replace-children', 'change-product-href']) {
    const f = await setup(generated, {
      html: listingHTML(6, 'city', { contents: kind === 'display:contents' }),
      url: 'https://store.cityhill.co.jp/majesticlegon/item/search.html',
      respond: () => listingHTML(3, 'city', { offset: 20, page: 2, next: false }).replace(kind === 'change-product-href' ? '/item/900020.html' : '__unused__', '/item/900000.html'),
    });
    try {
      assert.equal(f.metrics.fetches.length, 0, `${kind}: no early request`);
      const oldList = f.d.querySelector('.item-list');
      if (kind === 'hidden-tail') {
        oldList.lastElementChild.hidden = true;
        oldList.lastElementChild.previousElementSibling.hidden = true;
      }
      if (kind === 'change-product-href') {
        oldList.querySelector('a').setAttribute('href', '/item/999999.html');
        await f.advance(1500);
      }
      if (kind === 'replace-grid' || kind === 'replace-children') {
        const template = f.d.createElement('template');
        template.innerHTML = listingHTML(4, 'city', { offset: 100 });
        const replacement = template.content.querySelector('.item-list');
        if (kind === 'replace-grid') oldList.replaceWith(replacement);
        else oldList.replaceChildren(...replacement.children);
        await f.advance(1500);
      }
      await f.scroll(2500); await f.advance(1000);
      assert.equal(f.metrics.fetches.length, 1, `${kind}: loads once at the tail`);
      assert.equal(new URL(f.metrics.fetches[0]).searchParams.get('pno'), '2');
      assert.equal(f.d.querySelectorAll('[data-generic-fashion-page="2"]').length, 3, `${kind}: imports next products`);
      assert.equal(f.d.querySelector('.item-list').children.length, kind.startsWith('replace-') ? 7 : 9);
      assert([...f.d.querySelectorAll('[data-generic-fashion-page="2"] img')].every(img => img.loading === 'lazy'), `${kind}: imported images stay lazy`);
      assert.deepEqual(f.errors, []);
      console.log(`PASS CITYHILL ${kind} pagination without external requests`);
    } finally { f.close(); }
  }
  for (const mode of ['late-pager', 'disabled-control']) {
    const initial = listingHTML(6, 'city', { next: mode === 'disabled-control' });
    const f = await setup(generated, {
      html: mode === 'disabled-control' ? initial.replaceAll('href="?pno=2"', 'href="?pno=2" aria-disabled="true"') : initial,
      url: 'https://store.cityhill.co.jp/majesticlegon/item/search.html',
      respond: () => listingHTML(3, 'city', { offset: 20, page: 2, next: false }),
    });
    try {
      await f.advance(1500);
      const before = structuredClone(f.metrics);
      for (let i = 0; i < 8; i++) { f.d.body.classList.toggle('hfix', i % 2 === 0); await f.scroll(500 + i * 10); }
      assert.equal(f.metrics.fetches.length, 0, `${mode}: no next request before control is available`);
      assert(f.metrics.queries - before.queries < 70, `${mode}: cached control miss should avoid full scans`);
      if (mode === 'late-pager') f.d.querySelector('.pagination').innerHTML = '<span class="current">1</span><a href="?pno=2">2</a><a class="next" href="?pno=2">次へ</a>';
      else for (const link of f.d.querySelectorAll('a[aria-disabled]')) link.removeAttribute('aria-disabled');
      await f.advance(250); await f.scroll(2500); await f.advance(1000);
      assert.equal(f.metrics.fetches.length, 1, `${mode}: active control re-enables pagination`);
      assert.equal(f.d.querySelectorAll('[data-generic-fashion-page="2"]').length, 3);
      assert.deepEqual(f.errors, []);
      console.log(`PASS CITYHILL ${mode} discovers next control after a cached miss`);
    } finally { f.close(); }
  }
}
