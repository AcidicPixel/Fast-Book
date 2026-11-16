/* Print Club sign-up: Stripe Billing (Checkout in subscription mode) or a
   PayPal subscription. Both collect the delivery address on their own pages. */
(function () {
  "use strict";
  var box = document.querySelector("[data-club]");
  if (!box) return;
  var errorEl = box.querySelector("[data-club-error]");
  var stripeBtn = box.querySelector("[data-club-stripe]");
  var slot = box.querySelector("[data-club-paypal]");
  var plan = function () { var r = box.querySelector("input[name=plan]:checked"); return r ? r.value : "monthly"; };
  var showError = function (m) { errorEl.textContent = m || ""; errorEl.hidden = !m; };
  var post = function (url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again."); return j; }); });
  };

  fetch("/api/club/config").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (cfg) {
    if (cfg.testMode) box.querySelector("[data-test-flag]").hidden = false;

    if (!cfg.stripe) { stripeBtn.disabled = true; stripeBtn.textContent = "Card sign-up is not set up yet"; }
    else stripeBtn.addEventListener("click", function () {
      showError(""); stripeBtn.disabled = true; stripeBtn.textContent = "Opening Stripe…";
      post("/api/club/stripe-checkout", { plan: plan() })
        .then(function (j) { location.href = j.url; })
        .catch(function (e) { showError(e.message); stripeBtn.disabled = false; stripeBtn.innerHTML = 'Join with card <span class="pay-via">via Stripe</span>'; });
    });

    if (!cfg.paypalClientId) { slot.innerHTML = '<span class="pay-btn pay-disabled">PayPal sign-up is not set up yet</span>'; return; }
    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cfg.paypalClientId) + "&vault=true&intent=subscription&components=buttons";
    s.onerror = function () { slot.innerHTML = '<span class="pay-btn pay-disabled">PayPal could not load</span>'; };
    s.onload = function () {
      slot.innerHTML = "";
      window.paypal.Buttons({
        fundingSource: window.paypal.FUNDING.PAYPAL,
        style: { layout: "horizontal", height: 48, tagline: false, shape: "rect", color: "gold", label: "subscribe" },
        createSubscription: function () {
          showError("");
          return post("/api/club/paypal-subscription", { plan: plan() }).then(function (j) { return j.id; })
            .catch(function (e) { showError(e.message); throw e; });
        },
        onApprove: function () { location.href = "/print-club/welcome/?provider=paypal"; },
        onCancel: function () { showError("PayPal sign-up cancelled. Nothing was charged."); },
        onError: function () { showError("PayPal could not complete the sign-up. Nothing was charged. Please try again or use a card."); },
      }).render(slot);
    };
    document.head.appendChild(s);
  });
})();
