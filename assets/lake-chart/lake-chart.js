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
      font.href = "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700&family=Zilla+Slab:wght@600&display=swap";
      font.setAttribute("data-lake-fonts", "");
      document.head.appendChild(font);
    }
    fetch("/assets/lake-chart/lake-minnetonka-chart.svg")
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
    bindZoom(view, chart);
  }

  function markHere(svg, here) {
    var mark = svg.querySelector('[data-bay="' + here + '"],[data-town="' + here + '"]');
    if (!mark) return;
    mark.classList.add("is-here");
    var labels = mark.querySelectorAll("text.bay, text.town");
    if (!labels.length) return;
    var label = labels[labels.length - 1];
    var top = labels[0].getBBox();
    var b = label.getBBox();
    var anchor = label.getAttribute("text-anchor") || "start";
    var x = anchor === "middle" ? b.x + b.width / 2 : anchor === "end" ? b.x + b.width : b.x;
    var ns = "http://www.w3.org/2000/svg";
    var chart = svg.querySelector("#chart");
    var tagW = 78;
    var tagX = anchor === "middle" ? x - tagW / 2 : anchor === "end" ? x - tagW : x;
    var below = b.y + b.height + 26;
    var aboveY = top.y - 16;
    function blocked(y) {
      if (y < 24 || y > 710) return true;
      var pin = chart.querySelector(".pin");
      if (pin) {
        var pb = pinBox(pin);
        if (overlaps(tagX, y - 12, tagW, 14, pb.x, pb.y, pb.width, pb.height)) return true;
      }
      var nodes = chart.querySelectorAll("text.bay, text.town, text.plain");
      for (var i = 0; i < nodes.length; i++) {
        if (mark.contains(nodes[i])) continue;
        var o = nodes[i].getBBox();
        if (overlaps(tagX - 6, y - 18, tagW + 12, 22, o.x, o.y, o.width, o.height)) return true;
      }
      return false;
    }
    var useBelow = !blocked(below);
    if (!useBelow && blocked(aboveY)) useBelow = !blocked(below);
    var y1 = useBelow ? b.y + b.height + 1 : top.y - 1;
    var y2 = useBelow ? below - 12 : aboveY + 2;
    var ty = useBelow ? below : aboveY;
    var line = document.createElementNS(ns, "line");
    line.setAttribute("class", "here-line");
    line.setAttribute("x1", String(x));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke", "#8C3A2A");
    line.setAttribute("stroke-width", "1.2");
    var note = document.createElementNS(ns, "text");
    note.setAttribute("class", "here");
    note.setAttribute("x", String(x));
    note.setAttribute("y", String(ty));
    note.setAttribute("text-anchor", anchor);
    note.setAttribute("font-size", "11");
    note.setAttribute("font-family", "Zilla Slab, Georgia, serif");
    note.setAttribute("font-style", "italic");
    note.setAttribute("font-weight", "600");
    note.setAttribute("fill", "#8C3A2A");
    note.setAttribute("stroke", "#F3E6C8");
    note.setAttribute("stroke-width", "3");
    note.setAttribute("paint-order", "stroke fill");
    note.textContent = "You are here";
    chart.appendChild(line);
    chart.appendChild(note);
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

  function bindZoom(view, chart) {
    if (!chart) return;
    var scale = 1, tx = 0, ty = 0, last = null;
    var whole = document.createElement("button");
    whole.type = "button";
    whole.className = "lake-whole";
    whole.textContent = "Whole lake";
    view.appendChild(whole);
    function apply() {
      chart.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + scale + ")");
      view.parentNode.classList.toggle("is-zoomed", scale > 1.02);
    }
    whole.addEventListener("click", function (e) {
      e.stopPropagation();
      scale = 1; tx = 0; ty = 0; apply();
    });
    function dist(a, b) {
      var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    view.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 2) return;
      last = {
        d: dist(e.touches[0], e.touches[1]),
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        scale: scale, tx: tx, ty: ty
      };
    }, { passive: true });
    view.addEventListener("touchmove", function (e) {
      if (e.touches.length < 2 || !last) return;
      e.preventDefault();
      var d = dist(e.touches[0], e.touches[1]);
      scale = Math.min(4, Math.max(1, last.scale * (d / last.d)));
      tx = last.tx + ((e.touches[0].clientX + e.touches[1].clientX) / 2 - last.x);
      ty = last.ty + ((e.touches[0].clientY + e.touches[1].clientY) / 2 - last.y);
      if (scale === 1) { tx = 0; ty = 0; }
      apply();
    }, { passive: false });
    view.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) last = null;
    });
  }
})();
