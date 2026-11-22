// Reconstructed from the recording. There is no product heading above the
// blank expander and thumbnail price row between Images and Rakuten.
export function priceAccordionPage(start) {
  if (start > 20) return '<title>終端</title>';
  const arrow = '<svg width="14" height="10"><path d="M1 1l6 6 6-6"/></svg>';
  const thumbnail = '<img width="45" height="45" alt="" src="/salmon.svg">';
  const blank = '<div class="row" data-band="blank"><button aria-expanded="false">' + arrow + '</button></div>';
  const value = start === 10 ? '<span>￥</span><span>2,000</span>–<span>￥6,000</span>' : '￥2,000–￥6,000';
  const band = '<div class="row" data-band="price">' + thumbnail + '<span>' + value + '</span><span role="button" aria-expanded="false">' + arrow + '</span></div>';
  const images = '<section data-keep="images"><h2>画像</h2><a href="/search?udm=2">その他の画像</a></section>';
  const rakuten = '<div class="MjjYud" data-keep="shop"><cite>https://item.rakuten.co.jp</cite><a href="https://item.rakuten.co.jp/example/' + start + '"><h3>【楽天市場】無添加 天然 キング サーモン</h3></a>' + thumbnail + '<p>￥2,618</p></div>';
  const rows = start === 10 ? '<div>' + blank + '</div><div>' + band + '</div>' : '<div data-band-box>' + blank + band + '</div>';
  const questions = '<section class="related-question-pair" data-keep="questions"><button aria-expanded="false">' + thumbnail + '￥2,000–￥6,000</button></section>';
  const article = '<article data-keep="article"><a href="https://example.org/prices/' + start + '"><h3>価格の目安</h3></a><button>' + thumbnail + value + '</button></article>';
  const next = start < 20 ? '<nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=' + (start+10) + '">次へ</a></nav>' : '';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0}.row{padding:10px;border-bottom:1px solid #ddd}.row button,.row [role=button]{float:right} [data-band-box]{padding:3px;border:3px solid #eee}</style></head><body><main id="search"><div id="rso">' + images + rows + rakuten + questions + article + '</div></main>' + next + '</body></html>';
}

// The screenshot establishes the order and displayed text. Exercise several
// possible DOM structures for those same pixels, without inventing button roles.
export function priceAfterImagesPage(start) {
  const base = priceAccordionPage(start);
  if (start > 20) return base;
  const first = '<div class="row" data-band="blank"><i class="arrow"></i></div>';
  const range = start === 10 ? '<p><b>￥2,000</b> – <b>￥6,000</b></p>' :
    '<a href="/search?udm=28&amp;q=salmon"><span aria-hidden="true">￥2,000–￥6,000</span></a>';
  const folded = '<div style="display:none">商品を見る・送料無料</div>';
  const second = '<div class="row" data-band="price"><div class="thumb"></div>' + range + '<i class="arrow"></i>' + folded + '</div>';
  const rows = start === 10 ? '<div>' + first + '</div><div>' + second + '</div>' : '<section data-band-box>' + first + second + '</section>';
  // On page one the previous cleanup has already hidden the product cards.
  // The next page instead contains a collapsed panel ahead of the loose rows.
  const shelf = start === 0 ? '<section class="MjjYud" data-suppressed-shelf><h2>注目されている商品</h2><div><img src="/salmon.svg">お菓子 ￥690</div><div><img src="/salmon.svg">サーモン ￥1,215</div></section>' :
    '<div style="height:0px;overflow:hidden">非表示の商品情報</div>';
  const footerEnd = base.indexOf('</section>') + '</section>'.length;
  const shopStart = base.indexOf('<div class="MjjYud" data-keep="shop">');
  const video = '<section data-keep="videos"><h2>動画</h2><a href="https://video.example/' + start + '">サーモンキャンディを作ってみた</a></section>';
  return (base.slice(0, footerEnd) + shelf + rows + base.slice(shopStart))
    .replace('</style>', '.thumb{width:42px;height:42px;background:url(/salmon.svg) center/cover}.arrow::after{content:"";float:right;width:9px;height:9px;border:solid gray;border-width:0 2px 2px 0;transform:rotate(45deg)}</style>')
    .replace('<main id="search">','<nav data-keep-chip><button>￥300未満</button></nav><main id="search">')
    .replace('</div></main>', video + '</div></main>');
}
