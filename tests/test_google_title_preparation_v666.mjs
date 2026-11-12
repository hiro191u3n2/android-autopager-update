// Controlled title-network timing. These checks do not claim native Android
// scroll performance; they verify the shared wait budget and stable fallback.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const moduleText = await readFile(new URL('../src/google-import-staging.js', import.meta.url), 'utf8');
const parseVideo = href => ({ videoId: new URL(href).searchParams.get('v') });
const applyTitle = (node, title) => { node.textContent = title; };
let passed = 0;

function setup(count = 5) {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://www.google.com/search?q=title-preparation', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  window.eval(moduleText);
  const source = window.document.createElement('section');
  source.innerHTML = Array.from({ length: count }, (_, index) => `<article><a href="https://www.youtube.com/watch?v=video00000${index}"><h3>Google title ${index}</h3></a></article>`).join('');
  window.document.body.appendChild(source);
  const cache = new Map(), requests = [];
  let active = 0, maxActive = 0;
  const resolver = (delay = () => 400) => async video => {
    if (cache.has(video.videoId)) return cache.get(video.videoId);
    requests.push(video.videoId); active++; maxActive = Math.max(maxActive, active);
    const promise = new Promise(resolve => window.setTimeout(() => {
      active--;
      resolve('Resolved title ' + video.videoId);
    }, delay(video.videoId)));
    cache.set(video.videoId, promise); // Match the actual resolver's in-flight cache.
    const result = await promise;
    cache.set(video.videoId, result);
    return result;
  };
  let listeners = 0;
  const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window);
  window.addEventListener = (type, ...args) => { if (type === 'scroll') listeners++; return add(type, ...args); };
  window.removeEventListener = (type, ...args) => { if (type === 'scroll') listeners--; return remove(type, ...args); };
  return { window, clock, source, requests, resolver,
    maxActive: () => maxActive, listenerCount: () => listeners,
    close: () => { clock.uninstall(); window.close(); } };
}

{
  const test = setup(8);
  try {
    const { window, clock, source, requests } = test, original = source.outerHTML;
    const resolveTitle = test.resolver();
    const preparation = window.primeGenericGoogleTitlesV666(source, parseVideo, resolveTitle);
    assert.equal(preparation.startedAt, 0);
    assert.equal(requests.length, 3, 'Priming starts no more than three workers');
    await clock.tickAsync(1250); // The source frame can hydrate during all three batches.
    assert.equal(source.outerHTML, original, 'Priming never changes the connected source headings');
    assert.equal(requests.length, 8);
    assert.equal(test.maxActive(), 3);
    const clone = source.cloneNode(true);
    await window.prepareGenericGoogleTitlesV663(clone, parseVideo, resolveTitle, applyTitle, { preparation, shouldYield: () => false });
    assert.equal(window.performance.now(), 1250, 'Cached preparation adds no second network wait');
    assert.equal(requests.length, 8, 'Priming and preparation reuse one request per video');
    assert([...clone.querySelectorAll('h3')].every(node => node.textContent.startsWith('Resolved title')));
    assert.equal(clock.countTimers(), 0, 'Completed priming and preparation clear all internal timers');
    assert.equal(test.listenerCount(), 0);
    console.log('PASS v666 titles: hydration overlap, three-worker limit, cache reuse and source immutability'); passed++;
  } finally { test.close(); }
}

{
  const test = setup(12);
  try {
    const { window, clock, source, requests } = test;
    const resolveTitle = test.resolver(() => 6000);
    const preparation = window.primeGenericGoogleTitlesV666(source, parseVideo, resolveTitle);
    await clock.tickAsync(1300);
    const clone = source.cloneNode(true), original = clone.outerHTML;
    let done = false;
    const pending = window.prepareGenericGoogleTitlesV663(clone, parseVideo, resolveTitle, applyTitle, { preparation, shouldYield: () => false }).then(() => { done = true; });
    await clock.tickAsync(899);
    assert.equal(done, false);
    await clock.tickAsync(1); await pending;
    assert.equal(window.performance.now(), 2200, 'The entire title budget begins at priming, not at clone preparation');
    assert.equal(clone.outerHTML, original);
    assert.equal(test.listenerCount(), 0, 'Deadline removes its scroll subscription');
    window.document.body.appendChild(clone);
    source.remove();
    await clock.tickAsync(10000);
    assert.equal(requests.length, 3, 'Expired prime and preparation workers never drain the remaining queue');
    assert.equal(clone.outerHTML, original, 'Late cached results cannot mutate displayed fallback titles');
    assert.equal(clock.countTimers(), 0);
    console.log('PASS v666 titles: one shared 2.2-second budget, bounded slow queue and no late visible rewrite'); passed++;
  } finally { test.close(); }
}

