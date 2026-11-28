// A mobile result can contain other searches and numbered links in any order.
// Prefer Google's explicit forward control, then the nearest later offset.
function genericGoogleForwardLink(doc, source) {
  const current = new URL(source);
  const identity = genericGoogleNextIdentityV663(current.href);
  const offset = Number(current.searchParams.get('start') || 0);
  const selectors = [
    'a#pnnext[href],a[rel~="next" i][href],a[aria-label="Next page" i][href],a[aria-label="次へ"][href],a[aria-label*="次のページ"][href]',
    'nav a[href*="start="],[role="navigation"] a[href*="start="]',
    'a[href*="/search?"][href*="start="]',
  ];
  for (const selector of selectors) {
    let nearest = Infinity, next = null;
    for (const link of doc.querySelectorAll(selector)) {
      let url;
      try { url = new URL(link.getAttribute('href'), current); } catch { continue; }
      if (!identity || genericGoogleNextIdentityV663(url.href) !== identity ||
          url.searchParams.get('tbs') !== current.searchParams.get('tbs')) continue;
      const raw = url.searchParams.get('start');
      if (!/^\d+$/.test(raw || '')) continue;
      const index = Number(raw);
      if (Number.isSafeInteger(index) && index > offset && index < nearest) {
        nearest = index;
        next = url.href;
      }
    }
    if (next) return next;
  }
  return null;
}

function genericGoogleResultOrGate(doc) {
  const path = doc.location?.pathname || '';
  if (/^\/sorry(?:\/|$)/.test(path) || doc.querySelector('form#captcha-form,form[action*="/sorry/"]')) {
    return 'Googleの確認画面が返されました';
  }
  // Search titles and snippets can quote the exact wording of a challenge.
  // Retain the text-only fallback for interstitials without organic results.
  const results = doc.querySelector('#rso,#search [role="main"],#search');
  if (results && genericGoogleTailHasResultV663(results)) return '';
  return null;
}
