/* Lake chart: inline the shared SVG, pinch to zoom, tap a sale pin. */
(function () {
  var frames = document.querySelectorAll(".lake-chart");
  if (!frames.length) return;
  if (!document.querySelector("link[data-lake-fonts]")) {
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700&family=Zilla+Slab:wght@600&display=swap";
    font.setAttribute("data-lake-fonts", "");
    document.head.appendChild(font);
  }
  fetch("/assets/lake-minnetonka-chart.svg")
    .then(function (r) { return r.text(); })
    .then(function (txt) { frames.forEach(function (fig) { mount(fig, txt); }); })
    .catch(function () {});

  function mount(fig, txt) {
    var view = document.createElement("div");
    view.className = "lake-chart-view";
    view.innerHTML = txt;
    fig.classList.add("is-live");
    fig.appendChild(view);
    var svg = view.querySelector("svg");
    var chart = svg.querySelector("#chart");
    var here = fig.getAttribute("data-here");
    if (here) {
      var mark = svg.querySelector('[data-bay="' + here + '"]');
      if (mark) mark.classList.add("is-here");
    }
    var addr = fig.getAttribute("data-pin-addr");
    if (addr && chart) addPin(fig, view, chart, svg);
    bindZoom(view, chart);
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
    outer.setAttribute("r", "8");
    var inner = document.createElementNS(ns, "circle");
    inner.setAttribute("class", "inner");
    inner.setAttribute("r", "3.2");
    g.appendChild(outer);
    g.appendChild(inner);
    chart.appendChild(g);
    var card = document.createElement("div");
    card.className = "lake-pin-card";
    card.hidden = true;
    card.innerHTML = "<p>" + fig.getAttribute("data-pin-addr") + "</p><p>" + (fig.getAttribute("data-pin-town") || "") + "</p><p>Sold " + (fig.getAttribute("data-pin-sold") || "") + "</p><p class=\"price\">" + (fig.getAttribute("data-pin-price") || "") + "</p><button type=\"button\">Close</button>";
    view.appendChild(card);
    function toggle(e) {
      if (e) e.stopPropagation();
      card.hidden = !card.hidden;
    }
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    card.querySelector("button").addEventListener("click", function () { card.hidden = true; });
  }

  function bindZoom(view, chart) {
    if (!chart) return;
    var scale = 1, tx = 0, ty = 0, last = null;
    function apply() {
      chart.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + scale + ")");
    }
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
