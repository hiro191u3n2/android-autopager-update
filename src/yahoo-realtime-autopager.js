/* generic-yahoo-realtime-native-autopager-v645 */
(() => {
  'use strict';
  const supported = () => location.hostname === 'search.yahoo.co.jp' && /^\/realtime\/search\/?$/.test(location.pathname);
  if (!supported() || window.top !== window.self || window.__genericYahooRealtimeAutoPagerV645) return;
  window.__genericYahooRealtimeAutoPagerV645 = true;

  // Activate Yahoo's own React handler. Never fetch guessed URLs or replace its list.
  const MORE = ':scope > [class*="More_More__"] > a[data-cl-params*="_cl_link:more;"]';
  const POSTS = 'a[class*="Tweet_overallLink__"][href*="/realtime/search/tweet/"]';
  const LOADING = ':scope > p[class*="Loading_Loading__"]';
  const ERROR = ':scope > [class*="LoadingError_LoadingError__"],:scope > [class*="Timeline_LoadingError__"],a[data-cl-params*="_cl_link:resc;"]';
  const PRELOAD = 600, NO_PROGRESS_MS = 2200, RETRY_DELAY_MS = 400, GESTURE_MS = 2200;
  let root = null, route = location.pathname + location.search;
  let ids = [], tail = '', more = null, loading = false, failed = false;
  let attempts = 0, blockedTail = '', flight = null, retryAt = 0;
  let armed = false, gestureUntil = 0, touchY = null, pointerDown = false;
  let lastY = window.scrollY || 0, suspended = false, dispatching = false;
  let dirty = true, frame = 0, wakeTimer = 0, wakeAt = 0;
  const paused = () => suspended || document.hidden || navigator.onLine === false || !supported();
  const now = () => Date.now();
  const currentRoute = () => location.pathname + location.search;

  function cancelSchedule() {
    if (frame) cancelAnimationFrame(frame);
    if (wakeTimer) clearTimeout(wakeTimer);
    frame = wakeTimer = wakeAt = 0;
  }
  function clearIntent() {
    armed = false; gestureUntil = 0; touchY = null; pointerDown = false; retryAt = 0;
    // Lifecycle/reset boundaries revoke retry permission as well as scroll intent.
    if (flight) flight.automatic = false;
    lastY = window.scrollY || 0;
  }
  function schedule(delay = 0) {
    if (paused()) return;
    if (delay > 0) {
      const due = now() + delay;
      if (wakeTimer && wakeAt <= due) return;
      if (wakeTimer) clearTimeout(wakeTimer);
      wakeAt = due;
      wakeTimer = setTimeout(() => { wakeTimer = wakeAt = 0; schedule(); }, delay);
      return;
    }
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; tick(); });
  }
  function resetContext() {
    clearIntent(); cancelSchedule();
    ids = []; tail = ''; more = null; loading = failed = false;
    attempts = 0; blockedTail = ''; flight = null; dirty = true;
  }
  const rootObserver = new MutationObserver(() => { dirty = true; schedule(); });
  // This observer only checks root identity/route, not the contents of the whole page.
  const documentObserver = new MutationObserver(() => {
    if (route !== currentRoute() || root !== document.getElementById('sr')) { dirty = true; schedule(); }
  });
  function connectObservers() {
    if (document.documentElement) documentObserver.observe(document.documentElement, {childList: true, subtree: true});
    if (root) rootObserver.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled', 'aria-busy', 'hidden']});
  }
  function context() {
    const nextRoute = currentRoute(), nextRoot = document.getElementById('sr');
    if (nextRoute !== route || nextRoot !== root) {
      rootObserver.disconnect();
      route = nextRoute; root = nextRoot;
      resetContext();
      if (root && !suspended) rootObserver.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled', 'aria-busy', 'hidden']});
    }
    return !!root && !paused();
  }
  function scan() {
    if (!dirty || !root) return;
    const previousTail = tail;
    const previousIDs = new Set(ids);
    ids = Array.from(root.querySelectorAll(POSTS), a => (a.getAttribute('href') || '').match(/\/tweet\/(\d+)(?:[/?#]|$)/)?.[1]).filter(Boolean);
    tail = ids[ids.length - 1] || '';
    more = root.querySelector(MORE);
    loading = !!root.querySelector(LOADING);
    failed = !!root.querySelector(ERROR);
    dirty = false;
    if (previousTail && tail !== previousTail) {
      // A prepend alone keeps the old tail. A disappearing tail is a reset, not success.
      const oldIndex = ids.indexOf(previousTail);
      const appended = oldIndex >= 0 && ids.slice(oldIndex + 1).some(id => !previousIDs.has(id));
      attempts = 0; blockedTail = ''; retryAt = 0;
      if (!appended) { flight = null; clearIntent(); }
    }
  }
  function visibleControl(a) {
    if (!a || !a.isConnected || !root.contains(a) || a.closest('[hidden],[aria-hidden="true"],[disabled],[aria-disabled="true"],[aria-busy="true"]')) return false;
    const style = getComputedStyle(a);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    const rect = a.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) + PRELOAD;
  }
  function beginFlight(automatic) {
    flight = {tail, ids: new Set(ids), automatic, sawLoading: loading, deadline: now() + NO_PROGRESS_MS};
    armed = false; retryAt = 0;
    schedule(NO_PROGRESS_MS);
  }
  function appendedSince(f) {
    const index = ids.indexOf(f.tail);
    return index >= 0 && ids.slice(index + 1).some(id => !f.ids.has(id));
  }
  function tick() {
    if (!context()) return;
    scan();
    if (!tail) return; // Do not activate unrelated/no-result controls.
    if (failed) {
      blockedTail = tail; flight = null; clearIntent();
      return; // Retry/reload links are always left to the user.
    }
    if (loading) {
      // Yahoo also auto-loads its first few pages. Treat that as an in-flight request.
      if (!flight) beginFlight(false);
      flight.sawLoading = true;
      retryAt = 0;
      return; // A stuck spinner never causes a second request.
    }
    if (flight) {
      if (appendedSince(flight)) {
        flight = null; attempts = 0; blockedTail = ''; retryAt = 0;
      } else if (!ids.includes(flight.tail)) {
        flight = null; clearIntent();
        return;
      } else if (now() < flight.deadline) {
        schedule(flight.deadline - now());
        return;
      } else {
        const retry = flight.automatic && !flight.sawLoading && attempts < 2 && !!more;
        flight = null; armed = false;
        if (retry) { retryAt = now() + RETRY_DELAY_MS; schedule(RETRY_DELAY_MS); }
        else { blockedTail = tail; retryAt = 0; }
        return;
      }
    }
    if ((!armed && !retryAt) || blockedTail === tail || attempts >= 2) return;
    if (retryAt && now() < retryAt) { schedule(retryAt - now()); return; }
    // Re-read these cheap, root-scoped controls immediately before clicking: React
    // may have started its own request since the last MutationObserver callback.
    if (root.querySelector(LOADING) || root.querySelector(ERROR)) { dirty = true; schedule(); return; }
    more = root.querySelector(MORE);
    if (!visibleControl(more)) return;
    attempts++;
    beginFlight(true);
    dispatching = true;
    try { more.click(); } catch (_) { /* Keep native control and bounded timeout recovery. */ }
    finally { dispatching = false; }
    dirty = true;
    schedule();
  }

  function scrolling() {
    const y = window.scrollY || 0;
    if (!paused() && y > lastY + 1 && (pointerDown || now() <= gestureUntil)) armed = true;
    lastY = y;
    schedule();
  }
  function intent() { if (!paused()) gestureUntil = now() + GESTURE_MS; }
  window.addEventListener('scroll', scrolling, {passive: true});
  window.addEventListener('wheel', e => { if (e.deltaY > 0) intent(); }, {passive: true});
  window.addEventListener('touchstart', e => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }, {passive: true});
  window.addEventListener('touchmove', e => {
    if (touchY !== null && e.touches.length === 1) {
      const y = e.touches[0].clientY;
      if (y < touchY - 1) intent();
      touchY = y;
    }
  }, {passive: true});
  window.addEventListener('touchend', () => { touchY = null; }, {passive: true});
  window.addEventListener('touchcancel', () => { touchY = null; }, {passive: true});
  window.addEventListener('pointerdown', e => {
    // Desktop scrollbar drags may have no wheel/keyboard event.
    if (e.pointerType === 'mouse' && e.clientX >= document.documentElement.clientWidth - 24) pointerDown = true;
  }, {passive: true});
  window.addEventListener('pointerup', () => { pointerDown = false; }, {passive: true});
  window.addEventListener('pointercancel', () => { pointerDown = false; }, {passive: true});
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    if (['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar'].includes(e.key)) intent();
  }, {passive: true});
  // Observe manual clicks without cancelling or changing them. This prevents an
  // adjacent scroll event from dispatching a second click before React renders.
  document.addEventListener('click', e => {
    if (dispatching || !context()) return;
    const a = e.target?.closest?.('a[data-cl-params*="_cl_link:more;"]');
    if (!a || a !== root.querySelector(MORE)) return;
    dirty = true; scan();
    if (!flight) beginFlight(false);
    else {
      // A manual click supersedes any pending hydration retry from our click.
      flight.automatic = false;
      flight.deadline = now() + NO_PROGRESS_MS;
      schedule(NO_PROGRESS_MS);
    }
    armed = false; retryAt = 0;
  }, true);

  function pauseOrResume() {
    clearIntent();
    if (paused()) cancelSchedule();
    else { dirty = true; schedule(); }
  }
  document.addEventListener('visibilitychange', pauseOrResume);
  window.addEventListener('offline', pauseOrResume);
  window.addEventListener('online', pauseOrResume);
  window.addEventListener('popstate', () => { dirty = true; clearIntent(); schedule(); });
  window.addEventListener('pagehide', () => {
    suspended = true; clearIntent(); cancelSchedule();
    rootObserver.disconnect(); documentObserver.disconnect();
  });
  window.addEventListener('pageshow', () => {
    suspended = false; clearIntent(); dirty = true;
    connectObservers(); schedule();
  });
  // Snapshot only: no data uploads, DOM writes, or controls exposed to the page.
  window.__genericYahooRealtimeAutoPagerDiagnostics = () => ({
    tail, attempts, inFlight: !!flight, armed, blocked: blockedTail === tail && !!tail,
    more: !!more, loading, paused: paused(), route
  });
  function start() { connectObservers(); schedule(); }
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, {once: true});
})();
