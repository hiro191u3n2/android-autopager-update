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

async function hydrateGenericGoogleFrameV666(view, doc, root) {
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
  const waiting = [];
  let batchStart = performance.now(), count = 0;
  for (const image of root.querySelectorAll('img')) {
    if (++count % 64 === 0 || performance.now() - batchStart >= 6) {
      await genericGooglePreparationYieldV666(); requireLive(); batchStart = performance.now();
    }
    if (image.complete || !image.getClientRects().length || genericGoogleImageSlotReadyV666(image, view)) continue;
    waiting.push(image);
  }
  // Known image slots can paint their pixels later without moving any result.
  // Unsized pending images still get the existing bounded opportunity to load.
  if (waiting.length) await new Promise(resolve => {
    let remaining = waiting.length, timer = 0, closed = false;
    const listeners = [];
    const finish = () => {
      if (closed) return;
      closed = true;
      window.clearTimeout(timer);
      for (const [image, done] of listeners) {
        image.removeEventListener('load', done);
        image.removeEventListener('error', done);
      }
      resolve();
    };
    for (const image of waiting) {
      let settled = false;
      const done = () => {
        if (settled || closed) return;
        settled = true;
        if (--remaining === 0) finish();
      };
      listeners.push([image, done]);
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
      if (image.complete) done();
    }
    if (!closed) timer = window.setTimeout(finish, 1600);
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
