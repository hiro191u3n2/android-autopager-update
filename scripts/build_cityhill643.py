"""Reproducible CITYHILL-only repair. No changes to other site adapters."""
from pathlib import Path
import re, hashlib, subprocess, json
ROOT=Path(__file__).resolve().parents[1]
baseline=(ROOT/'Android_Generic_AutoPager_v6.42.js').read_bytes()
assert hashlib.sha1(b'blob '+str(len(baseline)).encode()+b'\0'+baseline).hexdigest()=='03ccb28868a7c00dc0765046c16231fc58fbf3fb','Unexpected baseline'
s=baseline.decode(); start=s.index('/* generic-cityhill-product-autopager-v642 */'); end=s.index('/* generic-fashion-product-autopager-v641 */')
module=s[start:end]
def replace(old,new):
    global module
    assert module.count(old)==1, 'Missing/ambiguous replacement: '+old[:100]
    module=module.replace(old,new,1)
def function(name,next_name,new):
    global module
    a=module.index('  function '+name+'('); b=module.index('  function '+next_name+'(',a)
    module=module[:a]+new+'\n'+module[b:]
module=module.replace('v642','v643').replace('6.42.0','6.43.0').replace('__genericCityhillAutoPagerV642','__genericCityhillAutoPagerV643')
replace("const PAGE = /^(?:p|pg|page|pageno|page_no|pno|page_num|pagenum|page_number|pagenumber|pageindex|page_index|currentpage|current_page|start|offset)$/i;", "const PAGE = /^(?:p|pg|page|pageno|page_no|pno|pn|paged|page_num|pagenum|page_number|pagenumber|pageindex|page_index|currentpage|current_page|start|offset)$/i;")
replace("  const sameValues =", "  const CURRENT = '[aria-current=\"page\"],[aria-current=\"true\"],.current,.active,.is-current,.is-active,.on,.selected,.is-selected';\n  const CONTROL = 'a,button,input[type=\"button\"],input[type=\"submit\"],[role=\"button\"],[onclick],[data-page],[data-pno],[data-pageno]';\n  const sameValues =")
replace("/^(?:id|code|item_?id|item_?code|cl|colvar|color.*|clr|sku|variation.*)$/i", "/^(?:id|code|item_?id|item_?code|cc|colorno|color_no|cl|colvar|color.*|clr|sku|variation.*)$/i")
replace("['data-color','data-color-id','data-color-code','data-sku']", "['data-color','data-color-id','data-color-code','data-color-cd','data-cc','data-sku']")
# Keep only known same-brand listing aliases. Never turn reservation results into all items.
function('forwardURL','pagerControls',r'''  function forwardURL(raw,base,explicit=false) {
    try {
      if(!raw || /^\s*(?:#|javascript:)/i.test(raw))return null;
      const from=new URL(base),to=new URL(raw,base);
      if(!/^https?:$/.test(to.protocol)||to.origin!==from.origin||!listPath(to.pathname))return null;
      const f=route(from.pathname),t=route(to.pathname);
      if(f!==t) {
        const prefix=p=>p.slice(0,p.lastIndexOf('/')+1);
        const pre=p=>/\/preorder\.html$/i.test(p),search=p=>/\/search\.html$/i.test(p);
        if(prefix(f)!==prefix(t)||!((pre(f)&&search(t))||(search(f)&&pre(t))))return null;
        if((from.searchParams.has('rsv')&&from.searchParams.get('rsv')!=='1') ||
           (to.searchParams.has('rsv')&&to.searchParams.get('rsv')!=='1'))return null;
        // These aliases are permitted only when a real forward pagination link is present.
        to.searchParams.set('rsv','1');
      }
      let change=null,distance=Infinity;
      for(const k of to.searchParams.keys()) {
        if(!PAGE.test(k))continue;
        const v=NUM(to.searchParams.get(k));if(v===null)continue;
        const old=NUM(from.searchParams.get(k)) ?? (/start|offset|index/i.test(k)?0:1);
        const step=/start|offset/i.test(k)?(NUM(from.searchParams.get('rows')||from.searchParams.get('limit')||from.searchParams.get('count')||from.searchParams.get('ls'))||null):1;
        if(v>old&&((step&&v===old+step)||explicit)){change=k;distance=v-old;break;}
        if(explicit&&!from.searchParams.has(k)&&v===1){change=k;distance=1;break;}
      }
      if(!change)return null;
      for(const k of new Set(from.searchParams.keys())) {
        if(k===change)continue;
        if(to.searchParams.has(k)) {if(!sameValues(from.searchParams.getAll(k),to.searchParams.getAll(k)))return null;}
        else for(const v of from.searchParams.getAll(k))to.searchParams.append(k,v);
      }
      // preorder may also expose search.html links without the implicit reservation flag.
      if(/\/preorder\.html$/i.test(f)&&to.searchParams.has('rsv')&&to.searchParams.get('rsv')!=='1')return null;
      to.hash='';return {url:to.href,distance};
    } catch(_){return null;}
  }
  function controlURL(el) {
    for(const k of ['href','data-href','data-url']) {
      const raw=el.getAttribute(k);
      if(raw&&!/^\s*(?:#|javascript:)/i.test(raw))return raw;
    }
    // Extract literal navigation only. No eval or execution of scraped handler text.
    const code=(el.getAttribute('onclick')||'')+' '+(el.getAttribute('href')||'');
    const m=code.match(/(?:location(?:\.href)?\s*=\s*|location\.(?:assign|replace)\s*\(\s*)(["'])([^"']+)\1/i);
    return m?.[2]||null;
  }
  function pagerRoots(doc) {
    const roots=new Set(doc.querySelectorAll(PAGER));
    // Support unlabelled numeric pagers without treating product sizes/prices as navigation.
    for(const el of doc.querySelectorAll(CONTROL)) {
      if(!/^\d{1,4}$/.test(text(el))||el.closest(EXCLUDE)||el.querySelector('img,picture'))continue;
      let p=el.parentElement;
      for(let depth=0;p&&depth<3;depth++,p=p.parentElement) {
        if(p===doc.body||p.matches('main,header,footer,aside')||p.querySelector('img,picture'))break;
        const controls=[...p.querySelectorAll(CONTROL)].filter(n=>/^\d{1,4}$/.test(text(n)));
        const nums=new Set(controls.map(n=>NUM(text(n))));
        if(nums.size>=2&&text(p).length<180){roots.add(p);break;}
      }
    }
    return [...roots];
  }''')
