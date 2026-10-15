"""Offline browser fixtures, not live-site or Android/AdGuard verification.
The harness substitutes a URL object for location and uses a local fetch fixture.
No host restrictions or browser policies are disabled.
"""
import json, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE='https://store.cityhill.co.jp/majesticlegon/item/preorder.html'
NEW=(ROOT/'android-generic-autopager.user.js').read_text()
OLD=(ROOT/'Android_Generic_AutoPager_v6.43.js').read_text()
GUARD=(ROOT/'src/cityhill-pno-guard.js').read_text()
REPORT=[]
PIXEL='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="100"/%3E'
def check(ok,message):
    if not ok: raise AssertionError(message)
def record(name,**data):
    REPORT.append(dict(name=name,status='pass',**data));print('PASS',name,flush=True)
def wrap(source,url=BASE):
    return '(()=>{const location=new URL('+json.dumps(url)+');location.assign=u=>window.__navigation.push(u);'+source+'})();'
def core(source):
    start=source.index('/* generic-cityhill-product-autopager-')
    return source[start:source.index('/* generic-fashion-product-autopager-v641 */')]
def helpers(source):
    s=core(source);s=s[:s.index('  const log=[];')]
    return s+'window.CITYTEST={forwardURL,nextControl,listing,visible};})();'
def new_page(browser,html='<main></main>'):
    p=browser.new_page(viewport={'width':412,'height':915})
    p.route('**/*',lambda r:r.abort())
    p.set_content(html)
    p.evaluate('window.__navigation=[];window.__requests=[]')
    return p
def simple(contents=False,icon=False):
    css='ul,ul a,.nav a{display:contents}' if contents else ''
    label='<i style="display:inline-block;width:25px;height:25px"></i>' if icon else '<span>2</span>'
    return '<!doctype html><style>'+css+'</style><main><ul class="products"><li><a href="/item/946711.html?cc=01"><span>商品A</span></a></li><li><a href="/item/946711.html?cc=02"><span>商品B</span></a></li></ul><div class="nav"><b>1</b><a href="search.html?rsv=1&pno=2">'+label+'</a></div></main>'
def product_rows(n,total=182,size=50,desktop=False):
    return ''.join(f'<li class="product"><a href="/item/{(900000 if desktop else 100000)+i//2}.html?cc={i%2}"><img src=\'{PIXEL}\'></a><span>商品{i}</span></li>' for i in range((n-1)*size,min(total,n*size)))
def listing_html(n,total=182,contents=False,dual=False):
    pages=(total+49)//50
    nav='<div class="page_navi" id="pages">'+''.join(f'<b>{k}</b>' if k==n else f'<a href="search.html?rsv=1&pno={k}"><span>{k}</span></a>' for k in range(1,pages+1))+'</div>'
    mobile=f'<section class="mobile"><ul class="products">{product_rows(n,total)}</ul></section>'
    desktop=f'<section class="desktop"><ul class="products">{product_rows(n,400,100,True)}</ul></section>' if dual else ''
    return '<!doctype html><style>body{margin:0}.desktop{display:none}.products{padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr}.product{height:170px}img{width:80px;height:100px}.page_navi{padding:25px;display:flex;gap:25px}.recommend{height:2500px}'+('.products a,.page_navi a{display:contents}' if contents else '')+'</style><main>'+desktop+mobile+nav+'</main><section class="recommend">おすすめ</section>'
