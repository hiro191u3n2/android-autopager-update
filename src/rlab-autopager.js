/* generic-rlab-product-autopager-v640 */
(() => {
  'use strict';
  if (window.top !== window.self || !/^(?:www\.)?rlab-store\.jp$/i.test(location.hostname)) return;
  if (!/^\/(?:c\/|p\/search(?:\/|$))/.test(location.pathname)) return;
  const KEY = '__genericRlabAutoPagerV640';
  if (window[KEY]) return;
  window[KEY] = true;
  const ITEM = '.fs-c-productList__list__item';
  const PRELOAD = 1400;
  const MAX_PAGES = 30;
  const text = node => (node?.textContent || '').replace(/[\s,\u3000]+/g, '');
  const pageNumber = value => {
    const raw = new URL(value, location.href).searchParams.get('page') || '1';
    return /^\d+$/.test(raw) && Number.isSafeInteger(+raw) && +raw > 0 ? +raw : null;
  };
  const keyURL = value => {
    const url = new URL(value, location.href);
    url.hash = '';
    url.searchParams.sort();
    return url.href;
  };
  const listing = doc => {
    const roots = Array.from(doc.querySelectorAll('.fs-c-productList'));
    const candidates = roots.map(root => ({root, list: Array.from(root.children).find(el => el.matches('.fs-c-productList__list'))}))
      .filter(x => x.list && !x.root.closest('aside, [hidden], .fs-c-productImageModal'));
    return candidates.find(x => x.root.closest('.fs-l-pageMain, main')) || candidates[0] || null;
  };
  const items = list => Array.from(list.children).filter(el => el.matches(ITEM));
  const itemKey = (item, base) => {
    const id = item.getAttribute('data-product-id');
    if (id) return 'id:' + id;
    const link = item.querySelector('.fs-c-productListItem__productName a[href], .fs-c-productListItem__image a[href]');
    return link ? 'url:' + keyURL(new URL(link.getAttribute('href'), base)) : null;
  };
  const validNext = (href, base) => {
    try {
      const current = new URL(base), next = new URL(href, base);
      if (!/^https?:$/.test(next.protocol) || next.origin !== current.origin || next.pathname !== current.pathname) return null;
      const currentPage = pageNumber(current.href);
      if (!currentPage || pageNumber(next.href) !== currentPage + 1) return null;
      for (const name of new Set(current.searchParams.keys())) {
        if (name === 'page') continue;
        const values = current.searchParams.getAll(name);
        if (next.searchParams.has(name)) {
          if (JSON.stringify(values) !== JSON.stringify(next.searchParams.getAll(name))) return null;
        } else values.forEach(value => next.searchParams.append(name, value));
      }
      if (!current.searchParams.has('sort') && next.searchParams.has('sort') && next.searchParams.get('sort') !== 'latest') return null;
      next.hash = '';
      return next.href;
    } catch (_) { return null; }
  };
  const statusRange = root => {
    const total = text(root.querySelector('.fs-c-listControl__status__total')).match(/^(\d+)/);
    const range = text(root.querySelector('.fs-c-listControl__status__indication')).match(/^(\d+)[-–－](\d+)/);
    return total && range ? {total: +total[1], start: +range[1], end: +range[2]} : null;
  };
  const findNext = (root, base) => {
    const range = statusRange(root);
    if (range && range.end >= range.total) return null;
    const links = Array.from(root.querySelectorAll('.fs-c-pagination a[href]'));
    const preferred = links.filter(a => a.matches('.fs-c-pagination__item--next, [rel~="next"]') || /次のページ|次へ|next/i.test(a.getAttribute('aria-label') || ''));
    for (const a of [...preferred, ...links]) {
      if (a.closest('[aria-disabled="true"], .is-disabled, .disabled')) continue;
      const url = validNext(a.getAttribute('href'), base);
      if (url) return url;
    }
    return null; // Do not invent page=2: out-of-range Rlab URLs repeat page 1.
  };
  const prepare = (root, base) => {
    root.querySelectorAll('script, iframe, object, embed, base, link[rel="canonical"]').forEach(el => el.remove());
    for (const el of [root, ...root.querySelectorAll('*')]) {
      for (const attr of Array.from(el.attributes || [])) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      }
      for (const name of ['href', 'src', 'action', 'poster']) {
        const value = el.getAttribute(name);
        if (!value || value.startsWith('#')) continue;
        if (/^\s*javascript:/i.test(value)) { el.removeAttribute(name); continue; }
        try { el.setAttribute(name, new URL(value, base).href); } catch (_) {}
      }
    }
    // Only hydrate visible-list images; do not eagerly download entire modal galleries.
    for (const img of root.querySelectorAll('img')) {
      if (img.closest('.fs-c-productImageModal, .fs-c-variationAndActions, [hidden]')) continue;
      const source = img.getAttribute('data-layzr') || img.getAttribute('data-src') || img.getAttribute('data-original');
      if (source) {
        try { img.src = new URL(source, base).href; } catch (_) {}
        img.removeAttribute('data-layzr');
      }
      const srcset = img.getAttribute('data-layzr-srcset') || img.getAttribute('data-srcset');
      if (srcset) img.setAttribute('srcset', srcset);
      img.loading = 'eager';
      img.decoding = 'async';
    }
    return root;
  };
  function start() {
    const found = listing(document);
    if (!found || found.root.hasAttribute('data-generic-rlab-autopager')) return !!found;
    const {root, list} = found;
    const startRange = statusRange(root);
    let source = location.href, next = findNext(root, source), busy = false, pages = 1;
    let stopped = false, timer = 0, retryTimer = 0, failures = 0;
    const seenURLs = new Set([keyURL(source)]);
    const seenItems = new Set(items(list).map(item => itemKey(item, source)).filter(Boolean));
    const initialCount = items(list).length;
    let addedCount = 0;
    root.setAttribute('data-generic-rlab-autopager', next ? 'ready' : 'end');
    if (!next) return true;
    const sentinel = document.createElement('div');
    sentinel.id = 'generic-rlab-autopager-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'display:block;height:1px;width:100%;clear:both;pointer-events:none;';
    list.after(sentinel);
    let intersection = null, resize = null, interval = 0;
    function stop(reason) {
      stopped = true;
      root.setAttribute('data-generic-rlab-autopager', reason);
      clearTimeout(timer); clearTimeout(retryTimer); clearInterval(interval);
      intersection?.disconnect(); resize?.disconnect(); sentinel.remove();
      for (const event of ['scroll', 'resize', 'pageshow', 'online']) window.removeEventListener(event, schedule);
      document.removeEventListener('visibilitychange', schedule);
      // Keep native pagination available, especially after network errors or the page cap.
    }
    function updateControls(fetchedRoot, base) {
      for (const selector of ['.fs-c-pagination', '.fs-c-listControl__status']) {
        const replacement = fetchedRoot.querySelector(selector);
        for (const old of root.querySelectorAll(selector)) {
          if (!replacement) { if (selector === '.fs-c-pagination') old.remove(); continue; }
          const copy = prepare(document.importNode(replacement, true), base);
          if (selector === '.fs-c-listControl__status') {
            const indication = copy.querySelector('.fs-c-listControl__status__indication');
            if (indication) {
              const first = startRange?.start || 1;
              indication.textContent = `${first}-${first + initialCount + addedCount - 1}件表示`;
            }
          }
          old.replaceWith(copy);
        }
      }
    }
    async function load() {
      if (busy || stopped || !next || document.hidden || retryTimer) return;
      if (pages >= MAX_PAGES) return stop('limit');
      if (!root.isConnected || !list.isConnected) return stop('detached');
      const requested = next, normalized = keyURL(requested);
      if (seenURLs.has(normalized)) return stop('duplicate');
      busy = true;
      root.setAttribute('data-generic-rlab-autopager', 'loading');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(requested, {method: 'GET', credentials: 'same-origin', redirect: 'follow', signal: controller.signal, headers: {Accept: 'text/html,application/xhtml+xml'}});
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const type = response.headers.get('content-type') || '';
        if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error('Non-HTML response');
        const finalURL = response.url || requested;
        if (!validNext(finalURL, source)) throw new Error('Unexpected pagination redirect');
        const expected = new URL(requested), actual = new URL(finalURL);
        for (const name of new Set([...expected.searchParams.keys(), ...actual.searchParams.keys()])) {
          if (name === 'page') continue;
          const want = expected.searchParams.getAll(name), got = actual.searchParams.getAll(name);
          if (name === 'sort' && (!want.length || want.join() === 'latest') && (!got.length || got.join() === 'latest')) continue;
          if (JSON.stringify(want) !== JSON.stringify(got)) throw new Error('Pagination redirect changed filters');
        }
        const html = await response.text();
        const fetched = listing(new DOMParser().parseFromString(html, 'text/html'));
        if (!fetched) throw new Error('Product list is missing');
        const incoming = items(fetched.list);
        if (!incoming.length) throw new Error('Product list is empty');
        const pageKeys = new Set();
        const fresh = incoming.filter(item => {
          const key = itemKey(item, finalURL);
          if (!key || seenItems.has(key) || pageKeys.has(key)) return false;
          pageKeys.add(key); return true;
        });
        if (!fresh.length) return stop('duplicate');
        if (!root.isConnected || !list.isConnected) return stop('detached');
        const following = findNext(fetched.root, finalURL);
        const fragment = document.createDocumentFragment();
        for (const item of fresh) {
          const clone = prepare(document.importNode(item, true), finalURL);
          clone.setAttribute('data-generic-rlab-page', String(pageNumber(finalURL)));
          fragment.appendChild(clone);
        }
        list.appendChild(fragment); // Keep the site's direct-child grid structure intact.
        pageKeys.forEach(key => seenItems.add(key));
        seenURLs.add(normalized); seenURLs.add(keyURL(finalURL));
        addedCount += fresh.length; pages += 1; failures = 0;
        source = finalURL; next = following;
        updateControls(fetched.root, finalURL);
        root.setAttribute('data-generic-rlab-autopager', next ? 'ready' : 'end');
        document.dispatchEvent(new CustomEvent('GenericAutoPagerLoaded', {detail: {url: finalURL, page: pageNumber(finalURL), added: fresh.length}}));
        if (!next) stop('end');
      } catch (error) {
        failures += 1;
        root.setAttribute('data-generic-rlab-autopager', 'retry');
        if (failures <= 2) {
          retryTimer = setTimeout(() => { retryTimer = 0; schedule(); }, 900 * failures);
        } else {
          console.warn('[Android AutoPager/Rlab]', error);
          stop('error');
        }
      } finally {
        clearTimeout(timeout);
        busy = false;
        if (!stopped && !retryTimer) schedule();
      }
    }
    function check() {
      timer = 0;
      if (!stopped && !busy && !retryTimer && !document.hidden && sentinel.isConnected && sentinel.getBoundingClientRect().top <= (window.innerHeight || 800) + PRELOAD) void load();
    }
    function schedule() { if (!stopped && !timer) timer = setTimeout(check, 120); }
    if ('IntersectionObserver' in window) {
      intersection = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) schedule(); }, {rootMargin: `${PRELOAD}px 0px`});
      intersection.observe(sentinel);
    }
    if ('ResizeObserver' in window) { resize = new ResizeObserver(schedule); resize.observe(list); }
    for (const event of ['scroll', 'resize', 'pageshow', 'online']) window.addEventListener(event, schedule, {passive: true});
    document.addEventListener('visibilitychange', schedule);
    interval = setInterval(schedule, 1500);
    schedule();
    return true;
  }
  function boot() {
    if (start()) return;
    if (document.body?.id !== 'fs_ProductCategory' && !document.body?.classList.contains('fs-body-search')) return;
    const observer = new MutationObserver(() => { if (start()) { observer.disconnect(); clearTimeout(timeout); } });
    const timeout = setTimeout(() => observer.disconnect(), 10000);
    observer.observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
