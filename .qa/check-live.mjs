import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({...devices['Pixel 7'], locale:'ja-JP'});
  const url = 'https://www.google.co.jp/search?hl=ja&gl=jp&q=' + encodeURIComponent('サーモンキャンディ');
  const resp = await page.goto(url, {waitUntil:'domcontentloaded',timeout:20000});
  const context = await page.evaluate(() => ({route:location.pathname,images:document.body.innerText.includes('その他の画像'), range:/[￥¥]2,000\s*[–−ー―~〜-]\s*[￥¥]6,000/.test(document.body.innerText),cookpad:!!document.querySelector('a[href*="cookpad.com"]')}));
  console.log('PUBLIC_SEARCH',resp.status(),context);
  if(context.images && context.range && context.cookpad) {
    await page.addScriptTag({path:'android-generic-autopager.user.js'});
    await page.waitForTimeout(1500);
    console.log('PUBLIC_SEARCH_AFTER',await page.evaluate(()=>({range:/[￥¥]2,000\s*[–−ー―~〜-]\s*[￥¥]6,000/.test(document.body.innerText),cookpad:!![...document.querySelectorAll('a[href*="cookpad.com"]')].find(a=>a.getBoundingClientRect().height>0)})));
  }
} catch (error) {
  console.log('Public search was unavailable:', String(error).slice(0,250));
} finally { await browser.close(); }
