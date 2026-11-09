// POST /api/stripe/webhook — the only place a Stripe payment is trusted.
import { verifyStripeSignature } from "./_lib/stripe.mjs";
import { completeSale, cancelHold } from "./_lib/sales.mjs";
import { handler, json } from "./_lib/http.mjs";
import { fromMinor } from "./_lib/catalog.mjs";

export default handler("POST", async (req) => {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: "Invalid signature" }, 400);
  }
  const event = JSON.parse(payload);
  const s = event.data?.object || {};
  const m = s.metadata || {};

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (s.payment_status !== "paid") break; // delayed methods confirm later
      const ship = s.collected_information?.shipping_details || s.shipping_details || {};
      await completeSale({
        kind: m.kind, slug: m.slug, rid: m.rid, provider: "stripe", ref: s.id,
        buyer: { name: s.customer_details?.name, email: s.customer_details?.email },
        address: { name: ship.name, ...(ship.address || {}) },
        total: fromMinor(s.amount_total, s.currency || "gbp"),
      });
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await cancelHold({ kind: m.kind, slug: m.slug, rid: m.rid });
      break;
  }
  return json({ received: true });
});

export const config = { path: "/api/stripe/webhook" };
