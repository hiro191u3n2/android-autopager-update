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
  const empty = node.childElementCount === 0 && !node.textContent.trim() &&
    !node.matches('input,textarea,select,button,iframe,object,embed,img,video,canvas,svg');
  const rect = rectangle(node);
  const preserveHeight = empty && rect.width >= 120 && rect.height > 0 && rect.height <= 24 &&
    rect.width >= rect.height * 5 && isGenericGoogleSeparatorPaintV654(computed);
  const pseudos = [];
  // Only paint a source divider, never synthesize result boundaries from titles.
  // This also preserves grouped results without splitting sitelinks/carousels.
  if (rect.width >= 120 && computed.display !== 'none' && computed.visibility === 'visible') {
    for (const pseudo of ['::before', '::after']) {
      const style = view.getComputedStyle(node, pseudo);
      if (!/^(?:""|'')$/.test(style.content) || !isGenericGoogleSeparatorPaintV654(style)) continue;
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
      // YouTube title grows. Keep fixed dimensions only for media and overlays.
      values.push(['width', positioned || media ? computed.width : 'auto']);
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
