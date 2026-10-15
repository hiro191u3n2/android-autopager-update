import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const projectDir = resolve(process.argv[2] || "/workspace/sites/android-autopager-update");
const outputDir = resolve(process.argv[3] || "./android-autopager-release");
const version = String(process.argv[4] || "");
const baseUrl = "https://hiro191u3n2.github.io/android-autopager-update";

assert.match(version, /^\d+\.\d+\.\d+$/, "Pass an explicit x.y.z release version");

const workerUrl = `${pathToFileURL(resolve(projectDir, "worker/index.js")).href}?release=${Date.now()}`;
const workerModule = await import(workerUrl);
assert.equal(typeof workerModule.default?.fetch, "function", "Worker must export default.fetch");

const response = await workerModule.default.fetch(
  new Request("https://source.invalid/android-generic-autopager.user.js"),
  {},
  {},
);
assert.equal(response.status, 200, "Canonical userscript route must return 200");
const original = await response.text();

const headerEnd = "// ==/UserScript==";
const endIndex = original.indexOf(headerEnd);
assert(endIndex >= 0, "Userscript metadata terminator is missing");
assert.equal(original.indexOf(headerEnd, endIndex + 1), -1, "Metadata terminator must be unique");

let userscript = original;
function replaceHeader(name, value) {
  const pattern = new RegExp(`^// @${name}\\s+.*$`, "gm");
  const matches = userscript.match(pattern) || [];
  assert.equal(matches.length, 1, `Expected one @${name} header line`);
  userscript = userscript.replace(pattern, `// @${name.padEnd(13)}${value}`);
}

replaceHeader("version", version);
replaceHeader("downloadURL", `${baseUrl}/android-generic-autopager.user.js`);
replaceHeader("updateURL", `${baseUrl}/android-generic-autopager.meta.js`);
replaceHeader("homepageURL", `${baseUrl}/`);

assert(!userscript.includes("android-autopager-update.otoha10.chatgpt.site"));
const originalBody = original.slice(endIndex + headerEnd.length);
const migratedEndIndex = userscript.indexOf(headerEnd);
const releaseBody = userscript.slice(migratedEndIndex + headerEnd.length);
assert.equal(releaseBody, originalBody, "Release packaging changed the executable body");
new Function(userscript);

for (const marker of [
  "// @grant        GM_xmlhttpRequest",
  "// @grant        GM.xmlHttpRequest",
  "// @grant        unsafeWindow",
  "// @connect      buzzap.jp",
  "// @connect      www.buzzap.jp",
  "__androidGenericBuzzapPagerV624",
  "__androidGenericYahooArticleVideoGuardV632",
  "generic-yahoo-article-edge-ua-v632",
  "genericYahooArticleVideoOverlayV632",
  "yvpubLoadedcontentdata",
  "EdgA/46.1.2.5140",
  "generic-yahoo-home-ua-v631",
  "news\\.yahoo\\.co\\.jp",
  "supjav\\.com",
  "google",
]) {
  assert(userscript.includes(marker), `Required behavior marker is missing: ${marker}`);
}

for (const forbiddenMarker of [
  "// @noframes",
  "generic-yahoo-news-edge-ua-v27",
  "generic-yahoo-news-chrome-ua-v630",
  "generic-yahoo-article-video-poster-v631",
  "__androidGenericYahooArticleVideoPosterV631",
  "__androidGenericYahooNativeVideoV630",
  "feapi-yvpub.yahooapis.jp",
]) {
  assert(
    !userscript.includes(forbiddenMarker),
    `Yahoo article video regression marker is still present: ${forbiddenMarker}`,
  );
}

const metadata = `${userscript.slice(0, migratedEndIndex + headerEnd.length)}\n`;
const displayVersion = version.replace(/\.0$/, "");
const aliasFilename = `Android_Generic_AutoPager_v${displayVersion}.js`;

const page = await readFile(resolve(projectDir, "index.html"), "utf8");
assert(page.includes(`<span class="version">v${version}</span>`));

const readme = `# Android 汎用オートページャー

AdGuard向けユーザースクリプトの固定更新配布です。

- インストールページ: ${baseUrl}/
- 固定スクリプトURL: ${baseUrl}/android-generic-autopager.user.js
- 更新メタデータ: ${baseUrl}/android-generic-autopager.meta.js
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "index.html"), page),
  writeFile(resolve(outputDir, "android-generic-autopager.user.js"), userscript),
  writeFile(resolve(outputDir, "android-generic-autopager.meta.js"), metadata),
  writeFile(resolve(outputDir, aliasFilename), userscript),
  writeFile(resolve(outputDir, ".nojekyll"), ""),
  writeFile(resolve(outputDir, "README.md"), readme),
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
console.log(JSON.stringify({
  outputDir,
  version,
  aliasFilename,
  userscriptBytes: Buffer.byteLength(userscript),
  userscriptSha256: sha256(userscript),
  metadataSha256: sha256(metadata),
  bodySha256: sha256(releaseBody),
}, null, 2));
