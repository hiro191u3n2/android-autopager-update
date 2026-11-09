// Offline Chromium operation-count and event-loop regressions. These fixtures
// model search editing; they are not a captured Berry/Google DOM or device timing.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { buildUserscript } from '../worker/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const options = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) options.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const imported = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundle = imported.default || imported;
  options.executablePath = await bundle.executablePath();
  options.args = bundle.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
}
const browser = await chromium.launch(options);
const current = await readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../Android_Generic_AutoPager_v6.52.js', import.meta.url), 'utf8');
const start = release.indexOf('(function installGoogleSearchCleanupV648()');
const end = release.indexOf('\n})();', start);
assert(start >= 0 && end > start, 'The frozen v6.52 cleanup module is required');
const baseline = release.slice(start, end + '\n})();'.length);
const packaged = await buildUserscript();
const MARK = 'data-generic-google-cleanup-v648';
const errorText = '現在、AI による概要を生成できません。また後でお試しください。';
const organic = '<article class="MjjYud"><a href="https://ordinary.example/"><h3>通常の検索結果</h3></a><div><span>結果の説明です</span><span>追加本文</span><span>詳細</span></div></article>';
const suggestion = '<li role="option"><span>渋谷駅</span><span>候補の説明</span></li>';
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px sans-serif}header{padding:8px}textarea{font:inherit}article{padding:8px}#suggestions{margin:0}section{padding:8px}</style><header><form role="search"><textarea name="q" id="query">渋谷</textarea></form></header><ul id="suggestions" role="listbox"></ul><section id="initial-ai">${errorText}</section><main id="main"><div id="rso">${organic.repeat(100)}</div></main><div id="mount"></div>`;

// Count the script's DOM work, without adding timing-dependent CPU thresholds.
// Fixture assertions use getElementById/native DOM properties, outside these
// counted methods. No synthetic timers or source replacements are used.
const instrumentation = `(() => {
  let measuring = false;
  const empty = () => ({ treeWalks: 0, globalWalks: 0, suggestionWalks: 0, selectors: 0 });
  let counts = empty();
  const walker = document.createTreeWalker.bind(document);
  document.createTreeWalker = function(root, ...args) {
    if (measuring) {
      counts.treeWalks++;
      if (root === document || root === document.documentElement || root === document.body || root.id === 'rso' || root.id === 'main') counts.globalWalks++;
      if (root.nodeType === 1 && root.closest('[role="listbox"]')) counts.suggestionWalks++;
    }
    return walker(root, ...args);
  };
  for (const name of ['querySelector', 'querySelectorAll']) {
    const original = Element.prototype[name];
    Element.prototype[name] = function(...args) {
      if (measuring) counts.selectors++;
      return original.apply(this, args);
    };
  }
  window.__inputPerf = {
    reset() { counts = empty(); measuring = true; },
    snapshot() { return { ...counts }; },
    stop() { measuring = false; return { ...counts }; }
  };
})();`;

async function setup(code = current) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: fixture }) : route.abort());
  await page.addInitScript({ content: instrumentation + '\n' + code });
  await page.goto('https://www.google.com/search?q=渋谷');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('initial-ai')).display === 'none');
  await page.waitForTimeout(150);
  return { context, page, errors };
}

async function withRun(code, work) {
  const run = await setup(code);
  try {
    const result = await work(run.page);
    assert.deepEqual(run.errors, [], 'No page errors');
    return result;
  } finally { await run.context.close(); }
}

async function bodyChanges(page) {
  return page.evaluate(async () => {
    window.__inputPerf.reset();
    for (let index = 0; index < 4; index++) {
      document.body.classList.toggle('search-overlay');
      document.body.style.overflow = index % 2 ? '' : 'hidden';
      document.documentElement.classList.toggle('keyboard-open');
      await new Promise(requestAnimationFrame);
    }
    await new Promise(requestAnimationFrame);
    return window.__inputPerf.stop();
  });
}

