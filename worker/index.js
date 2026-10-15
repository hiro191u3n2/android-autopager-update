// Reconstructed local packaging source, approved 2026-10-16 (Asia/Tokyo).
// This is a Node build adapter; it is NOT deployed to the retired Sites host.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const VERSION = '6.46.0';
export const BASELINE_BLOB = 'ee0c1d906375c7d34ebc3046719abef10d42c7ae';
export const CORE_START = 'function e(){if(window.__genericFashionAutoPagerV641)return;';
export const REALTIME_GUARD = 'if(/^search\\.yahoo\\.co\\.jp$/i.test(location.hostname)&&/^\\/realtime\\/search\\/?$/i.test(location.pathname))return;';
export const PRODUCT_GUARD = 'if(isGenericFashionProductPageV646())return;';
export const COMMERCE_IMAGE_REPLACEMENTS = [
  ['function _(t,e){if(!t)return!1;let n=!1;', 'function _(t,e){if(!t)return!1;const c=useGenericCommerceLazyImagesV646(t);let n=!1;'],
  [String.raw`i.setAttribute("loading",/(^|\.)buzzap\.jp$/i.test(location.hostname)?"lazy":"eager")`, String.raw`i.setAttribute("loading",/(^|\.)buzzap\.jp$/i.test(location.hostname)||c?"lazy":"eager")`],
];
// Exact original ranges are pinned so unrelated legacy features cannot drift.
export const MODULE_REPLACEMENTS = [
  { path: 'src/cityhill-autopager.js', marker: '/* generic-cityhill-product-autopager-v644 */', length: 25163, sha256: '5d78b160a166cf9ab2725ac7baa2b462bca090fde2469e98475db5f7fbe6ebd1' },
  { path: 'src/fashion-autopager.js', marker: '/* generic-fashion-product-autopager-v641 */', length: 20704, sha256: 'c8a9c1da5696c0828a0aa4c1d0c7d00e4a2460fb458dfd2f1eccbf9c9d94772a' },
  { path: 'src/rlab-autopager.js', marker: '/* generic-rlab-product-autopager-v640 */', length: 12926, sha256: '3a9977843a009eca38ec73418a40f21d5685493cf065c6812c261be7cfca132e' },
];
export const END = '// ==/UserScript==';
const root = new URL('../', import.meta.url);

export async function buildUserscript() {
  const bytes = await readFile(new URL('Android_Generic_AutoPager_v6.44.js', root));
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(blob, BASELINE_BLOB, 'Frozen v6.44 baseline changed; rebase before building');
  const baseline = bytes.toString('utf8');
  const end = baseline.indexOf(END) + END.length;
  const original = baseline.slice(end);
  assert.equal(original.split(CORE_START).length, 2, 'Generic core boundary is ambiguous');
  let body = original;
  for (const spec of MODULE_REPLACEMENTS) {
    assert.equal(body.split(spec.marker).length, 2, 'Ambiguous module: ' + spec.path);
    const start = body.indexOf(spec.marker), old = body.slice(start, start + spec.length);
    assert.equal(createHash('sha256').update(old).digest('hex'), spec.sha256, 'Baseline module mismatch: ' + spec.path);
    const replacement = (await readFile(new URL(spec.path, root), 'utf8')).trim();
    assert(replacement.startsWith(spec.marker) && replacement.endsWith('})();'));
    body = body.slice(0, start) + replacement + body.slice(start + spec.length);
  }
  const guardHelper = (await readFile(new URL('src/fashion-product-guard.js', root), 'utf8')).trim();
  body = body.replace(CORE_START, `${guardHelper}\nfunction e(){${REALTIME_GUARD}${PRODUCT_GUARD}${CORE_START.slice('function e(){'.length)}`);
  for (const [from, to] of COMMERCE_IMAGE_REPLACEMENTS) {
    assert.equal(body.split(from).length, 2, 'Generic image hydration boundary changed');
    body = body.replace(from, to);
  }
  let header = baseline.slice(0, end).replace(/^(\/\/ @version\s+)6\.44\.0$/m, `$1${VERSION}`);
  header = header.replace('// @description  ', '// @description  Yahooリアルタイム検索の「もっと見る」をスクロールで自動読込。公式ボタン利用・二重読込防止・エラー時の手動操作を維持。');
  header = header.replace('// @description  ', '// @description  服ブランド一覧のスクロール負荷を削減。商品詳細の誤ページ探索防止・CITYHILLサムネイルのタップ補助。');
  const module = await readFile(new URL('src/yahoo-realtime-autopager.js', root), 'utf8');
  assert(module.includes('__genericYahooRealtimeAutoPagerV645'));
  const gallery = await readFile(new URL('src/cityhill-gallery-compat.js', root), 'utf8');
  const output = `${header}\n\n${module.trim()}\n${gallery.trim()}\n${body}`;
  new Function(output);
  return output;
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/android-generic-autopager.user.js' || path === '/Android_Generic_AutoPager_v6.46.js') {
      return new Response(await buildUserscript(), { headers: { 'content-type': 'application/javascript; charset=utf-8' } });
    }
    if (path === '/android-generic-autopager.meta.js') {
      const script = await buildUserscript();
      return new Response(script.slice(0, script.indexOf(END) + END.length) + '\n');
    }
    return new Response('Not found', { status: 404 });
  },
};
