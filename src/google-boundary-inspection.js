// On-demand, read-only evidence for the current boundary classifier.
// No observer, timer, network request, DOM/style write, or automatic inspection.
function inspectGenericGoogleResultBoundariesV659(page) {
  const MAX_BYTES = 140000;
  const MAX_STRUCTURE = 400;
  const MAX_DESCRIPTORS = 160;
  const HEADING = 'h1,h2,h3,h4,h5,h6,[role="heading"],[aria-level]';
  const EXCLUDED = 'script,style,template,nav,footer,[hidden],[inert],[aria-hidden="true"],g-scrolling-carousel,g-inner-card,[role="grid"],[role="listbox"],[role="tablist"],[role="dialog"],details,g-related-question';
  // A semantic header inside an appended result can be its source-address row.
  // Initial-page fallbacks still exclude page/account headers entirely.
  const PRIVATE = 'script,style,template,noscript,iframe,object,embed,input,textarea,select,option,button,form,nav,footer,[role="dialog"],[role="menu"],[role="listbox"],[contenteditable]' + (page?.matches?.('.generic-autopager-page') ? '' : ',header');
  const report = {
    schema: 'google-boundary-inspection/v659', status: 'ok',
    scope: { pageNumber: null, initialPage: true, viewport: null, rootId: null },
    counts: { sources: 0, records: 0, acceptedCards: 0, pairs: 0, repairMarkers: 0 },
    nodes: {}, records: [], pairs: [], edges: [], bands: [],
    nearby: { anchors: [], sources: [], structure: [] },
    limits: { maxBytes: MAX_BYTES, maxStructureNodes: MAX_STRUCTURE, truncated: [] },
  };
  const truncate = code => { if (!report.limits.truncated.includes(code)) report.limits.truncated.push(code); };
  const short = (value, limit = 100) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  const safeURL = (value, base) => {
    try {
      const url = new URL(value, base);
      return /^https?:$/.test(url.protocol) ? (url.origin + url.pathname).slice(0, 220) : '';
    } catch { return ''; }
  };
  const safeText = (value, limit = 100) => short(String(value || '')
    .replace(/(?:data:|blob:)[^\s<>"']*/gi, '[encoded]')
    .replace(/https?:\/\/[^\s<>"']+/gi, url => safeURL(url))
    .replace(/[?#][^\s<>"']*/g, '')
    .replace(/[A-Za-z0-9+/=_-]{80,}/g, '[encoded]'), limit);
  const byteLength = value => {
    const json = JSON.stringify(value);
    return typeof TextEncoder === 'function' ? new TextEncoder().encode(json).length : json.length * 3;
  };
  const finish = () => {
    if (byteLength(report) > MAX_BYTES - 256) {
      truncate('report-size');
      while (report.nearby.structure.length > 30 && byteLength(report) > MAX_BYTES - 256) report.nearby.structure.splice(-20);
      if (byteLength(report) > MAX_BYTES - 256) {
        report.edges = report.edges.slice(0, 8);
        report.bands = report.bands.slice(0, 20);
        for (const node of Object.values(report.nodes)) {
          if (node.style) node.style = { display: node.style.display, visibility: node.style.visibility, opacity: node.style.opacity, background: node.style.background, borderTop: node.style.borderTop, borderBottom: node.style.borderBottom };
          node.path = short(node.path, 90);
        }
      }
      if (byteLength(report) > MAX_BYTES - 256) {
        report.nearby.structure = [];
        report.edges = [];
        report.records = report.records.slice(0, 12);
        report.pairs = report.pairs.slice(0, 12);
      }
      if (byteLength(report) > MAX_BYTES - 256) {
        for (const node of Object.values(report.nodes)) {
          delete node.style; delete node.path;
          node.classes = node.classes.slice(0, 2).map(value => short(value, 30));
        }
        report.nearby.anchors = report.nearby.anchors.slice(0, 12);
        report.nearby.sources = report.nearby.sources.slice(0, 20);
        report.bands = report.bands.slice(0, 32);
      }
      // A hostile/unusually verbose class list must never exceed the export
      // budget. Missing descriptors are explicitly signalled as truncation.
      const keys = Object.keys(report.nodes);
      while (keys.length && byteLength(report) > MAX_BYTES - 256) delete report.nodes[keys.pop()];
    }
    report.limits.reportBytes = byteLength(report);
    // Account for the reportBytes field itself; the size guard leaves headroom.
    report.limits.reportBytes = byteLength(report);
    return report;
  };
  try {
    if (!page?.querySelectorAll || !page.ownerDocument?.defaultView) {
      report.status = 'page-unavailable';
      return finish();
    }
    const document = page.ownerDocument, view = document.defaultView;
    const root = page.querySelector('.generic-autopager-google-source-root');
    const scope = root || page;
    const number = Number(page.getAttribute('data-page'));
    report.scope.pageNumber = Number.isFinite(number) && number > 0 ? number : null;
    report.scope.initialPage = !page.matches('.generic-autopager-page');
    report.scope.viewport = { width: view.innerWidth, height: view.innerHeight, devicePixelRatio: view.devicePixelRatio || 1 };
    report.scope.route = safeURL(view.location.href);
    report.scope.source = safeURL(page.getAttribute('data-source-url') || '', view.location.href);
    report.scope.routeEligible = /^(?:www\.)?google\.[a-z.]+$/i.test(view.location.hostname) && view.location.pathname === '/search';
    const ids = new WeakMap(), rectangles = new WeakMap(), styles = new WeakMap();
    let nextId = 1, descriptorCount = 0;
    const id = node => {
      if (!node) return null;
      if (!ids.has(node)) ids.set(node, 'n' + nextId++);
      return ids.get(node);
    };
    const rect = node => {
      if (!rectangles.has(node)) rectangles.set(node, node.getBoundingClientRect());
      return rectangles.get(node);
    };
    const rounded = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    const box = node => {
      const r = rect(node);
      return { left: rounded(r.left), top: rounded(r.top), right: rounded(r.right), bottom: rounded(r.bottom), width: rounded(r.width), height: rounded(r.height) };
    };
    const style = node => {
      if (!styles.has(node)) styles.set(node, view.getComputedStyle(node));
      return styles.get(node);
    };
    const colored = color => color && color !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
    const visible = node => Boolean(node && rect(node).width > 0 && rect(node).height > 0 && style(node).visibility === 'visible' && Number.parseFloat(style(node).opacity) !== 0);
    const background = node => {
      for (let n = node; n; n = n.parentElement) if (colored(style(n).backgroundColor)) return style(n).backgroundColor;
      return 'rgb(255, 255, 255)';
    };
    const classes = node => [...node.classList].filter(value => /^[A-Za-z_][A-Za-z0-9_-]{0,59}$/.test(value)).slice(0, 8);
    const path = node => {
      const parts = [];
      for (let current = node, depth = 0; current && depth < 9; current = current.parentElement, depth++) {
        let index = 1;
        for (let sibling = current.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (sibling.localName === current.localName) index++;
        parts.unshift(current.localName + ':nth-of-type(' + index + ')');
        if (current === scope) break;
      }
      return parts.join('>').slice(-260);
    };
    const basic = node => ({
      id: id(node), tag: node.localName, classes: classes(node),
      role: short(node.getAttribute('role'), 35), ariaHidden: short(node.getAttribute('aria-hidden'), 8),
      ariaLevel: short(node.getAttribute('aria-level'), 8), hidden: node.hasAttribute('hidden'),
      inert: node.hasAttribute('inert'), childElements: node.childElementCount,
      hasHref: node.hasAttribute('href'), hasDataHref: node.hasAttribute('data-href'), hasDataDtld: node.hasAttribute('data-dtld'),
    });
    const describe = node => {
      if (!node) return null;
      const key = id(node);
      if (!report.nodes[key]) {
        if (descriptorCount >= MAX_DESCRIPTORS) { truncate('node-descriptors'); return key; }
        descriptorCount++;
        const s = style(node);
        report.nodes[key] = {
          ...basic(node), path: path(node), rect: box(node), clientRects: node.getClientRects().length,
          style: {
            display: short(s.display, 24), visibility: short(s.visibility, 16), opacity: short(s.opacity, 12),
            position: short(s.position, 20), boxSizing: short(s.boxSizing, 20), background: short(s.backgroundColor, 55),
            boxShadow: short(s.boxShadow, 150),
            borderTop: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor].map(value => short(value, 55)),
            borderBottom: [s.borderBottomWidth, s.borderBottomStyle, s.borderBottomColor].map(value => short(value, 55)),
            overflow: [s.overflowX, s.overflowY].map(value => short(value, 16)),
            padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(value => short(value, 20)),
            margin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].map(value => short(value, 20)),
          },
        };
      }
      return key;
    };
    const distance = node => {
      const r = rect(node), height = view.innerHeight;
      if (r.bottom >= 0 && r.top <= height) return 0;
      return r.top > height ? r.top - height : -r.bottom;
    };
    const external = node => {
      const value = node.getAttribute('href') || node.getAttribute('data-href');
      if (!value) return null;
      try {
        let url = new URL(value, view.location.href);
        if (/^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname) && url.pathname === '/url') url = new URL(url.searchParams.get('q') || url.searchParams.get('url') || '');
        if (!/^https?:$/.test(url.protocol) || /^(?:www\.)?google\.[a-z.]+$/i.test(url.hostname)) return null;
        return { host: url.hostname.toLowerCase().replace(/^www\./, ''), url: safeURL(url.href) };
      } catch { return null; }
    };
    const textOf = (node, limit = 600) => {
      if (!node || node.closest(PRIVATE)) return '';
      const walker = document.createTreeWalker(node, 4);
      let value = '', textNode;
      while ((textNode = walker.nextNode()) && value.length < limit) {
        if (!textNode.parentElement?.closest(PRIVATE)) value += textNode.nodeValue || '';
      }
      return value.slice(0, limit);
    };
    // A text fragment can be only the query part of a URL split across spans.
    // Redact descendants of such URL rows instead of exporting fragment tokens.
    const snippet = node => {
      if (node.closest(PRIVATE)) return '';
      for (let parent = node; parent && parent !== scope; parent = parent.parentElement) {
        const text = textOf(parent);
        if (text.length > 500 || parent.querySelector(HEADING)) break;
        if (/(?:https?:\/\/|www\.|[\p{L}\p{N}-]+\.[a-z]{2,})[^\s]*[?#]/iu.test(text) && parent !== node) return '[URL components redacted]';
      }
      const ownText = [...node.childNodes].filter(child => child.nodeType === 3).map(child => child.nodeValue).join(' ');
      return safeText(ownText, 90);
    };
    report.scope.rootId = root ? describe(root) : null;
    const rootRect = root ? rect(root) : null;
    report.scope.rootWidthEligible = Boolean(rootRect && rootRect.width >= 120 && rootRect.width <= 900);
    if (!root) report.status = 'root-missing';
    else if (!report.scope.routeEligible) report.status = 'route-ineligible';
    else if (!report.scope.rootWidthEligible) report.status = 'root-width-out-of-range';
    let result = { records: [], sources: [] };
    if (root) result = getGenericGoogleResultRecordsV658(root, true);
    report.counts.sources = result.sources.length;
    report.counts.records = result.records.length;
    report.counts.repairMarkers = scope.querySelectorAll('[data-generic-google-boundary-v658]').length;
    const accepted = [], surfaces = new WeakMap();
    const eligibility = record => {
      const reasons = [], card = record.card;
      if (!card) return { accepted: false, reasons: ['card-missing'] };
      if (card === record.anchor) reasons.push('card-is-anchor');
      for (const [kind, node] of [['card', card], ['title', record.title], ['source', record.source]]) {
        if (!node || rect(node).width <= 0 || rect(node).height <= 0) reasons.push(kind + '-no-box');
        if (node && style(node).display === 'contents') reasons.push(kind + '-display-contents');
        if (node && (style(node).visibility !== 'visible' || Number.parseFloat(style(node).opacity) === 0)) reasons.push(kind + '-hidden');
      }
      if (rootRect && rect(card).width < rootRect.width * 0.75) reasons.push('card-width-below-75pct');
      return { accepted: reasons.length === 0, reasons };
    };
    const sourceCounts = new WeakMap();
    for (const entry of result.sources) for (let node = entry.node; node && node !== root; node = node.parentElement) sourceCounts.set(node, (sourceCounts.get(node) || 0) + 1);
    const chosenRecords = new Set(result.records.map((record, index) => ({ record, index, distance: distance(record.title) })).sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, 24).map(entry => entry.record));
    if (result.records.length > chosenRecords.size) truncate('records');
    for (const record of result.records) {
      const decision = eligibility(record);
      if (decision.accepted) {
        accepted.push(record.card);
        surfaces.set(record.card, getGenericGoogleResultSurfaceV660(record, root, rect, style));
      }
      if (!chosenRecords.has(record)) continue;
      const promotion = [];
      for (let node = record.identity, depth = 0; node && node !== root && depth < 12; node = node.parentElement, depth++) {
        promotion.push({ nodeId: describe(node), sources: sourceCounts.get(node) || 0 });
        if (node === record.card) break;
      }
      const surface = surfaces.get(record.card);
      report.records.push({ sourceId: describe(record.source), titleId: describe(record.title), anchorId: describe(record.anchor), identityId: describe(record.identity), cardId: describe(record.card), surfaceId: surface ? describe(surface.node) : null, surfaceColor: surface?.color || null, surfaceCoversCard: Boolean(surface?.coversCard), title: safeText(textOf(record.title), 90), destination: external(record.anchor), eligibility: decision, promotion });
    }
    report.counts.acceptedCards = accepted.length;
    const bands = [], inspected = new Set();
    const surface = accepted.length ? surfaces.get(accepted[0]).color : null;
    const addBand = (node, kind, top, bottom, left, right, color) => {
      const height = bottom - top;
      if (rootRect && height >= 1 && height <= 16 && right - left >= rootRect.width * 0.75 && colored(color) && color !== surface) bands.push({ node, kind, top, bottom, left, right, height, color });
    };
    const pseudoInfo = p => ({
      contentKind: /^(?:"\s*"|'\s*')$/.test(p.content) ? 'empty-or-whitespace' : /^(?:none|normal|)$/.test(p.content) ? 'none' : 'other',
      display: short(p.display, 20), visibility: short(p.visibility, 16), opacity: short(p.opacity, 12), position: short(p.position, 20),
      width: short(p.width, 24), height: short(p.height, 24), minHeight: short(p.minHeight, 24), boxSizing: short(p.boxSizing, 20),
      top: short(p.top, 24), bottom: short(p.bottom, 24), left: short(p.left, 24),
      background: short(p.backgroundColor, 55), borderTop: [p.borderTopWidth, p.borderTopStyle, p.borderTopColor].map(v => short(v, 55)),
      borderBottom: [p.borderBottomWidth, p.borderBottomStyle, p.borderBottomColor].map(v => short(v, 55)),
    });
    const inspectEdge = node => {
      if (!node || node === root || inspected.has(node) || node.matches('script,style,template')) return;
      inspected.add(node);
      if (!visible(node)) return;
      const r = rect(node), s = style(node);
      if (r.width < rootRect.width * 0.75) return;
      for (const edge of ['top', 'bottom']) {
        const size = Number.parseFloat(s.getPropertyValue('border-' + edge + '-width')) || 0;
        if (!/^(?:none|hidden)$/.test(s.getPropertyValue('border-' + edge + '-style'))) addBand(node, 'border-' + edge, edge === 'top' ? r.top : r.bottom - size, edge === 'top' ? r.top + size : r.bottom, r.left, r.right, s.getPropertyValue('border-' + edge + '-color'));
      }
      if (!node.textContent.trim()) addBand(node, 'empty-background', r.top, r.bottom, r.left, r.right, s.backgroundColor);
      const edgeReport = { nodeId: describe(node) };
      for (const pseudo of ['::before', '::after']) {
        const p = view.getComputedStyle(node, pseudo);
        edgeReport[pseudo.slice(2)] = pseudoInfo(p);
        if (!/^(?:"\s*"|'\s*')$/.test(p.content) || p.display === 'none' || p.visibility !== 'visible' || Number.parseFloat(p.opacity) === 0) continue;
        const px = property => Number.parseFloat(p.getPropertyValue(property)) || 0;
        const height = Math.max(px('height'), px('min-height')) + (p.boxSizing === 'border-box' ? 0 : px('border-top-width') + px('border-bottom-width') + px('padding-top') + px('padding-bottom'));
        if (height < 1 || height > 16) continue;
        const width = /px$/.test(p.width) ? px('width') : r.width;
        const absolute = /^(?:absolute|fixed)$/.test(p.position);
        const left = r.left + (absolute ? px('left') : Number.parseFloat(s.paddingLeft) || 0) + px('margin-left');
        const top = absolute ? (p.top !== 'auto' ? r.top + px('top') : r.bottom - px('bottom') - height) : pseudo === '::before' ? r.top + (Number.parseFloat(s.borderTopWidth) || 0) + (Number.parseFloat(s.paddingTop) || 0) : r.bottom - (Number.parseFloat(s.borderBottomWidth) || 0) - (Number.parseFloat(s.paddingBottom) || 0) - height;
        if (colored(p.backgroundColor)) addBand(node, pseudo + '-background', top, top + height, left, left + width, p.backgroundColor);
        else {
          addBand(node, pseudo + '-border-top', top, top + px('border-top-width'), left, left + width, p.borderTopColor);
          addBand(node, pseudo + '-border-bottom', top + height - px('border-bottom-width'), top + height, left, left + width, p.borderBottomColor);
        }
      }
      if (report.edges.length < 28) report.edges.push(edgeReport); else truncate('edge-descriptions');
    };
    if (root && report.scope.rootWidthEligible && report.scope.routeEligible && accepted.length >= 2) {
      for (const card of accepted) {
        if (surfaces.get(card).coversCard) inspectEdge(surfaces.get(card).node);
        for (let node = card; node && node !== root; node = node.parentElement) { inspectEdge(node); inspectEdge(node.previousElementSibling); inspectEdge(node.nextElementSibling); }
        for (const edge of ['firstElementChild', 'lastElementChild']) for (let node = card, depth = 0; node && depth < 6; depth++, node = node[edge]) inspectEdge(node);
      }
      for (let index = 1; index < accepted.length; index++) {
        const previous = accepted[index - 1], current = accepted[index], a = rect(previous), b = rect(current);
        let common = previous.parentElement;
        while (common && !common.contains(current)) common = common.parentElement;
        const pair = { previousId: describe(previous), currentId: describe(current), commonId: common ? describe(common) : null, commonIsRoot: common === root, gap: rounded(b.top - a.bottom), leftDifference: rounded(b.left - a.left), rightDifference: rounded(b.right - a.right), reason: '' };
        const rootGap = common === root ? getGenericGoogleRootGapV660(root, previous, current, rect, style, surfaces) : null;
        const previousSurface = rootGap ? surfaces.get(previous).color : background(previous);
        const currentSurface = rootGap ? surfaces.get(current).color : background(current);
        const matching = bands.find(band => band.left <= Math.max(a.left, b.left) + 8 && band.right >= Math.min(a.right, b.right) - 8 && band.top >= a.bottom - 24 && band.bottom <= b.top + 24);
        if (current.hasAttribute('data-generic-google-boundary-v658')) pair.reason = 'marker';
        else if (a.bottom > b.top + 1) pair.reason = 'overlap';
        else if (b.top - a.bottom > 120) pair.reason = 'gap';
        else if (Math.abs(a.left - b.left) > 12 || Math.abs(a.right - b.right) > 12) pair.reason = 'horizontal-alignment';
        else if (!common) pair.reason = 'common-missing';
        else if (rootGap && !rootGap.accepted) pair.reason = rootGap.reason;
        else if (matching) { pair.reason = 'native-band'; pair.bandIndex = bands.indexOf(matching); }
        else if (b.top - a.bottom >= 2 && background(common) !== previousSurface && background(common) !== currentSurface) pair.reason = 'different-background';
        else if ((Number.parseFloat(style(current).borderTopWidth) || 0) > 0 && colored(style(current).borderTopColor) && style(current).borderTopColor !== surface) pair.reason = 'existing-top-border';
        else {
          pair.reason = 'would-repair';
          pair.paintMode = rootGap ? 'existing-gap-shadow' : 'group-border';
        }
        if (report.pairs.length < 32) report.pairs.push(pair); else truncate('pairs');
      }
    }
    report.counts.pairs = Math.max(0, accepted.length - 1);
    report.counts.bands = bands.length;
    report.bands = bands.slice(0, 80).map(band => ({ nodeId: describe(band.node), kind: band.kind, top: rounded(band.top), bottom: rounded(band.bottom), left: rounded(band.left), right: rounded(band.right), height: rounded(band.height), color: short(band.color, 55) }));
    if (bands.length > 80) truncate('bands');
    // Capture at most three nearby contexts and 400 structural nodes. This path
    // remains useful when v6.58 found zero sources or records.
    const anchors = [...scope.querySelectorAll('a[href],[role="link"]')].filter(node => !node.closest(PRIVATE) && visible(node) && external(node)).map((node, index) => ({ node, index, distance: distance(node) })).sort((a, b) => a.distance - b.distance || a.index - b.index);
    const contexts = [], seenContexts = new Set();
    for (const { node } of anchors.slice(0, 24)) {
      let context = result.records.find(record => record.anchor === node)?.card || node.parentElement || node;
      if (!context || context === scope) context = node;
      if (!result.records.some(record => record.card === context)) {
        for (let depth = 0; context.parentElement && context.parentElement !== scope && depth < 5; depth++) {
          const parent = context.parentElement;
          if (parent.closest(PRIVATE) || parent.querySelectorAll('*').length > MAX_STRUCTURE) break;
          context = parent;
        }
      }
      if (seenContexts.has(context)) continue;
      seenContexts.add(context); contexts.push(context);
      if (contexts.length >= 3) break;
    }
    if (!contexts.length) contexts.push(scope);
    const sampled = [], sampledSet = new Set();
    for (const context of contexts) {
      const stack = [context];
      while (stack.length && sampled.length < MAX_STRUCTURE) {
        const node = stack.pop();
        if (sampledSet.has(node) || node.closest(PRIVATE)) continue;
        sampledSet.add(node); sampled.push(node);
        const children = [...node.children];
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
      }
      if (stack.length) truncate('structure-nodes');
    }
    const identitySet = new Set(result.sources.map(entry => entry.node));
    for (const node of sampled) {
      report.nearby.structure.push({ ...basic(node), parentId: node.parentElement && scope.contains(node.parentElement) ? id(node.parentElement) : null, childTags: [...node.children].slice(0, 12).map(child => child.localName), text: snippet(node) });
      if (node.matches('a[href],[role="link"]') && external(node) && report.nearby.anchors.length < 24) {
        const headings = [...node.querySelectorAll(HEADING)].slice(0, 4);
        report.nearby.anchors.push({ nodeId: describe(node), destination: external(node), text: safeText(textOf(node), 90), headings: headings.map(heading => ({ nodeId: describe(heading), visible: visible(heading), text: safeText(textOf(heading), 90) })), recognized: result.records.some(record => record.anchor === node) });
      }
      if (!node.matches('cite,[data-dtld],div,span,a,header') || report.nearby.sources.length >= 40) continue;
      const text = node.getAttribute('data-dtld') || textOf(node);
      if (text.length > 260 || !/(?:https?:\/\/|www\.|(?:[\p{L}\p{N}-]+\.)+[a-z]{2,})/iu.test(text)) continue;
      const exclusion = node.closest(EXCLUDED);
      const observations = [];
      if (!node.matches('cite,[data-dtld],span,div')) observations.push('source-tag-not-scanned');
      if (!node.matches('cite,[data-dtld]') && node.childElementCount !== 0) observations.push('source-nonleaf');
      if (node.querySelector(HEADING) || node.matches(HEADING)) observations.push('source-has-heading');
      if (exclusion) observations.push('source-excluded-ancestor');
      if (!node.getClientRects().length) observations.push('source-no-client-rect');
      if (style(node).visibility !== 'visible') observations.push('source-visibility');
      report.nearby.sources.push({ nodeId: describe(node), text: safeText(text, 150), recognized: identitySet.has(node), exclusionId: exclusion && scope.contains(exclusion) ? describe(exclusion) : null, observations });
    }
    report.counts.nearbyAnchors = anchors.length;
    report.counts.structureNodes = sampled.length;
    return finish();
  } catch (error) {
    report.status = 'error';
    report.error = { name: short(error?.name || 'Error', 40), code: 'inspection-failed' };
    return finish();
  }
}
