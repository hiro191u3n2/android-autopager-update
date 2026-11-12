import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const harness = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || '.');
const output = resolve(process.argv[3] || resolve(harness, 'build/assets'));
const { buildUserscript } = await import(pathToFileURL(resolve(root, 'worker/index.js')));
const { renderGoogleOrganicFixture, organicExpectedResults, ORGANIC_COLORS } = await import(pathToFileURL(resolve(root, 'tests/fixtures/google-organic-groups.mjs')));
const current = await buildUserscript();
const control = await readFile(resolve(root, 'Android_Generic_AutoPager_v6.53.js'), 'utf8');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'script-current.js'), current);
await writeFile(resolve(output, 'script-control.js'), control);
await writeFile(resolve(output, 'probe.js'), await readFile(resolve(harness, 'probe.js')));
for (const shape of ['mixed', 'plain']) for (const dark of [false, true]) for (const start of [0, 10, 20]) {
  let html = renderGoogleOrganicFixture(start, { compact: true, shape, dark });
  html = html.replace('</head>', '<style>#generic-autopager-status-v2{visibility:hidden!important}</style></head>');
  if (!start) {
    html = html.replace('<head>', '<head><script src="/fixture-userscript.js"></script>');
    html = html.replace('</body>', '<script src="/fixture-probe.js"></script></body>');
  }
  await writeFile(resolve(output, `fixture-${shape}-${dark ? 'dark' : 'light'}-${start}.html`), html);
}
const manifest = {
  fixture: 'Shared controlled grouped three-result DOM modeled on screenshot; no live Google traffic.',
  injection: 'Complete built userscript parsed at the start of the initial fixture head, before body content.',
  variants: Object.fromEntries([['current', current], ['control', control]].map(([key, code]) => [key, {
    version: code.match(/\/\/\s*@version\s+(\S+)/)?.[1],
    sha256: createHash('sha256').update(code).digest('hex'),
  }])),
  expected: Object.fromEntries([10, 20].map(start => [String(start), organicExpectedResults(start, { compact: true })])),
  colors: Object.fromEntries(Object.entries(ORGANIC_COLORS).map(([theme, values]) => [theme, values.rgb])),
  pageColors: Object.fromEntries(Object.entries(ORGANIC_COLORS).map(([theme, values]) => [theme,
    values.page.slice(1).match(/../g).map(channel => parseInt(channel, 16))])),
};
await writeFile(resolve(output, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ...manifest, expected: 'Stored per-page expectations in build-manifest.json.' }, null, 2));
