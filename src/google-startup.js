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
