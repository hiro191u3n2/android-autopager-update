// Prepare only a detached Google result page. Finished titles are published
// once; a slow/failed resolver leaves Google's original visible title intact.
const genericGoogleTitleDeadlineV663 = 2200;

async function prepareGenericGoogleTitlesV663(root, parseVideo, resolveTitle, applyTitle) {
  if (!root?.querySelectorAll || root.isConnected || !genericGoogleTailRouteV663()) return;
  const jobs = [], seen = new Set();
  for (const anchor of root.querySelectorAll('a[href]')) {
    const video = parseVideo(anchor.getAttribute('href') || anchor.href);
    if (!video) continue;
    let card = anchor;
    for (let depth = 0; card && card !== root && depth < 9 && !card.querySelector?.('h3,[role="heading"]'); depth++) card = card.parentElement;
    if (!card || card === root) continue;
    const title = card.querySelector('h3') || [...card.querySelectorAll('[role="heading"]')].find(node => {
      const level = Number(node.getAttribute('aria-level') || 0);
      return !level || level >= 2;
    });
    if (!title || seen.has(title)) continue;
    seen.add(title);
    jobs.push({ title, video });
  }
  if (!jobs.length) return;
  let cursor = 0, closed = false, timer = 0;
  const completed = [];
  const settled = Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
    while (!closed && cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const text = await resolveTitle(job.video);
        if (!closed && text) completed.push({ title: job.title, text });
      } catch (_) { /* Keep the Google title if this video's resolver fails. */ }
    }
  }));
  try {
    await Promise.race([settled, new Promise(resolve => {
      timer = window.setTimeout(resolve, genericGoogleTitleDeadlineV663);
    })]);
  } finally {
    closed = true;
    window.clearTimeout(timer);
  }
  // Requests can settle after the shared deadline. They can still populate the
  // existing resolver cache, but no continuation may rewrite a displayed page.
  if (root.isConnected) return;
  for (const { title, text } of completed) if (root.contains(title)) applyTitle(title, text);
}

const genericGoogleTailStatesV663 = new WeakMap();
const genericGoogleActiveTailsV663 = new Set();
let genericGoogleTailLifecycleV663 = false;
const genericGoogleTailSelectorV663 = '#botstuff,#bres,#brs,#foot,#footer,footer,[role="contentinfo"]';
const genericGoogleRelatedLabelV663 = /^(?:他の人はこちらも検索|関連する検索|関連検索|People also search for|Related searches)$/i;

function genericGoogleTailRouteV663() {
  try {
    const url = new URL(location.href);
    if (!/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) || url.pathname !== '/search' || url.searchParams.get('udm') === '50') return '';
    return JSON.stringify([url.origin, url.pathname, ...['q', 'tbm', 'udm', 'start'].map(key => url.searchParams.get(key))]);
  } catch (_) { return ''; }
}

function genericGoogleNextIdentityV663(value, page = false) {
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || url.pathname !== '/search') return '';
    return JSON.stringify([url.origin, url.pathname, ...['q', 'tbm', 'udm', ...(page ? ['start'] : [])].map(key => url.searchParams.get(key))]);
  } catch (_) { return ''; }
}

function genericGoogleTailExternalV663(link) {
  try {
    let url = new URL(link.getAttribute('href'), location.href);
    if (/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') {
      url = new URL(url.searchParams.get('q') || url.searchParams.get('url') || '', location.href);
    }
    return /^https?:$/.test(url.protocol) && !/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname);
  } catch (_) { return false; }
}

function genericGoogleTailHasResultV663(node) {
  for (const heading of node.querySelectorAll('h3,[role="heading"],[aria-level]')) {
    const link = heading.closest('a[href]') || heading.querySelector('a[href]');
    if (!link) continue;
    if (genericGoogleTailExternalV663(link)) return true;
  }
  // Mobile results can use plain div titles. An explicit source address plus
  // an external text destination protects a shared wrapper without guessing
  // that every footer link is a search result.
  if (node.querySelector('cite,[data-dtld]') && [...node.querySelectorAll('a[href]')].some(link =>
    link.textContent.trim().length >= 2 && genericGoogleTailExternalV663(link))) return true;
  return false;
}

