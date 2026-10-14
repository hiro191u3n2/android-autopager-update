"""Rebuild v6.40 deterministically without touching unrelated site code."""
from pathlib import Path
import re, hashlib, subprocess
root = Path(__file__).resolve().parents[1]
archive = root / 'Android_Generic_AutoPager_v6.39.js'
source = archive.read_text() if archive.exists() else (root / 'baseline/android-generic-autopager.user.js').read_text()
assert hashlib.sha1(b'blob ' + str(len(source.encode())).encode() + b'\0' + source.encode()).hexdigest() == '85078e3f02a70934424143ae201b3c37052c553b', 'Unexpected baseline: review newer changes before rebuilding'
module = (root / 'src/rlab-autopager.js').read_text()
needle = 'function e(){const t={preloadPx:1400'
guard = r'if(/^(?:www\.)?rlab-store\.jp$/i.test(location.hostname))return;'
assert source.count(needle) == 1
end = source.index('// ==/UserScript==') + len('// ==/UserScript==')
header, original_body = source[:end], source[end:]
header = re.sub(r'(?m)^(// @version\s+)6\.39\.0$', r'\g<1>6.40.0', header)
header = header.replace('// @description  ', '// @description  Rlab store（ROJITA）の商品一覧末尾で次ページを自動追加。専用ページ送り・data-layzr画像・重複防止・最終ページ判定に対応。', 1)
body = original_body.replace(needle, 'function e(){' + guard + 'const t={preloadPx:1400', 1)
result = header + '\n\n' + module + body
assert body.replace(guard, '', 1) == original_body
assert result.count('// ==UserScript==') == 1 and result.count('// @version') == 1
for name in ['android-generic-autopager.user.js', 'Android_Generic_AutoPager_v6.40.js']:
    (root / name).write_text(result)
    subprocess.run(['node', '--check', str(root / name)], check=True)
(root / 'android-generic-autopager.meta.js').write_text(header + '\n')
index = root / 'index.html'
if index.exists(): index.write_text(index.read_text().replace('v6.39.0', 'v6.40.0'))
print('BUILD PASS', len(result.encode()), 'bytes; unrelated code is byte-for-byte preserved after removing the host guard')
