import { readFile, writeFile } from 'node:fs/promises';
import { connect, sleep } from './cdp.mjs';
const c=await connect();
const responses=[], exceptions=[];
c.on('Runtime.exceptionThrown', e=>{exceptions.push((e.exceptionDetails.exception?.description||e.exceptionDetails.text).split('\n')[0].slice(0,140));});
await c.send('Network.enable');
c.on('Network.responseReceived', e=>{
  if(e.type!=='Document')return;
  const u=new URL(e.response.url);
  responses.push([u.hostname,u.pathname,u.searchParams.get('start'),e.response.status]);
});
const source=await readFile(process.argv[2],'utf8');
const {identifier}=await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
try {
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
  for(let i=0;i<24;i++){
    await sleep(1000);
    state=await c.val('('+inspect.toString()+')()');
    if(i%3===0)samples.push(state);
    if(state.unusual||state.consent||responses.some(v=>v[3]===429)||state.pages.includes('3'))break;
    if(state.search && state.headers>0 && i>=3)await c.val('scrollBy(0,Math.max(450,innerHeight*.9))');
  }
  await writeFile('evidence/live-movie.json',JSON.stringify({responses,exceptions,samples,state},null,2));console.log('LIVE_INSPECT',JSON.stringify({responses,exceptions,state}));
} finally {await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});c.close()}
