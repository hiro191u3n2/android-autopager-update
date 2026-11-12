// Scheduling/lifecycle checks; complete-script browser tests cover real imports.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const source = await readFile(new URL('../src/google-read-ahead.js', import.meta.url), 'utf8');
const staging = await readFile(new URL('../src/google-import-staging.js', import.meta.url), 'utf8');
let passed = 0;

function create(url = 'https://www.google.com/search?q=read-ahead') {
  const dom = new JSDOM('<!doctype html><input id="query"><main id="rso"></main>', {
    url, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom, doc = window.document;
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  window.eval(staging + '\n' + source);
  const state = { target: doc.getElementById('rso'), loading: false, paused: false, stopped: false, nextUrl: '/search?q=read-ahead&start=10', pages: 1 };
  const loads = [];
  const helper = window.createGenericGoogleReadAheadV665(state, () => { loads.push(state.pages + 1); state.loading = true; });
  const emit = name => window.dispatchEvent(new window.Event(name));
  const tick = () => clock.tick(20);
  const close = () => { helper?.dispose(); clock.uninstall(); window.close(); };
  return { window, doc, state, helper, loads, emit, tick, close, clock };
}

{
  const test = create();
  try {
    const { state, helper, window, emit, clock } = test;
    let remaining = window.innerHeight;
    state.target.getBoundingClientRect = () => ({ bottom: window.innerHeight + remaining });
    assert.equal(helper.urgent(), false, 'An idle reader retains the normal title-resolution budget');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
    emit('scroll');
    assert.equal(helper.urgent(), true, 'Moving toward the available end releases optional title waiting');
    remaining = window.innerHeight * 3;
    assert.equal(helper.urgent(), false, 'Ample loaded content retains the title budget even during motion');
    remaining = window.innerHeight;
    clock.tick(400);
    assert.equal(helper.urgent(), false, 'Stopped motion with spare content returns to normal title preparation');
    remaining = 0;
    assert.equal(helper.urgent(), true, 'A reader already clamped at the end does not need further scroll events');
    state.paused = true;
    assert.equal(helper.urgent(), true, 'Pause releases optional title waiting before stale-append rejection');
    console.log('PASS read-ahead unit: title urgency distinguishes idle, motion, headroom, end clamp and pause'); passed++;
  } finally { test.close(); }
}

{
  const test = create();
  try {
    const { state, helper, loads, emit, tick, doc, window } = test;
    tick();
    assert.deepEqual(loads, [2], 'Page 2 starts without a last-moment sentinel crossing');
    let top = window.innerHeight * 5, reads = 0;
    const page2 = doc.createElement('section');
    page2.getBoundingClientRect = () => { reads++; return { top }; };
    state.target.appendChild(page2);
    helper.appended(page2);
    state.pages = 2; state.loading = false;
    helper.schedule(); tick();
    assert.deepEqual(loads, [2], 'A distant prepared page does not recursively request page 3');
    const initialReads = reads;
    for (let n = 0; n < 100; n++) emit('scroll');
    tick();
    assert.equal(reads - initialReads, 1, 'Scroll bursts use one constant-size geometry read per animation frame');
    top = window.innerHeight * 2;
    emit('scroll'); tick();
    assert.deepEqual(loads, [2, 3], 'Entering the one-viewport lead starts page 3');
    for (let n = 0; n < 100; n++) { emit('scroll'); tick(); }
    assert.deepEqual(loads, [2, 3], 'An in-flight request cannot be duplicated');
    helper.dispose(); state.loading = false;
    emit('scroll'); helper.schedule(); tick();
    assert.deepEqual(loads, [2, 3], 'Disposed handlers and scheduled callbacks cannot load');
    console.log('PASS read-ahead unit: eager first advance, bounded next page, coalesced geometry and no duplicate requests'); passed++;
  } finally { test.close(); }
}

{
  const test = create();
  try {
    const { state, helper, loads, tick, doc, emit } = test;
    state.paused = true; tick();
    assert.equal(loads.length, 0, 'Initial pause prevents prefetch');
    state.paused = false; state.stopped = true; helper.schedule(); tick();
    assert.equal(loads.length, 0, 'Failure/end state prevents prefetch');
    state.stopped = false; state.nextUrl = null; helper.schedule(); tick();
    assert.equal(loads.length, 0, 'No next URL prevents prefetch');
    state.nextUrl = '/search?q=read-ahead&start=10';
    const input = doc.getElementById('query'); input.focus(); helper.schedule(); tick();
    assert.equal(loads.length, 0, 'Focused input suppresses preparation');
    input.blur(); tick();
    assert.deepEqual(loads, [2], 'Focusout resumes preparation automatically');
    state.loading = false;
    Object.defineProperty(doc, 'hidden', { configurable: true, value: true });
    doc.dispatchEvent(new test.window.Event('visibilitychange'));
    helper.schedule(); emit('scroll'); tick();
    assert.equal(loads.length, 1, 'Hidden document does not schedule work');
    Object.defineProperty(doc, 'hidden', { configurable: true, value: false });
    doc.dispatchEvent(new test.window.Event('compositionstart'));
    doc.dispatchEvent(new test.window.Event('visibilitychange')); tick();
    assert.equal(loads.length, 1, 'Composition suppresses preparation even without an active input');
    doc.dispatchEvent(new test.window.Event('compositionend')); tick();
    assert.equal(loads.length, 2, 'Compositionend resumes preparation');
    console.log('PASS read-ahead unit: pause, stop, no-next, focus, composition and visibility guards'); passed++;
  } finally { test.close(); }
}

{
  const test = create();
  try {
    const { helper, loads, state, emit, tick, window } = test;
    const ticket = helper.ticket();
    assert(helper.valid(ticket));
    emit('pagehide'); tick();
    assert.equal(loads.length, 0, 'Pagehide cancels pending first advance');
    assert.equal(helper.valid(), false, 'Suspended page rejects imports');
    emit('pageshow');
    assert(helper.valid(), 'BFCache pageshow resumes the original document');
    assert.equal(helper.valid(ticket), false, 'A pre-pagehide response stays invalid after pageshow');
    assert(helper.valid(helper.ticket()), 'A new request receives the restored generation');
    tick();
    assert.deepEqual(loads, [2]);
    state.loading = false;
    window.history.pushState(null, '', '/search?q=different');
    assert.equal(helper.valid(), false, 'Query identity change invalidates old imports');
    window.history.replaceState(null, '', '/search?q=read-ahead');
    helper.schedule(); emit('scroll'); tick();
    assert.equal(loads.length, 1, 'An invalidated route cannot reactivate its old pager');
    console.log('PASS read-ahead unit: BFCache request generations and permanent stale-route disposal'); passed++;
  } finally { test.close(); }
}

{
  const test = create();
  try {
    test.state.target.remove();
    test.tick();
    assert.equal(test.helper.valid(), false, 'Detached result target rejects stale imports');
    assert.deepEqual(test.loads, []);
  } finally { test.close(); }
  for (const url of ['https://example.com/search?q=read-ahead', 'https://www.google.com/search?q=read-ahead&udm=50']) {
    const test = create(url);
    try { assert.equal(test.helper, null); test.tick(); assert.deepEqual(test.loads, []); } finally { test.close(); }
  }
  console.log('PASS read-ahead unit: detached target, non-Google and AI Mode isolation'); passed++;
}
console.log(`PASS ${passed} read-ahead lifecycle groups`);
