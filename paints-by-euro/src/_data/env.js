// The site's address for canonical links and the sitemap.
// On Cloudflare Pages, set SITE_URL (e.g. https://paintsbyeuro.com) in the build settings;
// until then the Pages address is used.
export default {
  url: (process.env.SITE_URL || process.env.CF_PAGES_URL || "http://localhost:8080").replace(/\/$/, ""),
  build: new Date().toISOString(),
};
