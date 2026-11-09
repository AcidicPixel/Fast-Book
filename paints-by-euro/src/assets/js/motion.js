/* Scroll-linked motion for Paints by Euro.
   - Paintings fade from 0 to 1, scale 92% → 100% and rise 40 px as they enter,
     finishing when their top is 35% up from the bottom of the screen.
   - Effects follow the scroll position (not a timer), so scrolling back up
     plays them in reverse. Scrolling itself is never changed or taken over.
   - In a grid, each painting follows its left-hand neighbour 60 ms later.
   - Captions and headings appear one line at a time, after the painting.
   - Home: the featured work is pinned for one screen of scroll while it
     scales 85% → 100% and its caption and tagline fade in.
   - Work / Process: feature sections pin one large image at a time, drift it
     30 px against the page, and crossfade to the next.
   Only opacity and transform are written, with one easing curve:
   cubic-bezier(0.22, 1, 0.36, 1). Reduced motion: only a 200 ms fade. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- The one easing curve ---------- */
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var sx = function (t) { return ((ax * t + bx) * t + cx) * t; };
    var sy = function (t) { return ((ay * t + by) * t + cy) * t; };
    var dx = function (t) { return (3 * ax * t + 2 * bx) * t + cx; };
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) {
        var e = sx(t) - x, d = dx(t);
        if (Math.abs(e) < 1e-5) return sy(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      var lo = 0, hi = 1; t = x;
      for (var j = 0; j < 20; j++) {
        var v = sx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  var ease = bezier(0.22, 1, 0.36, 1);
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

  /* Write only when the value changes, to keep each frame cheap. */
  function setFade(el, p, rise, scaleFrom) {
    var key = p.toFixed(4);
    if (el._mk === key) return;
    el._mk = key;
    el.style.opacity = p >= 1 ? "1" : p.toFixed(4);
    if (p >= 1) { el.style.transform = "none"; return; }
    var t = "translate3d(0," + ((1 - p) * rise).toFixed(2) + "px,0)";
    if (scaleFrom) t += " scale(" + (scaleFrom + (1 - scaleFrom) * p).toFixed(4) + ")";
    el.style.transform = t;
  }

  /* ---------- Split headings into words, grouped by line ---------- */
  function splitWords(el) {
    if (el._words) return el._words;
    var words = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var span = document.createElement("span");
        span.className = "rl-word";
        span.textContent = part;
        frag.appendChild(span);
        words.push({ el: span, line: 0 });
      });
      node.parentNode.replaceChild(frag, node);
    });
    el._words = words;
    return words;
  }

  /* ---------- Collect the things that move ---------- */
  var items = [], texts = [], hero = null, features = [];

  function collect() {
    items = []; texts = []; features = [];
    document.querySelectorAll("[data-reveal]").forEach(function (wrap) {
      if (wrap.closest("[data-hero], [data-feature]")) return;
      var target = wrap.firstElementChild;
      if (!target) return;
      var scope = wrap.closest("[data-reveal-scope]");
      var lines = scope ? Array.prototype.slice.call(scope.querySelectorAll("[data-reveal-line]")) : [];
      items.push({ wrap: wrap, target: target, lines: lines, top: 0, left: 0, delay: 0, end: 1 });
    });
    document.querySelectorAll("[data-reveal-text]").forEach(function (el) {
      if (el.closest("[data-hero]")) return;
      texts.push({ el: el, words: splitWords(el), lines: 1, top: 0, end: 1 });
    });
    var h = document.querySelector("[data-hero]");
    if (h) {
      hero = {
        el: h, stick: h.querySelector(".hero-stick"),
        img: h.querySelector(".hero-figure img"),
        lines: Array.prototype.slice.call(h.querySelectorAll("[data-hero-line]")),
        top: 0, dist: 1,
      };
    }
    document.querySelectorAll("[data-feature]").forEach(function (el) {
      features.push({ el: el, stick: el.querySelector(".feature-stick"), slides: Array.prototype.slice.call(el.querySelectorAll("[data-slide]")), top: 0, dist: 1 });
    });
  }

  /* ---------- Measure layout (only on load / resize / filter change) ---------- */
  var vh = window.innerHeight, maxScroll = 0;
  function measure() {
    vh = window.innerHeight;
    var sy = window.scrollY;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    var rows = {};
    items.forEach(function (it) {
      var r = it.wrap.getBoundingClientRect(); // the wrapper is never transformed
      it.visible = r.width > 0 || r.height > 0;
      it.top = r.top + sy; it.left = r.left;
      var group = it.wrap.closest("ul, ol, section, main") || document.body;
      if (!group._rid) group._rid = Math.random().toString(36).slice(2);
      var key = group._rid + ":" + Math.round(it.top / 8);
      (rows[key] = rows[key] || []).push(it);
      it.end = 1 + (it.lines.length ? 0.2 * (it.lines.length - 1) + 0.5 : 0);
      it.stretch = stretchFor(it.top, it.end);
    });
    Object.keys(rows).forEach(function (k) {
      rows[k].sort(function (a, b) { return a.left - b.left; })
        .forEach(function (it, i) { it.delay = i * 60; });
    });
    texts.forEach(function (tx) {
      var r = tx.el.getBoundingClientRect();
      tx.top = r.top + sy;
      // group words by the line they sit on
      var lineTops = [];
      tx.words.forEach(function (w) {
        var t = Math.round(w.el.offsetTop);
        var idx = lineTops.indexOf(t);
        if (idx < 0) { lineTops.push(t); idx = lineTops.length - 1; }
        w.line = idx;
      });
      tx.lines = lineTops.length;
      tx.end = 0.15 * (tx.lines - 1) + 0.6;
      tx.stretch = stretchFor(tx.top, tx.end);
    });
    if (hero) {
      var hr = hero.el.getBoundingClientRect();
      hero.top = hr.top + sy;
      hero.dist = Math.max(1, hero.el.offsetHeight - hero.stick.offsetHeight);
    }
    features.forEach(function (f) {
      var fr = f.el.getBoundingClientRect();
      f.top = fr.top + sy;
      f.dist = Math.max(1, f.el.offsetHeight - f.stick.offsetHeight);
    });
  }
  /* Near the end of the page an item may never reach the 35% line; stretch its
     progress so it still finishes at the last possible scroll position. */
  function stretchFor(top, end) {
    var rAtMax = (maxScroll + vh - top) / (0.35 * vh);
    return rAtMax > 0 && rAtMax < end ? end / rAtMax : 1;
  }

  /* ---------- Scroll history, so grid neighbours can follow 60 ms later ---------- */
  var hist = [];
  function record(now) {
    hist.push({ t: now, y: window.scrollY });
    while (hist.length > 2 && hist[1].t < now - 600) hist.shift();
  }
  function scrollAt(t) {
    for (var i = hist.length - 1; i >= 0; i--) {
      if (hist[i].t <= t) {
        var a = hist[i], b = hist[i + 1];
        if (!b) return a.y;
        return a.y + (b.y - a.y) * ((t - a.t) / (b.t - a.t));
      }
    }
    return hist.length ? hist[0].y : window.scrollY;
  }

  /* ---------- Render one frame ---------- */
  function render(now) {
    var y0 = window.scrollY;
    items.forEach(function (it) {
      if (!it.visible) return;
      var y = it.delay ? scrollAt(now - it.delay) : y0;
      var r = ((y + vh - it.top) / (0.35 * vh)) * it.stretch;
      setFade(it.target, ease(clamp(r, 0, 1)), 40, 0.92);
      for (var k = 0; k < it.lines.length; k++) {
        setFade(it.lines[k], ease(clamp((r - 1 - 0.2 * k) / 0.5, 0, 1)), 14, 0);
      }
    });
    texts.forEach(function (tx) {
      var r = ((y0 + vh - tx.top) / (0.35 * vh)) * tx.stretch;
      for (var i = 0; i < tx.words.length; i++) {
        var w = tx.words[i];
        setFade(w.el, ease(clamp((r - 0.15 * w.line) / 0.6, 0, 1)), 14, 0);
      }
    });
    if (hero) {
      var q = clamp((y0 - hero.top) / hero.dist, 0, 1);
      var s = 0.85 + 0.15 * ease(q);
      var key = s.toFixed(4);
      if (hero.img && hero.img._mk !== key) {
        hero.img._mk = key;
        hero.img.style.transform = s >= 1 ? "none" : "scale(" + key + ")";
      }
      for (var k = 0; k < hero.lines.length; k++) {
        setFade(hero.lines[k], ease(clamp((q - 0.2 - 0.18 * k) / 0.4, 0, 1)), 16, 0);
      }
    }
    features.forEach(function (f) {
      var n = f.slides.length;
      var q = clamp((y0 - f.top) / f.dist, 0, 1);
      var pos = clamp(q * n - 0.5, 0, n - 1); // each slide holds for a stretch, then crossfades
      var i0 = Math.floor(pos), t = pos - i0;
      var mix = ease(clamp((t - 0.25) / 0.5, 0, 1));
      f.slides.forEach(function (sl, i) {
        var op = i === i0 ? 1 - mix : i === i0 + 1 ? mix : 0;
        if (n === 1) op = 1;
        // drift: 30 px across the slide's pinned stretch, slower than the page
        var u = clamp(q * n - i, 0, 1);
        var tyv = (0.5 - u) * 30;
        var key2 = op.toFixed(3) + ":" + tyv.toFixed(1);
        if (sl._mk === key2) return;
        sl._mk = key2;
        sl.style.opacity = op.toFixed(3);
        sl.style.transform = "translate3d(0," + tyv.toFixed(2) + "px,0)";
        sl.style.visibility = op === 0 ? "hidden" : "visible";
      });
    });
  }

  /* ---------- Frame loop: runs only while scrolling (plus the 60 ms tails) ---------- */
  var running = false, lastMove = 0, maxDelay = 0;
  function frame(now) {
    record(now);
    render(now);
    if (now - lastMove < maxDelay + 120) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    lastMove = performance.now();
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  /* ---------- Reduced motion: a 200 ms fade when things come into view ---------- */
  function initReduced() {
    var fadeIn = function (el) {
      el.style.transition = "opacity 200ms " + EASE_CSS;
      el.style.opacity = "1";
      el.style.transform = "none";
    };
    var targets = [];
    items.forEach(function (it) { targets.push([it.wrap, [it.target].concat(it.lines)]); });
    texts.forEach(function (tx) { targets.push([tx.el, tx.words.map(function (w) { return w.el; })]); });
    if (hero) hero.lines.forEach(fadeIn);
    if (!("IntersectionObserver" in window)) { targets.forEach(function (t) { t[1].forEach(fadeIn); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target._fade.forEach(fadeIn);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -5% 0px" });
    targets.forEach(function (t) { t[0]._fade = t[1]; io.observe(t[0]); });
  }

  /* ---------- Start (this script runs at the end of <body>, before first paint) ---------- */
  collect();
  if (reduce) {
    initReduced();
  } else {
    measure();
    maxDelay = items.reduce(function (m, it) { return Math.max(m, it.delay); }, 0);
    record(performance.now());
    render(performance.now());
    window.addEventListener("scroll", kick, { passive: true });
    var remeasure = function () {
      measure();
      maxDelay = items.reduce(function (m, it) { return Math.max(m, it.delay); }, 0);
      hist = []; record(performance.now());
      render(performance.now());
    };
    var resizeTimer;
    window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(remeasure, 120); });
    window.addEventListener("load", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    document.addEventListener("layoutchange", remeasure);
    // re-measure after late images or other content settle
    var imgTimer;
    document.addEventListener("load", function (e) {
      if (e.target && e.target.tagName === "IMG") { clearTimeout(imgTimer); imgTimer = setTimeout(remeasure, 100); }
    }, true);
  }

  window.Motion = { ease: ease, reduce: reduce, EASE_CSS: EASE_CSS, _debug: function () { return { items: items, features: features, hero: hero, vh: vh }; } };
})();