function genericGoogleTailScopesV663(target) {
  const scopes = [];
  const add = node => {
    if (!node.matches('.generic-autopager-page,script,style,link,template,#generic-autopager-status-v2,#generic-autopager-sentinel')) scopes.push(node);
  };
  // Imported sections grow throughout the session. Inspect the original
  // children and the following siblings of their ancestry, never their pages.
  for (const node of target.children) add(node);
  for (let node = target; node && node !== document.body; node = node.parentElement) {
    for (let sibling = node.nextElementSibling; sibling; sibling = sibling.nextElementSibling) add(sibling);
  }
  return scopes;
}

function genericGoogleTailNodesV663(scope, target, selector) {
  const roots = scope === document ? genericGoogleTailScopesV663(target) : [scope];
  const nodes = new Set();
  for (const root of roots) {
    if (root.matches?.(selector)) nodes.add(root);
    for (const node of root.querySelectorAll(selector)) nodes.add(node);
  }
  return [...nodes];
}

function genericGoogleManualNextV663(target, nextURL) {
  const expected = nextURL && genericGoogleNextIdentityV663(nextURL, true);
  if (!expected) return [];
  return genericGoogleTailNodesV663(document, target, 'a[href]').filter(link => {
    if (link.closest('.generic-autopager-page,header,form,[role="dialog"],[role="listbox"]')) return false;
    // Japanese-UI forcing and tracking parameters do not change which result
    // page a native next link opens. Query/mode/start still have to agree.
    return genericGoogleNextIdentityV663(link.getAttribute('href'), true) === expected;
  });
}

function collectGenericGoogleTailsV663(scope, target, nextURL = '') {
  const candidates = new Set();
  const live = scope === document;
  const accept = node => {
    if (!node || node === target || node.contains(target) || /^(?:HTML|BODY|MAIN)$/.test(node.tagName) ||
        node.matches('#rso,#search,[role="main"],.generic-autopager-page,.generic-autopager-google-source-root') ||
        node.closest('header,form,[role="dialog"],[role="listbox"],.generic-autopager-divider') ||
        live && node.closest('.generic-autopager-page') || genericGoogleTailHasResultV663(node)) return false;
    if (live && !target.contains(node) && !(target.compareDocumentPosition(node) & 4)) return false;
    return true;
  };
  for (const node of genericGoogleTailNodesV663(scope, target, genericGoogleTailSelectorV663)) if (accept(node)) candidates.add(node);
  for (const heading of genericGoogleTailNodesV663(scope, target, 'h2,h3,[role="heading"],[aria-level]')) {
    if (!genericGoogleRelatedLabelV663.test((heading.textContent || '').replace(/\s+/g, ' ').trim())) continue;
    for (let node = heading.parentElement, depth = 0; node && node !== target && depth < 6; node = node.parentElement, depth++) {
      if (!accept(node) || node.querySelectorAll('*').length > 240 || node.textContent.length > 3500) break;
      const links = [...node.querySelectorAll('a[href]')];
      if (links.length < 2 || links.length > 30) continue;
      const searches = links.filter(link => {
        try {
          const url = new URL(link.getAttribute('href'), location.href);
          return /^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/search' && url.searchParams.has('q');
        } catch (_) { return false; }
      });
      if (searches.length === links.length) { candidates.add(node); break; }
    }
  }
  if (live && nextURL) for (const link of genericGoogleManualNextV663(target, nextURL)) {
    const node = link.closest('nav,[role="navigation"],.pagination,.pager') || link;
    if (accept(node)) candidates.add(node);
  }
  return [...candidates].filter(node => ![...candidates].some(other => other !== node && other.contains(node)));
}

function cleanGenericGoogleImportedTailV663(root) {
  if (!root?.querySelectorAll || root.isConnected || !genericGoogleTailRouteV663()) return;
  for (const node of collectGenericGoogleTailsV663(root, root)) node.remove();
}

function restoreGenericGoogleTailV663(state) {
  for (const [node, saved] of state.hidden) {
    if (saved.value) node.style.setProperty('display', saved.value, saved.priority);
    else node.style.removeProperty('display');
    if (!saved.hadStyle && !node.getAttribute('style')) node.removeAttribute('style');
  }
  state.hidden.clear();
}