async function suggestionChanges(page) {
  return page.evaluate(async markup => {
    window.__inputPerf.reset();
    const list = document.getElementById('suggestions');
    list.innerHTML = markup.repeat(50);
    await new Promise(requestAnimationFrame);
    list.firstElementChild.firstElementChild.firstChild.data = '渋谷 スナイデル';
    list.firstElementChild.classList.add('selected');
    await new Promise(requestAnimationFrame);
    const count = list.children.length;
    const hidden = Array.from(list.children).some(element => getComputedStyle(element).display === 'none');
    return { ...window.__inputPerf.stop(), count, hidden };
  }, suggestion);
}

async function editIME(page) {
  await page.locator('#query').focus();
  await page.waitForTimeout(30);
  const during = await page.evaluate(async ({ markup, text, mark }) => {
    const query = document.getElementById('query'), list = document.getElementById('suggestions');
    window.__inputPerf.reset();
    query.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    for (const value of ['渋谷 す', '渋谷 すないでる', '渋谷 スナイデル']) {
      query.value = value;
      query.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: value, isComposing: true }));
      list.innerHTML = markup.repeat(40);
      document.body.classList.toggle('editing');
      document.body.style.overflow = 'hidden';
      await new Promise(requestAnimationFrame);
    }
    query.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'スナイデル' }));
    query.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'スナイデル', isComposing: false }));
    query.setSelectionRange(3, 3);
    const notice = document.createElement('section');
    notice.id = 'late-ai'; notice.textContent = text;
    document.getElementById('mount').appendChild(notice);
    await new Promise(resolve => setTimeout(resolve, 160));
    return {
      counts: window.__inputPerf.stop(), value: query.value,
      caret: [query.selectionStart, query.selectionEnd], focused: document.activeElement === query,
      oldHidden: !!document.getElementById('initial-ai').closest('[' + mark + ']'),
      candidateCount: list.children.length,
      candidatesHidden: Array.from(list.children).some(element => !!element.closest('[' + mark + ']')),
      lateDeferred: !notice.closest('[' + mark + ']')
    };
  }, { markup: suggestion, text: errorText, mark: MARK });
  assert.equal(during.value, '渋谷 スナイデル', 'IME text stays intact');
  assert.deepEqual(during.caret, [3, 3], 'Cleanup does not move the caret');
  assert(during.focused, 'Cleanup does not steal focus');
  assert(during.oldHidden, 'Already hidden notices stay hidden while editing');
  assert.equal(during.candidateCount, 40);
  assert.equal(during.candidatesHidden, false, 'Search suggestions remain intact');
  assert(during.lateDeferred, 'A new background notice waits until editing ends');
  assert.equal(during.counts.globalWalks, 0, 'Editing must not rescan results');
  assert.equal(during.counts.suggestionWalks, 0, 'Editing must not walk suggestions');
  await page.locator('#query').blur();
  await page.waitForFunction(mark => !!document.getElementById('late-ai').closest('[' + mark + ']'), MARK, { timeout: 3000 });
  assert.equal(await page.locator('#query').inputValue(), '渋谷 スナイデル');
  return during;
}

async function focusedNavigation(page) {
  await page.locator('#query').focus();
  await page.evaluate(({ result, text }) => {
    const query = document.getElementById('query');
    query.value = '別の検索';
    query.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '別の検索' }));
    history.pushState({}, '', '/search?q=別の検索');
    document.getElementById('rso').innerHTML = '<section id="spa-ai">' + text + '</section>' + result;
  }, { result: organic, text: errorText });
  await page.waitForFunction(mark => !!document.getElementById('spa-ai').closest('[' + mark + ']'), MARK, { timeout: 3000 });
  const state = await page.evaluate(mark => ({
    value: document.getElementById('query').value,
    focusPreserved: document.activeElement === document.getElementById('query'),
    resultsVisible: !!document.getElementById('rso').getClientRects().length,
    queryMarked: !!document.getElementById('query').closest('[' + mark + ']')
  }), MARK);
  assert.equal(state.value, '別の検索');
  assert(state.focusPreserved, 'Route recovery does not forcibly blur the field');
  assert(state.resultsVisible, 'New search results stay visible');
  assert.equal(state.queryMarked, false);
  return state;
}

