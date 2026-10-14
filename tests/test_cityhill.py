"""Mobile Chromium synthetic fixtures, not proof of live CITYHILL behavior."""
import json,shutil,os
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'android-generic-autopager.user.js').read_text()
OLD=(ROOT/'Android_Generic_AutoPager_v6.41.js').read_text()
ORIGIN=os.environ.get('CITYHILL_FIXTURE_ORIGIN','https://store.cityhill.co.jp')
if ORIGIN!='https://store.cityhill.co.jp':
    SOURCE=SOURCE.replace(r'store\.cityhill\.co\.jp',r'127\.0\.0\.1')
    OLD=OLD.replace(r'store\.cityhill\.co\.jp',r'127\.0\.0\.1')
BASE=ORIGIN+'/majesticlegon/item/search.html'
RESULTS=[]
def items(n,count=3,relative=False,offset=0):
    result=''
    for i in range(count):
        ident=100000+offset+(n-1)*count+i
        href=f'{ident}.html' if relative else f'/item/{ident}.html'
        result+=f'<li class="product"><a href="{href}"><img data-original="/photos/{ident}.svg"></a><p><a href="{href}">Item {ident}</a></p><b>Y5000</b></li>'
    return result

def html(n=1,count=3,pages=3,pager='page_navi',relative=False,key='page',delay=False,mode='url',color='',tall=False,offset=0):
    if mode in ['js','numeric']:
        label='次へ' if mode=='js' else str(n+1)
        control=f'<span class="current">{n}</span>'+ (f'<a href="javascript:void(0)" onclick="go({n+1})">{label}</a>' if n<pages else '')
    elif mode=='more':control='<button onclick="more()">もっと見る</button>' if n<pages else ''
    else:control=f'<span class="current">{n}</span>'+ (f'<a href="?{key}={n+1}{color}">次へ</a>' if n<pages else '')
    controls=f'<div class="{pager}" id="pagingBox">{control}</div>';script=''
    if delay:script=f'setTimeout(()=>document.querySelector("main").insertAdjacentHTML("beforeend",{json.dumps(controls)}),1300);';controls=''
    if mode in ['js','more','numeric']:
        script+=f'let pageNumber=1;const batches={json.dumps({str(x):items(x,count,relative,offset) for x in range(1,pages+1)})};'
        if mode=='more':script+=f'''function more(){{setTimeout(()=>{{pageNumber++;document.querySelector('.products').insertAdjacentHTML('beforeend',batches[pageNumber]);if(pageNumber>={pages})document.querySelector('#pagingBox').innerHTML='';}},200)}}'''
        else:script+=f'''function go(n){{setTimeout(()=>{{pageNumber=n;document.querySelector('.products').innerHTML=batches[n];document.querySelector('#pagingBox').innerHTML='<span class="current">'+n+'</span>'+(n<{pages}?'<a href="javascript:void(0)" onclick="go('+(n+1)+')">次へ</a>':'');}},200)}}'''
    return f'''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{{margin:0}}main{{padding:12px}}.products{{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;list-style:none;padding:0;margin:0}}.product{{height:180px;overflow:hidden}}img{{width:100px;height:120px}}p{{margin:0}}footer{{height:{4000 if tall else 20}px}}</style><main><ul class="products item-list">{items(n,count,relative,offset)}</ul>{controls}</main><footer>footer</footer><script>{script}</script>'''

def check(x,message='assertion failed'):assert x,message

