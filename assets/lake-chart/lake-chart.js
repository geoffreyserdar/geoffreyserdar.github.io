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
    chart = holdClip(chart);
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
      chart.querySelectorAll(".here, .here-tag, .here-line, .here-pin").forEach(function (n) { n.remove(); });
      var note = document.createElementNS(ns, "text");
      note.setAttribute("class", "here");
      note.setAttribute("font-family", "Zilla Slab, Georgia, serif");
      note.setAttribute("font-weight", "700");
      note.setAttribute("fill", "#8C3A2A");
      note.setAttribute("pointer-events", "none");
      note.setAttribute("text-anchor", "middle");
      var topLine = document.createElementNS(ns, "tspan");
      topLine.textContent = "You are";
      var botLine = document.createElementNS(ns, "tspan");
      botLine.textContent = "here";
      note.appendChild(topLine);
      note.appendChild(botLine);
      chart.appendChild(note);
      var target = unionBoxes(labels);
      var blocked = obstacles(chart, mark);
      var water = svg.querySelector("#water");
      var otherLake = svg.querySelector("#minnewashta");
      var sizes = [26, 22, 20];
      var chosen = null;
      var rise = 0;
      for (var i = 0; i < sizes.length && !chosen; i++) {
        var size = sizes[i];
        note.setAttribute("font-size", String(size));
        topLine.setAttribute("x", "400");
        topLine.setAttribute("y", "400");
        botLine.setAttribute("x", "400");
        botLine.setAttribute("dy", String(Math.round(size * 1.08)));
        var sample = note.getBBox();
        rise = 400 - sample.y;
        chosen = besideHere(target, blocked, water, otherLake, sample.width + 16, sample.height + 12);
      }
      if (!chosen) return;
      var ax = chosen.x + chosen.w / 2;
      var ay = chosen.y + rise + 6;
      topLine.setAttribute("x", String(Math.round(ax)));
      topLine.setAttribute("y", String(Math.round(ay)));
      botLine.setAttribute("x", String(Math.round(ax)));
      var bg = document.createElementNS(ns, "rect");
      bg.setAttribute("class", "here-tag");
      bg.setAttribute("x", String(Math.round(chosen.x)));
      bg.setAttribute("y", String(Math.round(chosen.y)));
      bg.setAttribute("width", String(Math.round(chosen.w)));
      bg.setAttribute("height", String(Math.round(chosen.h)));
      bg.setAttribute("rx", "4");
      bg.setAttribute("fill", "#F7F1E4");
      bg.setAttribute("stroke", "#8C3A2A");
      bg.setAttribute("stroke-width", "1.4");
      bg.setAttribute("pointer-events", "none");
      var line = document.createElementNS(ns, "line");
      line.setAttribute("class", "here-line");
      line.setAttribute("x1", String(Math.round(chosen.x1)));
      line.setAttribute("y1", String(Math.round(chosen.y1)));
      line.setAttribute("x2", String(Math.round(chosen.x2)));
      line.setAttribute("y2", String(Math.round(chosen.y2)));
      line.setAttribute("stroke", "#8C3A2A");
      line.setAttribute("stroke-width", "2.4");
      line.setAttribute("pointer-events", "none");
      line.setAttribute("points", Math.round(chosen.x1) + "," + Math.round(chosen.y1) + " " + Math.round(chosen.x2) + "," + Math.round(chosen.y2));
      var pin = document.createElementNS(ns, "polygon");
      pin.setAttribute("class", "here-pin");
      pin.setAttribute("points", hereArrow(chosen.x1, chosen.y1, chosen.x2, chosen.y2));
      pin.setAttribute("fill", "#8C3A2A");
      pin.setAttribute("pointer-events", "none");
      chart.insertBefore(pin, note);
      chart.insertBefore(line, pin);
      chart.insertBefore(bg, line);
    }
    place();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  function inLake(water, other, x, y) {
    var svg = (water || other) && (water || other).ownerSVGElement;
    if (!svg) return false;
    var p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    if (water && water.isPointInFill(p)) return true;
    if (other && other.isPointInFill(p)) return true;
    return false;
  }

  /* The tag sits on the nearest open parchment beside the place, with a short straight pointer. */
  function besideHere(target, blocked, water, other, tw, th) {
    var cx = target.x + target.w / 2;
    var cy = target.y + target.h / 2;
    var angles = 24;
    var reaches = [8, 16, 28, 42, 58, 76, 98, 124];
    var best = null;
    var bestScore = 1e12;
    function consider(box) {
      if (box.x < 20 || box.y < 74 || box.x + box.w > 780 || box.y + box.h > 644) return;
      if (hitsBox(box, blocked.tags) || hitsBox(box, [target])) return;
      var a = edgePoint(target, box.x + box.w / 2, box.y + box.h / 2);
      var b = edgePoint(box, cx, cy);
      var plen = Math.hypot(a.x - b.x, a.y - b.y);
      if (plen > 130) return;
      if (segHits(a, b, blocked.lines)) return;
      var wet = tagOnWater(box, water, other) ? 1 : 0;
      var score = wet * 8000 + plen;
      if (score < bestScore) {
        bestScore = score;
        best = { x: box.x, y: box.y, w: box.w, h: box.h, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      }
    }
    for (var r = 0; r < reaches.length; r++) {
      for (var i = 0; i < angles; i++) {
        var ang = (Math.PI * 2 * i) / angles;
        var ux = Math.cos(ang);
        var uy = Math.sin(ang);
        var reach = support(target, ux, uy) + reaches[r] + support({ x: 0, y: 0, w: tw, h: th }, ux, uy);
        consider({ x: cx + ux * reach - tw / 2, y: cy + uy * reach - th / 2, w: tw, h: th });
      }
    }
    if (best) return best;
    for (var top = 76; top <= 640 - th; top += 18) {
      for (var left = 22; left <= 776 - tw; left += 18) consider({ x: left, y: top, w: tw, h: th });
    }
    return best;
  }

  function support(box, ux, uy) {
    return Math.abs(ux) * box.w / 2 + Math.abs(uy) * box.h / 2;
  }

  function tagOnWater(box, water, other) {
    var pts = [
      [box.x + box.w / 2, box.y + box.h / 2],
      [box.x + 6, box.y + 6],
      [box.x + box.w - 6, box.y + 6],
      [box.x + 6, box.y + box.h - 6],
      [box.x + box.w - 6, box.y + box.h - 6]
    ];
    var wet = 0;
    for (var i = 0; i < pts.length; i++) if (inLake(water, other, pts[i][0], pts[i][1])) wet += 1;
    return wet >= 3;
  }

  function hereArrow(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var px = -uy;
    var py = ux;
    var base = Math.min(9, len * 0.45);
    var wing = 3.4;
    return [
      x1, y1,
      x1 + ux * base + px * wing, y1 + uy * base + py * wing,
      x1 + ux * base - px * wing, y1 + uy * base - py * wing
    ].map(function (n) { return Math.round(n); }).join(",");
  }

  function aX(box, target) {
    var x = target.x + target.w / 2;
    if (x < box.x) return box.x;
    if (x > box.x + box.w) return box.x + box.w;
    return x;
  }

  function aY(box, target) {
    var y = target.y + target.h / 2;
    if (y < box.y) return box.y;
    if (y > box.y + box.h) return box.y + box.h;
    return y;
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
    var tags = [];
    var lines = [];
    chart.querySelectorAll("text, .town-dot").forEach(function (el) {
      if (el.closest && el.closest(".is-here") === mark) return;
      if (el.classList && el.classList.contains("here")) return;
      var o = el.getBBox();
      if (!o.width && !o.height) return;
      var sw = parseFloat(el.getAttribute("stroke-width") || "0") || 0;
      var loose = sw / 2 + 5;
      var tight = sw / 2 + 1;
      tags.push({ x: o.x - loose, y: o.y - loose, w: o.width + loose * 2, h: o.height + loose * 2 });
      lines.push({ x: o.x - tight, y: o.y - tight, w: o.width + tight * 2, h: o.height + tight * 2 });
    });
    var pin = chart.querySelector(".pin circle.outer");
    if (pin) {
      var pb = pin.getBBox();
      var tr = pin.parentNode.transform.baseVal.consolidate();
      var m = tr ? tr.matrix : { e: 0, f: 0 };
      var box = { x: m.e + pb.x - 4, y: m.f + pb.y - 4, w: pb.width + 8, h: pb.height + 8 };
      tags.push(box);
      lines.push(box);
    }
    return { tags: tags, lines: lines };
  }

  /* The zoom hint sits on the bottom edge of the map window. */
  function chromeZones() {
    return [{ x: 150, y: 620, w: 500, h: 70 }];
  }

  function findHereSpot(target, mine, blocked, tw, th, rise, step) {
    var tcx = target.x + target.w / 2;
    var tcy = target.y + target.h / 2;
    var best = null;
    var bestScore = 1e12;
    for (var top = 108; top <= 640 - th; top += step) {
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

  /* The clip stays on a parent that does not zoom, so the lake cannot paint outside the frame. */
  function holdClip(chart) {
    var clip = chart.getAttribute("clip-path");
    if (!clip) return chart;
    var ns = "http://www.w3.org/2000/svg";
    var holder = document.createElementNS(ns, "g");
    holder.setAttribute("clip-path", clip);
    chart.removeAttribute("clip-path");
    chart.parentNode.insertBefore(holder, chart);
    holder.appendChild(chart);
    return chart;
  }

  function bindZoom(fig, view, svg, chart) {
    if (!chart) return;
    var scale = 1, tx = 0, ty = 0;
    var pinch = null, pan = null, gestureOn = false;
    var lastTap = 0, lastXY = null;
    var winEl = svg.querySelector("#mapwindow rect");
    var W = {
      x: parseFloat(winEl.getAttribute("x")),
      y: parseFloat(winEl.getAttribute("y")),
      w: parseFloat(winEl.getAttribute("width")),
      h: parseFloat(winEl.getAttribute("height"))
    };
    var bar = document.createElement("div");
    bar.className = "lake-zoom";
    bar.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Show the whole lake">↺</button>';
    var hint = document.createElement("p");
    hint.className = "lake-zoom-hint";
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    hint.textContent = coarse ? "Pinch or tap + to zoom in for more bays" : "Scroll or click + to zoom in for more bays";
    view.appendChild(bar);
    view.appendChild(hint);
    function userPoint(el, clientX, clientY) {
      var pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      var ctm = el.getScreenCTM();
      if (ctm) {
        var p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
      }
      var box = svg.getBoundingClientRect();
      var vb = svg.viewBox.baseVal;
      return {
        x: vb.x + (clientX - box.left) / box.width * vb.width,
        y: vb.y + (clientY - box.top) / box.height * vb.height
      };
    }
    function clampPan() {
      if (scale <= 1.001) { scale = 1; tx = 0; ty = 0; return; }
      var maxX = W.x * (1 - scale);
      var minX = (W.x + W.w) * (1 - scale);
      var maxY = W.y * (1 - scale);
      var minY = (W.y + W.h) * (1 - scale);
      if (tx > maxX) tx = maxX;
      if (tx < minX) tx = minX;
      if (ty > maxY) ty = maxY;
      if (ty < minY) ty = minY;
    }
    function apply() {
      clampPan();
      chart.setAttribute("transform", "matrix(" + scale + " 0 0 " + scale + " " + tx + " " + ty + ")");
      svg.classList.toggle("is-detail", scale >= 1.55);
      fig.classList.toggle("is-zoomed", scale > 1.05);
      if (scale > 1.05) hint.classList.add("is-gone");
    }
    /* One matrix: scale about 0,0 then translate. The chart point under the pointer stays put. */
    function zoomAt(next, clientX, clientY) {
      next = Math.min(4, Math.max(1, next));
      var u = userPoint(chart, clientX, clientY);
      var root = userPoint(svg, clientX, clientY);
      tx = root.x - u.x * next;
      ty = root.y - u.y * next;
      scale = next;
      apply();
    }
    function viewCenter() {
      var pt = svg.createSVGPoint();
      pt.x = W.x + W.w / 2;
      pt.y = W.y + W.h / 2;
      var ctm = svg.getScreenCTM();
      if (!ctm) {
        var r = svg.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      var s = pt.matrixTransform(ctm);
      return { x: s.x, y: s.y };
    }
    function zoomBy(factor, clientX, clientY) {
      if (clientX == null) {
        var c = viewCenter();
        clientX = c.x;
        clientY = c.y;
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
    view.addEventListener("dblclick", function (e) {
      e.preventDefault();
      zoomAt(Math.min(4, scale * 1.6), e.clientX, e.clientY);
    });
    view.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 0.88 : 1.14, e.clientX, e.clientY);
    }, { passive: false });
    function dist(a, b) {
      var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    /* Safari pinch. preventDefault stops the browser zooming the page toward the corner. */
    view.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      gestureOn = true;
      pinch = null;
      pan = null;
      var u = userPoint(chart, e.clientX, e.clientY);
      gestureOn = { scale: scale, ux: u.x, uy: u.y };
    }, { passive: false });
    view.addEventListener("gesturechange", function (e) {
      e.preventDefault();
      if (!gestureOn) return;
      var next = Math.min(4, Math.max(1, gestureOn.scale * (e.scale || 1)));
      var root = userPoint(svg, e.clientX, e.clientY);
      tx = root.x - gestureOn.ux * next;
      ty = root.y - gestureOn.uy * next;
      scale = next;
      apply();
    }, { passive: false });
    view.addEventListener("gestureend", function (e) {
      if (e.preventDefault) e.preventDefault();
      gestureOn = false;
    }, { passive: false });
    view.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch" && !e.isPrimary) return;
      if (pinch || gestureOn) return;
      if (scale > 1.02) {
        var root = userPoint(svg, e.clientX, e.clientY);
        pan = { id: e.pointerId, tx: tx, ty: ty, rx: root.x, ry: root.y };
      } else {
        pan = { id: e.pointerId, scroll: window.scrollY, y: e.clientY };
      }
    });
    view.addEventListener("pointermove", function (e) {
      if (!pan || pan.id !== e.pointerId || pinch || gestureOn) return;
      if (pan.scroll != null) {
        window.scrollTo(window.scrollX, pan.scroll - (e.clientY - pan.y));
        return;
      }
      e.preventDefault();
      var moved = userPoint(svg, e.clientX, e.clientY);
      tx = pan.tx + (moved.x - pan.rx);
      ty = pan.ty + (moved.y - pan.ry);
      apply();
    });
    view.addEventListener("pointerup", function (e) {
      if (pan && pan.id === e.pointerId) pan = null;
    });
    view.addEventListener("pointercancel", function () { pan = null; });
    view.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        pan = null;
        var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        var u = userPoint(chart, mx, my);
        pinch = { d: dist(e.touches[0], e.touches[1]), scale: scale, ux: u.x, uy: u.y };
      }
    }, { passive: true });
    view.addEventListener("touchmove", function (e) {
      if (gestureOn || !pinch || e.touches.length < 2) return;
      e.preventDefault();
      var d = dist(e.touches[0], e.touches[1]);
      var next = Math.min(4, Math.max(1, pinch.scale * (d / pinch.d)));
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      var root = userPoint(svg, mx, my);
      tx = root.x - pinch.ux * next;
      ty = root.y - pinch.uy * next;
      scale = next;
      apply();
    }, { passive: false });
    view.addEventListener("touchend", function (e) {
      if (e.touches.length >= 2) return;
      pinch = null;
      if (e.touches.length === 1) return;
      if (gestureOn || !e.changedTouches || e.changedTouches.length !== 1) return;
      var t = e.changedTouches[0];
      var now = Date.now();
      if (lastXY && now - lastTap < 300 && Math.hypot(t.clientX - lastXY.x, t.clientY - lastXY.y) < 28) {
        zoomAt(Math.min(4, scale * 1.6), t.clientX, t.clientY);
        lastTap = 0;
        lastXY = null;
      } else {
        lastTap = now;
        lastXY = { x: t.clientX, y: t.clientY };
      }
    });
    apply();
  }
})();
