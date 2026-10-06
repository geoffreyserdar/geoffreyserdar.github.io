/* week-magnet.js (2026-10-06): handler for the shared "This week at a glance" card.
   Same pipeline as the lake-town pages: browser checks -> Twilio lead-alert (text to Geoffrey,
   phone or not) -> Formspree mpqerwwk -> Compass pixel bridge -> Google Ads conversion + GA4 generate_lead.
   The delivery email goes out from the Mac (lead-magnet-deliver.js) when the Formspree note lands.
   Markup: <section class="wm" data-week-magnet data-local="..." data-interest="..._weekly_note"> */
(function () {
  'use strict';
  var FORM_ID = 'mpqerwwk';
  var LEAD_ALERT_URL = 'https://lead-alert-4343.twil.io/lead-alert';
  var ADS_SEND_TO = 'AW-17849235035/jRxICLmDpr0cENvslr9C';

  var LEAD_SOURCE = (function () {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '', utm_content: p.get('utm_content') || '',
      gclid: p.get('gclid') || '', referrer: document.referrer || ''
    };
  })();

  function isValidUSPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return false;
    if (+d.charAt(0) < 2 || +d.charAt(3) < 2) return false;
    if (d.charAt(1) === '1' && d.charAt(2) === '1') return false;
    if (d.slice(3, 6) === '555') return false;
    if (/^(\d)\1{9}$/.test(d)) return false;
    return true;
  }
  function isValidEmail(raw) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw || '').trim()); }

  function alertGeoffrey(d) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 2500);
    var data = new URLSearchParams({
      name: d.name, phone: d.phone, email: d.email, interest: d.interestLabel,
      site: window.location.hostname + window.location.pathname, local: d.local,
      utm_source: LEAD_SOURCE.utm_source, utm_medium: LEAD_SOURCE.utm_medium, utm_campaign: LEAD_SOURCE.utm_campaign,
      utm_content: LEAD_SOURCE.utm_content, gclid: LEAD_SOURCE.gclid, referrer: LEAD_SOURCE.referrer
    });
    return fetch(LEAD_ALERT_URL, { method: 'POST', body: data, signal: controller.signal })
      .then(function (r) { clearTimeout(timer); return r.json(); })
      .catch(function () { clearTimeout(timer); return { valid: true, failOpen: true }; });
  }

  function submitToFormspree(d) {
    return fetch('https://formspree.io/f/' + FORM_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: d.name, phone: d.phone, email: d.email, interest: d.interest, interest_detail: d.interest,
        local: d.local, utm_source: LEAD_SOURCE.utm_source, utm_medium: LEAD_SOURCE.utm_medium,
        utm_campaign: LEAD_SOURCE.utm_campaign, utm_content: LEAD_SOURCE.utm_content,
        gclid: LEAD_SOURCE.gclid, referrer: LEAD_SOURCE.referrer
      })
    }).catch(function () {});
  }

  var bridgeBusy = false;
  function notifyCompassLeadPixel(name, phone, email) {
    try {
      var g = window.__global__;
      if (g && typeof g.track === 'function') {
        var parts = name.split(/\s+/).filter(Boolean);
        g.track('Lead', { name: name, phone: phone, email: email, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') });
        return;
      }
    } catch (_t) {}
    if (bridgeBusy) return;
    bridgeBusy = true;
    try {
      var form = document.createElement('form');
      form.id = 'cxlpBridgeForm';
      form.setAttribute('data-cxlp-bridge', '1');
      form.setAttribute('aria-hidden', 'true');
      form.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:0;width:0;overflow:hidden;opacity:0;pointer-events:none;';
      [['text', 'name', name], ['tel', 'phone', phone], ['email', 'email', email]].forEach(function (f) {
        var inp = document.createElement('input');
        inp.type = f[0]; inp.name = f[1]; inp.id = 'cxlpBridge_' + f[1]; inp.value = f[2] || '';
        inp.autocomplete = f[1] === 'phone' ? 'tel' : f[1];
        form.appendChild(inp);
      });
      document.body.appendChild(form);
      setTimeout(function () {
        try { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } catch (_s) {}
        setTimeout(function () { try { form.parentNode.removeChild(form); } catch (_r) {} bridgeBusy = false; }, 80);
      }, 60);
    } catch (_e) { bridgeBusy = false; }
  }

  function wire(card) {
    var form = card.querySelector('form');
    if (!form) return;
    var q = function (sel) { return card.querySelector(sel); };
    var nameEl = q('input[name="name"]'), emailEl = q('input[name="email"]'), phoneEl = q('input[name="phone"]');
    var emailErr = q('[data-wm-err="email"]'), phoneErr = q('[data-wm-err="phone"]');
    var btn = q('.submit-btn'), btnLabel = btn ? btn.textContent : '';
    var local = card.getAttribute('data-local') || document.title;
    var interest = card.getAttribute('data-interest') || 'weekly_lake_note';
    var converted = false, lastField = null, startFired = false;

    function err(el, box, on) {
      if (box) box.classList[on ? 'add' : 'remove']('visible');
      if (el) { el.classList[on ? 'add' : 'remove']('input-error'); if (on) el.focus(); }
    }
    function touch(id) {
      lastField = id;
      if (startFired) return;
      startFired = true;
      if (typeof gtag === 'function') gtag('event', 'form_start', { first_field: id, form_id: 'week_magnet' });
    }
    [['name', nameEl], ['email', emailEl], ['phone', phoneEl]].forEach(function (pair) {
      if (!pair[1]) return;
      ['focus', 'input', 'change'].forEach(function (ev) { pair[1].addEventListener(ev, function () { touch(pair[0]); }); });
    });
    if (emailEl) emailEl.addEventListener('input', function () { err(null, emailErr, false); emailEl.classList.remove('input-error'); });
    if (phoneEl) phoneEl.addEventListener('input', function (e) {
      var v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
      if (v.length >= 7) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6);
      else if (v.length >= 4) v = v.slice(0, 3) + '-' + v.slice(3);
      e.target.value = v;
      err(null, phoneErr, false); phoneEl.classList.remove('input-error');
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var d = {
        name: (nameEl.value || '').trim(), email: (emailEl.value || '').trim(), phone: (phoneEl ? phoneEl.value : '').trim(),
        interest: interest, interestLabel: interest.replace(/_/g, ' '), local: local
      };
      if (!d.name) { nameEl.focus(); return; }
      if (!isValidEmail(d.email)) { err(emailEl, emailErr, true); return; }
      if (d.phone && !isValidUSPhone(d.phone)) { err(phoneEl, phoneErr, true); return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var verdict = await alertGeoffrey(d);
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      if (d.phone && verdict && verdict.valid === false) { err(phoneEl, phoneErr, true); return; }
      submitToFormspree(d);
      try { notifyCompassLeadPixel(d.name, d.phone, d.email); } catch (_c) {}
      q('.form-fields').classList.add('hidden');
      q('.success-state').classList.add('visible');
      if (!converted) {
        converted = true;
        try {
          if (typeof gtag === 'function') {
            gtag('event', 'conversion', { send_to: ADS_SEND_TO, value: 1.0, currency: 'USD' });
            gtag('event', 'generate_lead', {
              currency: 'USD', value: 1.0, lead_source: LEAD_SOURCE.utm_source, lead_medium: LEAD_SOURCE.utm_medium,
              lead_campaign: LEAD_SOURCE.utm_campaign, gclid_present: LEAD_SOURCE.gclid ? 'yes' : 'no',
              page_path: location.pathname, form_id: 'week_magnet'
            });
          }
        } catch (_g) {}
      }
      try { q('.success-state').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_s) {}
    });

    var abandoned = false;
    window.addEventListener('pagehide', function () {
      if (abandoned || !lastField || converted) return;
      abandoned = true;
      if (typeof gtag === 'function') gtag('event', 'form_abandon', { last_field: lastField, form_id: 'week_magnet' });
    });
  }

  function init() {
    var cards = document.querySelectorAll('[data-week-magnet]');
    for (var i = 0; i < cards.length; i++) wire(cards[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
