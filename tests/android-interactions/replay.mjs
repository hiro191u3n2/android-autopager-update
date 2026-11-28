import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {connect,sleep} from './cdp.mjs';
import {readingPage,measureReadingOrder} from '../fixtures/google-reading-order.mjs';
const terms=JSON.parse(await fs.readFile(new URL('terms.json',import.meta.url),'utf8'));
const script=await fs.readFile(process.argv[2],'utf8');
const shard=Number(process.argv[3]), c=await connect();
const errors=[];
let index,requests;
function response(u) {
  const n=1+Number(u.searchParams.get('start'))/10;
  const term=u.searchParams.get('q');
  const next=new URL(u.href);next.searchParams.set('start',n*10);
  const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  if(n>7 || n===4&&index%4===0) {
    const nav=n===4?'<nav><a id="pnnext" href="'+esc(next.href)+'">次へ</a></nav>':'';
    return '<!doctype html><meta name="viewport" content="width=device-width"><main id="search"><div id="rso"><div role="navigation"><a href="https://help.example/'+n+'">検索ヘルプ</a></div></div></main>'+nav;
  }
  let html=readingPage(n,u.href).replace(/href="\/search\?q=ぶしのいちぶん&amp;start=\d+"/g,'href="'+esc(next.href)+'"');
  const hidden='<span id="narration" hidden>第'+n+'ページの上映日</span>';
  if(index%3===1)html=html.replace(hidden,'<div hidden><span id="narration">第'+n+'ページの上映日</span></div>');
  if(index%3===2)html=html.replace(hidden,'<span hidden id="narration">第'+n+'<b>ページの上映日</b></span>');
  const quote=esc(term),css=['display:block','display:grid;grid-template-columns:1fr','display:flex;flex-direction:column','display:flow-root'][index%4];
  return html.replace('<section data-reading=', '<section data-term="'+quote+'" style="'+css+'" data-reading=')
    .replace('<p id="注釈"','<p lang="ja" id="注釈"');
}
c.on('Fetch.requestPaused',async e=>{
  const u=new URL(e.request.url), doc=u.origin==='https://www.google.com'&&u.pathname==='/search';
  if(doc)requests.push([u.searchParams.get('q'),+u.searchParams.get('start')]);
  try {await c.send('Fetch.fulfillRequest',{requestId:e.requestId,responseCode:doc?200:404,responseHeaders:[{name:'content-type',value:'text/html; charset=utf-8'}],body:Buffer.from(doc?response(u):'').toString('base64')})}
  catch(error){if(!/Invalid InterceptionId|Invalid interception id/i.test(error.message))errors.push(error.message)}
});
await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
await c.send('Page.addScriptToEvaluateOnNewDocument',{source:script});
const provider=await c.val('navigator.userAgent');const sha=createHash('sha256').update(script).digest('hex');
await fs.writeFile('evidence/replay-version.json',JSON.stringify({sha,provider,shard,network:'intercept-all'}));
async function wait(expr,timeout=19000){
  const start=Date.now();
  while(Date.now()-start<timeout){if(await c.val(expr))return true;await sleep(85)}
  return false;
}
let failures=0;
try{
  for(index=shard*100;index<(shard+1)*100;index++){
    await c.send('Page.navigate',{url:'about:blank'});await wait('location.href==="about:blank"');
    requests=[];errors.length=0;
    const term=terms[index],status={index,term};
    try{
      await c.send('Page.navigate',{url:'https://www.google.com/search?'+new URLSearchParams({q:term,hl:'ja'})});
      assert(await wait('(scrollTo(0,document.documentElement?.scrollHeight||0),!!document.querySelector(\'[data-reading="7"]\'))'),'seven');
      await c.val('document.querySelector(\'[data-reading="7"]\').scrollIntoView({block:"center"})');
      status.painted=await c.val(`(()=>{const b=document.querySelector('[data-reading="7"] summary').getBoundingClientRect();return b.width>0 && b.top<innerHeight && b.bottom>0 && scrollY>0})()`);
      assert(status.painted,'seventh page painted');
      status.pages=await c.val('Array.from(document.querySelectorAll(".generic-autopager-page"),n=>+n.dataset.page)');
      assert.deepEqual(status.pages,index%4===0?[2,3,5,6,7]:[2,3,4,5,6,7]);
      const r=await c.val('('+measureReadingOrder.toString()+')()');
      assert(r.firstOpen&&r.local&&r.defaults.every(Boolean),'independent controls and local destination');
      assert.deepEqual(r.thirdOpen,[false,true]);assert.equal(r.label,'第3ページの上映日');
      assert.equal(new URL(r.other).hostname,'cinema.example');assert.equal(new URL(r.missing).searchParams.get('start'),'20');
      await c.val('document.querySelector(\'[data-reading="3"] [data-local]\').click()');
      assert(await wait('document.querySelector(":target")===document.querySelector(\'[data-reading="3"] [data-note]\')&&!!document.querySelector(\'[data-reading="7"]\')',1500),'activation');
      const expected=await c.val('Array.from(document.querySelectorAll("[data-term]"),n=>n.dataset.term)');
      assert(expected.every(v=>v===term),'cross-query');
      assert(requests.every(([q])=>q===term),'unexpected query request');
      assert.deepEqual(requests.slice(0,7).map(([,start])=>start),[0,10,20,30,40,50,60]);
      assert.equal(new Set(requests.map(([,offset])=>offset)).size,requests.length);
      assert(!requests.some(([,offset])=>offset>70),'request beyond terminal empty page');
      assert(!errors.length,errors.join(','));
    }catch(error){status.error=error.message.slice(0,350);failures++}
    status.offsets=requests.map(([,offset])=>offset);
    await fs.appendFile('evidence/replay.jsonl',JSON.stringify(status)+'\n');
    if(status.error||index%10===9)console.log(index,status.error||'PASS');
    if(failures>3)break;
  }
  assert.equal(failures,0);
}finally{c.close();}
