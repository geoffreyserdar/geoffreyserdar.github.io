/* week-data.js (2026-10-06)
   Fills the "This week at a glance" tiles from /data/weekly-towns.json, the same file the
   weekly page (/lake-minnetonka-weekly/) is baked from. One source, so a card can never
   disagree with the weekly table. Static numbers in the HTML are the no-JS fallback.
   Markup hook: <div class="week-teaser" data-week-town="Excelsior">  (or data-week-town="lake")
   Optional: an element with [data-week-sub] inside the same .form-card gets the one-line sub. */
(function (root) {
  'use strict';
  var URL = '/data/weekly-towns.json';

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function short(n) {
    if (n >= 1e6) {
      var m = n / 1e6;
      return '$' + (m >= 10 ? m.toFixed(1) : m.toFixed(2)).replace(/\.?0+$/, '') + 'M';
    }
    return '$' + Math.round(n / 1000) + 'K';
  }
  function homes(n) { return n === 1 ? '1 home' : n + ' homes'; }

  function build(doc, town) {
    var w = doc.weeks[doc.weeks.length - 1];
    var lake = w.lake_ring || {};
    var label = w.week_label;                       // "Sep 28–Oct 4, 2026"
    var wk = String(label).replace(/,\s*\d{4}$/, ''); // "Sep 28–Oct 4"
    var lakeTyp = lake.typical_price_display || (lake.median ? money(lake.median) : '');
    var hot = lake.hottest_town ? lake.hottest_town + ' · ' + lake.hottest_count : 'See the weekly note';
    var lakeTiles = [
      [String(lake.n_sold), 'Sold around the lake'],
      [lakeTyp, 'Typical price (lake)'],
      [hot, 'Most closes this week']
    ];
    var lakeLine = 'Around the lake, ' + lake.n_sold + ' sold at a typical ' + lakeTyp + '.';
    var out = { meta: 'Week of ' + label, week: label, aria: 'Closed sales for the week of ' + label };

    if (!town || town === 'lake') {
      out.tiles = [[String(lake.n_sold), 'Sold this week'], [lakeTyp, 'Typical price'], [hot, 'Most closes this week']];
      out.line = homes(lake.n_sold) + ' closed around the lake the week of ' + wk + '.' +
        (lake.hottest_town ? ' ' + lake.hottest_town + ' had the most, with ' + lake.hottest_count + '.' : '');
      out.sub = 'What closed around Lake Minnetonka the week of ' + wk + '.';
      return out;
    }

    var rec = (w.towns || {})[town] || { n: 0 };
    var n = parseInt(rec.n || 0, 10);
    if (!n) {
      out.tiles = lakeTiles;
      out.line = 'No homes closed in ' + town + ' the week of ' + wk + '. Small towns have quiet weeks. ' + lakeLine;
      out.sub = 'No ' + town + ' homes closed the week of ' + wk + ', so here is the lake.';
      return out;
    }
    var prices = (rec.sold_prices || []).slice().sort(function (a, b) { return a - b; });
    if ((!prices.length) && rec.range) prices = [rec.range[0], rec.range[1]];
    var priceTile, priceText;
    if (rec.has_median && rec.median != null) {
      priceTile = [money(rec.median), 'Typical sold'];
      priceText = ', at a typical ' + money(rec.median);
    } else if (prices.length === 1 || (prices.length && prices[0] === prices[prices.length - 1])) {
      priceTile = [money(prices[0]), 'Sold for'];
      priceText = ', for ' + money(prices[0]);
    } else if (prices.length) {
      priceTile = [short(prices[0]) + '–' + short(prices[prices.length - 1]), 'Sold range'];
      priceText = ', from ' + money(prices[0]) + ' to ' + money(prices[prices.length - 1]);
    } else {
      priceTile = [lakeTyp, 'Typical price (lake)'];
      priceText = '';
    }
    out.tiles = [[String(n), 'Sold this week'], priceTile, [String(lake.n_sold), 'Sold around the lake']];
    out.line = homes(n) + ' closed in ' + town + ' the week of ' + wk + priceText + '. ' + lakeLine;
    out.sub = 'What closed in ' + town + ' the week of ' + wk + '.';
    return out;
  }

  function paint(el, v) {
    var meta = el.querySelector('.week-teaser-meta');
    if (meta) meta.textContent = v.meta;
    var dash = el.querySelector('.teaser-dash');
    if (dash) dash.setAttribute('aria-label', v.aria);
    var tiles = el.querySelectorAll('.teaser-dash-tile');
    for (var i = 0; i < tiles.length && i < v.tiles.length; i++) {
      var nEl = tiles[i].querySelector('.teaser-dash-n');
      var lEl = tiles[i].querySelector('.teaser-dash-l');
      if (nEl) nEl.textContent = v.tiles[i][0];
      if (lEl) lEl.textContent = v.tiles[i][1];
    }
    var line = el.querySelector('.week-teaser-line');
    if (line) {
      line.textContent = '';
      var em = document.createElement('em'); em.textContent = 'Geoffrey:';
      line.appendChild(em); line.appendChild(document.createTextNode(' ' + v.line));
    }
    var card = el.closest ? el.closest('.form-card') : null;
    var sub = card ? card.querySelector('[data-week-sub]') : null;
    if (sub) sub.textContent = v.sub;
  }

  function run() {
    var els = document.querySelectorAll('[data-week-town]');
    if (!els.length || !root.fetch) return;
    root.fetch(URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (doc) {
        if (!doc || !doc.weeks || !doc.weeks.length) return;
        for (var i = 0; i < els.length; i++) {
          try { paint(els[i], build(doc, els[i].getAttribute('data-week-town'))); } catch (e) {}
        }
      })
      .catch(function () { /* keep the static numbers */ });
  }

  root.GSWeekData = { build: build, money: money };
  if (typeof module !== 'undefined' && module.exports) { module.exports = { build: build, money: money }; return; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})(typeof window !== 'undefined' ? window : globalThis);