def append_case(browser,name,contents=False,dual=False):
    fixtures={str(n):listing_html(n,contents=contents,dual=dual) for n in range(2,5)}
    p=new_page(browser,listing_html(1,contents=contents,dual=dual));errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.evaluate('(f)=>window.__fixtures=f',fixtures)
    fake_fetch='const fetch=async raw=>{const u=new URL(raw);window.__requests.push(u.href);const html=window.__fixtures[u.searchParams.get("pno")];if(!html)throw Error("Unexpected page");return new Response(html,{status:200,headers:{"content-type":"text/html"}});};'
    city=NEW[:NEW.index('/* generic-fashion-product-autopager-v641 */')]
    p.evaluate(wrap(fake_fetch+city));p.wait_for_timeout(300)
    counts=[50]
    for n in range(2,5):
        p.evaluate('()=>document.querySelector(".mobile .products > li:last-child").scrollIntoView({block:"end"})')
        p.wait_for_function('(n)=>document.querySelectorAll(".mobile .products > li").length===n',arg=min(182,n*50),timeout=5000)
        counts.append(p.locator('.mobile .products > li').count())
    p.evaluate('()=>document.querySelector("#pages").scrollIntoView({block:"center"})')
    p.wait_for_timeout(600)
    keys=p.locator('.mobile .products > li a').evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))')
    check(len(set(keys))==182,'duplicates or color loss')
    check(not any('/item/9' in x for x in keys),'desktop listing imported')
    check(p.evaluate('window.__navigation.length')==0,'guard navigated despite successful append')
    req=p.evaluate('window.__requests');check(len(req)==3,'wrong fetch count')
    check(all('rsv=1' in x for x in req),'reservation filter lost')
    check(not errors,str(errors))
    record(name,counts=counts,requests=req,visible_navigation=False);p.close()
