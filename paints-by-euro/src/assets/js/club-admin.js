/* Artist tool: this month's active members and addresses, with CSV export. */
(function () {
  "use strict";
  var root = document.querySelector("[data-admin]");
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var month = $("#a-month");
  month.value = new Date().toISOString().slice(0, 7);
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fetchList = function (format) {
    return fetch("/api/club/members?month=" + encodeURIComponent(month.value) + "&format=" + format, {
      headers: { authorization: "Bearer " + $("#a-pass").value },
    }).then(function (r) {
      if (r.status === 401) throw new Error("Wrong password.");
      if (!r.ok) throw new Error("Could not load the member list.");
      return format === "csv" ? r.blob() : r.json();
    });
  };
  $("[data-admin-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("[data-admin-error]"); err.hidden = true;
    fetchList("json").then(function (data) {
      $("[data-admin-result]").hidden = false;
      $("[data-admin-summary]").textContent = data.members.length + " bundle" + (data.members.length === 1 ? "" : "s") + " to send for " + data.month + (data.skipped ? " (" + data.skipped + " skipping)" : "") + ".";
      var cols = ["name", "email", "line1", "line2", "city", "postal_code", "state", "country", "plan", "provider"];
      $("[data-admin-table]").innerHTML = "<thead><tr>" + cols.map(function (c) { return "<th scope=col>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        data.members.map(function (m) { return "<tr>" + cols.map(function (c) { return "<td>" + esc(m[c]) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>";
    }).catch(function (x) { err.textContent = x.message; err.hidden = false; });
  });
  $("[data-admin-csv]").addEventListener("click", function () {
    fetchList("csv").then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "print-club-" + month.value + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(function (x) { var err = $("[data-admin-error]"); err.textContent = x.message; err.hidden = false; });
  });
})();