function('pagerControls','nextControl',r'''  function pagerControls(doc) {
    return [...new Set(pagerRoots(doc).flatMap(p=>[...(p.matches(CONTROL)?[p]:[]),...p.querySelectorAll(CONTROL)]).concat([...doc.querySelectorAll('a[rel~="next"],button[rel~="next"]')]))]
      .filter(el=>!el.querySelector('a,button,input[type="button"],input[type="submit"]'));
  }
  function currentNumber(doc,base,roots) {
    for(const p of roots) {
      for(const el of p.querySelectorAll(CURRENT)) {
        if(!visible(el))continue;const n=NUM(text(el));if(n!==null)return n;
      }
      // Several templates use a bare span/strong for the current page, with no class.
      for(const el of p.querySelectorAll('span,strong,em,b,li')) {
        const n=NUM(text(el));if(n===null||!visible(el)||el.matches(CONTROL)||el.closest('a,button,[onclick]')||el.querySelector(CONTROL))continue;
        return n;
      }
    }
    const u=new URL(base);for(const [k,v] of u.searchParams)if(PAGE.test(k)&&!/start|offset|index/i.test(k)&&NUM(v)!==null)return NUM(v);
    return 1;
  }''')
function('nextControl','prepare',r'''  function nextControl(doc,base) {
    const roots=pagerRoots(doc),controls=pagerControls(doc),all=[...new Set([...doc.querySelectorAll('link[rel~="next"][href],a[href]'),...controls])],direct=[];
    const inPager=el=>roots.some(p=>p===el||p.contains(el));
    for(const a of all) {
      if(disabled(a)||(!a.matches('link')&&!visible(a)))continue;
      if(!a.matches('link[rel~="next"]')&&!inPager(a)&&!explicitNext(a)&&!/^\d+$/.test(text(a)))continue;
      const found=forwardURL(controlURL(a),base,explicitNext(a));
      if(found)direct.push({...found,node:a,priority:explicitNext(a)?0:1,kind:'url'});
    }
    direct.sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
    if(direct.length)return direct[0];
    const current=currentNumber(doc,base,roots);
    for(const el of controls) {
      if(disabled(el)||!visible(el)||el.closest(EXCLUDE))continue;
      const n=NUM(el.getAttribute('data-page')||el.getAttribute('data-pno')||el.getAttribute('data-pageno')||text(el));
      if(!explicitNext(el)&&n!==current+1)continue;
      const raw=controlURL(el);
      // A concrete URL that failed validation must never be activated as a native fallback.
      if(raw)continue;
      const href=el.getAttribute('href');
      if(href&&!/^\s*(?:#|javascript:)/i.test(href))continue;
      return {kind:'native',node:el,url:null};
    }
    const l=listing(doc,base);
    if(l)for(const el of doc.querySelectorAll('button,a,[role="button"]')) {
      if(disabled(el)||!visible(el)||el.closest(EXCLUDE)||l.contains(el))continue;
      const label=text(el)||el.getAttribute('aria-label')||'';
      if(!/^(?:もっと(?:見る|表示|読み込む)|さらに(?:表示|読み込む)|次の\s*\d+\s*件(?:を表示)?|load\s*more|show\s*more)$/i.test(label))continue;
      if(!(l.compareDocumentPosition(el)&4))continue;
      const href=controlURL(el)||el.getAttribute('href');if(href&&!/^\s*(?:#|javascript:)/i.test(href))continue;
      return {kind:'native',node:el,url:null};
    }
    return null;
  }''')
