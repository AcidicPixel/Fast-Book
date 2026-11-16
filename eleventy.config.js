import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { processImages, picture, imgUrl, getImage } from "./lib/images.js";

// The four mediums. Category names (filters, tiles) and the label for one item.
export const MEDIUMS = [
  { key: "oil", name: "Oil Paint", one: "Oil Paint", alt: "oil painting" },
  { key: "pen", name: "Pen Sketches", one: "Pen Sketch", alt: "pen sketch" },
  { key: "print", name: "Prints", one: "Print", alt: "print" },
  { key: "card", name: "Cards & Postcards", one: "Card", alt: "card" },
];
const MEDIUM = Object.fromEntries(MEDIUMS.map((m) => [m.key, m.one]));
const MEDIUM_ALT = Object.fromEntries(MEDIUMS.map((m) => [m.key, m.alt]));

export default function (config) {
  config.addPassthroughCopy({ "src/assets": "assets" });
  config.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  config.addWatchTarget("src/images/");

  // Build the WebP image set before any page renders.
  config.on("eleventy.before", async () => {
    await processImages("src/images", "_site/img");
  });

  // Copy the public catalogue next to the serverless functions so checkout
  // prices come from the same content files as the pages.
  config.on("eleventy.after", async () => {
    const dest = "server/_lib/catalog.generated.mjs";
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, `// Written by the site build. Do not edit.\nexport default ${await readFile("_site/catalog.json", "utf8")};\n`);
  });

  config.addShortcode("picture", (p, alt, mode = "thumb", sizes = "100vw", cls = "", eager = false) =>
    picture(p, alt, { mode, sizes, cls, eager })
  );
  config.addFilter("imgUrl", (p, size = 1024) => imgUrl(p, size));
  config.addFilter("imgRatio", (p) => {
    const i = getImage(p);
    return `${i.width} / ${i.height}`;
  });
  config.addFilter("mediumLabel", (m) => MEDIUM[m] || m);
  config.addGlobalData("mediums", MEDIUMS);
  config.addFilter("head", (arr, n) => (arr || []).slice(0, n));
  // Events still to come (dates as YYYY-MM-DD), soonest first.
  config.addFilter("upcoming", (events) => {
    const today = new Date().toISOString().slice(0, 10);
    return (events || []).filter((e) => e && e.date && String(e.date) >= today).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  });
  config.addFilter("altText", (work, extra = "") =>
    `${/placeholder/i.test(work.image || "") ? "Placeholder: " : ""}${work.title}, ${MEDIUM_ALT[work.medium || work.type] || ""}${extra ? ` (${extra})` : ""}`
  );
  config.addFilter("size", (w) =>
    `${w.height} × ${w.width}${w.depth ? ` × ${w.depth}` : ""} ${w.unit || "cm"}`
  );
  config.addFilter("money", (amount, currency) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount)
  );
  config.addFilter("statusKey", (s) => String(s || "").toLowerCase().replace(/\s+/g, "-"));
  config.addFilter("json", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));
  config.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  config.addFilter("year", () => new Date().getFullYear());
  config.addFilter("slugOf", (page) => page.fileSlug);

  const byDate = (a, b) => b.date - a.date || a.fileSlug.localeCompare(b.fileSlug);
  config.addCollection("works", (api) => api.getFilteredByGlob("src/works/*.md").sort(byDate));
  config.addCollection("prints", (api) => api.getFilteredByGlob("src/prints-items/*.md").sort(byDate));
  config.addCollection("printsOnly", (api) => api.getFilteredByGlob("src/prints-items/*.md").filter((p) => p.data.type !== "card").sort(byDate));
  config.addCollection("cards", (api) => api.getFilteredByGlob("src/prints-items/*.md").filter((p) => p.data.type === "card").sort(byDate));
  config.addPassthroughCopy({ "src/_redirects": "_redirects" });
  config.addPassthroughCopy({ "src/_headers": "_headers" });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
