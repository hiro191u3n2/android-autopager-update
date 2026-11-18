// Keep one Google result page ready ahead of the reader. The existing loader
// still owns requests, preparation, duplicate detection and the page limit.
function createGenericGoogleReadAheadV665(state, load) {
  const route = genericGoogleTailRouteV663();
  if (!route || !state?.target?.isConnected) return null;
  let latest = null, frame = 0, generation = 0, disposed = false, suspended = false, composing = false;
  const seenResults = new Map();
  let indexedOriginal = false;
  let lastScrollY = window.scrollY || 0, lastMotionAt = -Infinity;
  const listeners = [];
  const listen = (target, name, handler) => {
    target.addEventListener(name, handler, { passive: true });
    listeners.push([target, name, handler]);
  };
  const cancel = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
  const dispose = () => {
    disposed = true;
    generation++;
    cancel();
    for (const [target, name, handler] of listeners) target.removeEventListener(name, handler);
    listeners.length = 0;
  };
  const valid = ticket => {
    if (disposed) return false;
    if (!state.target.isConnected || genericGoogleTailRouteV663() !== route) {
      dispose();
      return false;
    }
    return !suspended && (ticket === undefined || ticket === generation);
  };
  const editing = () => {
    const active = document.activeElement;
    return composing || !!active?.matches?.('input,textarea,[contenteditable]:not([contenteditable="false"])') || !!active?.isContentEditable;
  };
  const check = () => {
    frame = 0;
    if (!valid() || document.hidden || editing() || state.loading || state.paused || state.stopped || !state.nextUrl) return;
    // The first advance prepares page 2 immediately. Further pages wait until
    // the reader is within one viewport of entering the latest appended page.
    // Keep a direct reference: scrolling never walks accumulated result cards.
    if (latest && (!latest.isConnected || latest.getBoundingClientRect().top > Math.max(1, window.innerHeight) * 2)) return;
    load();
  };
  const schedule = () => {
    if (!frame && valid() && !document.hidden) frame = window.requestAnimationFrame(check);
  };
  const appended = section => {
    if (section?.parentNode === state.target) {
      latest = section;
      const imported = section.querySelector('.generic-autopager-google-source-root');
      if (imported && valid()) {
        if (!indexedOriginal) {
          for (const child of state.target.children) {
            if (!child.matches('.generic-autopager-page,#generic-autopager-sentinel')) {
              indexGenericGoogleResultsV667(child, state.target, seenResults, false);
            }
          }
          indexedOriginal = true;
        }
        indexGenericGoogleResultsV667(imported, state.target, seenResults, true);
      }
    }
    schedule();
  };
  // Optional remote title enrichment must not hold the whole next page when
  // the reader is consuming the remaining content or already at its end.
  const urgent = () => {
    if (!valid() || state.paused || state.stopped || document.hidden) return true;
    const remaining = state.target.getBoundingClientRect().bottom - window.innerHeight;
    return remaining <= 160 || performance.now() - lastMotionAt < 350 && remaining <= window.innerHeight * 2;
  };
  listen(window, 'scroll', () => {
    const y = window.scrollY || 0;
    if (Math.abs(y - lastScrollY) > 1) lastMotionAt = performance.now();
    lastScrollY = y;
    schedule();
  });
  listen(window, 'resize', schedule);
  listen(window, 'popstate', schedule);
  listen(window, 'pagehide', () => { suspended = true; generation++; cancel(); });
  listen(window, 'pageshow', () => { suspended = false; schedule(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) cancel(); else schedule(); });
  listen(document, 'focusout', schedule);
  listen(document, 'compositionstart', () => { composing = true; });
  listen(document, 'compositionend', () => { composing = false; schedule(); });
  schedule();
  return { schedule, appended, valid, urgent, ticket: () => generation, dispose };
}

// Two Google pages can return the very same organic listing. A destination
// alone does not identify it: keep different excerpts, headlines or sitelinks.
// Scan each new section once; read the rendered card only when its key collides.
function indexGenericGoogleResultsV667(scope, target, index, removeCopies) {
  const heading = 'h3,[role="heading"]';
  const rich = 'g-scrolling-carousel,g-inner-card,g-related-question,g-section-with-header,details,nav,aside,video,iframe,table,[role="grid"],[role="tablist"],[role="listbox"],[data-attrid],[data-text-ad],[data-shopping],[itemtype*="Product"]';
  const wrapper = '.MjjYud,.Ww4FFb,.g,[data-snhf],article';
  const clean = value => (value || '').replace(/\s+/g, ' ').trim();
  const visible = node => node.getClientRects().length && (node.checkVisibility
    ? node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    : node.ownerDocument.defaultView.getComputedStyle(node).visibility === 'visible');
  const address = link => {
    try {
      let url = new URL(link.getAttribute('href'), location.href);
      if (url.origin === location.origin && url.pathname === '/url') {
        url = new URL(url.searchParams.get('q') || url.searchParams.get('url'));
      }
      return /^https?:$/.test(url.protocol) && !/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) ? url.href : '';
    } catch (_) { return ''; }
  };
  const removals = [];
  for (const title of scope.querySelectorAll(heading)) {
    const link = title.closest('a[href]') || title.querySelector('a[href]');
    if (!link || title.closest(rich + ',[hidden],[inert],[aria-hidden="true"]')) continue;
    const url = address(link), label = clean(title.textContent);
    if (!url || !label) continue;
    let card = title.closest(wrapper);
    if (!card || !scope.contains(card) || card.matches('.generic-autopager-google-source-root') ||
        card.querySelectorAll(heading).length !== 1 || card.querySelector(rich)) continue;
    // A complete ordinary listing owns its description as well as its title.
    // Sibling header/body groups cannot be removed safely as a single node.
    let header = title;
    while (header.parentElement && header !== card && !header.nextElementSibling) header = header.parentElement;
    if (header === card) continue;
    let description = '';
    for (let node = header.nextElementSibling; node; node = node.nextElementSibling) {
      if (!node.matches('script,style,template,button,[role="button"],[aria-hidden="true"]')) description += node.textContent.trim();
    }
    const menu = 'button[aria-haspopup],[role="button"][aria-haspopup],[aria-label*="この検索結果"],[aria-label*="この結果"],[aria-label*="About this result" i]';
    if (description.length < 12 || [...card.querySelectorAll('a[href]')].some(other =>
      !other.closest(menu) && address(other) !== url)) continue;
    // Removing the inner face alone can leave the outer tile's painted margin
    // behind. Ascend only through single-child shells, never across other text
    // or controls and never remove the page's imported content root.
    while (card !== scope && card.parentElement && card.parentElement !== target &&
        !card.parentElement.matches('.generic-autopager-google-source-root,.generic-autopager-page,#rso,#search') &&
        card.parentElement.childElementCount === 1 && ![...card.parentElement.childNodes].some(node =>
          node.nodeType === 3 && node.textContent.trim())) {
      card = card.parentElement;
    }
    const key = JSON.stringify([url, label]);
    const previous = index.get(key) || [];
    const duplicates = removeCopies && previous.filter(item => !scope.contains(item) && item.isConnected && target.contains(item));
    if (duplicates?.length && visible(title) && visible(card)) {
      const text = clean(card.innerText);
      if (text && duplicates.some(item => visible(item) && clean(item.innerText) === text)) {
        removals.push(card);
        continue;
      }
    }
    previous.push(card);
    index.set(key, previous);
  }
  for (const card of removals) card.remove();
}
