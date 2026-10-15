/* generic-fashion-product-autopager-v641 */
(() => {
  'use strict';
  if (window.top !== window.self) return;
  const host = location.hostname, path = location.pathname;
  const site = /^(?:www\.)?palcloset\.jp$/i.test(host) && /^\/display\/display\/?$/.test(path) ? 'pal'
    : /^(?:www\.)?atomicboxx\.com$/i.test(host) && /^\/ap\/s\/s\/?$/.test(path) ? 'atomic'
    : /^store\.cityhill\.co\.jp$/i.test(host) && /^\/(?:majesticlegon\/)?item\/(?!\d+\.html)[^/]*(?:\.html|\/)?$/.test(path) ? 'city' : null;
  if (!site || window.__genericFashionAutoPagerV641) return;
  window.__genericFashionAutoPagerV641 = true;
  const ATTR = 'data-generic-fashion-autopager';
  const PRELOAD = 1400, MAX_PAGES = 30;
  const PAGE_KEYS = ['page', 'p', 'page_no', 'pageNo', 'pageno', 'pg', 'start', 'offset'];
  const PAGER = site === 'pal' ? '.pager_wrap' : site === 'atomic' ? '.pager' :
    '[class*="pagination" i],[class*="pagenation" i],[class*="paging" i],[class*="pager" i],[id*="pagination" i],[id*="pager" i]';
  const LINK = site === 'pal' ? 'a[href*="/display/item/"]' : site === 'atomic' ? 'a[href*="/ap/item/i/"]' : 'a[href*="/item/"]';
  const EXCLUDE = 'header,footer,nav,aside,[hidden],[aria-hidden="true"],[class*="recommend" i],[id*="recommend" i],[class*="ranking" i],[class*="recent" i],[class*="carousel" i],[class*="slick" i]';
  const number = (v, fallback = null) => /^\d+$/.test(String(v ?? '')) && Number.isSafeInteger(+v) ? +v : fallback;
  const urlKey = value => { const u = new URL(value, location.href); u.hash = ''; u.searchParams.sort(); return u.href; };
  const sameValues = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const pageIndex = value => {
    const u = new URL(value, location.href);
    if (site === 'pal') return number(u.searchParams.get('p'), 1);
    if (site === 'atomic') return Math.floor(number(u.searchParams.get('start'), 0) / (number(u.searchParams.get('rows'), 30) || 30)) + 1;
    for (const k of PAGE_KEYS) if (u.searchParams.has(k)) return number(u.searchParams.get(k), 1);
    return 1;
  };
  const productLink = item => {
    const links = [...(item.matches?.(LINK) ? [item] : []), ...item.querySelectorAll(LINK)];
    return links.find(a => {
      try {
        const u = new URL(a.getAttribute('href'), location.href);
        return u.origin === location.origin && (site !== 'city' || /\/item\/(?:\d+\.html|detail\/[^/]+)/.test(u.pathname));
      } catch (_) { return false; }
    }) || null;
  };
  const itemKey = (item, base) => {
    if (site === 'atomic' && item.getAttribute('data-cd')) return 'cd:' + item.getAttribute('data-cd');
    const link = productLink(item);
    if (!link) return null;
    const u = new URL(link.getAttribute('href'), base);
    // PAL lists colors as separate cards; never collapse color variants by product ID alone.
    const variants = new URLSearchParams();
    for (const key of ['cl', 'colvar', 'color', 'color_id', 'color_cd', 'clr', 'sku', 'variation']) {
      for (const value of u.searchParams.getAll(key)) variants.append(key, value);
    }
    variants.sort();
    return u.pathname + '?' + variants.toString();
  };
  const cards = list => [...list.children].filter(el => productLink(el));
  function listing(doc) {
    if (site !== 'city') {
      const list = site === 'pal' ? (doc.querySelector('#item_pic_block .ix-content-list-grid') || doc.querySelector('#item_list')) : doc.querySelector('#item_container');
      return list && cards(list).length ? list : null;
    }
    const candidates = new Set();
    for (const a of doc.querySelectorAll(LINK)) {
      if (!productLink(a) || a.closest(EXCLUDE)) continue;
      let el = a.parentElement;
      for (let depth = 0; el && depth < 5; depth++, el = el.parentElement) {
        if (el === doc.body || el.matches('main') || el.closest(EXCLUDE)) break;
        candidates.add(el);
      }
    }
    let best = null, bestScore = -1;
    for (const list of candidates) {
      const children = cards(list);
      if (!children.length) continue;
      // A true grid's direct children each describe one product, not a nested whole list.
      if (children.some(child => new Set([...child.querySelectorAll(LINK)].filter(a => productLink(a)).map(a => itemKey(a, location.href))).size > 1)) continue;
      const hint = String(list.id) + ' ' + String(list.className);
      const score = Math.min(children.length, 120) * 10 + (/item|product|goods/i.test(hint) ? 25 : 0) + (/list|grid/i.test(hint) ? 35 : 0);
      if (score > bestScore) { best = list; bestScore = score; }
    }
    return best;
  }
  function validNext(href, base) {
    try {
      const from = new URL(base), to = new URL(href, base);
      if (!/^https?:$/.test(to.protocol) || to.origin !== from.origin || to.pathname !== from.pathname) return null;
      let changing = null;
      if (site === 'pal') {
        if (number(to.searchParams.get('p')) !== number(from.searchParams.get('p'), 1) + 1) return null;
        changing = 'p';
      } else if (site === 'atomic') {
        const rows = number(from.searchParams.get('rows'), 30);
        if (!rows || number(to.searchParams.get('start')) !== number(from.searchParams.get('start'), 0) + rows) return null;
        changing = 'start';
      } else {
        for (const key of PAGE_KEYS) {
          if (!to.searchParams.has(key)) continue;
          const old = number(from.searchParams.get(key), /start|offset/.test(key) ? 0 : 1);
          const next = number(to.searchParams.get(key));
          const step = /start|offset/.test(key) ? number(from.searchParams.get('rows') || from.searchParams.get('limit'), null) : 1;
          if (step && next === old + step) { changing = key; break; }
        }
        if (!changing) return null;
      }
      for (const key of new Set(from.searchParams.keys())) {
        if (key === changing) continue;
        const values = from.searchParams.getAll(key);
        if (to.searchParams.has(key)) {
          if (!sameValues(values, to.searchParams.getAll(key))) return null;
        } else for (const value of values) to.searchParams.append(key, value);
      }
      to.hash = '';
      return to.href;
    } catch (_) { return null; }
  }
  function nextURL(doc, base) {
    if (site === 'pal') {
      const expected = pageIndex(base) + 1;
      const control = [...doc.querySelectorAll('.pager_wrap .arrow_r, .pager_wrap .pager_number a, .pager_wrap p a')]
        .find(a => number(a.getAttribute('id') || a.getAttribute('data-page') || a.textContent.trim()) === expected && !a.closest('.disabled,[aria-disabled="true"]'));
      if (!control) return null;
      const u = new URL(base); u.searchParams.set('p', String(expected)); return validNext(u.href, base);
    }
    const controls = [...doc.querySelectorAll(PAGER)].flatMap(el => [...el.querySelectorAll('a[href]')]);
    controls.unshift(...doc.querySelectorAll('link[rel~="next"][href],a[rel~="next"][href]'));
    const preferred = controls.filter(a => /次|next|[›»＞>→]/i.test((a.textContent || '') + ' ' + a.className + ' ' + a.parentElement?.className + ' ' + a.getAttribute('aria-label')));
    for (const a of [...preferred, ...controls]) {
      if (a.closest('.disabled,.is-disabled,[aria-disabled="true"]')) continue;
      const href = a.getAttribute('href');
      if (!href || /^(?:#|javascript:)/i.test(href.trim())) continue;
      const valid = validNext(href, base);
      if (valid) return valid;
    }
    return null; // Never invent a page when the site's next-page control is absent.
  }
  function prepare(root, base) {
    root.querySelectorAll('script,iframe,object,embed,base,link').forEach(el => el.remove());
    for (const el of [root, ...root.querySelectorAll('*')]) {
      for (const attr of [...el.attributes]) if (/^on/i.test(attr.name) || attr.name === 'srcdoc') el.removeAttribute(attr.name);
      for (const attr of ['href','src','poster','action']) {
        const value = el.getAttribute(attr);
        if (!value || value[0] === '#') continue;
        if (/^\s*(?:javascript|vbscript):/i.test(value)) { el.removeAttribute(attr); continue; }
        try { el.setAttribute(attr, new URL(value, base).href); } catch (_) {}
      }
    }
    for (const img of root.querySelectorAll('img')) {
      const source = ['data-src','data-original','data-lazy-src','data-layzr','data-echo'].map(k => img.getAttribute(k)).find(Boolean);
      if (source) {
        try { const u = new URL(source, base); if (/^https?:$/.test(u.protocol)) img.src = u.href; } catch (_) {}
      }
      for (const attr of ['data-srcset','data-lazy-srcset']) if (img.getAttribute(attr)) img.setAttribute('srcset', img.getAttribute(attr));
      if (!img.alt && img.getAttribute('data-alt')) img.alt = img.getAttribute('data-alt');
      img.loading = 'lazy'; img.decoding = 'async';
      img.classList.remove('lazy','lazyload','lazyloading'); img.classList.add('lazyloaded');
      img.style.setProperty('opacity', '1'); img.style.setProperty('visibility', 'visible');
      for (const attr of ['data-src','data-original','data-lazy-src','data-layzr','data-echo']) img.removeAttribute(attr);
    }
    for (const s of root.querySelectorAll('source[data-srcset]')) s.srcset = s.getAttribute('data-srcset');
    return root;
  }
  function normalizePager(root, base) {
    if (site === 'pal') for (const a of root.querySelectorAll('a')) {
      const n = number(a.getAttribute('id') || a.getAttribute('data-page') || a.textContent.trim());
      if (n && n > 0) { const u = new URL(base); u.searchParams.set('p', String(n)); a.href = u.href; }
    }
    return prepare(root, base);
  }
  function renderFrame(url, signal, enhanced = false) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden','true'); frame.tabIndex = -1;
      frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${Math.max(320,innerWidth)}px;height:900px;opacity:0;pointer-events:none;border:0;`;
      frame.referrerPolicy = 'same-origin';
      let poll = 0, deadline = 0, settled = false, stable = '', stableAt = 0;
      const finish = (error, result) => {
        if (settled) return; settled = true; clearInterval(poll); clearTimeout(deadline); signal.removeEventListener('abort', abort); frame.remove();
        error ? reject(error) : resolve(result);
      };
      const abort = () => finish(new Error('Cancelled'));
      signal.addEventListener('abort', abort, {once:true});
      if (signal.aborted) return abort();
      const check = () => {
        try {
          const doc = frame.contentDocument;
          if (!doc || doc.readyState === 'loading' || !doc.location || urlKey(doc.location.href) !== urlKey(url)) return;
          const list = listing(doc); if (!list || (enhanced && !list.matches('.ix-content-list-grid'))) return;
          const mark = cards(list).map(el => itemKey(el,url)).join('|');
          if (mark !== stable) { stable = mark; stableAt = Date.now(); return; }
          if (Date.now() - stableAt < 600) return;
          const detached = new DOMParser().parseFromString(doc.documentElement.outerHTML,'text/html');
          finish(null,{doc:detached,list:listing(detached),url});
        } catch (_) { /* A cross-origin redirect must time out without importing content. */ }
      };
      poll = setInterval(check,150); deadline = setTimeout(() => finish(new Error('Rendered listing timeout')),20000);
      frame.src = url; (document.body || document.documentElement).appendChild(frame);
    });
  }
  async function fetchHTML(url, signal) {
    if (site === 'pal' && activeList?.matches('.ix-content-list-grid')) return renderFrame(url, signal, true);
    const r = await fetch(url,{credentials:'same-origin',signal,headers:{Accept:'text/html,application/xhtml+xml'}});
    if (!r.ok) throw new Error('HTTP '+r.status);
    if (r.url && urlKey(r.url) !== urlKey(url)) throw new Error('Unexpected listing redirect');
    const type = r.headers.get('content-type') || '';
    if (type && !/html/i.test(type)) throw new Error('Non-HTML listing');
    const doc = new DOMParser().parseFromString(await r.text(),'text/html');
    const list = listing(doc);
    return list ? {doc,list,url} : renderFrame(url,signal);
  }
  async function fetchAtomic(url, signal) {
    let realm, template;
    try {
      realm = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      const source = document.querySelector('#template')?.textContent;
      if (source && typeof realm._?.template === 'function') template = realm._.template(source);
    } catch (_) { /* A userscript sandbox may not expose the page's renderer. */ }
    if (!template) return renderFrame(url,signal);
    const listingURL = new URL(url), api = new URL('/ise/select',url);
    api.search = listingURL.search; api.searchParams.set('wt','json');
    const rows = number(listingURL.searchParams.get('rows'),30), start = number(listingURL.searchParams.get('start'),0);
    if (!rows || rows > 1000) throw new Error('Invalid page size');
    const r = await fetch(api.href,{credentials:'same-origin',signal,headers:{Accept:'application/json'}});
    if (!r.ok) throw new Error('HTTP '+r.status);
    if (r.url && new URL(r.url).origin !== location.origin) throw new Error('Unexpected API redirect');
    const data = await r.json(), response = data.response;
    if (!response || !Array.isArray(response.docs) || number(response.start ?? data.responseHeader?.params?.start,0) !== start || number(response.numFound) === null) throw new Error('Invalid search response');
    const doc = document.implementation.createHTMLDocument(''), list = doc.createElement('ul');
    list.id = 'item_container'; list.className = 'goods_list item_list'; doc.body.appendChild(list);
    for (const item of response.docs) {
      if (!item.cd || !item.bd) throw new Error('Invalid product');
      // Reuse the site's own renderer so price, sale flags and color chips stay consistent.
      list.insertAdjacentHTML('beforeend',template({doc:item,favorite:false}));
    }
    const pager = doc.createElement('ol'); pager.className = 'pager bottom'; doc.body.appendChild(pager);
    try {
      const source = document.querySelector('#pagingTemplate')?.textContent;
      if (source) pager.innerHTML = realm._.template(source)({numFound:response.numFound,rows,start});
    } catch (_) {}
    if (!pager.children.length && start + response.docs.length < response.numFound && response.docs.length) {
      const next = new URL(url); next.searchParams.set('start',String(start+rows));
      const li = doc.createElement('li'); li.className='pager_next'; const a=doc.createElement('a'); a.href=next.href; a.textContent='次へ';li.appendChild(a);pager.appendChild(li);
    }
    return {doc,list,url,total:response.numFound};
  }
  let stopActive = null, activeList = null, bootObserver = null, bootTimer = 0;
  function start() {
    const list = listing(document);
    if (!list) return false;
    if (list === activeList || list.hasAttribute(ATTR)) return true;
    if (site === 'atomic' && !document.querySelector('.pager_number') && !nextURL(document,location.href)) return false;
    stopActive?.('replaced'); activeList = list;
    let source = location.href, next = nextURL(document,source), pages = 1, busy = false, stopped = false;
    let timer = 0, retry = 0, failures = 0, interval = 0, intersection = null, resize = null, controller = null;
    const entryURL = urlKey(location.href), seenURLs = new Set([urlKey(source)]), seenItems = new Set(cards(list).map(item=>itemKey(item,source)).filter(Boolean));
    list.setAttribute(ATTR,next ? 'ready':'end');
    if (!next) return true;
    const sentinel = document.createElement('div'); sentinel.setAttribute('data-generic-fashion-sentinel',site);sentinel.setAttribute('aria-hidden','true');
    sentinel.style.cssText='display:block;width:100%;height:1px;clear:both;pointer-events:none;overflow-anchor:none;';list.after(sentinel);
    const stop = reason => {
      if (stopped) return;stopped=true;list.setAttribute(ATTR,reason);controller?.abort();clearTimeout(timer);clearTimeout(retry);clearInterval(interval);
      intersection?.disconnect();resize?.disconnect();sentinel.remove();
      for (const event of ['scroll','resize','pageshow','online']) window.removeEventListener(event,schedule);
      document.removeEventListener('visibilitychange',schedule);
    };
    stopActive=stop;
    function controls(doc,base) {
      const replacement=doc.querySelector(PAGER);
      for (const old of document.querySelectorAll(PAGER)) {
        if (old.parentElement?.closest(PAGER) || old.contains(list) || list.contains(old)) continue;
        if (replacement) old.replaceWith(normalizePager(document.importNode(replacement,true),base));
      }
    }
    async function load() {
      if (busy || stopped || !next || document.hidden || retry) return;
      if (!list.isConnected || urlKey(location.href)!==entryURL) return stop('changed');
      if (pages>=MAX_PAGES) return stop('limit');
      const requested=next;
      if (seenURLs.has(urlKey(requested))) return stop('duplicate');
      busy=true;list.setAttribute(ATTR,'loading');controller=new AbortController();
      const timeout=setTimeout(()=>controller?.abort(),25000);
      try {
        const result=await (site==='atomic' ? fetchAtomic(requested,controller.signal) : fetchHTML(requested,controller.signal));
        if (stopped || !list.isConnected || urlKey(location.href)!==entryURL) return stop('changed');
        if (!validNext(result.url,source)) throw new Error('Invalid next page');
        const incoming=cards(result.list), pageKeys=new Set();
        if (!incoming.length) throw new Error('Empty product list');
        const fresh=incoming.filter(item=>{const key=itemKey(item,result.url);if(!key||seenItems.has(key)||pageKeys.has(key))return false;pageKeys.add(key);return true;});
        if (!fresh.length) return stop('duplicate');
        const following=nextURL(result.doc,result.url), fragment=document.createDocumentFragment();
        for (const item of fresh) {const clone=prepare(document.importNode(item,true),result.url);clone.setAttribute('data-generic-fashion-page',String(pageIndex(result.url)));fragment.appendChild(clone);}
        list.appendChild(fragment);
        for (const key of pageKeys) seenItems.add(key);seenURLs.add(urlKey(requested));source=result.url;next=following;pages++;failures=0;
        controls(result.doc,result.url);list.setAttribute(ATTR,next?'ready':'end');
        document.dispatchEvent(new CustomEvent('GenericAutoPagerLoaded',{detail:{site,url:source,page:pageIndex(source),added:fresh.length}}));
        if (!next) stop('end');
      } catch (error) {
        if (stopped) return;
        failures++;list.setAttribute(ATTR,'retry');
        if (failures<=2) retry=setTimeout(()=>{retry=0;schedule();},900*failures);
        else {console.warn('[Android AutoPager/'+site+']',error);stop('error');}
      } finally {clearTimeout(timeout);controller=null;busy=false;if(!stopped&&!retry)schedule();}
    }
    function check() {
      timer=0;
      if (!list.isConnected || urlKey(location.href)!==entryURL) {stop('changed');setTimeout(boot,300);return;}
      if (!stopped&&!busy&&!retry&&!document.hidden&&sentinel.isConnected&&sentinel.getBoundingClientRect().top<=innerHeight+PRELOAD) void load();
    }
    function schedule() {if(!stopped&&!timer)timer=setTimeout(check,120);}
    if ('IntersectionObserver' in window) {intersection=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))schedule();},{rootMargin:PRELOAD+'px 0px'});intersection.observe(sentinel);}
    if ('ResizeObserver' in window) {resize=new ResizeObserver(schedule);resize.observe(list);}
    for (const event of ['scroll','resize','pageshow','online']) window.addEventListener(event,schedule,{passive:true});
    document.addEventListener('visibilitychange',schedule);interval=setInterval(schedule,1500);schedule();return true;
  }
  function boot() {
    if(start()) {bootObserver?.disconnect();bootObserver=null;clearTimeout(bootTimer);return;}
    if(!document.body || bootObserver) return;
    let queued=0;
    bootObserver=new MutationObserver(()=>{if(!queued)queued=setTimeout(()=>{queued=0;if(start()){bootObserver?.disconnect();bootObserver=null;clearTimeout(bootTimer);}},100);});
    bootObserver.observe(document.body,{childList:true,subtree:true});bootTimer=setTimeout(()=>{bootObserver?.disconnect();bootObserver=null;},45000);
  }
  const begin=()=>{if(site==='pal')setTimeout(boot,1200);else boot();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();
