// Synthetic mobile regression fixtures motivated by the user's screenshots.
// These are not captured Google DOM or native Android/AdGuard verification.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const options = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) options.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const imported = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const bundle = imported.default || imported;
  options.executablePath = await bundle.executablePath();
  options.args = bundle.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(options);
const current = await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8');
const oldRelease = await readFile(new URL('../Android_Generic_AutoPager_v6.48.js', import.meta.url), 'utf8');
const oldStart = oldRelease.indexOf('(function installGoogleSearchCleanupV648()');
assert(oldStart >= 0, 'Frozen v6.48 baseline cleanup module is required');
const oldEnd = oldRelease.indexOf('\n})();', oldStart);
assert(oldEnd > oldStart);
const baseline = oldRelease.slice(oldStart, oldEnd + '\n})();'.length);

const errorText = '現在、AI による概要を生成できません。また後でお試しください。';
const home = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>';
const menu = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>';
function region(id = 'location', name = '市川市八幡', labeled = true) {
  return `<div id="${id}" class="band region">${home}<b>${name} ·</b><div role="button" tabindex="0" ${labeled ? 'aria-label="その他"' : ''}>${menu}</div></div>`;
}
function error(id = 'ai', wrapper = 'g-inner-card') {
  return `<${wrapper} id="${id}" class="band">${errorText}</${wrapper}>`;
}
const top = '<header id="header"><textarea name="q">木村</textarea><nav><a id="aimode" href="/search?udm=50&q=木村">AI モード</a><a href="/search?udm=2">画像</a></nav></header>';
const organic = `<article id="organic" class="MjjYud"><a href="https://ordinary.example/article"><h3>AIによる概要のエラーを解説</h3></a><p id="snippet">${errorText}</p>${region('organic-location','市川市八幡')}</article>`;
const places = `<section id="places" class="MjjYud" data-ssid="lcl_legacy_tile" role="region" aria-label="場所"><h2>場所</h2><div id="map" role="img" aria-label="地図">地図</div><article id="place-card"><a href="https://business.example/"><h3>きむら はり・きゅう整骨院</h3></a><p>4.7 ★ (23) · 接骨院</p><address id="address">${home}菅野1丁目13−12 ミサージュ101</address><p>通常の紹介文</p></article><button>さらに表示</button></section>`;
const questions = `<section id="questions" class="MjjYud" jscontroller="Da4hkd"><h2>関連する質問</h2><div class="related-question-pair"><h3>AIによる概要とは？</h3><p id="question-answer">${errorText}</p></div></section>`;
const extras = `<aside id="sidebar"><h2>関連情報</h2>${region('sidebar-location','大阪市北区')}<p id="sidebar-error">${errorText}</p></aside><footer id="footer">検索の地域${region('footer-location','福岡市博多区')}<p id="footer-error">${errorText}</p></footer>`;
function documentHTML({ before = '', inside = '', after = '', shared = false } = {}) {
  const results = `<main id="main"><div id="search"><div id="rso">${inside}${places}${organic}${questions}</div></div></main>`;
  const wrapper = typeof shared === 'string' ? shared : 'div';
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{margin:0;font:16px/1.5 sans-serif}#header{height:100px}.band{display:block;padding:14px;border-bottom:8px solid #eee}.region{display:flex;align-items:center;gap:8px}.region [role=button]{margin-left:auto}h2,h3,p{margin:0}.MjjYud{padding:16px;border-bottom:8px solid #eee}#map{height:120px;background:#e5ece5}aside,footer{padding:20px}svg{flex-shrink:0}
  </style>${top}${shared ? '<'+wrapper+' id="shared">' : ''}${before}${results}${after}${shared ? '</'+wrapper+'>' : ''}${extras}`;
}
async function setup(content, code = current, url = 'https://www.google.co.jp/search?q=木村') {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({contentType:'text/html',body:documentHTML(content)}) : route.abort());
  await page.addInitScript({content:code});
  await page.goto(url);
  await page.waitForTimeout(250);
  return {page,context,errors};
}
async function visible(page,id) {
  return page.locator('#'+id).evaluate(el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
}
async function hidden(page,ids) {
  for (const id of ids) assert.equal(await visible(page,id),false,`${id} should be hidden with its padding`);
}
async function retained(page) {
  for (const id of ['places','map','place-card','address','organic','snippet','organic-location','questions','question-answer','aimode','footer','footer-location','footer-error','sidebar','sidebar-location','sidebar-error']) {
    assert.equal(await visible(page,id),true,`${id} is unrelated content and must remain`);
  }
  assert.equal(await page.locator('#organic>a').getAttribute('href'),'https://ordinary.example/article');
  assert.equal(await page.locator('textarea').inputValue(),'木村');
}
const results = [];
async function scenario(name, task) {
  try {await task();results.push({name,passed:true});console.log('PASS '+name);}
  catch (error) {results.push({name,passed:false,error:String(error)});console.error('FAIL '+name+': '+error.message);}
}
try {
  await scenario('v6.48 failure control: AI outside result IDs and a location without Choose area both survive', async () => {
    const run = await setup({before:region()+error()},baseline);
    assert.equal(await visible(run.page,'ai'),true);
    assert.equal(await visible(run.page,'location'),true);
    await retained(run.page);assert.deepEqual(run.errors,[]);await run.context.close();
  });
  for (const [name,content] of [
    ['top-level custom-tag error outside #search', {before:region()+error()}],
    ['pure UI inside the reused .g class', {inside:`<div class="g">${region()}${error('ai','div')}</div>`}],
    ['g-inner-card direct error text inside results', {inside:region()+error()}],
    ['shared parent includes ordinary results', {before:region()+error(),shared:true}],
    ['split error text, line break and decorative icon', {before:region()+`<div class="band" id="ai"><svg width="20" height="20" aria-hidden="true"><title>AI</title><path d="M0 0h20v20z"></path></svg><span>現在、 AI による概要を生成でき</span><wbr><span>ません。また後でお試しくださ</span><br><span>い。</span></div>`}],
    ['location elsewhere in Japan with unlabeled overflow icon', {before:region('location','福岡市博多区',false)+error()}],
    ['different location and another arbitrary search term', {before:region('location','札幌市中央区')+error()}],
    ['location text only in update-location custom element', {before:'<dynamic-visibility-control id="location" class="band"><update-location>横浜市中区・</update-location></dynamic-visibility-control>'+error()}],
    ['shared dynamic-visibility-control does not swallow normal results', {before:'<update-location id="location" class="band">京都市下京区・</update-location>'+error(),shared:'dynamic-visibility-control'}],
    ['known AI payload with YzCcne and hdzaWe', {before:region(),inside:'<div class="MjjYud" id="ai"><div data-mg-cp="YzCcne"><div class="hdzaWe">'+errorText+'</div></div></div>'}],
  ]) {
    await scenario(name, async () => {
      const run = await setup(content,current,'https://www.google.com/search?q=任意の検索語');
      await hidden(run.page,['ai','location']);await retained(run.page);
      if(content.shared)assert.equal(await visible(run.page,'shared'),true,'Shared wrapper must remain');
      assert((await run.page.locator('#places').boundingBox()).y<=102,'No empty notification band before map results');
      assert.deepEqual(run.errors,[]);await run.context.close();
    });
  }
  await scenario('same location-like card after results is retained', async () => {
    const run = await setup({before:error(),after:region('late-location','市川市八幡')});
    await hidden(run.page,['ai']);assert.equal(await visible(run.page,'late-location'),true);
    await retained(run.page);await run.context.close();
  });
  await scenario('error notice inside a shared form does not hide the search input', async () => {
    const run = await setup({before:region()+'<form id="shared-form"><input id="inside-query" value="木村">'+error()+'</form>'});
    await hidden(run.page,['ai','location']);
    assert.equal(await visible(run.page,'inside-query'),true,'Input beside a notice must remain');
    assert.equal(await visible(run.page,'shared-form'),true,'Shared form must remain');
    await retained(run.page);await run.context.close();
  });
  await scenario('dynamic insertion outside #main and character-data changes', async () => {
    const run = await setup();
    await run.page.evaluate(markup => document.querySelector('#main').insertAdjacentHTML('beforebegin',markup),region()+'<g-inner-card class="band" id="ai">準備中</g-inner-card>');
    await run.page.evaluate(text => {document.querySelector('#ai').firstChild.data=text;},errorText);
    await run.page.waitForTimeout(300);await hidden(run.page,['ai','location']);await retained(run.page);
    await run.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await run.page.waitForTimeout(200);await hidden(run.page,['ai','location']);await run.context.close();
  });
  await scenario('packaged userscript includes the mobile fix', async () => {
    const run = await setup({before:region()+error()},await buildUserscript());
    await hidden(run.page,['ai','location']);await retained(run.page);assert.deepEqual(run.errors,[]);await run.context.close();
  });
  await scenario('AI Mode is untouched even with the new mobile patterns', async () => {
    const run = await setup({before:region()+error()},current,'https://www.google.com/search?q=木村&udm=50');
    assert.equal(await visible(run.page,'ai'),true);assert.equal(await visible(run.page,'location'),true);
    await retained(run.page);await run.context.close();
  });
  const failed = results.filter(result=>!result.passed);
  console.log(JSON.stringify({kind:'synthetic offline Chromium fixtures; not live Google/Android',passed:results.length-failed.length,total:results.length,failures:failed},null,2));
  assert.equal(failed.length,0,'Google mobile cleanup regression failures');
} finally {await browser.close();}
