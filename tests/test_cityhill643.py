"""Synthetic mobile fixtures; never described as a live-site or Android test."""
import json, shutil, os
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ORIGIN=os.environ.get('CITYHILL_FIXTURE_ORIGIN','https://store.cityhill.co.jp'); BASE=ORIGIN+'/majesticlegon/item/preorder.html'
NEW=(ROOT/'android-generic-autopager.user.js').read_text(); OLD=(ROOT/'Android_Generic_AutoPager_v6.42.js').read_text()
def adapt(source):
    return source.replace(r'store\.cityhill\.co\.jp',r'127\.0\.0\.1') if ORIGIN.startswith('http://127.0.0.1') else source
NEW=adapt(NEW);OLD=adapt(OLD)
REPORT=[]
def products(n,total=182,size=50):
    start=(n-1)*size;end=min(total,n*size)
    return ''.join(f'<li class="product"><a href="/item/{100000+i//2}.html?cc={i%2}"><img data-original="/photos/{i}.svg" width="100" height="120"></a><p>Color {i%2} Product {i}</p><b>¥6,831</b></li>' for i in range(start,end))
def pager(n,mode='alias',pages=4):
    def control(k,label=None):
        label=label or str(k)
        target=f'search.html?pno={k}'+('' if mode=='implicit' else '&rsv=1') if mode not in ['same','tail','canonical','inner'] else f'preorder.html?pno={k}'
        if mode=='filter':target=f'search.html?pno={k}&rsv=1&color=red'
        if mode=='brand':target=f'/lecoeurblanc/item/search.html?pno={k}&rsv=1'
        if mode=='native':return f'<button onclick="go({k})">{label}</button>'
        if mode=='literal':return f'<li onclick="window.location.href=\'{target}\'">{label}</li>'
        return f'<a href="{target}">{label}</a>'
    out=''.join(f'<em>{k}</em>' if k==n else control(k) for k in range(1,pages+1))
    if n<pages and mode not in ['native','literal']:
        out+=control(n+1,'<i class="icon-arrow-right"></i>')
    cls='rounds' if mode=='native' else 'page_navi'
    return f'<div class="{cls}" id="pages">{out}</div>'
def html(n,mode='alias',total=182,size=50):
    pages=(total+size-1)//size
    controls=pager(n,mode,pages);script=''
    if mode=='delay':
        script=f'setTimeout(()=>document.querySelector("main").insertAdjacentHTML("beforeend",{json.dumps(controls)}),650);'; controls=''
    if mode=='native':
        batches={str(k):products(k,total,size) for k in range(1,pages+1)};navs={str(k):pager(k,mode,pages) for k in range(1,pages+1)}
        script=f'const batches={json.dumps(batches)},navs={json.dumps(navs)};function go(n){{setTimeout(()=>{{document.querySelector(".products").innerHTML=batches[n];document.querySelector("#pages").outerHTML=navs[n];}},150)}}'
    # A real terminal numeric pager avoids requiring a frame just because analytics scripts exist.
    if not script:script='window.fixtureLoaded=true;'
    body=f'<main><div>182件</div><ul class="products item-list">{products(n,total,size)}</ul>{controls}</main><section class="recommend"><h2>こんなアイテムがチェックされています</h2><ul><li><a href="/item/999999.html">Recommended only</a></li></ul></section><footer>footer</footer>'
    if mode=='inner':body='<div id="scrollbox">'+body+'</div>'
    return f'''<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{{margin:0}}main{{padding:10px}}.products{{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;{'min-height:35000px;align-content:start;' if mode=='tail' else ''}}}.product{{height:180px;overflow:hidden}}img{{width:100px;height:120px}}p{{margin:0}}.page_navi,.rounds{{display:flex;gap:12px;padding:30px}}.icon-arrow-right{{display:inline-block;width:20px;height:20px;border-right:2px solid;border-top:2px solid;transform:rotate(45deg)}}.recommend{{height:2000px}}footer{{height:3000px}}#scrollbox{{height:850px;overflow:auto}}</style>{body}<script>{script}</script>'''
def check(ok,msg='assertion failed'):
    if not ok:raise AssertionError(msg)
def scroll(p,mode):
    p.evaluate('''(mode)=>{const el=document.querySelector('.products > li:last-child');if(mode==='inner'){const box=document.querySelector('#scrollbox');box.scrollTop+=el.getBoundingClientRect().bottom-box.getBoundingClientRect().bottom;}else window.scrollTo(0,el.getBoundingClientRect().bottom+scrollY-innerHeight+5);}''',mode)
