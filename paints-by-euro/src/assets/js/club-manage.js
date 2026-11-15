/* Manage my Print Club: email link sign-in, then address / skip / cancel. */
(function () {
  "use strict";
  var root = document.querySelector("[data-manage]");
  if (!root) return;
  var token = new URLSearchParams(location.search).get("t");
  var $ = function (s) { return root.querySelector(s); };
  var post = function (url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again."); return j; }); });
  };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  if (!token) {
    $("[data-ask-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("[data-ask-msg]");
      msg.textContent = "Sending…";
      post("/api/club/manage-link", { email: $("#m-email").value })
        .then(function () { msg.textContent = "If that email belongs to a Print Club member, a link is on its way. Check your inbox."; })
        .catch(function (err) { msg.textContent = err.message; });
    });
    return;
  }

  $("[data-step=ask]").hidden = true;
  $("[data-step=member]").hidden = false;
  var errEl = $("[data-member-error]");
  var showErr = function (m) { errEl.textContent = m || ""; errEl.hidden = !m; };

  function render(data) {
    $("[data-member-intro]").textContent = data.members.length
      ? "Signed in as " + data.email + "."
      : "No active membership was found for " + data.email + ".";
    $("[data-member-list]").innerHTML = data.members.map(function (m) {
      var a = m.address || {};
      var addr = [a.name, a.line1, a.line2, a.city, a.postal_code, a.country].filter(Boolean).map(esc).join(", ");
      var html = '<article class="member-card" data-id="' + esc(m.id) + '">' +
        "<h2>" + esc(m.planLabel) + " · " + esc(m.providerLabel) + "</h2>" +
        "<p>Status: " + esc(m.statusLabel) + (m.skipMonth ? " · Skipping " + esc(m.skipMonth) : "") + "</p>" +
        "<p>Delivery address: " + (addr || "—") + "</p><div class=\"member-actions\">";
      if (m.canSkip) html += '<button type="button" class="btn btn-line" data-act="skip">Skip next month</button>';
      if (m.provider === "stripe") html += '<button type="button" class="btn btn-solid" data-act="portal">Change address, card or cancel</button>';
      if (m.provider === "paypal") {
        html += '<button type="button" class="btn btn-line" data-act="address">Change address</button>' +
          '<a class="btn btn-solid" href="https://www.paypal.com/myaccount/autopay/" rel="noopener">Cancel or change payment in PayPal</a>';
      }
      html += "</div>";
      if (m.provider === "paypal") {
        html += '<form class="contact-form member-address" data-address-form hidden>' +
          ["name|Name", "line1|Address line 1", "line2|Address line 2", "city|Town or city", "postal_code|Postcode", "country|Country code (e.g. GB)"].map(function (f) {
            var p = f.split("|"); var id = "ad-" + m.id + "-" + p[0];
            return '<div class="field"><label for="' + id + '">' + p[1] + '</label><input id="' + id + '" name="' + p[0] + '" value="' + esc(a[p[0]] || "") + '"' + (p[0] === "line2" ? "" : " required") + "></div>";
          }).join("") + '<button class="btn btn-solid" type="submit">Save address</button></form>';
      }
      return html + "</article>";
    }).join("");
  }

  function load() {
    return fetch("/api/club/me?t=" + encodeURIComponent(token)).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "This link has expired. Please ask for a new one."); return j; });
    }).then(render).catch(function (e) { showErr(e.message); });
  }
  load();

  $("[data-member-list]").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = btn.closest("[data-id]").dataset.id;
    showErr("");
    if (btn.dataset.act === "portal") {
      btn.disabled = true;
      post("/api/club/portal", { t: token, id: id }).then(function (j) { location.href = j.url; }).catch(function (err) { showErr(err.message); btn.disabled = false; });
    } else if (btn.dataset.act === "skip") {
      btn.disabled = true;
      post("/api/club/skip", { t: token, id: id }).then(load).catch(function (err) { showErr(err.message); btn.disabled = false; });
    } else if (btn.dataset.act === "address") {
      var f = btn.closest("[data-id]").querySelector("[data-address-form]");
      f.hidden = !f.hidden;
    }
  });
  $("[data-member-list]").addEventListener("submit", function (e) {
    var f = e.target.closest("[data-address-form]");
    if (!f) return;
    e.preventDefault();
    var id = f.closest("[data-id]").dataset.id;
    var address = {};
    Array.prototype.forEach.call(f.elements, function (el) { if (el.name) address[el.name] = el.value.trim(); });
    post("/api/club/address", { t: token, id: id, address: address }).then(load).catch(function (err) { showErr(err.message); });
  });
})();