def guard_case(browser,name,state=None,expected=True,url=BASE,scroll=True,offset=0,appended=False,top=False,link=None,back=False,gesture=False):
    target=link or 'search.html?rsv=1&pno='+str((int(url.split('pno=')[-1]) if 'pno=' in url else 1)+1)
    nav=f'<div class="numbers"><b>1</b><a href="{target}"><span>2</span></a></div>'
    html='<!doctype html><style>body{margin:0}.numbers{padding:30px}.spacer{height:2600px}.recommend{height:2000px}</style>'+(nav if top else '')+'<div class="spacer"></div>'+(nav if not top else '')+'<section class="recommend"></section>'
    p=new_page(browser,html)
    if state is not None:p.evaluate('(s)=>window.__genericCityhillAutoPagerDiagnostics=s',state)
    if appended:p.evaluate('()=>document.body.insertAdjacentHTML("beforeend",\'<i data-generic-fashion-page="2"></i>\')')
    if back:p.evaluate("()=>{performance.getEntriesByType=()=>[{type:'back_forward'}]}")
    p.evaluate(wrap(GUARD,url))
    if gesture:p.evaluate("window.dispatchEvent(new WheelEvent('wheel',{deltaY:30}))")
    if scroll:
        p.evaluate('()=>document.querySelector(".numbers").scrollIntoView({block:"center"})')
        if top:p.evaluate('window.scrollTo(0,50)')
    p.wait_for_timeout(650)
    p.evaluate('(offset)=>{const old=Date.now;Date.now=()=>old()+offset}',offset or 10000)
    p.wait_for_timeout(650)
    navs=p.evaluate('window.__navigation')
    check(bool(navs)==expected,name+': '+str(navs))
    if expected:check(len(navs)==1,'duplicate navigation')
    record(name,navigation=navs);p.close()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
    for version,source in [('6.43',OLD),('6.44',NEW)]:
        p=new_page(browser,simple());p.evaluate(wrap(helpers(source)))
        found=p.evaluate('(base)=>CITYTEST.forwardURL("search.html?rsv=1&pno=2",base)',BASE)
        check(found and found['url']==BASE.replace('preorder.html','search.html?rsv=1&pno=2'),'provided URL rejected')
        record(version+' accepts the exact user-provided URL');p.close()
    for version,source,expected in [('6.43',OLD,False),('6.44',NEW,True)]:
        p=new_page(browser,simple(contents=True));p.evaluate(wrap(helpers(source)))
        result=p.evaluate('(b)=>({list:!!CITYTEST.listing(document,b),next:!!CITYTEST.nextControl(document,b)})',BASE)
        check(result['list']==expected and result['next']==expected,str(result))
        record(version+' display-contents regression',detected=result);p.close()
    p=new_page(browser,simple(icon=True));p.evaluate(wrap(helpers(NEW)))
    check(p.evaluate('(b)=>!!CITYTEST.nextControl(document,b)',BASE),'unlabelled pno link missed')
    record('Concrete pno URL works without text, aria label, or pager class');p.close()
    append_case(browser,'182 synthetic items append 50/100/150/182')
    append_case(browser,'Boxless links append without navigation',contents=True)
    append_case(browser,'Fetched desktop/mobile duplicates match live mobile grid',dual=True)
    for name,state,kwargs in [
      ('Independent fallback when adapter did not start',None,{}),
      ('Fallback when product list is not recognized',{'page':1,'state':'waiting-list'},{}),
      ('Fallback after fetch/render retry',{'page':1,'state':'retry'},{}),
      ('Loading is not interrupted by short guard timeout',{'page':1,'state':'loading'},{'expected':False}),
      ('Loading cannot stall forever at bottom pager',{'page':1,'state':'loading'},{'offset':35000}),
      ('Successful append disarms fallback',{'page':2,'state':'waiting-controls'},{'expected':False}),
      ('Imported product marker independently disarms fallback',None,{'expected':False,'appended':True}),
      ('No auto-navigation without scrolling',None,{'expected':False,'scroll':False}),
      ('Top-only pagination must not auto-navigate',None,{'expected':False,'top':True}),
      ('Opening actual pno2 advances to actual pno3',None,{'url':BASE.replace('preorder.html','search.html?rsv=1&pno=2')}),
      ('Changed reservation filter is rejected',None,{'expected':False,'link':'search.html?rsv=0&pno=2'}),
      ('Another brand route is rejected',None,{'expected':False,'link':'/lecoeurblanc/item/search.html?rsv=1&pno=2'}),
      ('External next-page URL is rejected',None,{'expected':False,'link':'https://example.invalid/majesticlegon/item/search.html?rsv=1&pno=2'}),
      ('Extra category filter is rejected',None,{'expected':False,'link':'search.html?rsv=1&pno=2&cg=1'}),
      ('Duplicate page parameters are rejected',None,{'expected':False,'link':'search.html?rsv=1&pno=2&pno=3'}),
      ('Final page has no forward link',None,{'expected':False,'link':'search.html?rsv=1&pno=1'}),
    ]:guard_case(browser,name,state,**kwargs)
    p=new_page(browser,'<div class="numbers"><span>1</span><a href="search.html?rsv=1&pno=2">2</a></div>')
    p.evaluate('()=>{window.__prompts=[];window.prompt=(title,body)=>window.__prompts.push({title,body});}')
    p.evaluate(wrap(GUARD))
    p.locator('.numbers span').dispatch_event('contextmenu')
    prompts=p.evaluate('window.__prompts')
    check(len(prompts)==1,'long-press diagnostics unavailable')
    diagnostic=json.loads(prompts[0]['body'])
    check(diagnostic['version']=='6.44.0' and diagnostic['nextURL'].endswith('rsv=1&pno=2'),'diagnostic did not capture next link')
    check(not any(k in diagnostic for k in ['cookies','storage','products']),'unnecessary private data in diagnostic')
    record('Current page long-press opens local diagnostics without data upload');p.close()
    guard_case(browser,'Repeated filters and sort survive fallback',url=BASE+'?tag=a&tag=b&sort=price',link='search.html?rsv=1&pno=2')
    guard_case(browser,'Browser Back never automatically bounces forward',back=True,expected=False)
    guard_case(browser,'A fresh downward gesture re-enables fallback after Back',back=True,gesture=True)
    browser.close()
result={'kind':'offline Chromium synthetic fixtures; NOT real site or Android AdGuard','version':'6.44.0','passed':len(REPORT),'tests':REPORT}
(ROOT/'test-results').mkdir(exist_ok=True)
(ROOT/'test-results/cityhill644-tests.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(REPORT)}))
