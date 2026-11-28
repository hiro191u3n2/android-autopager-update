import { gapPage } from './google-leading-gap.mjs';

export function movieGridPage(page) {
  const html = gapPage(page, 'short');
  if (page !== 3) return html;
  const poster = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="72"%3E%3Crect width="64" height="72" fill="%239b4130"/%3E%3C/svg%3E';
  const css = `<style>
    .movie-grid{display:grid;grid-template-columns:minmax(0,1fr) 64px;grid-auto-columns:24%;
      grid-template-areas:"site site" "heading heading" "summary poster" "rating poster";
      gap:4px 12px;align-items:start;justify-items:start}
    .movie-grid cite{grid-area:site}.movie-grid a{grid-area:heading}
    .movie-grid p{grid-area:summary}.movie-grid small{grid-area:rating;justify-self:end}
    .movie-grid img{grid-area:poster;justify-self:end}
  </style>`;
  const movie = `<article class="MjjYud movie-grid" data-item="movie"><cite>Yahoo!検索</cite>
    <a href="https://search.yahoo.co.jp/movie/1"><h3>「武士の一分（いちぶん）映画」の検索結果 - Yahoo!検索</h3></a>
    <p>映画。主演は木村拓哉。原作は時代小説『盲目剣谺返し』。作品のあらすじと評価を紹介します。</p>
    <small>3.8 ★★★★☆</small><img width="64" height="72" alt="作品ポスター" src='${poster}'></article>`;
  const articles = html.match(/<article\b[\s\S]*?<\/article>/g);
  return html.replace('<main', css + '<main').replace(articles.join(''), articles[1] + movie + articles[0]);
}

// Coordinates relative to the movie survive scrolling and different divider heights.
export function movieGeometry() {
  const section = document.querySelector('.generic-autopager-page[data-page="3"]') || document;
  const movie = section.querySelector('[data-item="movie"]');
  if (!movie) return null;
  const card = movie.getBoundingClientRect();
  const boxes = {};
  for (const selector of ['cite', 'h3', 'p', 'small', 'img']) {
    const box = movie.querySelector(selector).getBoundingClientRect();
    boxes[selector] = [box.x - card.x, box.y - card.y, box.width, box.height].map(Math.round);
  }
  return { boxes, neighbors: [movie.previousElementSibling?.dataset.item, movie.nextElementSibling?.dataset.item],
    cardWidth: Math.round(card.width), areas: getComputedStyle(movie).gridTemplateAreas };
}
