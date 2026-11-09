/* Checkout step: pick a shipping region, see the total, then pay with
   Stripe Checkout or the PayPal button. No card data ever touches this site. */
(function () {
  "use strict";
  var box = document.querySelector("[data-checkout]");
  if (!box) return;
  var q = new URLSearchParams(location.search);
  var kind = q.get("print") ? "print" : "work";
  var slug = q.get("print") || q.get("work");
  var $ = function (sel) { return box.querySelector(sel); };
  var errorEl = $("[data-error]");
  var stripeBtn = $("[data-pay-stripe]");
  var paypalSlot = $("[data-paypal-slot]");
  var cat, item, money, busy = false;

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }
  function region() {
    var r = box.querySelector("input[name=region]:checked");
    return r ? cat.shipping.regions.find(function (x) { return x.id === r.value; }) : null;
  }
  function totals() {
    var reg = region();
    $("[data-subtotal]").textContent = money(item.price);
    $("[data-shipping]").textContent = reg ? money(reg.cost) : "—";
    $("[data-total]").textContent = reg ? money(item.price + reg.cost) : "—";
  }
  function getJSON(url) {
    return fetch(url, { headers: { accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
          return j;
        });
      });
  }

  function renderItem(status) {
    var html =
      '<img src="' + item.thumb + '" alt="' + item.title.replace(/"/g, "&quot;") + '" width="480">' +
      '<h2>' + escapeHtml(item.title) + "</h2>" +
      '<p class="muted">' + escapeHtml(kind === "work" ? item.materials + ", " + item.size + ", " + item.year : item.size + " · " + item.edition) + "</p>" +
      '<p>' + money(item.price) + "</p>";
    if (kind === "work") html += '<p><a class="pencil" href="' + item.url + '">Back to the work</a></p>';
    $("[data-item]").innerHTML = html;
    if (kind === "work" && status !== "Available") {
      $("[data-item]").insertAdjacentHTML("beforeend",
        '<p class="form-error">This work is ' + escapeHtml(status.toLowerCase()) + ' and cannot be bought right now. ' +
        '<a class="pencil" href="/contact/?subject=Purchase&work=' + encodeURIComponent(item.title) + '">Make an enquiry</a></p>');
      return false;
    }
    return true;
  }

  function renderRegions() {
    var wrap = $("[data-regions]");
    wrap.innerHTML = cat.shipping.regions.map(function (r, i) {
      return '<label class="region-option"><input type="radio" name="region" value="' + r.id + '"' + (i === 0 ? " checked" : "") + '>' +
        "<span>" + escapeHtml(r.label) + "</span><span>" + money(r.cost) + "</span></label>";
    }).join("");
    wrap.addEventListener("change", totals);
  }

  function lock(on) {
    busy = on;
    stripeBtn.disabled = on;
  }

  function setupStripe(cfg) {
    if (!cfg.stripe) {
      stripeBtn.disabled = true;
      stripeBtn.textContent = "Card payments are not set up yet";
      return;
    }
    stripeBtn.addEventListener("click", function () {
      if (busy) return;
      showError("");
      lock(true);
      stripeBtn.textContent = "Opening Stripe…";
      post("/api/stripe/create-session", { kind: kind, slug: slug, region: region().id })
        .then(function (j) { location.href = j.url; })
        .catch(function (e) {
          showError(e.message);
          lock(false);
          stripeBtn.innerHTML = 'Pay by card <span class="pay-via">with Stripe</span>';
        });
    });
  }

  function setupPayPal(cfg) {
    if (!cfg.paypalClientId) {
      paypalSlot.innerHTML = '<span class="pay-btn pay-disabled">PayPal is not set up yet</span>';
      return;
    }
    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cfg.paypalClientId) +
      "&currency=" + encodeURIComponent(cat.currency) + "&intent=capture&components=buttons" +
      "&disable-funding=card,credit,paylater,venmo";
    s.onerror = function () { paypalSlot.innerHTML = '<span class="pay-btn pay-disabled">PayPal could not load</span>'; };
    s.onload = function () {
      paypalSlot.innerHTML = "";
      var reservation = null;
      window.paypal.Buttons({
        fundingSource: window.paypal.FUNDING.PAYPAL,
        style: { layout: "horizontal", height: 48, tagline: false, shape: "rect", color: "gold", label: "pay" },
        createOrder: function () {
          showError("");
          return post("/api/paypal/create-order", { kind: kind, slug: slug, region: region().id })
            .then(function (j) { reservation = j.rid; return j.id; })
            .catch(function (e) { showError(e.message); throw e; });
        },
        onApprove: function (data) {
          return post("/api/paypal/capture-order", { orderID: data.orderID })
            .then(function () { location.href = "/thank-you/?provider=paypal"; })
            .catch(function (e) { showError(e.message); });
        },
        onCancel: function () {
          if (reservation) post("/api/release", { kind: kind, slug: slug, rid: reservation }).catch(function () {});
          showError("PayPal payment cancelled. No money was taken.");
        },
        onError: function () {
          showError("PayPal could not complete the payment. No money was taken. Please try again or pay by card.");
        },
      }).render(paypalSlot);
    };
    document.head.appendChild(s);
  }

  function escapeHtml(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  Promise.all([
    getJSON("/catalog.json"),
    getJSON("/api/status").catch(function () { return { statuses: {} }; }),
    getJSON("/api/config").catch(function () { return {}; }),
  ]).then(function (res) {
    cat = res[0];
    var statuses = res[1].statuses || {};
    var cfg = res[2];
    money = function (n) {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: cat.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
    };
    item = (kind === "print" ? cat.prints : cat.works).find(function (x) { return x.slug === slug; });
    if (!item) {
      $("[data-item]").innerHTML = '<p>This item was not found. <a class="pencil" href="/work/">See all the work</a></p>';
      return;
    }
    var status = statuses[slug] || item.status;
    if (!renderItem(status)) return;
    if (cfg.testMode) $("[data-test-flag]").hidden = false;
    renderRegions();
    totals();
    $("[data-steps]").hidden = false;
    setupStripe(cfg);
    setupPayPal(cfg);
  }).catch(function () {
    $("[data-item]").innerHTML = "<p>Checkout could not load. Please refresh the page.</p>";
  });
})();
