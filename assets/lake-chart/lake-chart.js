/* Lake chart: load the SVG only when the frame is near the screen. */
(function () {
  if (window.__lakeChart) return;
  window.__lakeChart = true;
  var frames = document.querySelectorAll(".lake-chart");
  if (!frames.length) return;
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (!document.querySelector("link[data-lake-fonts]")) {
      var font = document.createElement("link");
      font.rel = "stylesheet";
      font.href = "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700&family=Zilla+Slab:ital,wght@0,600;0,700;1,600&display=swap";
      font.setAttribute("data-lake-fonts", "");
      document.head.appendChild(font);
    }
    var lakeName = frames[0].getAttribute("data-lake") || "minnetonka";
    fetch("/assets/lake-chart/lake-" + lakeName + "-chart.svg")
      .then(function (r) { return r.text(); })
      .then(function (txt) { frames.forEach(function (fig) { mount(fig, txt); }); })
      .catch(function () {});
  }
  if (!("IntersectionObserver" in window)) { start(); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } });
  }, { rootMargin: "160px" });
  frames.forEach(function (fig) { io.observe(fig); });

  function mount(fig, txt) {
    var view = document.createElement("div");
    view.className = "lake-chart-view";
    view.innerHTML = txt;
    fig.classList.add("is-live");
    fig.appendChild(view);
    var svg = view.querySelector("svg");
    var chart = svg.querySelector("#chart");
    var addr = fig.getAttribute("data-pin-addr");
    if (addr && chart) addPin(fig, view, chart, svg);
    var here = fig.getAttribute("data-here");
    if (here) markHere(svg, here);
    padHits(svg);
    svg.querySelectorAll("a.nav").forEach(function (a) {
      a.addEventListener("pointerdown", function () {
        svg.querySelectorAll("a.nav.is-hot").forEach(function (n) { n.classList.remove("is-hot"); });
        a.classList.add("is-hot");
      });
    });
    bindZoom(fig, view, svg, chart);
  }

  function markHere(svg, here) {
    var mark = svg.querySelector('[data-bay="' + here + '"],[data-town="' + here + '"]');
    if (!mark) return;
    mark.classList.add("is-here");
    var labels = mark.querySelectorAll("text.bay, text.town");
    if (!labels.length) return;
    var ns = "http://www.w3.org/2000/svg";
    var chart = svg.querySelector("#chart");
    function place() {
      chart.querySelectorAll(".here, .here-tag, .here-line").forEach(function (n) { n.remove(); });
      var note = document.createElementNS(ns, "text");
      note.setAttribute("class", "here");
      note.setAttribute("font-size", "42");
      note.setAttribute("font-family", "Zilla Slab, Georgia, serif");
      note.setAttribute("font-weight", "700");
      note.setAttribute("fill", "#8C3A2A");
      note.setAttribute("pointer-events", "none");
      note.textContent = "You are here";
      chart.appendChild(note);
      note.setAttribute("text-anchor", "middle");
      note.setAttribute("x", "400");
      note.setAttribute("y", "400");
      var sample = note.getBBox();
      var tw = sample.width + 16;
      var th = sample.height + 12;
      var rise = 400 - sample.y;
      var target = unionBoxes(labels);
      var dot = mark.querySelector(".town-dot");
      var mine = [{ x: target.x - 4, y: target.y - 4, w: target.w + 8, h: target.h + 8 }];
      if (dot) {
        var db = dot.getBBox();
        mine.push({ x: db.x - 3, y: db.y - 3, w: db.width + 6, h: db.height + 6 });
      }
      var blocked = obstacles(chart, mark);
      var chosen = findHereSpot(target, mine, blocked, tw, th, rise, 12) || findHereSpot(target, mine, blocked, tw, th, rise, 8);
      if (!chosen) chosen = { x: 160, y: 170, box: { x: 160 - tw / 2, y: 170 - rise, w: tw, h: th }, points: [] };
      note.setAttribute("x", String(Math.round(chosen.x)));
      note.setAttribute("y", String(Math.round(chosen.y)));
      var bg = document.createElementNS(ns, "rect");
      bg.setAttribute("class", "here-tag");
      bg.setAttribute("x", String(Math.round(chosen.box.x)));
      bg.setAttribute("y", String(Math.round(chosen.box.y)));
      bg.setAttribute("width", String(Math.round(chosen.box.w)));
      bg.setAttribute("height", String(Math.round(chosen.box.h)));
      bg.setAttribute("rx", "4");
      bg.setAttribute("fill", "#F7F1E4");
      bg.setAttribute("stroke", "#8C3A2A");
      bg.setAttribute("stroke-width", "1.4");
      bg.setAttribute("pointer-events", "none");
      var line = document.createElementNS(ns, "polyline");
      line.setAttribute("class", "here-line");
      line.setAttribute("points", chosen.points.map(function (p) { return (Math.round(p.x * 10) / 10) + "," + (Math.round(p.y * 10) / 10); }).join(" "));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#8C3A2A");
      line.setAttribute("stroke-width", "2.2");
      line.setAttribute("pointer-events", "none");
      chart.insertBefore(line, note);
      chart.insertBefore(bg, note);
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  function unionBoxes(nodes) {
    var b = null;
    for (var i = 0; i < nodes.length; i++) {
      var o = nodes[i].getBBox();
      if (!o.width && !o.height) continue;
      if (!b) b = { x: o.x, y: o.y, w: o.width, h: o.height };
      else {
        var x0 = Math.min(b.x, o.x), y0 = Math.min(b.y, o.y);
        var x1 = Math.max(b.x + b.w, o.x + o.width), y1 = Math.max(b.y + b.h, o.y + o.height);
        b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
    }
    return b;
  }

  function obstacles(chart, mark) {
    var list = [];
    chart.querySelectorAll("text, .town-dot").forEach(function (el) {
      if (el.closest && el.closest(".is-here") === mark) return;
      if (el.getAttribute("class") === "here") return;
      var o = el.getBBox();
      if (!o.width && !o.height) return;
      var sw = parseFloat(el.getAttribute("stroke-width") || "0") || 0;
      var pad = sw / 2 + 4;
      list.push({ x: o.x - pad, y: o.y - pad, w: o.width + pad * 2, h: o.height + pad * 2 });
    });
    var pin = chart.querySelector(".pin circle.outer");
    if (pin) {
      var pb = pin.getBBox();
      var tr = pin.parentNode.transform.baseVal.consolidate();
      var m = tr ? tr.matrix : { e: 0, f: 0 };
      list.push({ x: m.e + pb.x - 6, y: m.f + pb.y - 6, w: pb.width + 12, h: pb.height + 12 });
    }
    return list;
  }

  /* Hint and zoom buttons sit on the lower parchment. Kept clear on a narrow phone. */
  function chromeZones() {
    return [
      { x: 140, y: 760, w: 520, h: 200 },
      { x: 300, y: 930, w: 500, h: 170 }
    ];
  }

  function findHereSpot(target, mine, blocked, tw, th, rise, step) {
    var tcx = target.x + target.w / 2;
    var tcy = target.y + target.h / 2;
    var best = null;
    var bestScore = 1e12;
    for (var top = 108; top <= 800 - th; top += step) {
      for (var left = 26; left <= 774 - tw; left += step) {
        var box = { x: left, y: top, w: tw, h: th };
        if (hitsBox(box, mine) || hitsBox(box, blocked) || hitsBox(box, chromeZones())) continue;
        var route = hereRoute(target, box, blocked);
        if (!route) continue;
        var ax = left + tw / 2;
        var ay = top + rise + 6;
        var score = route.len + Math.hypot(ax - tcx, ay - tcy) * 0.15;
        if (score < bestScore) bestScore = score;
        else continue;
        best = { x: ax, y: ay, box: box, points: route.points };
      }
    }
    return best;
  }

  function hereRoute(target, box, blocked) {
    var tcx = target.x + target.w / 2;
    var tcy = target.y + target.h / 2;
    var tagX = tcx < box.x ? box.x : (tcx > box.x + box.w ? box.x + box.w : tcx);
    var tagY = tcy < box.y ? box.y : (tcy > box.y + box.h ? box.y + box.h : tcy);
    var routes = [
      [{ x: tagX, y: tcy }, { x: tagX, y: tagY }],
      [{ x: tcx, y: tagY }, { x: tagX, y: tagY }]
    ];
    var best = null;
    for (var i = 0; i < routes.length; i++) {
      var elbow = routes[i][0];
      var end = routes[i][1];
      var start = edgePoint(target, elbow.x, elbow.y);
      if (segHits(start, elbow, blocked) || segHits(elbow, end, blocked)) continue;
      var len = Math.abs(elbow.x - start.x) + Math.abs(elbow.y - start.y) + Math.abs(end.x - elbow.x) + Math.abs(end.y - elbow.y);
      if (!best || len < best.len) best = { len: len, points: [start, elbow, end] };
    }
    return best;
  }

  function edgePoint(box, tx, ty) {
    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    var dx = tx - cx;
    var dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var sx = dx ? (box.w / 2) / Math.abs(dx) : 1e9;
    var sy = dy ? (box.h / 2) / Math.abs(dy) : 1e9;
    var s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  }

  function hitsBox(box, list) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y) return true;
    }
    return false;
  }

  function segHits(a, b, list) {
    if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) return false;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (inside(a, o) || inside(b, o)) return true;
      var edges = [
        [o.x, o.y, o.x + o.w, o.y],
        [o.x + o.w, o.y, o.x + o.w, o.y + o.h],
        [o.x, o.y + o.h, o.x + o.w, o.y + o.h],
        [o.x, o.y, o.x, o.y + o.h]
      ];
      for (var e = 0; e < 4; e++) {
        if (segsCross(a.x, a.y, b.x, b.y, edges[e][0], edges[e][1], edges[e][2], edges[e][3])) return true;
      }
    }
    return false;
  }

  function inside(p, o) {
    return p.x > o.x + 0.4 && p.x < o.x + o.w - 0.4 && p.y > o.y + 0.4 && p.y < o.y + o.h - 0.4;
  }

  function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
    function cross(x1, y1, x2, y2, x3, y3) { return (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1); }
    var d1 = cross(cx, cy, dx, dy, ax, ay);
    var d2 = cross(cx, cy, dx, dy, bx, by);
    var d3 = cross(ax, ay, bx, by, cx, cy);
    var d4 = cross(ax, ay, bx, by, dx, dy);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function pinBox(pin) {
    var pb = pin.getBBox();
    var tr = pin.transform.baseVal.consolidate();
    if (!tr) return pb;
    var m = tr.matrix;
    return { x: m.e + pb.x, y: m.f + pb.y, width: pb.width, height: pb.height };
  }

  function overlaps(x, y, w, h, x2, y2, w2, h2) {
    return x < x2 + w2 && x + w > x2 && y < y2 + h2 && y + h > y2;
  }

  function padHits(svg) {
    var box = svg.getBoundingClientRect();
    if (!box.width) return;
    var unit = svg.viewBox.baseVal.width / box.width;
    var need = 44 * unit;
    var ns = "http://www.w3.org/2000/svg";
    svg.querySelectorAll("a.nav").forEach(function (a) {
      var texts = a.querySelectorAll("text");
      if (!texts.length) return;
      var b = texts[0].getBBox();
      for (var i = 1; i < texts.length; i++) {
        var t = texts[i].getBBox();
        var x0 = Math.min(b.x, t.x), y0 = Math.min(b.y, t.y);
        var x1 = Math.max(b.x + b.width, t.x + t.width);
        var y1 = Math.max(b.y + b.height, t.y + t.height);
        b = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      }
      var w = Math.max(b.width + 12, need);
      var h = Math.max(b.height + 12, need);
      var r = document.createElementNS(ns, "rect");
      r.setAttribute("class", "hit");
      r.setAttribute("x", b.x - (w - b.width) / 2);
      r.setAttribute("y", b.y - (h - b.height) / 2);
      r.setAttribute("width", w);
      r.setAttribute("height", h);
      r.setAttribute("fill", "transparent");
      a.insertBefore(r, a.firstChild);
    });
    var pin = svg.querySelector(".pin");
    if (pin && !pin.querySelector(".pin-hit")) {
      var hit = document.createElementNS(ns, "circle");
      hit.setAttribute("class", "pin-hit");
      hit.setAttribute("r", String(need / 2));
      hit.setAttribute("fill", "transparent");
      pin.insertBefore(hit, pin.firstChild);
    }
  }

  function addPin(fig, view, chart, svg) {
    var ns = "http://www.w3.org/2000/svg";
    var x = parseFloat(fig.getAttribute("data-pin-x") || "0");
    var y = parseFloat(fig.getAttribute("data-pin-y") || "0");
    var g = document.createElementNS(ns, "g");
    g.setAttribute("class", "pin");
    g.setAttribute("transform", "translate(" + x + " " + y + ")");
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    var label = fig.getAttribute("data-pin-addr") + ", " + (fig.getAttribute("data-pin-town") || "");
    g.setAttribute("aria-label", label);
    var outer = document.createElementNS(ns, "circle");
    outer.setAttribute("class", "outer");
    outer.setAttribute("r", "5.5");
    var inner = document.createElementNS(ns, "circle");
    inner.setAttribute("class", "inner");
    inner.setAttribute("r", "2.2");
    g.appendChild(outer);
    g.appendChild(inner);
    chart.appendChild(g);
    var card = document.createElement("div");
    card.className = "lake-pin-card";
    card.hidden = true;
    function esc(s) { return String(s || "").replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    card.innerHTML = "<button type=\"button\" class=\"x\" aria-label=\"Close\">×</button><p>" + esc(fig.getAttribute("data-pin-addr")) + "</p><p>" + esc(fig.getAttribute("data-pin-town")) + "</p><p>Sold " + esc(fig.getAttribute("data-pin-sold")) + "</p><p class=\"price\">" + esc(fig.getAttribute("data-pin-price")) + "</p>";
    view.appendChild(card);
    function place() {
      var pr = g.getBoundingClientRect();
      var vr = view.getBoundingClientRect();
      var left = pr.left - vr.left - card.offsetWidth - 10;
      var top = pr.top - vr.top - 4;
      if (left < 8) left = pr.right - vr.left + 10;
      if (top < 8) top = 8;
      if (top + card.offsetHeight > vr.height - 8) top = Math.max(8, vr.height - card.offsetHeight - 8);
      card.style.left = left + "px";
      card.style.top = top + "px";
    }
    function open(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      card.hidden = false;
      place();
    }
    function shut(e) {
      if (e) e.stopPropagation();
      card.hidden = true;
    }
    g.addEventListener("click", open);
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") open(e); });
    card.querySelector(".x").addEventListener("click", shut);
    view.addEventListener("click", function (e) {
      if (card.hidden) return;
      if (e.target.closest && (e.target.closest(".pin") || e.target.closest(".lake-pin-card"))) return;
      card.hidden = true;
    });
  }

  function bindZoom(fig, view, svg, chart) {
    if (!chart) return;
    var scale = 1, tx = 0, ty = 0, last = null;
    var bar = document.createElement("div");
    bar.className = "lake-zoom";
    bar.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Show the whole lake">↺</button>';
    var hint = document.createElement("p");
    hint.className = "lake-zoom-hint";
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    hint.textContent = coarse ? "Pinch or tap + to zoom in for more bays" : "Scroll or click + to zoom in for more bays";
    view.appendChild(bar);
    view.appendChild(hint);
    function clientToSvg(clientX, clientY) {
      var vb = svg.viewBox.baseVal;
      var box = svg.getBoundingClientRect();
      return {
        x: vb.x + (clientX - box.left) / box.width * vb.width,
        y: vb.y + (clientY - box.top) / box.height * vb.height
      };
    }
    function clampPan() {
      var vb = svg.viewBox.baseVal;
      var minX = vb.width * (1 - scale);
      var minY = vb.height * (1 - scale);
      if (tx > 0) tx = 0;
      if (tx < minX) tx = minX;
      if (ty > 0) ty = 0;
      if (ty < minY) ty = minY;
    }
    function apply() {
      if (scale <= 1.001) { scale = 1; tx = 0; ty = 0; }
      else clampPan();
      chart.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + scale + ")");
      svg.classList.toggle("is-detail", scale >= 1.55);
      fig.classList.toggle("is-zoomed", scale > 1.05);
      if (scale > 1.05) hint.classList.add("is-gone");
    }
    /* Keep the chart point under (clientX, clientY) fixed while the scale changes. */
    function zoomAt(next, clientX, clientY) {
      next = Math.min(4, Math.max(1, next));
      var p = clientToSvg(clientX, clientY);
      var ux = (p.x - tx) / scale;
      var uy = (p.y - ty) / scale;
      tx = p.x - ux * next;
      ty = p.y - uy * next;
      scale = next;
      apply();
    }
    function zoomBy(factor, clientX, clientY) {
      if (clientX == null) {
        var r = svg.getBoundingClientRect();
        clientX = r.left + r.width / 2;
        clientY = r.top + r.height / 2;
      }
      zoomAt(scale * factor, clientX, clientY);
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      e.stopPropagation();
      var z = b.getAttribute("data-z");
      if (z === "in") zoomBy(1.45);
      else if (z === "out") zoomBy(1 / 1.45);
      else { scale = 1; tx = 0; ty = 0; apply(); }
    });
    view.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 0.88 : 1.14, e.clientX, e.clientY);
    }, { passive: false });
    function dist(a, b) {
      var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    /* One finger always scrolls the page. Two fingers zoom about their midpoint and drag the chart. */
    view.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 2) return;
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      var svgAt = clientToSvg(mx, my);
      last = {
        d: dist(e.touches[0], e.touches[1]),
        scale: scale,
        ux: (svgAt.x - tx) / scale,
        uy: (svgAt.y - ty) / scale
      };
    }, { passive: true });
    view.addEventListener("touchmove", function (e) {
      if (e.touches.length < 2 || !last) return;
      e.preventDefault();
      var d = dist(e.touches[0], e.touches[1]);
      var next = Math.min(4, Math.max(1, last.scale * (d / last.d)));
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      var svgAt = clientToSvg(mx, my);
      tx = svgAt.x - last.ux * next;
      ty = svgAt.y - last.uy * next;
      scale = next;
      apply();
    }, { passive: false });
    view.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) last = null;
    });
  }
})();
