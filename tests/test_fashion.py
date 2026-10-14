"""Offline mobile-browser regressions; CITYHILL fixtures are synthetic, not live proof."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=(ROOT/'android-generic-autopager.user.js').read_text()
URLS={'pal':'https://www.palcloset.jp/display/display/?mode=zSearch&mcId=001011&b=olivedesolive&c=11&sex=&scId=', 'atomic':'https://atomicboxx.com/ap/s/s?rows=30&sort=fsdt+desc&fq=bd:AB000&fq=cc1:C','city':'https://store.cityhill.co.jp/majesticlegon/item/preorder.html?sort=new&brand=majesticlegon'}
IMG='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect width="300" height="400" fill="silver"/%3E%3C/svg%3E'
CSS='<style>body{margin:0}#item_list,#item_container,.item-list,.ix-content-list-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0;padding:0}#item_list>div,#item_container>li,.item-list>li,.ix-card-frame{height:310px;list-style:none;min-width:0}img{display:block;width:100%;height:240px;object-fit:cover}footer{height:3500px}a{display:block}</style>'
def product(site,i,color='01'):
 href=f'/display/item/P{i}/?cl={color}&b=olivedesolive' if site=='pal' else f'/ap/item/i/P{i}' if site=='atomic' else f'/item/{100000+i}.html'
 tag='div' if site=='pal' else 'li'; cls='ix-card-frame' if site=='pal' else 'item_list_item' if site=='atomic' else 'item'
 return f'<{tag} class="{cls}" data-cd="P{i}" data-bd="AB000"><a href="{href}"><img data-src="/img/{i}.png" src="{IMG.replace(chr(34),chr(39))}"><p>商品{i}</p><p>¥5000</p></a></{tag}>'
def html(site,n,last=3,repeat=False,conflict=False,pkey='page',enhanced=False,bridge=True):
 start=(n-1)*30 if not repeat else 0
 products=''.join(product(site,i) for i in range(start,start+30))
 if site=='pal':
  grid='<div id="item_pic_block"><div id="item_list">'+products+'</div></div>'
  pager='<div class="pager_wrap"><p class="pager_number"><a class="on" id="'+str(n)+'" href="#">'+str(n)+'</a>'+(f'<a id="{n+1}" href="#">{n+1}</a>' if n<last else '')+'</p></div>'
 elif site=='atomic':
  grid='<ul id="item_container" class="goods_list item_list"></ul>'
  nxt=f'https://atomicboxx.com/ap/s/s?fq=bd:AB000&fq=cc1:{"D" if conflict else "C"}&sort=fsdt+desc&start={n*30}&rows=30'
  pager=f'<ol class="pager"><li class="pager_number">{n}/{last}</li>'+ (f'<li class="pager_next"><a href="{nxt}">次へ</a></li>' if n<last else '')+'</ol>'
 else:
  grid='<ul class="item-list">'+products+'</ul>'
  pager='<div class="pagination"><ul class="pager">'+(f'<li class="next"><a href="?{pkey}={n+1}&sort={"old" if conflict else "new"}&brand=majesticlegon">次へ</a></li>' if n<last else '')+'</ul></div>'
 js=''
 if site=='atomic':
  js='setTimeout(()=>{document.querySelector("#item_container").innerHTML='+json.dumps(products)+';},180);'
  if bridge:
   js+='''window._={template(source){if(source==='PRODUCT')return function(data){return '<li class="item_list_item" data-cd="'+data.doc.cd+'" data-bd="AB000"><a href="/ap/item/i/'+data.doc.cd+'"><img data-original="/img/'+data.doc.cd+'.png"><p>'+data.doc.name+'</p><p>¥5000</p></a></li>';};return function(data){const n=data.start/data.rows+1;return '<li class="pager_number">'+n+'</li>'+(data.start+data.rows<data.numFound?'<li class="pager_next"><a href="?rows=30&sort=fsdt+desc&fq=bd:AB000&fq=cc1:C&start='+(data.start+data.rows)+'">次へ</a></li>':'');};}};'''
  js='<script>'+js+'</script><script type="text/template" id="template">PRODUCT</script><script type="text/template" id="pagingTemplate">PAGING</script>'
 if site=='pal' and enhanced:
  js='<script>setTimeout(()=>{document.querySelector("#item_pic_block").innerHTML='+json.dumps('<div class="ix-content-list-grid">'+products+'</div>')+';},1600);</script>'
 return '<!doctype html><meta charset="utf-8">'+CSS+'<main>'+grid+pager+'</main><footer>footer</footer>'+js

def run_case(browser,name,site,*,last=3,repeat=False,conflict=False,pkey='page',enhanced=False,bridge=True,retry=False,variant=False):
 c=browser.new_context(viewport={'width':412,'height':915},is_mobile=True,has_touch=True)
 c.add_init_script(SCRIPT);c.add_init_script('window.testEvents=[];document.addEventListener("GenericAutoPagerLoaded",e=>testEvents.push(e.detail));')
 reqs=[];attempts={};errors=[]
 def route(r):
  u=urlparse(r.request.url);q=parse_qs(u.query,keep_blank_values=True)
  if u.path.startswith('/img/'):
   return r.fulfill(status=200,content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"></svg>')
  if u.path=='/ise/select':
   start=int(q.get('start',['0'])[0]);reqs.append(('api',start,q));attempts[start]=attempts.get(start,0)+1
   if retry and attempts[start]==1:return r.fulfill(status=500,body='temporary')
   base=0 if repeat else start
   docs=[{'cd':f'P{i}','bd':'AB000','name':f'商品{i}'} for i in range(base,base+30)]
   return r.fulfill(status=200,content_type='application/json',body=json.dumps({'response':{'numFound':last*30,'start':start,'docs':docs}}))
  if u.path==urlparse(URLS[site]).path:
   n=int(q.get('p' if site=='pal' else pkey,['1'])[0]) if site!='atomic' else int(q.get('start',['0'])[0])//30+1
   reqs.append(('doc',n,q));attempts[n]=attempts.get(n,0)+1
   if retry and n>1 and attempts[n]==1:return r.fulfill(status=500,body='temporary')
   body=html(site,n,last,repeat=repeat and n>1,conflict=conflict,pkey=pkey,enhanced=enhanced,bridge=bridge)
   if variant and n==2:body=body.replace(product('pal',30),product('pal',0,'02'))
   return r.fulfill(status=200,content_type='text/html',body=body)
  return r.abort()
 c.route('**/*',route);p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(URLS[site],wait_until='domcontentloaded')
 selector='#item_pic_block .ix-content-list-grid' if enhanced else '#item_list' if site=='pal' else '#item_container' if site=='atomic' else '.item-list'
 p.wait_for_selector(selector+'[data-generic-fashion-autopager]',state='attached',timeout=9000)
 assert p.locator(selector+' > *').count()==30,(name,'initial')
 p.wait_for_timeout(200)
 assert len(reqs)==1,(name,'premature fetch',reqs)
 if conflict or last==1:
  assert p.locator(selector).get_attribute('data-generic-fashion-autopager')=='end'
  p.evaluate('scrollTo(0,document.body.scrollHeight)');p.wait_for_timeout(350)
  assert len(reqs)==1,(name,reqs)
 else:
  for count in ([30] if repeat else range(60,last*30+1,30)):
   p.locator(selector).evaluate('(e)=>scrollTo(0, e.getBoundingClientRect().bottom+scrollY-innerHeight-500)')
   y=p.evaluate('scrollY')
   if repeat:p.wait_for_function('(s)=>document.querySelector(s).getAttribute("data-generic-fashion-autopager")==="duplicate"',arg=selector,timeout=10000)
   else:p.wait_for_function('([s,n])=>document.querySelector(s).children.length===n',arg=[selector,count],timeout=15000)
   assert abs(p.evaluate('scrollY')-y)<=2,(name,'scroll jump',y,p.evaluate('scrollY'))
  expected=30 if repeat else last*30
  assert p.locator(selector+' > *').count()==expected
  p.wait_for_function('(s)=>["end","duplicate"].includes(document.querySelector(s).getAttribute("data-generic-fashion-autopager"))',arg=selector)
  assert p.locator('[data-generic-fashion-sentinel]').count()==0
  if not repeat:
   for _,n,q in reqs[1:]:
    if site=='atomic':assert q.get('fq')==['bd:AB000','cc1:C'] and q['sort']==['fsdt desc'],q
    if site=='pal':assert q['b']==['olivedesolive'] and q['c']==['11'] and q.get('sex')==[''],q
   assert p.locator('[data-generic-fashion-page] img').evaluate_all('(els)=>els.every(e=>e.getAttribute("src")&&!e.getAttribute("data-original")&&e.loading==="eager")')
   if variant:assert p.locator(selector+' a[href*="/P0/"]').count()==2
 assert not errors,(name,errors)
 assert p.locator('#generic-autopager-status').count()==0
 result={'name':name,'passed':True,'site':site,'requests':len(reqs),'items':p.locator(selector+' > *').count(),'fixture_only':True}
 c.close();print(json.dumps(result),flush=True);return result

if __name__=='__main__':
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
  result=[]
  cases=[('pal-three-pages','pal',{}),('pal-color-variants','pal',{'variant':True}),('pal-enhanced-replacement','pal',{'enhanced':True,'last':2}),('pal-no-next','pal',{'last':1}),('pal-duplicate-stop','pal',{'repeat':True}),('pal-retry','pal',{'retry':True,'last':2}),('atomic-api-30-60-90','atomic',{}),('atomic-frame-fallback','atomic',{'bridge':False,'last':2}),('atomic-filter-preservation','atomic',{'conflict':True}),('atomic-retry','atomic',{'retry':True,'last':2}),('atomic-duplicate-stop','atomic',{'repeat':True}),('city-page','city',{}),('city-p','city',{'pkey':'p','last':2}),('city-page-no','city',{'pkey':'page_no','last':2}),('city-no-next','city',{'last':1}),('city-filter-change-stop','city',{'conflict':True}),('city-duplicate-stop','city',{'repeat':True})]
  for name,site,kwargs in cases:result.append(run_case(b,name,site,**kwargs))
  b.close()
 (ROOT/'test-results').mkdir(exist_ok=True)
 (ROOT/'test-results/fashion-fixtures.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print('ALL FIXTURE TESTS PASS',len(result))
