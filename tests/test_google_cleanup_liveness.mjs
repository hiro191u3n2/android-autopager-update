// Keep the browser in a separate process: a MutationObserver/microtask loop can
// starve its renderer and make page.evaluate(), timers, and page.close() hang.
// The parent watchdog remains independent and kills the entire worker process
// group on timeout. Fixtures use anonymous text and offline Google structure.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
const file = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const MARK = 'data-generic-google-cleanup-v648';
const location = `<dynamic-visibility-control id="location"><div><div class="O4T6Pe"><div class="vqkKIe" id="location-row" style="display:flex"><div role="heading"><span aria-label="検索の場所:" role="img"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 10 12 2l9 8v11H3Z"></path></svg></span><span class="BBwThe">例示市テスト町</span></div><div><a href="/search?q=sample" role="button">地域を選択</a></div><a role="button" aria-label="現在地情報の使用方法">⋮</a><g-dialog hidden><div role="dialog">現在地情報の使用方法</div></g-dialog></div></div></div></dynamic-visibility-control>`;
const correction = `<dynamic-visibility-control id="correction"><p role="heading"><a href="/search?q=example">例の検索</a>も含めた検索結果を表示しています<span><a href="/search?q=sample&nfpr=1">元の検索</a>のみで検索</span></p></dynamic-visibility-control>`;
const ai = '<div id="Odp5De"><div id="ai"><div>現在、AI による概要を生成できません。また後でお試しください。</div></div></div>';
const results = '<div id="center_col"><div id="rso"><article id="ordinary"><a href="https://ordinary.example/"><h3>通常の検索結果</h3></a><p>保持される検索結果の説明です。</p></article></div></div>';
function fixture(kind) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.vqkKIe{display:flex;height:44px}svg{width:20px;height:20px}g-dialog[hidden]{display:none}</style><header><input id="query" value="サンプル検索"></header><div id="rcnt"><div id="oFNiHe">${kind.startsWith('style-') ? '' : correction}${location}</div>${kind === 'stream' ? '<script src="/pause.js"></script>' : ''}${ai}${results}</div>`;
}
async function sourceFor(which) {
  if (which === 'current') return readFile(new URL('../src/google-search-cleanup.js', import.meta.url), 'utf8');
  const release = await readFile(new URL('../Android_Generic_AutoPager_v6.51.js', import.meta.url), 'utf8');
  if (which === 'release') return release;
  const start = release.indexOf('(function installGoogleSearchCleanupV648()');
  const end = release.indexOf('\n})();', start);
  assert(start >= 0 && end > start, 'Frozen v6.51 cleanup module is required');
  return release.slice(start, end + '\n})();'.length);
}
async function worker(which, kind) {
  const { chromium } = require('playwright');
  const options = { headless: true };
  if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) options.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
  if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
    const imported = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE), bundle = imported.default || imported;
    options.executablePath = await bundle.executablePath();
    options.args = bundle.args.filter(arg => arg !== '--single-process' && arg !== '--disable-web-security');
  }
  const server = await chromium.launchServer(options);
  const browser = await chromium.connect(server.wsEndpoint());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    if (route.request().url().endsWith('/pause.js')) {
      await new Promise(resolve => setTimeout(resolve, 80));
      return route.fulfill({ contentType: 'text/javascript', body: 'void 0;' });
    }
    if (route.request().isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: fixture(kind) });
    return route.abort();
  });
  if (kind.startsWith('style-')) {
    // Synthetic site-renderer stress case. This models a page component that
    // owns its inline display; it is not a claim about Google's implementation.
    await page.addInitScript({ content: `
      window.siteDisplayWrites = 0;
      new MutationObserver(records => {
        for (const record of records) {
          const row = record.target;
          if (record.type === 'attributes' && record.attributeName === 'style' && row.id === 'location-row' && row.style.getPropertyValue('display') === 'none') {
            window.siteDisplayWrites++;
            row.style.setProperty('display', 'block', 'important');
            if (${kind === 'style-and-class-owner'}) {
              row.classList.toggle('page-reasserted');
              row.setAttribute('aria-label', 'renderer-state-' + window.siteDisplayWrites);
            }
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
    ` });
  }
  if (kind === 'unrelated-styles') {
    await page.addInitScript({ content: `
      window.globalScans = 0; window.measureScans = false;
      const originalWalker = document.createTreeWalker.bind(document);
      document.createTreeWalker = function (root, ...args) {
        if (window.measureScans && (root === document || root === document.documentElement || root === document.body)) window.globalScans++;
        return originalWalker(root, ...args);
      };
    ` });
  }
  await page.addInitScript({ content: await sourceFor(which) });
  process.send?.({ ready: true, browserPid: server.process().pid });
  await page.goto('https://www.google.com/search?q=sample', { waitUntil: 'load' });
  if (kind === 'updates') {
    await page.evaluate(() => {
      document.querySelector('.BBwThe').textContent = '別の例示市';
      document.getElementById('correction').classList.add('refreshed');
      document.getElementById('ai').firstElementChild.firstChild.data = '現在、AI による概要を生成できません。また後でお試しください。';
    });
  }
  if (kind === 'unrelated-styles') {
    await page.evaluate(async () => {
      window.globalScans = 0; window.measureScans = true;
      for (let index = 0; index < 12; index++) {
        document.getElementById('query').style.color = index % 2 ? 'blue' : 'green';
        document.getElementById('ordinary').style.backgroundColor = index % 2 ? 'white' : 'silver';
        await new Promise(requestAnimationFrame);
      }
      window.measureScans = false;
    });
  }
  const state = await page.evaluate(mark => new Promise(resolve => {
    let frames = 0, timerRan = false;
    setTimeout(() => { timerRan = true; }, 25);
    function sample() {
      frames++;
      if (frames < 6 || !timerRan) return requestAnimationFrame(sample);
      const shown = id => { const element = document.getElementById(id); if (!element) return false; const style = getComputedStyle(element); return !!element.getClientRects().length && style.visibility !== 'hidden' && style.visibility !== 'collapse' && style.opacity !== '0'; };
      resolve({ frames, timerRan, resultVisible: shown('ordinary'), queryVisible: shown('query'), locationVisible: shown('location-row'), correctionVisible: shown('correction'), aiVisible: shown('ai'), resultMarked: !!document.getElementById('ordinary').closest('[' + mark + ']'), resultTop: document.getElementById('ordinary').getBoundingClientRect().top, queryBottom: document.getElementById('query').getBoundingClientRect().bottom, siteDisplayWrites: window.siteDisplayWrites || 0, globalScans: window.globalScans || 0 });
    }
    requestAnimationFrame(sample);
  }), MARK);
  if (kind === 'style-and-class-owner') {
    state.recycledVisible = await page.evaluate(() => new Promise(resolve => {
      const row = document.getElementById('location-row');
      row.innerHTML = '<a href="https://replacement.example/"><h3>新しい通常の検索結果</h3></a>';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const style = getComputedStyle(row);
        resolve(!!row.getClientRects().length && style.visibility !== 'hidden' && style.opacity !== '0');
      }));
    }));
  }
  await browser.close();
  await server.close();
  process.send?.({ result: { ...state, errors } });
}
function guarded(which, kind) {
  return new Promise(resolve => {
    const child = fork(file, ['--worker', which, kind], { detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let output = '', result, timedOut = false, browserPid;
    const kill = () => {
      timedOut = true;
      // Playwright gives Chromium its own process group. Kill that group as
      // well as the worker so the deliberately hung baseline leaves no orphan.
      for (const pid of [browserPid, child.pid].filter(Boolean)) {
        try { process.kill(process.platform === 'win32' ? pid : -pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} }
      }
    };
    let timer = setTimeout(kill, 25000);
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-4000); });
    child.stderr.on('data', chunk => { output = (output + chunk).slice(-4000); });
    child.on('message', message => {
      if (message.ready) { browserPid = message.browserPid; clearTimeout(timer); timer = setTimeout(kill, 6000); }
      if (message.result) result = message.result;
    });
    child.on('exit', code => { clearTimeout(timer); resolve({ which, kind, timedOut, code, result, output }); });
  });
}
if (process.argv[2] === '--worker') {
  try { await worker(process.argv[3], process.argv[4]); process.exit(0); }
  catch (error) { console.error(error); process.exit(1); }
} else {
  const checks = [];
  const baseline = await guarded('baseline', 'style-owner');
  assert.equal(baseline.timedOut, true, 'Frozen v6.51 must reproduce the competing inline-display observer loop');
  checks.push(baseline);
  console.log('PASS frozen v6.51 failure control: independent watchdog catches renderer starvation');
  for (const kind of ['static', 'stream', 'updates', 'style-owner', 'style-and-class-owner', 'unrelated-styles']) {
    const result = await guarded('current', kind);
    checks.push(result);
    assert.equal(result.timedOut, false, `${kind}: renderer failed external liveness watchdog`);
    assert.equal(result.code, 0, `${kind}: ${result.output}`);
    assert(result.result?.timerRan && result.result.frames >= 6, `${kind}: timers and animation frames must continue`);
    for (const name of ['resultVisible', 'queryVisible']) assert.equal(result.result[name], true, `${kind}: ${name}`);
    for (const name of ['locationVisible', 'correctionVisible', 'aiVisible', 'resultMarked']) assert.equal(result.result[name], false, `${kind}: ${name}`);
    assert.deepEqual(result.result.errors, [], `${kind}: page errors`);
    if (kind.startsWith('style-')) {
      assert(result.result.siteDisplayWrites > 0 && result.result.siteDisplayWrites <= 12, 'Competing inline-display writes must stop after a bounded number of attempts');
      assert(result.result.resultTop < result.result.queryBottom + 80, 'The suppressed strip must not leave a large blank gap before the results');
    }
    if (kind === 'style-and-class-owner') assert.equal(result.result.recycledVisible, true, 'A shielded location node recycled for a real result must become visible');
    if (kind === 'unrelated-styles') assert.equal(result.result.globalScans, 0, 'Unrelated style-only changes must not restart a document-wide tree walk');
    console.log(`PASS cleanup liveness: ${kind}`);
  }
  console.log(JSON.stringify({ kind: 'offline Chromium liveness with independent process watchdog', passed: checks.length, total: checks.length }));
}
