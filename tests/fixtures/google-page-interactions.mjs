import { gapPage } from './google-leading-gap.mjs';

export const residualGaps = ['padding', 'root-margin', 'stack', 'clipped', 'status', 'empty-frame', 'ad-frame', 'overlay', 'late'];
export const preservedStarts = ['hero', 'caption', 'live-frame'];
export function interactionPage(n, sample) {
  let page = gapPage(n, 'short').replace('<div data-slot style="height:8px"></div>', '');
  if (sample === 'controls') {
    const panel = '<div class="working-controls"><a data-jump href="#%E6%B3%A8%E9%87%88">注釈へ</a>' +
      '<p id="注釈" data-note>注釈 ' + n + '</p><label for="day">日程を選ぶ</label><input data-day type="checkbox" id="day">' +
      '<input data-a type="radio" name="sort" checked><input data-b type="radio" name="sort">' +
      '<form id="dates"></form><input data-form form="dates" name="city"><a data-external href="https://other.example/#day">地図</a>' +
      '<details><summary>施設情報</summary><p>説明 ' + n + '</p></details>' +
      '<div class="fluid-grid" style="display:grid;grid-template-columns:1fr 1fr"><div>東</div><div>西</div></div></div>';
    return page.replace('</div></div></main>', panel + '</div></div></main>');
  }
  if (n !== 3) return page;
  const parts = {
    padding: '<div style="padding-top:250px">', 'root-margin': '<div>',
    stack: '<div>' + '<div style="height:50px;background:white"></div>'.repeat(5),
    clipped: '<div><div class="slot"><span style="width:0;height:0;overflow:hidden"><span>取得中</span></span></div>',
    status: '<div><div class="slot" role="status" aria-busy="true" aria-label="読み込み中"></div>',
    'empty-frame': '<div><div class="slot"><iframe style="width:100%;height:240px;border:0" src="about:blank"></iframe></div>',
    'ad-frame': '<div><div class="slot"><iframe title="広告" width="300" height="250" src="about:blank"></iframe></div>',
    overlay: '<div style="padding-top:250px">',
    late: '<div><div class="slot"><span data-transient>検索中</span></div>',
    hero: '<div style="padding-top:250px;position:relative"><button style="position:absolute;top:20px">予告を再生</button>',
    caption: '<div><p>映画作品の説明</p><div style="height:250px"></div>',
    'live-frame': '<div><div class="slot"><iframe title="地図" srcdoc="映画館"></iframe></div>'
  };
  if (sample === 'overlay') page = page.replaceAll('<article class="MjjYud"', '<article style="position:relative" class="MjjYud"')
    .replace(/<a href="([^"]+)"><h3>([^<]+)<\/h3><\/a>/g, '<a aria-label="$2" style="position:absolute;inset:0" href="$1"></a><h3>$2</h3>');
  return page.replace('<div id="rso"><div>', '<div id="rso"' + (sample === 'root-margin' ? ' style="margin-top:250px"' : '') + '>' + parts[sample]);
}

// Use actual activation and the browser's resolved owners, as well as box metrics.
export function operateThirdPage() {
  const section = document.querySelector('.generic-autopager-page[data-page="3"]');
  const one = document.querySelector('.working-controls'), q = s => section.querySelector(s);
  q('label').click();
  q('[data-b]').click();
  q('[data-jump]').click();
  q('summary').click();
  return { checkedHere: q('[data-day]').checked, checkedFirst: one.querySelector('[data-day]').checked,
    jumpHere: document.querySelector(':target') === q('[data-note]'),
    otherRadios: [...document.querySelectorAll('[data-a]')].filter(el => !section.contains(el)).every(el => el.checked),
    radioHere: q('[data-b]').checked && !q('[data-a]').checked, formHere: q('[data-form]').form === q('form#dates,form:not([hidden])'),
    external: q('[data-external]').href, details: q('details').open };
}

export function gridWidths() {
  const box = document.querySelector('.generic-autopager-page[data-page="3"] .fluid-grid');
  const rect = box.getBoundingClientRect();
  return [Math.round(rect.width), Math.round(box.lastElementChild.getBoundingClientRect().right - rect.left)];
}
