import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { connect, sleep } from './cdp.mjs';
const [start,end]=process.argv.slice(2).map(Number);
const terms=JSON.parse(await fs.readFile(new URL('terms.json', import.meta.url),'utf8'));
assert.equal(new Set(terms).size,1000);
try { await fs.stat('evidence/blocked.json'); console.log('Google verification or limit already encountered'); process.exit(0); } catch(e){if(e.code!=='ENOENT')throw e}
const code=await fs.readFile('android-generic-autopager.user.js','utf8');
const sha256=createHash('sha256').update(code).digest('hex');
const c=await connect(); const provider=await c.val('navigator.userAgent');
assert(provider.includes('Android 17'));
await c.send('Network.enable');
let documents=[], gate=null, errors=[];
c.on('Network.responseReceived',({type,response})=>{
  if(type!=='Document')return;
  const u=new URL(response.url);
  if(!/(^|\.)google\.[a-z.]+$/.test(u.hostname))return;
  if(u.pathname.startsWith('/sorry') || u.pathname==='/search'&&[403,429].includes(response.status))gate={path:u.pathname,status:response.status};
  if(u.pathname==='/search')documents.push([u.searchParams.get('q'),Number(u.searchParams.get('start')),response.status]);
});
c.on('Runtime.exceptionThrown',e=>errors.push(String(e.exceptionDetails.exception?.description||e.exceptionDetails.text).split('\n')[0].slice(0,120)));
function results(root) {
  if(!root)return [];
  return [...root.querySelectorAll('h3,[role="heading"]')].flatMap(h=>{
    const a=h.closest('a[href]')||h.querySelector('a[href]');
    if(!a||!h.getBoundingClientRect().width||!h.getBoundingClientRect().height)return [];
    const t=h.textContent.trim().replace(/\s+/g,' ');
    if(!t)return [];
    return [{t,link:a.href}];
  });
}
function watchSource() {
  if(location.pathname!=='/search')return;
  if(top===self){window.auditSource=new Map();return}
  const n=1+Number(new URL(location.href).searchParams.get('start'))/10;
  function collect(){
    try {
      const root=document.querySelector('#rso,#search');
      const list=results(root);
      if(list.length && parent.auditSource)parent.auditSource.set(n,list);
    }catch{}
  }
  addEventListener('DOMContentLoaded',collect);
  addEventListener('load',collect);
  setInterval(collect,300);
}
const sourceListener=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:'{'+results.toString()+';('+watchSource.toString()+')()}'});
const script=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:code});
function sample(term) {
  const pages=[...document.querySelectorAll('.generic-autopager-page')].map(p=>Number(p.dataset.page));
  const root=document.querySelector('#rso,#search');
  const gate=location.pathname.startsWith('/sorry')||!!document.querySelector('form#captcha-form,form[action*="/sorry/"]')||
    /unusual traffic from your computer network|お使いのコンピュータ ネットワークから通常と異なるトラフィック/i.test(document.body?.innerText.slice(0,1300)||'');
  return {matches:new URL(location.href).searchParams.get('q')===term,pages,gate,root:!!root,
    first:root?.querySelectorAll('h3,[role="heading"]').length||0,status:document.querySelector('#generic-autopager-status-v2')?.innerText,
    more:!!document.querySelector('a#pnnext,a[rel=next],a[href*="start="]')};
}
function audit() {
  const sections=[...document.querySelectorAll('.generic-autopager-page')];
  return sections.filter(p=>Number(p.dataset.page)<=7).map(p=>{
    const n=Number(p.dataset.page), root=p.querySelector('.generic-autopager-google-source-root');
    const incoming=window.auditSource?.get(n)||[], actual=results(root), titles=actual.map(v=>v.t);
    const matching=incoming.filter(v=>titles.includes(v.t));
    const dest=v=>{const u=new URL(v);if(u.pathname==='/url'||u.pathname==='/goto'){const w=u.searchParams.get('url')||u.searchParams.get('q');if(w&&/^https?:\/\//.test(w))return w;}return v;};
    const missing=incoming.filter(v=>!titles.includes(v.t));
    const redirect=matching.filter(v=>!actual.some(a=>v.t===a.t&&dest(v.link)===dest(a.link)));
    const positions=matching.map(v=>titles.indexOf(v.t));
    const inversions=positions.filter((v,i)=>i>0&&v<positions[i-1]).length;
    return {page:n,source:incoming.length,visible:actual.length,matching:matching.length,missing:missing.map(v=>v.t.slice(0,70)).slice(0,4),
      changedTarget:redirect.map(v=>v.t.slice(0,70)).slice(0,4),inversions};
  });
}
const evalFn=(fn,arg)=>'('+fn.toString()+')('+ (arg===undefined?'':JSON.stringify(arg)) +')';
try {
  for(let i=start;i<end;i++){
    const term=terms[i];gate=null;errors=[];documents=[];
    const begun=Date.now();
    await c.send('Page.navigate',{url:'https://www.google.com/search?hl=ja&q='+encodeURIComponent(term)});
    let s={},previous=-1,last=Date.now(),painted=false;
    while(Date.now()-begun<85000){
      await sleep(500);
      try {s=await c.val(evalFn(sample,term))}catch{continue}
      if(gate||s.gate){gate ||= {path:'verification',status:null};break}
      if(!s.matches)continue;
      if(s.pages.length!==previous){previous=s.pages.length;last=Date.now()}
      if(s.pages.includes(7)){
        await c.val('document.querySelector(\'.generic-autopager-page[data-page="7"]\').scrollIntoView({block:"start"})');
        await sleep(90);
        painted=await c.val(`(()=>{const p=document.querySelector('.generic-autopager-page[data-page="7"]'), root=p?.querySelector('.generic-autopager-google-source-root');if(!root)return false;const r=root.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&scrollY>0;})()`);
        if(painted)break;
      }
      if(Date.now()-last>23000 && (s.root||Date.now()-begun>40000))break;
      if(s.first||previous>0)await c.val('scrollTo(0,Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))');
    }
    let summaries=[];if(!gate&&s.matches)summaries=await c.val('{'+results.toString()+';'+evalFn(audit)+'}');
    const row={index:i,term,pages:s.pages||[],painted,gate,ms:Date.now()-begun,status:s.status,first:s.first,more:s.more,documents,summaries,errors:errors.slice(0,4)};
    await fs.appendFile('evidence/results-'+start+'.jsonl',JSON.stringify(row)+'\n');
    await fs.writeFile('evidence/state-'+start+'.json',JSON.stringify({sha256,provider,last:i},null,2));
    console.log(i+1,term,JSON.stringify(s.pages),painted,gate||'');
    if(gate){await fs.writeFile('evidence/blocked.json',JSON.stringify({index:i,term,gate},null,2));break}
    await sleep(800);
  }
}finally{
  await c.send('Page.removeScriptToEvaluateOnNewDocument',script);
  await c.send('Page.removeScriptToEvaluateOnNewDocument',sourceListener);
  c.close();
}
