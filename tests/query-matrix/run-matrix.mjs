import {readFileSync,appendFileSync} from 'node:fs';
import {terms,fixture,searchFilters} from './matrix.mjs';
import {connect,sleep} from './cdp.mjs';
const [script,output,which='all',backend='native']=process.argv.slice(2);const source=readFileSync(script,'utf8');
let chosen=which==='all'?terms.map((_,i)=>i):which.split(',').map(Number);
const done=new Set();try{for(const l of readFileSync(output,'utf8').trim().split('\n'))done.add(JSON.parse(l).index);}catch{}
const c=await connect();
let ready;
for(let i=0;i<80;i++){
 ready=await c.val('({title:document.title,visible:document.visibilityState,w:innerWidth,h:innerHeight,scrollWidth:document.documentElement?.scrollWidth,text:document.body?.innerText})');
 if(ready?.title==='Pager QA'&&ready.visible==='visible'&&ready.w>=250&&ready.h>=300)break;
 await sleep(250);
}
console.log('APP_SURFACE',JSON.stringify(ready));
if(ready?.title!=='Pager QA'||ready.visible!=='visible'||ready.w<250||ready.h<300)throw Error('Expected the foreground test WebView at phone size');
await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true});
await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
if(backend==='mobile'){await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:800,deviceScaleFactor:1,mobile:true});await c.send('Emulation.setTouchEmulationEnabled',{enabled:true});}console.log(await c.val('navigator.userAgent'));
let current,req=[],errors=[];
c.on('Runtime.exceptionThrown',e=>errors.push((e.exceptionDetails.exception?.description||e.exceptionDetails.text).split('\n').slice(0,2).join(' ')));
c.on('Fetch.requestPaused',async r=>{
 const u=new URL(r.request.url); const doc=u.hostname==='www.google.com'&&u.pathname==='/search', pic=u.pathname==='/salmon.svg';
 if(doc)req.push([u.searchParams.get('q'),u.searchParams.get('start')||'0',Object.fromEntries(Object.keys(searchFilters(terms.indexOf(current))).map(key=>[key,u.searchParams.get(key)]))]);
 const body=doc?fixture(u):pic?'<svg xmlns="http://www.w3.org/2000/svg" width="50" height="45"><rect width="50" height="45" fill="red"/></svg>':'';
 try{await c.send('Fetch.fulfillRequest',{requestId:r.requestId,responseCode:doc||pic?200:404,responseHeaders:[{name:'content-type',value:pic?'image/svg+xml':'text/html; charset=utf-8'},{name:'cache-control',value:'no-store'}],body:Buffer.from(body).toString('base64')});}catch{}
});
await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
for(const index of chosen.filter(n=>!done.has(n))){
 await c.send('Page.navigate',{url:'about:blank'});
 while(await c.val('location.href')!=='about:blank')await sleep(25);
 current=terms[index];req=[];errors=[];
 const before=Date.now();await c.send('Page.navigate',{url:'https://www.google.com/search?'+new URLSearchParams({q:current,...searchFilters(index)})});
 let result, failures=[];
 for(let k=0;k<180;k++){
   await sleep(backend==='native'?250:100);
   try{result=await c.val(`(()=>{const pages=[...document.querySelectorAll('.generic-autopager-page')];window.scrollBy(0,Math.max(400,innerHeight*.9));const cards=[...document.querySelectorAll('[data-qa-item]')].filter(e=>e.getBoundingClientRect().height>0);const ids=cards.map(e=>e.dataset.qaItem);const isVisible=e=>e.getBoundingClientRect().height>0&&getComputedStyle(e).visibility!=='hidden';return {width:innerWidth,height:innerHeight,visible:document.visibilityState,url:location.href, pages:pages.map(e=>Number(e.dataset.page)), sources:pages.map(e=>new URL(e.dataset.sourceUrl).searchParams.get('q')),ids, leak:[...document.querySelectorAll('[data-recipe-card],[data-offer],[data-band]')].filter(isVisible).length,overflow:document.documentElement.scrollWidth-innerWidth,y:Math.round(scrollY),p7top:pages[5]?.getBoundingClientRect().top,status:document.getElementById('generic-autopager-status-v2')?.textContent,detail:document.getElementById('generic-autopager-status-v2')?.title}})()`);}catch{continue;}
   if(result.pages.length>=6&&result.p7top<result.height)break;
   if(errors.length||req.some(([q])=>q!==current)||((Date.now()-before)>1800 && req.length>=2 && /制限|検出|取得でき|確認画面|同意画面|\.at is not|^停止/.test((result.status||'')+(result.detail||''))))break;
   if(Date.now()-before>(backend==='native'?60000:8000))break;
 }
 if(!result||result.pages.join()!=='2,3,4,5,6,7'||!(result.y>0&&result.p7top<result.height))failures.push('page7');
 if(result?.sources.some(q=>q!==current)||req.some(([q])=>q!==current))failures.push('wrong-query');
 if (req.some(([,offset,actual],i)=>Number(offset)!==i*10 || Object.entries(searchFilters(index)).some(([key,value])=>actual[key]!==value))) failures.push('offset-or-filter');
 const ids=result?.ids||[];
 if(Array.from({length:7},(_,n)=>[0,1,2].map(i=>'item-'+(n+1)+'-'+i)).flat().some(id=>!ids.includes(id)))failures.push('missing-organic');
 if(new Set(ids).size!==ids.length)failures.push('duplicate-organic');
 if(result?.leak)failures.push('leaked-module');if(result?.overflow>2)failures.push('overflow');if(errors.length)failures.push('js-error');
 const record={index,q:current,failures,requests:req.slice(),result,errors:errors.slice(0,4),elapsed:Date.now()-before};appendFileSync(output,JSON.stringify(record)+'\n');console.log(index,current,failures.join(',')||'PASS',record.elapsed,failures.length?JSON.stringify(record):'');
}
c.close();
