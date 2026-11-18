import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildUserscript } from '../../worker/index.js';
import { renderGoogleMobileFrameFixture } from '../fixtures/google-mobile-frames.mjs';

const [, , project, output] = process.argv;
await mkdir(output, { recursive: true });
const variants = {
  control: await readFile(path.join(project, 'Android_Generic_AutoPager_v6.67.js'), 'utf8'),
  current: await buildUserscript(),
};
const versions = {};
for (const [variant, code] of Object.entries(variants)) {
  const version = code.match(/^\/\/ @version\s+(\S+)/m)?.[1];
  assert.equal(version, variant === 'control' ? '6.67.0' : '6.68.0');
  versions[variant] = { version, sha256: createHash('sha256').update(code).digest('hex') };
  await writeFile(path.join(output, 'script-' + variant + '.js'), code);
}
await writeFile(path.join(output, 'frame-build.json'), JSON.stringify(versions, null, 2));
await copyFile(new URL('./frame-probe.js', import.meta.url), path.join(output, 'probe.js'));
for (const shape of ['captured', 'grid']) for (const dark of [false, true]) {
  for (const start of [0, 10, 20]) {
    let html = renderGoogleMobileFrameFixture(start, { dark, variant: shape });
    assert(html.includes('<head>') && html.includes('</head>') && html.includes('</body>'));
    html = html.replace('</head>', '<style>#generic-autopager-status-v2{visibility:hidden!important}</style></head>');
    if (!start) {
      html = html.replace('<head>', '<head><script src="/fixture-userscript.js"></script>');
      html = html.replace('</body>', '<script src="/fixture-probe.js"></script></body>');
    }
    await writeFile(path.join(output, `fixture-${shape}-${dark ? 'dark' : 'light'}-${start}.html`), html);
  }
}
