import { imgUrl } from "../../lib/images.js";

export default {
  layout: "layouts/work.njk",
  tags: [],
  permalink: (data) => `/work/${data.page.fileSlug}/`,
  eleventyComputed: {
    ogImage: (d) => imgUrl(d.image, 1024),
    pageTitle: (d) => `${d.title}, ${d.year} — ${d.medium === "oil" ? "Oil painting" : "Pencil drawing"}`,
    description: (d) =>
      `${d.title} (${d.year}), ${d.materials}, ${d.height} × ${d.width} ${d.unit || "cm"}. ${d.status}. An original by Paints by Euro.`,
  },
};
