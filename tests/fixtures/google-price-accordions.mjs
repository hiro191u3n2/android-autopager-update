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
