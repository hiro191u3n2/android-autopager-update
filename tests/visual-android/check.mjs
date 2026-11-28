import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { visualPage, readVisibleResults } from '../fixtures/google-visible-results.mjs';
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
    await c.send('Fetch.fulfillRequest', {requestId,responseCode:search?200:404,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(search?visualPage(page):'').toString('base64')});
  } catch(error) {
    if (!/Invalid InterceptionId|Invalid interception id/i.test(error.message)) failures.push(error.message);
  }
});
await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
const measure = readVisibleResults.toString();
const url = 'https://www.google.com/search?q=visual';
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
  const refs = new Map();
  for(let n=2;n<=7;n++) {
    await navigate(url+'&start='+(n-1)*10);
    refs.set(n,await c.val('('+measure+')(document.querySelector("#rso"))'));
  }
  for(const [version,file] of [['6.79.0','Android_Generic_AutoPager_v6.79.js'],['6.80.0',process.argv[2]]]) {
    const source = await fs.readFile(file,'utf8');
    const sha = createHash('sha256').update(source).digest('hex');
    const {identifier} = await c.send('Page.addScriptToEvaluateOnNewDocument',{source});
    try {
      await navigate(url);
      for(let n=2;n<=7;n++) {
        const selector = '.generic-autopager-page[data-page="'+n+'"] .generic-autopager-google-source-root';
        await waitFor('(scrollTo(0,document.documentElement.scrollHeight),!!document.querySelector('+JSON.stringify(selector)+'))');
        const root = 'document.querySelector('+JSON.stringify(selector)+')';
        const items = await c.val('('+measure+')('+root+')');
        const ref = refs.get(n);
        const img = items.find(e=>e.tag==='img'), button=items.find(e=>e.tag==='button');
        console.log(version,n,sha,'pin',img.visibleHeight,'date button',button.height);
        if(version==='6.80.0') assert.deepEqual(items,ref);
        else {
          assert.equal(img.visibleHeight,0);
          assert(button.height<ref.find(e=>e.tag==='button').height);
        }
        records.push({version,sha,page:n,provider,reference:ref,items});
        if(n===3) {
          await c.val(root+'.scrollIntoView()');
          await sleep(120);
          const shot=await c.send('Page.captureScreenshot',{format:'png'});
          await fs.writeFile('evidence/page3-'+version+'.png',Buffer.from(shot.data,'base64'));
        }
      }
    } finally { await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier}); }
  }
  assert.deepEqual(failures,[]);
  console.log('PASS native Android comparisons',records.length);
} finally {
  await fs.writeFile('evidence/visible-items.json',JSON.stringify(records,null,2));
  c.close();
}
