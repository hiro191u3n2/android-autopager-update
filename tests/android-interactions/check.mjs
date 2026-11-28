import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { interactionPage, residualGaps, preservedStarts, operateThirdPage, gridWidths } from '../fixtures/google-page-interactions.mjs';
import { measureGap } from '../fixtures/google-leading-gap.mjs';
let sample;
import { connect, sleep } from './cdp.mjs';
const c = await connect(), records = [], failures = [];
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', {cacheDisabled:true});
c.on('Runtime.exceptionThrown', e=>failures.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
c.on('Fetch.requestPaused', async ({requestId,request}) => {
  const url = new URL(request.url);
  const page = 1 + Number(url.searchParams.get('start')) / 10;
  let body = page<=7 ? interactionPage(page,'padding') : '<main>終了</main>';
  if (page===1 && sample!=='frame-menu' || page===2 && sample==='frame-menu') {
    const i=body.indexOf('<main'), content=body.slice(i);
    body=body.slice(0,i)+(sample==='missing'?'':'<main id="search"><div id="rso">'+(sample==='frame-menu'?'<a href="/preferences">設定</a>':'')+'</div></main>')+'<script>setTimeout(()=>{document.querySelector("main")?.remove();document.body.insertAdjacentHTML("beforeend",'+JSON.stringify(content)+')},1200)</script>';
  }
  const search = url.hostname === 'www.google.com' && url.pathname === '/search';
  try {
    await c.send('Fetch.fulfillRequest', {requestId,responseCode:search?200:404,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(search?body:'').toString('base64')});
  } catch(error) {
    if (!/Invalid InterceptionId|Invalid interception id/i.test(error.message)) failures.push(error.message);
  }
});
await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});

