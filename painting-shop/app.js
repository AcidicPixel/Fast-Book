(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const paintings = window.PAINTINGS || [];

  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cfg.currency || "GBP",
    maximumFractionDigits: 0,
  });

  // ---------- Site text ----------
  document.title = `${cfg.artistName} — Original Paintings`;
  document.querySelectorAll("[data-artist-name]").forEach((el) => (el.textContent = cfg.artistName));
  setText("[data-tagline]", cfg.tagline);
  setText("[data-shipping-note]", cfg.shippingNote);
  setText("[data-year]", new Date().getFullYear());

  const about = document.querySelector("[data-about]");
  (cfg.about || "").split(/\n\n+/).forEach((para) => {
    const p = document.createElement("p");
    p.textContent = para;
    about.appendChild(p);
  });

  const emailLink = document.querySelector("[data-email-link]");
  emailLink.href = `mailto:${cfg.email}`;

  const socials = document.querySelector("[data-socials]");
  [["Instagram", cfg.instagram], ["Facebook", cfg.facebook]]
    .filter(([, url]) => url)
    .forEach(([name, url]) => {
      const a = document.createElement("a");
      a.href = url;
      a.textContent = name;
      a.target = "_blank";
      a.rel = "noopener";
      socials.appendChild(a);
    });

  // ---------- Gallery ----------
  const grid = document.getElementById("grid");
  let currentFilter = "all";

  function render() {
    grid.innerHTML = "";
    const list = paintings.filter((p) => currentFilter === "all" || p.status === currentFilter);
    if (!list.length) {
      grid.innerHTML = '<p class="empty">Nothing here right now — check back soon.</p>';
      return;
    }
    list.forEach((p) => {
      const card = document.createElement("button");
      card.className = "card";
      card.type = "button";
      card.setAttribute("aria-label", `View ${p.title}`);
      card.innerHTML = `
        <div class="frame">
          <img loading="lazy" alt="" />
          ${p.status === "sold" ? '<span class="badge">Sold</span>' : ""}
        </div>
        <div class="card-info">
          <span class="card-title"></span>
          <span class="card-price"></span>
        </div>
        <span class="card-meta"></span>`;
      card.querySelector("img").src = p.image;
      card.querySelector("img").alt = p.title;
      card.querySelector(".card-title").textContent = p.title;
      card.querySelector(".card-price").textContent = p.status === "sold" ? "Sold" : money.format(p.price);
      card.querySelector(".card-meta").textContent = [p.medium, p.size].filter(Boolean).join(" · ");
      card.addEventListener("click", () => openDetail(p));
      grid.appendChild(card);
    });
  }

  document.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // ---------- Detail view ----------
  const dialog = document.getElementById("detail");

  function openDetail(p) {
    document.getElementById("detail-img").src = p.image;
    document.getElementById("detail-img").alt = p.title;
    document.getElementById("detail-title").textContent = p.title;
    document.getElementById("detail-meta").textContent = [p.medium, p.size, p.year].filter(Boolean).join(" · ");
    document.getElementById("detail-desc").textContent = p.description || "";
    document.getElementById("detail-price").textContent = p.status === "sold" ? "Sold" : money.format(p.price);

    const actions = document.getElementById("detail-actions");
    actions.innerHTML = "";
    if (p.status === "sold") {
      actions.appendChild(button("Ask about similar work", mailto(`Enquiry: work similar to "${p.title}"`), "btn-outline"));
    } else if (p.buyLink) {
      actions.appendChild(button("Buy now", p.buyLink, "btn-primary", true));
      actions.appendChild(button("Ask a question", mailto(`Question about "${p.title}"`), "btn-outline"));
    } else {
      actions.appendChild(button("Enquire to buy", mailto(`I'd like to buy "${p.title}"`), "btn-primary"));
    }

    history.replaceState(null, "", `#painting-${p.id}`);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDetail() {
    dialog.close ? dialog.close() : dialog.removeAttribute("open");
  }

  dialog.addEventListener("close", () => {
    if (location.hash.startsWith("#painting-")) history.replaceState(null, "", location.pathname);
  });
  dialog.querySelector("[data-close]").addEventListener("click", closeDetail);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDetail(); // click on backdrop
  });

  // ---------- Helpers ----------
  function setText(sel, text) {
    const el = document.querySelector(sel);
    if (el) el.textContent = text || "";
  }

  function mailto(subject) {
    return `mailto:${cfg.email}?subject=${encodeURIComponent(subject)}`;
  }

  function button(label, href, cls, external) {
    const a = document.createElement("a");
    a.className = `btn ${cls}`;
    a.href = href;
    a.textContent = label;
    if (external) a.rel = "noopener";
    return a;
  }

  render();

  // Open a painting directly from a shared link, e.g. site.com/#painting-evening-glow
  const match = location.hash.match(/^#painting-(.+)$/);
  if (match) {
    const p = paintings.find((x) => x.id === decodeURIComponent(match[1]));
    if (p) openDetail(p);
  }
})();
