// Called only at generic-pager boot, never from scroll or mutation callbacks.
// Product galleries and next-product links are not listing pagination.
function isGenericFashionProductPageV646() {
  const host = location.hostname, path = location.pathname;
  if (/^store\.cityhill\.co\.jp$/i.test(host) && /^\/(?:sp\/)?(?:majesticlegon\/)?item\/\d+\.html\/?$/i.test(path)) return true;
  if (/^(?:www\.)?palcloset\.jp$/i.test(host) && /^\/display\/item\/[^/]+/i.test(path)) return true;
  if (/^(?:www\.)?atomicboxx\.com$/i.test(host) && /^\/ap\/item\/i\/[^/]+/i.test(path)) return true;
  // These are detail-page declarations, unlike Product microdata on list cards.
  if (document.body?.matches('.template-product,.fs-body-product,#itemDetailPage,#productDetail,#product_detail')) return true;
  return Boolean(document.querySelector('meta[property="og:type"][content="product" i],meta[property="og:type"][content="product.item" i]'));
}

// Generic adapters also import cards from other brands. Resolve their lazy src
// as before, but let the browser defer offscreen product images. This inspects
// only the imported subtree; it never sweeps the current page or gallery.
function useGenericCommerceLazyImagesV646(root) {
  if (/(^|\.)google\.[a-z.]+$/i.test(location.hostname) || /(^|\.)buzzap\.jp$/i.test(location.hostname)) return false;
  const selector = '[itemtype~="https://schema.org/Product"],[itemtype~="http://schema.org/Product"],.product-card,.productCard,.product_card,.product-tile,.productTile,.product_tile,.fs-c-productList';
  return Boolean(root.matches?.(selector) || root.querySelector?.(selector));
}
