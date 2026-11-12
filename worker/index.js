// Reconstructed local packaging source, approved 2026-10-16 (Asia/Tokyo).
// This is a Node build adapter; it is NOT deployed to the retired Sites host.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const VERSION = '6.65.0';
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
  ['function(t,e){for(const n of t.querySelectorAll("img"))', 'await async function(t,e){await captureGenericGoogleLayoutRequiredV662(t);for(const n of t.querySelectorAll("img"))'],
  ['const u=function(e,n,o){const i=document.createElement("section");', 'const u=await async function(e,n,o){const i=document.createElement("section");'],
  ['const u=document.importNode(e,!0);', 'const u=document.importNode(e,!0);if(r&&isGenericGoogleLayoutSourceV647(e)&&!await applyGenericGoogleLayoutV647(e,u))throw new Error("検索結果の表示が更新されました。再読み込みしてください");'],
  ['function y(t,e){if(!t?.querySelector)return!1;', 'function y(t,e){if(!t?.querySelector||hasGenericGoogleLayoutV647(t))return!1;'],
  ['function M(t){if(!t)return;', 'function M(t){if(!t||hasGenericGoogleLayoutV647(t))return;'],
  ['function _(t,e){if(!t)return!1;', 'function _(t,e){if(!t||hasGenericGoogleLayoutV647(t))return!1;'],
  ['o<=3&&r.size<=4&&e.push({card:n,titleInfo:t})', 'o<=3&&r.size<=4&&!hasGenericGoogleMultipleResultsV658(n)&&e.push({card:n,titleInfo:t})'],
  ['const m=()=>{r&&t.googleFixBrokenMultiImageRichResults&&(y(u,i),M(u))}', 'const m=()=>{r&&t.googleFixBrokenMultiImageRichResults&&(y(u,i),M(u));if(r)repairGenericGoogleResultBoundariesV658(u)}'],
];
// Keep Google titles and recurring tail controls settled before they are shown.
export const GOOGLE_STAGING_REPLACEMENTS = [
  ["if(!u||!u.childElementCount)throw new Error(\"追加できる本文がありません\");","if(!u||!u.childElementCount)throw new Error(\"追加できる本文がありません\");if(r){cleanGenericGoogleImportedTailV663(u);if(t.googleRestoreYouTubeOriginalTitles)await prepareGenericGoogleTitlesV663(u,S,C,v)}"],
  [",r&&t.googleRestoreYouTubeOriginalTitles&&async function(t){if(!t)return;const e=new Set,n=[];for(const i of t.querySelectorAll(\"a[href]\")){const o=S(i.getAttribute(\"href\")||i.href);if(!o)continue;let r=i;for(let e=0;r&&r!==t&&e<9&&!r.querySelector?.('h3,[role=\"heading\"]');e+=1)r=r.parentElement;if(!r||r===t||e.has(r))continue;e.add(r);const a=r.querySelector(\"h3\")||Array.from(r.querySelectorAll('[role=\"heading\"]')).find(t=>{const e=Number(t.getAttribute(\"aria-level\")||0);return!e||e>=2});if(!a)continue;const s=w(r,a);s&&v(a,s),n.push({titleElement:a,video:o})}let o=0;const r=Math.min(3,n.length);await Promise.all(Array.from({length:r},async()=>{for(;o<n.length;){const{titleElement:t,video:e}=n[o];o+=1;try{const n=await C(e);if(!n||!t.isConnected)continue;v(t,n)}catch{}}}))}(u);",";/* generic-google-titles-prepared-v663 */"],
  ["function(t){const e=l.nextUrl;if(e)for","function(t){if(r)return;const e=l.nextUrl;if(e)for"],
  ["function dt(t,e=\"\"){","function dt(t,e=\"\"){if(r)syncGenericGoogleTailV663(l.target,!l.paused&&!l.stopped&&!!l.nextUrl,l.nextUrl);"],
  ["function ut(){","function ut(){if(r)syncGenericGoogleTailV663(l.target,false,l.nextUrl);"],
  ["function mt(){","function mt(){if(r)syncGenericGoogleTailV663(l.target,false,l.nextUrl);"],
];
// Google keeps one prepared page ahead of the reader. Other sites retain their
// existing sentinel, delay and resume behavior exactly.
export const GOOGLE_READ_AHEAD_REPLACEMENTS = [
  [';async function f(){if(l.loading||l.paused||l.stopped)return;', ';const genericGoogleReadAheadV665=r?createGenericGoogleReadAheadV665(l,f):null;async function f(){if(l.loading||l.paused||l.stopped||genericGoogleReadAheadV665&&!genericGoogleReadAheadV665.valid())return;const googleReadAheadTicketV665=genericGoogleReadAheadV665?.ticket();'],
  ['(/(^|\\.)buzzap\\.jp$/i.test(location.hostname)&&"primary"===l.target?.id&&d?.parentNode===l.target?l.target.insertBefore(u,d):l.target.appendChild(u));', 'if(genericGoogleReadAheadV665&&(!genericGoogleReadAheadV665.valid(googleReadAheadTicketV665)||l.paused||l.stopped))return;(/(^|\\.)buzzap\\.jp$/i.test(location.hostname)&&"primary"===l.target?.id&&d?.parentNode===l.target?l.target.insertBefore(u,d):l.target.appendChild(u));if(genericGoogleReadAheadV665)genericGoogleReadAheadV665.appended(u);'],
  ['finally{o&&o(),l.loading=!1,setTimeout(()=>{', 'finally{o&&o(),l.loading=!1;if(genericGoogleReadAheadV665)genericGoogleReadAheadV665.schedule();else setTimeout(()=>{'],
  ['(()=>{const t=/(^|\\.)buzzap\\.jp$/i.test(location.hostname),e="IntersectionObserver"in window;', '(()=>{if(genericGoogleReadAheadV665)return;const t=/(^|\\.)buzzap\\.jp$/i.test(location.hostname),e="IntersectionObserver"in window;'],
  ['(dt(`自動 ${l.pages}/${t.maxPages}`),ct()<=h&&f())', '(dt(`自動 ${l.pages}/${t.maxPages}`),genericGoogleReadAheadV665?genericGoogleReadAheadV665.schedule():ct()<=h&&f())'],
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
  for (const [from, to] of GOOGLE_STAGING_REPLACEMENTS) {
    assert.equal(body.split(from).length, 2, 'Google staging boundary changed');
    body = body.replace(from, to);
  }
  for (const [from, to] of GOOGLE_LAYOUT_REPLACEMENTS) {
    assert.equal(body.split(from).length, 2, 'Google layout boundary changed');
    body = body.replace(from, to);
  }
  for (const [from, to] of GOOGLE_READ_AHEAD_REPLACEMENTS) {
    assert.equal(body.split(from).length, 2, 'Google read-ahead boundary changed');
    body = body.replace(from, to);
  }
  const googleLayout = (await readFile(new URL('src/google-import-layout.js', root), 'utf8')).trim();
  const googleStaging = (await readFile(new URL('src/google-import-staging.js', root), 'utf8')).trim();
  const googleReadAhead = (await readFile(new URL('src/google-read-ahead.js', root), 'utf8')).trim();
  assert.equal(body.split('function e(){').length, 2, 'Google layout helper boundary changed');
  body = body.replace('function e(){', `${googleLayout}\n${googleStaging}\n${googleReadAhead}\nfunction e(){`);
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
  header = header.replace('// @description  ', '// @description  Google検索の一覧直下に並ぶ結果の区切り欠落を修正。既存の余白へ区切りを描画し、表示間隔を維持。同じ見出し内の親ドメインのサイト名とサブドメインURLの二重計数を修正。');
  header = header.replace('// @description  ', '// @description  Google追加結果の区切り補修が背景色の違いだけで中止される問題を修正。既存の隙間へ明示的に描画し、細い枠線と結果の配置を維持。');
  header = header.replace('// @description  ', '// @description  Google追加ページの商品カードの横並び幅、角丸背景、星評価、在庫アイコンとCSSの区切りを保持。大きなページでも表示の引き継ぎを中止せず、非表示部分を省いて処理を分割。');
  header = header.replace('// @description  ', '// @description  Googleの同一枠内の検索結果の区切りを補修。自動追加中の末尾案内を整理し、YouTubeの見出しを追加前に確定。Google診断ログ機能を削除。');
  header = header.replace('// @description  ', '// @description  Google追加結果の接したカードと、PDF表示・折返し装飾を含むURL行で区切り補修から漏れる条件を修正。既存の余白内で描画し、結果の位置と高さを維持。');
  header = header.replace('// @description  ', '// @description  Googleのページ境界でスクロールが止まる待ち時間を軽減。次の1ページを先に準備し、閲覧位置に応じて先読みを継続。検索語の変更・一時停止・画面離脱時の古い結果の追加を防止。');
  const output = `${header}\n\n${googleCleanup.trim()}\n${module.trim()}\n${gallery.trim()}\n${body}`;
  new Function(output);
  return output;
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/android-generic-autopager.user.js' || path === '/Android_Generic_AutoPager_v6.63.js') {
      return new Response(await buildUserscript(), { headers: { 'content-type': 'application/javascript; charset=utf-8' } });
    }
    if (path === '/android-generic-autopager.meta.js') {
      const script = await buildUserscript();
      return new Response(script.slice(0, script.indexOf(END) + END.length) + '\n');
    }
    return new Response('Not found', { status: 404 });
  },
};
