// Reconstruct the visible order, text and controls of the owner's mobile screenshot.
// The wrappers deliberately vary between pages. They are not captured Google HTML.
export function featuredMobilePage(start) {
  const goods = [
    ['【パパブブレ】お寿司ロリポップ', '￥690', 'Amazon公式サイト'],
    ['10/40Pcs 寿司キャンディ サーモングミ', '￥1,215', 'Qoo10 キューテン'],
    ['Wild Canadian Smoked Salmon', '￥14,970', 'Etsy'],
  ];
  const image = '<img width="55" height="55" src="/salmon.svg" alt="">';
  const tiles = goods.map(([name, amount, store]) => '<div role="listitem" jsaction="click:open" data-tile>' +
    image + '<div>' + name + '</div><strong>' + amount + '</strong><div>' + store + '</div></div>').join('');
  const rail = '<div class="strip" role="list">' + tiles + '</div>';
  const menu = '<div><g-popup><div role="button" aria-label="この結果について"><svg width="12" height="12"></svg></div></g-popup></div>';
  const label = start === 20 ? '<span role="heading" aria-level="2"><a href="/search?udm=28&amp;q=salmon">注目されている商品</a></span>' : '<div role="heading" aria-level="2">注目されている商品</div>';
  const header = '<div class="heading" data-section-heading>' + label + menu + '</div>';
  const rows = ['￥2,000以下', '￥2,000–￥6,000'].map(t => '<div data-price-row role="button" aria-expanded="false">' + image + '<span>' + t + '</span><svg width="12" height="8"></svg></div>').join('');
  const merchandise = '<div><div>' + rail + '</div><div>' + rows + '</div></div>';
  const organic = '<article data-keep="rakuten"><cite>https://item.rakuten.co.jp</cite><a href="https://item.rakuten.co.jp/fixture/' + start + '"><h3>【楽天市場】無添加 天然 キング サーモン 燻製 冷凍 カナダ産</h3></a><p>1パックに227g入りです。￥2,618</p>' + image + '</article>';
  const group = start === 10 ? '<div class="MjjYud">' + header + '<div>' + merchandise + organic + '</div></div>' :
    '<section class="MjjYud" data-shelf>' + header + merchandise + '</section>' + organic;
  const adjacent = '<section data-keep="images"><h2>画像</h2><a href="/search?udm=2">その他の画像</a></section>';
  const related = '<section data-keep="related"><h2>関連する商品</h2>' + rail.replaceAll(' data-tile', '') + '</section>';
  const guide = '<article><a href="https://recipes.example/salmon/' + start + '"><h3>サーモンの作り方 ' + (start / 10 + 1) + '</h3></a><p>作り方を紹介します。</p></article>';
  const next = start < 20 ? '<nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=' + (start + 10) + '">次へ</a></nav>' : '';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{margin:0;font:16px sans-serif}.heading,.strip,[data-price-row]{display:flex;align-items:center;gap:8px}.heading{justify-content:space-between}.strip{overflow:auto}.strip>div{flex:0 0 31%;background:#f4f5f6}[data-price-row]{border-top:1px solid #ccc;min-height:50px}section,article{padding:8px}' +
    '</style></head><body><main id="search"><div id="rso">' + guide + adjacent + group + related + '</div></main>' + next + '</body></html>';
}
