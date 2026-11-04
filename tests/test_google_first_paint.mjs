// Offline Chromium paint-timing fixtures, not captured Google HTML or a native
// Android/AdGuard injection-timing guarantee. A delayed parser script exposes
// paints before DOMContentLoaded; delayed timers expose post-paint cleanup.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const options = {headless:true};
if(process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE)options.executablePath=process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if(process.env.GOOGLE_TEST_CHROMIUM_MODULE){
  const imported=require(process.env.GOOGLE_TEST_CHROMIUM_MODULE),bundle=imported.default||imported;
  options.executablePath=await bundle.executablePath();
  options.args=bundle.args.filter(arg=>arg!=='--single-process'&&arg!=='--disable-web-security');
}
const browser=await chromium.launch(options);
const current=await readFile(new URL('../src/google-search-cleanup.js',import.meta.url),'utf8');
const oldRelease=await readFile(new URL('../Android_Generic_AutoPager_v6.49.js',import.meta.url),'utf8');
const oldStart=oldRelease.indexOf('(function installGoogleSearchCleanupV648()');
const oldEnd=oldRelease.indexOf('\n})();',oldStart);
assert(oldStart>=0&&oldEnd>oldStart,'Frozen v6.49 cleanup is required');
const baseline=oldRelease.slice(oldStart,oldEnd+'\n})();'.length);
const errorText='現在、AI による概要を生成できません。また後でお試しください。';
const housePath='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';
const iconURL='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${housePath}"/></svg>`);
const correction='<div id="correction" class="band"><div id="fprs">銀座 しゃぶ輝も含めた検索結果を表示しています<a href="/search?nfpr=1&q=銀座">銀座 しゃぶ耀のみで検索</a></div></div>';
const ai=`<g-inner-card id="ai" class="band">${errorText}</g-inner-card>`;
function location(kind='css',{selfTaw=false,nestedMenu=false}={}){
  const icon=kind==='img'?`<img class="icon" alt="自宅" src="${iconURL}">`:kind==='use'?'<svg class="icon" aria-label="自宅"><use href="#house"></use></svg>':'<span class="home-icon" aria-hidden="true"></span>';
  const menu='<span class="overflow" jsaction="click:openMenu" tabindex="0">⋮</span>';
  const content=nestedMenu?`<div class="location-content" jsaction="click:location">${icon}<b class="local-label">市川市八幡</b><span class="overflow" jsaction="click:wrapper1"><span jsaction="click:wrapper2"><span jsaction="click:wrapper3"><span jsaction="click:wrapper4">${menu}</span></span></span></span></div>`:`${icon}<b class="local-label">市川市八幡</b>${menu}`;
  return `<div id="${selfTaw?'taw':'location'}" data-paint-target="location" class="band region">${content}</div>`;
}
const controls='<form id="query-form"><input id="query" name="q" value="木村"></form><nav id="tabs"><a id="aimode" href="/search?udm=50&q=木村">AI モード</a><a href="/search?udm=2">画像</a><button id="tools">ツール</button></nav>';
const results=`<main id="main"><div id="search"><div id="rso"><section id="places" data-ssid="lcl_legacy_tile"><h2>場所</h2><div id="map" role="img" aria-label="地図">地図</div><article><h3><a href="https://place.example/">きむら整骨院</a></h3><address id="address">市川市八幡・1丁目</address></article></section><article class="MjjYud" id="organic"><a href="https://ordinary.example/"><h3>通常の検索結果</h3></a><p id="quoted-error">${errorText}</p></article><section id="paa" jscontroller="Da4hkd"><h2>関連する質問</h2><p>${errorText}</p></section></div></div></main><footer id="footer">市川市八幡・<span jsaction="click:menu">⋮</span></footer>`;
function html({kind='css',inHeader=false,inPlaces=false,selfTaw=false,nestedMenu=false,notices=true,pause=true}={}){
  const band=location(kind,{selfTaw,nestedMenu});
  const locationMarkup=selfTaw?band:'<div id="taw">'+band+'</div>';
  const resultMarkup=inPlaces&&notices?results.replace('<h2>場所</h2>',band+'<h2>場所</h2>'):results;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{margin:0;font:16px/1.5 Arial}header{display:block}#query-form{padding:12px}#tabs{padding:10px}#query{font:inherit}.band{display:block;padding:14px;border-bottom:8px solid #eee}.region{display:flex;align-items:center;gap:8px}.location-content{display:flex;align-items:center;gap:8px;flex:1}.local-label::after{content:'・'}.overflow{margin-left:auto}.icon,.home-icon{display:inline-block;width:20px;height:20px;flex-shrink:0}.home-icon{background:center/contain no-repeat url('${iconURL}')}#map{height:100px;background:#ddd}section,article{padding:14px}h2,h3,p{margin:0}#footer{padding:20px}
  </style><svg width="0" height="0" aria-hidden="true"><defs><symbol id="house" viewBox="0 0 24 24"><path d="${housePath}"/></symbol></defs></svg><header id="header">${controls}${inHeader&&notices?locationMarkup:''}</header>${notices?(!inHeader&&!inPlaces?locationMarkup:'')+correction+ai:''}<script>window.__fixtureTargetsParsed=true;</script>${pause?'<script src="/parser-pause.js"></script>':''}${resultMarkup}`;
}
const monitor=`(() => {
  const nativeSetTimeout=window.setTimeout;
  window.setTimeout=function(fn,delay,...args){return nativeSetTimeout(fn,Math.max(Number(delay)||0,180),...args);};
  window.__paintSamples=[];
  function visible(el){
    if(!el||!el.getClientRects().length)return false;
    for(let node=el;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.opacity==='0'||style.contentVisibility==='hidden')return false;}
    return true;
  }
  window.__paintVisible=visible;
  function frame(){
    if(window.__fixtureTargetsParsed){const sample={ready:document.readyState,time:performance.now(),present:[],visible:[]};for(const id of ['location','correction','ai']){const element=document.getElementById(id)||(id==='location'?document.querySelector('[data-paint-target="location"]'):null);if(element)sample.present.push(id);if(visible(element))sample.visible.push(id);}window.__paintSamples.push(sample);}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();`;
async function setup(spec={},code=current,url='https://www.google.co.jp/search?q=木村'){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/parser-pause.js'){await new Promise(resolve=>setTimeout(resolve,300));return route.fulfill({contentType:'application/javascript',body:'window.__parserPauseFinished=true;'});}
    if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:html(spec)});
    return route.abort();
  });
  await page.addInitScript({content:monitor+'\n'+code});
  await page.goto(url,{waitUntil:'load'});
  await page.waitForTimeout(260);
  return {page,context,errors};
}
async function retained(run){
  const state=await run.page.evaluate(()=>({retained:['query','tabs','aimode','tools','places','map','address','organic','quoted-error','paa','footer'].map(id=>[id,window.__paintVisible(document.getElementById(id))]),input:document.getElementById('query').value,body:window.__paintVisible(document.body)}));
  for(const [id,visible] of state.retained)assert(visible,id+' must remain after initial cleanup');
  assert(state.body,'Page must not remain blank');assert.equal(state.input,'木村');assert.deepEqual(run.errors,[]);
}
async function noFlash(run,{since=0,loading=false}={}){
  const samples=await run.page.evaluate(index=>window.__paintSamples.slice(index),since);
  assert(samples.length>2,'Enough frames must be observed');
  assert(samples.some(sample=>sample.present.length>0),'Fixture notices must be observed in the DOM');
  if(loading)assert(samples.some(sample=>sample.ready==='loading'),'A frame before DOMContentLoaded must be tested');
  const shown=samples.filter(sample=>sample.visible.length);
  assert.equal(shown.length,0,'Notice visible in frame(s): '+JSON.stringify(shown.slice(0,5)));
  await retained(run);
}
const checks=[];
async function scenario(name,fn){try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(error){checks.push({name,passed:false,error:String(error)});console.error('FAIL '+name+': '+error.message);}}
try{
  await scenario('v6.49 control exposes notices before delayed timer cleanup',async()=>{
    const run=await setup({},baseline),samples=await run.page.evaluate(()=>window.__paintSamples);
    assert(samples.some(sample=>sample.ready==='loading'&&sample.visible.includes('correction')),'Old build should flash before DOMContentLoaded');
    assert(samples.some(sample=>sample.visible.includes('location')),'Old build should miss the CSS icon/after-dot band');
    const since=await run.page.evaluate(markup=>{const start=window.__paintSamples.length;document.querySelector('#ai').remove();document.querySelector('#main').insertAdjacentHTML('beforebegin',markup);return start;},ai);
    await run.page.waitForTimeout(240);
    const dynamic=await run.page.evaluate(index=>window.__paintSamples.slice(index),since);
    assert(dynamic.some(sample=>sample.visible.includes('ai')),'Old build should flash a dynamically inserted AI error');
    await retained(run);await run.context.close();
  });
  for(const [name,spec] of [
    ['parser-streaming CSS icon and generated dot',{kind:'css'}],
    ['svg use icon and jsaction-only menu',{kind:'use'}],
    ['small image icon and generated dot',{kind:'img'}],
    ['location strip within header #taw keeps search controls',{kind:'css',inHeader:true}],
    ['location strip at the top of Places keeps the map and addresses',{kind:'css',inPlaces:true}],
    ['location band itself can own the taw boundary ID',{kind:'css',selfTaw:true}],
    ['nested jsaction wrappers do not become the overflow menu',{kind:'use',nestedMenu:true}],
  ])await scenario(name,async()=>{const run=await setup(spec);await noFlash(run,{loading:true});await run.context.close();});
  await scenario('dynamic notice insertion is hidden by the next rendering opportunity',async()=>{
    const run=await setup({notices:false,pause:false});
    const since=await run.page.evaluate(markup=>{const start=window.__paintSamples.length;document.querySelector('#main').insertAdjacentHTML('beforebegin',markup);return start;},'<div id="taw">'+location()+'</div>'+correction+ai);
    await run.page.waitForTimeout(350);await noFlash(run,{since});await run.context.close();
  });
  await scenario('pageshow and repeated error changes do not unhide old notices',async()=>{
    const run=await setup();await noFlash(run);
    const since=await run.page.evaluate(text=>{const start=window.__paintSamples.length;document.querySelector('#ai').textContent=text+' ';window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));return start;},errorText);
    await run.page.waitForTimeout(350);await noFlash(run,{since});await run.context.close();
  });
  await scenario('SPA query navigation keeps hidden notices hidden',async()=>{
    const run=await setup();await noFlash(run);
    const since=await run.page.evaluate(()=>{const start=window.__paintSamples.length;history.pushState({},'', '/search?q=別の検索');window.dispatchEvent(new PopStateEvent('popstate'));return start;});
    await run.page.waitForTimeout(350);await noFlash(run,{since});await run.context.close();
  });
  await scenario('full packaged script obeys the same first-paint contract',async()=>{
    const run=await setup({kind:'css'},await buildUserscript());await noFlash(run,{loading:true});await run.context.close();
  });
  await scenario('AI Mode keeps all notices and controls visible',async()=>{
    const run=await setup({},current,'https://www.google.com/search?q=木村&udm=50');
    for(const id of ['ai','correction','location'])assert(await run.page.evaluate(id=>window.__paintVisible(document.getElementById(id)),id));
    await retained(run);await run.context.close();
  });
  console.log(JSON.stringify({kind:'offline Chromium rAF samples with parser and timer delays; not native Android injection verification',passed:checks.filter(c=>c.passed).length,total:checks.length,failures:checks.filter(c=>!c.passed)},null,2));
  assert.equal(checks.filter(c=>!c.passed).length,0,'First-paint regressions');
}finally{await browser.close();}
