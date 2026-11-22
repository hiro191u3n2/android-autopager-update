// Hide Google's search notices without changing the query or the results.
// The public AI selectors are hints; ordinary result cards and question panels
// are always outside the text-matching path. No network requests are made.
var pruneGenericGoogleFeaturedProductsV672;
(function installGoogleSearchCleanupV648() {
  'use strict';
  const googleSuffixes = new Set(('com cat ad ae com.af com.ag com.ai am co.ao com.ar as at com.au az ba com.bd be bf bg com.bh bi bj com.bn com.bo com.br bs bt co.bw by com.bz ca cd cf cg ch ci co.ck cl cm cn com.co co.cr com.cu cv com.cy cz de dj dk dm com.do dz com.ec ee com.eg es com.et fi com.fj fm fr ga ge gg com.gh com.gi gl gm gp gr com.gt gy com.hk hn hr ht hu co.id ie co.il im co.in iq is it je com.jm jo co.jp co.ke com.kh ki kg co.kr com.kw kz la com.lb li lk co.ls lt lu lv com.ly co.ma md me mg mk ml com.mm mn ms com.mt mu mv mw com.mx com.my co.mz com.na com.ng com.ni ne nl no com.np nr nu co.nz com.om com.pa com.pe com.pg com.ph com.pk pl pn com.pr ps pt com.py com.qa ro ru rw com.sa com.sb sc se com.sg sh si sk com.sl sn so sm sr st com.sv td tg co.th com.tj tl tm tn to com.tr tt com.tw co.tz com.ua co.ug co.uk com.uy co.uz com.vc co.ve vg co.vi com.vn vu ws rs co.za co.zm co.zw').split(' '));
  const host = location.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.startsWith('google.') || !googleSuffixes.has(host.slice(7))) return;
  if (window.__genericGoogleSearchCleanupV648) return;
  window.__genericGoogleSearchCleanupV648 = true;

  const MARK = 'data-generic-google-cleanup-v648';
  const ACTIVE = 'data-generic-google-cleanup-active-v648';
  const STYLE_ID = 'generic-google-cleanup-style-v648';
  const SHIELD = 'data-generic-google-cleanup-shield-v648';
  const BOUNDARY = 'html,body,main,#rso,#search,#main,#center_col,#taw,#topstuff,[role="main"]';
  // .g and .tF2Cxc are reused for UI wrappers on mobile; only real linked
  // result headings protect a result card. Notices can precede #search/#rso.
  const PROTECTED = 'nav,header,footer,aside,#rhs,input,textarea,select,[contenteditable="true"],[role="complementary"],[role="navigation"],[role="dialog"],[role="listbox"],.related-question-pair,[jscontroller="Da4hkd"],[data-initq],[data-q],[data-attrid*="people_also_ask"],[data-ssid="lcl_legacy_tile"]';
  // A current-location strip may be a child of the search header or Places
  // container. Walk those parents, but only the location-specific path may
  // cross their protection; ordinary text/content remains protected.
  const HARD_PROTECTED = PROTECTED.split(',').filter(selector => selector !== 'header' && selector !== '[data-ssid="lcl_legacy_tile"]').join(',');
  const AI_ROOT = '[data-attnms],[data-aquarium],[data-subtree="mfc"],[data-attrid="AIOverview"],[data-async-type="folsrch"],[data-mg-cp="YzCcne"]';
  const AI_CONTAINER = AI_ROOT + ',[data-mcpr],[data-mcp]';
  // Observed on Google's live location strip. These describe the UI's purpose,
  // unlike an icon's pixels, a generated separator, or the chosen city name.
  const LOCATION_SEED = 'update-location,[aria-label="検索の場所:"],[aria-label="現在地情報の使用方法"],[aria-label="Search location:"],[aria-label="How your location is used"]';
  const LOCATION_AUX = 'g-dialog,[role="dialog"],g-snackbar,location-snackbar-with-learn-more';
  const LOCATION_EXCLUDED = 'footer,aside,#rhs,form,nav,[role="navigation"],[role="complementary"],' + LOCATION_AUX + ',.related-question-pair,[jscontroller="Da4hkd"],[data-attrid*="people_also_ask"]';
  // A TreeWalker does not filter its root or its root's ancestors. Ignore
  // editing/suggestion subtrees before creating any walker, including when a
  // candidate is supplied directly as a mutation root. Keep shared data-q
  // wrappers available to the separate native-location scan.
  const INPUT_SCOPE = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="searchbox"],[role="combobox"],[role="listbox"],[role="option"]';
  const EDITOR = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]),textarea,[contenteditable]:not([contenteditable="false"]),[role="searchbox"]';
  const PAGE_ROOT = 'html,body,main,#rso,#search,#main,#center_col,[role="main"]';
  const savedDisplay = new WeakMap();
  const displayRewrites = new WeakMap();
  const mutationRecords = [];
  let mutationScheduled = false;
  const jobs = [];
  const queued = new Set();
  let scheduled = false;
  let enabled = false;
  let currentHref = '';
  let currentSearch = '';
  let editing = false;
  let editor = null;
  let editHoldUntil = 0;
  let resumeTimer = 0;
  let mutationOverflow = false;
  const featuredGroups = new Map();
  let featuredEnabled = false;
  const beforePaint = typeof queueMicrotask === 'function' ? queueMicrotask : callback => Promise.resolve().then(callback);

  function inputScope(element) {
    return !!element?.closest(INPUT_SCOPE);
  }

  function inputPaused() {
    return editing && (performance.now() < editHoldUntil || editor?.isConnected && document.activeElement === editor);
  }

  function scheduleDrain(yieldToPage = false) {
    if (scheduled || !jobs.length || inputPaused()) return;
    scheduled = true;
    if (yieldToPage) setTimeout(drain, 0);
    else beforePaint(drain);
  }

  function scheduleMutations(yieldToPage = false) {
    if (mutationScheduled || !mutationRecords.length || inputPaused()) return;
    mutationScheduled = true;
    if (yieldToPage) setTimeout(processMutations, 0);
    else beforePaint(processMutations);
  }

  function resumeInputWork() {
    resumeTimer = 0;
    if (inputPaused()) return;
    editing = false;
    editor = null;
    if (mutationOverflow) {
      mutationOverflow = false;
      mutationRecords.length = 0;
      jobs.length = 0;
      queued.clear();
      // A long edit must not retain an unbounded MutationRecord queue. A
      // single recovery scan also releases notices recycled during that edit.
      revalidateHiddenNotices();
      if (enabled && document.documentElement) enqueue(document.documentElement);
    }
    scheduleMutations();
    scheduleDrain();
  }

  function holdInput(event) {
    const control = event.target?.nodeType === 1 ? event.target.closest(EDITOR) : null;
    if (!enabled || !control) return;
    editing = true;
    editor = control;
    // pointerdown runs before Google's focus/overlay handlers. The short hold
    // also spans temporary blur/replacement of the field during Japanese IME.
    editHoldUntil = performance.now() + 180;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(resumeInputWork, 200);
  }

  function releaseInput() {
    editing = false;
    editor = null;
    editHoldUntil = 0;
    clearTimeout(resumeTimer);
    resumeTimer = 0;
  }

  function ensureStyle() {
    if (!document.documentElement || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    const active = 'html[' + ACTIVE + '] ';
    // Attribute hints alone do not establish a node's scope. Never let CSS
    // bypass the JavaScript guards that protect shared page/search shells.
    style.textContent = active + '[' + MARK + ']' +
      '{display:none!important;min-height:0!important;height:0!important;margin:0!important;padding:0!important;border:0!important}' +
      active + '[' + SHIELD + ']{position:absolute!important;visibility:hidden!important;clip-path:inset(50%)!important;max-width:0!important;max-height:0!important;overflow:hidden!important;pointer-events:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  function routeEnabled() {
    try {
      const url = new URL(location.href);
      return /^\/search\/?$/.test(url.pathname) && url.searchParams.get('udm') !== '50';
    } catch (_) { return false; }
  }

  function searchIdentity() {
    try {
      const url = new URL(location.href);
      return JSON.stringify([url.pathname, ...['q', 'udm', 'tbm', 'start'].map(key => url.searchParams.get(key))]);
    } catch (_) { return location.href; }
  }

  function syncRoute(force) {
    ensureStyle();
    // documentElement can be created after the document-start invocation.
    if (document.documentElement) document.documentElement.toggleAttribute(ACTIVE, enabled);
    if (!force && currentHref === location.href) return;
    // A submitted SPA search can retain focus on the same input node. Resume
    // for the new results even when the browser does not emit focusout.
    const nextSearch = searchIdentity();
    const changedSearch = currentSearch !== nextSearch;
    if (currentHref && changedSearch) releaseInput();
    currentHref = location.href;
    currentSearch = nextSearch;
    enabled = routeEnabled();
    if (changedSearch) {
      for (const group of featuredGroups.values()) for (const part of group.parts) unmark(part, true);
      featuredGroups.clear();
      const params = new URLSearchParams(location.search);
      featuredEnabled = enabled && !params.get('tbm') && /^(?:0|14)?$/.test(params.get('udm') || '');
    }
    if (document.documentElement) document.documentElement.toggleAttribute(ACTIVE, enabled);
    if (!editing && mutationOverflow) {
      mutationOverflow = false;
      mutationRecords.length = 0;
      revalidateHiddenNotices();
    }
    // Never briefly reveal old notices on pageshow or a new query. Recycled
    // nodes are revalidated by the mutation path; leaving search releases all.
    if (!enabled) for (const element of document.querySelectorAll('[' + MARK + ']')) unmark(element, true);
    // Suggestion UI can change a fragment or tracking parameter while the
    // actual search is unchanged. That must not end an ongoing edit or scan.
    if (!force && !changedSearch) return;
    jobs.length = 0;
    queued.clear();
    if (enabled && document.documentElement) enqueue(document.documentElement);
  }

  function normalize(text) {
    return String(text || '').replace(/[\u200b-\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Read only a bounded amount, avoiding textContent on an entire result list.
  function shortText(element, limit) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && node.parentElement.closest('script,style,noscript,template,svg,input,textarea,select') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let text = '', node, count = 0;
    while ((node = walker.nextNode())) {
      if (++count > 80 || text.length + node.data.length > limit) return null;
      text += node.data;
    }
    return normalize(text);
  }

  function isExternalLink(anchor) {
    try {
      const url = new URL(anchor.getAttribute('href'), location.href);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
      const linkHost = url.hostname.replace(/^www\./, '');
      return !linkHost.startsWith('google.') || !googleSuffixes.has(linkHost.slice(7)) || url.pathname === '/url';
    } catch (_) { return false; }
  }

  function hasResultHeading(element) {
    for (const heading of element.querySelectorAll('h3')) {
      const link = heading.closest('a[href]') || heading.querySelector('a[href]');
      if (link && isExternalLink(link)) return true;
    }
    return false;
  }

  function eligible(element, strongAI, locationOnly = false) {
    if (!element || !element.isConnected || (element.matches(BOUNDARY) && !(locationOnly && element.matches('#taw,#topstuff'))) || !document.body?.contains(element) || element.closest(locationOnly ? HARD_PROTECTED : PROTECTED)) return false;
    // An AI hint must never make a shared page/search container disposable.
    // Citations inside an isolated AI module are still allowed below.
    if (strongAI && element.querySelector(BOUNDARY + ',header,nav,form,input,textarea,select,[role="navigation"],[role="search"]')) return false;
    const enclosingLink = element.closest('a[href]');
    if (enclosingLink && isExternalLink(enclosingLink)) return false;
    if (!strongAI && hasResultHeading(element)) return false;
    // A notice quoted inside its own result/question card is content. A result
    // in a separate sibling card does not disqualify a notice in a shared div.
    for (let parent = element; parent && !parent.matches(BOUNDARY); parent = parent.parentElement) {
      for (const heading of parent.querySelectorAll('h2,[role="heading"]')) {
        const label = shortText(heading, 80);
        if (!label || !/^(?:関連する質問|他の人はこちらも質問|People also ask)$/i.test(label)) continue;
        const panel = heading.closest('.MjjYud,section,article') || heading.parentElement;
        if (panel && panel.contains(element)) return false;
      }
      for (const heading of parent.querySelectorAll('h3')) {
        const link = heading.closest('a[href]') || heading.querySelector('a[href]');
        if (!link || !isExternalLink(link) || (strongAI && element.contains(heading))) continue;
        const card = heading.closest('.MjjYud,.g,.tF2Cxc,article') || link.parentElement;
        if (card && card.contains(element)) return false;
      }
    }
    return true;
  }

  function correctionText(text) {
    return /も含めた検索結果を表示|(?:次の|以下の)検索結果を表示|の検索結果を表示しています|もしかして\s*[:：]|Showing results for|Including results for|Did you mean\s*[:：]/i.test(text);
  }

  function locationText(text) {
    return /(?:地域を選択|場所を選択|Choose area|Choose location)\s*[⋮⋯︙…]*\s*$/i.test(text) && text.length < 180;
  }

  function aiHeading(text) {
    return /^(?:AIによる概要|AI概要|AIOverview|AIOverviews)[:：]?$/.test(text.replace(/\s/g, ''));
  }

  function aiError(text) {
    const compact = text.replace(/\s/g, '');
    return compact.length <= 350 && (/AI(?:による)?概要(?:を|は|が).{0,70}(?:生成できません|表示できません|利用できません)/.test(compact) ||
      /(?:(?:An? )?AI Overview (?:is not available|isn't available|couldn't be generated)|Can't generate an AI overview|Unable to generate an AI overview|We can't generate an AI overview)/i.test(text));
  }

  function beforeResults(element) {
    // Location inference is only for the strip before the first actual result.
    // In particular, addresses and menus inside the Places widget stay intact.
    for (const result of document.querySelectorAll('h3,[data-ssid="lcl_legacy_tile"]')) {
      if (result.closest('header,nav,footer,aside,' + AI_ROOT)) continue;
      // The location strip may live above the map inside this same wrapper.
      // Use the first actual linked result inside it as the ordering boundary.
      if (result.contains(element)) continue;
      const link = result.closest('a[href]') || result.querySelector('a[href]');
      if (result.tagName === 'H3' && (!link || !isExternalLink(link))) continue;
      if (element.contains(result) || !(element.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      return true;
    }
    // Streaming markup may not have a result yet. Only consider the top band.
    const rect = element.getBoundingClientRect();
    return rect.top + scrollY < 650;
  }

  function locationContent(element, selector) {
    return Array.from(element.querySelectorAll(selector)).filter(node => !node.closest(LOCATION_AUX));
  }

  function nativeLocationTarget(seed) {
    if (!seed.isConnected || !document.body?.contains(seed) || seed.closest(LOCATION_EXCLUDED)) return null;
    for (let element = seed, depth = 0; element && depth < 10; element = element.parentElement, depth++) {
      if (element.matches(BOUNDARY)) break;
      if (element.closest(LOCATION_EXCLUDED) || element.closest('a[href]') && isExternalLink(element.closest('a[href]'))) break;
      // Do not absorb the following map/results or a search/navigation control.
      // Hidden location dialogs are ancillary to the strip, not result content.
      if (locationContent(element, 'h1,h3,iframe,video,canvas,input,textarea,select,nav,[role="navigation"],[data-ssid="lcl_legacy_tile"]').length) break;
      if (locationContent(element, 'a[href]').some(isExternalLink)) break;
      const headingMarkers = locationContent(element, '[aria-label="検索の場所:"],[aria-label="Search location:"],.BBwThe');
      if (!headingMarkers.length) continue;
      const otherHeading = locationContent(element, 'h2,[role="heading"]').some(node => !headingMarkers.some(marker => node.contains(marker)));
      if (otherHeading) break;
      const menu = locationContent(element, '[aria-label="現在地情報の使用方法"],[aria-label="How your location is used"]')[0];
      const nativeOwner = element.matches('dynamic-visibility-control') && element.querySelector('update-location');
      // Known row classes are only used together with a location-specific
      // marker. They let streamed markup be suppressed before the menu arrives.
      if ((menu || nativeOwner || element.matches('.vqkKIe,.O4T6Pe')) && beforeResults(element)) return element;
    }
    return null;
  }

  function scanNativeLocations(root) {
    // This narrow semantic scan intentionally precedes the generic walker.
    // Google can put the strip in a shared data-q/.MjjYud wrapper, which must
    // remain protected from the broad text-based removal paths below.
    const scope = root.closest('.vqkKIe,.O4T6Pe,dynamic-visibility-control') || root;
    const seeds = [...scope.querySelectorAll(LOCATION_SEED)];
    if (scope.matches(LOCATION_SEED)) seeds.unshift(scope);
    for (const seed of seeds) {
      if (seed.closest('[' + MARK + ']')) continue;
      const target = nativeLocationTarget(seed);
      if (target) mark(target, 'location');
    }
  }

  function locationBand(element, text) {
    if (!text || text.length > 160) return false;
    if (element.querySelector('h1,h2,h3,iframe,video,canvas,input,textarea,select,[data-ssid="lcl_legacy_tile"]')) return false;
    if (Array.from(element.querySelectorAll('a[href]')).some(isExternalLink)) return false;
    const nativeLocation = element.matches('update-location') ||
      (element.matches('dynamic-visibility-control') && element.querySelector('update-location'));
    if (nativeLocation) return eligible(element, false, true) && beforeResults(element);
    const controls = Array.from(element.querySelectorAll('button,[role="button"],[aria-haspopup],[jsaction],[tabindex],g-menu-button,g-popup'));
    // Google nests several jsaction owners around the same overflow menu.
    // Prefer its label/dots, never a broad clickable parent containing the name.
    const menu = controls.find(control => /(?:その他|メニュー|オプション|more|options|menu)/i.test(control.getAttribute('aria-label') || '') ||
      /^[⋮⋯︙…]+$/.test(normalize(control.textContent))) ||
      Array.from(element.querySelectorAll('span')).find(span => /^[⋮⋯︙…]+$/.test(normalize(span.textContent))) ||
      controls.slice().reverse().find(control => control.querySelector('svg') && normalize(control.textContent).length < 12);
    if (!menu || !eligible(element, false, true)) return false;
    // The icon can be an image, CSS background/mask, SVG use, or a path. The
    // middle dot may be generated by ::after and therefore absent in textContent.
    const label = normalize(text.replace(normalize(menu.textContent), '')).replace(/[⋮⋯︙…]+$/g, '').trim();
    const pieces = [element, ...element.querySelectorAll('span,b,strong,i,svg,img,[aria-label],[data-icon]')].slice(0, 40);
    const generatedDot = !/[・·•]\s*$/.test(label) && pieces.some(piece => !menu.contains(piece) &&
      ['::before', '::after'].some(pseudo => /^["']?[・·•]["']?$/.test(getComputedStyle(piece, pseudo).content.trim())));
    if (!/[・·•]\s*$/.test(label) && !generatedDot) return false;
    const locationIcon = pieces.some(icon => {
      if (icon === element || menu.contains(icon)) return false;
      const rect = icon.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5 || rect.width > 40 || rect.height > 40) return false;
      const meaning = [icon.getAttribute('aria-label'), icon.getAttribute('alt'), icon.getAttribute('data-icon'), normalize(icon.textContent)].filter(Boolean).join(' ');
      if (/(?:現在地|自宅|位置情報|current location|\bhome\b|location_on|\bplace\b)/i.test(meaning)) return true;
      const tag = icon.tagName.toLowerCase(), style = getComputedStyle(icon);
      const picture = tag === 'svg' || tag === 'img' || style.backgroundImage !== 'none' || (style.maskImage && style.maskImage !== 'none');
      // Generic small icons are accepted only beside a short geographic label
      // in this pre-result strip; business cards and navigation are excluded.
      return picture && label.length <= 70 && /[都道府県市区町村郡]|[A-Za-z]{2}/.test(label);
    });
    if (!locationIcon || !beforeResults(element)) return false;
    if (Array.from(element.querySelectorAll('img')).some(img => { const r = img.getBoundingClientRect(); return r.width > 40 || r.height > 40; })) return false;
    const rect = element.getBoundingClientRect();
    return rect.width >= Math.min(180, innerWidth * 0.4) && rect.height > 0 && rect.height <= 112;
  }

  function aiTarget(seed) {
    const module = seed.closest('.MjjYud,section,g-section-with-header');
    if (!module || module === seed || !eligible(module, true)) return seed;
    if (module.querySelector('[data-ssid="lcl_legacy_tile"],.related-question-pair,[jscontroller="Da4hkd"]')) return seed;
    if (Array.from(module.querySelectorAll('h3')).some(h => !seed.contains(h))) return seed;
    return module;
  }

  function safelyPromote(seed, kind) {
    let target = seed;
    for (let depth = 0, parent = seed.parentElement; parent && depth < 7; depth++, parent = parent.parentElement) {
      if (!eligible(parent, false, kind === 'location') || parent.querySelector('input,textarea,select,iframe,video,canvas,img,nav,[role="navigation"],.related-question-pair,[data-initq],[data-q]')) break;
      const text = shortText(parent, kind === 'correction' ? 700 : 360);
      if (!text) break;
      if (kind === 'location' && !locationText(text) && !locationBand(parent, text)) break;
      if (kind === 'correction' && !correctionText(text)) break;
      if (kind === 'ai' && !aiError(text) && !aiHeading(text)) break;
      if (Array.from(parent.querySelectorAll('a[href]')).some(isExternalLink)) break;
      target = parent;
    }
    return target;
  }

  function queueMutationRecords(records) {
    if (!records.length) return;
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target) continue;
      if (inputScope(target)) {
        restoreInputScope(target);
        continue;
      }
      // Opening the keyboard/overlay changes page scroll-lock styles/classes;
      // it does not change the notices' content. Never rescan all results for
      // these changes. Actual inserted/text/semantic-attribute changes remain.
      if (record.type === 'attributes' && /^(?:style|class)$/.test(record.attributeName) && target.matches(PAGE_ROOT) && !savedDisplay.has(target)) continue;
      if (mutationOverflow) continue;
      if (inputPaused() && mutationRecords.length >= 200) {
        mutationRecords.length = 0;
        mutationOverflow = true;
        continue;
      }
      mutationRecords.push(record);
    }
    if (editing && !inputPaused() && !resumeTimer) resumeTimer = setTimeout(resumeInputWork, 0);
    scheduleMutations();
  }

  function writeDisplay(element, value, priority = '') {
    // Remove only this synchronous style write from our observer's queue.
    // Earlier page mutations and synchronous custom-element reactions are
    // retained. A restored child's style must not invalidate its hidden parent.
    queueMutationRecords(observer.takeRecords());
    const previous = element.getAttribute('style');
    if (value) element.style.setProperty('display', value, priority);
    else element.style.removeProperty('display');
    let consumed = false;
    queueMutationRecords(observer.takeRecords().filter(record => {
      if (!consumed && record.type === 'attributes' && record.target === element && record.attributeName === 'style' && record.oldValue === previous) {
        consumed = true;
        return false;
      }
      return true;
    }));
  }

  function hide(element, kind) {
    element.setAttribute(MARK, kind);
    if (!savedDisplay.has(element)) savedDisplay.set(element, {
      value: element.style.getPropertyValue('display'),
      priority: element.style.getPropertyPriority('display')
    });
    if ((displayRewrites.get(element) || 0) >= 3 && !element.hasAttribute(SHIELD)) element.setAttribute(SHIELD, '');
    // Author inline !important declarations outrank our stylesheet. Preserve
    // the original display value so recycled nodes and non-search routes work.
    if (!element.hasAttribute(SHIELD) && (element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== 'important')) {
      writeDisplay(element, 'none', 'important');
    }
  }

  function unmark(element, leavingSearch = false) {
    element.removeAttribute(MARK);
    element.removeAttribute(SHIELD);
    // Attribute/text revalidation must not reset the conflict budget. A page
    // renderer can rewrite class/ARIA together with display on every attempt.
    if (leavingSearch) displayRewrites.delete(element);
    const old = savedDisplay.get(element);
    savedDisplay.delete(element);
    if (!old) return;
    if (element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== 'important') return;
    writeDisplay(element, old.value, old.priority);
  }

  function restoreInputScope(element) {
    // A page can recycle an AI container into the search candidate list. Such
    // a control must be released even while ordinary cleanup is paused.
    let marked = element.closest('[' + MARK + ']');
    if (!marked && !savedDisplay.has(element)) return;
    while (marked) {
      unmark(marked);
      marked = element.closest('[' + MARK + ']');
    }
    for (const child of element.querySelectorAll('[' + MARK + ']')) unmark(child);
  }

  function revalidateHiddenNotices() {
    for (const seed of featuredGroups.keys()) updateFeatured(seed);
    const roots = Array.from(document.querySelectorAll('[' + MARK + ']')).filter(element => element.getAttribute(MARK) !== 'featured-products').filter(element => !element.parentElement?.closest('[' + MARK + ']'));
    for (const root of roots) {
      unmark(root);
      for (const child of root.querySelectorAll('[' + MARK + ']')) unmark(child);
      // Reclassify existing hidden nodes before yielding a bulk recovery scan;
      // otherwise a notice near the end of a long page would flash on resume.
      enqueue(root);
    }
  }

  function mark(element, kind) {
    if (!element || (element.matches(BOUNDARY) && !(kind === 'location' && element.matches('#taw,#topstuff')))) return;
    hide(element, kind);
    // Collapse only transparent wrappers: no sibling text, controls, or result
    // content may be swallowed to remove padding/dividers around a notice.
    let current = element;
    for (let depth = 0; depth < 4; depth++) {
      const parent = current.parentElement;
      if (!parent || !eligible(parent, kind === 'ai') || parent.matches(BOUNDARY)) break;
      const siblings = Array.from(parent.childNodes).filter(n => n !== current && !(n.nodeType === 3 && !n.data.trim()) && !(n.nodeType === 1 && n.matches('script,style,template')));
      if (siblings.length) break;
      hide(parent, kind);
      current = parent;
    }
  }

  const featuredLabel = /^(?:注目\s*されて\s*い?る\s*商品|注目\s*の\s*商品|popular products|featured products|レシピ|recipes|その他の画像|more images)$/i;
  const imageFooter = /^(?:その他の画像|more images)$/i;
  const recipeLabel = /^(?:レシピ|recipes)$/i;
  const price = /[¥￥$€£]\s*\d|\d[\d,.]*\s*円/;
  const featureBoundary = BOUNDARY + ',.generic-autopager-page,.generic-autopager-google-source-root';
  const featureControls = 'button,[role="button"],a[href],summary';
  const productImage = 'img,g-img,[role="img"],picture,[style*="background-image"]';
  const moduleHeading = 'h1,h2,h3,h4,[role="heading"]';
  const productSearchScope = '#rso,#search,#main,#center_col,main,[role="main"],.generic-autopager-page,.generic-autopager-google-source-root';
  const productExclusions = 'nav,body>header,[role="banner"],footer,form,aside,blockquote,[role="navigation"],[role="dialog"],[role="listbox"],g-related-question,.related-question-pair,[data-attrid*="people_also_ask"]';

  function isImageFooter(el) {
    return !!el && (imageFooter.test(shortText(el, 48) || '') ||
      el.matches('a[href],button,[role="button"],' + moduleHeading) && imageFooter.test(normalize(el.getAttribute('aria-label'))));
  }

  function isFeaturedHeading(el) {
    if (!el) return false;
    if (featuredLabel.test(shortText(el, 48) || '') ||
        el.matches('a[href],button,[role="button"]') && imageFooter.test(normalize(el.getAttribute('aria-label')))) return true;
    if (!el.matches(moduleHeading)) return false;
    if (featuredLabel.test(normalize(el.getAttribute('aria-label')))) return true;
    return [...el.childNodes].some(n => n.nodeType === 3 && featuredLabel.test(normalize(n.data))) &&
      [...el.children].every(child => child.matches('svg,button,[role="button"],[aria-hidden="true"]') || child.querySelector('button,[aria-haspopup]'));
  }

  function bandLabel(value) {
    return /^(?:[¥$€£][\d.,]+|[\d.,]+円)(?:以下|未満|以上|超|から|まで|[~〜‐-―−-](?:[¥$€£]?[\d.,]+円?))$/.test(
      normalize(value).normalize('NFKC').replace(/[\s\u061c\u202a-\u202e\u2066-\u2069]/g, ''));
  }

  // Some mobile layouts put a price-range link and an unlabelled row
  // directly after the Images footer. Neither row needs to be a button.
  function pricePartsAfterImages(seed, scope) {
    const link = seed.closest('a[href]');
    if (link && isExternalLink(link)) return [];
    const footer = seed.closest('a,button,[role="button"]') || seed;
    if (!scope.contains(footer)) return [];
    const excluded = productExclusions + ',input,select,textarea,[data-initq],[jscontroller="Da4hkd"],.generic-autopager-page';
    const ignored = 'script,style,template,noscript,svg,[hidden],[inert]';
    const previousParts = featuredGroups.get(seed)?.parts || [];
    const toggleCaption = /^(?:開く|閉じる|展開|折りたたむ|(?:詳細|価格帯)(?:を表示|を開く|を展開|を閉じる|を折りたたむ)|expand|collapse|show details|hide details)$/i;
    const priceChars = /^[\s\d０-９.,，．¥￥$€£円以下未満以上超からまで~〜～‐-―−－\u061c\u200b-\u200f\u202a-\u202e\u2066-\u2069-]*$/;
    function ignoredNode(el) {
      if (el.matches(ignored)) return true;
      // The original shelf can still be in the document with display:none.
      // Revalidate our own rows, while stepping past the already hidden shelf.
      if (savedDisplay.has(el)) return !previousParts.includes(el) && !bandLabel(shortText(el, 70));
      const style = el.isConnected ? getComputedStyle(el) : el.style;
      return style && (style.display === 'none' || style.visibility === 'hidden' ||
        style.contentVisibility === 'hidden' || style.height === '0px' && /hidden|clip/.test(style.overflowY));
    }
    // Read the displayed label without folding hidden offer details or SVG
    // titles into it. A mixed subtree is visited in document order below.
    function rangeText(el) {
      let text = '', budget = 140;
      function collect(node) {
        if (--budget < 0) return false;
        if (node.nodeType === 3) {
          // Google can put a visually clipped instruction inside the toggle.
          // Only disregard an exact action caption owned by an expand control.
          if (toggleCaption.test(normalize(node.data)) && node.parentElement.closest('button,summary,[role="button"],[aria-expanded]')) return true;
          text += node.data;
          return text.length <= 100 && priceChars.test(node.data);
        }
        if (node.nodeType !== 1 || ignoredNode(node)) return true;
        if (node.matches(excluded + ',cite') || node.matches('a[href]') && isExternalLink(node)) return false;
        for (const child of node.childNodes) if (!collect(child)) return false;
        return true;
      }
      return collect(el) ? normalize(text) : null;
    }
    const parts = [], empty = [];
    let budget = 100;
    function visit(el) {
      if (--budget < 0 || el.matches(excluded + ',cite') ||
          el.matches('a[href]') && isExternalLink(el)) return false;
      if (ignoredNode(el)) return true;
      const label = rangeText(el);
      if (bandLabel(label || (label === '' && el.getAttribute('aria-label')))) {
        parts.push(...empty, el);
        empty.length = 0;
        return true;
      }
      if (label === '') {
        // Do not collect an independent link, a result icon or the footer's
        // own inline chevron as a blank row.
        if (!el.matches('a[href],img,span,i') && !el.querySelector('cite,a[href]')) empty.push(el);
        return true;
      }
      if (parts.length || el.matches('article,' + moduleHeading)) return false;
      for (const child of el.childNodes) {
        if (child.nodeType === 3 && normalize(child.data)) return false;
        if (child.nodeType === 1 && !visit(child)) return false;
      }
      return true;
    }
    for (let node = footer; node && node !== scope; node = node.parentElement) {
      for (let next = node.nextSibling; next; next = next.nextSibling) {
        if (next.nodeType === 3 && normalize(next.data) || next.nodeType === 1 && !visit(next)) return parts;
      }
    }
    return parts;
  }

  // A collapsed shopping accordion can be rendered independently of its
  // heading and offers. A price inside an ordinary result is not an accordion.
  const bandControl = 'button,summary,[role="button"],[aria-expanded],[jsaction*="click"]';
  const bandProtected = productExclusions + ',article,p,cite,form,input,select,textarea,.tF2Cxc,[data-initq],[jscontroller="Da4hkd"]';
  function accordionControl(el) {
    return el.matches(bandControl) ? el : el.querySelector(bandControl);
  }
  function bandRowFor(el, scope) {
    if (!scope || el.closest(bandProtected + ',a[href]')) return null;
    for (let row = el; row && row !== scope && !row.matches(featureBoundary); row = row.parentElement) {
      const value = shortText(row, 70);
      if (value === null) break;
      if (!bandLabel(value || row.getAttribute('aria-label'))) {
        if (/^[\s¥￥$€£\d.,円~〜～–—−-]*$/.test(value)) continue;
        break;
      }
      if (row.querySelector(bandProtected + ',a[href],' + moduleHeading)) break;
      if (accordionControl(row) && row.querySelector(productImage)) return row;
    }
    return null;
  }
  function bandRowParts(row, scope) {
    if (bandRowFor(row, scope) !== row) return [];
    function matchingRow(el) {
      if (!el || el.matches(featureBoundary + ',' + bandProtected + ',a[href]') ||
          el.querySelector(bandProtected + ',a[href],' + moduleHeading)) return false;
      const control = accordionControl(el);
      if (!control) return false;
      const value = shortText(el, 70);
      if (value === null) return false;
      const label = value || control.getAttribute('aria-label');
      if (bandLabel(label)) return true;
      return !value && (!label || /^(?:開く|閉じる|展開|折りたたむ|expand|collapse)$/i.test(label)) &&
        (control.hasAttribute('aria-expanded') || !!el.querySelector('svg'));
    }
    let unit = row;
    while (unit.parentElement) {
      const parent = unit.parentElement;
      const parts = [unit];
      for (let el = unit.previousElementSibling; matchingRow(el); el = el.previousElementSibling) parts.unshift(el);
      for (let el = unit.nextElementSibling; matchingRow(el); el = el.nextElementSibling) parts.push(el);
      if (parent === scope || parent.matches(featureBoundary + ',' + bandProtected) ||
          [...parent.childNodes].some(n => n.nodeType === 3 && n.data.trim() ||
            n.nodeType === 1 && !parts.includes(n) && !n.matches('script,style,template,hr'))) return parts;
      unit = parent;
    }
    return [unit];
  }

  // The mobile page can put the heading, carousel and price accordions in
  // different wrappers, including a wrapper shared with the next web result.
  // Use the range between the heading and the last price row. Return only
  // complete elements so an adjacent result never shares a hidden ancestor.
  function pricedSectionParts(seed, scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeType === 1 && node.matches('script,style,noscript,template,svg') ?
          NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    walker.currentNode = seed;
    let media = false, priced = false, last = null;
    for (let n, count = 0; count < 1800 && (n = walker.nextNode()); count++) {
      if (last?.contains(n) || seed.contains(n)) continue;
      if (n.nodeType === 1) {
        if (n.matches(productExclusions + ',.generic-autopager-page,.tF2Cxc') ||
            (n.matches('article') && n.querySelector('cite') && hasResultHeading(n))) break;
        if (n.matches('h3,[role="heading"][aria-level="3"]')) {
          const link = n.closest('a[href]') || n.querySelector('a[href]');
          if (link && isExternalLink(link) && !n.closest('g-scrolling-carousel,[role="listitem"],[data-docid]')) {
            let tile = n.parentElement;
            while (tile && tile !== scope && !tile.contains(seed) && !isProductRail(tile)) tile = tile.parentElement;
            if (!tile || tile === scope || tile.contains(seed)) break;
          }
        }
        if (n.matches('h1,h2,[role="heading"][aria-level="2"]') && !bandLabel(shortText(n, 55))) break;
        if (n.matches(productImage)) media = true;
        continue;
      }
      if (!/\d/.test(n.data)) continue;
      let row = n.parentElement;
      let label = shortText(row, 60);
      if (!bandLabel(label) && row.parentElement && bandLabel(shortText(row.parentElement, 60))) {
        row = row.parentElement;
        label = shortText(row, 60);
      }
      if (!bandLabel(label)) {
        if (last) break;
        if (price.test(n.data) || price.test(label || '')) priced = true;
        continue;
      }
      if (!media || !priced) break;
      while (row.parentElement && row.parentElement !== scope && bandLabel(shortText(row.parentElement, 60))) row = row.parentElement;
      last = row;
    }
    return last ? sectionPartsBetween(seed, last, scope) : [];
  }

  function sectionPartsBetween(seed, last, scope) {
    const adjacent = (node, direction) => {
      for (let s = node[direction]; s; s = s[direction]) {
        if (s.nodeType === 3 && s.data.trim() || s.nodeType === 1 && !s.matches('script,style,template,[hidden]')) return true;
      }
      return false;
    };
    let first = seed;
    while (first.parentElement && first.parentElement !== scope && !first.parentElement.matches(featureBoundary) && !adjacent(first, 'previousSibling')) first = first.parentElement;
    while (last.parentElement && last.parentElement !== scope && !last.parentElement.matches(featureBoundary) && !adjacent(last, 'nextSibling')) last = last.parentElement;
    if (first === last) return [first];
    const span = document.createRange();
    span.setStartBefore(first);
    span.setEndAfter(last);
    const probe = document.createRange(), owned = [];
    function collect(parent) {
      for (const el of parent.children) {
        if (!span.intersectsNode(el)) continue;
        probe.selectNode(el);
        if (span.compareBoundaryPoints(Range.START_TO_START, probe) <= 0 && span.compareBoundaryPoints(Range.END_TO_END, probe) >= 0) owned.push(el);
        else collect(el);
      }
    }
    collect(span.commonAncestorContainer);
    return owned;
  }

  const moreProducts = /^(?:その他の商品|さらに商品を表示|商品をもっと見る|more products|show more products)$/i;
  function isolatedFeaturedModule(seed, scope) {
    const unit = seed.closest('section,.MjjYud,.Ww4FFb,block-component,g-section-with-header,[data-attrid*="product"]');
    if (!unit || unit === scope || unit.matches(featureBoundary) || !scope.contains(unit)) return null;
    const before = document.createRange();
    before.selectNodeContents(unit);
    before.setEndBefore(seed);
    if (normalize(before.toString())) return null;
    if (unit.querySelector('article,.tF2Cxc,nav,form,.related-question-pair') ||
        [...unit.querySelectorAll('cite')].some(c => /^https?:\/\//i.test(c.textContent.trim()))) return null;
    // Related sections and independent web results sometimes share a Google
    // wrapper. They must go through the bounded interval classifier instead.
    for (const h of unit.querySelectorAll(moduleHeading)) {
      if (h.contains(seed) || seed.contains(h)) continue;
      if (!h.closest('[role="listitem"],[itemtype*="Product"],[data-docid]')) return null;
    }
    for (const link of unit.querySelectorAll('a[href]')) {
      if (!isExternalLink(link) || moreProducts.test(shortText(link, 40) || '')) continue;
      let tile = link;
      while (tile !== unit && !(tile.querySelector(productImage) && price.test(tile.textContent))) tile = tile.parentElement;
      if (tile === unit || tile.contains(seed) || !shortText(tile, 650)) return null;
    }
    const amounts = unit.textContent.match(/[¥￥$€£]\s*\d[\d,.]*|\d[\d,.]*\s*円/g);
    return amounts?.length >= 2 && unit.querySelectorAll(productImage).length >= 2 ? unit : null;
  }
  function gridSectionParts(seed, scope) {
    const normalResult = el => el.matches('.tF2Cxc') ||
      (el.matches('article,.g,.Ww4FFb,.MjjYud') && [...el.querySelectorAll('cite')].some(c => /^https?:\/\//i.test(c.textContent.trim())) && hasResultHeading(el));
    function offerFor(node) {
      for (let el = node; el && el !== scope && !el.contains(seed); el = el.parentElement) {
        if (normalResult(el) || el.matches(featureBoundary) || el.querySelector('nav,article')) break;
        // A seller's name may itself be a cite. Product tiles can also be
        // unlinked. Look for an individual priced offer with its own image.
        if (!el.querySelector(productImage) || !price.test(el.textContent)) continue;
        if (el.querySelector('a[href],cite,[role="link"]') || /[\p{L}]{2}/u.test(el.textContent.replace(/送料無料|税込/g,''))) return el;
      }
      return null;
    }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) { return n.nodeType === 1 && n.matches('script,style,template,noscript,svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    walker.currentNode = seed;
    let lastCard = null, lastControl = null, count = 0, prices = 0, hasImage = false;
    for (let n; (n = walker.nextNode());) {
      if (seed.contains(n) || lastCard?.contains(n)) continue;
      if (n.nodeType === 1) {
        if (n.matches(productExclusions + ',.generic-autopager-page') || normalResult(n)) break;
        if (n.matches(productImage)) hasImage = true;
        if (moreProducts.test(normalize(n.getAttribute('aria-label')))) { lastControl = n; break; }
        if (n.matches(moduleHeading)) {
          if (moreProducts.test(shortText(n, 36) || '')) { lastControl = n; break; }
          if ((n.matches('h1,h2,[aria-level="2"]') && !n.closest('a[href],[role="listitem"],[itemtype*="Product"]')) || !offerFor(n)) break;
        }
        continue;
      }
      const value = normalize(n.data);
      if (!value) continue;
      const parent = n.parentElement;
      if (moreProducts.test(value) || /その他|more/i.test(value) && moreProducts.test(shortText(parent, 36) || '')) {
        lastControl = parent.closest('button,[role="button"],a[href],summary') || parent;
        break;
      }
      if (!/\d/.test(value) || !(price.test(value) || price.test(shortText(parent, 40) || ''))) continue;
      if (bandLabel(value) || bandLabel(shortText(parent, 50))) break;
      prices++;
      const card = offerFor(parent);
      if (!card || lastCard && card.contains(lastCard)) continue;
      count++;
      lastCard = card;
    }
    // A named expander also establishes the end of a lazy product module,
    // even if its individual image/price/merchant nodes have no common tile.
    const owner = seed.closest('section,.MjjYud,.Ww4FFb,block-component,g-section-with-header,[data-attrid*="product"]');
    if (count < 2 && !(lastControl && (owner?.contains(lastControl) || hasImage && prices >= 2))) return [];
    return sectionPartsBetween(seed, lastControl || lastCard, scope);
  }
  function isProductRail(branch) {
    const collection = 'g-scrolling-carousel,[data-attrid*="popular_products"],[data-attrid*="popular-products"]';
    for (let list = branch, depth = 0; list && depth < 6; depth++) {
      if (list.matches('cite,nav,footer')) return false;
      if (list.matches(collection) && price.test(list.textContent) && list.querySelector(productImage)) return true;
      const children = [...list.children].filter(child => !child.matches('script,style,template,[hidden],[aria-hidden="true"]'));
      if (children.length === 1) { list = children[0]; continue; }
      const tiles = children.filter(child => !child.matches('cite,.tF2Cxc') && !child.querySelector('cite,[data-dtld],.tF2Cxc') &&
        child.querySelector(productImage) && price.test(child.textContent));
      if (tiles.length >= 2 && children.every(child => tiles.includes(child) || child.matches('button,[role="button"],g-left-button,g-right-button'))) return true;
      const rail = children.find(child => child.matches(collection));
      return !!rail && children.every(child => child === rail || child.matches('button,[role="button"],g-left-button,g-right-button') || priceFilters(child)) && isProductRail(rail);
    }
    return false;
  }

  function priceFilters(node) {
    const controls = node.matches(featureControls) ? [node] : [...node.querySelectorAll(featureControls)];
    if (node.matches('article,nav') || node.querySelector('cite,h2,h3,[role="heading"]')) return false;
    const text = normalize(node.textContent).replace(/\s/g, '');
    return (controls.length ? controls.every(control => price.test(control.textContent)) : price.test(text) && /以下|以上|未満|から|まで|[〜～~–－−-]/.test(text)) &&
      /^(?=.*\d)[¥￥$€£\d.,円万千以下以上未満超からまで〜～~–－−-]+$/.test(text);
  }

  function recipeParts(seed, scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        return normalize(n.data) && !n.parentElement.closest('script,style,svg,noscript,template') ?
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    walker.currentNode = seed;
    let last = seed, cards = 0, more = false;
    for (let node; (node = walker.nextNode());) {
      if (last.contains(node)) continue;
      const el = node.parentElement;
      if (el.closest(productExclusions + ',.tF2Cxc')) break;
      const article = el.closest('article');
      if (article && !article.contains(seed) && !article.matches('[itemtype$="/Recipe"]') && article.querySelector('p')) break;
      const control = el.closest(featureControls) || el;
      const label = shortText(control, 25);
      if (cards && /^(?:フィードバック|feedback)$/i.test(label)) { last = control; break; }
      if (cards && !more && /^(?:もっと見る|その他のレシピ|show more|more recipes)$/i.test(label)) {
        more = true;
        last = control;
        continue;
      }
      if (more) break;
      let card = null;
      for (let unit = el; unit && unit !== scope && !unit.contains(seed) && !unit.contains(last); unit = unit.parentElement) {
        if (unit.matches(featureBoundary) || !shortText(unit, 550) ||
            unit.querySelector('article,.tF2Cxc,.related-question-pair')) break;
        const links = unit.matches('a[href]') ? [unit] : [...unit.querySelectorAll('a[href]')].filter(isExternalLink);
        if (new Set(links.map(a => a.href)).size > 1) break;
        if (!links.some(isExternalLink) || !unit.querySelector(productImage)) continue;
        if ([...unit.querySelectorAll(moduleHeading)].some(h => !h.closest('a[href]') && !h.querySelector('a[href]'))) break;
        if (unit.matches('[itemtype$="/Recipe"]') ||
            /レビューなし|件のレビュー|no reviews|\d[\d,.]*\s*(?:件|分|時間|min\b|reviews?\b)/i.test(unit.textContent) ||
            unit.querySelector('[aria-label*="保存"],[aria-label*="Save" i],[itemprop="aggregateRating"]')) {
          card = unit;
        }
      }
      if (!card) break;
      cards++;
      last = card;
    }
    return cards ? sectionPartsBetween(seed, last, scope) : [];
  }

  function featuredParts(seed, importedRoot) {
    const images = isImageFooter(seed);
    const scope = importedRoot || seed.closest(productSearchScope) || (images || seed.matches(moduleHeading) ? document.body : null);
    if (images && scope && !seed.closest(productExclusions)) return pricePartsAfterImages(seed, scope);
    const link = seed.closest('a[href]') || seed.querySelector('a[href]');
    if (!scope || seed.closest(productExclusions + ',article p') || link && isExternalLink(link) ||
        !isFeaturedHeading(seed)) return [];
    if (recipeLabel.test(shortText(seed, 48)) || recipeLabel.test(seed.getAttribute('aria-label'))) return recipeParts(seed, scope);
    const isolated = isolatedFeaturedModule(seed, scope);
    if (isolated) return [isolated];
    const priced = pricedSectionParts(seed, scope);
    if (priced.length) return priced;
    const grid = gridSectionParts(seed, scope);
    if (grid.length) return grid;
    for (let head = seed, depth = 0; head.parentElement && depth < 8; head = head.parentElement, depth++) {
      const parent = head.parentElement;
      if (head.matches(featureBoundary) || head.closest(productExclusions)) break;
      const children = [...parent.children].filter(child => !child.matches('script,style,template,[hidden]') &&
        (savedDisplay.has(child) || child === head || getComputedStyle(child).display !== 'none'));
      const next = children.indexOf(head) + 1;
      if (next && children[next] && isProductRail(children[next])) {
        const parts = [head, children[next]];
        for (const sibling of children.slice(next + 1)) {
          if (!priceFilters(sibling)) break;
          parts.push(sibling);
        }
        const hasLooseText = [...parent.childNodes].some(node => node.nodeType === 3 && node.data.trim());
        if (parts.length !== children.length || hasLooseText || parent.matches(featureBoundary)) return parts;
        let unit = parent;
        while (unit.parentElement && !unit.parentElement.matches(featureBoundary) &&
            unit.parentElement.childNodes.length === 1) unit = unit.parentElement;
        return [unit];
      }
      // Walk through title wrappers (including an overflow button), never
      // use an article or a preceding unrelated listing as the heading.
      if (parent.matches(featureBoundary) || children.some(child => child !== head &&
          !child.matches('button,[role="button"],g-menu-button,[aria-hidden="true"]') &&
          !(child.querySelector('button,[role="button"],[aria-haspopup]') && !shortText(child, 40))) ||
          [...parent.childNodes].some(node => node.nodeType === 3 && node.data.trim())) break;
    }
    return [];
  }

  function updateFeatured(seed, band = featuredGroups.get(seed)?.band || false) {
    const old = featuredGroups.get(seed);
    const scope = band && seed.closest(productSearchScope);
    const valid = seed.isConnected && featuredEnabled && (band ? scope && bandRowFor(seed, scope) === seed : isFeaturedHeading(seed));
    const parts = valid ? (band ? bandRowParts(seed, scope) : featuredParts(seed)) : [];
    for (const part of old?.parts || []) if (!parts.includes(part) &&
        ![...featuredGroups.values()].some(group => group !== old && group.parts.includes(part))) unmark(part, true);
    if (!valid) { featuredGroups.delete(seed); return; }
    for (const part of parts) if (!savedDisplay.has(part)) hide(part, 'featured-products');
    const owner = seed.closest('section,g-section-with-header,.Ww4FFb,.MjjYud,article');
    let watch = parts[0] || owner?.parentElement || seed.parentElement?.parentElement || seed;
    for (const part of parts) while (!watch.contains(part)) watch = watch.parentElement;
    const images = !band && isImageFooter(seed);
    if (images) while (!watch.contains(seed)) watch = watch.parentElement;
    featuredGroups.set(seed, {parts, watch, band, images});
    if (!images && parts.some(part => !old?.parts.includes(part))) {
      for (const [footer, group] of featuredGroups) {
        if (group.images && !group.parts.length && footer.closest(productSearchScope) === seed.closest(productSearchScope)) updateFeatured(footer);
      }
    }
  }

  function featuredLabels(root) {
    const seeds = new Set(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      if (/[¥￥$€£円]/.test(n.data)) {
        const row = bandRowFor(n.parentElement, root);
        if (row) seeds.add(row);
      }
      if (!/注目|popular|featured|レシピ|recipes|その他|画像|images/i.test(n.data)) continue;
      for (let el = n.parentElement; el && root.contains(el); el = el.parentElement) {
        const label = shortText(el, 48);
        if (el.closest('script,style,template,noscript,' + productExclusions)) break;
        if (isFeaturedHeading(el)) {
          const heading = el.closest(moduleHeading);
          seeds.add(isFeaturedHeading(heading) ? heading : el);
          break;
        }
        if (!label) break;
      }
    }
    for (const h of root.querySelectorAll('[role="heading"][aria-label],h2[aria-label],h3[aria-label]')) {
      if (featuredLabel.test(normalize(h.getAttribute('aria-label')))) seeds.add(h);
    }
    for (const el of root.querySelectorAll('[aria-expanded][aria-label],[role="button"][aria-label],button[aria-label],a[href][aria-label]')) {
      if (imageFooter.test(normalize(el.getAttribute('aria-label'))) && !el.closest(productExclusions)) seeds.add(el);
      else if (bandLabel(el.getAttribute('aria-label'))) {
        const row = bandRowFor(el, root);
        if (row) seeds.add(row);
      }
    }
    // First remove the named shelf, then inspect what follows the image footer.
    // The detached import has no MutationObserver to run a second cleanup.
    const footers = [...seeds].filter(seed => isImageFooter(seed));
    for (const footer of footers) { seeds.delete(footer); seeds.add(footer); }
    return seeds;
  }

  // Filter both import paths after layout mapping but before the legacy
  // image/product formatter can discard the source section boundaries.
  pruneGenericGoogleFeaturedProductsV672 = function (root) {
    if (!featuredEnabled || !root || root.isConnected) return;
    for (const part of root.querySelectorAll('[' + MARK + '="featured-products"]')) part.remove();
    for (const seed of featuredLabels(root)) {
      if (!root.contains(seed)) continue;
      const parts = isFeaturedHeading(seed) ? featuredParts(seed, root) : bandRowParts(seed, root);
      for (const part of parts) if (part !== root && root.contains(part)) part.remove();
    }
  };

  function inspect(element) {
    if (!enabled || inputScope(element) || element.closest('[' + MARK + ']')) return;
    if (element.matches(AI_ROOT) && eligible(element, true)) {
      mark(aiTarget(element), 'ai');
      return;
    }
    // Google's g-inner-card/update-location custom elements may own text
    // directly. A tag-name whitelist skipped them entirely in v6.48.
    if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    // A form or another shared parent can contain both a search field and a
    // notice. Inspect the child notice without hiding the shared controls.
    if (element.querySelector('input,textarea,select,nav,[role="navigation"]')) return;
    const text = shortText(element, 700);
    const possibleBand = text || element.getAttribute('aria-label') || '';
    if (featuredEnabled && possibleBand.length <= 70 && price.test(possibleBand) && bandLabel(possibleBand)) {
      const row = bandRowFor(element, element.closest(productSearchScope));
      if (row && !featuredGroups.has(row)) updateFeatured(row, true);
      if (!row) for (const [seed, group] of featuredGroups) {
        if (group.images && !group.parts.length && (seed.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) &&
            seed.closest(productSearchScope) === element.closest(productSearchScope)) updateFeatured(seed);
      }
    }
    if (featuredEnabled && (featuredLabel.test(text || '') || element.matches(moduleHeading + ',a[href][aria-label],button[aria-label],[role="button"][aria-label]') && isFeaturedHeading(element)) && (!element.closest('p,blockquote') || element.matches(moduleHeading))) {
      const headingParent = element.closest(moduleHeading);
      const seed = isFeaturedHeading(headingParent) ? headingParent : element;
      const link = seed.closest('a[href]') || seed.querySelector('a[href]');
      // Plain mobile labels can be wrapped in several identical text spans.
      const heading = seed.matches('h2,h3,h4,[role="heading"]') || imageFooter.test(normalize(seed.getAttribute('aria-label'))) ||
        ![...seed.children].some(child => featuredLabel.test(shortText(child, 45) || ''));
      if (heading && !(link && isExternalLink(link)) && !seed.closest(productExclusions) &&
          !featuredGroups.has(seed) && ![...featuredGroups.keys()].some(other => other.contains(seed))) updateFeatured(seed);
    }
    if (!text) return;
    if (element.matches('h1,h2,[role="heading"]') && aiHeading(text)) {
      const identified = element.closest(AI_CONTAINER);
      if (identified && eligible(identified, true)) {
        mark(identified, 'ai');
        return;
      }
    }
    if (locationBand(element, text)) {
      mark(safelyPromote(element, 'location'), 'location');
      return;
    }
    const correction = correctionText(text), location = locationText(text), error = aiError(text), heading = aiHeading(text);
    // Ordinary result text is overwhelmingly common. Do the inexpensive text
    // checks before walking result/PAA ancestors for a possible notice.
    if (!(correction || location || error || heading) || !eligible(element, false)) return;
    if (correction && (element.id === 'fprs' || element.querySelector('a[href*="/search"],a[href*="nfpr="]'))) {
      mark(safelyPromote(element, 'correction'), 'correction');
      return;
    }
    if (location) {
      const controls = element.matches('a,button,[role="button"]') ? [element] : element.querySelectorAll('a,button,[role="button"]');
      if (Array.from(controls).some(control => /^(?:地域を選択|場所を選択|Choose area|Choose location)$/i.test(normalize(control.textContent)) && !isExternalLink(control))) {
        mark(safelyPromote(element, 'location'), 'location');
        return;
      }
    }
    if (error) {
      mark(safelyPromote(element, 'ai'), 'ai');
      return;
    }
    if (heading) {
      // The complete answer can be long. Only an identified module, with the
      // AI label as its own heading, is eligible for whole-module removal.
      const container = element.closest(AI_CONTAINER);
      if (container && eligible(container, true) && !container.matches(BOUNDARY)) mark(container, 'ai');
      else mark(safelyPromote(element, 'ai'), 'ai');
    }
  }

  function enqueue(root) {
    if (!enabled || !root || root.nodeType !== 1 || !root.isConnected || inputScope(root)) return;
    // Inspect the changed root immediately, before merging it into a pending
    // large traversal. Notices inserted beside result lists must not wait for
    // an overflow task, while their bulk descendants may safely yield.
    if (!inputPaused()) {
      scanNativeLocations(root);
      inspect(root);
    }
    if (queued.has(root) || root.closest('[' + MARK + ']')) return;
    // Merge only overlapping work. Never replace unrelated mutation roots with
    // a repeated body-wide scan, even during a burst of Google updates.
    // A running walker may already have passed the insertion point. Only a
    // not-yet-started ancestor job can safely cover a newly inserted subtree.
    for (const job of jobs) if (!job.walker && job.root.contains(root)) return;
    queued.add(root);
    jobs.push({ root, walker: null });
    scheduleDrain();
  }

  function drain() {
    if (currentHref !== location.href) syncRoute(false);
    if (!enabled || inputPaused()) { scheduled = false; return; }
    const started = performance.now();
    let count = 0;
    while (jobs.length && count < 600 && performance.now() - started < 10) {
      const job = jobs[0];
      if (!job.root.isConnected || inputScope(job.root)) { jobs.shift(); queued.delete(job.root); continue; }
      if (!job.walker) {
        scanNativeLocations(job.root);
        inspect(job.root);
        job.walker = document.createTreeWalker(job.root, NodeFilter.SHOW_ELEMENT, {
          acceptNode(node) {
            // data-q also appears on ordinary mobile result wrappers. The
            // general notice walker skips them to protect question panels.
            if (featuredEnabled && node.hasAttribute('data-q') && !node.closest(productExclusions + ',[data-initq],[jscontroller="Da4hkd"]')) {
              for (const h of featuredLabels(node)) inspect(h);
            }
            return node.matches('script,style,noscript,template,svg,[' + MARK + ']') || node.matches(INPUT_SCOPE) || node.matches(HARD_PROTECTED) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
        });
      }
      const node = job.walker.nextNode();
      count++;
      if (node) inspect(node);
      else { jobs.shift(); queued.delete(job.root); }
    }
    scheduled = false;
    // Another microtask would run in the same checkpoint and still starve
    // native input/paint. Only the first bounded pass runs before paint.
    scheduleDrain(true);
  }

  function processMutations() {
    syncRoute(false);
    if (!enabled) mutationRecords.length = 0;
    if (!enabled || inputPaused()) { mutationScheduled = false; return; }
    const started = performance.now();
    let count = 0;
    const changedGroups = new Set();
    while (mutationRecords.length && count++ < 80 && performance.now() - started < 8) {
      const record = mutationRecords.shift();
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target) continue;
      if (inputScope(target)) { restoreInputScope(target); continue; }
      if (target.closest('script,style,noscript,template,svg')) continue;
      if (record.type === 'attributes' && record.attributeName === 'style' && savedDisplay.has(target)) {
        // Ignore our own hide writes. If Google reasserts inline display on a
        // classified node, retain that new original value and suppress it again.
        if (target.style.getPropertyValue('display') === 'none' && target.style.getPropertyPriority('display') === 'important') continue;
        savedDisplay.set(target, { value: target.style.getPropertyValue('display'), priority: target.style.getPropertyPriority('display') });
        const rewrites = (displayRewrites.get(target) || 0) + 1;
        displayRewrites.set(target, rewrites);
        // Do not fight another style observer forever in the pre-paint queue.
        // Collapse/clip only this classified notice through CSS instead.
        if (rewrites >= 3) {
          if (!target.hasAttribute(SHIELD)) target.setAttribute(SHIELD, '');
        }
        else hide(target, target.getAttribute(MARK));
        continue;
      }
      const marked = target.closest('[' + MARK + ']');
      for (const [seed, group] of featuredGroups) {
        if (!seed.isConnected || group.watch.contains(target) ||
            record.type === 'childList' && group.watch.parentElement === target) changedGroups.add(seed);
      }
      if (marked && marked.getAttribute(MARK) !== 'featured-products') {
        // Google may recycle a notice node for ordinary content on navigation.
        let outer = marked;
        while (outer.parentElement && outer.parentElement.hasAttribute(MARK)) outer = outer.parentElement;
        unmark(outer);
        for (const old of outer.querySelectorAll('[' + MARK + ']')) unmark(old);
        enqueue(outer);
      }
      if (record.type === 'characterData' || record.type === 'attributes') enqueue(target);
      else {
        for (const node of record.addedNodes) enqueue(node.nodeType === 1 ? node : target);
      }
      // Parent inspection recognizes a label assembled across sibling nodes;
      // the subtree itself is scanned only through the bounded queue above.
      if (!target.matches(BOUNDARY)) inspect(target);
    }
    for (const seed of changedGroups) updateFeatured(seed);
    mutationScheduled = false;
    scheduleMutations(true);
  }
  const observer = new MutationObserver(queueMutationRecords);
  observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ['id', 'class', 'style', 'role', 'aria-label', 'data-attnms', 'data-aquarium', 'data-subtree', 'data-attrid', 'data-async-type', 'data-mg-cp'] });
  for (const event of ['pointerdown', 'touchstart', 'focusin', 'focusout', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend']) {
    document.addEventListener(event, holdInput, { capture: true, passive: true });
  }
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    try {
      history[method] = function () {
        const result = original.apply(this, arguments);
        syncRoute(false);
        return result;
      };
    } catch (_) { /* Mutation and navigation events still check the route. */ }
  }
  addEventListener('popstate', () => syncRoute(true));
  addEventListener('pageshow', () => syncRoute(true));
  document.addEventListener('DOMContentLoaded', () => syncRoute(true), { once: true });
  syncRoute(true);
  function scanInitialProductHeadings() {
    if (!featuredEnabled || inputPaused() || !document.body) return;
    for (const seed of featuredLabels(document.body)) inspect(seed);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanInitialProductHeadings, { once: true });
  else scanInitialProductHeadings();
})();
