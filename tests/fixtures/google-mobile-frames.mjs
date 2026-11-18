import { ORGANIC_COLORS, ORGANIC_FAVICON, ORGANIC_THUMBNAIL } from './google-organic-groups.mjs';

// Minimized structural model of real mobile results in the following public
// snapshots, with original content, tracking, scripts and destinations removed:
// https://github.com/zlurad/serp-parser/blob/70dafd826e785827fe015c7f1f29674ad2c6ebb2/test/google/mobile/coffee.html
// https://github.com/zlurad/serp-parser/blob/70dafd826e785827fe015c7f1f29674ad2c6ebb2/test/google/mobile/dell.html
// The grids are a separate stress case. Neither is an HTML capture from Berry.
export const MOBILE_FRAME_QUERY = 'mobile-result-frames';
export const mobileFrameHref = (start, n) => `https://shop${n}.example/detail/${start}`;

export function renderGoogleMobileFrameFixture(start, { dark = false, variant = 'captured' } = {}) {
  const c = ORGANIC_COLORS[dark ? 'dark' : 'light'];
  const css = `*{box-sizing:border-box}
    html,body{margin:0;background:${c.page};color:${c.ink};font:16px/1.45 Arial,sans-serif}
    #rso{width:100%}.Ww4FFb{background:${c.page};border-bottom:8px solid ${c.line}}
    .entry{position:relative;display:block;padding:16px 16px 14px}
    .BmP5tf{display:block;color:inherit;text-decoration:none}.P8ujBc{position:relative}
    .yIn8Od{display:flex;align-items:center;gap:12px}.wbJOMb,.VN4UC,.pKWwCd{display:block}
    .BTu2cd{font-size:14px}.yKd8Hd{font-size:12px;color:${c.muted}}.H9lube img{display:block;width:23px;height:23px}
    [data-observed-title]{font:400 20px/26px Arial,sans-serif;color:${c.link};margin:8px 0}
    .VwiC3b{font:14px/21px Arial,sans-serif;color:${c.muted};display:flow-root}.VwiC3b a{color:${c.link}}
    .iTPLzd{position:absolute;right:0;top:0;padding:3px 7px;color:${c.muted};font-size:18px}
    .thumb{float:right;width:64px;height:64px;margin:0 0 4px 10px;border-radius:6px}
    .grid-surface{display:grid;grid-template-columns:minmax(0,1fr) 36px;padding:0 16px;background:${c.page}}
    .grid-entry{display:contents}.grid-entry>.source-slot{grid-column:1;padding-top:16px}
    .grid-entry>.menu-slot{grid-column:2;position:relative;margin-top:16px}
    .grid-entry>.title-slot,.grid-entry>.body-slot{grid-column:1/-1}.body-slot{padding-bottom:14px}
    .related-strip{display:flex}.related-strip g-inner-card{display:block;flex:1;padding:16px}
    .related-strip a{display:block;color:${c.link}}#first{padding:16px;border-bottom:8px solid ${c.line}}
    `;
  const source = n => `<div class="OSrXXb NJS5vf RNQ5ae" data-observed-source="${n}"><div class="d8lRkd OSrXXb WQnrNe"><span class="yIn8Od"><span class="isfEv"><span class="H9lube"><span aria-hidden="true"><img src="${ORGANIC_FAVICON}" width="23" height="23" alt=""></span></span></span><span class="wbJOMb"><span class="pKWwCd"><span class="BTu2cd">店舗案内 ${n}</span></span><span class="OSrXXb VN4UC"><span class="yKd8Hd" role="text">https://shop${n}.example<span class="ZYHQ7e"> › </span><span class="ZYHQ7e">店舗</span></span></span></span></span></div></div>`;
  const title = n => `<div class="oewGkc LeUQr" role="heading" aria-level="3" data-observed-title="${n}"><div class="A9xod" role="link">お店とお品書きのご案内 ${start}-${n}</div></div>`;
  const link = (n, children) => `<a class="cz3goc BmP5tf" role="presentation" data-observed-link="${n}" href="${mobileFrameHref(start, n)}">${children}</a>`;
  const menu = n => `<div class="jLvEdc ZD9zO"><div><div role="button" tabindex="0" class="iTPLzd" aria-label="${n % 2 ? 'この検索結果について' : 'About this result'}" data-observed-menu="${n}">⋮</div></div></div>`;
  const body = n => `<div class="OjFzvd"><div class="VwiC3b" data-observed-body="${n}">${n === 2 ? `<img class="thumb" src="${ORGANIC_THUMBNAIL}" alt="料理の写真" width="64" height="64">` : ''}お店の営業時間や所在地、お品書きをご案内しています。店内でのお食事と持ち帰りについてもご覧ください。${n === 3 ? ` <a data-observed-sitelink href="${mobileFrameHref(start, n)}/access">店舗へのアクセス</a>` : ''}</div></div>`;
  const entry = n => `<div class="Z26q7c UK95Uc"><div><div class="xpd"><div class="kvH3mc BToiNc entry"><div class="Z26q7c UK95Uc jGGQ5e"><div class="P8ujBc v5yQqb">${link(n, `<div class="y0NFKc">${source(n)}${title(n)}</div>`)}${menu(n)}</div></div>${body(n)}</div></div></div></div>`;
  const gridEntry = n => `<div class="grid-entry"><div class="source-slot">${source(n)}</div><div class="menu-slot">${menu(n)}</div><div class="title-slot">${link(n, title(n))}</div><div class="body-slot">${body(n)}</div></div>`;
  const tile = (ids, grid = false) => `<div class="MjjYud"><div><div class="Ww4FFb vt6azd xpd"><div class="kvH3mc BToiNc${grid ? ' grid-surface' : ''}">${ids.map(grid ? gridEntry : entry).join('')}</div></div></div></div>`;
  const rich = `<g-scrolling-carousel><div class="related-strip" data-observed-rich>${[1, 2].map(n => `<g-inner-card>${source(10 + n).replace(/data-observed-source="\d+"/, '')}<a href="https://media${n}.example/watch"><h3>関連動画 ${n}</h3></a>${menu(n).replace(/data-observed-menu="\d+"/, '')}</g-inner-card>`).join('')}</div></g-scrolling-carousel>`;
  const native = '<article id="first"><a href="https://initial.example/"><h3>はじめの検索結果</h3></a><p>1ページ目の検索結果です。</p></article>';
  const results = start ? tile([1]) + tile([2, 3, 4], variant === 'grid') + tile([5]) + rich : native;
  const next = start < 20 ? `<nav><a id="pnnext" href="/search?q=${MOBILE_FRAME_QUERY}&amp;start=${start + 10}">次へ</a></nav>` : '';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main id="search"><div id="rso">${results}</div></main>${next}</body></html>`;
}
