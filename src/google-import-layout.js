// Google loads result-specific CSS in each fetched document. Preserve the
// rendered source layout when importing its nodes instead of guessing which
// price, article, or video template Google returned. This runs only once per
// imported page; there are no scroll listeners, timers, or document observers.
const genericGoogleLayoutSourcesV647 = new WeakMap();
const genericGoogleLayoutClonesV647 = new WeakSet();
const genericGoogleLayoutMarkerV647 = 'data-generic-google-layout-v647';
const genericGoogleLayoutLimitV647 = 5000;
const genericGoogleLayoutPropertiesV647 = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
  'box-sizing', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'overflow-x', 'overflow-y', 'overflow-wrap', 'word-break', 'white-space',
  'text-overflow', 'vertical-align', 'z-index', 'isolation',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'justify-content', 'align-items', 'align-content', 'align-self', 'order',
  'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows',
  'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant',
  'line-height', 'letter-spacing', 'text-align', 'text-indent',
  'text-transform', 'text-decoration-line', 'text-decoration-style',
  'text-decoration-color', 'text-decoration-thickness', 'text-shadow',
  'color', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat', 'background-clip',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius', 'box-shadow',
  'opacity', 'visibility', 'object-fit', 'object-position', 'aspect-ratio',
  'transform', 'transform-origin', 'translate', 'rotate', 'scale',
  'clip', 'clip-path', 'filter', 'list-style-type', 'list-style-position',
  '-webkit-line-clamp', '-webkit-box-orient', '-webkit-text-fill-color',
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
  'pointer-events', 'direction', 'writing-mode',
];

function isGenericGoogleLayoutSourceV647(root) {
  try {
    const sourceURL = new URL(root.ownerDocument.URL);
    const currentURL = new URL(location.href);
    return root.isConnected && Boolean(root.ownerDocument.defaultView) &&
      /^(?:www\.)?google\.[a-z.]+$/i.test(sourceURL.hostname) &&
      /^(?:www\.)?google\.[a-z.]+$/i.test(currentURL.hostname) &&
      sourceURL.pathname === '/search' && currentURL.pathname === '/search';
  } catch {
    return false;
  }
}

function captureGenericGoogleLayoutV647(root) {
  if (!root?.querySelectorAll || !isGenericGoogleLayoutSourceV647(root)) return false;
  if (genericGoogleLayoutSourcesV647.has(root)) return true;
  const nodes = [root, ...root.querySelectorAll('*')];
  if (nodes.length > genericGoogleLayoutLimitV647) return false;
  const view = root.ownerDocument.defaultView;
  const rootRect = root.getBoundingClientRect();
  // A detached/blocked/non-rendered document cannot provide a reliable layout.
  if (rootRect.width < 100 || rootRect.height < 1) return false;
  try {
    const rectangles = new WeakMap();
    const rectangle = node => {
      if (!rectangles.has(node)) rectangles.set(node, node.getBoundingClientRect());
      return rectangles.get(node);
    };
    const mediaFrames = new WeakSet();
    const titleContainers = new WeakSet();
    for (const node of nodes) {
      if (!node.matches('h1,h2,h3,h4,[role="heading"]')) continue;
      for (let parent = node; parent; parent = parent.parentElement) {
        titleContainers.add(parent);
        if (parent === root) break;
      }
    }
    for (const node of nodes) {
      if (!node.matches('img,video,canvas,svg')) continue;
      const imageRect = rectangle(node);
      if (imageRect.width < 48 || imageRect.height < 38) continue;
      mediaFrames.add(node);
      // Preserve the thumbnail's box and its overlay containing block. Do not
      // freeze the result card or any text column to the old title's height.
      let parent = node.parentElement;
      for (let depth = 0; parent && parent !== root && depth < 4; depth++, parent = parent.parentElement) {
        if (parent.querySelector('h1,h2,h3,h4,[role="heading"]')) break;
        const frameRect = rectangle(parent);
        if (Math.abs(frameRect.width - imageRect.width) > 12 ||
            Math.abs(frameRect.height - imageRect.height) > 12) break;
        mediaFrames.add(parent);
      }
    }
    const styles = nodes.map(node => {
      if (node.matches('script,style,link,meta,template')) return null;
      const computed = view.getComputedStyle(node);
      const values = [];
      for (const property of genericGoogleLayoutPropertiesV647) {
        const value = computed.getPropertyValue(property);
        if (value) values.push([property, value]);
      }
      const positioned = /^(?:absolute|fixed)$/.test(computed.position);
      const media = mediaFrames.has(node) || node.matches('img,video,canvas,svg');
      // Computed width/height are used pixels even when the author's rule was
      // auto. Copying those pixels onto text prevents wrapping when a restored
      // YouTube title grows. Keep fixed dimensions only for media and overlays.
      values.push(['width', positioned || media ? computed.width : 'auto']);
      values.push(['height', positioned || media ? computed.height : 'auto']);
      if (!positioned && !media) {
        values.push(['min-height', '0']);
        const clamped = Number.parseInt(computed.getPropertyValue('-webkit-line-clamp'), 10) > 0;
        if (titleContainers.has(node) && !clamped) values.push(['max-height', 'none']);
        if (/^(?:inline-)?grid$/.test(computed.display) && node.textContent.trim()) {
          const rows = computed.getPropertyValue('grid-template-rows');
          const tracks = rows.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/);
          // getComputedStyle resolves even authored auto tracks into pixels.
          // Preserve track count/names but let each text row grow with a newly
          // restored title. Media-only grids keep their original dimensions.
          if (tracks.length && tracks.every(track => /^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(track))) {
            values.push(['grid-template-rows', rows.replace(/(?:\d+(?:\.\d+)?|\.\d+)px/g, 'auto')]);
          }
        }
      }
      return {
        values,
        hidden: node.hasAttribute('hidden'),
        ariaHidden: node.getAttribute('aria-hidden'),
      };
    });
    genericGoogleLayoutSourcesV647.set(root, { nodes, styles });
    return true;
  } catch {
    return false;
  }
}

