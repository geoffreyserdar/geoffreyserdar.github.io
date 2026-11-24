/* phone-gate.js
   One house phone check for every lead form. Extends the inline isValidUSPhone
   that town pages already used: 10 digits after an optional leading 1, area and
   exchange cannot start with 0 or 1, area N11, repeated digits, and the 555
   exchange. This file also blocks exchange N11 and clear 10-digit runs, and it
   narrows 555 to the fictional 0100-0199 lines so a real 555 line can pass.
   Pages keep calling isValidUSPhone. This script replaces that function.
   A honeypot (gs_fax_line) is the only silent drop: bots see the normal
   success state, and Formspree / Twilio are not called. */
(function (root) {
  'use strict';

  var PHONE_MSG = "That number doesn't look right. Please enter a real 10 digit phone number so we can reach you.";
  var PHONE_MSG_ES = "Ese número no parece correcto. Escribe un teléfono real de 10 dígitos para que podamos comunicarnos. " + PHONE_MSG;
  var RUNS = {
    '1234567890': 1,
    '2345678901': 1,
    '2345678911': 1,
    '9876543210': 1
  };

  function digitsOf(raw) {
    var d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    return d;
  }

  function isN11(three) {
    return three.charAt(1) === '1' && three.charAt(2) === '1';
  }

  function isFullRun(d) {
    var asc = true;
    var desc = true;
    var i;
    for (i = 1; i < d.length; i++) {
      var prev = +d.charAt(i - 1);
      var cur = +d.charAt(i);
      if (cur !== (prev + 1) % 10) asc = false;
      if (cur !== (prev + 9) % 10) desc = false;
      if (!asc && !desc) return false;
    }
    return asc || desc;
  }

  function isValidUSPhone(raw) {
    var d = digitsOf(raw);
    if (d.length !== 10) return false;
    if (d.charAt(0) < '2' || d.charAt(3) < '2') return false;
    if (isN11(d.slice(0, 3)) || isN11(d.slice(3, 6))) return false;
    if (d.slice(3, 6) === '555' && d.slice(6, 8) === '01') return false;
    if (/^(\d)\1{9}$/.test(d)) return false;
    if (RUNS[d] || isFullRun(d)) return false;
    return true;
  }

  root.isValidUSPhone = isValidUSPhone;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isValidUSPhone: isValidUSPhone, PHONE_MSG: PHONE_MSG };
  }

  if (typeof document === 'undefined') return;

  function messageFor(el) {
    if (el && (el.id === 'celular_p1' || el.id === 'celular_p2')) return PHONE_MSG_ES;
    return PHONE_MSG;
  }

  function phoneAttempt(value) {
    var v = String(value || '');
    if (v.indexOf('@') >= 0) return false;
    if ((v.match(/[A-Za-z]/g) || []).length) return false;
    return v.replace(/\D/g, '').length >= 7;
  }

  function isPhoneField(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    if (el.disabled || el.type === 'hidden') return false;
    if (el.classList.contains('gs-hp')) return false;
    if (el.closest('.pl-box, #cxlpBridgeForm, [data-cxlp-bridge="1"]')) return false;
    if (el.type === 'tel') return true;
    if (el.id === 'friendContact' || el.id === 'nbYourContact' || el.id === 'nbTheirContact') return true;
    return false;
  }

  function fieldValueIsBad(el) {
    var v = String(el.value || '').trim();
    if (!v) return false;
    if (el.id === 'friendContact' || el.id === 'nbYourContact' || el.id === 'nbTheirContact') {
      if (!phoneAttempt(v)) return false;
    }
    return !isValidUSPhone(v);
  }

  function errorEl(el) {
    var id = el.getAttribute('aria-describedby');
    var i;
    if (id) {
      var parts = id.split(/\s+/);
      for (i = 0; i < parts.length; i++) {
        var described = document.getElementById(parts[i]);
        if (described && /error|err|alert/i.test(described.className + ' ' + described.id)) return described;
      }
    }
    var sib = el.nextElementSibling;
    if (sib && sib.id !== 'svErr' && /field-error|nb-err|form-inline-error|gs-phone-err/.test(sib.className)) return sib;
    var parent = el.parentNode;
    if (parent) {
      var found = parent.querySelector('.field-error, .nb-err, .form-inline-error, .gs-phone-err');
      if (found && found !== el) return found;
    }
    var byId = document.getElementById(el.id + 'Error') || document.getElementById(el.id + '-error');
    if (byId) return byId;
    if (el.id === 'wm-phone') {
      var card = el.closest('[data-week-magnet], form, .form-card');
      var wm = card && card.querySelector('[data-wm-err="phone"]');
      if (wm) return wm;
    }
    return null;
  }

  function ensureError(el) {
    var err = errorEl(el);
    if (err) {
      if (!err.id) err.id = (el.id || 'phone') + 'Error';
      if (!err.getAttribute('role')) err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'polite');
      if (el.id !== 'friendContact' && el.id !== 'nbYourContact' && el.id !== 'nbTheirContact') {
        err.textContent = messageFor(el);
      }
    } else {
      err = document.createElement('p');
      err.className = 'gs-phone-err';
      err.id = (el.id || 'phone') + '-gs-err';
      err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'polite');
      err.textContent = messageFor(el);
      el.insertAdjacentElement('afterend', err);
    }
    var described = el.getAttribute('aria-describedby') || '';
    if (described.split(/\s+/).indexOf(err.id) < 0) {
      el.setAttribute('aria-describedby', (described + ' ' + err.id).trim());
    }
    return err;
  }

  function paint(err, on) {
    if (!err) return;
    if (err.classList.contains('nb-err')) err.classList.toggle('on', on);
    if (err.classList.contains('field-error') || err.classList.contains('gs-phone-err')) {
      err.classList.toggle('visible', on);
    }
    if (!err.classList.contains('nb-err') && !err.classList.contains('field-error') && !err.classList.contains('gs-phone-err')) {
      err.style.display = on ? 'block' : 'none';
    }
    if (err.classList.contains('gs-phone-err')) err.classList.toggle('visible', on);
  }

  function showPhoneError(el, on, focus) {
    var err = ensureError(el);
    if (on && el.id === 'friendContact') err.textContent = PHONE_MSG;
    paint(err, on);
    el.setAttribute('aria-invalid', on ? 'true' : 'false');
    if (on && focus) {
      try { el.focus(); } catch (e) {}
    }
  }

  function firstBad(scope) {
    if (!scope || !scope.querySelectorAll) return null;
    var nodes = scope.querySelectorAll('input');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!isPhoneField(nodes[i])) continue;
      if (fieldValueIsBad(nodes[i])) return nodes[i];
    }
    return null;
  }

  function hpFilled(scope) {
    var rootNode = scope && scope.querySelectorAll ? scope : document;
    var nodes = rootNode.querySelectorAll('input.gs-hp, input[name="_gotcha"]');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].value) return true;
    }
    return false;
  }

  function addHoneypot(container) {
    if (!container || !container.appendChild) return;
    if (container.id === 'cxlpBridgeForm' || (container.getAttribute && container.getAttribute('data-cxlp-bridge') === '1')) return;
    if (container.querySelector('input.gs-hp, input[name="_gotcha"]')) return;
    var inp = document.createElement('input');
    inp.className = 'gs-hp';
    inp.type = 'text';
    inp.name = 'gs_fax_line';
    inp.tabIndex = -1;
    inp.autocomplete = 'off';
    inp.setAttribute('aria-hidden', 'true');
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('spellcheck', 'false');
    container.appendChild(inp);
  }

  function bindField(el) {
    if (!isPhoneField(el) || el.getAttribute('data-gs-phone') === '1') return;
    el.setAttribute('data-gs-phone', '1');
    ensureError(el);
    if (el.type === 'tel') {
      el.addEventListener('input', function () {
        var d = String(el.value || '').replace(/\D/g, '');
        if (d.length === 11 && d.charAt(0) === '1') {
          d = d.slice(1);
          el.value = d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
        }
      }, true);
    }
    el.addEventListener('blur', function () {
      showPhoneError(el, fieldValueIsBad(el), false);
    });
    el.addEventListener('input', function () {
      var digits = String(el.value || '').replace(/\D/g, '');
      if (!fieldValueIsBad(el)) showPhoneError(el, false, false);
      else if (digits.length >= 10) showPhoneError(el, true, false);
    });
  }

  function scopeFor(btn) {
    return btn.closest('form, .sv-offer, .form-card, .form-section') || document;
  }

  function isLeadButton(btn) {
    if (!btn || (btn.tagName !== 'BUTTON' && btn.tagName !== 'INPUT')) return false;
    if (btn.closest('.pl-box, #cxlpBridgeForm, [data-cxlp-bridge="1"]')) return false;
    var id = btn.id || '';
    if (id === 'svBtn' || id === 'probate-submit' || id === 'shBtn' || id === 'bayBtn' || id === 'worthBtn' || id === 'so-submit') return true;
    var type = (btn.getAttribute('type') || '').toLowerCase();
    if (btn.tagName === 'INPUT') return type === 'submit';
    if (type === 'submit') return true;
    if (!type && btn.closest('form')) return true;
    return /(?:^|\s)(?:submit-btn|gs-btn|form-submit|nb-btn|cta-primary)(?:\s|$)/.test(btn.className || '');
  }

  function blockEvent(e, el) {
    e.preventDefault();
    e.stopImmediatePropagation();
    showPhoneError(el, true, true);
  }

  function installStyle() {
    if (document.getElementById('gs-phone-gate-css')) return;
    var s = document.createElement('style');
    s.id = 'gs-phone-gate-css';
    s.textContent = 'input.gs-hp{position:absolute !important;left:-10000px !important;top:auto !important;width:1px !important;height:1px !important;margin:0 !important;padding:0 !important;border:0 !important;overflow:hidden !important;opacity:0 !important;pointer-events:none !important}' +
      '.gs-phone-err{font-family:var(--font-body),Inter,system-ui,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.45;margin:8px 0 0;display:none}' +
      '.gs-phone-err.visible{display:block !important;color:var(--error,#B3261E) !important}';
    document.head.appendChild(s);
  }

  function installFetchShield() {
    if (!root.fetch || root.__gsPhoneFetch) return;
    var orig = root.fetch;
    root.__gsPhoneFetch = 1;
    root.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (hpFilled(document) && /formspree\.io\/f\/|twil\.io\/lead-alert/.test(url)) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true, valid: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return orig.apply(this, arguments);
    };
  }

  function boot() {
    installStyle();
    installFetchShield();
    var forms = document.querySelectorAll('form, .sv-offer');
    var i;
    for (i = 0; i < forms.length; i++) addHoneypot(forms[i]);
    var inputs = document.querySelectorAll('input');
    for (i = 0; i < inputs.length; i++) bindField(inputs[i]);
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.querySelectorAll) return;
    if (form.id === 'cxlpBridgeForm' || (form.getAttribute && form.getAttribute('data-cxlp-bridge') === '1')) return;
    if (hpFilled(form) || hpFilled(document)) return;
    var bad = firstBad(form);
    if (bad) blockEvent(e, bad);
  }, true);

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('button, input[type="submit"]');
    if (!isLeadButton(btn)) return;
    var scope = scopeFor(btn);
    if (hpFilled(scope) || hpFilled(document)) return;
    var bad = firstBad(scope);
    if (bad) blockEvent(e, bad);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
