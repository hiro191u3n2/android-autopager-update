// Imported results share one document. Resolve local HTML references inside
// their own result page before attaching controls to the live DOM.
function scopeGenericGoogleReferences(root, page) {
  const attrs = ['for', 'form', 'list', 'headers', 'aria-labelledby', 'aria-describedby', 'aria-controls',
    'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto', 'popovertarget', 'commandfor'];
  const links = root.querySelectorAll(attrs.map(name => '[' + name + ']').join(',') + ',a[href^="#"],input[type="radio"][name]');
  if (!links.length) return;
  let serial = 0;
  const doc = root.ownerDocument;
  const byId = new Map();
  for (const node of root.querySelectorAll('[id]')) if (!byId.has(node.id)) byId.set(node.id, node);
  const aliases = new Map();
  const fresh = () => {
    let id;
    do { id = 'generic-autopager-local-' + page + '-' + (++serial); } while (doc.getElementById(id) || byId.has(id));
    return id;
  };
  const local = id => {
    if (aliases.has(id)) return aliases.get(id);
    const target = byId.get(id);
    if (!target || target.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !doc.getElementById(id)) return id;
    const alias = fresh();
    target.id = alias;
    aliases.set(id, alias);
    return alias;
  };
  let radioForm;
  for (const node of links) {
    for (const attr of attrs) {
      const value = node.getAttribute(attr);
      if (!value) continue;
      const updated = value.replace(/[^\t\n\f\r ]+/g, local);
      if (updated !== value) node.setAttribute(attr, updated);
    }
    if (node.matches('a[href^="#"]')) {
      const fragment = node.getAttribute('href').slice(1);
      try {
        const id = decodeURIComponent(fragment), alias = local(id);
        if (alias !== id) node.setAttribute('href', '#' + alias);
      } catch (_) { }
    }
    if (node.matches('input[type="radio"]') && node.name && !node.hasAttribute('form') && !node.closest('form')) {
      if (!radioForm) {
        radioForm = doc.createElement('form');
        radioForm.id = fresh();
        radioForm.hidden = true;
        // Connect the owner ahead of checked inputs so they never join the
        // first page's unowned radio group, even briefly during insertion.
        root.insertBefore(radioForm, root.firstChild);
      }
      node.setAttribute('form', radioForm.id);
    }
  }
}
