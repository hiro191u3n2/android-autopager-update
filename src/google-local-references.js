// Imported results share one document. Resolve local HTML references inside
// their own result page before attaching controls to the live DOM.
function scopeGenericGoogleReferences(root, page, sourceURL, documentURL) {
  const attrs = ['for', 'form', 'list', 'headers', 'aria-labelledby', 'aria-describedby', 'aria-controls',
    'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto', 'popovertarget', 'commandfor'];
  const links = root.querySelectorAll(attrs.map(name => '[' + name + ']').join(',') + ',a[href*="#"],input[type="radio"][name],details[name]');
  if (!links.length) return;
  let serial = 0;
  const doc = root.ownerDocument;
  const byId = new Map();
  for (const node of root.querySelectorAll('[id]')) if (!byId.has(node.id)) byId.set(node.id, node);
  const aliases = new Map();
  const disclosureGroups = new Map();
  const usedNames = new Set(Array.from(root.querySelectorAll('details[name]'), node => node.getAttribute('name')));
  const sources = new Set([sourceURL, documentURL].filter(Boolean).map(url => url.split('#')[0]));
  const fresh = () => {
    let id;
    do { id = 'generic-autopager-local-' + page + '-' + (++serial); } while (doc.getElementById(id) || byId.has(id) || usedNames.has(id) || doc.getElementsByName(id).length);
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
    if (node.matches('a[href*="#"]')) {
      const href = node.getAttribute('href');
      const hash = href.indexOf('#');
      try {
        const id = decodeURIComponent(href.slice(hash + 1));
        if (byId.has(id) && (hash === 0 || sources.has(href.slice(0, hash)))) {
          const alias = local(id);
          if (hash || alias !== id) node.setAttribute('href', '#' + (alias === id ? href.slice(hash + 1) : alias));
        }
      } catch (_) { }
    }
    if (node.matches('details[name]')) {
      const name = node.getAttribute('name');
      if (name) {
        if (!disclosureGroups.has(name)) disclosureGroups.set(name, fresh());
        node.setAttribute('name', disclosureGroups.get(name));
      }
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

// A hidden label referenced by an accessible control contributes its text even
// when it paints nothing. Keep its original (hidden) ancestors and descendants.
function pruneGenericGoogleHiddenPanels(root) {
  const removable = root.querySelectorAll('[hidden],[inert]');
  const collapsed = root.querySelectorAll('[aria-expanded="false"][aria-controls]');
  if (!removable.length && !collapsed.length) return;
  const byId = new Map();
  for (const node of root.querySelectorAll('[id]')) if (!byId.has(node.id)) byId.set(node.id, node);
  const keep = new Set();
  const attrs = ['aria-labelledby', 'aria-describedby', 'aria-details', 'aria-errormessage'];
  for (const owner of root.querySelectorAll(attrs.map(attr => '[' + attr + ']').join(','))) {
    for (const attr of attrs) {
      const value = owner.getAttribute(attr);
      if (!value) continue;
      for (const id of value.trim().split(/\s+/)) {
        const label = byId.get(id);
        if (!label) continue;
        for (let p = label; p && p !== root && !keep.has(p); p = p.parentElement) keep.add(p);
        for (const nested of label.querySelectorAll('[hidden],[inert]')) keep.add(nested);
      }
    }
  }
  for (const node of removable) if (!keep.has(node)) node.remove();
  for (const control of collapsed) {
    const panel = byId.get(control.getAttribute('aria-controls'));
    if (panel && root.contains(control) && !keep.has(panel)) panel.remove();
  }
}
