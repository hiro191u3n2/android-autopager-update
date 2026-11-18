import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const launch = { headless: true };
if (process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE) launch.executablePath = process.env.GOOGLE_TEST_CHROMIUM_EXECUTABLE;
if (process.env.GOOGLE_TEST_CHROMIUM_MODULE) {
  const bundled = require(process.env.GOOGLE_TEST_CHROMIUM_MODULE);
  const binary = bundled.default || bundled;
  launch.executablePath = await binary.executablePath();
  launch.args = binary.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg));
}
const module = await readFile(new URL('../src/google-import-layout.js', import.meta.url), 'utf8');
const frozen = await readFile(new URL('../Android_Generic_AutoPager_v6.67.js', import.meta.url), 'utf8');
const before = frozen.slice(frozen.indexOf('const genericGoogleLayoutSourcesV647'), frozen.indexOf('// Prepare only a detached Google result page.'));
const browser = await chromium.launch(launch);
try {
  for (const [label, old, ancestor, own, expected, recognized, reflow] of [
    ['v6.67 missing source backdrop', true, '#f1f3f4', 'transparent', [255, 255, 255], false],
    ['transparent wrappers', false, '#f1f3f4', 'transparent', [241, 243, 244], false],
    ['recognized cards keep exact source color', false, '#f1f3f4', 'transparent', [241, 243, 244], true],
    ['dark source backdrop', false, '#333438', 'transparent', [51, 52, 56], false],
    ['opaque root', false, '#f1f3f4', '#566677', [86, 102, 119], false],
    ['gradient ancestor', false, 'linear-gradient(red,blue)', 'transparent', [255, 255, 255], false],
    ['translucent ancestor', false, 'rgba(90,60,30,.4)', 'transparent', [255, 255, 255], false],
    ['v6.67 frozen absolute background', true, 'white', '#f1f3f4', [255, 255, 255], false, true],
    ['percentage backdrop follows resized card', false, 'white', '#f1f3f4', [241, 243, 244], false, true],
  ]) {
    const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
    try {
      const overlay = reflow ? '<div class="overlay"><div class="edge"></div></div>' : '';
      const cards = [1, 2, 3].map(i => '<div class="MjjYud"><div class="face">'+overlay+'<a href="https://shop'+i+'.example/">'+
        (recognized ? '<cite>https://shop'+i+'.example</cite>' : '')+'<h3>Result '+i+'</h3></a><p>Result description</p></div></div>').join('');
      const html = '<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:white}.back{background:'+ancestor+
        '}.face{position:relative;background:white;padding:9px}.overlay{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;background:white}.edge{height:calc(100% + 2px);margin:-1px 0;background:white}.MjjYud{margin-bottom:8px}h3,p{margin:0}#rso{background:'+own+
        '}iframe{display:block;width:100%;height:500px;border:none}</style>';
      await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: html +
        (route.request().url().includes('next') ? '<div class="back"><main><div><div><div><div id="rso">'+cards+'</div></div></div></div></main></div>' : '<section class="generic-autopager-page"></section>') }));
      await page.goto('https://www.google.com/search?q=backdrop');
      await page.addScriptTag({ content: old ? before : module });
      const points = await page.evaluate(async ({ reflow, old }) => {
        const frame = document.createElement('iframe');
        frame.src = '/search?q=next';
        const loaded = new Promise(done => frame.onload = done);
        document.body.append(frame);
        await loaded;
        const source = frame.contentDocument.querySelector('#rso');
        if (!await captureGenericGoogleLayoutV647(source)) throw Error('layout capture');
        const clone = document.importNode(source, true);
        if (!await applyGenericGoogleLayoutV647(source, clone)) throw Error('layout import');
        frame.remove();
        clone.classList.add('generic-autopager-google-source-root');
        const section = document.querySelector('section');
        section.append(clone);
        if (reflow) {
          for (const face of clone.querySelectorAll('.face')) {
            const original = face.getBoundingClientRect().height;
            face.style.setProperty('height', (original - 5) + 'px', 'important');
            const overlay = face.querySelector('.overlay').getBoundingClientRect().height;
            const outline = face.querySelector('.edge').getBoundingClientRect().height;
            if (Math.abs(overlay - (old ? original : original - 5)) > .1 || Math.abs(outline - overlay - 2) > .1) {
              throw Error('Percentage background or outline failed to follow its card');
            }
          }
        }
        repairGenericGoogleResultBoundariesV658(section);
        const boxes = [...clone.querySelectorAll('.face')].map(node => node.getBoundingClientRect());
        return boxes.slice(1).map((box, index) => {
          if (Math.abs(box.top - boxes[index].bottom - 8) > .1) throw Error('gap height changed');
          return Math.floor((box.top + boxes[index].bottom)/2);
        });
      }, { reflow, old });
      const png = await page.screenshot();
      const pixels = await page.evaluate(async ({ png, points }) => {
        const blob = new Blob([Uint8Array.from(atob(png), c => c.charCodeAt(0))], { type:'image/png' });
        const image = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        return points.map(y => [...ctx.getImageData(70, y, 1, 1).data].slice(0, 3));
      }, { png: png.toString('base64'), points });
      assert.deepEqual(pixels, [expected, expected], label);
      console.log('PASS Google imported source backdrop: ' + label);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
