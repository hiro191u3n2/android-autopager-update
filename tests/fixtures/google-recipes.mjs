// Reconstruct the Japanese mobile grid, including the neighboring organic result and questions.
export function recipePage(start) {
  if (start >= 300) return '<title>終端</title>';
  const page = start / 10 + 1;
  const photos = ['キャンディーサーモン', 'サーモンキャンディを作った', 'サーモンのキャンディ寿司', 'BBQメニュー紹介'];
  const cards = photos.map((title, i) => `<div data-recipe-card><img width="60" height="45" src="/salmon.svg"><button aria-label="保存"></button>
    <a href="https://food.example/${page}/${i}">${title}</a><div>${i === 2 ? 'クックパッド' : 'Instagram'}</div><span>レビューなし</span></div>`).join('');
  const heading = page % 2 ? '<h2>レシピ</h2>' : '<div data-q="salmon"><span>レシピ</span></div>';
  const module = `<div data-recipe-heading>${heading}</div><div style="display:grid;grid-template-columns:1fr 1fr">${cards}</div>
    <div data-recipe-more><button>もっと見る</button></div><div data-recipe-feedback>フィードバック</div>`;
  const article = `<article data-keep="article"><cite>https://blog.example</cite><a href="https://blog.example/${page}"><h3>サーモンキャンディのレシピ ${page}</h3></a><p>レシピと作り方</p></article>`;
  const questions = '<section data-keep="questions"><h2>関連する質問</h2><div class="related-question-pair">サーモンキャンディとは？</div></section>';
  const block = page % 2 ? article + '<section data-recipe-box>' + module + '</section>' + questions :
    '<div class="MjjYud">' + article + module + questions + '</div>';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>
    <main id="search"><div id="rso">${block}</div></main><nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=${start+10}">次へ</a></nav></body></html>`;
}
