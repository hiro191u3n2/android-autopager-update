// The November 22 recording shows successive two-column grids with six
// offers, seller text and an expander instead of price accordions.
export function featuredGridPage(start) {
  if (start >= 300) return '<!doctype html><title>検索終了</title>';
  const number = 1 + start / 10;
  const photo = '<img src="/salmon.svg" width="48" height="44" alt="">';
  const products = [
    ['寿司キャンディ', '1,494', 'Qoo10 キューテン'], ['スモークサーモン', '1,294', '成城石井.com'],
    ['ドリーミーズ かつお味', '239', '楽天市場'], ['天然カナダ産スモーク紅鮭', '14,984', 'Etsy'],
    ['カステリモ レモン＆モロオレンジ', '990', 'Amazon公式サイト'], ['お寿司ロリポップ', '1,340', '楽天市場'],
  ];
  const card = ([name, amount, seller], i) => '<div class="offer" data-offer><div>' + photo + '</div><a href="https://seller.example/item/' + i + '"><span>' + name + '</span></a><strong>￥' + amount + '</strong><cite>' + seller + '</cite><span>送料無料</span></div>';
  const cards = products.map(card);
  const rows = [0,2,4].map(i => '<div class="row">' + cards.slice(i,i+2).join('') + '</div>').join('');
  const footer = '<div data-grid-footer><button><span>その他の商品</span><svg width="8" height="8"></svg></button></div>';
  const headerTag = number % 5 === 0 ? 'header' : 'div';
  const title = number % 4 === 0 ? '<div data-q="salmon"><span>注目されている商品</span></div>' : '<h2>注目されている商品</h2>';
  const heading = '<' + headerTag + ' data-grid-label>' + title + '</' + headerTag + '>';
  const grid = '<div><div class="catalog"><div class="rows">' + rows + '</div></div></div>';
  const module = heading + '<div><i aria-hidden="true"></i>' + grid + (number % 3 ? footer : '') + '</div>';
  const result = (id, title) => '<article data-keep="' + id + '"><cite>https://recipe.example</cite><a href="https://recipe.example/' + number + '/' + id + '"><h3>' + title + ' ' + number + '</h3></a><p>サーモンの燻製レシピと作り方。</p></article>';
  const before = result('before','サーモンキャンディのレシピ'), after = result('after','動画と記事');
  const block = number % 2 ? before + '<section class="MjjYud" data-outer>' + module + '</section>' + after :
    '<div class="MjjYud">' + before + '<div>' + heading + '<div>' + grid + (number % 3 ? footer : '') + after + '</div></div></div>';
  const next = number < 30 ? '<nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=' + (start+10) + '">次へ</a></nav>' : '';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px sans-serif;margin:0}article,h2,section{padding:5px;margin:0}.row{display:grid;grid-template-columns:1fr 1fr}.offer{min-height:76px;background:#f7f7f7}.offer strong,.offer cite{display:block}button{width:100%}</style></head><body><main id="search"><div id="rso">' + block + '</div></main>' + next + '</body></html>';
}
