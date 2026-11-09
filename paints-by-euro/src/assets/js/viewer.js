/* Full-screen viewer with zoom, plus the gallery filters and the photo slider.
   Keyboard: ← → previous/next, + − zoom, 0 fit, Shift+arrows move, Esc close.
   Touch: swipe for previous/next, pinch to zoom, drag to move. */
(function () {
  "use strict";
  var dialog = document.querySelector("[data-viewer]");
  var dataEl = document.getElementById("viewer-items");
  if (!dialog || !dataEl) return;

  var allItems = JSON.parse(dataEl.textContent);
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage = dialog.querySelector("[data-stage]");
  var img = dialog.querySelector("[data-img]");
  var els = {
    title: dialog.querySelector("[data-title]"),
    meta: dialog.querySelector("[data-meta]"),
    link: dialog.querySelector("[data-link]"),
    count: dialog.querySelector("[data-count]"),
  };

  var items = [], index = 0, opener = null;
  var s = 1, tx = 0, ty = 0;
  var MIN = 1, MAX = 6;

  /* ---------- Zoom maths: transform-origin is the top-left corner ---------- */
  function clamp() {
    var w = stage.clientWidth, h = stage.clientHeight;
    s = Math.min(MAX, Math.max(MIN, s));
    if (s === 1) { tx = 0; ty = 0; return; }
    tx = Math.min(0, Math.max(w - w * s, tx));
    ty = Math.min(0, Math.max(h - h * s, ty));
  }
  function apply(smooth) {
    clamp();
    img.classList.toggle("is-smooth", !!smooth && !reduceMotion);
    img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
    stage.classList.toggle("is-zoomed", s > 1);
  }
  function zoomAt(x, y, next, smooth) {
    next = Math.min(MAX, Math.max(MIN, next));
    tx = x - (x - tx) * (next / s);
    ty = y - (y - ty) * (next / s);
    s = next;
    apply(smooth);
  }
  function zoomCentre(factor) {
    zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, s * factor, true);
  }
  function reset(smooth) { s = 1; tx = 0; ty = 0; apply(smooth); }

  /* ---------- Showing items ---------- */
  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    var it = items[index];
    reset(false);
    if (!reduceMotion) img.classList.add("is-changing");
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      img.src = it.src;
      img.alt = it.alt;
      img.classList.remove("is-changing");
    };
    pre.src = it.src;
    els.title.textContent = it.title;
    els.meta.textContent = it.meta || "";
    if (it.href) { els.link.href = it.href; els.link.hidden = false; } else { els.link.hidden = true; }
    els.count.textContent = items.length > 1 ? (index + 1) + " / " + items.length : "";
    dialog.querySelectorAll("[data-nav]").forEach(function (b) { b.hidden = items.length < 2; });
    // Preload neighbours so arrows feel instant.
    [index + 1, index - 1].forEach(function (n) {
      var p = items[(n + items.length) % items.length];
      if (p) new Image().src = p.src;
    });
  }

  function open(list, i, from) {
    items = list;
    opener = from || document.activeElement;
    document.documentElement.classList.add("viewer-open");
    dialog.showModal();
    show(i);
    dialog.querySelector("[data-close]").focus();
  }
  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("viewer-open");
    img.removeAttribute("src");
    if (opener && opener.focus) opener.focus();
  });

  /* ---------- Buttons ---------- */
  dialog.querySelector("[data-close]").addEventListener("click", function () { dialog.close(); });
  dialog.querySelectorAll("[data-nav]").forEach(function (b) {
    b.addEventListener("click", function () { show(index + Number(b.dataset.nav)); });
  });
  dialog.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () {
      var z = b.dataset.zoom;
      if (z === "in") zoomCentre(1.6);
      else if (z === "out") zoomCentre(1 / 1.6);
      else reset(true);
    });
  });

  /* ---------- Keyboard ---------- */
  dialog.addEventListener("keydown", function (e) {
    var step = 80;
    if (e.shiftKey && s > 1 && /^Arrow/.test(e.key)) {
      if (e.key === "ArrowLeft") tx += step;
      if (e.key === "ArrowRight") tx -= step;
      if (e.key === "ArrowUp") ty += step;
      if (e.key === "ArrowDown") ty -= step;
      apply(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowRight") { show(index + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { show(index - 1); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { zoomCentre(1.6); e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { zoomCentre(1 / 1.6); e.preventDefault(); }
    else if (e.key === "0") { reset(true); e.preventDefault(); }
  });

  /* ---------- Wheel / trackpad zoom ---------- */
  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, s * Math.exp(-e.deltaY * 0.0022), false);
  }, { passive: false });

  stage.addEventListener("dblclick", function (e) {
    var r = stage.getBoundingClientRect();
    if (s > 1) reset(true); else zoomAt(e.clientX - r.left, e.clientY - r.top, 2.5, true);
  });

  /* ---------- Pointer: drag, pinch, swipe ---------- */
  var pointers = new Map();
  var start = null;   // swipe / drag start
  var pinch = null;   // { dist, s, mx, my }

  function midpoint() {
    var p = Array.from(pointers.values()), r = stage.getBoundingClientRect();
    return { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top,
      d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
  }
  stage.addEventListener("pointerdown", function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, t: Date.now() };
    if (pointers.size === 2) { var m = midpoint(); pinch = { d: m.d, s: s }; start = null; }
  });
  stage.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      var m = midpoint();
      zoomAt(m.x, m.y, pinch.s * (m.d / pinch.d), false);
    } else if (start && s > 1) {
      stage.classList.add("is-dragging");
      tx = start.tx + (e.clientX - start.x);
      ty = start.ty + (e.clientY - start.y);
      apply(false);
    }
  });
  function end(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    stage.classList.remove("is-dragging");
    if (pointers.size < 2) pinch = null;
    if (start && s === 1 && pointers.size === 0) {
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - start.t < 800) {
        show(index + (dx < 0 ? 1 : -1));
      }
    }
    start = null;
  }
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  window.addEventListener("resize", function () { if (dialog.open) apply(false); });

  /* ---------- Gallery page: filters + open on click ---------- */
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var filters = document.querySelector("[data-filters]");
    var cards = Array.from(gallery.querySelectorAll(".gallery-item"));
    var countEl = document.querySelector("[data-filter-count]");
    var emptyEl = document.querySelector("[data-empty]");

    var visible = function () { return cards.filter(function (c) { return !c.hidden; }); };
    function applyFilters() {
      var medium = filters.medium.value, avail = filters.avail.value;
      cards.forEach(function (c) {
        var ok = (medium === "all" || c.dataset.medium === medium) &&
                 (avail === "all" || c.dataset.status === "available");
        c.hidden = !ok;
      });
      var n = visible().length;
      countEl.textContent = n + (n === 1 ? " work" : " works");
      emptyEl.hidden = n > 0;
    }
    filters.addEventListener("change", applyFilters);
    document.addEventListener("statuschange", applyFilters);
    applyFilters();

    gallery.addEventListener("click", function (e) {
      var link = e.target.closest("[data-open-work]");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      var shown = visible();
      var list = shown.map(function (c) { return allItems[Number(c.dataset.index)]; });
      open(list, shown.indexOf(link.closest(".gallery-item")), link);
    });
  }

  /* ---------- Work page: main image + photo slider ---------- */
  document.querySelectorAll("[data-open-photo]").forEach(function (b) {
    b.addEventListener("click", function () { open(allItems, Number(b.dataset.openPhoto), b); });
  });
  var track = document.querySelector(".slider-track");
  if (track) {
    document.querySelectorAll("[data-slide]").forEach(function (b) {
      b.addEventListener("click", function () {
        var item = track.querySelector("li");
        var stepW = item ? item.getBoundingClientRect().width + 16 : 200;
        track.scrollBy({ left: Number(b.dataset.slide) * stepW, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }
})();