function applyGenericGoogleLayoutV647(source, clone) {
  const snapshot = genericGoogleLayoutSourcesV647.get(source);
  if (!snapshot || !clone?.querySelectorAll) return false;
  const nodes = [clone, ...clone.querySelectorAll('*')];
  if (nodes.length !== snapshot.nodes.length || nodes.some((node, i) =>
    node.localName !== snapshot.nodes[i].localName ||
    node.namespaceURI !== snapshot.nodes[i].namespaceURI)) return false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i], entry = snapshot.styles[i];
    if (!entry) continue;
    for (const [property, value] of entry.values) node.style.setProperty(property, value, 'important');
    if (entry.hidden) node.setAttribute('hidden', '');
    if (entry.ariaHidden !== null) node.setAttribute('aria-hidden', entry.ariaHidden);
  }
  clone.setAttribute(genericGoogleLayoutMarkerV647, '1');
  genericGoogleLayoutClonesV647.add(clone);
  genericGoogleLayoutSourcesV647.delete(source);
  return true;
}

function getGenericGoogleLayoutRootsV647(root) {
  if (!root?.querySelectorAll) return [];
  const roots = root.hasAttribute?.(genericGoogleLayoutMarkerV647) ? [root] : [];
  roots.push(...root.querySelectorAll(`[${genericGoogleLayoutMarkerV647}="1"]`));
  return roots.filter(node => genericGoogleLayoutClonesV647.has(node));
}

function hasGenericGoogleLayoutV647(root) {
  if (!/^(?:www\.)?google\.[a-z.]+$/i.test(location.hostname) || location.pathname !== '/search') return false;
  return getGenericGoogleLayoutRootsV647(root).length > 0;
}

// Each organic result owns a source address and an external destination. Use
// that pair, not Google's choice of h3/div/ARIA heading or the page's node count,
// to find independent results. Only imported pages are ever painted below.
const genericGoogleBoundaryMarkV658 = 'data-generic-google-boundary-v658';
const genericGoogleMultipleResultsV658 = new WeakMap();

