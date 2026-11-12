// Recovery invariant tests. Original browser regression sources were pruned.
// Do not describe byte-preservation checks as live-site playback/browser tests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildUserscript, REALTIME_GUARD, PRODUCT_GUARD, MODULE_REPLACEMENTS, COMMERCE_IMAGE_REPLACEMENTS, GOOGLE_LAYOUT_REPLACEMENTS, GOOGLE_DIAGNOSTICS_INITIALIZER, END, VERSION } from '../worker/index.js';

const base = await readFile(new URL('../Android_Generic_AutoPager_v6.44.js', import.meta.url), 'utf8');
const output = await buildUserscript();
const originalBody = base.slice(base.indexOf(END) + END.length);
const realtime = (await readFile(new URL('../src/yahoo-realtime-autopager.js', import.meta.url), 'utf8')).trim();
const gallery = (await readFile(new URL('../src/cityhill-gallery-compat.js', import.meta.url), 'utf8')).trim();
const helper = (await readFile(new URL('../src/fashion-product-guard.js', import.meta.url), 'utf8')).trim();
const googleCleanup = (await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8')).trim();
const prefix = `\n\n${googleCleanup}\n${realtime}\n${gallery}\n`;
const executable = output.slice(output.indexOf(END) + END.length);
assert(executable.startsWith(prefix), 'Runtime module ordering changed');
const googleInspection = (await readFile(new URL('../src/google-boundary-inspection.js', import.meta.url), 'utf8')).trim();
const googleDiagnostics = (await readFile(new URL('../src/google-result-diagnostics.js', import.meta.url), 'utf8')).trim();
const diagnosticAddition = `${googleInspection}\n${googleDiagnostics}\n${GOOGLE_DIAGNOSTICS_INITIALIZER}\n`;
assert.equal(executable.split(diagnosticAddition).length, 2, 'Diagnostic addition must occur exactly once');
const preserved658 = executable.replace(diagnosticAddition, '');
const frozen658 = await readFile(new URL('../Android_Generic_AutoPager_v6.58.js', import.meta.url), 'utf8');
assert.equal(preserved658, frozen658.slice(frozen658.indexOf(END) + END.length), 'Diagnostic release must preserve the complete v6.58 executable');
let restored = preserved658.slice(prefix.length).replace(helper + '\n', '').replace(REALTIME_GUARD, '').replace(PRODUCT_GUARD, '');
const googleLayout = (await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8')).trim();
assert.equal(restored.split(googleLayout).length, 2);
restored = restored.replace(googleLayout + '\n', '');
for (const [from, to] of GOOGLE_LAYOUT_REPLACEMENTS) {
  assert.equal(restored.split(to).length, 2);
  restored = restored.replace(to, from);
}
for (const [from, to] of COMMERCE_IMAGE_REPLACEMENTS) {
  assert.equal(restored.split(to).length, 2);
  restored = restored.replace(to, from);
}
for (const spec of MODULE_REPLACEMENTS) {
  const current = (await readFile(new URL('../' + spec.path, import.meta.url), 'utf8')).trim();
  assert.equal(restored.split(current).length, 2, 'Replacement must occur exactly once: ' + spec.path);
  const old = originalBody.slice(originalBody.indexOf(spec.marker), originalBody.indexOf(spec.marker) + spec.length);
  if (spec.path !== 'src/cityhill-autopager.js') assert.equal(current, old.replace("img.loading = 'eager'", "img.loading = 'lazy'"));
  restored = restored.replace(current, old);
}
assert.equal(restored, originalBody, 'Unrelated baseline features must be byte-identical');
assert(output.includes(`// @version      ${VERSION}`));
assert.equal((output.match(/\/\/ @version\s/g) || []).length, 1);
for (const marker of [
  '__androidGenericBuzzapPagerV624', '__androidGenericYahooArticleVideoGuardV632',
  'generic-yahoo-article-edge-ua-v632', 'genericYahooArticleVideoOverlayV632',
  'generic-yahoo-realtime-promo-style-v626', '__androidGenericPimEyesJapaneseUploadV633',
  'generic-cityhill-product-autopager-v644', 'generic-fashion-product-autopager-v641',
]) assert(output.includes(marker), `Missing preserved module: ${marker}`);
for (const path of ['/realtime/search', '/realtime/search/']) {
  let entered = false;
  new Function('location', 'hit', REALTIME_GUARD + 'hit();')({hostname:'search.yahoo.co.jp',pathname:path}, () => entered = true);
  assert.equal(entered, false);
}
for (const location of [
  {hostname:'news.yahoo.co.jp',pathname:'/articles/1'},
  {hostname:'search.yahoo.co.jp',pathname:'/search'},
  {hostname:'search.yahoo.co.jp',pathname:'/realtime/search/tweet/123'},
  {hostname:'google.com',pathname:'/search'},
  {hostname:'buzzap.jp',pathname:'/news/1'},
  {hostname:'store.cityhill.co.jp',pathname:'/majesticlegon/item/search.html'},
]) {
  let entered = false;
  new Function('location','hit',REALTIME_GUARD + 'hit();')(location, () => entered = true);
  assert(entered, `Guard affected ${location.hostname}${location.pathname}`);
}
new Function(output);
console.log('PASS: unrelated v6.44 features byte-preserved; only named adapters, product guard and added runtimes differ; metadata, syntax and 8 host/path cases verified');
