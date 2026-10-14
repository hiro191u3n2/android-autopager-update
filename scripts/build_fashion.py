"""Build v6.41 while preserving every pre-existing site module byte for byte."""
from pathlib import Path
import re,hashlib,subprocess
root=Path(__file__).resolve().parents[1]
source=(root/'Android_Generic_AutoPager_v6.40.js').read_text()
blob=hashlib.sha1(b'blob '+str(len(source.encode())).encode()+b'\0'+source.encode()).hexdigest()
assert blob=='8947ffcb765c0dea78498b2ecc84e01930d528d7', 'Baseline changed; rebase before release'
end=source.index('// ==/UserScript==')+len('// ==/UserScript==')
header,original=source[:end],source[end:]
header=re.sub(r'(?m)^(// @version\s+)6\.40\.0$',r'\g<1>6.41.0',header)
header=header.replace('// @description  ','// @description  PAL CLOSET・atomicboxx・CITYHILL商品一覧の自動ページ追加。色違い維持・複数検索条件・動的商品表示に対応。',1)
needle='function e(){if(/^(?:www\\.)?rlab-store\\.jp$/i.test(location.hostname))return;'
guard='if(window.__genericFashionAutoPagerV641)return;'
assert original.count(needle)==1
body=original.replace(needle,'function e(){'+guard+needle[len('function e(){'):],1)
assert body.replace(guard,'',1)==original
module=(root/'src/fashion-autopager.js').read_text()
result=header+'\n\n'+module+body
assert result.count('// @version')==1
for name in ['android-generic-autopager.user.js','Android_Generic_AutoPager_v6.41.js']:
 (root/name).write_text(result)
 subprocess.run(['node','--check',str(root/name)],check=True)
(root/'android-generic-autopager.meta.js').write_text(header+'\n')
index=root/'index.html'
if index.exists():index.write_text(index.read_text().replace('v6.40.0','v6.41.0'))
print('BUILD PASS: baseline hash matched; unrelated site modules preserved; SHA256',hashlib.sha256(result.encode()).hexdigest())
