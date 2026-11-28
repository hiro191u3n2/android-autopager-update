// Result pages are cloned without Google's scripts. An empty reserved tile
// can retain its source height after navigation, modules or duplicates go away.
let genericGoogleDividerObserver;
function checkGenericGooglePageStart(section) {
  collapseGenericGoogleLeadingGap(section);
  // The initial pass runs before all host-side cleanup has finished. Check
  // once after import settles and once when an offscreen divider approaches.
  setTimeout(() => { if (section.isConnected) collapseGenericGoogleLeadingGap(section); }, 350);
  const divider = section.querySelector('.generic-autopager-divider');
  if (!divider || !window.IntersectionObserver || divider.getBoundingClientRect().top <= innerHeight) return;
  if (!genericGoogleDividerObserver) genericGoogleDividerObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      genericGoogleDividerObserver.unobserve(entry.target);
      const page = entry.target.closest('.generic-autopager-page');
      if (page) collapseGenericGoogleLeadingGap(page);
    }
  }, { rootMargin: '160px 0px' });
  genericGoogleDividerObserver.observe(divider);
}

function collapseGenericGoogleLeadingGap(section) {
  const root = section.querySelector('.generic-autopager-google-source-root');
  if (!root) return;
  const box = root.getBoundingClientRect();
  if (box.width < 100) return;
  const headings = 'h3,[role="heading"],.DKV0Md,.n0jPhd,.vvjwJb';
  let first;
  // Mobile Google also uses plain text links for some result titles.
  for (const selector of [headings, 'a[href]']) {
    for (const label of root.querySelectorAll(selector)) {
      const link = label.closest('a[href]') || label.querySelector('a[href]') || genericGoogleLeadingOverlay(label, root);
      if (link && (label.textContent.trim() || link.getAttribute('aria-label')) && genericGoogleTailExternalV663(link) &&
          label.getBoundingClientRect().height > 0 && getComputedStyle(label).visibility === 'visible') {
        first = label;
        break;
      }
    }
    if (first) break;
  }
  if (!first) return;
  const divider = section.querySelector('.generic-autopager-divider');
  if (!divider || first.getBoundingClientRect().top - divider.getBoundingClientRect().bottom < 80) return;

  const path = [];
  for (let node = first; node; node = node.parentElement) {
    path.unshift(node);
    if (node === root) break;
  }
  const blank = [];
  // Visit in reading order. A source name, image or real control before the
  // heading ends the leading band, even when it belongs to a different branch.
  for (let i = 0; i < path.length; i++) {
    const node = path[i], next = path[i + 1];
    const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
    if (rect.width >= box.width * .7 && /^(static|relative)$/.test(css.position)) {
      if (parseFloat(css.marginTop) >= 80) node.style.setProperty('margin-top', '0px', 'important');
      const padding = parseFloat(css.paddingTop);
      if (next && padding >= 80 && css.backgroundImage === 'none' && (!css.maskImage || css.maskImage === 'none') &&
          !genericGoogleLeadingPaddingPaint(node, padding)) {
        node.style.setProperty('padding-top', '0px', 'important');
      }
    }
    if (!next) break;
    let foundContent = false;
    for (let sibling = node.firstChild; sibling && sibling !== next; sibling = sibling.nextSibling) {
      if (sibling.nodeType === 3 && sibling.textContent.trim()) { foundContent = true; break; }
      if (sibling.nodeType !== 1 || sibling.matches('style,script,template,noscript,link,meta')) continue;
      const r = sibling.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (genericGoogleSlotHasContent(sibling)) { foundContent = true; break; }
      if (r.width >= box.width * .7 && r.height > 0 && !/^(absolute|fixed)$/.test(getComputedStyle(sibling).position)) {
        blank.push({ node: sibling, top: r.top, bottom: r.bottom });
      }
    }
    if (foundContent) break;
  }
  // Count the union, since empty flex/grid cells may sit side by side.
  blank.sort((a, b) => a.top - b.top);
  let covered = 0, bottom = -Infinity;
  for (const slot of blank) {
    covered += Math.max(0, slot.bottom - Math.max(slot.top, bottom));
    bottom = Math.max(bottom, slot.bottom);
  }
  if (covered >= 80) for (const slot of blank) slot.node.style.setProperty('display', 'none', 'important');
}

// Some mobile titles are plain siblings of a stretched, empty result link.
function genericGoogleLeadingOverlay(label, root) {
  const title = label.getBoundingClientRect();
  if (!title.width || !title.height) return null;
  for (let p = label.parentElement, depth = 0; p && p !== root && depth < 3; p = p.parentElement, depth++) {
    for (const a of p.children) {
      if (!a.matches('a[href]') || !genericGoogleTailExternalV663(a)) continue;
      const r = a.getBoundingClientRect();
      if (r.left <= title.left + 2 && r.right >= title.left + Math.min(title.width / 2, 100) &&
          r.top <= title.top + 2 && r.bottom >= title.bottom - 2) return a;
    }
  }
  return null;
}

