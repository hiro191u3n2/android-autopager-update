const pin = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="26"><rect width="44" height="26" rx="8" fill="#b33"/></svg>');

export function visualPage(number) {
  const key = String(number);
  const listing = '<article><a href="https://guide.example/' + key + '"><h3>旅の案内 ' + key + '</h3></a>' +
    '<p>駅から徒歩で行けるホテルと周辺の宿泊情報。</p></article>';
  const map = '<div class="map"><img alt="料金マーカー" src="' + pin + '"><span>駅前 ¥8,500</span></div>';
  const action = '<a class="cta" href="https://stay.example/' + key + '"><div class="pill"><span>ホテルをすべて見る</span></div></a>';
  const minimum = '<button class="more"><span>日程を選ぶ</span></button>';
  const details = '<article><a href="https://visit.example/' + key + '"><h3>周辺施設 ' + key + '</h3></a><p>入場案内と営業時間</p></article>';
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{margin:0;font:16px/20px sans-serif}#rso{background:Canvas;color:CanvasText}h3,p{margin:0}article{padding:12px 16px}' +
    (number === 1 ? '' : '.map{position:relative;overflow:hidden;height:120px}.map img,.map span{position:absolute;top:32px;left:36px}.map span{top:64px}.cta{display:block;padding:8px 16px}.pill{display:flex;height:40px;align-items:center;justify-content:center;background:#ddd;border-radius:24px}.more{display:block;min-height:44px;line-height:18px}') +
    '</style><main id="search"><div id="rso">' + listing + (number === 1 ? '' : map + action + minimum) + details +
    '</div></main>' + (number < 7 ? '<a id="pnnext" href="/search?q=visual&amp;start=' + number * 10 + '">次へ</a>' : '');
}

// Inspect what is painted and reachable, including descendants of zero-height clips.
// Relative coordinates also catch unexpected blank space between retained items.
export function readVisibleResults(root) {
  const rounded = Math.round;
  const result = [];
  for (const el of root.querySelectorAll('h3,p,a[href],button,img[alt]')) {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const box = el.getBoundingClientRect();
    let top = box.top, bottom = box.bottom, left = box.left, right = box.right;
    for (let p = el.parentElement; p && root.contains(p); p = p.parentElement) {
      const style = getComputedStyle(p), r = p.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowY)) {
        top = Math.max(top, r.top + p.clientTop);
        bottom = Math.min(bottom, r.top + p.clientTop + p.clientHeight);
      }
      if (/hidden|clip|auto|scroll/.test(style.overflowX)) {
        left = Math.max(left, r.left + p.clientLeft);
        right = Math.min(right, r.left + p.clientLeft + p.clientWidth);
      }
    }
    const hit = [];
    if (el.matches('a,button') && box.width && box.height) {
      for (const part of [.15, .5, .85]) {
        const target = document.elementFromPoint(box.left + box.width / 2, box.top + box.height * part);
        hit.push(Boolean(target && el.contains(target)));
      }
    }
    result.push({ tag: el.localName, text: el.alt || el.innerText, href: el.getAttribute('href'),
      top: rounded(box.top - root.getBoundingClientRect().top), width: rounded(box.width),
      height: rounded(box.height), visibleWidth: rounded(Math.max(0, right - left)),
      visibleHeight: rounded(Math.max(0, bottom - top)), hit });
  }
  return result;
}
