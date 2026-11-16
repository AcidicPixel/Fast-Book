// POST /api/club/stripe-checkout  { plan } — Stripe Billing subscription via Checkout.
// Monthly members are charged on the club's billing date each month (the first
// charge is on the next billing date). Gifts are charged once, straight away.
import { handler, json, readJson, siteUrl, HttpError } from "./_lib/http.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { stripeKey } from "./_lib/guard.mjs";
import { planFor, clubCountries, nextBillingDate } from "./_lib/club.mjs";

export default handler("POST", async (req) => {
  const { plan: planId } = await readJson(req);
  stripeKey();
  const plan = planFor(planId);
  const prices = await stripe(`/prices?active=true&lookup_keys[]=${encodeURIComponent(plan.lookup)}`, null, { method: "GET" });
  const price = prices.data?.[0];
  if (!price) throw new HttpError(503, "This plan is not set up in Stripe yet.");
  const anchor = nextBillingDate();
  const meta = { kind: "club", plan: plan.id };
  const session = await stripe("/checkout/sessions", {
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    shipping_address_collection: { allowed_countries: clubCountries() },
    subscription_data: plan.months
      ? { metadata: meta }
      : { metadata: meta, billing_cycle_anchor: Math.floor(anchor.getTime() / 1000), proration_behavior: "none" },
    metadata: { ...meta, firstMonth: plan.months ? new Date().toISOString().slice(0, 7) : anchor.toISOString().slice(0, 7) },
    success_url: `${siteUrl()}/print-club/welcome/?provider=stripe`,
    cancel_url: `${siteUrl()}/print-club/#join`,
  });
  return json({ url: session.url });
});
export const config = { path: "/api/club/stripe-checkout" };
