// Keep one Google result page ready ahead of the reader. The existing loader
// still owns requests, preparation, duplicate detection and the page limit.
function createGenericGoogleReadAheadV665(state, load) {
  const route = genericGoogleTailRouteV663();
  if (!route || !state?.target?.isConnected) return null;
  let latest = null, frame = 0, generation = 0, disposed = false, suspended = false, composing = false;
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
    if (section?.parentNode === state.target) latest = section;
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
