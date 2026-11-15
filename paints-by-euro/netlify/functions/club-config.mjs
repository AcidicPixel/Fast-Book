// GET /api/club/config — public settings for the Print Club page (no secrets).
import { handler, json } from "./_lib/http.mjs";
import { isTestMode } from "./_lib/guard.mjs";
import { catalog } from "./_lib/catalog.mjs";

export default handler("GET", async () =>
  json({
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    paypalClientId: process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PLAN_MONTHLY ? process.env.PAYPAL_CLIENT_ID || null : null,
    testMode: isTestMode(),
    gifts: Boolean(catalog().printClub?.giftsEnabled),
  })
);
export const config = { path: "/api/club/config" };
