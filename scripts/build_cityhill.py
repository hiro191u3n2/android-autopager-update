"""Build CITYHILL v6.42 without changing the existing v6.41 site modules."""
from pathlib import Path
import re,hashlib,subprocess,json
root=Path(__file__).resolve().parents[1]
source=(root/'Android_Generic_AutoPager_v6.41.js').read_bytes()
assert hashlib.sha1(b'blob '+str(len(source)).encode()+b'\0'+source).hexdigest()=='15fb1fd449f8b5e1d9a5b52e5a8eea560bdea324','Baseline changed'
s=source.decode();end=s.index('// ==/UserScript==')+len('// ==/UserScript==')
header,body=s[:end],s[end:]
header=re.sub(r'(?m)^(// @version\s+)6\.41\.0$',r'\g<1>6.42.0',header)
header=header.replace('// @description  ','// @description  CITYHILL検索一覧のスマホ用URL・相対商品リンク・ページナビ・JS式次ページ・遅延描画・取得失敗時の再試行に対応。',1)
module_path=root/'src/cityhill-autopager.js'
module=module_path.read_text()
# Idempotent migration of the staged v6.42 source: a parsed document cannot run
# delayed pagination scripts. Retain a live frame document for these pages.
old="      if(l&&cards(l,control.url).some(el=>!seen.has(itemKey(el,control.url))))return {doc,list:l,url:control.url};"
new="""      if(l&&cards(l,control.url).some(el=>!seen.has(itemKey(el,control.url)))) {
        const scripted=[...doc.querySelectorAll('script')].some(s=>/^(?:|module|text\\/javascript|application\\/javascript)$/i.test(s.type||'')&&(s.src||s.textContent.trim()));
        if(!nextControl(doc,control.url)&&scripted)return rendered(control,signal);
        return {doc,list:l,url:control.url};
      }"""
if old in module:
 assert module.count(old)==1
 module=module.replace(old,new,1);module_path.write_text(module)
assert new in module,'Delayed pagination migration missing'
result=header+'\n\n'+module+body
assert result.endswith(body) and result.count('// @version')==1
for name in ['android-generic-autopager.user.js','Android_Generic_AutoPager_v6.42.js']:
 (root/name).write_text(result);subprocess.run(['node','--check',str(root/name)],check=True)
(root/'android-generic-autopager.meta.js').write_text(header+'\n')
index=root/'index.html'
if index.exists():index.write_text(index.read_text().replace('v6.41.0','v6.42.0'))
(root/'test-results').mkdir(exist_ok=True)
report={'version':'6.42.0','baseline_git_sha':'15fb1fd449f8b5e1d9a5b52e5a8eea560bdea324','existing_modules_byte_identical':True,'syntax':'pass','sha256':hashlib.sha256(result.encode()).hexdigest()}
(root/'test-results/cityhill-build.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
