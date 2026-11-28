import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gapCases, emptyGapCases, gapPage, measureGap } from '../fixtures/google-leading-gap.mjs';
import { connect, sleep } from './cdp.mjs';
const c=await connect();
console.log('WEBVIEW', await c.val('navigator.userAgent'));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled',{cacheDisabled:true});
let sample, failures=[];
c.on('Runtime.exceptionThrown',e=>failures.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
c.on('Fetch.requestPaused',async ({requestId,request})=>{
  const u=new URL(request.url), search=u.hostname==='www.google.com'&&u.pathname==='/search';
  const n=1+Number(u.searchParams.get('start'))/10;
  const html=search&&n<=4?gapPage(n,sample):'<main>終了</main>';
  try {
    await c.send('Fetch.fulfillRequest',{requestId,responseCode:search?200:404,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(html).toString('base64')});
  } catch (error) {
    // A prefetched frame can be discarded when we navigate to the next test.
    if (!/Invalid InterceptionId|Invalid interception id/i.test(error.message)) failures.push(error.message);
  }
});
await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
const records=[];
try {
  for(const [label,path] of [['6.78.0','Android_Generic_AutoPager_v6.78.js'],['6.79.0',process.argv[2]]]){
    const source=await fs.readFile(path,'utf8');
    const sha=createHash('sha256').update(source).digest('hex');
    const {identifier}=await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
    try{
      for(sample of gapCases){
        await c.send('Page.navigate',{url:'about:blank'});
        for(let i=0;i<60 && await c.val('location.href')!=='about:blank';i++)await sleep(50);
        failures=[];
        await c.send('Page.navigate',{url:'https://www.google.com/search?q='+encodeURIComponent('ぶしのいちぶん')});
        let result;
        for(let i=0;i<150;i++){
          await sleep(150);
          await c.val('scrollBy(0,innerHeight*.85)');
          if(await c.val('!!document.querySelector(\'.generic-autopager-page[data-page="4"] [data-item]\')')){
            result=await c.val('('+measureGap.toString()+')()');
            break;
          }
        }
        assert(result,'Page four did not appear: '+sample);
        console.log('MEASURE',JSON.stringify({label,sample,sha,...result,failures}));
        assert.deepEqual(failures,[]);
        const blank=emptyGapCases.includes(sample);
        const expected=sample==='short'?8:blank&&label==='6.79.0'?0:250;
        assert.equal(result.slot,expected);
        assert(Math.abs(result.gap-result.normalGap-expected)<=1);
        assert.deepEqual(result.cards,[['武士の一分 [HD DVD]','https://www.amazon.co.jp/movie/amazon'],['武士の一分 宅配DVDレンタル','https://tsutaya.example/movie/tsutaya']]);
        records.push({label,sample,sha,...result});
        if(sample==='empty'){
          await c.val('document.querySelector(\'.generic-autopager-page[data-page="3"]\').scrollIntoView()');
          await sleep(120);
          const shot=await c.send('Page.captureScreenshot',{format:'png'});
          await fs.writeFile('evidence/page3-'+label+'.png',Buffer.from(shot.data,'base64'));
        }
      }
    }finally{await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});}
  }
  await fs.writeFile('evidence/measurements.json',JSON.stringify(records,null,2));
  console.log('PASS',records.length,'measurements');
}finally{c.close();}