function getGenericGoogleResultRecordsV658(root, rendered = false) {
  if (!root?.querySelectorAll) return { records: [], sources: [] };
  const excluded = 'script,style,template,nav,footer,[hidden],[inert],[aria-hidden="true"],g-scrolling-carousel,g-inner-card,[role="grid"],[role="listbox"],[role="tablist"],[role="dialog"],details,g-related-question';
  const heading = 'h1,h2,h3,h4,h5,h6,[role="heading"],[aria-level]';
  const hostOf = text => {
    const match = String(text || '').trim().match(/(?:^|\s)(?:https?:\/\/)?((?:[\p{L}\p{N}-]+\.)+[a-z]{2,})(?=$|[\s/:›»])/iu);
    return match?.[1].toLowerCase().replace(/^www\./, '') || '';
  };
  const sources = [];
  for (const node of root.querySelectorAll('cite,[data-dtld],span,div')) {
    if (node.closest(excluded) || node.matches(heading)) continue;
    const explicit = node.matches('cite,[data-dtld]');
    if (!explicit && node.childElementCount !== 0) continue;
    const text = (node.getAttribute('data-dtld') || node.textContent || '').trim();
    if (!text || text.length > 220 || node.querySelector(heading)) continue;
    const host = hostOf(text);
    if (host) {
      if (rendered && (!node.getClientRects().length || root.ownerDocument.defaultView.getComputedStyle(node).visibility !== 'visible')) continue;
      sources.push({ node, host, explicitURL: /^(?:https?:\/\/|www\.)/i.test(text) });
    }
  }
  // URL text is often nested in several spans. One source identity must not
  // become several results, nor prevent a result's wrapper from being found.
  const identities = sources.filter(source => !sources.some(other => {
    if (other === source) return false;
    const sameHost = other.host === source.host;
    // A source row can name the site by its base domain while displaying a
    // subdomain URL. Only the plain site-name label can yield to that URL; two
    // explicit URLs or separate source rows must keep their own identities.
    const siteNameForURL = !source.explicitURL && other.explicitURL && other.host.endsWith('.' + source.host);
    if (!sameHost && !siteNameForURL) return false;
    if (sameHost && source.node.contains(other.node)) return true;
    // Some sites use their domain as the site name as well as the URL. Those
    // sibling labels are one identity when they share a source-only container.
    let common = source.node.parentElement;
    for (let depth = 0; common && common !== root && depth < 3; common = common.parentElement, depth++) {
      if (common.matches('a[href],' + heading) || common.querySelector('a[href],' + heading)) break;
      if (!common.contains(other.node)) continue;
      return other.explicitURL && !source.explicitURL || other.explicitURL === source.explicitURL && Boolean(source.node.compareDocumentPosition(other.node) & 4);
    }
    return false;
  }));
  const records = [];
  const used = new Set();
  for (const anchor of root.querySelectorAll('a[href]')) {
    if (anchor.closest(excluded)) continue;
    let url;
    try {
      url = new URL(anchor.getAttribute('href'), location.href);
      if (/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') {
        url = new URL(url.searchParams.get('q') || url.searchParams.get('url') || '');
      }
    } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || /^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname)) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let title = anchor.matches(heading) ? anchor : anchor.querySelector(heading);
    if (!title) {
      // Mobile result titles can be plain text/div/span inside a link. A source
      // link alone is rejected by the source-before-title condition below.
      const candidates = [anchor, ...anchor.querySelectorAll('div,span')].filter(node => {
        const text = node.textContent.trim();
        return text.length >= 2 && text.length <= 500 && !hostOf(text) &&
          !node.closest('cite,[data-dtld]') && !node.querySelector('cite,[data-dtld]');
      });
      title = candidates[candidates.length - 1];
    }
    if (!title || title.textContent.trim().length < 2) continue;
    let source, unit = anchor;
    for (let depth = 0; unit && unit !== root && depth < 16; unit = unit.parentElement, depth++) {
      const owned = identities.filter(entry => unit.contains(entry.node) &&
        (entry.host === host || host.endsWith('.' + entry.host)) &&
        !entry.node.contains(title) && (entry.node.compareDocumentPosition(title) & 4));
      if (!owned.length) continue;
      source = owned[owned.length - 1];
      break;
    }
    // A sitelink cannot borrow the source identity already owned by the main
    // result. Same-domain results with separate source rows remain separate.
    if (!source || used.has(source.node)) continue;
    used.add(source.node);
    records.push({ source: source.node, title, anchor, identity: unit });
  }
  const counts = new WeakMap();
  // Count ALL source identities, including an unrecognized result. Promoting a
  // recognized card must never swallow a later result we failed to recognize.
  for (const { node } of identities) {
    for (let parent = node; parent && parent !== root; parent = parent.parentElement) {
      counts.set(parent, (counts.get(parent) || 0) + 1);
    }
  }
  for (const record of records) {
    let card = record.identity;
    while (card?.parentElement && card.parentElement !== root && counts.get(card.parentElement) === 1) card = card.parentElement;
    record.card = card;
  }
  return { records, sources: identities };
}