const url = 'https://www.google.com/search?q='+encodeURIComponent('ぶしのいちぶん');
async function waitFor(expr) {
  for(let i=0;i<180;i++) {
    if(await c.val(expr)) return;
    await sleep(100);
  }
  throw Error('timed out: ' + expr);
}
async function navigate(target) {
  await c.send('Page.navigate',{url:'about:blank'});
  await waitFor('location.href === "about:blank"');
  await c.send('Page.navigate',{url:target});
  await waitFor('location.href === '+JSON.stringify(target)+' && document.readyState === "complete"');
}
try {
  const provider = await c.val('navigator.userAgent');
  console.log('WebView',provider);
  for(const [version,file] of [['6.81.0','Android_Generic_AutoPager_v6.81.js'],['6.82.0',process.argv[2]]]) {
    const source = await fs.readFile(file,'utf8'), old=version==='6.81.0';
    const sha = createHash('sha256').update(source).digest('hex');
    const {identifier} = await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
    try {
      for(sample of ['missing','replaced','frame-menu']) {
        await navigate(url);
        let pages=[];
        for(let i=0;i<(old?24:180);i++){
          await sleep(150);
          pages=await c.val("(scrollTo(0,document.documentElement.scrollHeight),Array.from(document.querySelectorAll('.generic-autopager-page'),n=>n.dataset.page))");
          if(pages.includes('7') && (!old || i>=12))break;
        }
        if(old) assert(!pages.includes('7'), sample);
        else {
          assert.deepEqual(pages.slice(0,6),['2','3','4','5','6','7']);
          const result=await c.val('('+measureGap.toString()+')()');
          assert.equal(result.gap,result.normalGap);
        }
        console.log('DELAY',version,sha,sample,pages);
        records.push({version,sha,sample,provider,pages});
      }
    } finally { await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier}); }
  }
  assert.deepEqual(failures,[]);
  console.log('PASS native Android comparisons',records.length);
  if(provider.includes('Android 17')) {
    await c.send('Fetch.disable');
    const responses=[],exceptions=[];
    c.on('Network.responseReceived',e=>{if(e.type==='Document'){const u=new URL(e.response.url);responses.push([u.hostname,u.pathname,u.searchParams.get('start'),e.response.status]);}});
    c.on('Runtime.exceptionThrown',e=>exceptions.push((e.exceptionDetails.exception?.description||e.exceptionDetails.text).split('\n')[0].slice(0,120)));
    const source=await fs.readFile(process.argv[2],'utf8');
    const id=await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
  const url='https://www.google.com/search?q='+encodeURIComponent('ぶしのいちぶん')+'&hl=ja';
  await c.send('Page.navigate',{url});
  const inspect=()=>{const text=document.body?.innerText||'';
    const page=document.querySelector('.generic-autopager-page[data-page="3"]');
    const root=page?.querySelector('.generic-autopager-google-source-root');
    const entry=root&&[...root.querySelectorAll('a[href]')].find(a=>/amazon\.co\.jp/.test(a.href)&&/武士の一分/.test(a.innerText));
    const divider=page?.querySelector('.generic-autopager-divider');
    return {path:location.pathname,title:document.title.slice(0,90),bodyChars:text.length,headers:document.querySelectorAll('h3,[role=heading]').length,
      search:!!document.querySelector('#search,#rso'),links:document.querySelectorAll('a[href]').length,pages:[...document.querySelectorAll('.generic-autopager-page')].map(x=>x.dataset.page),
      unusual:/unusual traffic|not a robot|異常なトラフィック|私はロボット|automated queries/i.test(text)||!!document.querySelector('iframe[src*="recaptcha"],form#captcha-form'),
      consent:/before you continue|同意する|すべて同意/i.test(text),enableJs:/enable javascript|JavaScript を有効|JavaScriptを有効|trouble accessing google search/i.test(text),
      amazon:!!entry,amazonTitleOffset:entry&&divider?Math.round(entry.getBoundingClientRect().top-divider.getBoundingClientRect().bottom):null,
      gapToFirst:(()=>{if(!root||!divider)return null;const h=[...root.querySelectorAll('h3,[role=heading]')].find(h=>h.getBoundingClientRect().height);return h?Math.round(h.getBoundingClientRect().top-divider.getBoundingClientRect().bottom):null})(),
      frames:[...document.querySelectorAll('iframe')].flatMap(f=>{try{const u=new URL(f.src||'about:blank');if(u.pathname!=='/search')return [];const d=f.contentDocument,r=d?.querySelector('#rso,#search');return [[u.searchParams.get('start'),!!d,!!r,r?.querySelectorAll('a[href]').length,d?.title?.slice(0,70),d?.body?.innerText?.slice(0,45)]]}catch{return[]}}),
      currentKeys:[...new URL(location.href).searchParams.keys()].sort(),
      scroll:[Math.round(scrollY),innerHeight,document.documentElement.scrollHeight],
      elements:[...document.querySelectorAll('[id*="autopager"]')].map(x=>[x.tagName,x.id,(x.getAttribute('aria-label')||x.getAttribute('title')||'').slice(0,90)]),
      nav:[...document.querySelectorAll('a[href]')].flatMap(a=>{try{let u=new URL(a.href);return u.searchParams.has('start') || /^(次へ|次のページ|その他の検索結果|もっと見る|Next|More results)$/i.test(a.innerText.trim()) ? [[a.id,a.innerText.slice(0,50),a.rel,u.pathname,u.searchParams.get('start'),[...u.searchParams.keys()].sort(),u.searchParams.get('q')===new URL(location.href).searchParams.get('q')]]:[]}catch{return[]}}),
      buttons:[...document.querySelectorAll('button,[role=button]')].map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()).filter(t=>/次|more|結果|next/i.test(t)).slice(-10),
      tailText:text.slice(-340),
      overlayState:document.querySelector('#generic-autopager-status')?.innerText?.slice(0,90)};
  };
  let state;
  const samples=[];
  for(let i=0;i<55;i++){
    await sleep(1000);
    state=await c.val('('+inspect.toString()+')()');
    if(i%3===0)samples.push(state);
    if(state.unusual||state.consent||responses.some(v=>v[3]===429)||state.pages.includes('3'))break;
    if(state.search && state.headers>0 && i>=3)await c.val('scrollBy(0,Math.max(450,innerHeight*.9))');
  }
  await fs.writeFile('evidence/live-movie.json',JSON.stringify({responses,exceptions,samples,state},null,2));console.log('LIVE_INSPECT',JSON.stringify({responses,exceptions,state}));
    await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:id.identifier});
  }
} finally {
  await fs.writeFile('evidence/visible-items.json',JSON.stringify(records,null,2));
  c.close();
}
