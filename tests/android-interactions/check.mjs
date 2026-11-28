import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect,sleep } from './cdp.mjs';
import { readingPage,measureReadingOrder } from '../fixtures/google-reading-order.mjs';
const url='https://www.google.com/search?q='+encodeURIComponent('ぶしのいちぶん');
const c=await connect();
const observations=[];
c.on('Fetch.requestPaused',async({request,requestId})=>{
  const u=new URL(request.url),n=1+Number(u.searchParams.get('start'))/10;
  const search=u.hostname==='www.google.com'&&u.pathname==='/search';
  const html=search&&n<=7?readingPage(n,u.href):'<main>終了</main>';
  try {await c.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(html).toString('base64')})}catch(e){if(!/Invalid InterceptionId|Invalid interception id/i.test(e.message))throw e}
});
async function wait(expression){
  for(let i=0;i<160;i++){if(await c.val(expression))return;await sleep(150)}
  throw Error(expression);
}
try{
  await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  for(const [version,path] of [['6.83','Android_Generic_AutoPager_v6.83.js'],['6.84',process.argv[2]]]){
    const source=await fs.readFile(path,'utf8');
    const id=await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
    try{
      await c.send('Page.navigate',{url:'about:blank'});
      await wait('location.href==="about:blank"');
      await c.send('Page.navigate',{url});
      await wait('(scrollTo(0,document.documentElement.scrollHeight),!!document.querySelector(\'[data-reading="7"]\'))');
      const r=await c.val('('+measureReadingOrder.toString()+')()');
      const doc=await c.send('DOM.getDocument');
      const button=await c.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-reading="3"] [data-narrator]'});
      const ax=await c.send('Accessibility.getPartialAXTree',{nodeId:button.nodeId,fetchRelatives:false});
      const spoken=ax.nodes?.[0]?.name?.value;
      observations.push({version,sha256:createHash('sha256').update(source).digest('hex'),r,spoken,provider:await c.val('navigator.userAgent')});
      if(version==='6.84'){
        assert(r.firstOpen && r.defaults.every(Boolean) && r.local && r.labelHidden);
        assert.deepEqual(r.thirdOpen,[false,true]);assert.equal(spoken,'第3ページの上映日');
        await c.val('document.querySelector(\'[data-reading="3"] [data-local]\').click()');
        await wait('document.querySelector(":target") === document.querySelector(\'[data-reading="3"] [data-note]\') && !!document.querySelector(\'[data-reading="7"]\')');
      }else{assert(!r.firstOpen&&!r.local);assert.equal(spoken,'第1ページの上映日')}
      console.log(version,JSON.stringify(r),spoken);
    }finally{await c.send('Page.removeScriptToEvaluateOnNewDocument',id);}
  }
}finally{await fs.writeFile('evidence/reading.json',JSON.stringify(observations,null,2));c.close();}
