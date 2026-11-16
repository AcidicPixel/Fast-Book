/* Site-wide behaviour: phone menu, live work status and contact form prefill.
   Scroll motion lives in motion.js. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---------- Phone menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  var outside = [document.getElementById("main"), document.querySelector(".site-footer")];

  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    outside.forEach(function (el) { if (el) el.inert = open; });
    if (open) {
      var first = nav.querySelector("a");
      if (first) first.focus();
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!root.classList.contains("menu-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("menu-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 48em)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- Live status (Reserved / Sold come from checkout) ---------- */
  var statusKey = function (s) { return String(s || "").toLowerCase().replace(/\s+/g, "-"); };
  var workEls = document.querySelectorAll("[data-work]");
  if (workEls.length) {
    fetch("/api/status", { headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.statuses) return;
        workEls.forEach(function (el) {
          var s = data.statuses[el.dataset.work];
          if (!s) return;
          el.dataset.status = statusKey(s);
          el.querySelectorAll("[data-status-label]").forEach(function (l) { l.textContent = s; });
          var available = s === "Available";
          el.querySelectorAll("[data-buy], [data-buy-note]").forEach(function (b) { b.hidden = !available; });
        });
        document.dispatchEvent(new CustomEvent("statuschange"));
      })
      .catch(function () { /* keep the status printed in the page */ });
  }

  /* ---------- Contact form: prefill from ?subject= and ?work= ---------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var q = new URLSearchParams(location.search);
    var subject = q.get("subject");
    var select = form.querySelector("select[name=subject]");
    if (subject && select) {
      Array.prototype.forEach.call(select.options, function (o) { if (o.value === subject) select.value = subject; });
    }
    var work = q.get("work");
    if (work) {
      form.querySelector("[data-work-field]").value = work;
      var msg = form.querySelector("textarea[name=message]");
      if (!msg.value) msg.value = "About: " + work + "\n\n";
    }
  }

})();
