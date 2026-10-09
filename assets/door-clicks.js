/* door-clicks.js (2026-10-09, stage 1): GA4 link-click events for site doors.
   door_click = same-site link; lmp_click = link to lakeminnetonkaprobate.com.
   Additive only: no existing events touched, no utm stripped, no PII (url + visible link text only). */
(function () {
  if (window.__gsDoorClicks) return;
  window.__gsDoorClicks = true;
  var LMP = /(^|\.)lakeminnetonkaprobate\.com$/i;
  function cut(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 100); }
  function areaOf(a) {
    if (a.closest && a.closest('footer, .site-foot')) return 'footer';
    for (var el = a; el && el !== document.body; el = el.parentElement) {
      var k = ((typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '')).toLowerCase();
      if (/sister/.test(k)) return 'sister';
      if (/(^|[\s_-])(cta|door|doors|door2|soft-doors|keepsell-btn|magnet|reach|btn|button)([\s_-]|$)/.test(k)) return 'cta';
      var t = el.tagName;
      if (t === 'NAV' || t === 'HEADER') return 'nav';
    }
    return 'body';
  }
  document.addEventListener('click', function (e) {
    try {
      if (typeof gtag !== 'function') return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch (_) { return; }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      var host = u.hostname.replace(/^www\./, ''), here = location.hostname.replace(/^www\./, '');
      var p = { link_url: cut(u.href), link_text: cut(a.innerText || a.textContent || a.getAttribute('aria-label')), door_area: areaOf(a), transport_type: 'beacon' };
      if (LMP.test(host)) { gtag('event', 'lmp_click', p); return; }
      if (host !== here) return;
      if (u.pathname === location.pathname && u.hash && u.search === location.search) return; /* same-page jump links */
      gtag('event', 'door_click', p);
    } catch (_) {}
  }, true);
})();