def case(browser,name,mode='alias',old=False,total=182,size=50,stop=False,url=BASE,forbidden=False):
    requests=[];errors=[];ctx=browser.new_context(viewport={'width':412,'height':915},is_mobile=True)
    p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.add_init_script(OLD if old else NEW)
    def handler(r):
        u=urlparse(r.request.url);qs=parse_qs(u.query);n=int(qs.get('pno',['1'])[0])
        if '/photos/' in u.path:
            r.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"/>');return
        requests.append({'url':r.request.url,'type':r.request.resource_type})
        if forbidden and n>1 and r.request.resource_type=='fetch':r.fulfill(status=403,body='Forbidden');return
        if mode=='canonical' and n>1 and u.path.endswith('preorder.html'):
            r.fulfill(status=302,headers={'location':ORIGIN+'/majesticlegon/item/search.html?pno='+str(n)+'&rsv=1'});return
        r.fulfill(status=200,content_type='text/html; charset=utf-8',body=html(n,mode,total,size))
    p.route('**/*',handler)
    try:
        p.goto(url,wait_until='domcontentloaded');p.wait_for_timeout(250)
        if stop or old:
            scroll(p,mode);p.wait_for_timeout(1800)
            check(p.locator('.products > li').count()==min(total,size),'unexpected append')
            check(len(requests)==1,'unexpected request '+str(requests))
        else:
            pages=(total+size-1)//size
            for n in range(2,pages+1):
                scroll(p,mode)
                p.wait_for_function('(n)=>document.querySelectorAll(".products > li").length>=n',arg=min(n*size,total),timeout=14000)
            scroll(p,mode);p.wait_for_timeout(650)
            check(p.locator('.products > li').count()==total,'wrong item count')
            check(p.locator('.recommend li').count()==1,'recommendations changed')
            check(p.url==url,'visible page navigated')
            keys=p.locator('.products > li a').evaluate_all('(es)=>es.map(e=>e.href)')
            check(len(set(keys))==total,'colors collapsed or duplicate products')
            check(p.locator('li[data-generic-fashion-page] img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0&&!e.hasAttribute("data-original"))'),'images not hydrated')
            if mode=='implicit':check(all('rsv=1' in r['url'] for r in requests[1:]),'reservation flag lost')
            if '?tag=' in url:check(all(parse_qs(urlparse(r['url']).query).get('tag')==['a','b'] for r in requests[1:]),'multi-value filters lost')
            if forbidden:check(any(r['type']=='document' and 'pno=2' in r['url'] for r in requests),'no frame fallback')
            if mode=='alias' and not forbidden:check(sum(r['type']=='document' for r in requests)==1,'unnecessary final-page frame')
        check(not errors,str(errors))
        REPORT.append({'name':name,'status':'pass','cards':p.locator('.products > li').count(),'requests':requests})
        print('PASS',name,flush=True)
    except Exception as e:
        REPORT.append({'name':name,'status':'FAIL','error':str(e),'requests':requests,'diagnostics':p.evaluate('window.__genericCityhillAutoPagerDiagnostics||null'),'browser_errors':errors})
        print(json.dumps(REPORT[-1],ensure_ascii=False),flush=True);raise
    finally:ctx.close()
def units(browser):
    module=(ROOT/'src/cityhill-autopager.js').read_text().replace('  const log=[];', '  window.__cityTests={forwardURL,equivalentPage};const log=[];')
    ctx=browser.new_context();p=ctx.new_page();p.route('**/*',lambda r:r.fulfill(status=200,content_type='text/html',body='<body>test</body>'));p.add_init_script(adapt(module));p.goto(BASE)
    checks=[
        ('alias adds reservation','t.forwardURL("search.html?pno=2",location.href).url.includes("rsv=1")'),
        ('reservation removal rejected','t.forwardURL("search.html?pno=2&rsv=0",location.href)===null'),
        ('cross brand rejected','t.forwardURL("/lecoeurblanc/item/search.html?pno=2&rsv=1",location.href)===null'),
        ('cross origin rejected','t.forwardURL("https://evil.invalid/majesticlegon/item/preorder.html?pno=2",location.href)===null'),
        ('no guessed page without page evidence','t.forwardURL("search.html?rsv=1",location.href)===null'),
        ('wrong filters rejected','t.forwardURL("?pno=2&color=red",location.href+"?color=blue")===null'),
        ('canonical same-page redirect','t.equivalentPage(location.href+"?pno=2",new URL("search.html?pno=2&rsv=1",location.href).href)'),
        ('redirect cannot skip page','!t.equivalentPage(location.href+"?pno=2",new URL("search.html?pno=3&rsv=1",location.href).href)'),
        ('redirect cannot drop filters','!t.equivalentPage(location.href+"?pno=2&color=blue",new URL("search.html?pno=2&rsv=1",location.href).href)'),
        ('sales listing not mixed','t.forwardURL("sale.html?pno=2",location.href)===null'),
    ]
    for name,expression in checks:
        check(p.evaluate('()=>{const t=window.__cityTests;return '+expression+';}'),name)
        REPORT.append({'name':name,'status':'pass'});print('PASS',name,flush=True)
    ctx.close()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
    try:
        units(browser)
        case(browser,'v6.42 reproduces preorder to search stop',old=True)
        case(browser,'182 products, 50 to 100 to 150 to 182; cc colors retained')
        case(browser,'implicit reservation filter on search alias',mode='implicit',total=12,size=4)
        case(browser,'unlabelled numeric JavaScript pager',mode='native',total=12,size=4)
        case(browser,'literal location handler on li',mode='literal',total=12,size=4)
        case(browser,'product tail instead of oversized wrapper',mode='tail',total=12,size=4)
        case(browser,'nested scroll container',mode='inner',total=90,size=30)
        case(browser,'late pager insertion',mode='delay',total=12,size=4)
        case(browser,'canonical reservation redirect',mode='canonical',total=12,size=4)
        case(browser,'same route legacy page numbers',mode='same',total=12,size=4)
        case(browser,'fetch forbidden uses native same-origin frame',forbidden=True,total=12,size=4)
        case(browser,'multiple filters preserved',url=BASE+'?tag=a&tag=b&color=blue',total=12,size=4)
        case(browser,'filter-changing link refused',mode='filter',url=BASE+'?color=blue',stop=True)
        case(browser,'other brand refused',mode='brand',stop=True)
        case(browser,'one-page list never requests nonexistent next',total=32,size=50,stop=True)
    finally:
        browser.close();(ROOT/'test-results').mkdir(exist_ok=True)
        report={'environment':'Synthetic mobile Chromium, not live CITYHILL or Android AdGuard','passed':sum(r['status']=='pass' for r in REPORT),'failed':sum(r['status']!='pass' for r in REPORT),'tests':REPORT}
        (ROOT/'test-results/cityhill643-fixtures.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('ALL PASS',len(REPORT),flush=True)
