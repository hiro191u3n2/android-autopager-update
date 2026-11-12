/* generic-google-result-diagnostics-v659 */
function installGenericGoogleResultDiagnosticsV659(version) {
  'use strict';
  if (window.top !== window.self || !/^(?:www\.)?google\.[a-z.]+$/i.test(location.hostname) ||
      location.pathname !== '/search' || window.__genericGoogleResultDiagnosticsV659) return;
  window.__genericGoogleResultDiagnosticsV659 = true;
  const VERSION = String(version || 'unknown').slice(0, 40);
  const HOST_ID = 'generic-google-diagnostics-v659';
  const STATUS_ID = 'generic-autopager-status-v2';
  const MAX_REPORT = 200000;
  const history = new WeakMap();
  let historyAvailable = false;
  const now = () => Math.round(performance.now());

  // Record only existing repair invocations. No new repair, geometry read,
  // whole-page traversal, timer, storage or request is introduced here.
  if (typeof repairGenericGoogleResultBoundariesV658 === 'function') {
    const original = repairGenericGoogleResultBoundariesV658;
    repairGenericGoogleResultBoundariesV658 = function (page) {
      let entry = null, state = null, returned = false;
      try {
        if (page && (typeof page === 'object' || typeof page === 'function')) {
          state = history.get(page);
          if (!state) { state = { calls: 0, recent: [] }; history.set(page, state); }
          entry = { atMs: now(), connected: page.isConnected === true,
            sourceRootPresent: Boolean(page.querySelector?.('.generic-autopager-google-source-root')) };
          state.calls++;
          state.recent.push(entry);
          if (state.recent.length > 6) state.recent.shift();
        }
      } catch (_) { }
      try {
        const result = original.apply(this, arguments);
        returned = true;
        return result;
      } finally {
        try {
          if (entry) {
            entry.outcome = returned ? 'returned' : 'threw';
            entry.durationMs = Math.max(0, now() - entry.atMs);
          }
        } catch (_) { }
      }
    };
    historyAvailable = true;
  }

  function routeEnabled() {
    return location.pathname === '/search' && /^(?:www\.)?google\.[a-z.]+$/i.test(location.hostname);
  }
  function statusTarget(target) {
    return target?.nodeType === 1 ? target.closest('#' + STATUS_ID) : target?.parentElement?.closest('#' + STATUS_ID);
  }
  function sourceURL(raw) {
    try {
      const url = new URL(raw, location.href);
      if (!/^https?:$/.test(url.protocol)) return null;
      const start = url.searchParams.get('start');
      return { origin: url.origin.slice(0, 256), path: url.pathname.slice(0, 2048),
        start: /^\d{1,7}$/.test(start || '') ? Number(start) : null };
    } catch (_) { return null; }
  }
  function choosePage() {
    const pages = [...document.querySelectorAll('.generic-autopager-page[data-page]')];
    let selected = null, largest = 0;
    for (const page of pages.slice(0, 120)) {
      const rect = page.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
      if (rect.width > 0 && rect.height > 0 && overlap > largest) { largest = overlap; selected = page; }
    }
    const initial = !selected;
    if (!selected) selected = document.querySelector('#rso') || document.querySelector('#search');
    return { selected, initial, appendedPages: pages.length, inspectedPages: Math.min(pages.length, 120) };
  }
  function capture() {
    const selection = choosePage();
    const page = selection.selected;
    let inspection;
    try {
      inspection = typeof inspectGenericGoogleResultBoundariesV659 === 'function'
        ? inspectGenericGoogleResultBoundariesV659(page)
        : { status: 'inspector-unavailable' };
    } catch (error) { inspection = { status: 'error', errorType: String(error?.name || 'Error').slice(0, 80) }; }
    const previous = page && history.get(page);
    const visual = window.visualViewport;
    const report = {
      schema: 'android-autopager-google-diagnostics/v659',
      userscriptVersion: VERSION,
      capturedAt: new Date().toISOString(),
      capturedAtMs: now(),
      environment: {
        userAgent: String(navigator.userAgent || '').slice(0, 512),
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollY,
          visualViewport: visual ? { width: visual.width, height: visual.height, scale: visual.scale,
            offsetTop: visual.offsetTop, offsetLeft: visual.offsetLeft } : null },
      },
      pager: {
        statusText: String(document.getElementById(STATUS_ID)?.textContent || '').slice(0, 64),
        statusButtonCount: document.querySelectorAll('#' + STATUS_ID).length,
        appendedPages: selection.appendedPages,
        selectedPage: selection.initial ? 1 : Number(page?.getAttribute('data-page')) || null,
        initialPage: selection.initial,
        source: sourceURL(page?.getAttribute('data-source-url') || location.href),
        pageSelectionTruncated: selection.appendedPages > selection.inspectedPages,
      },
      runtime: {
        repairHistoryAvailable: historyAvailable,
        selectedPageRepairCalls: previous?.recent.length ? { calls: previous.calls, recent: previous.recent.map(entry => ({ ...entry })),
          sinceLastCallMs: Math.max(0, now() - previous.recent[previous.recent.length - 1].atMs) } : { calls: 0, recent: [] },
      },
      inspection,
    };
    let text;
    try { text = JSON.stringify(report, null, 2); }
    catch (_) {
      report.inspection = { status: 'unserializable-inspection' };
      text = JSON.stringify(report, null, 2);
    }
    if (new Blob([text]).size > MAX_REPORT) text = JSON.stringify(report);
    const byteLength = new Blob([text]).size;
    if (byteLength > MAX_REPORT) {
      report.reportTruncated = { originalBytes: byteLength, maximumBytes: MAX_REPORT };
      report.inspection = { status: 'inspection-too-large', schema: 'google-boundary-inspection/v659',
        message: 'Inspection omitted because it exceeded the local report limit.' };
      text = JSON.stringify(report, null, 2);
    }
    return text;
  }

  function decorate(element, properties) {
    for (const [name, value] of Object.entries(properties)) element.style.setProperty(name, value, 'important');
    return element;
  }
  function make(tag, id, text = '') {
    const element = document.createElement(tag);
    if (id) element.id = id;
    if (text) element.textContent = text;
    return element;
  }
  let dialog = null;
  function open() {
    if (!routeEnabled() || dialog) return;
    // Capture before an overlay can cover the result nodes or move focus.
    const text = capture();
    const previousFocus = document.activeElement;
    const host = make('div', HOST_ID);
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-labelledby', HOST_ID + '-title');
    host.setAttribute('data-generic-google-diagnostics-v659', '1');
    decorate(host, { position: 'fixed', inset: '0', 'z-index': '2147483647', display: 'flex',
      'align-items': 'center', 'justify-content': 'center', padding: '12px',
      background: 'rgba(0,0,0,.45)', color: '#202124', 'box-sizing': 'border-box',
      'font-family': 'sans-serif', 'font-size': '14px', 'line-height': '1.45' });
    const panel = decorate(make('div'), { display: 'flex', 'flex-direction': 'column', gap: '10px',
      width: 'min(640px,100%)', 'max-height': '88vh', padding: '16px', background: '#fff',
      color: '#202124', 'border-radius': '12px', 'box-sizing': 'border-box', overflow: 'auto',
      'overscroll-behavior': 'contain', 'box-shadow': '0 6px 30px rgba(0,0,0,.25)' });
    const title = decorate(make('div', HOST_ID + '-title', 'Google表示の診断'), { 'font-size': '18px', 'font-weight': '700' });
    const description = make('div', null, `実行中の版：${VERSION}\n表示中の検索結果の文字・構造・配置を含みます。内容を確認してコピーできます。`);
    decorate(description, { 'white-space': 'pre-wrap' });
    const area = make('textarea', 'generic-google-diagnostics-text-v659');
    area.readOnly = true;
    area.spellcheck = false;
    area.setAttribute('aria-label', 'コピーする診断情報');
    area.value = text;
    decorate(area, { display: 'block', width: '100%', height: '42vh', 'min-height': '120px',
      'box-sizing': 'border-box', padding: '10px', border: '1px solid #dadce0', 'border-radius': '6px',
      background: '#f8f9fa', color: '#202124', 'font-family': 'monospace', 'font-size': '12px',
      'line-height': '1.4', resize: 'none', 'white-space': 'pre', overflow: 'auto' });
    const feedback = make('div', 'generic-google-diagnostics-feedback-v659');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const actions = decorate(make('div'), { display: 'flex', 'flex-wrap': 'wrap', gap: '8px' });
    const button = (id, label) => {
      const item = make('button', id, label);
      item.type = 'button';
      decorate(item, { 'min-height': '44px', padding: '10px 12px', border: '1px solid #dadce0',
        'border-radius': '8px', background: '#fff', color: '#174ea6', 'font-size': '14px',
        'font-family': 'sans-serif', 'font-weight': '600', 'touch-action': 'manipulation' });
      actions.appendChild(item);
      return item;
    };
    const copy = button('generic-google-diagnostics-copy-v659', '診断をコピー');
    const save = button('generic-google-diagnostics-save-v659', 'JSONを保存');
    const close = button('generic-google-diagnostics-close-v659', '閉じる');
    const fallbackCopy = () => {
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, area.value.length);
      let copied = false;
      try { copied = document.execCommand?.('copy') === true; } catch (_) { }
      feedback.textContent = copied ? 'コピーしました。このチャットに貼り付けてください。' : '本文を選択しました。長押ししてコピーできます。';
    };
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) { fallbackCopy(); return; }
        await navigator.clipboard.writeText(text);
        feedback.textContent = 'コピーしました。このチャットに貼り付けてください。';
      } catch (_) { fallbackCopy(); }
    });
    save.addEventListener('click', () => {
      try {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
        const link = make('a');
        link.href = url;
        link.download = `autopager-google-v${VERSION.replace(/[^A-Za-z0-9._-]/g, '')}-diagnostics.json`;
        link.style.display = 'none';
        host.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        feedback.textContent = '保存したJSONをこのチャットに添付できます。';
      } catch (_) { feedback.textContent = '保存できませんでした。「診断をコピー」を使ってください。'; }
    });
    function dismiss() {
      host.remove();
      if (dialog === host) dialog = null;
      if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    }
    close.addEventListener('click', dismiss);
    host.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
    });
    panel.append(title, description, area, feedback, actions);
    host.appendChild(panel);
    document.body.appendChild(host);
    dialog = host;
    close.focus({ preventScroll: true });
  }

  let hold = 0, downX = 0, downY = 0, consumed = false, suppressUntil = 0;
  const cancelHold = () => { if (hold) clearTimeout(hold); hold = 0; };
  const trigger = () => {
    cancelHold();
    consumed = true;
    suppressUntil = performance.now() + 2000;
    try { open(); } catch (_) { }
  };
  document.addEventListener('pointerdown', event => {
    cancelHold();
    consumed = false;
    suppressUntil = 0;
    if (!routeEnabled() || !statusTarget(event.target) || event.button > 0 || event.isPrimary === false) return;
    downX = event.clientX; downY = event.clientY;
    hold = setTimeout(trigger, 900);
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    if (hold && Math.hypot(event.clientX - downX, event.clientY - downY) > 12) cancelHold();
  }, { passive: true });
  document.addEventListener('pointerup', cancelHold, { passive: true });
  document.addEventListener('pointercancel', cancelHold, { passive: true });
  document.addEventListener('contextmenu', event => {
    if (!routeEnabled() || !statusTarget(event.target)) return;
    event.preventDefault();
    cancelHold();
    if (!consumed) trigger();
  });
  document.addEventListener('click', event => {
    if (!statusTarget(event.target) || !consumed || performance.now() > suppressUntil) return;
    consumed = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener('pagehide', cancelHold, { passive: true });
}
