// A local reproduction of the salmon-candy results shown in the Berry recording.
export function featuredProductsPage(start) {
  const product = (name, amount) => '<a href="https://shop.example/items/' + amount + '"><img width="60" height="40" src="/salmon.svg"><span>' + name + '</span><b>￥' + amount + '</b></a>';
  const tiles = product('サーモンのお寿司', '690') + product('紅鮭キャンディ', '1,215') + product('スモークサーモン', '4,970');
  const rail = start === 10 ? '<div class="grid">' + tiles + '</div>' : '<g-scrolling-carousel><div>' + tiles + '</div></g-scrolling-carousel>';
  const filters = '<div data-prices><button>￥2,000以下</button><button>￥2,000～￥6,000</button></div>';
  const head = start === 10 ? '<div><span>注目されている</span><span>商品</span></div>' : '<h2><span>注目されている</span><span>商品</span></h2>';
  const image = '<section data-keep="images"><h2>画像</h2><a href="/search?udm=2">その他の画像</a></section>';
  const ordinary = '<article data-keep="rakuten"><cite>https://www.rakuten.co.jp</cite><a href="https://item.rakuten.co.jp/demo/' + start + '"><h3>注目されている商品</h3></a><p>天然キングサーモン燻製 ￥2,618</p></article>';
  const related = '<section data-keep="related"><h2>関連する商品</h2>' + rail + '</section>';
  const module = '<div data-section-heading>' + head + '</div><div data-tiles>' + rail + '</div>' + filters;
  const guide = '<article class="MjjYud"><a href="https://recipes.example/salmon/' + start + '"><h3>サーモンのレシピ ' + (start / 10 + 1) + '</h3></a><p>ページごとの調理例と作り方を紹介します。</p></article>';
  const results = start === 10 ? image + '<div class="MjjYud">' + module + ordinary + '</div>' + related :
    image + '<section class="MjjYud" id="feature-' + start + '" data-shelf>' + module + '</section>' + ordinary + related;
  const next = start < 20 ? '<nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=' + (start + 10) + '">次へ</a></nav>' : '';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{margin:0;font:16px sans-serif}section,article{padding:8px}g-scrolling-carousel,.grid{display:block}.grid a,g-scrolling-carousel a{display:inline-grid;width:30%}b{display:block}' +
    '</style></head><body><main id="search"><div id="rso">' + guide + results + '</div></main>' + next + '</body></html>';
}
