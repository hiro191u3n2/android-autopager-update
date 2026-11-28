import { gapPage } from './google-leading-gap.mjs';

export function readingPage(n, sourceURL) {
  const url = new URL(sourceURL);
  const href = (url.pathname + url.search).replaceAll('&', '&amp;');
  const controls = `<section data-reading="${n}">
    <span id="narration" hidden>第${n}ページの上映日</span>
    <button aria-labelledby="narration" data-narrator>日程</button>
    <details name="venues" open><summary>昼の上映館</summary><p>劇場案内 ${n}</p></details>
    <details name="venues"><summary>夜の上映館</summary><p>夜の劇場案内 ${n}</p></details>
    <a data-local href="${href}#%E6%B3%A8%E9%87%88">この結果の注釈</a>
    <a data-other href="https://cinema.example/movie#注釈">掲載サイトの注釈</a>
    <a data-absent href="${href}#unavailable">元ページへ</a>
    <p id="注釈" data-note>第${n}ページの注釈</p>
  </section>`;
  return gapPage(n, 'short').replace('</div></div></main>', controls + '</div></div></main>');
}

export function measureReadingOrder() {
  const blocks = [...document.querySelectorAll('[data-reading]')];
  const third = blocks.find(n => n.dataset.reading === '3');
  const summaries = third.querySelectorAll('summary');
  const first = blocks[0].querySelector('details');
  const defaults = blocks.map(n => n.querySelector('details').open);
  summaries[1].click();
  const button = third.querySelector('[data-narrator]');
  const label = document.getElementById(button.getAttribute('aria-labelledby'));
  const note = third.querySelector('[data-note]');
  const link = third.querySelector('[data-local]');
  return { defaults, firstOpen: first.open, thirdOpen: [...third.querySelectorAll('details')].map(n=>n.open),
    local: link.href.split('#')[0] === location.href.split('#')[0] && decodeURIComponent(link.hash.slice(1)) === note.id &&
      document.getElementById(note.id) === note, label:label?.textContent, labelHidden:label?.hidden,
    other: third.querySelector('[data-other]').href, missing: third.querySelector('[data-absent]').href };
}
