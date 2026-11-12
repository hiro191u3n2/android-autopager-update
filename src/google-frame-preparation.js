// Prepare a rendered Google frame according to its actual layout readiness.
// Only the source frame scrolls; no outer scroll position or gesture is changed.
function genericGoogleFrameConnectedV666(view, doc, root) {
  try {
    return !!root?.isConnected && root.ownerDocument === doc && doc.defaultView === view &&
      (view === window || !!view.frameElement?.isConnected);
  } catch (_) { return false; }
}

const genericGooglePreparationFrameV666 = () => new Promise(resolve => window.requestAnimationFrame(resolve));
const genericGooglePreparationYieldV666 = () => new Promise(resolve => window.setTimeout(resolve, 0));

function genericGoogleImageSlotReadyV666(image, view) {
  const rect = image.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const positiveAttribute = name => /^\d+(?:\.\d+)?$/.test(image.getAttribute(name) || '') && Number(image.getAttribute(name)) > 0;
  let width = image.style.width, height = image.style.height;
  try {
    const map = image.computedStyleMap?.();
    width = String(map?.get('width') || width);
    height = String(map?.get('height') || height);
  } catch (_) { }
  // Typed OM keeps authored auto distinct from the resolved intrinsic size.
  // Older engines conservatively use explicit attributes/inline dimensions.
  const fixed = value => !!value && !/^(?:auto|none|initial|unset|inherit|max-content|min-content|fit-content)$/i.test(value) && value !== '0px';
  const hasWidth = positiveAttribute('width') || fixed(width);
  const hasHeight = positiveAttribute('height') || fixed(height);
  if (hasWidth && hasHeight) return true;
  const ratio = view.getComputedStyle(image).aspectRatio;
  return (hasWidth || hasHeight) && !!ratio && !/\bauto\b/.test(ratio) && ratio !== 'none';
}

function genericGoogleImagePlaceholderV666(value) {
  const src = String(value || '').trim().toLowerCase();
  return !src || src === 'about:blank' || src.startsWith('data:image/gif;base64,r0lgodlhaqaba') ||
    src.startsWith('data:image/png;base64,ivborw0kgoaaaansuheugaaaaeaaaab') ||
    src.startsWith('data:image/svg+xml') && /transparent|opacity%3d.?0|fill%3d.?none/.test(src);
}

function genericGoogleImageActivationPendingV666(image, isPlaceholder) {
  const resource = value => !!String(value || '').trim() && !isPlaceholder(value);
  const picture = image.parentElement?.tagName === 'PICTURE' ? image.parentElement : null;
  const sources = picture ? [...picture.querySelectorAll('source')] : [];
  if ([image.getAttribute('src'), image.getAttribute('srcset'), ...sources.map(source => source.getAttribute('srcset'))].some(resource)) return false;
  return ['data-src', 'data-lazy-src', 'data-original', 'data-iurl', 'data-srcset'].some(name => resource(image.getAttribute(name))) ||
    sources.some(source => resource(source.getAttribute('data-srcset')));
}

function genericGoogleActivateKnownImageV666(image, isPlaceholder) {
  const usable = value => {
    if (!value || isPlaceholder(value)) return false;
    try {
      const url = new URL(value, image.ownerDocument.baseURI);
      return /^(?:https?:|blob:)$/.test(url.protocol) || url.protocol === 'data:' && /^data:image\//i.test(value);
    } catch (_) { return false; }
  };
  const promoteSet = node => {
    const value = node.getAttribute('data-srcset');
    // Preserve ordinary responsive candidates; leave unusual data-URL srcsets
    // to their own script instead of guessing where an embedded comma ends.
    if (value && value.split(',').every(candidate => usable(candidate.trim().split(/\s+/)[0]))) node.setAttribute('srcset', value);
  };
  if (image.parentElement?.tagName === 'PICTURE') for (const source of image.parentElement.querySelectorAll('source')) promoteSet(source);
  promoteSet(image);
  const value = ['data-src', 'data-lazy-src', 'data-original', 'data-iurl'].map(name => image.getAttribute(name)).find(usable);
  if (value) image.setAttribute('src', value);
  image.setAttribute('loading', 'eager');
  return !genericGoogleImageActivationPendingV666(image, isPlaceholder);
}

