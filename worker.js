// Cloudflare Worker entry point.
// - /api/* goes to the same router the site used on Pages (functions/api/[[route]].js).
// - Everything else is a static file from _site (with _redirects and _headers applied).
// - The daily cron runs the Print Club resume job.
import { onRequest } from "./functions/api/[[route]].js";
import resume from "./server/club-resume.mjs";

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      return onRequest({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;
    if (env.SITE_URL) process.env.URL = env.SITE_URL.replace(/\/$/, "");
    globalThis.__D1__ = env.DB;
    ctx.waitUntil(resume()); // called directly, so no secret is needed here
  },
};