# The last product is the trigger, not a tall wrapper/recommendation area. Capture inner scrolling too.
replace("    const bottom=list.getBoundingClientRect().bottom;\n    if(visible(list)&&bottom<=innerHeight+PRELOAD)void load(next);",r'''    const tail=cards(list,location.href).filter(visible).slice(-2);
    const edge=tail.length?Math.max(...tail.map(el=>el.getBoundingClientRect().bottom)):list.getBoundingClientRect().bottom;
    const pager=next.node?.ownerDocument===document&&visible(next.node)?next.node.getBoundingClientRect():null;
    if(visible(list)&&(edge<=innerHeight+PRELOAD||(pager&&pager.top>=0&&pager.top<=innerHeight+PRELOAD)))void load(next);''')
replace("    document.addEventListener('visibilitychange',schedule);setInterval(schedule,1800);schedule();", "    document.addEventListener('scroll',schedule,{passive:true,capture:true});\n    document.addEventListener('visibilitychange',schedule);setInterval(schedule,1800);schedule();")
# Canonical redirects are allowed only for the exact same page and filters.
replace("  function controlURL(el) {", r'''  function equivalentPage(a,b) {
    try {
      const x=new URL(a),y=new URL(b);if(x.origin!==y.origin)return false;
      x.pathname=route(x.pathname);y.pathname=route(y.pathname);
      if(x.pathname!==y.pathname) {
        const prefix=p=>p.slice(0,p.lastIndexOf('/')+1);
        if(prefix(x.pathname)!==prefix(y.pathname)||
           !([x.pathname,y.pathname].some(p=>/\/preorder\.html$/i.test(p))&&
             [x.pathname,y.pathname].some(p=>/\/search\.html$/i.test(p))))return false;
        for(const u of [x,y]) {
          if(u.searchParams.has('rsv')&&u.searchParams.get('rsv')!=='1')return false;
          u.pathname=u.pathname.replace(/preorder\.html$/i,'search.html');u.searchParams.set('rsv','1');
        }
      }
      return keyURL(x.href)===keyURL(y.href);
    }catch(_){return false;}
  }
  function controlURL(el) {''')
