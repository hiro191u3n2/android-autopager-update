"""CITYHILL-only build from the reviewed 6.43 baseline; other adapters remain byte-identical."""
from pathlib import Path
import hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
baseline = (ROOT/'Android_Generic_AutoPager_v6.43.js').read_bytes()
blob = hashlib.sha1(b'blob '+str(len(baseline)).encode()+b'\0'+baseline).hexdigest()
assert blob == '625b722af213dbdaaeb3c21ad255e9a8ee92df37', 'Baseline changed; review before rebuilding'
s = baseline.decode()
a = s.index('/* generic-cityhill-product-autopager-v643 */')
b = s.index('/* generic-fashion-product-autopager-v641 */')
module = s[a:b].replace('v643','v644').replace('6.43.0','6.44.0').replace('__genericCityhillAutoPagerV643','__genericCityhillAutoPagerV644')
def replace(old,new):
    global module
    assert module.count(old)==1, 'Ambiguous replacement: '+old[:100]
    module=module.replace(old,new,1)
replace('''  function visible(el) {
    if (el.closest('[hidden],[aria-hidden="true"]')) return false;
    return !el.ownerDocument.defaultView || !!el.getClientRects().length;
  }''', '''  function elementRect(el) {
    let r=el.getBoundingClientRect();
    if(!r.width&&!r.height) {
      const range=el.ownerDocument.createRange();range.selectNodeContents(el);r=range.getBoundingClientRect();
    }
    return r;
  }
  function visible(el) {
    if (el.closest('[hidden],[aria-hidden="true"]')) return false;
    const view=el.ownerDocument.defaultView;
    if(!view)return true;
    const style=view.getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
    const r=elementRect(el);return !!(r.width||r.height);
  }''')
replace('  function listing(doc,base) {','''  function listing(doc,base,reference=null) {
    const fingerprint=e=>e?e.tagName+'#'+e.id+'.'+[...e.classList].filter(c=>!/^generic-|^lazy|^is-/i.test(c)).sort().join('.'):'';
    const affinity=e=>{
      if(!reference||e.tagName!==reference.tagName)return 0;
      let score=reference.id&&e.id===reference.id?100000:0;
      if(fingerprint(e)===fingerprint(reference))score+=10000;
      if(fingerprint(e.parentElement)===fingerprint(reference.parentElement))score+=4000;
      if(fingerprint(e.parentElement?.parentElement)===fingerprint(reference.parentElement?.parentElement))score+=1000;
      return score;
    };''')
replace('const n=Math.min(children.length,200)*20+', 'const n=affinity(el)+Math.min(children.length,200)*20+')
replace("      if(disabled(a)||(!a.matches('link')&&!visible(a)))continue;", "      if(disabled(a)||(!a.matches('link')&&(!visible(a)||a.closest(EXCLUDE))))continue;")
replace("      if(!a.matches('link[rel~=\"next\"]')&&!inPager(a)&&!explicitNext(a)&&!/^\\d+$/.test(text(a)))continue;\n      const found=forwardURL(controlURL(a),base,explicitNext(a));", """      const raw=controlURL(a),found=forwardURL(raw,base,explicitNext(a));
      const concretePno=found&&new URL(found.url).searchParams.has('pno');
      if(!concretePno&&!a.matches('link[rel~="next"]')&&!inPager(a)&&!explicitNext(a)&&!/^\\d+$/.test(text(a)))continue;""")
replace('listing(doc,doc.location.href);return l?', 'listing(doc,doc.location.href,list);return l?')
replace("parseFromString(await r.text(),'text/html'),l=listing(doc,pageURL);", "parseFromString(await r.text(),'text/html'),l=listing(doc,pageURL,list);")
replace('tail.map(el=>el.getBoundingClientRect().bottom)', 'tail.map(el=>elementRect(el).bottom)')
replace(')):list.getBoundingClientRect().bottom;', ')):elementRect(list).bottom;')
replace('next.node.getBoundingClientRect():null;', 'elementRect(next.node):null;')
replace("window.__genericCityhillAutoPagerDiagnostics={version:'6.44.0',state,items:seen.size,page:pageCount,nextMode:next?.kind||null,events:log.slice()};", "window.__genericCityhillAutoPagerDiagnostics={version:'6.44.0',state,items:seen.size,page:pageCount,sourceURL:base,nextURL:next?.url||null,list:list?{tag:list.tagName,id:list.id,className:list.className}:null,nextMode:next?.kind||null,events:log.slice()};")
replace('function schedule(){if(!paused&&!timer)timer=setTimeout(check,150);}', "function schedule(){if(!paused&&!timer)timer=setTimeout(()=>{try{check();}catch(e){timer=0;status('adapter-error',{error:String(e.message).slice(0,160)});}},150);}")
header=s[:a].replace('6.43.0','6.44.0')
header=header.replace('// @description  ','// @description  CITYHILLのpno実リンク・表示枠なし要素・取得先レイアウト照合を修正。追加失敗時は商品末尾の実リンクへ自動遷移。現在ページ番号の長押しでローカル診断。',1)
guard=(ROOT/'src/cityhill-pno-guard.js').read_text().rstrip()+'\n\n'
result=header+guard+module+s[b:]
assert result[result.index('/* generic-fashion-product-autopager-v641 */'):]==s[b:]
(ROOT/'src/cityhill-autopager.js').write_text(module.rstrip()+'\n')
for name in ['android-generic-autopager.user.js','Android_Generic_AutoPager_v6.44.js']:
    (ROOT/name).write_text(result)
    subprocess.run(['node','--check',str(ROOT/name)],check=True)
(ROOT/'android-generic-autopager.meta.js').write_text(result.split('// ==/UserScript==')[0]+'// ==/UserScript==\n')
index=ROOT/'index.html'
if index.exists():index.write_text(index.read_text().replace('v6.43.0','v6.44.0'))
r={'version':'6.44.0','syntax':'pass','other_adapters_byte_identical':True,'baseline_blob':blob,'sha256':hashlib.sha256(result.encode()).hexdigest(),'live_cityhill':'not verified','android_adguard':'not tested','fallback':'Existing next pno link only; normal full-page navigation after insertion stalls; disabled after successful append'}
(ROOT/'test-results').mkdir(exist_ok=True)
(ROOT/'test-results/cityhill644-build.json').write_text(json.dumps(r,indent=2))
print(json.dumps(r))
