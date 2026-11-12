// Controlled rich-result structures modeled on the owner's 2026-11-12 video.
// These fixtures are not captured Google/Berry HTML.
export const GOOGLE_RICH_QUERY = 'rich-layout-regression';
export const GOOGLE_RICH_COLORS = {
  light: { page: '#ffffff', card: '#f1f3f4', text: '#202124', gap: '#e8eaed' },
  dark: { page: '#202124', card: '#303134', text: '#e8eaed', gap: '#171717' },
};
export const GOOGLE_RICH_NATIVE = '<article id="rich-native"><h3><a href="https://native.example/initial">初回の通常検索結果</a></h3><p>初回ページの結果と配置を保ちます。</p><div class="rich-card" data-native-card="">初回だけのカード</div></article>';
export const GOOGLE_RICH_STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M8 0 10 5 16 6 11.5 10 13 16 8 12.5 3 16 4.5 10 0 6 6 5Z" fill="black"/></svg>';
export const GOOGLE_RICH_THUMB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="112" viewBox="0 0 144 112"><rect width="144" height="112" fill="#dfe8f2"/><rect x="52" y="14" width="40" height="84" rx="7" fill="#8ca7bf"/><rect x="58" y="44" width="28" height="34" fill="white"/></svg>';

function product(start, index, strip = false) {
  const key = `${strip ? 'strip' : 'grid'}-${start}-${index}`;
  return `<div class="rich-card" data-rich-card="${key}"><div class="rich-media"><img src="/fixture-assets/bottle.svg" width="144" height="112" alt="商品 ${key}"><span class="rich-discount">10% オフ</span></div><a class="rich-product-link" href="https://store.example/products/${key}"><h3>薬用保湿ローション ${start}-${index} 肌のうるおいを保つ化粧水</h3></a><p class="rich-price">¥${3900 + index}</p><p class="rich-merchant">ストア公式サイト</p><span class="rich-rating">4.6 <span class="rich-review-count">(79)</span></span><span class="rich-mask" role="img" aria-label="星評価"></span><span class="rich-stock">在庫あり</span></div>`;
}

export function renderGoogleRichFixture(start, options = {}) {
  const { dark = false, large = false } = options;
  const colors = GOOGLE_RICH_COLORS[dark ? 'dark' : 'light'];
  const head = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  if (!start) return `${head}<style>
    *{box-sizing:border-box}body{margin:0;font:14px/1.5 Arial,sans-serif;background:${colors.page};color:${colors.text}}
    #rich-native{min-height:250px;padding:16px}#rich-native h3{font-size:20px}
    .rich-card{display:block;width:120px;padding:7px;background:rgb(245,235,225);color:#202124}
    .rich-grid,.rich-strip{display:block}.rich-rating::after{content:none}.rich-stock::before{content:none}
  </style></head><body><main id="search"><div id="rso">${GOOGLE_RICH_NATIVE}</div></main><nav><a id="pnnext" href="/search?q=${GOOGLE_RICH_QUERY}&start=10">次へ</a></nav></body></html>`;
  const padding = large ? `<div class="rich-padding" hidden>${'<span></span>'.repeat(5200)}</div>` : '';
  return `${head}<style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;font:14px/1.5 Arial,sans-serif;background:${colors.page};color:${colors.text}}
    #rso{width:100%;background:${colors.page};color:${colors.text}}
    .rich-module{padding:16px;margin:0 0 8px;background:${colors.page};overflow:hidden}
    .rich-module>h2{font-size:20px;font-weight:400;margin:0 0 16px}
    .rich-grid{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
    .rich-strip{display:flex;flex-wrap:nowrap;gap:10px;overflow-x:auto;overflow-y:hidden;max-width:100%;align-items:stretch}
    .rich-card{display:flex;flex-direction:column;flex:0 0 auto;width:calc((100% - 20px)/3);min-width:0;position:relative;isolation:isolate;padding:8px;background:transparent;color:${colors.text};border-radius:14px;overflow:hidden}
    .rich-strip>.rich-card{width:144px}
    .rich-card::before{content:"";position:absolute;inset:0;background:${colors.card};border-radius:14px;z-index:-1;pointer-events:none}
    .rich-card h3{font-size:14px;font-weight:400;line-height:20px;margin:8px 0;overflow-wrap:anywhere}
    .rich-card a{color:inherit;text-decoration:none}.rich-card p{margin:0 0 5px}
    .rich-media{position:relative;width:100%;height:112px;border-radius:10px;overflow:hidden}
    .rich-media img{display:block;width:100%;height:112px;object-fit:contain}
    .rich-discount{position:absolute;left:3px;top:3px;padding:1px 3px;background:#fff;color:#202124;font-size:10px;border-radius:3px}
    .rich-price{font-weight:700}.rich-merchant{font-size:11px}.rich-rating{display:block;font-size:11px;white-space:nowrap}
    .rich-rating::after{content:"★★★★★";display:block;color:#fabb05;font-size:14px;line-height:18px;letter-spacing:0}
    .rich-mask{display:block;width:64px;height:16px;background-color:#fabb05;mask-image:url("/fixture-assets/stars.svg");mask-size:16px 16px;mask-repeat:repeat-x;mask-position:left center}
    .rich-stock{display:block;font-size:11px;line-height:18px}
    .rich-stock::before{content:"";display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:50%;background:#137333}
    .rich-hidden-alternative{display:none}
    .rich-organic-group{background:${colors.page};margin:0 0 8px}
    .rich-organic{position:relative;padding:16px;background:${colors.page};margin:8px 0 0;color:${colors.text}}
    .rich-organic:first-child{margin-top:0}.rich-organic+.rich-organic::before{content:"";position:absolute;left:0;right:0;top:-8px;height:8px;background:${colors.gap}}
    .rich-organic cite{display:block;font-style:normal;font-size:12px}.rich-organic h3{font-size:20px;line-height:26px;margin:8px 0;font-weight:400}
    .rich-organic a{color:${dark ? '#8ab4f8' : '#1a0dab'};text-decoration:none}.rich-organic p{margin:0}
  </style></head><body><main id="search"><div id="rso">
  <section class="MjjYud rich-module" data-rich-module="grid-${start}"><h2>注目されている商品 ${start}</h2><div class="rich-grid">${[1,2,3].map(i => product(start,i)).join('')}</div><img class="rich-hidden-alternative" src="/fixture-assets/bottle.svg" alt="非表示の重複画像"></section>
  <div class="MjjYud rich-organic-group">${[1,2,3].map(i => `<article class="rich-organic" data-rich-organic="${start}-${i}"><cite>https://result${i}.example</cite><a href="https://result${i}.example/${start}"><h3>化粧水の商品と特徴 ${start}-${i}</h3></a><p>商品の説明、販売情報や口コミを確認できます。</p><span class="rich-rating">4.4 <span>(10)</span></span><span class="rich-stock">在庫あり</span></article>`).join('')}</div>
  <section class="MjjYud rich-module" data-rich-module="strip-${start}"><h2>関連する商品 ${start}</h2><div class="rich-strip">${[1,2,3,4].map(i => product(start,i,true)).join('')}</div></section>
  ${padding}</div></main>${start === 10 ? `<nav><a id="pnnext" href="/search?q=${GOOGLE_RICH_QUERY}&start=20">次へ</a></nav>` : ''}</body></html>`;
}
