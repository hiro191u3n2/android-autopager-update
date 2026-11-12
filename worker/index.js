// Reconstructed local packaging source, approved 2026-10-16 (Asia/Tokyo).
// This is a Node build adapter; it is NOT deployed to the retired Sites host.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const VERSION = '6.60.0';
export const GOOGLE_DIAGNOSTICS_INITIALIZER = `installGenericGoogleResultDiagnosticsV659(${JSON.stringify(VERSION)});`;
export const BASELINE_BLOB = 'ee0c1d906375c7d34ebc3046719abef10d42c7ae';
export const CORE_START = 'function e(){if(window.__genericFashionAutoPagerV641)return;';
export const REALTIME_GUARD = 'if(/^search\\.yahoo\\.co\\.jp$/i.test(location.hostname)&&/^\\/realtime\\/search\\/?$/i.test(location.pathname))return;';
export const PRODUCT_GUARD = 'if(isGenericFashionProductPageV646())return;';
export const COMMERCE_IMAGE_REPLACEMENTS = [
  ['function _(t,e){if(!t)return!1;let n=!1;', 'function _(t,e){if(!t)return!1;const c=useGenericCommerceLazyImagesV646(t);let n=!1;'],
  [String.raw`i.setAttribute("loading",/(^|\.)buzzap\.jp$/i.test(location.hostname)?"lazy":"eager")`, String.raw`i.setAttribute("loading",/(^|\.)buzzap\.jp$/i.test(location.hostname)||c?"lazy":"eager")`],
];
// Capture before legacy hydration exposes hidden images. Restore only the imported
// Google subtree; no source CSS is inserted into the first page.
export const GOOGLE_LAYOUT_REPLACEMENTS = [
  ['function(t,e){for(const n of t.querySelectorAll("img"))', 'function(t,e){captureGenericGoogleLayoutV647(t);for(const n of t.querySelectorAll("img"))'],
  ['const u=document.importNode(e,!0);', 'const u=document.importNode(e,!0);if(r)applyGenericGoogleLayoutV647(e,u);'],
  ['function y(t,e){if(!t?.querySelector)return!1;', 'function y(t,e){if(!t?.querySelector||hasGenericGoogleLayoutV647(t))return!1;'],
  ['function M(t){if(!t)return;', 'function M(t){if(!t||hasGenericGoogleLayoutV647(t))return;'],
  ['function _(t,e){if(!t)return!1;', 'function _(t,e){if(!t||hasGenericGoogleLayoutV647(t))return!1;'],
  ['o<=3&&r.size<=4&&e.push({card:n,titleInfo:t})', 'o<=3&&r.size<=4&&!hasGenericGoogleMultipleResultsV658(n)&&e.push({card:n,titleInfo:t})'],
  ['const m=()=>{r&&t.googleFixBrokenMultiImageRichResults&&(y(u,i),M(u))}', 'const m=()=>{r&&t.googleFixBrokenMultiImageRichResults&&(y(u,i),M(u));if(r)repairGenericGoogleResultBoundariesV658(u)}'],
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
  for (const [from, to] of GOOGLE_LAYOUT_REPLACEMENTS) {
    assert.equal(body.split(from).length, 2, 'Google layout boundary changed');
    body = body.replace(from, to);
  }
  const googleLayout = (await readFile(new URL('src/google-import-layout.js', root), 'utf8')).trim();
  const googleInspection = (await readFile(new URL('src/google-boundary-inspection.js', root), 'utf8')).trim();
  const googleDiagnostics = (await readFile(new URL('src/google-result-diagnostics.js', root), 'utf8')).trim();
  assert.equal(body.split('function e(){').length, 2, 'Google layout helper boundary changed');
  body = body.replace('function e(){', `${googleLayout}\n${googleInspection}\n${googleDiagnostics}\n${GOOGLE_DIAGNOSTICS_INITIALIZER}\nfunction e(){`);
  let header = baseline.slice(0, end).replace(/^(\/\/ @version\s+)6\.44\.0$/m, `$1${VERSION}`);
  header = header.replace('// @description  ', '// @description  Yahooリアルタイム検索の「もっと見る」をスクロールで自動読込。公式ボタン利用・二重読込防止・エラー時の手動操作を維持。');
  header = header.replace('// @description  ', '// @description  服ブランド一覧のスクロール負荷を削減。商品詳細の誤ページ探索防止・CITYHILLサムネイルのタップ補助。');
  header = header.replace('// @description  ', '// @description  Google追加ページの動画・商品・記事カードの表示崩れを修正。取得元の配置・配色・非表示状態を引き継ぎ、画像・再生ボタン・説明文の重なりと記事の誤変換を防止。');
  const module = await readFile(new URL('src/yahoo-realtime-autopager.js', root), 'utf8');
  assert(module.includes('__genericYahooRealtimeAutoPagerV645'));
  const gallery = await readFile(new URL('src/cityhill-gallery-compat.js', root), 'utf8');
  const googleCleanup = await readFile(new URL('src/google-search-cleanup.js', root), 'utf8');
  header = header.replace('// @description  ', '// @description  Google検索が白いままになる不具合を修正。表示設定の書き換え競合を制限し、ページ全体・検索欄・結果一覧の誤非表示を防止。補正案内・現在地帯・AI概要の非表示を継続。');
  header = header.replace('// @description  ', '// @description  Google検索語の再編集・日本語変換時の重さを修正。入力中の不要な走査を休止し、候補更新とキーボード表示による全結果再走査を除外。長い処理を分割し、検索確定後に自動再開。');
  header = header.replace('// @description  ', '// @description  Google追加ページの同じ枠内にある独立した検索結果の区切りを補修。サイトURLとリンクから境界を判定し、見出し形式や大きなページにも対応。複数結果を料金から商品1枚にまとめる誤変換を防止。');
  header = header.replace('// @description  ', '// @description  Google検索の一覧直下に並ぶ結果の区切り欠落を修正。既存の余白へ区切りを描画し、表示間隔を維持。同じ見出し内の親ドメインのサイト名とサブドメインURLの二重計数を修正。右下のページ表示を長押ししてローカル診断をコピーできます。');
  const output = `${header}\n\n${googleCleanup.trim()}\n${module.trim()}\n${gallery.trim()}\n${body}`;
  new Function(output);
  return output;
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/android-generic-autopager.user.js' || path === '/Android_Generic_AutoPager_v6.60.js') {
      return new Response(await buildUserscript(), { headers: { 'content-type': 'application/javascript; charset=utf-8' } });
    }
    if (path === '/android-generic-autopager.meta.js') {
      const script = await buildUserscript();
      return new Response(script.slice(0, script.indexOf(END) + END.length) + '\n');
    }
    return new Response('Not found', { status: 404 });
  },
};
