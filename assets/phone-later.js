/* phone-later.js (2026-10-30). Step one asks only name and email. After a lead posts to Formspree
   and its thank-you shows, offer an optional phone that posts to the same Formspree form with the
   same email and lead tags, plus note=follow_up_phone, so it attaches to the same lead. */
(function () {
  if (window.__phoneLater) return; window.__phoneLater = 1;
  var last = null, before = [];
  var SEL = '[id*="uccess"],[id*="hanks"],[id*="hankyou"],[class*="success"],[class*="thanks"],[data-wm-success],[id$="-ok"]';
  function snap() { before = cands().filter(vis); }
  document.addEventListener('submit', function (e) { var f = e.target; if (f && (f.id === 'cxlpBridgeForm' || (f.getAttribute && f.getAttribute('data-cxlp-bridge') === '1') || f.closest('.pl-box'))) return; snap(); }, true);
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('button,input[type=submit]') && !e.target.closest('.pl-box')) snap(); }, true);
  function vis(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)) && getComputedStyle(el).visibility !== 'hidden'; }
  function cands() { return Array.prototype.slice.call(document.querySelectorAll(SEL)).filter(function (e) { return !e.closest('.pl-box') && !(e.parentElement && e.parentElement.closest(SEL)); }); }
  function toObj(b) {
    var o = {};
    try {
      if (typeof b === 'string') { try { return JSON.parse(b); } catch (_) { new URLSearchParams(b).forEach(function (v, k) { o[k] = v; }); return o; } }
      if (b && typeof b.forEach === 'function') { b.forEach(function (v, k) { if (typeof v === 'string') o[k] = v; }); return o; }
    } catch (_) {}
    return o;
  }
  var of = window.fetch;
  if (of) window.fetch = function (u, opt) {
    var url = typeof u === 'string' ? u : (u && u.url) || '';
    var p = of.apply(this, arguments);
    if (/formspree\.io\/f\//.test(url) && !(opt && opt.__pl)) {
      var data = toObj(opt && opt.body);
      if (data.email && data.note !== 'follow_up_phone') {
        last = { url: url, data: data };
        p.then(function (r) { if (r && r.ok) watch(last); }).catch(function () {});
      }
    }
    return p;
  };
  function watch(lead) {
    var n = 0, t = setInterval(function () {
      n++;
      var fresh = cands().filter(function (e) { return vis(e) && before.indexOf(e) < 0 && !e.querySelector('.pl-box') && !(e.nextElementSibling && e.nextElementSibling.classList.contains('pl-box')); });
      if (fresh.length) { clearInterval(t); offer(fresh[0], lead); }
      else if (n > 40) clearInterval(t);
    }, 150);
  }
  function css() {
    if (document.getElementById('pl-css')) return;
    var s = document.createElement('style'); s.id = 'pl-css';
    s.textContent = '.pl-box{margin:18px auto 0;max-width:420px;text-align:left}.pl-box label{display:block;font-weight:600;font-size:16px;margin:0 0 6px}' +
      '.pl-row{display:flex;gap:8px}.pl-box input{flex:1;min-width:0;font-size:16px;padding:12px;border:1px solid #bbb;border-radius:8px;box-sizing:border-box}' +
      '.pl-box button{font-size:16px;padding:12px 16px;border:0;border-radius:8px;background:#1a1a1a;color:#fff;cursor:pointer}' +
      '.pl-box .pl-msg{font-size:15px;margin:8px 0 0;display:none}.pl-box .pl-fine{font-size:13px;opacity:.75;margin:8px 0 0}';
    document.head.appendChild(s);
  }
  function offer(host, lead) {
    css();
    var box = document.createElement('div'); box.className = 'pl-box';
    box.innerHTML = '<label for="plPhone">Want a call or text? Add your number</label>' +
      '<div class="pl-row"><input id="plPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Your best number (optional)"><button type="button" id="plBtn">Send</button></div>' +
      '<p class="pl-msg" id="plMsg" role="status"></p>' +
      '<p class="pl-fine">Optional. By adding it, you agree Serdar+Partners at Compass may call or text you at this number. Reply STOP to opt out.</p>';
    var fp = host.querySelector('p'); if (/^(P|SPAN)$/.test(host.tagName)) host.insertAdjacentElement('afterend', box); else if (fp && fp.parentNode === host) fp.insertAdjacentElement('afterend', box); else host.appendChild(box);
    var inp = box.querySelector('#plPhone'), btn = box.querySelector('#plBtn'), msg = box.querySelector('#plMsg');
    inp.addEventListener('input', function () {
      var v = inp.value.replace(/[^0-9]/g, ''); if (v.length === 11 && v[0] === '1') v = v.slice(1); v = v.slice(0, 10);
      inp.value = v.length >= 7 ? v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6) : v.length >= 4 ? v.slice(0, 3) + '-' + v.slice(3) : v;
    });
    btn.addEventListener('click', function () {
      var d = inp.value.replace(/[^0-9]/g, '');
      if (d.length !== 10 || /^[01]/.test(d)) { msg.textContent = 'That number does not look quite right. Mind checking it?'; msg.style.display = 'block'; return; }
      btn.disabled = true;
      var p = {}; for (var k in lead.data) if (Object.prototype.hasOwnProperty.call(lead.data, k)) p[k] = lead.data[k];
      p.phone = d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
      p.note = p.note ? 'follow_up_phone | ' + p.note : 'follow_up_phone';
      p.follow_up = 'phone added after submit';
      p.page = p.page || location.pathname;
      p._subject = 'Follow up phone for ' + (p.name || p.email);
      of(lead.url, { __pl: 1, method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(p) })
        .then(function (r) { return r.ok; }).catch(function () { return false; }).then(function (ok) {
          if (ok) {
            box.querySelector('.pl-row').style.display = 'none';
            msg.textContent = 'Got it. Geoffrey will reach out at that number.'; msg.style.display = 'block';
            try { if (typeof gtag === 'function') gtag('event', 'follow_up_phone', { page_path: location.pathname, interest: p.interest || p.lead_type || '' }); } catch (_) {}
          } else {
            btn.disabled = false; msg.textContent = 'That did not go through. Please try again, or text Geoffrey at 952 258 3100.'; msg.style.display = 'block';
          }
        });
    });
  }
})();
