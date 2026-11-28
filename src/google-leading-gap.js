// Result pages are cloned without Google's scripts. An empty reserved tile
// can retain its source height after navigation, modules or duplicates go away.
function collapseGenericGoogleLeadingGap(section) {
  const root = section.querySelector('.generic-autopager-google-source-root');
  if (!root) return;
  const box = root.getBoundingClientRect();
  if (box.width < 100) return;
  const headings = 'h3,[role="heading"],.DKV0Md,.n0jPhd,.vvjwJb';
  const anchorFor = node => node.closest('a[href]') || node.querySelector('a[href]');
  let first;
  for (const heading of root.querySelectorAll(headings)) {
    const link = anchorFor(heading);
    if (link && genericGoogleTailExternalV663(link) && heading.getBoundingClientRect().height > 0) {
      first = heading;
      break;
    }
  }
  if (!first) return;
  const top = first.getBoundingClientRect().top;
  if (top - box.top < 80) return;

  // Examine only siblings before the first listing. Never change the root,
  // the listing itself, or spacing between ordinary results.
  const blank = [];
  for (let branch = first; branch !== root; branch = branch.parentElement) {
    for (let slot = branch.previousElementSibling; slot; slot = slot.previousElementSibling) {
      const r = slot.getBoundingClientRect();
      if (r.height < 80 || r.width < box.width * .7 || r.top < box.top - 1 || r.bottom > top + 1) continue;
      if (!genericGoogleSlotHasContent(slot)) blank.push(slot);
    }
  }
  for (const slot of blank) slot.style.setProperty('display', 'none', 'important');
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
    stack.push(...node.children);
  }
  return false;
}
