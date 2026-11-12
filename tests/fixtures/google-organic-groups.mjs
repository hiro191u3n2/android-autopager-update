/**
 * Controlled Google-shaped pages for import regressions. These pages reproduce
 * the screenshot's three joined organic results; they are not captured Google
 * HTML and do not establish the DOM served to a particular Android device.
 * All assets are inline and all result destinations are observation-only.
 */
export const ORGANIC_DIVIDER_PX = 8;
export const ORGANIC_COLORS = {
  light: { page: '#ffffff', ink: '#202124', muted: '#5f6368', link: '#1967d2', line: '#e8eaed', rgb: [232, 234, 237] },
  dark: { page: '#202124', ink: '#e8eaed', muted: '#bdc1c6', link: '#8ab4f8', line: '#3c4043', rgb: [60, 64, 67] },
};

const sources = [
  { name: '鰻 小日向', origin: 'https://unagi-kohinata.com', title: '埼玉県川越市のうなぎ専門店『鰻 小日向』' },
  { name: 'うなぎの寝床-千葉店', origin: 'https://unaginonedoko.net', title: '【公式】うなぎの寝床-千葉店' },
  { name: 'u-owariya.jp', origin: 'http://www.u-owariya.jp', title: '鰻 尾張屋 公式サイト - 市川市' },
];
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const svg = text => 'data:image/svg+xml,' + encodeURIComponent(text);
export const ORGANIC_FAVICON = svg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#d6e7f6"/><circle cx="12" cy="12" r="7" fill="#1967d2"/></svg>');
export const ORGANIC_THUMBNAIL = svg('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="6" fill="#422618"/><rect x="7" y="8" width="50" height="48" rx="4" fill="#d9954c"/><path d="M10 18H54M10 28H54M10 38H54M10 48H54" stroke="#804320" stroke-width="5"/></svg>');

export function organicNativeMarkup() {
  return '<article id="organic-native"><div>最初の検索ページ</div><h3><a href="https://native.example/one">初回の通常検索結果</a></h3><p>初回ページの見出し・説明・区切りはそのままです。</p></article>';
}

export function organicExpectedResults(start, { compact = false, price = false } = {}) {
  const groups = compact ? ['main', 'after'] : ['main', 'after', 'existing', 'same', 'sitelinks'];
  return groups.flatMap(group => {
    const count = ['after', 'sitelinks'].includes(group) ? 1 : 3;
    return Array.from({ length: count }, (_, index) => {
      const source = sources[index];
      const origin = group === 'same' ? 'https://same.example' : group === 'after' ? 'https://unaton.example' : group === 'sitelinks' ? 'https://guide.example' : source.origin;
      const name = group === 'same' ? `うなぎ店 店舗${index + 1}` : group === 'after' ? 'うなとん' : group === 'sitelinks' ? 'うなぎ店のご案内' : source.name;
      const title = group === 'after' ? '高崎市のうなぎ専門店' : group === 'sitelinks' ? 'うなぎ専門店の店舗案内と予約' : group === 'same' ? `同じサイトの独立した店舗 ${index + 1}` : source.title;
      return {
        id: `${group}-${start}-${index + 1}`, group, index: index + 1, name, origin, title,
        href: `${origin}/organic-fixture/${start}/${group}/${index + 1}`,
        snippet: `${price && group === 'main' && index === 0 ? 'うなぎづくし 12,000円（税込）。' : ''}検索結果 ${start}-${group}-${index + 1}。うなぎ専門店の営業時間と店舗情報です。見出しや説明文を保って次の検索結果を表示します。`,
        thumbnail: group === 'main' && index === 0 ? ORGANIC_THUMBNAIL : null,
      };
    });
  });
}

function sourceHeader(result, cite = false) {
  const urlTag = cite ? 'cite' : 'div';
  return `<div class="organic-source-header"><img class="organic-favicon" width="24" height="24" alt="" src="${escape(ORGANIC_FAVICON)}"><div class="organic-source-text"><div>${escape(result.name)}</div><${urlTag} class="organic-source-url">${escape(result.origin)}</${urlTag}></div></div>`;
}

function card(result, { shape, line }) {
  let title;
  if (shape === 'plain') title = `<div class="organic-title">${escape(result.title)}</div>`;
  else if (result.index === 2) title = `<div class="organic-title" role="heading" aria-level="2">${escape(result.title)}</div>`;
  else if (result.index === 3) title = `<div class="organic-title">${escape(result.title)}</div>`;
  else title = `<h3 class="organic-title">${escape(result.title)}</h3>`;
  const header = sourceHeader(result, result.index === 2);
  // A primary link may contain both its source identity and its plain title.
  // Other results keep the source header outside the title anchor.
  const combined = result.index === 3 || shape === 'plain' && result.index === 1;
  const link = `<a class="organic-main-link" href="${escape(result.href)}">${combined ? header : ''}${title}</a>`;
  const image = result.thumbnail ? `<img class="organic-thumbnail" width="64" height="64" src="${escape(result.thumbnail)}" alt="料理のサムネイル">` : '';
  const sites = result.group === 'sitelinks' ? `<div class="organic-sitelinks"><a href="${escape(result.href)}/menu"><h3>お品書き</h3></a><a href="${escape(result.href)}/access"><h3>アクセスとお問い合わせ</h3></a></div>` : '';
  const border = result.group === 'existing' && result.index < 3 ? ` style="border-bottom:${ORGANIC_DIVIDER_PX}px solid ${line}"` : '';
  return `<div class="organic-result" data-organic-result="${result.id}"${border}><div class="organic-copy">${combined ? '' : header}${link}<div class="organic-body"><p class="organic-snippet">${escape(result.snippet)}</p>${image}</div>${sites}</div></div>`;
}

