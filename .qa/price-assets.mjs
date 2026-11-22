import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { priceToggleCaptionPage } from '../tests/fixtures/google-price-accordions.mjs';
import { buildUserscript } from '../worker/index.js';
const [, , project, output] = process.argv;
const save = (name, data) => writeFile(join(output, name), data);
await save('script-control.js', await readFile(join(project,'Android_Generic_AutoPager_v6.75.js')));
await save('script-current.js', await buildUserscript());
await save('fixture-end.html', '<title>End</title>');
await save('probe.js', `window.__autoPagerFixture = {
  scroll(number) { document.querySelector('.generic-autopager-page[data-page="' + number + '"]')?.scrollIntoView(); },
  snapshot(number) {
    const root = document.querySelector('#rso');
    const visible = el => el.getBoundingClientRect().height > 0;
    return {
      page:number, gap:root.querySelector('[data-keep="shop"]').getBoundingClientRect().top - root.querySelector('[data-keep="images"]').getBoundingClientRect().bottom,
      frameCount:[...document.querySelectorAll('[data-price-frame]')].filter(visible).length,
      visibleSections: ['images','shop','questions','article','videos'].map(name=>[...document.querySelectorAll('[data-keep="'+name+'"]')].filter(visible).length)
    };
  }
};`);
for (const start of [0,10,20]) {
  let html = priceToggleCaptionPage(start).replaceAll('/salmon.svg','data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E');
  if (!start) html = html.replace('<head>', '<head><script src="/fixture-userscript.js"></script>').replace('</body>', '<script src="/fixture-probe.js"></script></body>');
  await save('fixture-captured-light-' + start + '.html',html);
}
