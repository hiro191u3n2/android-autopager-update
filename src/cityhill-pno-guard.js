/* generic-cityhill-pno-guard-v644 */
(() => {
  'use strict';
  if (!/^store\.cityhill\.co\.jp$/i.test(location.hostname) ||
      !/^\/(?:sp\/)?(?:majesticlegon\/)?item\/(?:preorder|search)\.html$/i.test(location.pathname) ||
      window.top !== window.self || window.__genericCityhillPnoGuard) return;
  window.__genericCityhillPnoGuard = true;
  const EXCLUDE = 'header,footer,aside,[hidden],[aria-hidden="true"],[class*="recommend" i],[id*="recommend" i],[class*="recent" i],[class*="carousel" i],#generic-cityhill-render';
  const canonical = p => p.replace(/^\/sp\//, '/').replace(/preorder\.html$/i, 'search.html');
  const values = (q, k) => JSON.stringify(q.getAll(k).sort());
  const number = v => /^[1-9]\d*$/.test(v || '') && Number.isSafeInteger(+v) ? +v : null;
  // Only follow an existing next-page URL. Never synthesize a missing page or change filters.
  function target(raw, base = location.href) {
    try {
      const from = new URL(base), to = new URL(raw, base);
      if (to.origin !== from.origin || !/^https?:$/.test(to.protocol) ||
          canonical(to.pathname) !== canonical(from.pathname) ||
          to.searchParams.getAll('pno').length !== 1 || from.searchParams.getAll('pno').length > 1) return null;
      const current = from.searchParams.has('pno') ? number(from.searchParams.get('pno')) : 1;
      if (current === null || number(to.searchParams.get('pno')) !== current + 1) return null;
      if (/preorder\.html$/i.test(from.pathname)) from.searchParams.set('rsv', '1');
      if (/preorder\.html$/i.test(to.pathname)) to.searchParams.set('rsv', '1');
      for (const k of new Set([...from.searchParams.keys(), ...to.searchParams.keys()])) {
        if (k === 'pno') continue;
        if (!to.searchParams.has(k)) for (const v of from.searchParams.getAll(k)) to.searchParams.append(k, v);
        if (values(from.searchParams, k) !== values(to.searchParams, k)) return null;
      }
      to.hash = '';
      return to.href;
    } catch (_) { return null; }
  }
  function bounds(el) {
    if (!el || el.closest(EXCLUDE)) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null;
    let r = el.getBoundingClientRect();
    if (!r.width && !r.height) {
      const range = document.createRange(); range.selectNodeContents(el); r = range.getBoundingClientRect();
    }
    return r.width || r.height ? r : null;
  }
  function candidate() {
    let found = null;
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.closest('[disabled],[aria-disabled="true"],.disabled,.is-disabled') || a.querySelector('img,picture')) continue;
      const url = target(a.getAttribute('href')), r = url && bounds(a);
      if (!r) continue;
      // The lower copy wins on templates with both top and bottom pagination.
      found = {node:a, url, rect:r};
    }
    return found;
  }
  let scrolled = false, innerScroll = 0, armedURL = '', armedAt = 0, stopped = false, timer = 0;
  let lastY = 0, hold = 0, held = false, pointerX = 0, pointerY = 0;
  let gestureNeeded = performance.getEntriesByType('navigation').some(e => e.type === 'back_forward');
  const snapshot = (state, extra = {}) => {
    window.__genericCityhillPnoGuardDiagnostics = {version:'6.44.0', state, ...extra};
  };
  function inspect() {
    if (stopped || gestureNeeded || document.hidden || !document.body) return;
    const core = window.__genericCityhillAutoPagerDiagnostics;
    // Once appending succeeds, never jump back to the original page-2 link.
    if (!scrolled || (core && core.page > 1) || document.querySelector('[data-generic-fashion-page]')) {
      armedURL = ''; armedAt = 0; return;
    }
    const c = candidate();
    const lowerPager = c && c.rect.top + Math.max(window.scrollY, innerScroll) > innerHeight;
    const onScreen = c && c.rect.bottom > 0 && c.rect.top < innerHeight;
    if (!c || !lowerPager || !onScreen || document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) {
      armedURL = ''; armedAt = 0; return;
    }
    if (armedURL !== c.url) { armedURL = c.url; armedAt = Date.now(); snapshot('watching', {nextURL:c.url}); return; }
    // Give normal insertion time to finish. Its network timeout is 28 seconds.
    const wait = core?.state === 'loading' ? 32000 : 6500;
    if (Date.now() - armedAt < wait) return;
    // Recheck all guards immediately before navigation; no retries and no loop across page loads.
    const latest = window.__genericCityhillAutoPagerDiagnostics;
    if ((latest && latest.page > 1) || document.querySelector('[data-generic-fashion-page]') || target(c.node.getAttribute('href')) !== c.url) return;
    stopped = true; clearInterval(timer);
    snapshot('native-navigation', {nextURL:c.url, reason:latest?.state || 'adapter-not-started'});
    location.assign(c.url);
  }
  function diagnostics() {
    const c = candidate();
    return JSON.stringify({version:'6.44.0', url:location.href,
      viewport:[innerWidth,innerHeight], readyState:document.readyState,
      core:window.__genericCityhillAutoPagerDiagnostics || null,
      guard:window.__genericCityhillPnoGuardDiagnostics || null,
      nextURL:c?.url || null,
      pageLinks:[...document.querySelectorAll('a[href]')].filter(a => /(?:\?|&)pno=/.test(a.getAttribute('href'))).slice(0,12).map(a=>({href:a.getAttribute('href'),visible:!!bounds(a)}))
    }, null, 2);
  }
  function currentPageTarget(el) {
    const n = String(number(new URL(location.href).searchParams.get('pno')) || 1);
    const e = el?.closest('span,strong,em,b,li,a');
    if (!e || (e.textContent || '').trim() !== n || e.closest(EXCLUDE)) return false;
    let p = e.parentElement;
    for (let i=0; p && i<3; i++,p=p.parentElement) {
      if (p === document.body || p.matches('main') || p.querySelector('img,picture')) break;
      if ([...p.querySelectorAll('a[href]')].some(a => /(?:\?|&)pno=/.test(a.getAttribute('href')))) return true;
    }
    return false;
  }
  function begin() {
    snapshot('ready');
    window.addEventListener('wheel', e => { if (e.deltaY > 0) gestureNeeded = false; }, {passive:true});
    window.addEventListener('touchmove', () => { gestureNeeded = false; }, {passive:true});
    window.addEventListener('keydown', e => { if (['ArrowDown','PageDown',' '].includes(e.key)) gestureNeeded = false; });
    document.addEventListener('scroll', e => {
      const y = e.target === document ? window.scrollY : (e.target.scrollTop || 0);
      if (y > 32 && y >= lastY) scrolled = true;
      if (y < lastY - 16) { armedURL = ''; armedAt = 0; }
      lastY = y; if (e.target !== document) innerScroll = y;
    }, {passive:true,capture:true});
    // An explicit long press on the current page number opens a local, copyable diagnostic.
    // No telemetry, cookies, product data, background uploads, or persistent storage.
    document.addEventListener('pointerdown', e => {
      clearTimeout(hold); held = false; pointerX = e.clientX; pointerY = e.clientY;
      if (!currentPageTarget(e.target)) return;
      hold = setTimeout(() => { held = true; window.prompt('CITYHILL オートページャー診断（コピーして送ってください）', diagnostics()); }, 900);
    }, {passive:true});
    for (const type of ['pointerup','pointercancel']) document.addEventListener(type, () => clearTimeout(hold), {passive:true});
    document.addEventListener('pointermove', e => { if (Math.hypot(e.clientX-pointerX,e.clientY-pointerY)>12) clearTimeout(hold); }, {passive:true});
    document.addEventListener('contextmenu', e => {
      if (!currentPageTarget(e.target)) return;
      e.preventDefault(); clearTimeout(hold);
      if (!held) { held = true; window.prompt('CITYHILL オートページャー診断（コピーして送ってください）', diagnostics()); }
    });
    timer = setInterval(() => { try { inspect(); } catch (e) { snapshot('guard-error', {error:String(e.message).slice(0,160)}); } }, 500);
  }
  window.addEventListener('pagehide', () => { stopped = true; clearInterval(timer); clearTimeout(hold); });
  window.addEventListener('pageshow', e => { if (e.persisted) { stopped = false; gestureNeeded = true; scrolled = false; lastY = window.scrollY; innerScroll = 0; armedURL = ''; armedAt = 0; timer = setInterval(inspect, 500); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, {once:true}); else begin();
})();