{
  const test = setup(5);
  try {
    const { window, clock, source } = test;
    const resolveTitle = test.resolver(id => id.endsWith('0') ? 100 : 5000);
    const preparation = window.primeGenericGoogleTitlesV666(source, parseVideo, resolveTitle);
    await clock.tickAsync(120);
    const clone = source.cloneNode(true);
    let urgent = false, done = false;
    const pending = window.prepareGenericGoogleTitlesV663(clone, parseVideo, resolveTitle, applyTitle, { preparation, shouldYield: () => urgent }).then(() => { done = true; });
    await clock.tickAsync(180);
    assert.equal(done, false);
    assert.equal(test.listenerCount(), 1);
    urgent = true;
    window.dispatchEvent(new window.Event('scroll'));
    await pending;
    assert.equal(window.performance.now(), 300, 'A reader reaching the boundary releases the pending wait immediately');
    const titles = [...clone.querySelectorAll('h3')].map(node => node.textContent);
    assert.equal(titles[0], 'Resolved title video000000');
    assert(titles.slice(1).every(title => title.startsWith('Google title')), 'Unresolved videos retain the exact original Google heading');
    assert.equal(test.listenerCount(), 0);
    window.document.body.appendChild(clone);
    source.remove();
    const original = clone.outerHTML;
    await clock.tickAsync(10000);
    assert.equal(clone.outerHTML, original);
    assert.equal(clock.countTimers(), 0, 'Urgent completion leaves no polling or deadline timer');
    console.log('PASS v666 titles: mid-wait scroll urgency publishes only ready titles and preserves stable fallbacks'); passed++;
  } finally { test.close(); }
}

{
  const test = setup(5);
  try {
    const { window, clock, source, requests } = test;
    const resolveTitle = test.resolver(id => id.endsWith('0') ? 100 : 5000);
    const preparation = window.primeGenericGoogleTitlesV666(source, parseVideo, resolveTitle);
    await clock.tickAsync(120);
    assert.equal(preparation.titles.size, 1);
    const clone = source.cloneNode(true), requestsBefore = requests.length;
    let prepareCalls = 0;
    await window.prepareGenericGoogleTitlesV663(clone, parseVideo, video => {
      prepareCalls++;
      return resolveTitle(video);
    }, applyTitle, { preparation, shouldYield: () => true });
    assert.equal(window.performance.now(), 120, 'Initial urgency does not wait for unresolved primed work');
    assert.equal(prepareCalls, 0, 'Urgent preparation neither starts nor joins optional resolver work');
    assert.equal(requests.length, requestsBefore);
    const titles = [...clone.querySelectorAll('h3')].map(node => node.textContent);
    assert.equal(titles[0], 'Resolved title video000000', 'Ready primed restoration survives initial urgency');
    assert(titles.slice(1).every(title => title.startsWith('Google title')));
    assert.equal(test.listenerCount(), 0, 'The synchronous urgent path installs no scroll listener');
    window.document.body.appendChild(clone);
    source.remove();
    const original = clone.outerHTML;
    await clock.tickAsync(10000);
    assert.equal(clone.outerHTML, original);
    assert.equal(requests.length, requestsBefore, 'Closed priming workers never start another batch');
    assert.equal(preparation.titles.size, 1, 'Late titles are not added to the expired preparation token');
    assert.equal(clock.countTimers(), 0);
    console.log('PASS v666 titles: initial urgency retains already primed titles with no extra wait or requests'); passed++;
  } finally { test.close(); }
}

{
  const test = setup(2);
  try {
    const { window, clock, source } = test;
    let urgent = false, done = false;
    const clone = source.cloneNode(true), original = clone.outerHTML;
    const never = () => new Promise(() => {});
    const pending = window.prepareGenericGoogleTitlesV663(clone, parseVideo, never, applyTitle, { shouldYield: () => urgent }).then(() => { done = true; });
    await clock.tickAsync(20); urgent = true;
    await clock.tickAsync(29); assert.equal(done, false);
    await clock.tickAsync(1); await pending;
    assert.equal(clone.outerHTML, original);
    assert.equal(test.listenerCount(), 0);
    assert.equal(clock.countTimers(), 0, 'The fallback state poll also cleans itself up');
    let requests = 0;
    await window.prepareGenericGoogleTitlesV663(clone, parseVideo, () => { requests++; }, applyTitle, { shouldYield: () => true });
    assert.equal(requests, 0, 'Already urgent readers do not start optional title work');
    await clock.tickAsync(2300);
    await window.prepareGenericGoogleTitlesV663(clone, parseVideo, () => { requests++; }, applyTitle, { startedAt: 0 });
    assert.equal(requests, 0, 'An exhausted shared budget does not start another batch');
    assert.equal(clone.outerHTML, original);
    console.log('PASS v666 titles: urgency without a scroll event, initial urgency and exhausted-budget fallback'); passed++;
  } finally { test.close(); }
}

{
  const test = setup(4);
  try {
    const { window, clock, source } = test;
    let requests = 0;
    window.primeGenericGoogleTitlesV666(source, parseVideo, () => { requests++; return Promise.reject(new Error('offline')); });
    await clock.tickAsync(0);
    assert.equal(requests, 4, 'Failed priming requests settle without unhandled rejection');
    assert.equal(clock.countTimers(), 0);
    const detached = source.cloneNode(true);
    assert.equal(window.primeGenericGoogleTitlesV666(detached, parseVideo, () => { requests++; }), undefined);
    assert.equal(requests, 4, 'Priming is restricted to the connected source');
    let finished = false;
    const pending = window.prepareGenericGoogleTitlesV663(detached, parseVideo, () => new Promise(() => {}), applyTitle).then(() => { finished = true; });
    await clock.tickAsync(2199); assert.equal(finished, false);
    await clock.tickAsync(1); await pending;
    assert.equal(finished, true, 'Calls without options retain the original 2.2-second deadline');
    assert.equal(clock.countTimers(), 0);
    console.log('PASS v666 titles: rejection handling, connected-source guard and unchanged default deadline'); passed++;
  } finally { test.close(); }
}

console.log(`PASS ${passed} v666 title-preparation timing groups`);
