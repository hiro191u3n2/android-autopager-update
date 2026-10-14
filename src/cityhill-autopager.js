/* generic-cityhill-product-autopager-v642 */
(() => {
  'use strict';
  const listPath = p => /^\/(?:sp\/)?(?:majesticlegon\/)?item\/(?:search|preorder|new|newarrival|ranking|sale|index|list)(?:\.html|\/)?$/i.test(p);
  if (!/^store\.cityhill\.co\.jp$/i.test(location.hostname) || !listPath(location.pathname)) return;
  // Reserve CITYHILL before the v6.41 adapter/generic engine runs, including child frames.
  window.__genericFashionAutoPagerV641 = true;
  if (window.top !== window.self || window.__genericCityhillAutoPagerV642) return;
  window.__genericCityhillAutoPagerV642 = true;
  const ATTR = 'data-generic-cityhill-autopager', PRELOAD = 1400, MAX_PAGES = 80;
  const PAGER = '[class*="pagina" i],[class*="pagenation" i],[class*="paging" i],[class*="pager" i],[class*="page_navi" i],[class*="page-navi" i],[class*="pagenavi" i],[class*="page_nav" i],[class*="page-nav" i],[class*="pageNav" i],[class*="page_link" i],[class*="page-link" i],[class*="pageLink" i],[class*="page_num" i],[class*="page-num" i],[class*="pageNumber" i],[id*="pagina" i],[id*="paging" i],[id*="pager" i],[id*="page_navi" i],[id*="pageNavi" i],[role="navigation"][aria-label*="ページ"],[role="navigation"][aria-label*="pag" i],[class~="page"],[class~="pages"],.pageList,.page-list,.page_list,[class*="page_next" i],[class*="page-next" i],[class*="pageNext" i]';
  const EXCLUDE = 'header,footer,aside,[hidden],[aria-hidden="true"],[class*="recommend" i],[id*="recommend" i],[class*="ranking" i],[class*="recent" i],[class*="carousel" i],[class*="slick" i],#generic-cityhill-render';
  const PAGE = /^(?:p|pg|page|pageno|page_no|pno|page_num|pagenum|page_number|pagenumber|pageindex|page_index|currentpage|current_page|start|offset)$/i;
  const NUM = v => /^\d+$/.test(String(v ?? '')) && Number.isSafeInteger(+v) ? +v : null;
  const text = e => (e?.textContent || '').replace(/\s+/g,' ').trim();
  const route = p => p.replace(/^\/sp\//,'/').replace(/\/$/,'');
  const keyURL = raw => { const u = new URL(raw,location.href); u.hash='';u.searchParams.sort();return u.href; };
  const sameValues = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const disabled = el => !!el?.closest('[disabled],[aria-disabled="true"],.disabled,.is-disabled,.off');
  function visible(el) {
    if (el.closest('[hidden],[aria-hidden="true"]')) return false;
    return !el.ownerDocument.defaultView || !!el.getClientRects().length;
  }
  function productURL(a, base) {
    try {
      const u = new URL(a.getAttribute('href'),base);
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return null;
      if (!/\/item\/(?:\d+(?:[-_]\w+)?\.html|detail(?:\.html|\/[^/]+))$/i.test(u.pathname)) return null;
      if (/\/detail\.html$/i.test(u.pathname) && ![...u.searchParams.keys()].some(k => /^(id|item_?id|code|item_?code)$/i.test(k))) return null;
      return u;
    } catch (_) { return null; }
  }
  function productLinks(root,base) {
    return [...(root.matches?.('a[href]')?[root]:[]),...root.querySelectorAll('a[href]')].filter(a=>productURL(a,base));
  }
  function productID(a,base) {
    const u=productURL(a,base); if(!u)return null;
    if(/\/detail\.html$/i.test(u.pathname))return route(u.pathname)+'?'+[...u.searchParams].filter(([k])=>/^(id|item_?id|code|item_?code)$/i.test(k)).map(([k,v])=>k+'='+v).join('&');
    return route(u.pathname);
  }
  function itemKey(el,base) {
    const links=productLinks(el,base), a=links.find(a=>a.querySelector('img,picture')) || links[0];
    if(!a)return null;const u=productURL(a,base), q=new URLSearchParams();
    for(const [k,v] of u.searchParams) if(/^(?:id|code|item_?id|item_?code|cl|colvar|color.*|clr|sku|variation.*)$/i.test(k))q.append(k,v);
    for(const k of ['data-color','data-color-id','data-color-code','data-sku']) if(el.getAttribute(k))q.append(k,el.getAttribute(k));
    q.sort();return route(u.pathname)+'?'+q.toString();
  }
  const cards=(list,base)=>[...list.children].filter(el=>productLinks(el,base).length && !el.hasAttribute('data-cityhill-sentinel'));
  function listing(doc,base) {
    const candidates=new Set();
    for(const a of doc.querySelectorAll('a[href]')) {
      if(!productURL(a,base)||a.closest(EXCLUDE)||!visible(a))continue;
      let el=a.parentElement;
      for(let depth=0;el&&depth<7;depth++,el=el.parentElement) {
        if(el===doc.body || el.matches('header,footer,aside') || el.closest(EXCLUDE))break;
        candidates.add(el);
      }
    }
    let best=null,score=-1;
    for(const el of candidates) {
      const children=cards(el,base);if(!children.length||!visible(el))continue;
      if(children.some(c=>new Set(productLinks(c,base).map(a=>productID(a,base))).size>1))continue;
      const hint=el.id+' '+el.className;
      const n=Math.min(children.length,200)*20+(/item|product|goods/i.test(hint)?35:0)+(/list|grid/i.test(hint)?45:0);
      if(n>score){best=el;score=n;}
    }
    return best;
  }
  function paginationHint(el) {
    return [text(el),el?.getAttribute('rel'),el?.getAttribute('aria-label'),el?.getAttribute('title'),el?.querySelector('img')?.alt,el?.value,el?.className,el?.parentElement?.className].join(' ');
  }
  function explicitNext(el) { return /次(?:へ|の|ページ|を|$)|next|[›»＞→]|^\s*>\s*$/i.test(paginationHint(el)); }
  function forwardURL(raw,base,explicit=false) {
    try {
      if(!raw || /^\s*(?:#|javascript:)/i.test(raw))return null;
      const from=new URL(base),to=new URL(raw,base);
      if(!/^https?:$/.test(to.protocol)||to.origin!==from.origin||route(to.pathname)!==route(from.pathname))return null;
      let change=null,distance=Infinity;
      for(const k of to.searchParams.keys()) {
        if(!PAGE.test(k))continue;
        const v=NUM(to.searchParams.get(k));if(v===null)continue;
        const old=NUM(from.searchParams.get(k)) ?? (/start|offset|index/i.test(k)?0:1);
        const step=/start|offset/i.test(k)?(NUM(from.searchParams.get('rows')||from.searchParams.get('limit')||from.searchParams.get('count'))||null):1;
        if(v>old&&((step&&v===old+step)||explicit)){change=k;distance=v-old;break;}
        // Explicit native next link may use a zero-based first page, even without a URL parameter.
        if(explicit&&!from.searchParams.has(k)&&v===1){change=k;distance=1;break;}
      }
      if(!change)return null;
      for(const k of new Set(from.searchParams.keys())) {
        if(k===change)continue;
        if(to.searchParams.has(k)) {if(!sameValues(from.searchParams.getAll(k),to.searchParams.getAll(k)))return null;}
        else for(const v of from.searchParams.getAll(k))to.searchParams.append(k,v);
      }
      to.hash='';return {url:to.href,distance};
    } catch(_){return null;}
  }
  function pagerControls(doc) {
    return [...new Set([...doc.querySelectorAll(PAGER)].flatMap(p=>[...p.querySelectorAll('a,button,input[type="button"],input[type="submit"],[role="button"]')]).concat([...doc.querySelectorAll('a[rel~="next"],button[rel~="next"]')]))];
  }
  function nextControl(doc,base) {
    const all=[...doc.querySelectorAll('link[rel~="next"][href],a[href]')],direct=[];
    for(const a of all) {
      if(disabled(a)||(!a.matches('link')&&!visible(a)))continue;
      if(!a.matches('link[rel~="next"]')&&!a.closest(PAGER)&&!explicitNext(a)&&!/^\d+$/.test(text(a)))continue;
      const found=forwardURL(a.getAttribute('href'),base,explicitNext(a));
      if(found)direct.push({...found,node:a,priority:explicitNext(a)?0:1,kind:'url'});
    }
    direct.sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
    if(direct.length)return direct[0];
    // Next-only controls are safe to activate inside a sandboxed frame, never in the visible page.
    const controls=pagerControls(doc);
    const current=[...doc.querySelectorAll(PAGER)].flatMap(p=>[...p.querySelectorAll('[aria-current="page"],.current,.active,.is-current,.is-active')]).map(el=>NUM(text(el))).find(v=>v!==null);
    for(const el of controls) {
      if(disabled(el)||!visible(el)||el.closest(EXCLUDE))continue;
      const n=NUM(el.getAttribute('data-page')||el.getAttribute('data-pageno')||text(el));
      if(!explicitNext(el) && !(current!==undefined&&n===current+1))continue;
      const href=el.getAttribute('href');
      // Do not turn a rejected cross-origin/filter-changing link into a native click fallback.
      if(href&&!/^\s*(?:#|javascript:)/i.test(href))continue;
      return {kind:'native',node:el,url:null};
    }
    // Some mobile templates expose only a load-more button, outside a numbered pager.
    const list=listing(doc,base);
    if(list)for(const el of doc.querySelectorAll('button,a,[role="button"]')) {
      if(disabled(el)||!visible(el)||el.closest(EXCLUDE)||list.contains(el))continue;
      const label=text(el)||el.getAttribute('aria-label')||'';
      if(!/^(?:もっと(?:見る|表示|読み込む)|さらに(?:表示|読み込む)|次の\s*\d+\s*件(?:を表示)?|load\s*more|show\s*more)$/i.test(label))continue;
      if(!(list.compareDocumentPosition(el)&4))continue;
      const href=el.getAttribute('href');if(href&&!/^\s*(?:#|javascript:)/i.test(href))continue;
      return {kind:'native',node:el,url:null};
    }
    return null;
  }
  function prepare(root,base) {
    root.querySelectorAll('script,iframe,object,embed,base,link,style').forEach(e=>e.remove());
    for(const el of [root,...root.querySelectorAll('*')]) {
      for(const a of [...el.attributes])if(/^on/i.test(a.name)||a.name==='srcdoc')el.removeAttribute(a.name);
      for(const k of ['href','src','poster','action']) {
        const v=el.getAttribute(k);if(!v||v[0]==='#')continue;
        if(/^\s*(?:javascript|vbscript):/i.test(v)){el.removeAttribute(k);continue;}
        try{el.setAttribute(k,new URL(v,base).href);}catch(_){}
      }
    }
    for(const img of root.querySelectorAll('img')) {
      const source=['data-src','data-original','data-lazy-src','data-lazy','data-layzr','data-echo'].map(k=>img.getAttribute(k)).find(Boolean);
      if(source)try{const u=new URL(source,base);if(/^https?:$/.test(u.protocol))img.src=u.href;}catch(_){}
      const srcset=img.getAttribute('data-srcset')||img.getAttribute('data-lazy-srcset');if(srcset)img.srcset=srcset;
      img.loading='eager';img.decoding='async';img.classList.remove('lazy','lazyload','lazyloading');img.classList.add('lazyloaded');
      img.style.setProperty('opacity','1');img.style.setProperty('visibility','visible');
      for(const k of ['data-src','data-original','data-lazy-src','data-lazy','data-layzr','data-echo'])img.removeAttribute(k);
    }
    for(const el of root.querySelectorAll('source[data-srcset]'))el.srcset=el.getAttribute('data-srcset');
    return root;
  }
  const log=[];
  function status(state,detail={}) {
    document.documentElement.setAttribute(ATTR,state);
    if(list)list.setAttribute('data-generic-fashion-autopager',state==='waiting-controls'?'end':state);
    log.push({time:Date.now(),state,...detail});if(log.length>40)log.shift();
    window.__genericCityhillAutoPagerDiagnostics={version:'6.42.0',state,events:log.slice()};
  }
  let list=null,base=location.href,entry=keyURL(location.href),next=null,busy=false,blocked=false,pageCount=1;
  let seen=new Set(),seenURLs=new Set(),lastSignature='',timer=0,retryAt=0,failures=0,controller=null,frame=null,frameBase=null;
  let lastScan=0,sourceDoc=document,observer=null,paused=false;
  const signature=(l,b)=>cards(l,b).map(e=>itemKey(e,b)).filter(Boolean).join('|');
  function disposeFrame(){if(frame)frame.remove();frame=null;frameBase=null;}
  function reset(newList) {
    controller?.abort();disposeFrame();list=newList;base=location.href;entry=keyURL(base);next=null;busy=false;blocked=false;
    pageCount=1;failures=0;retryAt=0;seenURLs=new Set([keyURL(base)]);seen=new Set(cards(list,base).map(e=>itemKey(e,base)).filter(Boolean));
    lastSignature=signature(list,base);sourceDoc=document;status('waiting-controls',{items:seen.size});
  }
  function frameRead() {
    try {
      const doc=frame?.contentDocument;if(!doc||doc.readyState==='loading'||!doc.location||doc.location.origin!==location.origin||!listPath(doc.location.pathname))return null;
      const l=listing(doc,doc.location.href);return l?{doc,list:l,url:doc.location.href}:null;
    }catch(_){return null;}
  }
  function waitFrame(signal,predicate) {
    return new Promise((resolve,reject)=>{
      let mark='',since=0,poll=0;
      const finish=(err,value)=>{clearInterval(poll);signal.removeEventListener('abort',abort);err?reject(err):resolve(value);};
      const abort=()=>finish(new Error('Cancelled'));
      if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});
      poll=setInterval(()=>{
        const r=frameRead();if(!r||!predicate(r)){mark='';return;}
        const s=signature(r.list,r.url)+'#'+text(nextControl(r.doc,r.url)?.node);
        if(s!==mark){mark=s;since=Date.now();return;}
        if(Date.now()-since>=500)finish(null,r);
      },120);
    });
  }
  async function rendered(control,signal) {
    const target=control.kind==='url'?control.url:base;
    if(control.kind==='url'||!frame||frameBase!==base) {
      disposeFrame();frame=document.createElement('iframe');frame.id='generic-cityhill-render';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
      frame.setAttribute('sandbox','allow-same-origin allow-scripts allow-forms');
      frame.style.cssText=`position:fixed;left:-20000px;top:0;width:${Math.max(320,innerWidth)}px;height:1000px;opacity:0;pointer-events:none;border:0;`;
      frame.src=target;document.body.appendChild(frame);frameBase=base;
      await waitFrame(signal,r=>route(new URL(r.url).pathname)===route(new URL(target).pathname));
    }
    if(control.kind==='native') {
      const before=frameRead();if(!before)throw new Error('Frame not ready');
      const mark=signature(before.list,before.url),c=nextControl(before.doc,before.url);
      if(!c)throw new Error('Native next control not ready');
      if(c.kind==='url')frame.src=c.url;
      else {
        const el=c.node;if(el.tagName==='A')el.setAttribute('target','_self');
        el.click();
      }
      await waitFrame(signal,r=>signature(r.list,r.url)!==mark);
    }
    const live=await waitFrame(signal,()=>true);
    frameBase=live.url;
    // Retain native DOM references only inside the private frame; imported markup is sanitized.
    return live;
  }
  async function readPage(control,signal) {
    if(control.kind==='native')return rendered(control,signal);
    try {
      const r=await fetch(control.url,{credentials:'same-origin',signal,headers:{Accept:'text/html,application/xhtml+xml'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      if(r.url&&keyURL(r.url)!==keyURL(control.url))throw new Error('Unexpected redirect');
      const type=r.headers.get('content-type')||'';if(type&&!/html/i.test(type))throw new Error('Non-HTML response');
      const doc=new DOMParser().parseFromString(await r.text(),'text/html'),l=listing(doc,control.url);
      if(l&&cards(l,control.url).some(el=>!seen.has(itemKey(el,control.url))))return {doc,list:l,url:control.url};
      throw new Error('Unrendered or repeated listing');
    }catch(e){if(signal.aborted)throw e;return rendered(control,signal);}
  }
  async function load(control) {
    if(busy||blocked||pageCount>=MAX_PAGES)return;
    if(control.kind==='url'&&seenURLs.has(keyURL(control.url))){blocked=true;status('duplicate');return;}
    busy=true;status('loading',{page:pageCount+1,mode:control.kind});controller=new AbortController();
    const own=controller,oldList=list,oldEntry=entry,timeout=setTimeout(()=>own.abort(),28000);
    try {
      const r=await readPage(control,own.signal);
      if(own.signal.aborted||list!==oldList||keyURL(location.href)!==oldEntry||!oldList.isConnected)return;
      const fresh=[],keys=new Set();
      for(const el of cards(r.list,r.url)){const k=itemKey(el,r.url);if(k&&!seen.has(k)&&!keys.has(k)){keys.add(k);fresh.push(el);}}
      if(!fresh.length){blocked=true;status('duplicate');return;}
      const following=nextControl(r.doc,r.url),fragment=document.createDocumentFragment();
      for(const el of fresh){const clone=prepare(document.importNode(el,true),r.url);clone.setAttribute('data-generic-fashion-page',String(pageCount+1));fragment.appendChild(clone);}
      list.appendChild(fragment);for(const k of keys)seen.add(k);
      if(control.url)seenURLs.add(keyURL(control.url));base=r.url;next=following;pageCount++;failures=0;retryAt=0;
      lastSignature=signature(list,location.href);sourceDoc=r.doc;
      status(next?'ready':'waiting-controls',{page:pageCount,added:fresh.length,total:seen.size});
      document.dispatchEvent(new CustomEvent('GenericAutoPagerLoaded',{detail:{site:'city',url:base,page:pageCount,added:fresh.length}}));
      if(pageCount>=MAX_PAGES){blocked=true;disposeFrame();status('limit');}
    }catch(e){
      if(list!==oldList||entry!==oldEntry)return;
      failures++;retryAt=Date.now()+Math.min(60000,1500*Math.pow(2,Math.min(failures-1,5)));
      disposeFrame();status('retry',{attempt:failures,error:String(e.message).slice(0,140)});
    }finally{clearTimeout(timeout);if(controller===own){controller=null;busy=false;}schedule();}
  }
  function check() {
    timer=0;if(paused||document.hidden||!document.body)return;
    if(!list||!list.isConnected||entry!==keyURL(location.href)) {
      const found=listing(document,location.href);if(!found){status('waiting-list');return;}reset(found);
    }
    // Replaced grids are common after sorting/filtering; also detect in-place child replacement.
    if(Date.now()-lastScan>1200&&!busy) {
      lastScan=Date.now();const sig=signature(list,location.href);
      if(sig!==lastSignature) {
        const actual=cards(list,location.href).map(el=>itemKey(el,location.href)).filter(Boolean);
        if(actual.some(k=>!seen.has(k))||actual.length<seen.size)reset(list);
        else lastSignature=sig;
      }
    }
    if(blocked||busy||Date.now()<retryAt)return;
    if(!next)next=nextControl(sourceDoc,base);
    // Absence of controls is not permanently cached: late/AJAX pagination can still appear.
    if(!next){if(document.documentElement.getAttribute(ATTR)!=='waiting-controls')status('waiting-controls');return;}
    const bottom=list.getBoundingClientRect().bottom;
    if(visible(list)&&bottom<=innerHeight+PRELOAD)void load(next);
  }
  function schedule(){if(!paused&&!timer)timer=setTimeout(check,150);}
  function begin(){
    observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
    for(const e of ['scroll','resize','pageshow','popstate','online'])window.addEventListener(e,schedule,{passive:true});
    document.addEventListener('visibilitychange',schedule);setInterval(schedule,1800);schedule();
  }
  window.addEventListener('pagehide',()=>{paused=true;controller?.abort();disposeFrame();clearTimeout(timer);timer=0;});
  window.addEventListener('pageshow',()=>{paused=false;schedule();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else if(document.body)begin();
})();
