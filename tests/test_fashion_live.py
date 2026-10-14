"""Read-only live validation. A CITYHILL 403 is explicitly unverified, never a pass."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
import json,shutil,hashlib,traceback
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
SCRIPT=(ROOT/'android-generic-autopager.user.js').read_text()
URLS={'pal':'https://www.palcloset.jp/display/display/?mode=zSearch&mcId=001011&b=olivedesolive&c=11&sex=&scId=','atomic':'https://atomicboxx.com/ap/s/s?rows=30&sort=fsdt+desc&fq=bd:AB000&fq=cc1:C','city':'https://store.cityhill.co.jp/majesticlegon/item/preorder.html'}
SELECTORS={'pal':'#item_pic_block .ix-content-list-grid, #item_list','atomic':'#item_container','city':'[data-generic-fashion-autopager]'}
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 for site,url in URLS.items():
  c=b.new_context(viewport={'width':412,'height':915},is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36')
  c.add_init_script(SCRIPT);c.add_init_script('window.testEvents=[];document.addEventListener("GenericAutoPagerLoaded",e=>testEvents.push(e.detail));')
  p=c.new_page();errors=[];console=[];requests=[];report={'site':site,'url':url,'real_android_adguard_tested':False}
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.on('console',lambda m:console.append(m.text) if 'AutoPager' in m.text else None)
  p.on('request',lambda r:requests.append(r.url) if r.resource_type in ['document','fetch','xhr'] else None)
  try:
   response=p.goto(url,wait_until='domcontentloaded',timeout=50000);report['status']=response.status if response else None
   if site=='city' and report['status']==403:
    report.update(verified=False,reason='HTTP 403 from public site in Chromium; synthetic adapter regressions only');results.append(report);print(json.dumps(report),flush=True);continue
   assert report['status']==200,report
   p.wait_for_timeout(6000)
   selector=SELECTORS[site]
   p.wait_for_selector('[data-generic-fashion-autopager]',state='attached',timeout=20000)
   count=p.locator(selector).first.evaluate('(e)=>e.children.length');counts=[count];report['initial_count']=count
   for _ in range(5):
    grid=p.locator(selector).first
    state=grid.get_attribute('data-generic-fashion-autopager')
    if state=='end':break
    assert state not in ['error','duplicate','changed','limit'],(state,console)
    grid.evaluate('(e)=>window.scrollTo(0,Math.max(0,e.getBoundingClientRect().bottom+scrollY-innerHeight-500))')
    y=p.evaluate('scrollY')
    p.wait_for_function('([s,n])=>{const e=document.querySelector(s);return e&&(e.children.length>n||["error","duplicate","end"].includes(e.getAttribute("data-generic-fashion-autopager")));}',arg=[selector,count],timeout=85000)
    grid=p.locator(selector).first;new_count=grid.evaluate('(e)=>e.children.length')
    assert new_count>count,(site,count,new_count,grid.get_attribute('data-generic-fashion-autopager'),console)
    count=new_count;counts.append(count);report.setdefault('scroll_delta',[]).append(p.evaluate('scrollY')-y)
    p.wait_for_timeout(500)
   report['counts']=counts
   report['state']=p.locator(selector).first.get_attribute('data-generic-fashion-autopager')
   report['events']=p.evaluate('testEvents')
   assert len(counts)>=2,(site,report)
   assert report['state']=='end',report
   assert p.locator('[data-generic-fashion-sentinel]').count()==0
   assert p.locator('iframe[style*="-20000px"]').count()==0
   # Scroll to the first imported card and verify real image decode/geometry.
   first=p.locator('[data-generic-fashion-page]').first
   first.scroll_into_view_if_needed();p.wait_for_timeout(1200)
   p.wait_for_function('()=>{const i=document.querySelector("[data-generic-fashion-page] img");return i&&i.complete&&i.naturalWidth>0;}',timeout=20000)
   report['images']=p.locator('[data-generic-fashion-page] img').evaluate_all('(es)=>({count:es.length,decoded:es.filter(e=>e.complete&&e.naturalWidth>0).length,first:es[0]?.src,visible:es.filter(e=>getComputedStyle(e).display!=="none"&&getComputedStyle(e).visibility!=="hidden"&&e.getBoundingClientRect().width>0).length})')
   report['geometry']=first.evaluate('(e)=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,viewport:innerWidth})')
   assert report['geometry']['width']>30 and report['geometry']['height']>30,report
   for event in report['events']:
    q=parse_qs(urlparse(event['url']).query,keep_blank_values=True)
    if site=='atomic':assert q['fq']==['bd:AB000','cc1:C'] and q['sort']==['fsdt desc'],q
    if site=='pal':assert q['b']==['olivedesolive'] and q['c']==['11'] and q.get('sex')==[''],q
   p.screenshot(path=str(OUT/(site+'-fashion-641.png')),full_page=False)
   report['verified']=True
  except Exception as error:
   report.update(verified=False,error=str(error),traceback=traceback.format_exc())
   try:
    (OUT/(site+'-failure.html')).write_text(p.content());p.screenshot(path=str(OUT/(site+'-failure.png')))
   except Exception:pass
  finally:
   report.update(page_errors=errors,autopager_console=console,requests=requests)
   if report not in results:results.append(report)
   (OUT/'fashion-live.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
   print(json.dumps(report,ensure_ascii=False),flush=True);c.close()
 b.close()
assert all(r.get('verified') for r in results if r['site']!='city'), 'PAL/atomic live verification failed'
assert all(r.get('verified') or (r['site']=='city' and r.get('status')==403) for r in results), 'Unexpected live failure'
print('LIVE VERIFIED', [r['site'] for r in results if r.get('verified')], 'CITYHILL',next(r for r in results if r['site']=='city').get('reason','verified'))
(OUT/'fashion-release.json').write_text(json.dumps({'version':'6.41.0','sha256':hashlib.sha256(SCRIPT.encode()).hexdigest(),'live_verified':[r['site'] for r in results if r.get('verified')],'unverified':[r for r in results if not r.get('verified')],'real_android_adguard_tested':False},ensure_ascii=False,indent=2))
