/* week-section.js (2026-10-06)
   Keeps the lower "[Town] this week" closed-sales block on the town pages in step with
   /data/weekly-towns.json, the same file the card above it and /lake-minnetonka-weekly/ read.
   The HTML is baked from that week's closed rows (with addresses). If the JSON has moved on to a
   newer week, this swaps the baked block for the new week's count, typical price and sold prices.
   Markup hook: <div id="this-week" data-week-section="Wayzata" data-week-start="2026-09-28">
   with [data-ws-eyebrow], [data-ws-line] and [data-ws-closed] inside. */
(function (root) {
  'use strict';
  var URL = '/data/weekly-towns.json';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function md(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { y: m[1], t: MON[+m[2] - 1] + ' ' + (+m[3]) } : null; }

  function build(doc, town) {
    var w = doc.weeks[doc.weeks.length - 1];
    var a = md(w.week_start), b = md(w.week_end);
    if (!a || !b) return null;
    var between = 'between ' + a.t + ' and ' + b.t + ', ' + b.y;
    var lake = w.lake_ring || {};
    var lakeTyp = lake.typical_price_display || (lake.median ? money(lake.median) : '');
    var rec = (w.towns || {})[town] || { n: 0 };
    var n = parseInt(rec.n || 0, 10);
    var prices = (rec.sold_prices || []).slice().sort(function (x, y) { return y - x; });
    var line;
    if (!n) {
      line = 'Nothing closed in ' + town + ' ' + between + '. Small towns have quiet weeks. Around the lake, ' +
        lake.n_sold + ' homes sold at a typical price of ' + lakeTyp + '.';
    } else if (n === 1 && prices.length === 1) {
      line = 'One home closed in ' + town + ' ' + between + ', for ' + money(prices[0]) + '.';
    } else if (n === 2 && prices.length === 2) {
      line = '2 homes closed in ' + town + ' ' + between + ', for ' + money(prices[1]) + ' and ' + money(prices[0]) + '.';
    } else {
      line = n + ' homes closed in ' + town + ' ' + between +
        (rec.has_median && rec.median != null ? ', at a typical price of ' + money(rec.median) : '') + '.';
    }
    return { start: w.week_start, eyebrow: 'Closed ' + a.t + ' to ' + b.t + ', ' + b.y, line: line, n: n, prices: prices };
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function paint(sec, v) {
    var eb = sec.querySelector('[data-ws-eyebrow]'); if (eb) eb.textContent = v.eyebrow;
    var ln = sec.querySelector('[data-ws-line]'); if (ln) ln.textContent = v.line;
    var box = sec.querySelector('[data-ws-closed]');
    if (box) {
      while (box.firstChild) box.removeChild(box.firstChild);
      if (v.n) {
        var counts = el('div', 'week-counts'), c = el('div', 'week-count');
        c.appendChild(el('span', 'week-num', String(v.n))); c.appendChild(el('span', 'week-label', 'Sold'));
        counts.appendChild(c); box.appendChild(counts);
        if (v.prices.length) {
          box.appendChild(el('p', 'week-kicker', 'Sold'));
          var ul = el('ul', 'week-list');
          for (var i = 0; i < v.prices.length; i++) { var li = el('li'); li.appendChild(el('span', 'week-addr', 'Sold for ' + money(v.prices[i]))); ul.appendChild(li); }
          box.appendChild(ul);
        }
      }
    }
    sec.setAttribute('data-week-start', v.start);
  }

  function run() {
    var secs = document.querySelectorAll('[data-week-section]');
    if (!secs.length || !root.fetch) return;
    root.fetch(URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (doc) {
        if (!doc || !doc.weeks || !doc.weeks.length) return;
        for (var i = 0; i < secs.length; i++) {
          try {
            var v = build(doc, secs[i].getAttribute('data-week-section'));
            if (v && v.start !== secs[i].getAttribute('data-week-start')) paint(secs[i], v); // same week: keep the baked rows (they carry addresses)
          } catch (e) {}
        }
      })
      .catch(function () { /* keep the baked block */ });
  }

  root.GSWeekSection = { build: build };
  if (typeof module !== 'undefined' && module.exports) { module.exports = { build: build }; return; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})(typeof window !== 'undefined' ? window : globalThis);
