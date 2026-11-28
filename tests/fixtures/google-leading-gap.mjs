const title = '武士の一分 [HD DVD]';
const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const poster = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120"%3E%3Crect width="200" height="120" fill="orange"/%3E%3C/svg%3E';
export const gapCases = ['empty', 'plain', 'removed', 'transparent', 'loader', 'short', 'poster', 'lazy', 'art', 'text', 'control', 'pseudo', 'swatch'];
export const emptyGapCases = ['empty', 'plain', 'removed', 'transparent', 'loader'];

export function gapPage(page, sample) {
  const parts = {
    empty: '<div data-slot class="slot" style="padding:0;min-height:250px"></div>',
    plain: '<div data-slot class="slot"></div>',
    removed: '<div class="slot" data-slot><div role="navigation">前へ</div></div>',
    transparent: '<div data-slot class="slot"><img alt="" width="1" height="1" src="' + pixel + '"></div>',
    loader: '<div data-slot class="slot"><div role="progressbar" aria-label="読み込み中"><svg width="16" height="16"><circle cx="8" cy="8" r="5"/></svg></div></div>',
    short: '<div data-slot style="height:8px"></div>',
    poster: '<div data-slot class="slot"><img width="200" height="120" alt="作品ポスター" src=\'' + poster + '\'></div>',
    lazy: '<div data-slot class="slot"><img width="200" height="120" alt="" data-src=\'' + poster + '\' src="' + pixel + '"></div>',
    art: '<div data-slot class="slot" style="background-image:linear-gradient(#357,#794)"></div>',
    text: '<div data-slot class="slot"><span>作品の上映情報</span></div>',
    control: '<div data-slot class="slot"><button aria-label="予告を再生"></button></div>',
    pseudo: '<div data-slot class="slot pseudo"></div>',
    swatch: '<div data-slot class="slot"><div style="margin:auto;width:80px;height:80px;background:#b78442"></div></div>',
  };
  const item = (id, name, address) => '<article class="MjjYud" data-item="' + id +
    '"><cite>' + address + '</cite><a href="https://' + address + '/movie/' + id + '">' +
    (sample === 'plain' ? '<div>' + name + '</div>' : '<h3>' + name + '</h3>') +
    '</a><p>映画のあらすじ、出演者と作品情報を紹介します。</p></article>';
  const list = page === 3 ? item('amazon', title, 'www.amazon.co.jp') + item('tsutaya', '武士の一分 宅配DVDレンタル', 'tsutaya.example')
    : item('p' + page, page === 2 ? '武士の一分 作品情報・映画の時間' : '武士の一分の作品紹介 ' + page, 'cinema.example');
  const slot = page === 3 ? parts[sample] : '';
  return '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">' +
    '<style>*{box-sizing:border-box}body{margin:0;font:16px sans-serif}.slot{position:relative;padding-top:244px;background-color:white;border-bottom:6px solid #eee}.slot>*{position:absolute;top:0;left:0}.pseudo::before{content:"作品情報";position:absolute;top:0}article{padding:12px 16px;border-bottom:6px solid #eee;min-height:100px}h3,p{margin:4px 0}</style>' +
    '<main id="search"><div id="rso"><div>' + slot + list + '</div></div></main>' +
    '<nav><a id="pnnext" href="/search?q=ぶしのいちぶん&amp;start=' + page * 10 + '">次へ</a></nav>';
}

// Runs inside the rendered browser, shared by desktop and Android checks.
export function measureGap() {
  const section = document.querySelector('.generic-autopager-page[data-page="3"]');
  const divider = section?.querySelector('.generic-autopager-divider');
  const card = section?.querySelector('[data-item="amazon"]');
  if (!divider || !card) return null;
  const slot = section.querySelector('[data-slot]');
  const second = document.querySelector('.generic-autopager-page[data-page="2"]');
  const normalGap = second.querySelector('[data-item]').getBoundingClientRect().top -
    second.querySelector('.generic-autopager-divider').getBoundingClientRect().bottom;
  return {
    normalGap: Math.round(normalGap),
    gap: Math.round(card.getBoundingClientRect().top - divider.getBoundingClientRect().bottom),
    slot: Math.round(slot?.getBoundingClientRect().height || 0),
    cards: Array.from(section.querySelectorAll('[data-item] a'), a => [a.textContent, a.href]),
  };
}
