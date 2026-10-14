"""Check actual appended-card geometry and decoded images, not only DOM counts."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    executable=shutil.which('google-chrome') or shutil.which('chromium')
    browser=p.chromium.launch(executable_path=executable,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':412,'height':915},is_mobile=True,user_agent='Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36')
    page=ctx.new_page()
    page.add_init_script((ROOT/'android-generic-autopager.user.js').read_text())
    page.goto('https://rlab-store.jp/c/ROJITA',wait_until='domcontentloaded',timeout=60000)
    page.wait_for_selector('#generic-rlab-autopager-sentinel')
    page.locator('.fs-c-productList__list > article').last.scroll_into_view_if_needed()
    before=page.evaluate('window.scrollY')
    page.wait_for_selector('[data-generic-rlab-page="2"]',timeout=45000)
    after=page.evaluate('window.scrollY')
    cards=page.locator('[data-generic-rlab-page="2"]').evaluate_all('(els)=>els.map(e=>({id:e.dataset.productId,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,display:getComputedStyle(e).display}))')
    assert len(cards)>0 and all(c['width']>50 and c['height']>100 and c['display']!='none' for c in cards),cards
    first=page.locator('[data-generic-rlab-page="2"]').first
    first.scroll_into_view_if_needed()
    page.wait_for_function('()=>{const img=document.querySelector("[data-generic-rlab-page] .fs-c-productListItem__image img");return img&&img.complete&&img.naturalWidth>100}',timeout=45000)
    page.wait_for_timeout(700)
    image=first.locator('.fs-c-productListItem__image img').evaluate('(img)=>({src:img.src,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height})')
    assert image['width']>50 and image['height']>50,image
    page.screenshot(path=str(OUT/'rlab-appended-products.png'))
    report={'status':'pass','test':'live visible appended cards and decoded product photo','cards':cards,'first_image':image,'scroll_before_append':before,'scroll_after_append':after}
    (OUT/'rlab-visual.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print('VISUAL_PASS',json.dumps(report),flush=True)
    browser.close()
