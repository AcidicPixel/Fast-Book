// GET /api/config — public settings for the checkout page (no secrets).
import { handler, json } from "./_lib/http.mjs";
import { isTestMode } from "./_lib/guard.mjs";

export default handler("GET", async () =>
  json({
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    paypalClientId: process.env.PAYPAL_CLIENT_SECRET ? process.env.PAYPAL_CLIENT_ID || null : null,
    testMode: isTestMode(),
  })
);

export const config = { path: "/api/config" };
