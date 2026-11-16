// Cloudflare Pages Functions entry point: every /api/... request comes here
// and is passed to the matching handler in server/ (each handler declares its path).
// Needs the "nodejs_compat" compatibility flag and a D1 binding called DB.
import * as m0 from "../../server/admin-export.mjs";
import * as m1 from "../../server/club-address.mjs";
import * as m2 from "../../server/club-config.mjs";
import * as m3 from "../../server/club-manage-link.mjs";
import * as m4 from "../../server/club-me.mjs";
import * as m5 from "../../server/club-members.mjs";
import * as m6 from "../../server/club-paypal-subscription.mjs";
import * as m7 from "../../server/club-portal.mjs";
import * as m8 from "../../server/club-resume.mjs";
import * as m9 from "../../server/club-skip.mjs";
import * as m10 from "../../server/club-stripe-checkout.mjs";
import * as m11 from "../../server/config.mjs";
import * as m12 from "../../server/form-contact.mjs";
import * as m13 from "../../server/form-newsletter.mjs";
import * as m14 from "../../server/paypal-capture-order.mjs";
import * as m15 from "../../server/paypal-create-order.mjs";
import * as m16 from "../../server/paypal-webhook.mjs";
import * as m17 from "../../server/release.mjs";
import * as m18 from "../../server/status.mjs";
import * as m19 from "../../server/stripe-create-session.mjs";
import * as m20 from "../../server/stripe-webhook.mjs";

const routes = new Map([m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20].map((m) => [m.config.path, m.default]));

export async function onRequest(context) {
  const { request, env } = context;
  // Settings and secrets from Cloudflare become process.env for the shared code.
  for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;
  process.env.URL = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  globalThis.__D1__ = env.DB;
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const handle = routes.get(path);
  if (!handle) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "content-type": "application/json" } });
  }
  return handle(request, context);
}
