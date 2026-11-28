import { gapPage } from './google-leading-gap.mjs';

export function sparsePage(n, ending, overlay = false) {
  const html = gapPage(n,'short');
  if (n !== 2 && !(ending && n > 2)) return html;
  const onlyNavigation = '<div role="navigation"><a href="https://help.example/page/' + n + '">ヘルプ</a></div>';
  let page = html.replace(/<article\b[\s\S]*?<\/article>/g, onlyNavigation);
  if (overlay && n === 2) page = page.replace(onlyNavigation, onlyNavigation +
    '<a data-overlay style="position:absolute;top:4px;left:8px" href="https://museum.example/entry">開館情報</a>');
  return ending ? page.replace(/<nav>[\s\S]*?<\/nav>/, '') : page;
}
