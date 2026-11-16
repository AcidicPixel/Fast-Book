// POST /api/club/paypal-subscription  { plan } — creates a PayPal subscription.
// PayPal collects the shipping address. Monthly plans start on the billing date.
import { handler, json, readJson, siteUrl, HttpError } from "./_lib/http.mjs";
import { paypal } from "./_lib/paypal.mjs";
import { paypalEnv } from "./_lib/guard.mjs";
import { planFor, nextBillingDate } from "./_lib/club.mjs";

export default handler("POST", async (req) => {
  const { plan: planId } = await readJson(req);
  paypalEnv();
  const plan = planFor(planId);
  const planIdPayPal = process.env[plan.paypalVar];
  if (!planIdPayPal) throw new HttpError(503, "This plan is not set up in PayPal yet.");
  const body = {
    plan_id: planIdPayPal,
    custom_id: plan.id,
    application_context: {
      brand_name: "Paints by Euro",
      shipping_preference: "GET_FROM_FILE",
      user_action: "SUBSCRIBE_NOW",
      return_url: `${siteUrl()}/print-club/welcome/?provider=paypal`,
      cancel_url: `${siteUrl()}/print-club/#join`,
    },
  };
  if (!plan.months) body.start_time = nextBillingDate().toISOString();
  const sub = await paypal("/v1/billing/subscriptions", { method: "POST", body });
  return json({ id: sub.id });
});
export const config = { path: "/api/club/paypal-subscription" };
