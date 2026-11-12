// Controlled frame-readiness checks; no live Google or Android timing claim.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const helper = await readFile(new URL('../src/google-frame-preparation.js', import.meta.url), 'utf8');
const frozen = await readFile(new URL('../Android_Generic_AutoPager_v6.65.js', import.meta.url), 'utf8');
const start = frozen.indexOf('return await async function(t,e,n){const o=t=>new Promise');
const end = frozen.indexOf('}(o,i,c),await async function', start);
assert(start >= 0 && end > start);
const delays = [];
const old = vm.runInNewContext('(' + frozen.slice(start + 'return await '.length, end + 1) + ')', {
  window: { setTimeout(callback, delay) { delays.push(delay); queueMicrotask(callback); } }, Event,
});
await old({ innerHeight: 800, scrollTo() {}, dispatchEvent() {} }, { scrollingElement: { scrollHeight: 3000 } }, { querySelectorAll: () => [] });
assert.deepEqual(delays, [180, 180, 180, 450], 'Frozen no-image preparation unconditionally waits 990ms');
console.log('PASS frozen hydration control: ready no-image page still schedules 990ms of mandatory waits');

const require = createRequire(import.meta.url);
const paths = [process.env.GOOGLE_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, new URL('..', import.meta.url).pathname].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const loaded = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundled = loaded.default || loaded;
  launch.executablePath = await bundled.executablePath();
  launch.args = bundled.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(launch);
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="blue"/></svg>';
const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
let passed = 0;
async function open(kind) {
  const context = await browser.newContext({ viewport: { width: 500, height: 983 } });
  const page = await context.newPage();
  let release;
  const imageGate = new Promise(resolve => { release = resolve; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/image.svg') {
      if (kind === 'unsized' || kind === 'reserved') await imageGate;
      return route.fulfill({ contentType: 'image/svg+xml', body: svg });
    }
    if (url.pathname === '/frame') {
      const image = kind === 'unsized' ? '<img id="pending" src="/image.svg">' : kind === 'reserved' ? '<img id="pending" width="160" height="100" src="/image.svg">' : kind === 'ready' ? '<img width="160" height="100" src="data:image/svg+xml,' + encodeURIComponent(svg) + '">' : '';
      const lazyKinds = ['lazy', 'delayed-lazy', 'delayed-placeholder', 'never-lazy', 'delayed-picture'];
      const delayed = kind.startsWith('delayed-');
      const images = [1100, 2000, 2800].map((top, i) => {
        const img = `<img class="lazy" data-src="/image.svg?i=${i}" ${kind === 'delayed-placeholder' ? `src="${placeholder}"` : ''} ${delayed ? '' : 'width="160" height="100"'} style="position:absolute;top:${top}px;left:0">`;
        return kind === 'delayed-picture' ? `<picture><source data-srcset="/image.svg?picture=${i} 1x">${img.replace(/data-src="[^"]*"/, '')}</picture>` : img;
      }).join('');
      const lazy = lazyKinds.includes(kind) ? images + (kind === 'never-lazy' ? '' : `<script>window.__activated=0;const activate=image=>{if(image.parentElement.tagName==='PICTURE'){const source=image.parentElement.querySelector('source');source.srcset=source.dataset.srcset}else image.src=image.dataset.src;window.__activated++};const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){${delayed ? 'setTimeout(()=>activate(e.target),120)' : 'activate(e.target)'};io.unobserve(e.target)}}));document.querySelectorAll('.lazy').forEach(e=>io.observe(e));</script>`) : '';
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><style>body{margin:0}#rso{position:relative;height:3200px;width:400px}</style><div id="rso">' + image + lazy + '</div>' });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  });
  await page.goto('https://www.google.com/search?q=frame-preparation');
  await page.addScriptTag({ content: helper });
  await page.evaluate(() => {
    const frame = document.createElement('iframe'); frame.id = 'source'; frame.width = '400'; frame.height = '800';
    frame.style.cssText = 'position:fixed;top:0;left:0;width:400px;height:800px;opacity:.001;pointer-events:none;z-index:-2147483647';
    frame.src = '/frame'; document.body.appendChild(frame);
  });
  await page.waitForFunction(() => document.getElementById('source')?.contentDocument?.getElementById('rso'));
  return { context, page, release, close: async () => { release(); await context.close(); } };
}
async function begin(test) {
  await test.page.evaluate(() => {
    const frame = document.getElementById('source');
    window.__prepared = false;
    window.__preparation = hydrateGenericGoogleFrameV666(frame.contentWindow, frame.contentDocument, frame.contentDocument.getElementById('rso')).then(() => { window.__prepared = true; });
  });
}
try {
  for (const kind of ['plain', 'ready']) {
  const plain = await open(kind);
  try {
    const result = await plain.page.evaluate(async () => {
      const frame = document.getElementById('source'), waits = [], scrolls = [];
      const timeout = window.setTimeout, scroll = frame.contentWindow.scrollTo.bind(frame.contentWindow);
      window.setTimeout = (callback, delay, ...args) => { waits.push(delay); return timeout(callback, delay, ...args); };
      frame.contentWindow.scrollTo = (...args) => { scrolls.push(args); return scroll(...args); };
      try { await hydrateGenericGoogleFrameV666(frame.contentWindow, frame.contentDocument, frame.contentDocument.getElementById('rso')); }
      finally { window.setTimeout = timeout; }
      return { waits, scrolls, outerY: scrollY };
    });
    assert.deepEqual(result.waits, [], 'No-image ready page has no artificial timer wait');
    assert.equal(result.scrolls.length, 3); assert.equal(result.outerY, 0);
    passed++; console.log(`PASS frame preparation: ${kind} page uses frame opportunities without fixed timer waits or outer scrolling`);
  } finally { await plain.close(); }
  }
  const lazy = await open('lazy');
  try {
    await begin(lazy); await lazy.page.evaluate(() => window.__preparation);
    const values = await lazy.page.evaluate(() => [...document.getElementById('source').contentDocument.querySelectorAll('.lazy')].map(image => ({ src: image.getAttribute('src'), width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height })));
    assert(values.every(value => value.src?.startsWith('/image.svg?i=') && value.width === 160 && value.height === 100), 'Every lazy viewport receives its real source and retains reserved geometry');
    passed++; console.log('PASS frame preparation: actual iframe IntersectionObserver lazy images are activated across all visited viewports');
  } finally { await lazy.close(); }
  for (const kind of ['delayed-lazy', 'delayed-placeholder', 'delayed-picture']) {
    const delayed = await open(kind);
    try {
      await begin(delayed); await delayed.page.evaluate(() => window.__preparation);
      const value = await delayed.page.evaluate(() => {
        const frame = document.getElementById('source');
        return { activated: frame.contentWindow.__activated, images: [...frame.contentDocument.querySelectorAll('.lazy')].map(image => ({
          source: image.getAttribute('src') || image.parentElement.querySelector('source')?.getAttribute('srcset'),
          width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height,
        })) };
      });
      assert.equal(value.activated, 3, 'Unsized images await each delayed IntersectionObserver source activation');
      assert(value.images.every(image => image.source?.startsWith('/image.svg?') && image.width === 160 && image.height === 100));
      passed++; console.log(`PASS frame preparation: unsized ${kind} waits for 120ms asynchronous lazy activation before capture`);
    } finally { await delayed.close(); }
  }
  const never = await open('never-lazy');
  try {
    await never.page.evaluate(() => {
      const timeout = window.setTimeout; window.__waits = [];
      window.setTimeout = (callback, delay, ...args) => { window.__waits.push(delay); return timeout(callback, delay, ...args); };
    });
    await begin(never); await never.page.evaluate(() => window.__preparation);
    assert((await never.page.evaluate(() => window.__waits)).every(delay => delay === 0), 'Known safe reserved sources activate without a 1600ms deadline wait');
    const values = await never.page.evaluate(async () => {
      const root = document.getElementById('source').contentDocument.getElementById('rso');
      await hydrateGenericGoogleCapturedImagesV666(root, root.ownerDocument.URL, genericGoogleImagePlaceholderV666, (node, key, value, base) => node.setAttribute(key, new URL(value, base).href));
      return [...root.querySelectorAll('.lazy')].map(image => ({ src: image.getAttribute('src'), width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height }));
    });
    assert(values.every(image => image.src?.includes('/image.svg?') && image.width === 160 && image.height === 100), 'Unobserved known sources survive post-capture preparation without losing reserved geometry');
    passed++; console.log('PASS frame preparation: missed lazy observers receive immediate safe source activation in reserved slots');
  } finally { await never.close(); }
  const sized = await open('reserved');
  try {
    await begin(sized); await sized.page.evaluate(() => window.__preparation);
    const value = await sized.page.evaluate(() => { const image = document.getElementById('source').contentDocument.getElementById('pending'); return { complete: image.complete, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height }; });
    assert.deepEqual(value, { complete: false, width: 160, height: 100 }, 'An unresolved image with reserved dimensions does not block page preparation');
    sized.release();
    await sized.page.waitForFunction(() => document.getElementById('source').contentDocument.getElementById('pending').complete);
    passed++; console.log('PASS frame preparation: reserved image slots do not wait for pixels and still load afterward');
  } finally { await sized.close(); }
  const unsized = await open('unsized');
  try {
    await begin(unsized); await unsized.page.waitForTimeout(250);
    assert.equal(await unsized.page.evaluate(() => window.__prepared), false, 'Pending unsized image is not snapshotted with missing intrinsic geometry');
    unsized.release(); await unsized.page.evaluate(() => window.__preparation);
    const value = await unsized.page.evaluate(() => { const image = document.getElementById('source').contentDocument.getElementById('pending'); return { complete: image.complete, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height }; });
    assert.deepEqual(value, { complete: true, width: 160, height: 100 });
    passed++; console.log('PASS frame preparation: unsized pending image waits for actual intrinsic geometry');
  } finally { await unsized.close(); }
  const batching = await open('plain');
  try {
    const value = await batching.page.evaluate(async () => {
      const frame = document.getElementById('source'), doc = frame.contentDocument, root = doc.getElementById('rso');
      root.innerHTML = '<div style="display:none">' + '<span>hidden</span>'.repeat(5000) + '</div>' + '<img width="16" height="10" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">'.repeat(130);
      let styleReads = 0, reads = 0, writes = 0, lateReads = 0;
      const computed = frame.contentWindow.getComputedStyle.bind(frame.contentWindow), original = frame.contentWindow.Element.prototype.getBoundingClientRect;
      frame.contentWindow.getComputedStyle = (...args) => { styleReads++; return computed(...args); };
      frame.contentWindow.Element.prototype.getBoundingClientRect = function (...args) { reads++; if (writes) lateReads++; return original.apply(this, args); };
      await hydrateGenericGoogleCapturedImagesV666(root, 'https://www.google.com/frame', () => false, (node, key, value) => { writes++; node.setAttribute(key, value); });
      return { styleReads, reads, writes, lateReads, images: root.querySelectorAll('img').length, widths: [...root.querySelectorAll('img')].every(image => image.getAttribute('width') === '16') };
    });
    assert.deepEqual(value, { styleReads: 0, reads: 130, writes: 130, lateReads: 0, images: 130, widths: true });
    passed++; console.log('PASS captured image preparation: one geometry read per image before writes; zero duplicate background reads across 5000 hidden descendants');
  } finally { await batching.close(); }
  console.log(`Google frame preparation tests passed: ${passed} browser scenarios plus frozen mandatory-wait control`);
} finally { await browser.close(); }
