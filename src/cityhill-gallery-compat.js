/* generic-cityhill-gallery-compat-v646 */
(() => {
  'use strict';
  if (window.top !== window.self || !/^store\.cityhill\.co\.jp$/i.test(location.hostname) ||
      !/^\/(?:sp\/)?(?:majesticlegon\/)?item\/\d+\.html$/i.test(location.pathname) ||
      window.__genericCityhillGalleryCompatV646) return;
  window.__genericCityhillGalleryCompatV646 = true;

  // CITYHILL's Swiper 11 thumbs listen to Swiper's internal `tap`, not DOM
  // click. Touch-only / click-only WebView delivery can miss that internal
  // event. Let the native handlers run first, then use their existing API.
  const GRACE = 180, MAX_MOVE = 5, MAX_PRESS = 900;
  let gesture = null, timer = 0, ticket = 0, blockedUntil = 0;
  const now = () => Date.now();
  function cancelPending() {
    ticket++;
    clearTimeout(timer);
    timer = 0;
  }
  function target(node) {
    const slide = node?.closest?.('.thumnailSlider .swiper-slide');
    const wrapper = slide?.parentElement;
    const container = wrapper?.parentElement;
    const area = container?.closest('#imageArea');
    if (!slide || !wrapper?.classList.contains('swiper-wrapper') ||
        !container?.classList.contains('thumnailSlider') || !area) return null;
    return { slide, wrapper, container, area };
  }
  function nativeGallery(t) {
    if (!t.slide.isConnected || !t.area.contains(t.container)) return null;
    const index = [...t.wrapper.children].filter(el => el.classList.contains('swiper-slide')).indexOf(t.slide);
    if (index < 0) return null;
    let area;
    try {
      const realm = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      area = realm.document.getElementById('imageArea');
    } catch (_) { return null; }
    const mainNode = area?.querySelector('.mainSlider');
    const thumbNode = area?.querySelector('.thumnailSlider');
    if (!thumbNode || !t.container.isSameNode(thumbNode)) return null;
    const main = mainNode?.swiper, thumb = thumbNode?.swiper;
    if (!main || !thumb || main.destroyed || thumb.destroyed || main.enabled === false ||
        thumb.enabled === false || main.thumbs?.swiper !== thumb ||
        main.allowSlideNext === false || main.allowSlidePrev === false ||
        !Number.isInteger(main.realIndex) || index >= (main.slides?.length || 0)) return null;
    const method = main.params?.loop ? 'slideToLoop' : 'slideTo';
    if (typeof main[method] !== 'function') return null;
    return { main, index, method };
  }
  function schedule(t) {
    cancelPending();
    const id = ticket;
    timer = setTimeout(() => {
      timer = 0;
      if (id !== ticket || document.hidden) return;
      const native = nativeGallery(t);
      if (!native || native.main.realIndex === native.index ||
          (native.main.animating && native.main.params?.preventInteractionOnTransition)) return;
      native.main[native.method](native.index);
    }, GRACE);
  }
  function invalidate() {
    cancelPending();
    blockedUntil = now() + 1500;
    if (gesture) { gesture.invalid = true; gesture.updatedAt = now(); }
  }
  const point = e => ({ x: Number(e.clientX ?? e.pageX), y: Number(e.clientY ?? e.pageY) });
  function begin(e, p, kind, id) {
    cancelPending();
    const t = target(e.target);
    if (!t) { gesture = null; return; }
    const xy = point(p), at = now();
    if (!Number.isFinite(xy.x) || !Number.isFinite(xy.y)) { gesture = null; return; }
    // Android normally emits both pointerdown and touchstart for one gesture.
    if (gesture && !gesture.invalid && gesture.endedAt === undefined && gesture.target.slide === t.slide &&
        at - gesture.startedAt < 100 && gesture[kind] === undefined) {
      gesture[kind] = id;
      return;
    }
    gesture = { target: t, x: xy.x, y: xy.y, startedAt: at, updatedAt: at,
      invalid: false, [kind]: id };
    blockedUntil = 0;
  }
  function move(p) {
    if (!gesture) return;
    const xy = point(p);
    gesture.updatedAt = now();
    if (!Number.isFinite(xy.x) || !Number.isFinite(xy.y) ||
        Math.hypot(xy.x - gesture.x, xy.y - gesture.y) > MAX_MOVE) invalidate();
  }
  function finish(e, p) {
    if (!gesture) return;
    move(p);
    gesture.endedAt = now();
    const t = target(e.target);
    if (gesture.invalid || !t || t.slide !== gesture.target.slide ||
        now() - gesture.startedAt > MAX_PRESS) { invalidate(); return; }
    schedule(gesture.target);
  }
  const options = { capture: true, passive: true };
  document.addEventListener('pointerdown', e => {
    if (!e.isTrusted) return;
    if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) { invalidate(); return; }
    begin(e, e, 'pointerId', e.pointerId);
  }, options);
  document.addEventListener('pointermove', e => {
    if (e.isTrusted && gesture?.pointerId === e.pointerId) move(e);
  }, options);
  document.addEventListener('pointerup', e => {
    if (e.isTrusted && gesture?.pointerId === e.pointerId) finish(e, e);
  }, options);
  document.addEventListener('pointercancel', e => {
    if (e.isTrusted && gesture?.pointerId === e.pointerId) invalidate();
  }, options);
  document.addEventListener('touchstart', e => {
    if (!e.isTrusted) return;
    if (e.touches.length !== 1) { invalidate(); return; }
    const p = e.touches[0];
    begin(e, p, 'touchId', p.identifier);
  }, options);
  document.addEventListener('touchmove', e => {
    if (!e.isTrusted) return;
    if (e.touches.length !== 1) { invalidate(); return; }
    const p = [...e.touches].find(t => t.identifier === gesture?.touchId);
    if (p) move(p);
  }, options);
  document.addEventListener('touchend', e => {
    if (!e.isTrusted) return;
    if (e.touches.length) { invalidate(); return; }
    const p = [...e.changedTouches].find(t => t.identifier === gesture?.touchId);
    if (p) finish(e, p);
  }, options);
  document.addEventListener('touchcancel', e => { if (e.isTrusted) invalidate(); }, options);
  document.addEventListener('click', e => {
    if (!e.isTrusted || e.defaultPrevented || now() < blockedUntil ||
        (e.button !== undefined && e.button !== 0)) return;
    const t = target(e.target);
    if (!t) return;
    if (gesture && now() - gesture.updatedAt < 1500 &&
        (gesture.invalid || gesture.target.slide !== t.slide || now() - gesture.startedAt > MAX_PRESS)) return;
    schedule(t);
  }, options);
  window.addEventListener('pagehide', cancelPending, { passive: true });
})();
