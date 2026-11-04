// Offline Chromium fixtures. These exercise DOM/layout behavior, not live Google
// or native Android/AdGuard. No network response is used by these tests.
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
const module = await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8');
const built = await buildUserscript();
const top = `<header><textarea name="q">AIによる概要 地域を選択</textarea><nav><a id="aimode" href="/search?udm=50">AI モード</a><a href="/search?udm=2">画像</a></nav></header>`;
const correction = `<div class="MjjYud" id="correction"><div id="fprs"><a href="/search?q=銀座">銀座 しゃぶ輝 喫煙所</a> も含めた検索結果を表示しています<br><a id="fprsl" href="/search?q=銀座&nfpr=1">銀座 しゃぶ耀 喫煙所 のみで検索</a></div></div>`;
const location = `<div class="MjjYud" id="location"><span>中央区銀座 · </span><span role="button" tabindex="0">地域を選択</span><button aria-label="その他">⋮</button></div>`;
const ai = `<section class="MjjYud" id="ai"><span>現在、AI による概要を生成できません。また後でお試しください。</span></section>`;
const organic = `<div class="MjjYud" id="organic"><a href="https://example.com/article"><h3>AIによる概要・地域を選択についての記事</h3></a><p>現在、AI による概要を生成できません。また後でお試しください。</p><a href="https://example.com/region">地域を選択</a></div>`;
const paa = `<div class="MjjYud" id="paa"><h2>関連する質問</h2><div class="related-question-pair"><h3>AIによる概要は消せる？</h3><div>現在、AI による概要を生成できません。また後でお試しください。</div><button>地域を選択</button></div></div>`;
function doc(content = correction + location + ai + organic + paa) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px sans-serif}header{height:100px}.MjjYud{padding:18px;border-bottom:8px solid #eee}h3{margin:0}a{color:#159}nav{height:25px}</style>${top}<main id="main"><div id="search"><div id="rso">${content}</div></div></main>`;
}
let passed = 0;
async function setup(url, content, code = module) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({contentType:'text/html',body:doc(content)}) : route.abort());
  await page.addInitScript({content:code});
  await page.goto(url);
  await page.waitForTimeout(220);
  return {context,page,errors};
}
async function visibility(page, id) {
  return page.locator('#' + id).evaluate(el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
}
async function check(page, hidden = ['correction','location','ai']) {
  for (const id of hidden) assert.equal(await visibility(page,id),false, id + ' must collapse');
  for (const id of ['organic','paa','aimode','rso','search']) assert.equal(await visibility(page,id),true,id + ' must stay');
  assert.equal(await page.locator('textarea').inputValue(),'AIによる概要 地域を選択');
  assert.equal(await page.locator('#organic a').first().getAttribute('href'),'https://example.com/article');
  if (hidden.length === 3) assert((await page.locator('#organic').boundingBox()).y <= 102,'No residual module padding');
  passed++;
}
try {
  // Same hidden UI across arbitrary queries, all/images/video search, and TLDs.
  for (const suffix of ['?q=銀座+しゃぶ耀+喫煙所','?q=天気','?q=JavaScript','?q=AIによる概要','?q=服&udm=2','?q=映画&tbm=vid','?q=猫&start=10']) {
    const run = await setup('https://www.google.co.jp/search'+suffix);
    await check(run.page); assert.deepEqual(run.errors,[]); await run.context.close();
  }
  // Full packaged runtime, including the preserved pager, must coexist.
  {
    const run = await setup('https://www.google.com/search?q=integration',undefined,built);
    await check(run.page); assert.deepEqual(run.errors,[]); await run.context.close();
  }
  // Recognized AI module with real citations must disappear as one block.
  for (const attribute of ['data-aquarium','data-attnms','data-subtree="mfc"','data-async-type="folsrch"']) {
    const block = `<div class="MjjYud" id="ai"><div ${attribute}><h2>AI による概要</h2><p>生成された回答</p><a href="https://citation.example/"><h3>引用元</h3></a></div></div>`;
    const run = await setup('https://www.google.com/search?q=knowledge',correction+location+block+organic+paa);
    await check(run.page); await run.context.close();
  }
  // No known IDs/classes: semantic fallback and shared wrappers.
  {
    const run = await setup('https://www.google.com/search?q=fallback',`<div id="shared">${correction.replace('id="fprs"','').replace('id="fprsl"','').replaceAll('MjjYud','random-card')}${location.replaceAll('MjjYud','random-card')}${ai.replaceAll('MjjYud','random-card')}${organic}${paa}</div>`);
    await check(run.page); assert.equal(await visibility(run.page,'shared'),true); await run.context.close();
  }
  // A plain AI heading still hides its answer; a question panel is content.
  {
    const plainAI = '<div class="MjjYud" id="ai"><div data-mcpr><h2>AI による概要</h2><p>概要本文</p><a href="https://source.example/"><h3>引用ページ</h3></a></div></div>';
    const plainPAA = '<div class="MjjYud" id="paa"><h2>関連する質問</h2><div role="button">AIによる概要</div><p>現在、AI による概要を生成できません。また後でお試しください。</p><button>地域を選択</button></div>';
    const run = await setup('https://www.google.com/search?q=plain',correction+location+plainAI+organic+plainPAA);
    await check(run.page); await run.context.close();
  }
  // Text streaming, insertion, BFCache pageshow and late result modules.
  {
    const run = await setup('https://www.google.com/search?q=dynamic',organic+paa);
    await run.page.evaluate(markup => document.querySelector('#rso').insertAdjacentHTML('afterbegin',markup),correction+location+'<section class="MjjYud" id="ai"><span id="stream">準備中</span></section>');
    await run.page.evaluate(() => {document.querySelector('#stream').firstChild.data='現在、AI による概要を生成できません。また後でお試しください。';});
    await run.page.waitForTimeout(250); await check(run.page);
    await run.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await run.page.waitForTimeout(150); await check(run.page);
    await run.page.evaluate(markup => {document.querySelector('#rso').innerHTML=markup;history.pushState({},'', '/search?q=another');window.dispatchEvent(new PopStateEvent('popstate'));},correction+location+ai+organic+paa);
    await run.page.waitForTimeout(250); await check(run.page); await run.context.close();
  }
  // Google can recycle a formerly hidden notice as an ordinary result.
  {
    const run = await setup('https://www.google.com/search?q=recycle');
    await check(run.page);
    await run.page.evaluate(() => {document.querySelector('#ai').innerHTML='<a href="https://new.example/"><h3>新しい通常結果</h3></a><p>本文</p>';});
    await run.page.waitForTimeout(250);
    assert.equal(await visibility(run.page,'ai'),true,'Reused ordinary result must return');
    await run.page.evaluate(() => history.pushState({},'', '/search?q=mode&udm=50'));
    await run.page.waitForTimeout(150);
    for (const id of ['correction','location','ai']) assert.equal(await visibility(run.page,id),true,'AI Mode must release hidden modules');
    await run.page.evaluate(() => history.replaceState({},'', '/search?q=normal'));
    await run.page.waitForTimeout(250);
    await check(run.page,['correction','location']);
    passed++; await run.context.close();
  }
  // AI Mode and unrelated domains/paths remain untouched.
  {
    // Insert into an early subtree while a large initial traversal is active.
    const bulk = '<div id="early"></div>' + '<div><span>通常の情報</span></div>'.repeat(2500);
    const injection = `setTimeout(() => {const early=document.querySelector('#early');if(early)early.innerHTML=${JSON.stringify(correction+location+ai)};}, 5);`;
    const run = await setup('https://www.google.com/search?q=large',bulk+organic+paa,module+'\n'+injection);
    await run.page.waitForTimeout(700);
    for (const id of ['correction','location','ai']) assert.equal(await visibility(run.page,id),false,'Insertion during traversal: '+id);
    assert.equal(await visibility(run.page,'organic'),true);
    passed++; await run.context.close();
  }
  for (const url of ['https://www.google.com/search?q=x&udm=50','https://www.google.com/maps','https://news.yahoo.co.jp/search?q=x','https://google.evil.example/search?q=x','https://www.google.com.example.org/search?q=x']) {
    const run = await setup(url);
    for (const id of ['ai','correction','location','organic','paa']) assert.equal(await visibility(run.page,id),true,url+' '+id);
    assert.deepEqual(run.errors,[]); passed++; await run.context.close();
  }
  console.log(`PASS: Google cleanup ${passed} Chromium scenarios; query/host isolation, gap collapse, protected results, citations, dynamic text, pageshow and packaged integration`);
} finally { await browser.close(); }
