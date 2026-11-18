// Mobile Google can place its attribution, destination and overflow menu in
// different DOM branches. Use their displayed positions in the imported page.
const genericGoogleFramedV668 = new WeakSet();
let genericGoogleFrameIdV668 = 0;

function repairGenericGoogleMobileFramesV668(page) {
  const root = page?.querySelector('.generic-autopager-google-source-root');
  if (!root?.isConnected || genericGoogleFramedV668.has(root) || !page.matches('.generic-autopager-page')) return;
  const view = root.ownerDocument.defaultView, doc = root.ownerDocument;
  const bounds = root.getBoundingClientRect();
  if (bounds.width < 180 || bounds.width > 900) return;
  const excluded = 'nav,aside,footer,form,details,table,g-scrolling-carousel,g-inner-card,g-related-question,[role="grid"],[role="tablist"],[role="listbox"],[role="dialog"],[data-text-ad],[data-shopping],[itemtype*="Product"],[inert],[hidden]';
  const headingSelector = 'h3,[role="heading"][aria-level="3"],[role="heading"]:not([aria-level])';
  const rectangles = new WeakMap(), styles = new WeakMap();
  const rect = node => {
    if (!rectangles.has(node)) rectangles.set(node, node.getBoundingClientRect());
    return rectangles.get(node);
  };
  const style = node => {
    if (!styles.has(node)) styles.set(node, view.getComputedStyle(node));
    return styles.get(node);
  };
  const visible = node => {
    const r = rect(node);
    return r.width > 0 && r.height > 0 && style(node).visibility === 'visible' &&
      (node.checkVisibility ? node.checkVisibility({ checkOpacity: true }) : Number(style(node).opacity) !== 0);
  };
  const menus = [];
  for (const node of root.querySelectorAll('button,[role="button"],[aria-haspopup],[aria-label],[title]')) {
    if (node.closest(excluded)) continue;
    const label = (node.getAttribute('aria-label') || node.getAttribute('title') || '').trim();
    const labelled = /この(?:検索)?結果|このサイトについて|about this result|more (?:options|about)|result options|詳細オプション/i.test(label);
    if (!labelled && !(node.matches('button,[role="button"],[aria-haspopup]') &&
        (node.querySelector('svg') || /^[⋮︙…•]{1,3}$/.test(node.textContent.trim())))) continue;
    if (!visible(node)) continue;
    const b = rect(node), center = (b.left + b.right) / 2;
    if (center < bounds.left + .72 * bounds.width || center > bounds.right + 5 || b.width > 80 || b.height > 72) continue;
    if (!menus.some(other => Math.abs(rect(other).top - b.top) < 6)) menus.push(node);
  }
  if (menus.length < 2) return;
  const anchors = [...root.querySelectorAll('a[href]')].filter(node => {
    if (node.closest(excluded)) return false;
    try {
      let url = new URL(node.getAttribute('href'), location.href);
      const google = /^(?:www\.)?google\.[a-z.]+$/i;
      if (google.test(url.hostname) && url.pathname === '/url') url = new URL(url.searchParams.get('q') || url.searchParams.get('url'));
      if (google.test(url.hostname) && /^\/(?:search|url|imgres|preferences|setprefs|sorry)(?:\/|$)/.test(url.pathname)) return false;
      return /^https?:$/.test(url.protocol);
    } catch { return false; }
  });
  const titles = [];
  for (const node of root.querySelectorAll(headingSelector)) {
    if (node.closest(excluded) || !visible(node) || !node.textContent.trim()) continue;
    const box = rect(node);
    if (box.width < 25 || box.height > 180) continue;
    // Some layouts use a sibling anchor stretched over the visible title.
    const link = anchors.find(a => a.contains(node) || node.contains(a)) || anchors.find(a => {
      if (!visible(a)) return false;
      const hit = rect(a);
      return hit.left <= box.left + 8 && hit.right >= box.left + Math.min(box.width * .6, 120) &&
        hit.top <= box.top + 3 && hit.bottom >= box.bottom - 3;
    });
    if (link) titles.push(node);
  }
  // Keep plain text title links too, but never promote a favicon or a linked
  // source address alone into a title.
  for (const link of anchors) {
    if (link.querySelector(headingSelector) || link.closest(headingSelector) || !visible(link)) continue;
    if (style(link).fontSize && Number.parseFloat(style(link).fontSize) >= 16 &&
        link.textContent.trim().length >= 2 && !/^https?:\/\//i.test(link.textContent.trim()) &&
        rect(link).height <= 120) titles.push(link);
  }
  if (titles.length < 2) return;
  const sites = [], icons = [];
  for (const node of root.querySelectorAll('cite,[data-dtld],[role="text"],span,div,img')) {
    if (node.tagName === 'IMG') {
      if (visible(node)) {
        const box = rect(node);
        // Decorative favicons often have an aria-hidden ancestor but are
        // visible in the result. Accessibility state is not paint state.
        if (box.width >= 10 && box.width <= 42 && box.height >= 10 && box.height <= 42 &&
            Math.abs(box.width - box.height) < 6 && box.left < bounds.left + bounds.width * .20) icons.push(node);
      }
      continue;
    }
    if (node.childElementCount > 8 || node.closest(excluded)) continue;
    // A common published Google layout contains a direct URL text node
    // followed by nested breadcrumb labels. Its combined text is not a URL.
    const urlText = node.getAttribute('data-dtld') || [...node.childNodes].find(child =>
      child.nodeType === 3 && /^(?:https?:\/\/|www\.|[\w-]+\.(?:com|net|org|jp)(?:$|[\s/›]))/i.test(child.data.trim()))?.data;
    if (urlText && visible(node) && rect(node).height <= 52) sites.push(node);
  }
  const rows = [], used = new Set();
  for (const menu of menus.sort((a, b) => rect(a).top - rect(b).top)) {
    const m = rect(menu), cy = (m.top + m.bottom) / 2;
    const near = (node, distance) => {
      const r = rect(node);
      return r.left < bounds.left + bounds.width * .44 && Math.abs((r.top + r.bottom) / 2 - cy) <= distance &&
        r.left < m.left;
    };
    const closest = nodes => nodes.reduce((best, node) =>
      !best || Math.abs((rect(node).top + rect(node).bottom) / 2 - cy) <
        Math.abs((rect(best).top + rect(best).bottom) / 2 - cy) ? node : best, null);
    const address = closest(sites.filter(node => near(node, 36)));
    const icon = closest(icons.filter(node => near(node, 30) && !node.closest(excluded)));
    if (!address && !icon) continue;
    const title = titles.filter(node => {
      const t = rect(node);
      return !used.has(node) && t.left < bounds.left + bounds.width * .35 &&
        t.top >= cy - 12 && t.top <= cy + 90 && (!address || t.top >= rect(address).top - 3);
    }).sort((a, b) => rect(a).top - rect(b).top)[0];
    if (!title) continue;
    const anchor = icon || address, a = rect(anchor);
    const start = Math.min(a.top, m.top, address ? rect(address).top : a.top);
    if (rows.length && start <= rect(rows.at(-1).title).bottom + 3) continue;
    used.add(title);
    rows.push({ anchor, menu, title, address, start });
  }
  if (rows.length < 2) return;
  genericGoogleFramedV668.add(root);

  // Inspect only these result edges, their adjacent boxes and their shared
  // backgrounds. A thick border, a real painted spacer or an exposed gutter
  // already separates the results. Outlines/hairlines alone do not.
  const wide = node => rect(node).width >= bounds.width * .84;
  const related = new Set();
  for (const row of rows) {
    for (const part of [row.anchor, row.menu, row.title]) for (let n = part; n && n !== page; n = n.parentElement) {
      for (const el of [n, n.previousElementSibling, n.nextElementSibling, n.firstElementChild, n.lastElementChild]) {
        if (el && el !== page && !el.matches('style,script,template') && wide(el) && visible(el)) related.add(el);
      }
    }
  }
  const rgb = color => {
    const numbers = String(color).match(/[\d.]+/g)?.map(Number);
    return numbers?.length >= 3 && (numbers.length < 4 || numbers[3] >= .98) ? numbers.slice(0, 3) : null;
  };
  const contrast = (a, b) => a && b && a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0) >= 30;
  const background = node => {
    for (let n = node; n; n = n.parentElement) {
      const value = style(n).backgroundColor;
      if (rgb(value)) return value;
    }
    return 'rgb(255,255,255)';
  };
  const bands = [], faces = [];
  const add = (top, height, color) => {
    if (height >= 1 && height <= 18 && rgb(color)) bands.push({ top, bottom: top + height, height, color });
  };
  for (const n of related) {
    const b = rect(n), css = style(n);
    if (n === root || n.contains(root)) continue;
    const face = background(n);
    if (rgb(css.backgroundColor) && b.height > 22) faces.push({ node: n, box: b, color: face });
    if (b.height <= 18 && !n.textContent.trim() && contrast(rgb(css.backgroundColor), rgb(background(n.parentElement)))) add(b.top, b.height, css.backgroundColor);
    for (const side of ['top', 'bottom']) {
      const h = parseFloat(css.getPropertyValue('border-' + side + '-width')), color = css.getPropertyValue('border-' + side + '-color');
      if (css.getPropertyValue('border-' + side + '-style') !== 'none' && contrast(rgb(color), rgb(face))) add(side === 'top' ? b.top : b.bottom - h, h, color);
    }
    for (const shadow of (css.boxShadow || '').matchAll(/(rgba?\([^)]+\))\s+0px\s+(-?[\d.]+)px\s+0px\s+0px( inset)?/g)) {
      const y = Number(shadow[2]);
      if (contrast(rgb(shadow[1]), rgb(face)) && (y < 0 && !shadow[3] || y > 0 && shadow[3])) add(b.top + Math.min(0, y), Math.abs(y), shadow[1]);
    }
    for (const pseudo of ['::before', '::after']) {
      const p = view.getComputedStyle(n, pseudo);
      if (!/^(?:"\s*"|'\s*')$/.test(p.content) || p.display === 'none' || p.visibility !== 'visible' ||
          parseFloat(p.width) < bounds.width * .84 || !contrast(rgb(p.backgroundColor), rgb(face))) continue;
      const h = parseFloat(p.height);
      if (h >= 1 && h <= 18) add(pseudo === '::before' ? b.top + (parseFloat(p.top) || 0) : b.bottom - h - (parseFloat(p.bottom) || 0), h, p.backgroundColor);
    }
  }
  for (const a of faces) for (const b of faces) {
    const gap = b.box.top - a.box.bottom;
    if (gap < 3 || gap > 18) continue;
    let common = b.node.parentElement;
    while (common && !common.contains(a.node)) common = common.parentElement;
    if (!common) continue;
    const color = background(common);
    if (contrast(rgb(color), rgb(a.color)) && contrast(rgb(color), rgb(b.color))) add(a.box.bottom, gap, color);
  }
  const nearest = (row, prior, band) => band.top >= Math.max(rect(prior.title).bottom, row.start - 52) && band.bottom <= row.start + 10;
  const native = bands.find(b => b.height >= 4 && b.height <= 12);
  const theme = rgb(background(rows[0].anchor));
  const color = native?.color || (theme[0] + theme[1] + theme[2] < 384 ? 'rgb(60,64,67)' : 'rgb(232,234,237)');
  const height = native?.height || 8;
  const wanted = rows.slice(1).filter((row, i) =>
    !bands.some(b => b.height >= 3 && nearest(row, rows[i], b)));
  if (!wanted.length) return;

  // Anchor every full-width stripe to its own attribution. It follows font,
  // image and viewport reflow without intercepting scrolling or result taps.
  // Keeping the layer outside Google's imported subtree also escapes clipped
  // link wrappers. Existing cards and text never need to be reparented.
  const layer = doc.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('data-generic-google-frames-v668', '');
  layer.style.cssText = 'all:initial!important;display:block!important;position:relative!important;height:0!important;pointer-events:none!important;z-index:2!important;';
  const anchored = view.CSS?.supports('top', 'anchor(--generic-google-example top)');
  const placements = [];
  for (const row of wanted) {
    const name = '--generic-google-result-' + (++genericGoogleFrameIdV668);
    const offset = Math.round(rect(row.anchor).top - row.start) + height + 2;
    const line = doc.createElement('div');
    line.style.cssText = 'all:initial!important;position:absolute!important;display:block!important;left:0!important;right:0!important;pointer-events:none!important;height:' + height + 'px!important;background-color:' + color + '!important;';
    if (anchored) {
      const existing = style(row.anchor).getPropertyValue('anchor-name');
      row.anchor.style.setProperty('anchor-name', (existing && existing !== 'none' ? existing + ', ' : '') + name, 'important');
      line.style.setProperty('top', 'calc(anchor(' + name + ' top) - ' + offset + 'px)', 'important');
    } else placements.push({ node: row.anchor, line, offset });
    layer.appendChild(line);
  }
  page.appendChild(layer);
  if (placements.length) {
    const update = () => {
      const origin = layer.getBoundingClientRect().top;
      for (const p of placements) p.line.style.setProperty('top', (p.node.getBoundingClientRect().top - origin - p.offset) + 'px', 'important');
    };
    update();
    if (view.ResizeObserver) new view.ResizeObserver(update).observe(root);
  }
}
