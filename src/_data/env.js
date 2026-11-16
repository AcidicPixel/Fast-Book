// The site's address for canonical links and the sitemap.
// Set SITE_URL (e.g. https://paints-by-euro.example.workers.dev) as a build variable
// once the site has an address. Until then, links are written without a domain.
export default {
  url: (process.env.SITE_URL || "").replace(/\/$/, ""),
  build: new Date().toISOString(),
};
