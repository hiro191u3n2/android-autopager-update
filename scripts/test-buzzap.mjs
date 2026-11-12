// Recovery invariant tests. Original browser regression sources were pruned.
// Do not describe byte-preservation checks as live-site playback/browser tests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildUserscript, REALTIME_GUARD, PRODUCT_GUARD, MODULE_REPLACEMENTS, COMMERCE_IMAGE_REPLACEMENTS, GOOGLE_LAYOUT_REPLACEMENTS, GOOGLE_STAGING_REPLACEMENTS, GOOGLE_READ_AHEAD_REPLACEMENTS, GOOGLE_FRAME_PREPARATION_REPLACEMENTS, END, VERSION } from '../worker/index.js';

const base = await readFile(new URL('../Android_Generic_AutoPager_v6.44.js', import.meta.url), 'utf8');
const output = await buildUserscript();
const originalBody = base.slice(base.indexOf(END) + END.length);
const realtime = (await readFile(new URL('../src/yahoo-realtime-autopager.js', import.meta.url), 'utf8')).trim();
const gallery = (await readFile(new URL('../src/cityhill-gallery-compat.js', import.meta.url), 'utf8')).trim();
const helper = (await readFile(new URL('../src/fashion-product-guard.js', import.meta.url), 'utf8')).trim();
const googleCleanup = (await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8')).trim();
const prefix = `\n\n${googleCleanup}\n${realtime}\n${gallery}\n`;
let executable = output.slice(output.indexOf(END) + END.length);
const currentReadAhead = (await readFile(new URL('../src/google-read-ahead.js', import.meta.url), 'utf8')).trim();
const currentStaging = (await readFile(new URL('../src/google-import-staging.js', import.meta.url), 'utf8')).trim();
const googleFramePreparation = (await readFile(new URL('../src/google-frame-preparation.js', import.meta.url), 'utf8')).trim();
const frozen665 = await readFile(new URL('../Android_Generic_AutoPager_v6.65.js', import.meta.url), 'utf8');
const frozen665Body = frozen665.slice(frozen665.indexOf(END) + END.length);
const stagingStart665 = frozen665Body.indexOf('// Prepare only a detached Google result page.');
const aheadStart665 = frozen665Body.indexOf('// Keep one Google result page ready ahead of the reader.');
const coreStart665 = frozen665Body.indexOf('function e(){if(/^search');
assert(stagingStart665 >= 0 && aheadStart665 > stagingStart665 && coreStart665 > aheadStart665);
const googleStaging = frozen665Body.slice(stagingStart665, aheadStart665).trimEnd();
const googleReadAhead = frozen665Body.slice(aheadStart665, coreStart665).trimEnd();
for (const module of [currentReadAhead, currentStaging, googleFramePreparation]) assert.equal(executable.split(module).length, 2);
executable = executable.replace(googleFramePreparation + '\n', '').replace(currentReadAhead, googleReadAhead).replace(currentStaging, googleStaging);
for (const [from, to] of GOOGLE_FRAME_PREPARATION_REPLACEMENTS) {
  assert.equal(executable.split(to).length, 2, 'Google preparation restoration boundary must be unique');
  executable = executable.replace(to, from);
}
assert.equal(executable, frozen665Body, 'Only named Google frame/title preparation and urgency changes may differ from v6.65');
assert.equal(executable.split(googleReadAhead).length, 2);
executable = executable.replace(googleReadAhead + '\n', '');
for (const [from, to] of GOOGLE_READ_AHEAD_REPLACEMENTS) {
  assert.equal(executable.split(to).length, 2, 'Google read-ahead restoration boundary must be unique');
  executable = executable.replace(to, from);
}
const frozen664 = await readFile(new URL('../Android_Generic_AutoPager_v6.64.js', import.meta.url), 'utf8');
assert.equal(executable, frozen664.slice(frozen664.indexOf(END) + END.length), 'Only the named Google read-ahead additions may differ from v6.64');
assert(executable.startsWith(prefix), 'Runtime module ordering changed');
const googleLayout = (await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8')).trim();
const frozen663 = await readFile(new URL('../Android_Generic_AutoPager_v6.63.js', import.meta.url), 'utf8');
const frozen663Body = frozen663.slice(frozen663.indexOf(END) + END.length);
const layout663Start = frozen663Body.indexOf('// Google loads result-specific CSS in each fetched document.');
const layout663End = frozen663Body.indexOf('// Prepare only a detached Google result page.', layout663Start);
assert(layout663Start >= 0 && layout663End > layout663Start);
const frozen663Layout = frozen663Body.slice(layout663Start, layout663End).trimEnd();
assert.equal(executable.replace(googleLayout, frozen663Layout), frozen663Body, 'Only the Google import layout module may differ from v6.63');
for (const marker of [
  'installGenericGoogleResultDiagnosticsV659', 'inspectGenericGoogleResultBoundariesV659',
  '__genericGoogleResultDiagnosticsV659', 'generic-google-diagnostics-v659',
  'android-autopager-google-diagnostics/v659',
]) assert(!output.includes(marker), `Removed Google diagnostic feature remains: ${marker}`);
const frozen662 = await readFile(new URL('../Android_Generic_AutoPager_v6.62.js', import.meta.url), 'utf8');
const frozen662Body = frozen662.slice(frozen662.indexOf(END) + END.length);
const oldLayoutStart = '// Google loads result-specific CSS in each fetched document.';
const oldInspectionStart = '// On-demand, read-only evidence for the current boundary classifier.';
const diagnosticsStart = '/* generic-google-result-diagnostics-v659 */';
const diagnosticsEnd = 'installGenericGoogleResultDiagnosticsV659("6.62.0");\n';
for (const marker of [oldLayoutStart, oldInspectionStart, diagnosticsStart, diagnosticsEnd]) {
  assert.equal(frozen662Body.split(marker).length, 2, 'Frozen v6.62 module boundary must be unique');
}
const frozenLayout = frozen662Body.slice(frozen662Body.indexOf(oldLayoutStart), frozen662Body.indexOf(oldInspectionStart)).trimEnd();
const frozenWithoutDiagnostics = frozen662Body.slice(0, frozen662Body.indexOf(oldInspectionStart)) +
  frozen662Body.slice(frozen662Body.indexOf(diagnosticsEnd) + diagnosticsEnd.length);
let restored662 = executable.replace(googleLayout, frozenLayout).replace(googleStaging + '\n', '');
for (const [from, to] of GOOGLE_STAGING_REPLACEMENTS) {
  assert.equal(restored662.split(to).length, 2, 'Google staging restoration boundary must be unique');
  restored662 = restored662.replace(to, from);
}
assert.equal(restored662, frozenWithoutDiagnostics, 'Only named Google display fixes and diagnostic removal may differ from v6.62');
let restored = executable.slice(prefix.length).replace(helper + '\n', '').replace(REALTIME_GUARD, '').replace(PRODUCT_GUARD, '');
assert.equal(restored.split(googleLayout).length, 2);
restored = restored.replace(googleLayout + '\n', '').replace(googleStaging + '\n', '');
for (const [from, to] of GOOGLE_LAYOUT_REPLACEMENTS) {
  assert.equal(restored.split(to).length, 2);
  restored = restored.replace(to, from);
}
for (const [from, to] of GOOGLE_STAGING_REPLACEMENTS) {
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
