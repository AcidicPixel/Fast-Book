// Public catalogue used by the checkout page and copied to the serverless
// functions at build time, so prices and statuses come from the content files.
import { imgUrl } from "../lib/images.js";

export default class {
  data() {
    return { permalink: "/catalog.json", eleventyExcludeFromCollections: true };
  }
  render({ collections, site }) {
    const size = (d) => `${d.height} × ${d.width}${d.depth ? ` × ${d.depth}` : ""} ${d.unit || "cm"}`;
    const works = collections.works.map((w) => ({
      slug: w.fileSlug,
      key: `${w.fileSlug}--${w.data.relist || 0}`,
      title: w.data.title,
      medium: w.data.medium,
      materials: w.data.materials,
      size: size(w.data),
      year: w.data.year,
      price: Number(w.data.price),
      status: w.data.status,
      url: w.url,
      thumb: imgUrl(w.data.image, 480),
    }));
    const prints = site.prints.enabled
      ? collections.prints.map((p) => ({
          slug: p.fileSlug, title: p.data.title, size: p.data.size, edition: p.data.edition,
          price: Number(p.data.price), thumb: imgUrl(p.data.image, 480), url: "/prints/",
        }))
      : [];
    return JSON.stringify({
      siteName: site.name, currency: site.currency, taxRule: site.taxRule,
      shipping: site.shipping, works, prints,
    }, null, 2);
  }
}