function restoreGenericGoogleManualV663(state) {
  for (const [link, saved] of state.manual) {
    if (saved.lastHref !== null && link.getAttribute('href') === saved.lastHref) {
      if (saved.href === null) link.removeAttribute('href');
      else link.setAttribute('href', saved.href);
    }
    if (saved.lastDisplay && link.style.getPropertyValue('display') === 'none' && link.style.getPropertyPriority('display') === 'important') {
      if (saved.display) link.style.setProperty('display', saved.display, saved.priority);
      else link.style.removeProperty('display');
      if (!saved.hadStyle && !link.getAttribute('style')) link.removeAttribute('style');
    }
    saved.lastHref = null;
    saved.lastDisplay = false;
  }
}

function updateGenericGoogleManualV663(state, nextURL) {
  let href = '';
  try {
    const next = new URL(nextURL, location.href);
    if (nextURL && next.origin === location.origin && next.pathname === '/search') href = next.href;
  } catch (_) { }
  for (const [link, saved] of state.manual) {
    if (!href) {
      link.style.setProperty('display', 'none', 'important');
      saved.lastDisplay = true;
      continue;
    }
    if (saved.lastDisplay) {
      if (saved.display) link.style.setProperty('display', saved.display, saved.priority);
      else link.style.removeProperty('display');
      if (!saved.hadStyle && !link.getAttribute('style')) link.removeAttribute('style');
      saved.lastDisplay = false;
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    saved.lastHref = href;
  }
}

function installGenericGoogleTailLifecycleV663() {
  if (genericGoogleTailLifecycleV663) return;
  genericGoogleTailLifecycleV663 = true;
  const releaseChanged = () => {
    const route = genericGoogleTailRouteV663();
    for (const state of genericGoogleActiveTailsV663) {
      if (state.route === route && state.target.isConnected) continue;
      restoreGenericGoogleTailV663(state);
      restoreGenericGoogleManualV663(state);
      genericGoogleTailStatesV663.delete(state.target);
      genericGoogleActiveTailsV663.delete(state);
    }
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    try {
      history[method] = function () {
        const result = original.apply(this, arguments);
        releaseChanged();
        return result;
      };
    } catch (_) { }
  }
  window.addEventListener('popstate', releaseChanged);
  window.addEventListener('pagehide', () => {
    for (const state of genericGoogleActiveTailsV663) {
      restoreGenericGoogleTailV663(state);
      restoreGenericGoogleManualV663(state);
    }
  });
  window.addEventListener('pageshow', () => {
    releaseChanged();
    for (const state of genericGoogleActiveTailsV663) syncGenericGoogleTailV663(state.target, state.active, state.nextURL);
  });
}

function syncGenericGoogleTailV663(target, active, nextURL = '') {
  if (!target?.querySelectorAll || target.ownerDocument !== document) return;
  let state = genericGoogleTailStatesV663.get(target);
  const route = genericGoogleTailRouteV663();
  if (state && (!route || !target.isConnected || state.route !== route)) {
    restoreGenericGoogleTailV663(state);
    restoreGenericGoogleManualV663(state);
    genericGoogleTailStatesV663.delete(target);
    genericGoogleActiveTailsV663.delete(state);
    state = null;
  }
  // A delayed status update from an older SPA query must not hide the new
  // query's footer. A fresh pager may legitimately reuse the same target node.
  if (nextURL && genericGoogleNextIdentityV663(nextURL) !== genericGoogleNextIdentityV663(location.href)) return;
  if (!route || !target.isConnected || !active && !state) return;
  if (!state) {
    state = { target, route, nextURL, active, hidden: new Map(), manual: new Map() };
    for (const link of genericGoogleManualNextV663(target, nextURL)) state.manual.set(link, {
      href: link.getAttribute('href'), display: link.style.getPropertyValue('display'), priority: link.style.getPropertyPriority('display'),
      hadStyle: link.hasAttribute('style'), lastHref: null, lastDisplay: false,
    });
    genericGoogleTailStatesV663.set(target, state);
  }
  state.nextURL = nextURL;
  state.active = active;
  genericGoogleActiveTailsV663.add(state);
  installGenericGoogleTailLifecycleV663();
  if (!active) {
    restoreGenericGoogleTailV663(state);
    updateGenericGoogleManualV663(state, nextURL);
    return;
  }
  updateGenericGoogleManualV663(state, nextURL);
  for (const node of collectGenericGoogleTailsV663(document, target, nextURL)) {
    if (!state.hidden.has(node)) state.hidden.set(node, { value: node.style.getPropertyValue('display'),
      priority: node.style.getPropertyPriority('display'), hadStyle: node.hasAttribute('style') });
    node.style.setProperty('display', 'none', 'important');
  }
}