export function renderGoogleOrganicFixture(start = 0, { dark = false, shape = 'mixed', large = false, compact = false, price = false } = {}) {
  const colors = ORGANIC_COLORS[dark ? 'dark' : 'light'];
  const css = `*{box-sizing:border-box}html,body{margin:0;background:${colors.page};color:${colors.ink};font:14px/1.5 Arial,sans-serif}#rso{width:100%}#organic-native{padding:16px;min-height:220px;border-bottom:${ORGANIC_DIVIDER_PX}px solid ${colors.line}}#organic-native h3{font-weight:400}.MjjYud,.organic-result{display:block;position:relative;margin:0;padding:0;background:${colors.page}}.organic-group{border-bottom:${ORGANIC_DIVIDER_PX}px solid ${colors.line}}.organic-copy{padding:12px}.organic-source-header{display:flex;align-items:center;gap:9px;color:${colors.ink};font-size:14px;line-height:18px}.organic-source-text{min-width:0}.organic-favicon{display:block;flex:0 0 24px;width:24px;height:24px}.organic-source-url{display:block;margin:0;font-size:12px;line-height:17px;font-style:normal;overflow-wrap:anywhere}.organic-main-link{display:block;color:${colors.link};text-decoration:none}.organic-title{margin:9px 0;font-size:19px;line-height:25px;font-weight:400;color:${colors.link}}.organic-body{display:flex;gap:10px;align-items:flex-start}.organic-snippet{flex:1 1 0;min-width:0;margin:0;color:${colors.muted};font-size:13px;line-height:19px}.organic-thumbnail{display:block;flex:0 0 64px;width:64px;height:64px;object-fit:cover;border-radius:6px}.organic-sitelinks{padding-top:8px}.organic-sitelinks a{display:block;padding:4px 0;color:${colors.link};text-decoration:none}.organic-sitelinks h3{margin:0;font-size:15px;line-height:21px;font-weight:400}.organic-horizontal{display:flex;gap:14px;padding:12px;overflow:hidden}.organic-horizontal-card{flex:1 1 0;min-width:0}.organic-horizontal-card .organic-source-header{display:block}.organic-horizontal-card .organic-title{font-size:15px;line-height:21px}.organic-horizontal-card a{color:${colors.link};text-decoration:none}.organic-large-data,.organic-css-hidden,[data-organic-hidden]{display:none!important}`;
  const head = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google organic import regression fixture</title><style>${css}</style></head><body>`;
  if (!start) return `${head}<main id="search"><div id="rso">${organicNativeMarkup()}</div></main><nav><a id="pnnext" href="/search?q=organic-fixture&start=10">次へ</a></nav></body></html>`;
  const expected = organicExpectedResults(start, { compact, price });
  const groups = [...new Set(expected.map(result => result.group))];
  const contents = groups.map(group => {
    const cards = expected.filter(result => result.group === group).map(result => card(result, { shape, line: colors.line }));
    if (group === 'main') {
      // A hidden source/title pair must not split a real result or consume its
      // source identity. It also catches geometry-less node-count heuristics.
      cards.splice(1, 0, `<div data-organic-hidden="${start}" hidden aria-hidden="true"><div>隠れている別の結果</div><cite>https://hidden.example</cite><a href="https://hidden.example/${start}"><h3>非表示の代替見出し</h3></a></div>`);
      // This second alternative has no HTML/ARIA hiding attribute. Visibility
      // must be read from layout instead of counting every source/title pair.
      cards.splice(3, 0, `<div class="organic-css-hidden" data-organic-css-hidden="${start}"><div>CSSだけで隠れた結果</div><cite>https://css-hidden.example</cite><a href="https://css-hidden.example/${start}"><div role="heading" aria-level="2">CSS非表示の代替見出し</div></a></div>`);
    }
    return `<div class="MjjYud organic-group" data-organic-group="${group}-${start}">${cards.join('')}</div>`;
  }).join('');
  const horizontal = compact ? '' : `<div class="MjjYud organic-group"><div class="organic-horizontal" data-organic-horizontal-panel="${start}">${[1, 2].map(index => `<div class="organic-horizontal-card" data-organic-horizontal="${start}-${index}"><div class="organic-source-header"><img width="24" height="24" src="${escape(ORGANIC_FAVICON)}" alt=""><cite class="organic-source-url">https://horizontal${index}.example</cite></div><a href="https://horizontal${index}.example/${start}"><h3 class="organic-title">横並びの関連カード ${index}</h3></a><p>同じ段を保つ</p></div>`).join('')}</div></div>`;
  // The previous normalizer abandoned the whole page above 6500 elements.
  // Unrelated hidden bookkeeping must not suppress three visible results.
  const bulk = large ? `<div class="organic-large-data" aria-hidden="true">${'<i></i>'.repeat(6700)}</div>` : '';
  const next = start < 20 ? '<nav><a id="pnnext" href="/search?q=organic-fixture&start=20">次へ</a></nav>' : '';
  return `${head}<main id="search"><div id="rso">${bulk}${contents}${horizontal}</div></main>${next}</body></html>`;
}
