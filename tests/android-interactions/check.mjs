import { readFile, writeFile } from 'node:fs/promises';
import { connect, sleep } from './cdp.mjs';
const c=await connect();
const responses=[];
await c.send('Network.enable');
c.on('Network.responseReceived', e=>{
  if(e.type!=='Document')return;
  const u=new URL(e.response.url);
  responses.push([u.hostname,u.pathname,e.response.status]);
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
      overlayState:document.querySelector('#generic-autopager-status')?.innerText?.slice(0,90)};
  };
  let state;
  const samples=[];
  for(let i=0;i<24;i++){
    await sleep(1000);
    state=await c.val('('+inspect.toString()+')()');
    if(i%3===0)samples.push(state);
    if(state.unusual||state.consent||responses.some(v=>v[2]===429)||state.pages.includes('3'))break;
    if(state.search && state.headers>0 && i>=3)await c.val('scrollBy(0,Math.max(450,innerHeight*.9))');
  }
  await writeFile('evidence/live-movie.json',JSON.stringify({responses,samples,state},null,2));console.log('LIVE_INSPECT',JSON.stringify({responses,state}));
} finally {await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});c.close()}
