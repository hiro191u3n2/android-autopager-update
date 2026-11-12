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
  const diagnosticTokens = [
    'PRIVATE_DIAGNOSTIC_QUERY_TOKEN', 'PRIVATE_DIAGNOSTIC_HASH_TOKEN',
    'PRIVATE_DIAGNOSTIC_FORM_TOKEN', 'PRIVATE_DIAGNOSTIC_TEXTAREA_TOKEN',
  ];
  let diagnosticBaseline = null;
  const control = selector => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const style = getComputedStyle(node);
    const box = rect(node);
    return {
      rect: box, text: node.textContent, ariaLabel: node.getAttribute('aria-label'),
      role: node.getAttribute('role'), className: node.className,
      visible: box.width > 0 && box.height > 0 && style.display !== 'none' &&
        style.visibility === 'visible' && Number.parseFloat(style.opacity) !== 0,
    };
  };
  window.__autoPagerFixture = {
    scroll(number) {
      const group = scope(number)?.querySelector('[data-organic-group]');
      if (!group) throw new Error(`No imported group on page ${number}`);
      scrollTo(0, group.getBoundingClientRect().top + scrollY - 16);
    },
    diagnostics(action) {
      const page = scope(2);
      if (!page) throw new Error('Diagnostic UI test requires the real appended page 2');
      if (action === 'prepare') {
        if (diagnosticBaseline) throw new Error('Diagnostic UI preparation must run only once');
        const hiddenStatus = document.getElementById('fixture-status-visibility');
        if (!hiddenStatus) throw new Error('Missing fixture-only hidden status rule');
        hiddenStatus.remove();
        const privateURL = value => {
          const url = new URL(value, location.href);
          url.searchParams.set('diagnostic_private', diagnosticTokens[0]);
          url.hash = diagnosticTokens[1];
          return url.href;
        };
        history.replaceState(null, '', privateURL(location.href));
        page.dataset.sourceUrl = privateURL(page.dataset.sourceUrl);
        const resultLink = page.querySelector('.organic-main-link');
        resultLink.href = privateURL(resultLink.href);
        const form = document.createElement('form');
        form.id = 'fixture-diagnostic-private-form';
        form.style.display = 'none';
        const input = document.createElement('input');
        input.setAttribute('value', diagnosticTokens[2]);
        const textarea = document.createElement('textarea');
        textarea.textContent = diagnosticTokens[3];
        form.append(input, textarea);
        page.querySelector('.generic-autopager-google-source-root').appendChild(form);
        window.__autoPagerFixture.scroll(2);
        diagnosticBaseline = {
          native: document.getElementById('organic-native').outerHTML,
          page: page.outerHTML, scrollY,
        };
      }
      const host = document.getElementById('generic-google-diagnostics-v659');
      const textarea = document.getElementById('generic-google-diagnostics-text-v659');
      const status = control('#generic-autopager-status-v2');
      if (status) status.paused = document.getElementById('generic-autopager-status-v2')
        .classList.contains('generic-autopager-status-hidden');
      return {
        width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollY,
        errors: [...errors], status,
        dialog: host ? {
          host: control('#generic-google-diagnostics-v659'),
          panel: control('#generic-google-diagnostics-v659 > div'),
          textarea: control('#generic-google-diagnostics-text-v659'),
          close: control('#generic-google-diagnostics-close-v659'),
          readonly: Boolean(textarea?.readOnly),
          reportText: textarea?.value || '',
        } : null,
        baseline: diagnosticBaseline ? {
          nativeUnchanged: document.getElementById('organic-native').outerHTML === diagnosticBaseline.native,
          importedMarkupUnchanged: page.outerHTML === diagnosticBaseline.page,
          scrollDelta: scrollY - diagnosticBaseline.scrollY,
          formValuesPreserved: document.getElementById('fixture-diagnostic-private-form')?.elements[0]?.value === diagnosticTokens[2] &&
            document.getElementById('fixture-diagnostic-private-form')?.elements[1]?.value === diagnosticTokens[3],
        } : null,
        privacyTokens: [...diagnosticTokens],
        page: window.__autoPagerFixture.snapshot(2),
      };
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