replace("await waitFrame(signal,r=>route(new URL(r.url).pathname)===route(new URL(target).pathname));", "await waitFrame(signal,r=>equivalentPage(r.url,target));")
replace("      if(r.url&&keyURL(r.url)!==keyURL(control.url))throw new Error('Unexpected redirect');", "      const pageURL=r.url||control.url;\n      if(!equivalentPage(pageURL,control.url))throw new Error('Unexpected redirect');")
replace("const doc=new DOMParser().parseFromString(await r.text(),'text/html'),l=listing(doc,control.url);", "const doc=new DOMParser().parseFromString(await r.text(),'text/html'),l=listing(doc,pageURL);")
replace("if(l&&cards(l,control.url).some(el=>!seen.has(itemKey(el,control.url))))", "if(l&&cards(l,pageURL).some(el=>!seen.has(itemKey(el,pageURL))))")
replace("if(!nextControl(doc,control.url)&&scripted)return rendered(control,signal);\n        return {doc,list:l,url:control.url};", r'''const following=nextControl(doc,pageURL),roots=pagerRoots(doc);
        const current=currentNumber(doc,pageURL,roots),controls=pagerControls(doc);
        const terminal=controls.length>0&&controls.some(el=>NUM(text(el))!==null)&&
          controls.every(el=>disabled(el)||(!explicitNext(el)&&(NUM(text(el))===null||NUM(text(el))<=current)));
        if(!following&&scripted&&!terminal)return rendered({...control,url:pageURL},signal);
        return {doc,list:l,url:pageURL};''')
# Better local diagnostic snapshot without external telemetry, storage of product data or UI banners.
replace("window.__genericCityhillAutoPagerDiagnostics={version:'6.43.0',state,events:log.slice()};", "window.__genericCityhillAutoPagerDiagnostics={version:'6.43.0',state,items:seen.size,page:pageCount,nextMode:next?.kind||null,events:log.slice()};")
header=s[:start].replace('6.42.0','6.43.0')
header=header.replace('// @description  ','// @description  CITYHILL予約一覧の検索URL型ページ送り・番号のみ/装飾矢印・色違いcc・商品末尾/内部スクロール検知を修正。',1)
result=header+module+s[end:]
assert result[result.index('/* generic-fashion-product-autopager-v641 */'):]==s[end:]
(ROOT/'src').mkdir(exist_ok=True)
(ROOT/'src/cityhill-autopager.js').write_text(module.rstrip()+'\n')
for name in ['android-generic-autopager.user.js','Android_Generic_AutoPager_v6.43.js']:
    (ROOT/name).write_text(result);subprocess.run(['node','--check',str(ROOT/name)],check=True)
(ROOT/'android-generic-autopager.meta.js').write_text(result.split('// ==/UserScript==')[0]+'// ==/UserScript==\n')
index=ROOT/'index.html'
if index.exists():index.write_text(index.read_text().replace('v6.42.0','v6.43.0'))
report={'version':'6.43.0','syntax':'pass','other_modules_byte_identical':True,'sha256':hashlib.sha256(result.encode()).hexdigest(),'baseline_blob':'03ccb28868a7c00dc0765046c16231fc58fbf3fb','live_site':'not verified; 403 on external inspection','android_adguard':'not tested'}
(ROOT/'test-results').mkdir(exist_ok=True)
(ROOT/'test-results/cityhill643-build.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
