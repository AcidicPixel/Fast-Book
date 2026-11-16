// Fallback redirect pages for the old /work and /contact addresses, for hosts
// that don't read _redirects. On Cloudflare Pages the _redirects rules answer first.
import { readdirSync } from "node:fs";

const slugs = readdirSync("src/works").filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
// The old slugs pencil-01…04 became pen-01…04.
const renamed = { "pencil-01": "pen-01", "pencil-02": "pen-02", "pencil-03": "pen-03", "pencil-04": "pen-04" };

export default class {
  data() {
    return {
      pagination: { data: "oldAddresses", size: 1, alias: "r" },
      oldAddresses: [
        { from: "/work/", to: "/collections/" },
        { from: "/contact/", to: "/commission-contact/" },
        ...slugs.map((s) => ({ from: `/work/${s}/`, to: `/collections/${s}/` })),
        ...Object.entries(renamed).map(([o, n]) => ({ from: `/work/${o}/`, to: `/collections/${n}/` })),
      ],
      permalink: (d) => `${d.r.from}index.html`,
      eleventyExcludeFromCollections: true,
    };
  }
  render({ r }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta name="robots" content="noindex"><link rel="canonical" href="${r.to}">
<meta http-equiv="refresh" content="0; url=${r.to}">
<script>location.replace(${JSON.stringify(r.to)} + location.search + location.hash);</script></head>
<body><p>This page has moved to <a href="${r.to}">${r.to}</a>.</p></body></html>`;
  }
}
