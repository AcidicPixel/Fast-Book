// POST /api/club/portal  { t, id } — opens the Stripe Customer Portal
// (change address or card, or cancel).
import { handler, json, readJson, siteUrl, HttpError } from "./_lib/http.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { memberForToken } from "./_lib/club.mjs";

export default handler("POST", async (req) => {
  const { t, id } = await readJson(req);
  const m = await memberForToken(t, id);
  if (m.provider !== "stripe" || !m.customerId) throw new HttpError(400, "This membership is managed in PayPal.");
  const s = await stripe("/billing_portal/sessions", { customer: m.customerId, return_url: `${siteUrl()}/print-club/manage/?t=${encodeURIComponent(t)}` });
  return json({ url: s.url });
});
export const config = { path: "/api/club/portal" };
