// The site's address for canonical links and the sitemap.
// On Cloudflare, set SITE_URL (e.g. https://paintsbyeuro.com) as a build variable.
export default {
  url: (process.env.SITE_URL || process.env.CF_PAGES_URL || "http://localhost:8080").replace(/\/$/, ""),
  build: new Date().toISOString(),
};