async function cosmeticHistoryWhileEditing(page) {
  await page.locator('#query').focus();
  const during = await page.evaluate(async ({ text, mark }) => {
    const query = document.getElementById('query');
    query.value = '渋谷駅';
    query.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '駅' }));
    query.setSelectionRange(2, 2);
    window.__inputPerf.reset();
    const notice = document.createElement('section');
    notice.id = 'history-ai'; notice.textContent = text;
    document.getElementById('mount').appendChild(notice);
    const hashURL = new URL(location.href);
    hashURL.hash = 'sbfbu=1';
    history.replaceState({}, '', hashURL);
    await new Promise(requestAnimationFrame);
    const trackingURL = new URL(location.href);
    trackingURL.searchParams.set('ved', 'fixture-tracking');
    trackingURL.searchParams.set('sourceid', 'fixture-source');
    history.replaceState({}, '', trackingURL);
    await new Promise(resolve => setTimeout(resolve, 220));
    return {
      counts: window.__inputPerf.stop(), value: query.value,
      caret: [query.selectionStart, query.selectionEnd], focused: document.activeElement === query,
      deferred: !notice.closest('[' + mark + ']')
    };
  }, { text: errorText, mark: MARK });
  assert.equal(during.counts.globalWalks, 0, 'Hash and tracking changes must not resume a result-wide scan');
  assert.equal(during.counts.treeWalks, 0, 'Editing remains paused for the same actual search');
  assert(during.deferred, 'Background cleanup stays deferred through cosmetic history changes');
  assert(during.focused);
  assert.equal(during.value, '渋谷駅');
  assert.deepEqual(during.caret, [2, 2]);
  // A genuine new query still resumes without requiring a blur event.
  await page.evaluate(() => history.pushState({}, '', '/search?q=渋谷駅'));
  await page.waitForFunction(mark => !!document.getElementById('history-ai').closest('[' + mark + ']'), MARK, { timeout: 3000 });
  return during;
}

async function recycledSearchUI(page) {
  await page.evaluate(() => {
    document.getElementById('mount').innerHTML = '<section id="recycle-shell"><div id="recycled-ai" data-attnms><h2>AI による概要</h2><p>概要本文</p></div></section>';
  });
  await page.waitForFunction(mark => !!document.getElementById('recycled-ai').closest('[' + mark + ']'), MARK);
  await page.locator('#query').focus();
  await page.evaluate(markup => {
    window.__inputPerf.reset();
    const reused = document.getElementById('recycled-ai');
    reused.removeAttribute('data-attnms');
    reused.setAttribute('role', 'listbox');
    reused.innerHTML = markup.repeat(5);
  }, suggestion);
  await page.waitForFunction(mark => {
    const reused = document.getElementById('recycled-ai');
    return !reused.closest('[' + mark + ']') && reused.getClientRects().length > 0 && reused.firstElementChild.getClientRects().length > 0;
  }, MARK, { timeout: 3000 });
  const state = await page.evaluate(mark => {
    const reused = document.getElementById('recycled-ai');
    return {
      counts: window.__inputPerf.stop(), options: reused.children.length,
      marked: !!reused.closest('[' + mark + ']') || Array.from(reused.children).some(option => !!option.closest('[' + mark + ']')),
      display: getComputedStyle(reused).display,
      focused: document.activeElement === document.getElementById('query')
    };
  }, MARK);
  assert.equal(state.options, 5);
  assert.equal(state.marked, false, 'Recycled suggestions and all hidden wrappers must be released');
  assert.notEqual(state.display, 'none');
  assert(state.focused, 'UI restoration works without ending query editing');
  assert.equal(state.counts.suggestionWalks, 0, 'Restoration does not restart the generic suggestion walk');
  return state;
}

