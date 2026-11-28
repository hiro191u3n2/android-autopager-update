import { visualPage } from './google-visible-results.mjs';

// Preserve the published destination in both the direct page and iframe flow.
export function gotoPage(number, signed = false) {
  const html = visualPage(number);
  if (number === 1) return html;
  let index = 0;
  const wrapped = html.replace(/href="(https:\/\/[^"]+)"/g, (_, href) => signed ?
    'href="/goto?url=token-' + number + '-' + (++index) + '&amp;gsessionid=session-' + number + '"' :
    'href="/goto?url=' + encodeURIComponent(href) + '"');
  return wrapped.replace('</div></main>', '<a data-internal href="/goto?url=%2Fsearch">検索</a>' +
    '<a data-invalid href="/goto?url=javascript%3Avoid%280%29">その他</a></div></main>');
}
