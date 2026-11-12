// Google loads result-specific CSS in each fetched document. Preserve the
// rendered source layout when importing its nodes instead of guessing which
// price, article, or video template Google returned. This runs only once per
// imported page; there are no scroll listeners, timers, or document observers.
const genericGoogleLayoutSourcesV647 = new WeakMap();
const genericGoogleLayoutClonesV647 = new WeakSet();
const genericGoogleLayoutMarkerV647 = 'data-generic-google-layout-v647';
const genericGoogleLayoutLimitV647 = 5000;
const genericGoogleSeparatorMarkerV654 = 'data-generic-google-separator-v654';
let genericGoogleSeparatorSequenceV654 = 0;
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

function isGenericGoogleSeparatorPaintV654(style) {
  const visibleColor = value => Boolean(value) && value !== 'transparent' &&
    !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(value);
  if (style.display === 'none' || /^(?:hidden|collapse)$/.test(style.visibility) ||
      Number.parseFloat(style.opacity) === 0) return false;
  if (visibleColor(style.backgroundColor) || style.backgroundImage !== 'none' && style.backgroundImage) return true;
  return ['top', 'bottom'].some(edge =>
    Number.parseFloat(style.getPropertyValue(`border-${edge}-width`)) > 0 &&
    !/^(?:none|hidden)$/.test(style.getPropertyValue(`border-${edge}-style`)) &&
    visibleColor(style.getPropertyValue(`border-${edge}-color`)));
}

function captureGenericGoogleSeparatorsV654(node, computed, rectangle, view) {
  const rect = rectangle(node);
  // Decorative strips can contain empty wrappers (or tracking/style nodes).
  // Requiring a leaf collapses the painted parent's height on import even
  // though none of its descendants contributes any content to that height.
  // Keep the geometry/paint guard and exclude controls and media at any depth.
  const meaningful = 'a[href],input,textarea,select,button,iframe,object,embed,img,video,audio,canvas,svg,h1,h2,h3,h4,h5,h6,[role="heading"],[role="button"],[role="link"],[role="img"],[contenteditable]:not([contenteditable="false"]),[tabindex]';
  const preserveHeight = rect.width >= 120 && rect.height > 0 && rect.height <= 24 &&
    rect.width >= rect.height * 5 && isGenericGoogleSeparatorPaintV654(computed) &&
    !node.textContent.trim() && !node.matches(meaningful) && !node.querySelector(meaningful);
  const pseudos = [];
  // Only paint a source divider, never synthesize result boundaries from titles.
  // This also preserves grouped results without splitting sitelinks/carousels.
  if (rect.width >= 120 && computed.display !== 'none' && computed.visibility === 'visible') {
    for (const pseudo of ['::before', '::after']) {
      const style = view.getComputedStyle(node, pseudo);
      // A quoted whitespace string also generates an otherwise empty box.
      // Keep text/icon content excluded; do not copy arbitrary pseudo labels.
      if (!/^(?:"\s*"|'\s*')$/.test(style.content) || !isGenericGoogleSeparatorPaintV654(style)) continue;
      const pixels = property => Number.parseFloat(style.getPropertyValue(property)) || 0;
      const border = pixels('border-top-width') + pixels('border-bottom-width');
      const padding = pixels('padding-top') + pixels('padding-bottom');
      const contentHeight = Math.max(pixels('height'), pixels('min-height'));
      const height = style.boxSizing === 'border-box' ? Math.max(contentHeight, border + padding) : contentHeight + border + padding;
      const width = /px$/.test(style.width) ? pixels('width') :
        /^(?:block|flex|grid|flow-root)$/.test(style.display) || /^(?:absolute|fixed)$/.test(style.position) ?
          rect.width - (Number.parseFloat(computed.paddingLeft) || 0) - (Number.parseFloat(computed.paddingRight) || 0) : 0;
      if (height <= 0 || height > 24 || width < 120 || width < rect.width * 0.75) continue;
      const values = genericGoogleLayoutPropertiesV647.map(property => [property, style.getPropertyValue(property)]).filter(([, value]) => value);
      values.push(['content', style.content], ['width', style.width], ['height', style.height]);
      if (/^(?:absolute|fixed)$/.test(style.position)) {
        // CSSOM resolves an auto inset into the old pixel position. Restore the
        // nearby edge anchor so a divider follows a growing YouTube title.
        const top = Number.parseFloat(style.top), bottom = Number.parseFloat(style.bottom);
        if (Math.abs(bottom) <= 24 && Math.abs(top) > 24) values.push(['top', 'auto']);
        else if (Math.abs(top) <= 24 && Math.abs(bottom) > 24) values.push(['bottom', 'auto']);
      }
      pseudos.push({ pseudo, values });
    }
  }
  return { preserveHeight, pseudos };
}

