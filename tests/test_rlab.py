"""Chromium fixture tests with actual Rlab selectors and adversarial pagers."""
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright
import json, shutil
ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://rlab-store.jp'
SOURCE = (ROOT / 'android-generic-autopager.user.js').read_text()
reports = []

def card(i):
    return f'''<article class="fs-c-productList__list__item fs-c-productListItem" data-product-id="{i}"><form><div class="fs-c-productListItem__image"><a href="/c/ROJITA/product-{i}"><img data-layzr="/images/{i}.jpg" src="/loading.svg"></a></div><h2 class="fs-c-productListItem__productName"><a href="/c/ROJITA/product-{i}">Product {i}</a></h2><aside class="fs-c-productImageModal" style="display:none"><img data-lazy="/large/{i}.jpg" data-src="/large/{i}.jpg" src="/loading.svg"></aside></form></article>'''

def fixture(page=1, ids=None, total=6, numeric=False, badsort=False, tall=False, gallery=False):
    ids = ids if ids is not None else [page*2-1, page*2]
    following = page+1 if page*2 < total else None
    href = f'?page={following}' + ('&sort=price_high' if badsort else '')
    aria = '' if numeric else 'aria-label="次のページへ"'
    link = f'<a class="fs-c-pagination__item{("" if numeric else " fs-c-pagination__item--next")}" {aria} href="{href}">{following if numeric else ""}</a>' if following else ''
    pager = f'<div class="fs-c-pagination"><span class="is-active">{page}</span>{link}</div>'
    status = f'<div class="fs-c-listControl__status"><span class="fs-c-listControl__status__total">{total}件中</span><span class="fs-c-listControl__status__indication">{page*2-1}-{min(page*2,total)}件表示</span></div>'
    gallery_html = '<div class="gallery"><a rel="next" href="?page=99" aria-label="Next">Next</a></div>' if gallery else ''
    return f'''<!doctype html><html><head><title>Fixture</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>.fs-c-productList__list{{display:grid;grid-template-columns:repeat(2,1fr)}}article{{min-height:{5000 if tall else 300}px}}footer{{height:6000px}} img{{width:60px;height:80px}}</style></head><body id="fs_ProductCategory"><main class="fs-l-pageMain"><div class="fs-c-productList"><div class="fs-c-productList__controller">{status}{pager}</div><div class="fs-c-productList__list">{''.join(card(i) for i in ids)}</div><div class="fs-c-productList__controller">{status}{pager}</div></div>{gallery_html}</main><footer>Footer: should not be required to trigger paging</footer></body></html>'''

def run_case(browser, name, pages, expect_ids, expected_requests, *, query='', no_io=False, fail=False, scroll=False, expected_state='end'):
    ctx = browser.new_context(viewport={'width':412,'height':915}, is_mobile=True)
    page = ctx.new_page()
    calls, errors = [], []
    page.on('pageerror', lambda err: errors.append(str(err)))
    def route(r):
        url = urlsplit(r.request.url)
        n = int(parse_qs(url.query).get('page',['1'])[0])
        if r.request.resource_type in ('fetch','xhr'):
            calls.append(r.request.url)
            if fail: return r.fulfill(status=503, content_type='text/html', body='Service unavailable')
            return r.fulfill(status=200, content_type='text/html', body=pages.get(n, pages[1]))
        if r.request.is_navigation_request():
            return r.fulfill(status=200, content_type='text/html', body=pages[1])
        return r.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80"/>')
    ctx.route('**/*', route)
    if no_io: page.add_init_script('delete window.IntersectionObserver; delete window.ResizeObserver;')
    page.add_init_script(SOURCE)
    page.goto(ORIGIN+'/c/ROJITA'+query, wait_until='domcontentloaded')
    if scroll:
        page.wait_for_timeout(400)
        assert calls == [], (name, 'loaded before near the list')
        for _ in range(5):
            page.evaluate('document.querySelector("#generic-rlab-autopager-sentinel")?.scrollIntoView()')
            page.wait_for_timeout(350)
    else:
        page.evaluate('for(let i=0;i<25;i++)window.dispatchEvent(new Event("scroll"))')
    page.wait_for_function('(state) => document.querySelector(".fs-c-productList").getAttribute("data-generic-rlab-autopager") === state', arg=expected_state, timeout=10000)
    page.wait_for_timeout(300)
    actual = page.locator('.fs-c-productList__list > article').evaluate_all('(els)=>els.map(el=>Number(el.dataset.productId))')
    assert actual == expect_ids, (name, actual, expect_ids)
    assert len(calls) == expected_requests, (name, calls)
    assert errors == [], (name, errors)
    assert page.locator('#generic-autopager-sentinel').count() == 0, 'Generic core ran on Rlab'
    assert page.locator('.generic-autopager-page').count() == 0, 'Grid was wrapped'
    for img in page.locator('[data-generic-rlab-page] .fs-c-productListItem__image img').all():
        assert '/images/' in img.get_attribute('src') and img.get_attribute('loading') == 'eager'
    for img in page.locator('[data-generic-rlab-page] .fs-c-productImageModal img').all():
        assert img.get_attribute('src').endswith('/loading.svg'), 'Unnecessary gallery image hydration'
    if expected_state == 'error': assert page.locator('.fs-c-pagination__item--next').first.is_visible()
    reports.append({'test':name,'status':'pass','requests':calls,'products':actual})
    ctx.close()
    print('PASS',name,flush=True)
    return calls

with sync_playwright() as p:
    executable = shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('chromium-browser')
    browser = p.chromium.launch(executable_path=executable, args=['--no-sandbox'])
    normal = {n:fixture(n) for n in [1,2,3]}
    run_case(browser,'icon-only next and continuous page 2 to 3',normal,[1,2,3,4,5,6],2)
    run_case(browser,'numeric next fallback',{n:fixture(n,numeric=True) for n in [1,2,3]},[1,2,3,4,5,6],2)
    run_case(browser,'single-page plus unrelated gallery next',{1:fixture(1,total=2,gallery=True)},[1,2],0)
    run_case(browser,'no speculative next for complete five-item category',{1:fixture(1,ids=[1,2,3,4,5],total=5,gallery=True).replace('1-2件表示','1-5件表示')},[1,2,3,4,5],0)
    run_case(browser,'duplicate server page stops once',{1:fixture(1),2:fixture(1)},[1,2],1,expected_state='duplicate')
    run_case(browser,'overlapping products deduplicated',{1:fixture(1),2:fixture(2,ids=[2,4]),3:fixture(3)},[1,2,4,5,6],2)
    calls=run_case(browser,'sort and filter preservation',normal,[1,2,3,4,5,6],2,query='?sort=price_low&keyword=coat')
    assert all(parse_qs(urlsplit(url).query).get('sort')==['price_low'] and parse_qs(urlsplit(url).query).get('keyword')==['coat'] for url in calls)
    run_case(browser,'reject sort-changing next',{1:fixture(1,badsort=True)},[1,2],0)
    run_case(browser,'scroll fallback without observers',normal,[1,2,3,4,5,6],2,no_io=True)
    run_case(browser,'network retries and visible native fallback',{1:fixture(1)},[1,2],3,fail=True,expected_state='error')
    run_case(browser,'list-end proximity instead of footer',{n:fixture(n,tall=True) for n in [1,2,3]},[1,2,3,4,5,6],2,scroll=True)
    browser.close()
(ROOT/'test-results').mkdir(exist_ok=True)
(ROOT/'test-results/rlab-fixtures.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2))
print('ALL',len(reports),'CHROMIUM FIXTURE TESTS PASSED')
