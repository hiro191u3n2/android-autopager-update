import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const releaseDir = resolve(process.argv[2] || "./android-autopager-release");
const version = String(process.argv[3] || "");
const baseUrl = "https://hiro191u3n2.github.io/android-autopager-update";
assert.match(version, /^\d+\.\d+\.\d+$/);

const displayVersion = version.replace(/\.0$/, "");
const aliasFilename = `Android_Generic_AutoPager_v${displayVersion}.js`;
const [userscript, metadata, alias, page, readme, nojekyllStat] = await Promise.all([
  readFile(resolve(releaseDir, "android-generic-autopager.user.js"), "utf8"),
  readFile(resolve(releaseDir, "android-generic-autopager.meta.js"), "utf8"),
  readFile(resolve(releaseDir, aliasFilename), "utf8"),
  readFile(resolve(releaseDir, "index.html"), "utf8"),
  readFile(resolve(releaseDir, "README.md"), "utf8"),
  stat(resolve(releaseDir, ".nojekyll")),
]);

const headerEnd = "// ==/UserScript==";
const headerEndIndex = userscript.indexOf(headerEnd);
assert(headerEndIndex >= 0);
assert.equal(metadata, `${userscript.slice(0, headerEndIndex + headerEnd.length)}\n`);
assert.equal(alias, userscript, "Versioned alias must equal the fixed userscript");
assert.equal(nojekyllStat.size, 0, ".nojekyll must be empty");

for (const line of [
  `// @version      ${version}`,
  `// @downloadURL  ${baseUrl}/android-generic-autopager.user.js`,
  `// @updateURL    ${baseUrl}/android-generic-autopager.meta.js`,
  `// @homepageURL  ${baseUrl}/`,
]) {
  assert(userscript.includes(line), `Missing header line: ${line}`);
}

assert(!userscript.includes("android-autopager-update.otoha10.chatgpt.site"));
assert(page.includes(`<span class="version">v${version}</span>`));
assert(page.includes('href="./android-generic-autopager.user.js"'));
assert(readme.includes(`${baseUrl}/android-generic-autopager.user.js`));
new Function(userscript);

console.log(`Validated GitHub Pages release for Android 汎用オートページャー ${version}`);
