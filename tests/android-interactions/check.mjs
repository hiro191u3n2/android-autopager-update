import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect, sleep } from './cdp.mjs';
import { movieGeometry, movieGridPage } from '../fixtures/google-movie-grid.mjs';

const url = 'https://www.google.com/search?q=' + encodeURIComponent('ぶしのいちぶん') + '&hl=ja';
const c = await connect();
const saved = {};
const candidate = await fs.readFile(process.argv[2], 'utf8');
const wait = async expression => {
  for (let i = 0; i < 180; i++) {
    if (await c.val(expression)) return;
    await sleep(150);
  }
  throw Error(expression);
};
async function open(address) {
  await c.send('Page.navigate', { url: 'about:blank' });
  await wait('location.href === "about:blank"');
  await c.send('Page.navigate', { url: address });
  await wait('location.pathname === "/search" && document.readyState === "complete"');
}
async function shot(name) {
  await sleep(100);
  const { data } = await c.send('Page.captureScreenshot', {format:'png'});
  await fs.writeFile('evidence/' + name + '.png', Buffer.from(data,'base64'));
}
async function runFixtures() {
  c.on('Fetch.requestPaused', async ({requestId, request}) => {
    const u = new URL(request.url), n = 1 + Number(u.searchParams.get('start')) / 10;
    const html = u.hostname === 'www.google.com' && n <= 7 ? movieGridPage(n) : '<main>終了</main>';
    try {
      await c.send('Fetch.fulfillRequest', {requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(html).toString('base64')});
    } catch(e) { if (!/Invalid InterceptionId|Invalid interception id/i.test(e.message)) throw e; }
  });
  await c.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  for (const [version, script] of [['source', null], ['v682', await fs.readFile('Android_Generic_AutoPager_v6.82.js','utf8')], ['v683',candidate]]) {
    const session = script && await c.send('Page.addScriptToEvaluateOnNewDocument', {source:script});
    try {
      await open(script ? url : url + '&start=20');
      if (script) {
        await wait('(scrollTo(0,document.documentElement.scrollHeight),document.querySelector(\'.generic-autopager-page[data-page="7"]\')) !== null');
      }
      const geom = await c.val('(' + movieGeometry.toString() + ')()');
      saved[version] = geom;
      console.log(version, JSON.stringify(geom));
      await c.val('document.querySelector(\'[data-item="movie"]\').scrollIntoView({block:"center"})');
      await shot(version);
      if (version === 'v682') {
        assert.equal(geom.areas, 'none');
        assert(geom.boxes.h3[0] > geom.cardWidth * .69);
        assert.equal(geom.boxes.h3[1], geom.boxes.p[1]);
      } else if (version === 'v683') assert.deepEqual(geom, saved.source);
    } finally { if (session) await c.send('Page.removeScriptToEvaluateOnNewDocument',session); }
  }
  await c.send('Fetch.disable');
}
function liveState() {
  const pages = [...document.querySelectorAll('.generic-autopager-page')];
  const grids = [], yahoo = [];
  for (const page of pages) {
    for (const h of page.querySelectorAll('h3,[role="heading"]')) {
      const r = h.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const target = /Yahoo[!！]?検索/i.test(h.innerText);
      if (target) yahoo.push({page:page.dataset.page, title:h.innerText.slice(0,60),
        x:Math.round(r.x),width:Math.round(r.width), viewport:innerWidth});
      for (let p=h;p && p!==page;p=p.parentElement) {
        const s=getComputedStyle(p);
        if (!s.display.includes('grid') || s.gridTemplateAreas==='none') continue;
        grids.push({page:page.dataset.page, title:h.innerText.slice(0,55),width:Math.round(r.width),
          x:Math.round(r.x),areas:s.gridTemplateAreas});
        break;
      }
    }
  }
  return { pages:pages.map(p=>p.dataset.page),grids,yahoo,
    gate:location.pathname.startsWith('/sorry') || !!document.querySelector('#captcha-form,iframe[src*="recaptcha"]') };
}
try {
  saved.provider = await c.val('navigator.userAgent');
  saved.sha256 = createHash('sha256').update(candidate).digest('hex');
  await runFixtures();
  if (saved.provider.includes('Android 17')) {
    await c.send('Page.addScriptToEvaluateOnNewDocument',{source:candidate});
    await c.send('Page.navigate',{url});
    for (let i=0;i<115;i++) {
      await sleep(700);
      const state=await c.val('(' + liveState.toString() + ')()');
      saved.live = state;
      if (state.gate || state.pages.includes('7')) break;
      if (i>2) await c.val('scrollBy(0,innerHeight*.9)');
    }
    console.log('LIVE',JSON.stringify(saved.live));
    if (saved.live.yahoo.length) {
      await c.val('[...document.querySelectorAll(\'.generic-autopager-page h3,.generic-autopager-page [role="heading"]\')].find(n=>/Yahoo[!！]?検索/i.test(n.innerText)&&n.getBoundingClientRect().width)?.scrollIntoView({block:"center"})');
      await shot('live-yahoo');
    }
  }
} finally {
  await fs.writeFile('evidence/movie-grids.json',JSON.stringify(saved,null,2));
  c.close();
}
