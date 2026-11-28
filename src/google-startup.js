// Keep the original external destination when Google supplies a /goto link.
// Restrict unwrapping to same-origin Google result redirects and web URLs.
function genericGoogleGotoDestination(link, base) {
  const raw = link.getAttribute('href');
  if (!raw || !raw.includes('/goto')) return null;
  try {
    const from = new URL(base), wrapper = new URL(raw, from);
    if (wrapper.origin !== from.origin || !/^(?:www\.)?google\.[a-z.]+$/i.test(wrapper.hostname) || wrapper.pathname !== '/goto') return null;
    for (const value of [wrapper.searchParams.get('url'), wrapper.searchParams.get('q'),
      link.getAttribute('data-href'), link.getAttribute('data-url')]) {
      if (!value || !/^https?:\/\//i.test(value)) continue;
      const target = new URL(value);
      if (target.origin !== wrapper.origin) return target.href;
    }
    // Mobile Google also returns an opaque url token and a session id. The
    // complete Google URL is the navigable link; the token is not a URL.
    const token = wrapper.searchParams.get('url');
    if (token && wrapper.searchParams.get('gsessionid') && !/^(?:[a-z][\w+.-]*:|[/?#])|\s/i.test(token)) return wrapper.href;
  } catch (_) { }
  return null;
}

function genericGoogleGotoIdentity(link, base) {
  const href = genericGoogleGotoDestination(link, base);
  if (!href) return '';
  const text = (link.getAttribute('aria-label') || link.textContent || '').trim().replace(/\s+/g, ' ');
  const row = link.closest('article,.MjjYud,[data-snhf]') || link.parentElement;
  const title = row?.querySelector('h3,[role="heading"]')?.textContent.trim();
  const site = row?.querySelector('cite,[data-dtld]')?.textContent.trim();
  // Redirect tokens can rotate for an identical page. Preserve different
  // result lists, and only use the exact URL when no label is available.
  return text || title ? 'goto:' + JSON.stringify([text, title || '', site || '']) : href;
}

function normalizeGenericGoogleGotoLinks(root, base) {
  for (const link of root.querySelectorAll('a[href*="/goto"]')) {
    const dest = genericGoogleGotoDestination(link, base);
    if (dest) link.setAttribute('href', dest);
  }
}

function genericGoogleReadyFrameRoot(root) {
  if (!root) return false;
  for (const link of root.querySelectorAll('a[href]')) {
    if (genericGoogleTailExternalV663(link)) return true;
  }
  return false;
}

// Mobile Google can replace its initial shell after DOMContentLoaded. Bind
// the pager to the populated results rather than an empty, soon-detached node.
function startGenericPagerWithGoogleResults(start) {
  const route = genericGoogleTailRouteV663();
  const query = new URLSearchParams(location.search);
  if (window.top !== window.self || !route || !query.get('q') || query.get('tbm') === 'isch' || query.get('udm') === '2') {
    start();
    return;
  }
  const ready = () => {
    const root = document.querySelector('#rso') || document.querySelector('#search [role="main"],#search');
    return root?.querySelector('h3,[role="heading"]') || genericGoogleReadyFrameRoot(root);
  };
  if (ready()) { start(); return; }

  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(check);
  });
  const stop = () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    window.removeEventListener('pagehide', leave);
  };
  const check = () => {
    frame = 0;
    if (!genericGoogleTailRouteV663()) { stop(); return; }
    if (ready()) { stop(); start(); }
  };
  // Terminal, empty search pages should not retain an observer.
  const leave = event => { if (!event.persisted) stop(); };
  const timeout = setTimeout(stop, 30000);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pagehide', leave);
}