async function hydrateGenericGoogleFrameV666(view, doc, root, isPlaceholder = genericGoogleImagePlaceholderV666) {
  const live = () => genericGoogleFrameConnectedV666(view, doc, root);
  const requireLive = () => { if (!live()) throw new Error('Googleページの読み込みが中断されました'); };
  requireLive();
  const scrollRoot = doc.scrollingElement || doc.documentElement;
  const positions = scrollRoot.scrollHeight > view.innerHeight ? [.35, .7, 1] : [0];
  for (const fraction of positions) {
    requireLive();
    const maximum = Math.max(0, scrollRoot.scrollHeight - view.innerHeight);
    view.scrollTo(0, Math.floor(maximum * fraction));
    view.dispatchEvent(new view.Event('scroll'));
    // Let layout and IntersectionObserver-triggered lazy hydration run. These
    // are frame opportunities, not a fixed 180ms delay for every viewport.
    await genericGooglePreparationFrameV666();
    await genericGooglePreparationFrameV666();
  }
  requireLive();
  const waitingImages = async () => {
    requireLive();
    const waiting = [];
    let batchStart = performance.now(), count = 0;
    for (const image of root.querySelectorAll('img')) {
      if (++count % 64 === 0 || performance.now() - batchStart >= 6) {
        await genericGooglePreparationYieldV666(); requireLive(); batchStart = performance.now();
      }
      if (!image.getClientRects().length) continue;
      const activation = genericGoogleImageActivationPendingV666(image, isPlaceholder);
      if (activation || !image.complete && !genericGoogleImageSlotReadyV666(image, view)) waiting.push({ image, activation });
    }
    return waiting;
  };
  let waiting = await waitingImages();
  let activated = false;
  for (const item of waiting) if (item.activation && genericGoogleImageSlotReadyV666(item.image, view)) {
    activated = genericGoogleActivateKnownImageV666(item.image, isPlaceholder) || activated;
  }
  if (activated) {
    // A debounced source script may otherwise never activate an earlier
    // viewport. Safe known URLs in reserved slots need no timer-based wait.
    await genericGooglePreparationFrameV666(); requireLive();
    waiting = await waitingImages();
  }
  // Known image slots can paint their pixels later without moving any result.
  // A complete transparent placeholder is not an activated image. Deferred
  // lazy scripts get the same shared bound as unsized pending image pixels.
  if (waiting.length) await new Promise((resolve, reject) => {
    let timer = 0, frame = 0, closed = false, checking = false, again = false, expired = false;
    const observer = new view.MutationObserver(() => { void check(); });
    const finish = error => {
      if (closed) return;
      closed = true;
      window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener('load', onResource, true);
      root.removeEventListener('error', onResource, true);
      if (error) reject(error); else resolve();
    };
    const check = async () => {
      if (closed) return;
      if (checking) { again = true; return; }
      checking = true;
      try {
        const pending = await waitingImages();
        if (closed) return;
        if (!pending.length) finish();
        else if (expired) {
          // A long page can have gaps between the visited viewports. At the
          // shared deadline safely activate known lazy URLs in reserved slots
          // so those pixels can load after import without changing geometry.
          const activations = pending.filter(item => item.activation);
          const unresolved = activations.some(({ image }) =>
            !genericGoogleImageSlotReadyV666(image, view) || !genericGoogleActivateKnownImageV666(image, isPlaceholder));
          if (!unresolved && activations.length) { await genericGooglePreparationFrameV666(); requireLive(); }
          finish(unresolved ? new Error('Google画像の準備が完了しませんでした。再試行してください') : undefined);
        }
      } catch (error) { finish(error); }
      finally {
        checking = false;
        if (again && !closed) { again = false; void check(); }
      }
    };
    const onResource = () => { void check(); };
    observer.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['src', 'srcset', 'data-src', 'data-lazy-src', 'data-original', 'data-iurl', 'data-srcset', 'class', 'style', 'width', 'height'] });
    root.addEventListener('load', onResource, true);
    root.addEventListener('error', onResource, true);
    timer = window.setTimeout(() => { expired = true; void check(); }, 1600);
    frame = window.requestAnimationFrame(() => { frame = 0; void check(); });
    void check();
  });
  requireLive();
}

async function hydrateGenericGoogleCapturedImagesV666(root, url, isPlaceholder, setURL) {
  const doc = root.ownerDocument, view = doc.defaultView;
  const requireLive = () => {
    if (!genericGoogleFrameConnectedV666(view, doc, root)) throw new Error('Googleページの読み込みが中断されました');
  };
  requireLive();
  const images = [...root.querySelectorAll('img')], records = [];
  let batchStart = performance.now();
  // Finish all geometry reads before the first source style/attribute write.
  for (let index = 0; index < images.length; index++) {
    if (index && (index % 64 === 0 || performance.now() - batchStart >= 6)) {
      await genericGooglePreparationYieldV666(); requireLive(); batchStart = performance.now();
    }
    const image = images[index], rect = image.getBoundingClientRect();
    records.push({ image, src: image.currentSrc || image.src || image.getAttribute('src') || '', width: rect.width, height: rect.height });
  }
  batchStart = performance.now();
  for (let index = 0; index < records.length; index++) {
    if (index && (index % 64 === 0 || performance.now() - batchStart >= 6)) {
      await genericGooglePreparationYieldV666(); requireLive(); batchStart = performance.now();
    }
    const { image, src, width, height } = records[index];
    if (!root.contains(image)) continue;
    if (src && !isPlaceholder(src)) { setURL(image, 'src', src, url); image.removeAttribute('srcset'); }
    if (width > 1 && !image.getAttribute('width')) image.setAttribute('width', String(Math.round(width)));
    if (height > 1 && !image.getAttribute('height')) image.setAttribute('height', String(Math.round(height)));
    image.setAttribute('loading', 'eager');
    image.style.setProperty('opacity', '1', 'important');
    image.style.setProperty('visibility', 'visible', 'important');
    image.style.removeProperty('display');
  }
  // The captured layout already includes every computed background-image.
  // Re-reading all descendants here would duplicate work and force layout.
}