function applyGenericGoogleSeparatorsV654(nodes, styles) {
  const document = nodes[0].ownerDocument;
  const rules = [];
  for (let i = 0; i < nodes.length; i++) {
    const pseudos = styles[i]?.separators;
    if (!pseudos?.length) continue;
    const token = String(++genericGoogleSeparatorSequenceV654);
    nodes[i].setAttribute(genericGoogleSeparatorMarkerV654, token);
    for (const { pseudo, values } of pseudos) {
      const declaration = document.createElement('span').style;
      for (const [property, value] of values) declaration.setProperty(property, value, 'important');
      // Scope to this imported node; same-class rules on page one remain intact.
      rules.push(`[${genericGoogleSeparatorMarkerV654}="${token}"]${pseudo}{${declaration.cssText}}`);
    }
  }
  if (!rules.length) return;
  const sheet = document.createElement('style');
  sheet.setAttribute('data-generic-google-separators-v654', '');
  sheet.textContent = rules.join('\n');
  // Import cleanup removes style tags from result subtrees. Keep the strictly
  // scoped rules in the document head so subsequent result cleanup retains them.
  (document.head || document.documentElement).appendChild(sheet);
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
      const separators = captureGenericGoogleSeparatorsV654(node, computed, rectangle, view);
      // Computed width/height are used pixels even when the author's rule was
      // auto. Copying those pixels onto text prevents wrapping when a restored
      // YouTube title grows. Keep dimensions for media, overlays and empty
      // dividers; an inline-block divider would otherwise shrink to zero width.
      values.push(['width', positioned || media || separators.preserveHeight ? computed.width : 'auto']);
      values.push(['height', positioned || media || separators.preserveHeight ? computed.height : 'auto']);
      if (!positioned && !media) {
        if (!separators.preserveHeight) values.push(['min-height', '0']);
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
        separators: separators.pseudos,
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
  applyGenericGoogleSeparatorsV654(nodes, snapshot.styles);
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

// Importing the source paint is not sufficient: Google can put several organic
// results inside one group with only a group-level divider. Identify independent
// results after insertion and fill only their missing vertical boundaries.
// Called by the existing three import-layout passes, never on input or scroll.
function normalizeGenericGoogleResultBoundariesV656(page) {
  if (!page?.isConnected || !/^(?:www\.)?google\.[a-z.]+$/i.test(location.hostname) ||
      location.pathname !== '/search') return;
  const root = page.querySelector('.generic-autopager-google-source-root');
  if (!root) return;
  const view = root.ownerDocument.defaultView;
  const nodes = [root, ...root.querySelectorAll('*')];
  if (nodes.length > 6500) return;
  const rects = new WeakMap(), styles = new WeakMap();
  const rect = node => {
    if (!rects.has(node)) rects.set(node, node.getBoundingClientRect());
    return rects.get(node);
  };
  const style = node => {
    if (!styles.has(node)) styles.set(node, view.getComputedStyle(node));
    return styles.get(node);
  };
  const painted = color => color && color !== 'transparent' &&
    !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
  const visible = node => rect(node).width > 0 && rect(node).height > 0 &&
    !node.closest('[hidden],[inert]') &&
    style(node).visibility === 'visible' && Number.parseFloat(style(node).opacity) !== 0;
  const background = node => {
    for (let n = node; n; n = n.parentElement) {
      if (painted(style(n).backgroundColor)) return style(n).backgroundColor;
    }
    return 'rgb(255, 255, 255)';
  };
  const external = anchor => {
    try {
      let url = new URL(anchor?.getAttribute('href') || '', location.href);
      if (/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') {
        url = new URL(url.searchParams.get('q') || url.searchParams.get('url') || '');
      }
      return /^https?:$/.test(url.protocol) && !/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname);
    } catch { return false; }
  };
  const headingSelector = 'h3,[role="heading"][aria-level="3"],[role="heading"]:not([aria-level])';
  const excluded = 'g-scrolling-carousel,g-inner-card,[role="grid"],[role="listbox"],[role="tablist"],details,[role="dialog"],g-related-question';
  const headings = [...root.querySelectorAll(headingSelector)].filter(node =>
    !node.parentElement?.closest(headingSelector) && !node.closest(excluded) &&
    node.textContent.trim().length >= 2 && visible(node) &&
    external(node.closest('a[href]') || node.querySelector('a[href]')));
  if (headings.length < 2 || headings.length > 100) return;
  // Source identity must be separate from, and precede, the title. A sitelink
  // cannot borrow its parent's identity because the parent's main title is first.
  const sources = nodes.filter(node => {
    if (node.matches('script,style,template,svg,img') || node.closest(headingSelector) || node.querySelector(headingSelector)) return false;
    const text = node.textContent.trim();
    if (!text || text.length > 220) return false;
    const identity = node.matches('cite,[data-dtld],.VuuXrf') ||
      /^(?:https?:\/\/|www\.|(?:[\p{L}\p{N}-]+\.)+[a-z]{2,}(?:\b|\/))/iu.test(text);
    return identity && visible(node);
  });
  const primaries = [];
  for (const heading of headings) {
    const h = rect(heading);
    for (let unit = heading.parentElement, depth = 0; unit && unit !== root && depth < 14; unit = unit.parentElement, depth++) {
      const ownSources = sources.filter(source => unit.contains(source) &&
        (source.compareDocumentPosition(heading) & 4) &&
        rect(source).top <= h.top + 2 && rect(source).bottom >= h.top - 180);
      if (!ownSources.length) continue;
      if (headings.find(other => unit.contains(other)) === heading) primaries.push({ heading, identity: unit });
      break;
    }
  }
  // CSS-only horizontal rows need the same protection as named carousels.
  const horizontal = new Set();
  for (let i = 0; i < primaries.length; i++) {
    const a = rect(primaries[i].identity);
    for (let j = i + 1; j < primaries.length; j++) {
      const b = rect(primaries[j].identity);
      if (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) * 0.5 &&
          Math.abs(a.left - b.left) > Math.min(a.width, b.width) * 0.5) {
        horizontal.add(primaries[i]); horizontal.add(primaries[j]);
      }
    }
    for (let n = primaries[i].identity; n && n !== root; n = n.parentElement) {
      if (/^(?:auto|scroll)$/.test(style(n).overflowX) && n.scrollWidth > n.clientWidth + 8) horizontal.add(primaries[i]);
    }
  }
  const standalone = primaries.filter(entry => !horizontal.has(entry));
  const counts = new WeakMap();
  for (const { heading } of standalone) {
    for (let n = heading; n && n !== root; n = n.parentElement) counts.set(n, (counts.get(n) || 0) + 1);
  }
  const cards = standalone.map(({ identity }) => {
    let card = identity;
    while (card.parentElement && card.parentElement !== root && counts.get(card.parentElement) === 1) card = card.parentElement;
    return card;
  }).filter((card, index, list) => list.indexOf(card) === index && visible(card));
  if (cards.length < 2) return;
  const contentBounds = new WeakMap();
  for (const card of cards) {
    let top = Infinity, bottom = -Infinity;
    for (const node of [card, ...card.querySelectorAll('*')]) {
      if (node.matches('script,style,template')) continue;
      const text = [...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim());
      const controlOrMedia = node.matches('img,svg,video,canvas,iframe,input,button,[role="button"]');
      if (!(text || controlOrMedia) || !visible(node)) continue;
      top = Math.min(top, rect(node).top);
      bottom = Math.max(bottom, rect(node).bottom);
    }
    contentBounds.set(card, { top: Number.isFinite(top) ? top : rect(card).top,
      bottom: Number.isFinite(bottom) ? bottom : rect(card).bottom });
  }
  const rootWidth = rect(root).width;
  const surface = background(cards[0]);
  const bands = [];
  const addBand = (node, top, bottom, left, right, color) => {
    const height = bottom - top;
    if (height >= 1 && height <= 20 && right - left >= rootWidth * 0.65 &&
        painted(color) && color !== surface) bands.push({ node, top, bottom, left, right, color, height });
  };
  for (const node of nodes) {
    if (node.matches('script,style,template,svg,img')) continue;
    const r = rect(node);
    if (r.width < rootWidth * 0.65 || r.height < 0 || style(node).visibility !== 'visible' ||
        Number.parseFloat(style(node).opacity) === 0) continue;
    const s = style(node);
    for (const edge of ['top', 'bottom']) {
      const size = Number.parseFloat(s.getPropertyValue(`border-${edge}-width`)) || 0;
      if (!/^(?:none|hidden)$/.test(s.getPropertyValue(`border-${edge}-style`))) {
        addBand(node, edge === 'top' ? r.top : r.bottom - size, edge === 'top' ? r.top + size : r.bottom,
          r.left, r.right, s.getPropertyValue(`border-${edge}-color`));
      }
    }
    if (!node.textContent.trim()) addBand(node, r.top, r.bottom, r.left, r.right, s.backgroundColor);
    for (const pseudo of ['::before', '::after']) {
      const p = view.getComputedStyle(node, pseudo);
      if (!/^(?:"\s*"|'\s*')$/.test(p.content) || p.display === 'none' || p.visibility !== 'visible' || Number.parseFloat(p.opacity) === 0) continue;
      const px = name => Number.parseFloat(p.getPropertyValue(name)) || 0;
      const border = px('border-top-width') + px('border-bottom-width');
      const padding = px('padding-top') + px('padding-bottom');
      const content = Math.max(px('height'), px('min-height'));
      const height = p.boxSizing === 'border-box' ? Math.max(content, border + padding) : content + border + padding;
      if (height < 1 || height > 20) continue;
      const absolute = /^(?:absolute|fixed)$/.test(p.position);
      const width = /px$/.test(p.width) ? px('width') : r.width;
      const left = r.left + (absolute ? px('left') : Number.parseFloat(s.paddingLeft) || 0) + px('margin-left');
      let top;
      if (absolute) top = p.top !== 'auto' ? r.top + px('top') : r.bottom - px('bottom') - height;
      else top = pseudo === '::before' ? r.top + (Number.parseFloat(s.borderTopWidth) || 0) + (Number.parseFloat(s.paddingTop) || 0) + px('margin-top') :
        r.bottom - (Number.parseFloat(s.borderBottomWidth) || 0) - (Number.parseFloat(s.paddingBottom) || 0) - px('margin-bottom') - height;
      if (painted(p.backgroundColor) && p.backgroundColor !== surface) addBand(node, top, top + height, left, left + width, p.backgroundColor);
      else {
        if (px('border-top-width')) addBand(node, top, top + px('border-top-width'), left, left + width, p.borderTopColor);
        if (px('border-bottom-width')) addBand(node, top + height - px('border-bottom-width'), top + height, left, left + width, p.borderBottomColor);
      }
    }
  }
  const native = bands.find(band => band.height >= 4 && band.height <= 12) || bands[0];
  const rgb = surface.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
  const fallbackColor = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 128 ? 'rgb(48, 49, 52)' : 'rgb(232, 234, 237)';
  const color = native?.color || fallbackColor;
  const height = native?.height || 6;
  const missing = [];
  for (let i = 1; i < cards.length; i++) {
    const previous = cards[i - 1], current = cards[i];
    const a = rect(previous), b = rect(current);
    if (Math.min(a.width, b.width) < rootWidth * 0.65 || Math.abs(a.left - b.left) > 24 ||
        b.top < a.bottom - 2 || b.top - a.bottom > 180) continue;
    const overlapLeft = Math.max(a.left, b.left), overlapRight = Math.min(a.right, b.right);
    const exists = bands.some(band => {
      if (band.right - band.left < (overlapRight - overlapLeft) * 0.85 ||
          band.left > overlapLeft + 12 || band.right < overlapRight - 12) return false;
      // A group's bottom border is not an internal result boundary. A native
      // inner divider can precede trailing outer-wrapper padding, though: use
      // actual content edges as well as wrapper edges to avoid doubling it.
      return Math.abs(band.bottom - a.bottom) <= 1 || Math.abs(band.top - b.top) <= 1 ||
        band.top >= contentBounds.get(previous).bottom - 1 && band.bottom <= contentBounds.get(current).top + 1;
    });
    if (exists) continue;
    let common = previous.parentElement;
    while (common && !common.contains(current)) common = common.parentElement;
    // Native gray gutters can be the common parent's background, not a node.
    if (b.top - a.bottom >= 2 && common && background(common) !== background(previous) &&
        background(common) !== background(current)) continue;
    missing.push(current);
  }
  // Plan against one layout snapshot, then insert backwards so an earlier band
  // cannot invalidate the geometry of the remaining pairs in this pass.
  for (const current of missing.reverse()) {
    const divider = root.ownerDocument.createElement('div');
    divider.setAttribute('data-generic-google-boundary-v656', '1');
    divider.setAttribute('aria-hidden', 'true');
    const parentStyle = style(current.parentElement);
    const declarations = {
      display: 'block', position: 'static', float: 'none', clear: 'both',
      'box-sizing': 'border-box', width: 'auto', height: `${height}px`,
      'min-height': `${height}px`, 'max-height': `${height}px`,
      'margin-top': '0', 'margin-bottom': '0',
      'margin-left': `${-(Number.parseFloat(parentStyle.paddingLeft) || 0)}px`,
      'margin-right': `${-(Number.parseFloat(parentStyle.paddingRight) || 0)}px`,
      padding: '0', border: '0', 'border-radius': '0', background: color,
      'box-shadow': 'none', flex: 'none', 'align-self': 'stretch',
      visibility: 'visible', opacity: '1', 'pointer-events': 'none',
    };
    for (const [name, value] of Object.entries(declarations)) divider.style.setProperty(name, value, 'important');
    current.before(divider);
  }
}