async function overflowRecovery(page, routeChange) {
  await page.evaluate(text => {
    document.getElementById('rso').insertAdjacentHTML('afterbegin', '<section id="overflow-recycled">' + text + '</section>');
  }, errorText);
  await page.waitForFunction(mark => !!document.getElementById('overflow-recycled').closest('[' + mark + ']'), MARK);
  await page.locator('#query').focus();
  const during = await page.evaluate(async ({ text, result, mark }) => {
    window.__inputPerf.reset();
    // Existing hidden notices are deliberately moved behind enough ordinary
    // content to require multiple traversal tasks during overflow recovery.
    const bulk = document.createElement('div');
    bulk.id = 'overflow-bulk';
    bulk.innerHTML = '<div><span>長い検索結果の通常情報</span></div>'.repeat(3000);
    document.body.insertBefore(bulk, document.getElementById('initial-ai'));
    document.body.appendChild(document.getElementById('initial-ai'));
    const noise = document.createElement('div');
    document.getElementById('mount').appendChild(noise);
    for (let index = 0; index < 240; index++) noise.textContent = '背景の更新 ' + index;
    document.getElementById('overflow-recycled').innerHTML = result;
    const late = document.createElement('section');
    late.id = 'overflow-late'; late.textContent = text;
    document.body.appendChild(late);
    window.__overflowFrames = [];
    window.__watchOverflow = true;
    function sample() {
      if (!window.__watchOverflow) return;
      const kept = document.getElementById('initial-ai');
      window.__overflowFrames.push(!!kept.getClientRects().length && getComputedStyle(kept).visibility !== 'hidden');
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    await new Promise(resolve => setTimeout(resolve, 180));
    return {
      counts: window.__inputPerf.stop(),
      oldHidden: !!document.getElementById('initial-ai').closest('[' + mark + ']'),
      recycledDeferred: !!document.getElementById('overflow-recycled').closest('[' + mark + ']'),
      lateDeferred: !late.closest('[' + mark + ']')
    };
  }, { text: errorText, result: organic, mark: MARK });
  assert.equal(during.counts.treeWalks, 0, 'A long edit must not process the overflowing background queue');
  assert(during.oldHidden && during.recycledDeferred && during.lateDeferred);
  await page.evaluate(() => window.__inputPerf.reset());
  if (routeChange) await page.evaluate(() => history.pushState({}, '', '/search?q=overflow-recovery'));
  else await page.locator('#query').blur();
  await page.waitForFunction(mark => {
    const recycled = document.getElementById('overflow-recycled'), late = document.getElementById('overflow-late');
    return !recycled.closest('[' + mark + ']') && recycled.getClientRects().length > 0 && !!late.closest('[' + mark + ']');
  }, MARK, { timeout: 5000 });
  await page.evaluate(async () => { for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame); });
  const recovered = await page.evaluate(mark => {
    window.__watchOverflow = false;
    return {
      counts: window.__inputPerf.stop(), frames: window.__overflowFrames.length,
      visibleFrames: window.__overflowFrames.filter(Boolean).length,
      oldHidden: !!document.getElementById('initial-ai').closest('[' + mark + ']'),
      recycledVisible: document.getElementById('overflow-recycled').getClientRects().length > 0,
      resultVisible: document.getElementById('rso').getClientRects().length > 0,
      focusPreserved: document.activeElement === document.getElementById('query')
    };
  }, MARK);
  assert(recovered.frames >= 3, 'Overflow recovery must be sampled across actual rendering opportunities');
  assert.equal(recovered.visibleFrames, 0, 'Previously hidden AI must not flash while generic traversal catches up');
  assert(recovered.oldHidden && recovered.recycledVisible && recovered.resultVisible);
  assert(recovered.counts.globalWalks > 0 && recovered.counts.globalWalks <= 3, 'Overflow should recover with bounded full-page passes');
  if (routeChange) assert(recovered.focusPreserved, 'SPA recovery does not forcibly blur the query');
  // Verify the overflow state was reset, so later real changes are processed.
  await page.evaluate(text => {
    document.getElementById('rso').insertAdjacentHTML('beforeend', '<section id="after-overflow">' + text + '</section>');
  }, errorText);
  await page.waitForFunction(mark => !!document.getElementById('after-overflow').closest('[' + mark + ']'), MARK, { timeout: 3000 });
  return { during, recovered };
}

