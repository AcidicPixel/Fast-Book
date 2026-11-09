import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { processImages, picture, imgUrl, getImage } from "./lib/images.js";

const MEDIUM = { oil: "Oil painting", pencil: "Pencil drawing" };

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
    const dest = "netlify/functions/_lib/catalog.generated.json";
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile("_site/catalog.json", dest);
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
  config.addFilter("altText", (work, extra = "") =>
    `${/placeholder/i.test(work.image || "") ? "Placeholder: " : ""}${work.title}, ${(MEDIUM[work.medium] || "").toLowerCase()}${extra ? ` (${extra})` : ""}`
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

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
