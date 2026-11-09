/* Full-screen viewer, gallery filters and the photo slider.
   Open: the painting grows from its place on the page to full screen while
   the background fades to paper; close reverses it.
   Next / previous: 700 ms crossfade, the new painting grows 98% → 100%,
   the caption fades in 150 ms later. The next image is decoded first, so
   there is never an empty frame. Swipe: the painting follows the finger.
   Keyboard: ← → previous/next, + − zoom, 0 fit, Shift+arrows move, Esc close.
   Only opacity and transform are animated, with one easing curve. */
(function () {
  "use strict";
  var M = window.Motion || { reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
  var reduce = M.reduce;
  var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  var FADE = reduce ? 200 : 700;

  var dialog = document.querySelector("[data-viewer]");
  var dataEl = document.getElementById("viewer-items");
  if (!dialog || !dataEl) return;

  var allItems = JSON.parse(dataEl.textContent);
  var stage = dialog.querySelector("[data-stage]");
  var layers = Array.prototype.slice.call(dialog.querySelectorAll("[data-layer]"));
  var bg = dialog.querySelector("[data-bg]");
  var chrome = [dialog.querySelector("[data-bar]"), dialog.querySelector("[data-help]")];
  var caption = dialog.querySelector("[data-caption]");
  var els = {
    title: dialog.querySelector("[data-title]"), meta: dialog.querySelector("[data-meta]"),
    link: dialog.querySelector("[data-link]"), count: dialog.querySelector("[data-count]"),
  };

  var items = [], sources = [], index = 0, opener = null, cur = 0;
  var s = 1, tx = 0, ty = 0, MIN = 1, MAX = 6;
  var navToken = 0, closing = false;
  layers[1].style.opacity = "0";

  /* ---------- Image loading: decode before showing, so no blank frames ---------- */
  var cache = {};
  function load(src) {
    if (!cache[src]) {
      var im = new Image();
      im.decoding = "async";
      im.src = src;
      cache[src] = (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(function () { return im; });
    }
    return cache[src];
  }
  function preloadNeighbours() {
    [index + 1, index - 1].forEach(function (n) {
      var it = items[(n + items.length) % items.length];
      if (it) load(it.src);
    });
  }

  /* ---------- Geometry ---------- */
  function contain(boxW, boxH, w, h) {
    var k = Math.min(boxW / w, boxH / h);
    return { w: w * k, h: h * k, x: (boxW - w * k) / 2, y: (boxH - h * k) / 2 };
  }
  /** Where the visible picture sits on screen for an <img> (allows for object-fit: contain). */
  function shownRect(img) {
    var r = img.getBoundingClientRect();
    if (getComputedStyle(img).objectFit !== "contain" || !img.naturalWidth) return r;
    var c = contain(r.width, r.height, img.naturalWidth, img.naturalHeight);
    return { left: r.left + c.x, top: r.top + c.y, width: c.w, height: c.h };
  }
  /** Transform (origin: centre of the stage) that puts the full-screen picture over rect T. */
  function flipTo(T, nw, nh) {
    var S = stage.getBoundingClientRect();
    var C = contain(S.width, S.height, nw, nh);
    var k = T.width / C.w;
    var cx = S.width / 2, cy = S.height / 2;
    var dx = (T.left - S.left) - cx - (C.x - cx) * k;
    var dy = (T.top - S.top) - cy - (C.y - cy) * k;
    return "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + k.toFixed(4) + ")";
  }
  function onScreen(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(el).visibility !== "hidden";
  }

  /* ---------- Zoom (on the image inside the current layer) ---------- */
  function img() { return layers[cur].firstElementChild; }
  function clampPan() {
    var w = stage.clientWidth, h = stage.clientHeight;
    s = Math.min(MAX, Math.max(MIN, s));
    if (s === 1) { tx = 0; ty = 0; return; }
    tx = Math.min(0, Math.max(w - w * s, tx));
    ty = Math.min(0, Math.max(h - h * s, ty));
  }
  function apply(smooth) {
    clampPan();
    var el = img();
    el.style.transition = smooth && !reduce ? "transform 380ms " + EASE : "none";
    el.style.transform = s === 1 ? "none" : "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
    stage.classList.toggle("is-zoomed", s > 1);
  }
  function zoomAt(x, y, next, smooth) {
    next = Math.min(MAX, Math.max(MIN, next));
    tx = x - (x - tx) * (next / s);
    ty = y - (y - ty) * (next / s);
    s = next;
    apply(smooth);
  }
  function zoomCentre(f) { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, s * f, true); }
  function resetZoom(smooth) { s = 1; tx = 0; ty = 0; apply(smooth); }

  /* ---------- Caption ---------- */
  function setCaption(it, animate) {
    els.title.textContent = it.title;
    els.meta.textContent = it.meta || "";
    if (it.href) { els.link.href = it.href; els.link.hidden = false; } else { els.link.hidden = true; }
    els.count.textContent = items.length > 1 ? (index + 1) + " / " + items.length : "";
    dialog.querySelectorAll("[data-nav]").forEach(function (b) { b.hidden = items.length < 2; });
    if (animate) {
      caption.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: reduce ? 200 : 450, delay: reduce ? 0 : 150, easing: EASE, fill: "backwards" });
    }
  }

  /* ---------- Next / previous: crossfade ---------- */
  function show(i) {
    if (!items.length) return;
    var next = (i + items.length) % items.length;
    if (next === index) { snapBack(); return; }
    var it = items[next];
    var token = ++navToken;
    load(it.src).then(function () {
      if (token !== navToken || !dialog.open) return;
      var outL = layers[cur], inL = layers[1 - cur];
      layers.forEach(function (l) { l.getAnimations().forEach(function (a) { a.finish(); }); });
      var outOpacity = parseFloat(outL.style.opacity || "1");
      var outFrom = outL.style.transform || "none";
      var inImg = inL.firstElementChild;
      inImg.style.transition = "none";
      inImg.style.transform = "none";
      inImg.src = it.src;
      inImg.alt = it.alt;
      inL.style.transform = "none";
      inL.style.opacity = "1";
      outL.style.opacity = "0";
      inL.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: FADE, easing: EASE });
      outL.animate(reduce ? [{ opacity: outOpacity }, { opacity: 0 }] : [{ opacity: outOpacity, transform: outFrom }, { opacity: 0, transform: outFrom }], { duration: FADE, easing: EASE })
        .finished.then(function () { outL.style.transform = "none"; }, function () {});
      cur = 1 - cur;
      index = next;
      s = 1; tx = 0; ty = 0; stage.classList.remove("is-zoomed");
      setCaption(it, true);
      preloadNeighbours();
    });
  }
  function snapBack() {
    var L = layers[cur];
    var from = L.style.transform || "none", op = L.style.opacity || "1";
    L.style.transform = "none"; L.style.opacity = "1";
    if (from !== "none") L.animate([{ transform: from, opacity: op }, { transform: "none", opacity: 1 }], { duration: reduce ? 200 : 450, easing: EASE });
  }

  /* ---------- Open and close ---------- */
  function open(list, i, from, srcList) {
    items = list; sources = srcList || []; index = i; opener = from; closing = false;
    var it = items[i];
    var srcImg = sources[i];
    var L = layers[cur], other = layers[1 - cur];
    other.style.opacity = "0";
    L.style.opacity = "1"; L.style.transform = "none";
    var im = img();
    // Start with the picture already on the page (it is loaded), swap to the large file once decoded.
    im.src = srcImg ? (srcImg.currentSrc || srcImg.src) : it.src;
    im.alt = it.alt;
    resetZoom(false);
    setCaption(it, false);
    load(it.src).then(function () { if (items === list && index === i && img() === im) im.src = it.src; });
    preloadNeighbours();

    document.documentElement.classList.add("viewer-open");
    dialog.showModal();
    dialog.querySelector("[data-close]").focus({ preventScroll: true });

    if (reduce || !srcImg || !onScreen(srcImg) || !srcImg.naturalWidth) {
      dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 200 : 400, easing: EASE });
      return;
    }
    var T = shownRect(srcImg);
    var startT = flipTo(T, srcImg.naturalWidth, srcImg.naturalHeight);
    srcImg.style.visibility = "hidden";
    var dur = 650;
    L.animate([{ transform: startT }, { transform: "none" }], { duration: dur, easing: EASE })
      .finished.then(function () { srcImg.style.visibility = ""; }, function () { srcImg.style.visibility = ""; });
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: EASE });
    chrome.forEach(function (c) { if (c) c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 250, easing: EASE, fill: "backwards" }); });
  }

  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    navToken++;
    resetZoom(false);
    var L = layers[cur];
    var target = sources[index];
    var finish = function () {
      if (target) target.style.visibility = "";
      dialog.close();
    };
    if (reduce || !onScreen(target) || !target.naturalWidth) {
      dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 200 : 300, easing: EASE }).finished.then(finish, finish);
      return;
    }
    var endT = flipTo(shownRect(target), target.naturalWidth, target.naturalHeight);
    var dur = 550;
    target.style.visibility = "hidden";
    chrome.forEach(function (c) { if (c) c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE, fill: "forwards" }); });
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: EASE, fill: "forwards" });
    L.animate([{ transform: L.style.transform || "none" }, { transform: endT }], { duration: dur, easing: EASE, fill: "forwards" })
      .finished.then(finish, finish);
  }

  dialog.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("viewer-open");
    [dialog, bg, layers[0], layers[1]].concat(chrome).forEach(function (el) {
      if (el) el.getAnimations().forEach(function (a) { a.cancel(); });
    });
    layers.forEach(function (l, k) { l.style.transform = "none"; l.style.opacity = k === cur ? "1" : "0"; });
    if (opener && opener.focus) opener.focus({ preventScroll: true });
    closing = false;
  });

  /* ---------- Buttons ---------- */
  dialog.querySelector("[data-close]").addEventListener("click", close);
  dialog.querySelectorAll("[data-nav]").forEach(function (b) {
    b.addEventListener("click", function () { show(index + Number(b.dataset.nav)); });
  });
  dialog.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () {
      var z = b.dataset.zoom;
      if (z === "in") zoomCentre(1.6); else if (z === "out") zoomCentre(1 / 1.6); else resetZoom(true);
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
      apply(true); e.preventDefault(); return;
    }
    if (e.key === "ArrowRight") { show(index + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { show(index - 1); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { zoomCentre(1.6); e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { zoomCentre(1 / 1.6); e.preventDefault(); }
    else if (e.key === "0") { resetZoom(true); e.preventDefault(); }
  });

  /* ---------- Wheel, double-click ---------- */
  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, s * Math.exp(-e.deltaY * 0.0022), false);
  }, { passive: false });
  stage.addEventListener("dblclick", function (e) {
    var r = stage.getBoundingClientRect();
    if (s > 1) resetZoom(true); else zoomAt(e.clientX - r.left, e.clientY - r.top, 2.5, true);
  });

  /* ---------- Pointer: swipe (follows the finger), drag to pan, pinch to zoom ---------- */
  var pointers = new Map(), start = null, pinch = null;
  function midpoint() {
    var p = Array.from(pointers.values()), r = stage.getBoundingClientRect();
    return { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
  }
  stage.addEventListener("pointerdown", function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, t: performance.now(), moved: false };
    if (pointers.size === 2) { pinch = { d: midpoint().d, s: s }; if (start && start.moved) snapBack(); start = null; }
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
    } else if (start && s === 1 && items.length > 1) {
      var dx = e.clientX - start.x;
      if (!start.moved && Math.abs(dx) < 6) return;
      start.moved = true;
      var L = layers[cur];
      L.style.transform = "translate3d(" + dx.toFixed(1) + "px,0,0)";
      if (!reduce) L.style.opacity = String(1 - Math.min(Math.abs(dx) / stage.clientWidth, 1) * 0.35);
    }
  });
  function end(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    stage.classList.remove("is-dragging");
    if (pointers.size < 2) pinch = null;
    if (start && s === 1 && pointers.size === 0 && start.moved) {
      var dx = e.clientX - start.x, dt = performance.now() - start.t;
      var fast = Math.abs(dx) / dt > 0.5 && Math.abs(dx) > 30;
      if (Math.abs(dx) > Math.min(120, stage.clientWidth * 0.18) || fast) show(index + (dx < 0 ? 1 : -1));
      else snapBack();
    }
    start = null;
  }
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  window.addEventListener("resize", function () { if (dialog.open) apply(false); });

  /* ---------- Gallery page: filters + open from the grid ---------- */
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var filters = document.querySelector("[data-filters]");
    var cards = Array.prototype.slice.call(gallery.querySelectorAll(".gallery-item"));
    var countEl = document.querySelector("[data-filter-count]");
    var emptyEl = document.querySelector("[data-empty]");
    var visible = function () { return cards.filter(function (c) { return !c.hidden; }); };
    var applyFilters = function () {
      var medium = filters.medium.value, avail = filters.avail.value;
      cards.forEach(function (c) {
        c.hidden = !((medium === "all" || c.dataset.medium === medium) && (avail === "all" || c.dataset.status === "available"));
      });
      var n = visible().length;
      countEl.textContent = n + (n === 1 ? " work" : " works");
      emptyEl.hidden = n > 0;
      document.dispatchEvent(new CustomEvent("layoutchange"));
    };
    filters.addEventListener("change", applyFilters);
    document.addEventListener("statuschange", applyFilters);
    applyFilters();

    gallery.addEventListener("click", function (e) {
      var link = e.target.closest("[data-open-work]");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      var shown = visible();
      open(shown.map(function (c) { return allItems[Number(c.dataset.index)]; }),
        shown.indexOf(link.closest(".gallery-item")), link,
        shown.map(function (c) { return c.querySelector(".card-frame img"); }));
    });
  }

  /* ---------- Work page: main image + photo slider (600 ms crossfade) ---------- */
  var mainBtn = document.querySelector(".work-main[data-open-photo]");
  var slider = document.querySelector("[data-slider]");
  var slides = slider ? Array.prototype.slice.call(slider.querySelectorAll(".slide")) : [];
  var si = 0;
  function photoSources() {
    var list = [mainBtn ? mainBtn.querySelector("img") : null];
    slides.forEach(function (sl, k) { list.push(k === si ? sl.querySelector("img") : null); });
    return list;
  }
  if (mainBtn) {
    mainBtn.addEventListener("click", function () { open(allItems, 0, mainBtn, photoSources()); });
  }
  if (slider && slides.length) {
    var stageBtn = slider.querySelector("[data-slider-stage]");
    var countS = slider.querySelector("[data-slider-count]");
    var labelS = slider.querySelector("[data-slider-label]");
    var dur = reduce ? 200 : 600;
    var go = function (n) {
      n = (n + slides.length) % slides.length;
      if (n === si) return;
      var out = slides[si], inn = slides[n];
      var im = inn.querySelector("img");
      var ready = im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        out.getAnimations().concat(inn.getAnimations()).forEach(function (a) { a.finish(); });
        inn.classList.add("is-current");
        out.classList.remove("is-current");
        inn.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "scale(1)" }], { duration: dur, easing: EASE });
        out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: EASE });
        si = n;
        countS.textContent = (si + 1) + " / " + slides.length;
        labelS.textContent = inn.dataset.label;
        labelS.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 200 : 450, delay: reduce ? 0 : 150, easing: EASE, fill: "backwards" });
      });
    };
    slider.querySelectorAll("[data-slide]").forEach(function (b) {
      b.addEventListener("click", function () { go(si + Number(b.dataset.slide)); });
    });
    var swipe = null, swiped = false;
    stageBtn.addEventListener("pointerdown", function (e) { swipe = { x: e.clientX, y: e.clientY }; swiped = false; });
    stageBtn.addEventListener("pointerup", function (e) {
      if (!swipe) return;
      var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(si + (dx < 0 ? 1 : -1)); }
      swipe = null;
    });
    stageBtn.addEventListener("click", function (e) {
      if (swiped) { e.preventDefault(); swiped = false; return; }
      open(allItems, Number(slides[si].dataset.photo), stageBtn, photoSources());
    });
    stageBtn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(si + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(si - 1); e.preventDefault(); }
    });
  }
})();