def case(browser,name,options=None,expect=9,source=SOURCE,url=BASE,action=None,verify=None,wait=11000,forbidden=False,repeat=False):
    opts=options or {};requests=[];errors=[]
    c=browser.new_context(viewport={'width':412,'height':900},is_mobile=True)
    p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.add_init_script(source)
    def route(r):
        u=urlparse(r.request.url)
        if '/photos/' in u.path:
            r.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"/>');return
        qs=parse_qs(u.query);n=int(qs.get(opts.get('key','page'),['1'])[0]);requests.append({'url':r.request.url,'type':r.request.resource_type,'page':n})
        if forbidden and n>1 and r.request.resource_type in ['fetch','xhr']:
            r.fulfill(status=403,content_type='text/html',body='Forbidden');return
        if repeat and n>1:n=1
        r.fulfill(status=200,content_type='text/html; charset=utf-8',body=html(n,**opts))
    p.route('**/*',route)
    try:
        p.goto(url,wait_until='domcontentloaded')
        if action:action(p,requests)
        if expect is not None:p.wait_for_function('(n)=>document.querySelectorAll(".products > li").length===n',arg=expect,timeout=wait)
        else:p.wait_for_timeout(2100)
        if verify:verify(p,requests)
        check(not errors,str(errors))
        result={'name':name,'status':'pass','cards':p.locator('.products > li').count(),'state':p.locator('html').get_attribute('data-generic-cityhill-autopager'),'requests':requests}
    except Exception as e:
        
        try:diag=p.evaluate('window.__genericCityhillAutoPagerDiagnostics || null')
        except Exception:diag=None
        result={'name':name,'status':'FAIL','error':str(e),'browser_errors':errors,'requests':requests,'diagnostics':diag}
        print(json.dumps(result,ensure_ascii=False),flush=True);RESULTS.append(result);c.close();raise
    RESULTS.append(result);print('PASS',name,flush=True);c.close()

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
    try:
        case(b,'old v6.41 reproduces page_navi stop',source=OLD,expect=None,verify=lambda p,r:check(p.locator('.products > li').count()==3 and len(r)==1))
        case(b,'old v6.41 reproduces relative-link stop',source=OLD,options={'relative':True,'pager':'pagination'},expect=None,verify=lambda p,r:check(p.locator('.products > li').count()==3 and len(r)==1))
        case(b,'page_navi three pages')
        case(b,'relative product links',options={'relative':True})
        case(b,'mobile /sp listing',url=BASE.replace('/majesticlegon/','/sp/majesticlegon/'))
        case(b,'preorder listing',url=BASE.replace('search.html','preorder.html'))
        case(b,'delayed pagination stays watched',options={'delay':True})
        case(b,'JavaScript-only pagination',options={'mode':'js'},verify=lambda p,r:check(p.url==BASE))
        case(b,'numeric JavaScript control',options={'mode':'numeric'})
        case(b,'load-more three pages',options={'mode':'more','pager':'loadMore'},verify=lambda p,r:check(p.url==BASE))
        case(b,'fetch 403 rendered fallback',forbidden=True,verify=lambda p,r:check(any(x['page']==2 and x['type']=='document' for x in r)))
        case(b,'pageNo parameter',options={'key':'pageNo'})
        case(b,'page_num parameter',options={'key':'page_num'})
        case(b,'pno parameter',options={'key':'pno'})
        case(b,'repeated filters preserved',url=BASE+'?color=blue&tag=a&tag=b',verify=lambda p,r:check(all('tag=a' in x['url'] and 'tag=b' in x['url'] and 'color=blue' in x['url'] for x in r)))
        case(b,'changed filters rejected',url=BASE+'?color=blue',options={'color':'&color=red'},expect=None,verify=lambda p,r:check(len(r)==1 and p.locator('.products > li').count()==3))
        case(b,'lazy images hydrated',verify=lambda p,r:check(p.locator('li[data-generic-fashion-page] img').evaluate_all('(es)=>es.every(e=>e.src.includes("/photos/") && !e.hasAttribute("data-original") && e.loading==="eager")')))
        case(b,'last page no repeat',options={'pages':1},expect=None,verify=lambda p,r:check(len(r)==1))
        case(b,'repeated first page stops',repeat=True,expect=None,action=lambda p,r:p.wait_for_timeout(3500),verify=lambda p,r:check(p.locator('.products > li').count()==3 and p.locator('html').get_attribute('data-generic-cityhill-autopager')=='duplicate'))
        def scroll(p,r):
            p.wait_for_timeout(600);check(len(r)==1,'loaded before approaching bottom')
            p.evaluate('window.scrollTo(0,800)');p.wait_for_function('document.querySelectorAll(".products > li").length>=60',timeout=6000)
            check(abs(p.evaluate('scrollY')-800)<2,'scroll jumped')
            p.evaluate('window.scrollTo(0,document.querySelector(".products").getBoundingClientRect().bottom+scrollY-900)')
        case(b,'list bottom before long footer; no jump',options={'count':30,'tall':True},expect=90,action=scroll)
        def replacement(p,r):
            p.wait_for_function('document.querySelectorAll(".products > li").length===9')
            p.evaluate('(s)=>document.querySelector("main").outerHTML=s', '<main><ul class="products item-list">'+items(1,offset=500)+'</ul><div class="page_navi"><span class="current">1</span><a href="?page=2">次へ</a></div></main>')
        case(b,'grid replacement restarts',action=replacement,expect=9,verify=lambda p,r:check(len(r)>=5))
        case(b,'product detail not intercepted',url=ORIGIN+'/item/100000.html',expect=None,verify=lambda p,r:check(p.evaluate('!window.__genericCityhillAutoPagerV642')))
    finally:
        b.close();(ROOT/'test-results').mkdir(exist_ok=True)
        report={'environment':'Mobile Chromium synthetic fixtures; not Android AdGuard or live site','passed':sum(x['status']=='pass' for x in RESULTS),'failed':sum(x['status']!='pass' for x in RESULTS),'tests':RESULTS}
        (ROOT/'test-results/cityhill-fixtures.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('ALL PASS',len(RESULTS),flush=True)
