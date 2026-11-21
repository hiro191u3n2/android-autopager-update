// Reconstruct the standalone mobile video result at the page break in the recording.
// IDs and destinations are synthetic. The title, duration and neighboring result match the recording.
const title = 'サーモンキャンディの作り方｜カナダ発祥の保存食レシピ';
const excerpt = 'サーモンキャンディは、カナダ発祥のサーモンを使った保存食。お刺身用のサーモンに塩・砂糖・唐辛子などをすり込み、一晩寝かせてから洗い流して…';
const firstId = '7340000000000000001';
function tile(name, id, imported, plain = false) {
  const url = 'https://www.tiktok.com/@fixture/video/' + id;
  const href = imported ? '/url?url=' + encodeURIComponent(url + '?_t=second') : url;
  const preview = '/search?q=fixture&amp;udm=7#fpstate=ive';
  const heading = plain ? '<span>' + title + '</span>' : '<div role="heading" aria-level="3">' + title + '</div>';
  return '<div class="Ww4FFb" data-result="' + name + '"><div>TikTok · りおなり夫婦のビログ旅</div>' +
    '<div>視聴回数: 160万 回以上 · 8 か月前</div><a href="' + href + '">' + heading + '</a>' +
    '<div class="summary"><a href="' + preview + '"><video muted preload="none" width="80" height="52"></video><span>2:45</span></a>' +
    '<span>' + excerpt + '</span></div></div>';
}
export function videoSearchPage(start) {
  const ordinary = name => '<article class="MjjYud" data-result="' + name + '"><cite>https://www.etsy.com</cite><a href="https://www.etsy.com/listing/123"><h3>天然カナダ産スモーク紅鮭キャンディ</h3></a><p>甘くてスモーキーなグルメシーフード</p></article>';
  const playerOnly = (name, image) => '<article data-result="' + name + '"><div>TikTok · 別の投稿者</div>' +
    '<a href="/search?q=fixture#fpstate=ive"><h3>保存食の準備</h3><img width="80" height="52" src="/' + image + '.svg"><span>2:45</span></a><p>' + excerpt + '</p></article>';
  const next = start < 20 ? '<nav><a id="pnnext" href="/search?q=サーモンキャンディ&amp;start=' + (start + 10) + '">次へ</a></nav>' : '';
  const results = start === 0 ? playerOnly('player-original', 'thumb1') + tile('original', firstId, false) :
    start === 10 ? tile('repeat', firstId, true) + ordinary('etsy') + tile('other-video', '7340000000000000002', true) +
      '<g-scrolling-carousel>' + tile('carousel', firstId, true) + '</g-scrolling-carousel>' +
      playerOnly('player-repeat', 'thumb1') + playerOnly('different-poster', 'thumb2') :
    start === 20 ? tile('plain-repeat', firstId, false, true) + ordinary('later-etsy') + '<div data-result="last">次のページの固有結果</div>' : '';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{margin:0;font:16px sans-serif}.Ww4FFb,article{padding:12px;border-bottom:8px solid #eee}.summary{display:flex}.summary a{position:relative}.summary a span{position:absolute;bottom:0;left:0}</style>' +
    '</head><body><main id="search"><div id="rso">' + results + '</div></main>' + next + '</body></html>';
}
