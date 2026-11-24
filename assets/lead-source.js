/* Same-origin session memory for campaign fields already sent with a lead.
   Remembers utm_*, gclid, and an external referrer across pages on this site.
   A new campaign in the address bar replaces the saved one. Contact details are never stored. */
(function (root) {
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid'];
  var STORE = 'gs_lead_src_v1';

  function blank() {
    var o = { referrer: '' };
    for (var i = 0; i < KEYS.length; i++) o[KEYS[i]] = '';
    return o;
  }

  function hasCampaign(o) {
    for (var i = 0; i < KEYS.length; i++) if (o[KEYS[i]]) return true;
    return false;
  }

  function fromSearch() {
    var o = blank();
    try {
      var p = new URLSearchParams(root.location.search || '');
      for (var i = 0; i < KEYS.length; i++) {
        var v = p.get(KEYS[i]);
        if (v && String(v).trim()) o[KEYS[i]] = String(v).trim();
      }
    } catch (e) {}
    return o;
  }

  function externalReferrer() {
    var r = '';
    try { r = (root.document && root.document.referrer) || ''; } catch (e) { return ''; }
    if (!r) return '';
    try {
      if (new URL(r).origin === root.location.origin) return '';
    } catch (e) { return ''; }
    return r;
  }

  function readStore() {
    try {
      var raw = root.sessionStorage.getItem(STORE);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      var o = blank();
      for (var i = 0; i < KEYS.length; i++) {
        if (typeof parsed[KEYS[i]] === 'string') o[KEYS[i]] = parsed[KEYS[i]];
      }
      if (typeof parsed.referrer === 'string') o.referrer = parsed.referrer;
      return o;
    } catch (e) { return null; }
  }

  function writeStore(o) {
    var saved = blank();
    for (var i = 0; i < KEYS.length; i++) saved[KEYS[i]] = o[KEYS[i]] || '';
    saved.referrer = o.referrer || '';
    try { root.sessionStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {}
  }

  function gsLeadSource() {
    var fresh = fromSearch();
    var stored = readStore();
    var ref = externalReferrer();
    var out = blank();
    if (hasCampaign(fresh)) {
      for (var i = 0; i < KEYS.length; i++) out[KEYS[i]] = fresh[KEYS[i]];
      out.referrer = ref || (stored && stored.referrer) || '';
      writeStore(out);
    } else if (stored) {
      for (var j = 0; j < KEYS.length; j++) out[KEYS[j]] = stored[KEYS[j]] || '';
      out.referrer = stored.referrer || ref || '';
      if (ref && !stored.referrer) writeStore(out);
    } else {
      out.referrer = ref;
      if (ref) writeStore(out);
    }
    return out;
  }

  root.gsLeadSource = gsLeadSource;
})(typeof window !== 'undefined' ? window : this);