function genericGoogleLeadingPaddingPaint(node, padding) {
  if (node.shadowRoot || node.matches('a,button,[role="img"],[role="button"]')) return true;
  for (const pseudo of ['::before', '::after']) {
    const paint = getComputedStyle(node, pseudo);
    if (paint.content && !['none', 'normal'].includes(paint.content) && paint.display !== 'none') return true;
  }
  const top = node.getBoundingClientRect().top;
  for (const child of node.querySelectorAll('*')) {
    const r = child.getBoundingClientRect();
    if (r.width && r.height && r.top < top + padding - 1 && r.bottom > top &&
        /^(absolute|fixed|sticky)$/.test(getComputedStyle(child).position)) return true;
  }
  return false;
}

function genericGoogleSlotHasContent(slot) {
  const view = slot.ownerDocument.defaultView;
  const stack = [slot];
  // A painted color sample or CSS-made symbol can carry information without
  // text, links or an image resource. A blank card normally has a neutral face.
  const illustrated = style => {
    if (style.backgroundImage !== 'none' || style.maskImage && style.maskImage !== 'none') return true;
    const rgb = style.backgroundColor.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    return rgb ? Math.max(...rgb.slice(1)) - Math.min(...rgb.slice(1)) > 18 :
      !!style.backgroundColor && style.backgroundColor !== 'transparent';
  };
  const controls = 'a[href],button,input,select,textarea,details,iframe,object,embed,video,audio,canvas,svg,math,' +
    '[role="img"],[role="button"],[role="link"],[tabindex],[aria-label],[aria-labelledby],[title],[contenteditable="true"]';
  while (stack.length) {
    const node = stack.pop();
    if (node.matches('script,style,link,meta,template,noscript')) continue;
    const css = view.getComputedStyle(node);
    if (css.display === 'none' || Number(css.opacity) === 0) continue;
    const visible = css.visibility === 'visible';
    // A copied spinner has no producer. Keep a progress widget that also
    // contains a result, media, human-readable text or a control.
    if (node.matches('progress,[role="progressbar"],g-loading-icon') && !node.textContent.trim() &&
        !node.querySelector('a[href],button,input,img,video,canvas,iframe')) continue;
    if (node.matches('[role="status"][aria-busy="true"]') && !node.childElementCount && !node.textContent.trim() &&
        !node.matches('[tabindex],a,button') && !illustrated(css)) continue;
    // Detached blank embeds have no producer. Keep any authored source,
    // lazy-load hint, srcdoc, or frame with an actual document inside it.
    if (node.matches('iframe') && (!node.getAttribute('src') || node.getAttribute('src') === 'about:blank') &&
        !node.matches('[srcdoc],[data-src],[data-url],[data-lazy-src]') &&
        (!node.matches('[aria-label],[title]') || /^(?:広告|advertisement|ad)$/i.test((node.getAttribute('aria-label') || node.title || '').trim()))) {
      try {
        const body = node.contentDocument?.body;
        if (body && !body.childElementCount && !body.textContent.trim() && !illustrated(css)) continue;
      } catch (_) { }
    }
    const extent = node.getBoundingClientRect();
    if ((!extent.width || !extent.height) && /^(hidden|clip)$/.test(css.overflowY) &&
        /^(hidden|clip)$/.test(css.overflowX) && !node.matches(controls) &&
        !node.querySelector(controls + ',img,source')) continue;
    if (visible) {
      if (node.matches(controls) || node.shadowRoot || illustrated(css)) return true;
      if (node.matches('img') && (node.alt || node.hasAttribute('srcset') ||
          !genericGoogleImagePlaceholderV666(node.currentSrc || node.getAttribute('src')) ||
          genericGoogleImageActivationPendingV666(node, genericGoogleImagePlaceholderV666))) return true;
      if (node.matches('source[srcset],source[data-srcset]')) return true;
      if ([...node.childNodes].some(child => child.nodeType === 3 && /[^\s\u200b-\u200d\ufeff]/.test(child.data))) return true;
      for (const pseudo of ['::before', '::after']) {
        const paint = view.getComputedStyle(node, pseudo);
        if (paint.display === 'none' || paint.visibility !== 'visible' || ['none', 'normal', ''].includes(paint.content)) continue;
        if (!['""', "''"].includes(paint.content) || illustrated(paint)) return true;
      }
    }
    for (const child of node.children) stack.push(child);
  }
  return false;
}
