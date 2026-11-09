/* Simple scroll animations for Paints by Euro.
   Paintings, captions and headings fade up once as they come into view.
   The browser runs the animation with a CSS transition (opacity and
   transform only); this script just adds a class when an element appears.
   Nothing runs while scrolling, nothing is pinned, scrolling is never changed.
   Reduced motion: a plain 200 ms fade (see site.css). */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.Motion = { reduce: reduce };

  var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal], [data-reveal-text]"));
  if (!targets.length) return;

  // Small stagger for paintings side by side in the same list.
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    var item = el.closest("li");
    if (!item || !item.parentElement) return;
    var i = Array.prototype.indexOf.call(item.parentElement.children, item);
    var d = (i % 3) * 80 + "ms";
    el.style.setProperty("--d", d);
    var scope = el.closest("[data-reveal-scope]");
    if (scope) scope.style.setProperty("--d", d);
  });

  function show(el) {
    el.classList.add("is-in");
    var scope = el.closest("[data-reveal-scope]");
    if (scope) scope.classList.add("is-in");
  }

  // Whatever is already on screen when the page opens is shown straight away.
  root.classList.add("no-anim");
  var vh = window.innerHeight;
  var rest = targets.filter(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) { show(el); return false; }
    return true;
  });
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("no-anim"); }); });

  if (!("IntersectionObserver" in window)) { rest.forEach(show); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  rest.forEach(function (el) { io.observe(el); });
})();
