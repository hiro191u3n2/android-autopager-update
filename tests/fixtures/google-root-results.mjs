/**
 * Structural regression model derived from selected fields of the user's
 * v6.59 diagnostic: transparent root-level MjjYud siblings, opaque nested
 * Ww4FFb surfaces, 8px margins, source/title links and a duplicate base-domain
 * site-name/subdomain URL. This is NOT captured Google HTML or a live replay.
 * Text and domains below are neutral examples; all image assets are inline.
 */
import { ORGANIC_COLORS, ORGANIC_FAVICON, ORGANIC_THUMBNAIL } from './google-organic-groups.mjs';

export const GOOGLE_ROOT_GAP_PX = 8;
export const GOOGLE_ROOT_MAX_WIDTH = 499.78125;
export const GOOGLE_ROOT_QUERY = 'root-result-fixture';
export const GOOGLE_ROOT_COLORS = ORGANIC_COLORS;
export const GOOGLE_ROOT_BOUNDARIES = {
  missing: { before: [0, 0, 0], after: [8, 8, 8] },
  native: { before: [8, 8, 8], after: [8, 8, 8] },
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const templates = [
  { name: '中央店のご案内', origin: 'https://restaurant.example', title: '中央店の店舗案内', thumbnail: true },
  { name: 'dining.example', origin: 'https://r.dining.example', title: '地域の飲食店を探す', thumbnail: true },
  { name: '川辺店のご案内', origin: 'https://restaurant.example', title: '川辺店の店舗案内' },
  { name: '駅前店のご案内', origin: 'https://restaurant.example', title: '駅前店の店舗案内', sitelinks: true },
];
const protectedPairs = ['border', 'native-band', 'unknown', 'card', 'shadow', 'clip'];

export function googleRootNativeMarkup() {
  return '<article id="organic-native"><div>最初の検索ページ</div><h3><a href="https://native.example/first">初回の店舗案内</a></h3><p>最初に表示された結果の説明文と区切りを保ちます。</p></article>';
}

export function googleRootExpectedResults(start, { compact = true } = {}) {
  const result = (group, index, template = {}) => ({
    id: `${group}-${start}-${index + 1}`, group, index: index + 1,
    name: template.name || `${group} 店舗案内 ${index + 1}`,
    origin: template.origin || `https://${group}${index + 1}.example`,
    title: template.title || `${group} の店舗情報 ${index + 1}`,
    href: `${template.origin || `https://${group}${index + 1}.example`}/root-fixture/${start}/${group}/${index + 1}`,
    snippet: `店舗案内 ${start}-${group}-${index + 1}。営業時間は11時から19時まで。店内でのお食事と持ち帰りを案内しています。`,
    thumbnail: template.thumbnail ? ORGANIC_THUMBNAIL : null,
    sitelinks: Boolean(template.sitelinks),
  });
  const main = templates.map((template, index) => result('root', index, template));
  if (compact) return main;
  return [...main, ...protectedPairs.flatMap(group => [result(group, 0), result(group, 1)]),
    result('columns', 0), result('columns', 1)];
}

function source(result) {
  // Both labels have their own child wrapper below the source-only header.
  // The second result intentionally uses a base-domain name and subdomain URL.
  return `<div class="organic-source-header"><img class="organic-favicon" width="24" height="24" alt="" src="${escape(ORGANIC_FAVICON)}"><div class="N54PNb BToiNc cvP2Ce organic-source-text"><div><div class="organic-site-name">${escape(result.name)}</div></div><div><span class="organic-source-url" role="text">${escape(result.origin)}</span></div></div></div>`;
}

function card(result, { main = false, line, gap = GOOGLE_ROOT_GAP_PX, border = false, shadow = false, clip = false, column = false } = {}) {
  const image = result.thumbnail ? `<img class="organic-thumbnail" width="64" height="64" src="${escape(result.thumbnail)}" alt="料理のイメージ">` : '';
  const sites = result.sitelinks ? `<div class="organic-sitelinks"><a href="${escape(result.href)}/menu"><h3>お品書き</h3></a><a href="${escape(result.href)}/access"><h3>交通のご案内</h3></a></div>` : '';
  const surfaceStyle = `margin-bottom:${gap}px${border ? `;border-bottom:${GOOGLE_ROOT_GAP_PX}px solid ${line}` : ''}`;
  const outerStyle = `${shadow ? 'box-shadow:0 0 0 1px #aaccee;' : ''}${clip ? 'clip-path:inset(0);' : ''}`;
  const body = `<div class="Ww4FFb vt6azd" data-root-surface style="${surfaceStyle}"><div class="organic-copy"><a class="UBFage organic-main-link" href="${escape(result.href)}"><div>${source(result)}<div class="organic-title" role="heading" aria-level="3">${escape(result.title)}</div></div></a><div class="organic-body"><div class="VwiC3b organic-snippet">${escape(result.snippet)}</div>${image}</div>${sites}</div></div>`;
  // Transparent single-child wrappers retain margin collapse, so each outer
  // result's rectangle equals its painted surface; the 8px gap is outside it.
  const nested = `<div class="root-envelope"><div><div class="root-envelope"><div>${body}</div></div></div></div>`;
  return `<div class="${column ? 'root-column' : 'MjjYud'}" data-organic-result="${result.id}" data-root-case="${result.group}"${main ? ' data-organic-group="root"' : ''}${outerStyle ? ` style="${outerStyle}"` : ''}>${nested}</div>`;
}

export function renderGoogleRootFixture(start = 0, { dark = false, compact = true, variant = 'missing' } = {}) {
  if (!['missing', 'native'].includes(variant)) throw new Error('Unknown root fixture variant: ' + variant);
  const colors = GOOGLE_ROOT_COLORS[dark ? 'dark' : 'light'];
  const background = variant === 'native' ? colors.line : colors.page;
  const css = `*{box-sizing:border-box}html,body{margin:0;background:${background};color:${colors.ink};font:14px/20px Arial,sans-serif}#search,.rso,.MjjYud,.root-envelope{display:block;background:transparent;margin:0;padding:0}.rso{width:100%;max-width:${GOOGLE_ROOT_MAX_WIDTH}px}#organic-native{min-height:220px;padding:16px;background:${colors.page};border-bottom:${GOOGLE_ROOT_GAP_PX}px solid ${colors.line}}#organic-native h3{font-weight:400}.Ww4FFb.vt6azd{display:block;background:${colors.page};margin:0 0 ${GOOGLE_ROOT_GAP_PX}px;padding:0}.organic-copy{padding:12px}.organic-main-link{display:block;color:${colors.link};text-decoration:none}.organic-source-header{display:flex;align-items:center;gap:9px;color:${colors.ink};font-size:14px;line-height:18px}.organic-source-text{min-width:0}.organic-favicon{display:block;flex:0 0 24px;width:24px;height:24px}.organic-source-url{display:block;font-size:12px;line-height:17px;overflow-wrap:anywhere}.organic-title{margin:8px 0;font-size:20px;line-height:26px;color:${colors.link};font-weight:400}.organic-body{display:flex;gap:10px;align-items:flex-start}.organic-snippet{flex:1 1 0;min-width:0;font-size:13px;line-height:19px;color:${colors.muted}}.organic-thumbnail{display:block;flex:0 0 64px;width:64px;height:64px;border-radius:6px;object-fit:cover}.organic-sitelinks{padding-top:8px}.organic-sitelinks a{display:block;padding:3px 0;color:${colors.link};text-decoration:none}.organic-sitelinks h3{margin:0;font-size:14px;line-height:20px;font-weight:400}.root-section-label{height:32px;line-height:20px;padding:6px 12px;background:${colors.page};font-size:12px;overflow:hidden}.root-interruption{display:block;height:14px;padding:0 12px;margin:0;overflow:hidden;font-size:10px;line-height:14px;background:${colors.page};color:${colors.ink}}.root-interruption a{color:${colors.link}}.root-native-band{height:${GOOGLE_ROOT_GAP_PX}px;background:${colors.line}}.root-columns{display:flex;gap:12px;background:${colors.page};padding:0}.root-column{flex:1 1 0;min-width:0;background:transparent}.root-column .organic-source-header{display:block}.root-column .organic-title{font-size:16px;line-height:22px}`;
  const head = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google root result structural fixture</title><style>${css}.root-native-band{height:auto;padding:4px 0}</style></head><body>`;
  const next = value => `<nav><a id="pnnext" href="/search?q=${GOOGLE_ROOT_QUERY}&start=${value}">次へ</a></nav>`;
  if (!start) return `${head}<main id="search"><div id="rso" class="rso">${googleRootNativeMarkup()}</div></main>${next(10)}</body></html>`;
  const expected = googleRootExpectedResults(start, { compact });
  const main = expected.filter(result => result.group === 'root').map((result, index) => card(result, { main: index === 0, line: colors.line })).join('');
  let protectedContent = '';
  if (!compact) {
    for (const group of protectedPairs) {
      const [first, second] = expected.filter(result => result.group === group);
      protectedContent += `<div class="root-section-label" data-root-label="${group}">${group} の既存表示を保つ</div>`;
      protectedContent += card(first, { line: colors.line, gap: ['border', 'native-band', 'unknown', 'card'].includes(group) ? 0 : GOOGLE_ROOT_GAP_PX, border: group === 'border' });
      if (group === 'native-band') protectedContent += '<div class="root-native-band" data-root-native-band></div>';
      if (group === 'unknown') protectedContent += '<div class="root-interruption" data-root-blocker="unknown">別形式の店舗案内</div>';
      if (group === 'card') protectedContent += `<g-inner-card class="root-interruption" data-root-blocker="card"><a href="https://special.example/card/${start}">独立した関連カード</a></g-inner-card>`;
      protectedContent += card(second, { line: colors.line, shadow: group === 'shadow', clip: group === 'clip' });
    }
    protectedContent += '<div class="root-section-label">横並びの店舗案内</div>';
    protectedContent += `<div class="MjjYud root-columns" data-root-columns>${expected.filter(result => result.group === 'columns').map(result => card(result, { column: true, line: colors.line })).join('')}</div>`;
  }
  return `${head}<main id="search"><div id="rso" class="rso">${main}${protectedContent}</div></main>${start < 20 ? next(20) : ''}</body></html>`;
}