async function largeWorkYields(page) {
  await page.evaluate(text => {
    window.__inputPerf.reset();
    window.__inputTimerCount = null;
    const bulk = document.createElement('div');
    bulk.id = 'bulk';
    bulk.innerHTML = '<div><span>通常の情報</span></div>'.repeat(2500) + '<section id="tail-ai">' + text + '</section>';
    document.getElementById('mount').appendChild(bulk);
    setTimeout(() => { window.__inputTimerCount = window.__inputPerf.snapshot().treeWalks; }, 0);
  }, errorText);
  await page.waitForFunction(mark => window.__inputTimerCount !== null && !!document.getElementById('tail-ai').closest('[' + mark + ']'), MARK);
  await page.waitForTimeout(30);
  return page.evaluate(() => ({ timerAt: window.__inputTimerCount, ...window.__inputPerf.stop() }));
}

const checks = [];
async function scenario(name, run) {
  try {
    const evidence = await run();
    checks.push({ name, passed: true, evidence });
    console.log('PASS ' + name + ': ' + JSON.stringify(evidence));
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
    console.error('FAIL ' + name + ': ' + error.stack);
  }
}

try {
  await scenario('frozen v6.52 body-attribute failure control', async () => {
    const counts = await withRun(baseline, bodyChanges);
    assert(counts.globalWalks >= 4 && counts.treeWalks > 1000, 'Old cleanup must reproduce repeated result-wide work');
    return counts;
  });
  await scenario('body/html keyboard attributes do not restart result traversal', async () => {
    const counts = await withRun(current, bodyChanges);
    assert.equal(counts.globalWalks, 0);
    return counts;
  });
  await scenario('frozen v6.52 suggestion-subtree failure control', async () => {
    const counts = await withRun(baseline, suggestionChanges);
    assert(counts.suggestionWalks >= 150, 'Old cleanup must walk nodes under protected listbox ancestors');
    return counts;
  });
  await scenario('suggestion bursts are ignored even without query focus', async () => {
    const counts = await withRun(current, suggestionChanges);
    assert.equal(counts.suggestionWalks, 0);
    assert.equal(counts.count, 50);
    assert.equal(counts.hidden, false);
    return counts;
  });
  for (const [name, code] of [['cleanup module', current], ['full packaged script', packaged]]) {
    await scenario(name + ' preserves IME, caret, suggestions and resumes on blur', () => withRun(code, editIME));
    await scenario(name + ' resumes after SPA search with the query still focused', () => withRun(code, focusedNavigation));
    await scenario(name + ' keeps editing paused across hash and tracking updates', () => withRun(code, cosmeticHistoryWhileEditing));
    await scenario(name + ' restores a hidden AI node recycled into suggestions', () => withRun(code, recycledSearchUI));
    await scenario(name + ' recovers a long edit on blur without flashing old notices', () => withRun(code, page => overflowRecovery(page, false)));
    await scenario(name + ' recovers a long edit on SPA navigation without flashing old notices', () => withRun(code, page => overflowRecovery(page, true)));
  }
  await scenario('frozen v6.52 microtasks postpone timers until the whole traversal finishes', async () => {
    const counts = await withRun(baseline, largeWorkYields);
    assert(counts.treeWalks > 2500);
    assert.equal(counts.timerAt, counts.treeWalks, 'Old cleanup should finish all chained microtasks before the timer');
    return counts;
  });
  await scenario('large cleanup work yields to a timer before traversal finishes', async () => {
    const counts = await withRun(current, largeWorkYields);
    assert(counts.treeWalks > 2500);
    assert(counts.timerAt < counts.treeWalks, 'Input/render tasks must run between bounded cleanup chunks');
    return counts;
  });
  console.log(JSON.stringify({ kind: 'offline Chromium input performance', passed: checks.filter(check => check.passed).length, total: checks.length, checks }));
  assert(checks.every(check => check.passed), 'One or more input performance scenarios failed');
} finally { await browser.close(); }
