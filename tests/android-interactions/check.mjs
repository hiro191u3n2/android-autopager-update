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
  const search = url.hostname === 'www.google.com' && url.pathname === '/search';
  try {
    await c.send('Fetch.fulfillRequest', {requestId,responseCode:search?200:404,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(search && page<=4?interactionPage(page,sample):'<main>終了</main>').toString('base64')});
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
  await waitFor('location.href === '+JSON.stringify(target)+' && document.readyState === "complete" && !!document.querySelector("#rso")');
}
try {
  const provider = await c.val('navigator.userAgent');
  console.log('WebView',provider);
  for(const [version,file] of [['6.80.0','Android_Generic_AutoPager_v6.80.js'],['6.81.0',process.argv[2]]]) {
    const source = await fs.readFile(file,'utf8'), old=version==='6.80.0';
    const sha = createHash('sha256').update(source).digest('hex');
    const {identifier} = await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
    try {
      for(sample of [...residualGaps,...preservedStarts,'controls']) {
        await navigate(url);
        for(const n of [2,3,4]) {
          const sel = '.generic-autopager-page[data-page="'+n+'"] [data-item]';
          await waitFor('(scrollTo(0,document.documentElement.scrollHeight),!!document.querySelector('+JSON.stringify(sel)+'))');
          if (n===3 && sample==='late') await c.val(`document.querySelector('[data-transient]')?.remove()`);
        }
        if (sample==='late') await sleep(600);
        const m = await c.val('('+measureGap.toString()+')()');
        if(sample==='controls') {
          const result = await c.val('('+operateThirdPage.toString()+')()');
          if(old) assert(!result.checkedHere && result.checkedFirst && !result.jumpHere && !result.otherRadios);
          else assert.deepEqual(result,{checkedHere:true,checkedFirst:false,jumpHere:true,otherRadios:true,radioHere:true,formHere:true,external:'https://other.example/#day',details:true});
          for (const width of [660,320]) {
            await c.send('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:2,mobile:true});
            await sleep(100);
            const widths=await c.val('('+gridWidths.toString()+')()');
            if(old) assert.notEqual(...widths);else assert.equal(...widths);
          }
          await c.send('Emulation.clearDeviceMetricsOverride');
          m.operations=result;
        } else if(old && sample==='caption') assert(m.gap<80);
        else if(old || preservedStarts.includes(sample)) assert(m.gap>=235,JSON.stringify(m));
        else assert(Math.abs(m.gap-m.normalGap)<=1,JSON.stringify(m));
        records.push({version,sha,sample,provider,...m});
        console.log('MEASURE',version,sample,m.gap,m.normalGap,sha);
        if (sample==='padding') {
          await c.val(`document.querySelector('.generic-autopager-page[data-page="3"]').scrollIntoView()`);
          await sleep(120);
          const shot=await c.send('Page.captureScreenshot',{format:'png'});
          await fs.writeFile('evidence/third-page-'+version+'.png',Buffer.from(shot.data,'base64'));
        }
      }
    } finally { await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier}); }
  }
  assert.deepEqual(failures,[]);
  console.log('PASS native Android comparisons',records.length);
  if (provider.includes('Android 17')) {
    await c.send('Fetch.disable');
    const docStatus=[];
    c.on('Network.responseReceived', e=>{ if(e.type==='Document'){const u=new URL(e.response.url); docStatus.push([u.hostname,u.pathname,e.response.status]);} });
    await c.send('Page.navigate',{url:url+'&hl=ja&start=20'});
    for(let i=0;i<60;i++) {
      await sleep(250);
      if (await c.val("location.hostname.endsWith('google.com') && document.readyState==='complete'")) break;
    }
    const result=await c.val("({path:location.pathname.slice(0,90),source:!!document.querySelector('#rso'),amazon:[...document.querySelectorAll('h3,[role=heading]')].some(e=>/武士の一分.*HD DVD/.test(e.innerText))})");
    await fs.writeFile('evidence/live-check.json',JSON.stringify({docStatus,result},null,2));
    console.log('LIVE',JSON.stringify({docStatus,result}));
  }
} finally {
  await fs.writeFile('evidence/visible-items.json',JSON.stringify(records,null,2));
  c.close();
}