function hasGenericGoogleMultipleResultsV658(root) {
  const count = node => {
    if (!genericGoogleMultipleResultsV658.has(node)) {
      genericGoogleMultipleResultsV658.set(node, getGenericGoogleResultRecordsV658(node).records.length > 1);
    }
    return genericGoogleMultipleResultsV658.get(node);
  };
  if (count(root)) return true;
  // Also protect one child of a grouped organic block: otherwise rejecting the
  // shared wrapper merely makes the price heuristic rebuild its first child.
  for (let parent = root.parentElement, depth = 0; parent && depth < 8; parent = parent.parentElement, depth++) {
    if (parent.matches('#rso,#search,.generic-autopager-google-source-root,.generic-autopager-page')) break;
    if (parent.matches('.MjjYud,.g,[data-snhf]') && count(parent)) return true;
  }
  return false;
}

// Top-level mobile results can have transparent wrappers around one opaque
// result surface. Follow the known source/title ancestry, without scanning the
// subtree, so an already painted gutter is compared with the actual card face.
function getGenericGoogleResultSurfaceV660(record, root, rect, style) {
  const card = record.card, box = rect(card);
  const colored = color => color && color !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
  for (let node = record.title; node && node !== root; node = node.parentElement) {
    const s = style(node), r = rect(node), color = s.backgroundColor;
    const alpha = /^rgba\(/.test(color) ? Number.parseFloat(color.split(',').at(-1)) : 1;
    if (node.contains(record.source) && colored(color) && alpha === 1 &&
        s.visibility === 'visible' && Number.parseFloat(s.opacity || '1') === 1 &&
        Math.abs(r.left - box.left) <= 1 && Math.abs(r.right - box.right) <= 1 &&
        Math.abs(r.top - box.top) <= 1 && Math.abs(r.bottom - box.bottom) <= 1) {
      return { node, color, coversCard: true };
    }
    if (node === card) break;
  }
  for (let node = card; node; node = node.parentElement) {
    const color = style(node).backgroundColor;
    if (colored(color)) return { node, color, coversCard: false };
  }
  return { node: null, color: 'rgb(255, 255, 255)', coversCard: false };
}

// This additional path only paints an existing small gap between independent
// direct children of the imported root. It neither joins grouped modules nor
// changes the box model, and refuses paint whose clipping/shadow is ambiguous.
function getGenericGoogleRootGapV660(root, previous, current, rect, style, surfaces) {
  const a = rect(previous), b = rect(current), height = b.top - a.bottom;
  const reject = reason => ({ accepted: false, reason, height });
  if (previous.parentElement !== root || current.parentElement !== root) return reject('root-branches');
  if (height < 2 || height > 16) return reject('root-gap-range');
  let sibling = previous.nextElementSibling;
  for (; sibling && sibling !== current; sibling = sibling.nextElementSibling) {
    if (sibling.matches('script,style,template')) continue;
    const r = rect(sibling), s = style(sibling);
    if (r.width > 0 && r.height > 0 && s.visibility === 'visible' && Number.parseFloat(s.opacity) !== 0) return reject('root-intervening-content');
  }
  if (sibling !== current) return reject('root-branches');
  if (!surfaces.get(previous)?.coversCard || !surfaces.get(current)?.coversCard) return reject('root-surface-unconfirmed');
  const currentStyle = style(current), previousShadow = style(previous).boxShadow;
  if (currentStyle.boxShadow && currentStyle.boxShadow !== 'none' ||
      previousShadow && previousShadow !== 'none' && !previous.hasAttribute(genericGoogleBoundaryMarkV658)) return reject('root-existing-shadow');
  if (['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].some(property => Number.parseFloat(currentStyle[property]) > 0)) return reject('root-rounded-box');
  const limit = root.closest('.generic-autopager-page') || root;
  for (let node = current; node; node = node.parentElement) {
    const s = style(node), r = rect(node);
    if ([s.transform, s.clipPath, s.maskImage, s.backgroundImage].some(value => value && value !== 'none')) return reject('root-paint-complexity');
    if (node !== current) {
      const clippedY = /^(?:hidden|clip|scroll|auto)$/.test(s.overflowY);
      const clippedX = /^(?:hidden|clip|scroll|auto)$/.test(s.overflowX);
      if (clippedY && (a.bottom < r.top + (Number.parseFloat(s.borderTopWidth) || 0) - 1 || b.top > r.bottom - (Number.parseFloat(s.borderBottomWidth) || 0) + 1) ||
          clippedX && (b.left < r.left + (Number.parseFloat(s.borderLeftWidth) || 0) - 1 || b.right > r.right - (Number.parseFloat(s.borderRightWidth) || 0) + 1)) return reject('root-ancestor-clipping');
    }
    if (node === limit) break;
  }
  return { accepted: true, reason: 'root-gap-eligible', height };
}

function repairGenericGoogleResultBoundariesV658(page) {
  if (!page?.isConnected || !/^(?:www\.)?google\.[a-z.]+$/i.test(location.hostname) || location.pathname !== '/search') return;
  const root = page.querySelector('.generic-autopager-google-source-root');
  if (!root) return;
  const view = root.ownerDocument.defaultView;
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width < 120 || rootRect.width > 900) return;
  const rectangles = new WeakMap(), styles = new WeakMap();
  const rect = node => {
    if (!rectangles.has(node)) rectangles.set(node, node.getBoundingClientRect());
    return rectangles.get(node);
  };
  const style = node => {
    if (!styles.has(node)) styles.set(node, view.getComputedStyle(node));
    return styles.get(node);
  };
  const colored = color => color && color !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
  const visible = node => node && rect(node).width > 0 && rect(node).height > 0 &&
    style(node).visibility === 'visible' && Number.parseFloat(style(node).opacity) !== 0;
  const background = node => {
    for (let n = node; n; n = n.parentElement) if (colored(style(n).backgroundColor)) return style(n).backgroundColor;
    return 'rgb(255, 255, 255)';
  };
  const records = getGenericGoogleResultRecordsV658(root, true).records.filter(record =>
    record.card && record.card !== record.anchor && visible(record.card) && visible(record.title) && visible(record.source) &&
    rect(record.card).width >= rootRect.width * 0.75);
  const cards = records.map(record => record.card), surfaces = new WeakMap();
  for (const record of records) surfaces.set(record.card, getGenericGoogleResultSurfaceV660(record, root, rect, style));
  if (cards.length < 2) return;
  const surface = surfaces.get(cards[0]).color;
  const bands = [];
  const inspected = new Set();
  const addBand = (top, bottom, left, right, color) => {
    const height = bottom - top;
    if (height >= 1 && height <= 16 && right - left >= rootRect.width * 0.75 && colored(color) && color !== surface) {
      bands.push({ top, bottom, left, right, height, color });
    }
  };
  const inspect = node => {
    if (!node || node === root || inspected.has(node) || node.matches('script,style,template')) return;
    inspected.add(node);
    if (!visible(node)) return;
    const r = rect(node), s = style(node);
    if (r.width < rootRect.width * 0.75) return;
    for (const edge of ['top', 'bottom']) {
      const size = Number.parseFloat(s.getPropertyValue(`border-${edge}-width`)) || 0;
      if (!/^(?:none|hidden)$/.test(s.getPropertyValue(`border-${edge}-style`))) {
        addBand(edge === 'top' ? r.top : r.bottom - size, edge === 'top' ? r.top + size : r.bottom, r.left, r.right, s.getPropertyValue(`border-${edge}-color`));
      }
    }
    if (!node.textContent.trim()) addBand(r.top, r.bottom, r.left, r.right, s.backgroundColor);
    for (const pseudo of ['::before', '::after']) {
      const p = view.getComputedStyle(node, pseudo);
      if (!/^(?:"\s*"|'\s*')$/.test(p.content) || p.display === 'none' || p.visibility !== 'visible' || Number.parseFloat(p.opacity) === 0) continue;
      const px = property => Number.parseFloat(p.getPropertyValue(property)) || 0;
      const height = Math.max(px('height'), px('min-height')) + (p.boxSizing === 'border-box' ? 0 : px('border-top-width') + px('border-bottom-width') + px('padding-top') + px('padding-bottom'));
      if (height < 1 || height > 16) continue;
      const width = /px$/.test(p.width) ? px('width') : r.width;
      const absolute = /^(?:absolute|fixed)$/.test(p.position);
      const left = r.left + (absolute ? px('left') : Number.parseFloat(s.paddingLeft) || 0) + px('margin-left');
      const top = absolute ? (p.top !== 'auto' ? r.top + px('top') : r.bottom - px('bottom') - height) :
        pseudo === '::before' ? r.top + (Number.parseFloat(s.borderTopWidth) || 0) + (Number.parseFloat(s.paddingTop) || 0) :
          r.bottom - (Number.parseFloat(s.borderBottomWidth) || 0) - (Number.parseFloat(s.paddingBottom) || 0) - height;
      if (colored(p.backgroundColor)) addBand(top, top + height, left, left + width, p.backgroundColor);
      else {
        addBand(top, top + px('border-top-width'), left, left + width, p.borderTopColor);
        addBand(top + height - px('border-bottom-width'), top + height, left, left + width, p.borderBottomColor);
      }
    }
  };
  // Only inspect result edges and adjacent decorative siblings. A large hidden
  // subtree cannot disable the repair or trigger a whole-page style walk.
  for (const card of cards) {
    if (surfaces.get(card).coversCard) inspect(surfaces.get(card).node);
    for (let node = card; node && node !== root; node = node.parentElement) {
      inspect(node); inspect(node.previousElementSibling); inspect(node.nextElementSibling);
    }
    for (const edge of ['firstElementChild', 'lastElementChild']) {
      let node = card;
      for (let depth = 0; node && depth < 6; depth++, node = node[edge]) inspect(node);
    }
  }
  const native = bands.find(band => band.height >= 4 && band.height <= 12) || bands[0];
  const rgb = surface.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
  const color = native?.color || (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 < 128 ? 'rgb(60, 64, 67)' : 'rgb(232, 234, 237)');
  const height = native?.height || 6;
  const missing = [];
  for (let i = 1; i < cards.length; i++) {
    const previous = cards[i - 1], current = cards[i];
    if (current.hasAttribute(genericGoogleBoundaryMarkV658)) continue;
    const a = rect(previous), b = rect(current);
    if (a.bottom > b.top + 1 || b.top - a.bottom > 120 || Math.abs(a.left - b.left) > 12 || Math.abs(a.right - b.right) > 12) continue;
    let common = previous.parentElement;
    while (common && !common.contains(current)) common = common.parentElement;
    if (!common) continue;
    const rootGap = common === root ? getGenericGoogleRootGapV660(root, previous, current, rect, style, surfaces) : null;
    if (rootGap && !rootGap.accepted) continue;
    const exists = bands.some(band => band.left <= Math.max(a.left, b.left) + 8 && band.right >= Math.min(a.right, b.right) - 8 &&
      band.top >= a.bottom - 24 && band.bottom <= b.top + 24);
    if (exists) continue;
    const previousSurface = rootGap ? surfaces.get(previous).color : background(previous);
    const currentSurface = rootGap ? surfaces.get(current).color : background(current);
    if (b.top - a.bottom >= 2 && background(common) !== previousSurface && background(common) !== currentSurface) continue;
    // A border belongs to the existing result box, so no empty synthetic node
    // can be removed by Google cleanup and no repeated pass can append a copy.
    const currentStyle = style(current);
    if ((Number.parseFloat(currentStyle.borderTopWidth) || 0) > 0 && colored(currentStyle.borderTopColor) && currentStyle.borderTopColor !== surface) continue;
    missing.push({ current, rootGap });
  }
  for (const { current, rootGap } of missing) {
    // An outer, zero-blur shadow is clipped inside the border box. Its only
    // visible portion fills this existing gap; margins and heights stay intact.
    if (rootGap) current.style.setProperty('box-shadow', `0px -${rootGap.height}px 0px 0px ${color}`, 'important');
    else current.style.setProperty('border-top', `${height}px solid ${color}`, 'important');
    current.setAttribute(genericGoogleBoundaryMarkV658, '1');
  }
}
