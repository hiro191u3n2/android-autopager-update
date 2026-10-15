/**
 * Offline tests of the exact generic image hydrator from the built userscript.
 * Only the imported subtree is passed to it. jsdom loads no image or network
 * resource; these tests verify DOM behavior, not Android rendering performance.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUserscript } from '../worker/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const deps = [process.env.FASHION_TEST_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, ROOT].filter(Boolean);
const { JSDOM, VirtualConsole } = require(require.resolve('jsdom', { paths: deps }));
const built = await buildUserscript();
const helper = readFileSync(resolve(ROOT, 'src/fashion-product-guard.js'), 'utf8').trim();
assert.equal(built.split(helper).length, 2, 'Commerce helper must be exactly the built helper');
const start = built.indexOf('function _(t,e){');
const end = built.indexOf('function J(t,e){', start);
assert(start >= 0 && end > start && built.indexOf('function _(t,e){', start + 1) === -1, 'Generic hydrator boundary must be unique');
const utilityStart = built.indexOf('function X(t,e){', end);
const utilityEnd = built.indexOf('function tt(t){', utilityStart);
assert(utilityStart > end && utilityEnd > utilityStart, 'Production X/K/Z/Q helper boundaries must exist');
const code = helper + '\n' + built.slice(start, end) + '\n' + built.slice(utilityStart, utilityEnd);
const BASE = 'https://brand.example/collections/dresses?page=2';
const MEDIA = '<picture><source data-srcset="/image/one.webp 1x, /image/two.webp 2x"><img id="imported" src="data:image/gif;base64,R0lGODlhAQABA" data-src="/image/real.jpg" data-srcset="/image/one.jpg 1x, /image/two.jpg 2x"></picture>';
let passed = 0;

function check(name, { markup, url = BASE, loading, hydrated = true }) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(String(error)));
  const dom = new JSDOM('<!doctype html><html><body><section id="existing-gallery"><img src="/native.jpg" loading="lazy" hidden aria-hidden="true" style="opacity:0"></section></body></html>', { url, runScripts: 'outside-only', virtualConsole });
  try {
    const w = dom.window, d = w.document;
    w.eval(code);
    const original = d.getElementById('existing-gallery').outerHTML;
    const template = d.createElement('template'); template.innerHTML = markup;
    const root = template.content.firstElementChild;
    const originalImage = root.matches('img') ? root : root.querySelector('img');
    const originalSource = originalImage.getAttribute('src');
    // Imported trees are prepared while detached, then repaired after insertion.
    const first = w._(root, url);
    assert.equal(first, hydrated, name + ': hydration requirement');
    const image = root.matches('img') ? root : root.querySelector('img');
    assert.equal(image.getAttribute('loading'), loading, name + ': image loading policy');
    assert.equal(image.getAttribute('decoding'), 'async');
    if (hydrated) {
      assert.equal(image.getAttribute('src'), new URL('/image/real.jpg', url).href);
      assert.equal(image.getAttribute('srcset'), new URL('/image/one.jpg', url).href + ' 1x, ' + new URL('/image/two.jpg', url).href + ' 2x');
      const source = root.querySelector('source');
      if (source) assert.equal(source.getAttribute('srcset'), new URL('/image/one.webp', url).href + ' 1x, ' + new URL('/image/two.webp', url).href + ' 2x');
    } else assert.equal(image.getAttribute('src'), originalSource, name + ': existing valid image source is retained');
    const prepared = root.outerHTML;
    d.body.appendChild(root);
    w._(root, url);
    assert.equal(root.outerHTML, prepared, name + ': repeated hydration is stable');
    assert.equal(d.getElementById('existing-gallery').outerHTML, original, name + ': original gallery is untouched');
    assert.deepEqual(errors, []);
    passed++;
    console.log('PASS ' + name);
  } finally { dom.window.close(); }
}

for (const attrs of [
  'itemscope itemtype="https://schema.org/Product"',
  'itemscope itemtype="http://schema.org/Product"',
  'itemscope itemtype="https://schema.org/Thing https://schema.org/Product"',
  ...['product-card', 'productCard', 'product_card', 'product-tile', 'productTile', 'product_tile', 'fs-c-productList'].map(value => `class="${value}"`),
]) {
  check('Root commerce card: ' + attrs, { markup: `<article ${attrs}>${MEDIA}</article>`, loading: 'lazy' });
  check('Nested commerce card: ' + attrs, { markup: `<section><article ${attrs}>${MEDIA}</article></section>`, loading: 'lazy' });
}
check('Google retains eager loading for imported results', { markup: `<article itemscope itemtype="https://schema.org/Product">${MEDIA}</article>`, url: 'https://www.google.co.jp/search?q=dress&start=10', loading: 'eager' });
check('Buzzap retains lazy loading', { markup: `<article>${MEDIA}</article>`, url: 'https://buzzap.jp/news/page/2/', loading: 'lazy' });
check('Noncommerce article remains eager', { markup: `<article class="news-card">${MEDIA}</article>`, loading: 'eager' });
check('ProductCollection schema is not a Product card', { markup: `<article itemtype="https://schema.org/ProductCollection">${MEDIA}</article>`, loading: 'eager' });
check('Unrelated schema namespace is not a Product card', { markup: `<article itemtype="https://example.org/Product">${MEDIA}</article>`, loading: 'eager' });
check('An imported image root can declare a commerce card', { markup: '<img class="product-card" src="data:image/gif;base64,R0lGODlhAQABA" data-src="/image/real.jpg" data-srcset="/image/one.jpg 1x, /image/two.jpg 2x">', loading: 'lazy' });
check('Already loaded commerce source is retained', { markup: '<article class="product-card"><img src="/image/already.jpg"></article>', loading: 'lazy', hydrated: false });
console.log(`Generic commerce image tests passed: ${passed} cases; production hydrator and URL/placeholder helpers, no external requests`);
