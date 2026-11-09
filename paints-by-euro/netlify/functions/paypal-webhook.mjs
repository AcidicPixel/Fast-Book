// POST /api/paypal/webhook — the only place a PayPal payment is trusted.
import { verifyPayPalWebhook, paypal, unpackCustom, paypalAddress } from "./_lib/paypal.mjs";
import { completeSale, cancelHold } from "./_lib/sales.mjs";
import { handler, json } from "./_lib/http.mjs";

export default handler("POST", async (req) => {
  const raw = await req.text();
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "Bad request" }, 400); }
  if (!(await verifyPayPalWebhook(req.headers, event))) return json({ error: "Invalid signature" }, 400);

  const cap = event.resource || {};
  const c = unpackCustom(cap.custom_id);
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && cap.status === "COMPLETED") {
    const orderId = cap.supplementary_data?.related_ids?.order_id;
    const order = orderId ? await paypal(`/v2/checkout/orders/${orderId}`) : {};
    const payer = order.payer || {};
    await completeSale({
      kind: c.kind, slug: c.slug, rid: c.rid, provider: "paypal", ref: cap.id,
      buyer: { name: [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" "), email: payer.email_address },
      address: paypalAddress(order.purchase_units?.[0]?.shipping),
      total: Number(cap.amount?.value),
    });
  } else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
    await cancelHold(c);
  }
  return json({ received: true });
});

export const config = { path: "/api/paypal/webhook" };
