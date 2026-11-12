(() => {
  const errors = [];
  window.addEventListener('error', event => errors.push(event.message));
  window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
  const native = document.getElementById('organic-native').outerHTML;
  const rect = element => {
    const value = element.getBoundingClientRect();
    return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
  };
  const scope = number => document.querySelector(`.generic-autopager-page[data-page="${number}"]`);
  const contentRect = node => {
    const pieces = [...node.querySelectorAll('.organic-source-header,.organic-title,.organic-body,.organic-sitelinks')]
      .map(rect).filter(box => box.width > 0 && box.height > 0);
    const outer = rect(node);
    return { left: outer.left, right: outer.right,
      top: Math.min(...pieces.map(box => box.top)), bottom: Math.max(...pieces.map(box => box.bottom)) };
  };
  const describe = node => {
    if (!node) return null;
    const style = getComputedStyle(node);
    return {
      tag: node.tagName, id: node.id, className: node.className,
      attributes: Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value])),
      rect: rect(node), display: style.display, visibility: style.visibility,
      opacity: style.opacity, position: style.position, overflow: style.overflow,
    };
  };
  const ancestors = node => {
    const values = [];
    for (let current = node; current && values.length < 10; current = current.parentElement) values.push(describe(current));
    return values;
  };
  window.__autoPagerFixture = {
    scroll(number) {
      const group = scope(number)?.querySelector('[data-organic-group]');
      if (!group) throw new Error(`No imported group on page ${number}`);
      scrollTo(0, group.getBoundingClientRect().top + scrollY - 16);
    },
    snapshot(number) {
      const container = scope(number);
      if (!container) throw new Error(`No imported page ${number}`);
      const results = [...container.querySelectorAll('[data-organic-result]')].map(node => ({
        id: node.dataset.organicResult, rect: rect(node), content: contentRect(node),
        title: node.querySelector('.organic-title').textContent,
        snippet: node.querySelector('.organic-snippet').textContent,
        href: node.querySelector('.organic-main-link').href,
        thumbnail: node.querySelector('.organic-thumbnail') ? {
          src: node.querySelector('.organic-thumbnail').getAttribute('src'),
          rect: rect(node.querySelector('.organic-thumbnail')),
        } : null,
      }));
      const invisible = results.some(result => result.rect.width <= 0 || result.rect.height <= 0);
      return {
        page: number,
        width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
        dpr: devicePixelRatio, userAgent: navigator.userAgent,
        nativeUnchanged: document.getElementById('organic-native').outerHTML === native,
        errors: [...errors],
        results,
        diagnostics: invisible ? {
          documentReadyState: document.readyState,
          status: document.getElementById('generic-autopager-status-v2')?.textContent,
          containerAncestors: ancestors(container),
          firstResultAncestors: ancestors(container.querySelector('[data-organic-result]')),
          containerHTML: container.outerHTML.slice(0, 32000),
        } : null,
      };
    },
  };
})();
