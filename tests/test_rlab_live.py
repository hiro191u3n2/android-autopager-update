"""Read-only checks on live Rlab pages, using the complete release userscript."""
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, urljoin
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
import json, shutil
ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT/'android-generic-autopager.user.js').read_text()
OUT = ROOT/'test-results'
OUT.mkdir(exist_ok=True)
COAT = 'https://rlab-store.jp/c/ROJITA/ROJITA-outer/ROJITA-coat'
ALL = 'https://rlab-store.jp/c/ROJITA'
UA = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
ROOTSEL = '.fs-c-productList[data-generic-rlab-autopager]'
ITEMS = ROOTSEL+' > .fs-c-productList__list > .fs-c-productList__list__item'
reports=[]
with sync_playwright() as p:
    executable=shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('chromium-browser')
    browser=p.chromium.launch(executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'])
    for url, kind in [(COAT,'coat'),(ALL,'multiple')]:
        ctx=browser.new_context(viewport={'width':412,'height':915},is_mobile=True,user_agent=UA)
        page=ctx.new_page()
        errors=[]
        requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def record(req):
            u=urlsplit(req.url)
            if req.resource_type=='fetch' and u.hostname=='rlab-store.jp' and u.path==urlsplit(url).path and 'page' in parse_qs(u.query): requests.append(req.url)
        page.on('request',record)
        page.add_init_script(SOURCE)
        response=page.goto(url,wait_until='domcontentloaded',timeout=60000)
        assert response.ok, response.status
        page.wait_for_selector(ROOTSEL,timeout=20000)
        page.wait_for_timeout(1000)
        initial=page.locator(ITEMS).count()
        assert initial>0
        initial_status=page.locator(ROOTSEL+' .fs-c-listControl__status').first.inner_text()
        links=page.locator(ROOTSEL+' .fs-c-pagination a[href]').evaluate_all('(els)=>els.map(e=>e.href)')
        if kind=='coat':
            assert page.locator(ROOTSEL).get_attribute('data-generic-rlab-autopager')=='end'
            page.evaluate('window.scrollTo(0,document.body.scrollHeight)')
            page.wait_for_timeout(1500)
            assert page.locator(ITEMS).count()==initial and not requests
            reports.append({'test':'live coat final-page detection','url':url,'status':'pass','initial_products':initial,'native_status':initial_status,'requests':requests,'site_page_errors':errors})
        else:
            assert links, 'Expected a multipage category for live testing'
            last=max(links,key=lambda s:int(parse_qs(urlsplit(s).query).get('page',['1'])[0]))
            counts=[initial]
            for n in [2,3]:
                page.evaluate('document.querySelector("#generic-rlab-autopager-sentinel").scrollIntoView()')
                page.wait_for_function('(n)=>document.querySelectorAll("[data-generic-rlab-page=\""+n+"\"]").length>0',arg=str(n),timeout=45000)
                counts.append(page.locator(ITEMS).count())
            ids=page.locator(ITEMS).evaluate_all('(els)=>els.map(e=>e.dataset.productId)')
            assert len(set(ids))==len(ids), 'Duplicate product IDs'
            assert counts[0]<counts[1]<counts[2], counts
            assert page.locator('#generic-autopager-sentinel,.generic-autopager-page').count()==0
            images=page.locator('[data-generic-rlab-page] .fs-c-productListItem__image img').evaluate_all('(els)=>els.map(e=>({src:e.src,loading:e.loading}))')
            assert images and all('/loading.svg' not in i['src'] and i['loading']=='eager' for i in images)
            assert {2,3}.issubset({int(parse_qs(urlsplit(s).query)['page'][0]) for s in requests})
            reports.append({'test':'live automatic page 1 to 2 to 3','url':url,'status':'pass','product_counts':counts,'native_status':initial_status,'requests':requests,'appended_list_images':len(images),'unique_products':len(set(ids)),'site_page_errors':errors})
            page.screenshot(path=str(OUT/'rlab-mobile-page3.png'))
            # The actual last native page must not start speculative requests.
            requests.clear()
            page.goto(last,wait_until='domcontentloaded',timeout=60000)
            page.wait_for_selector(ROOTSEL,timeout=20000)
            page.wait_for_timeout(1000)
            assert page.locator(ROOTSEL).get_attribute('data-generic-rlab-autopager')=='end'
            page.evaluate('window.scrollTo(0,document.body.scrollHeight)')
            page.wait_for_timeout(1200)
            assert not requests
            reports.append({'test':'live last native page stops','url':last,'status':'pass','products':page.locator(ITEMS).count(),'requests':requests})
        print('LIVE PASS',kind,flush=True)
        ctx.close()
    browser.close()
report={'verified_at':datetime.now(timezone.utc).isoformat(),'environment':'Headless Chromium, Android UA and mobile viewport; not an Android/AdGuard device','results':reports}
(OUT/'rlab-live.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
