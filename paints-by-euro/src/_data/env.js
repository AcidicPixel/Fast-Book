// Netlify sets URL to the site's main https:// address at build time.
export default {
  url: (process.env.URL || "http://localhost:8080").replace(/\/$/, ""),
  build: new Date().toISOString(),
};
