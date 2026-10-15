// Reconstructed local packaging source, approved 2026-10-16 (Asia/Tokyo).
// This is a Node build adapter; it is NOT deployed to the retired Sites host.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const VERSION = '6.45.0';
export const BASELINE_BLOB = 'ee0c1d906375c7d34ebc3046719abef10d42c7ae';
export const CORE_START = 'function e(){if(window.__genericFashionAutoPagerV641)return;';
export const REALTIME_GUARD = 'if(/^search\\.yahoo\\.co\\.jp$/i.test(location.hostname)&&/^\\/realtime\\/search\\/?$/i.test(location.pathname))return;';
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
  const body = original.replace(CORE_START, `function e(){${REALTIME_GUARD}${CORE_START.slice('function e(){'.length)}`);
  assert.equal(body.replace(REALTIME_GUARD, ''), original, 'Unrelated feature code changed');
  let header = baseline.slice(0, end).replace(/^(\/\/ @version\s+)6\.44\.0$/m, `$1${VERSION}`);
  header = header.replace('// @description  ', '// @description  Yahooリアルタイム検索の「もっと見る」をスクロールで自動読込。公式ボタン利用・二重読込防止・エラー時の手動操作を維持。');
  const module = await readFile(new URL('src/yahoo-realtime-autopager.js', root), 'utf8');
  assert(module.includes('__genericYahooRealtimeAutoPagerV645'));
  const output = `${header}\n\n${module.trim()}\n${body}`;
  new Function(output);
  return output;
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/android-generic-autopager.user.js' || path === '/Android_Generic_AutoPager_v6.45.js') {
      return new Response(await buildUserscript(), { headers: { 'content-type': 'application/javascript; charset=utf-8' } });
    }
    if (path === '/android-generic-autopager.meta.js') {
      const script = await buildUserscript();
      return new Response(script.slice(0, script.indexOf(END) + END.length) + '\n');
    }
    return new Response('Not found', { status: 404 });
  },
};
