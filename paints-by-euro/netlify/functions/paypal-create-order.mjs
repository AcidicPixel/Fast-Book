// POST /api/paypal/create-order  { kind, slug, region }
// Reserves the work for 30 minutes and creates a PayPal order. PayPal
// collects the shipping address.
import { buildOrder, toDecimalString } from "./_lib/catalog.mjs";
import { reserve, attachRef, release } from "./_lib/status.mjs";
import { paypal, packCustom } from "./_lib/paypal.mjs";
import { paypalEnv } from "./_lib/guard.mjs";
import { handler, json, readJson, HttpError } from "./_lib/http.mjs";

export default handler("POST", async (req) => {
  const { kind, slug, region } = await readJson(req);
  paypalEnv();
  const o = buildOrder(kind, slug, region);

  let hold = { rid: null };
  if (kind === "work") {
    hold = await reserve(o.item, "paypal");
    if (!hold.ok) throw new HttpError(409, "Sorry, someone else is buying this work right now, or it has just sold.");
  }
  const amt = (n) => ({ currency_code: o.currency, value: toDecimalString(n, o.currency) });
  try {
    const order = await paypal("/v2/checkout/orders", {
      method: "POST",
      headers: hold.rid ? { "PayPal-Request-Id": `order-${hold.rid}` } : {},
      body: {
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: slug,
          custom_id: packCustom({ kind, slug, rid: hold.rid, region: o.region.id }),
          description: o.item.title.slice(0, 127),
          amount: { ...amt(o.total), breakdown: { item_total: amt(o.price), shipping: amt(o.shipping) } },
          items: [{
            name: (kind === "print" ? `${o.item.title} (print)` : o.item.title).slice(0, 127),
            quantity: "1", unit_amount: amt(o.price), category: "PHYSICAL_GOODS",
          }],
        }],
        payment_source: {
          paypal: {
            experience_context: { shipping_preference: "GET_FROM_FILE", user_action: "PAY_NOW", brand_name: "Paints by Euro" },
          },
        },
      },
    });
    if (hold.rid) await attachRef(o.item, hold.rid, order.id);
    return json({ id: order.id, rid: hold.rid });
  } catch (err) {
    if (hold.rid) await release(o.item.key, hold.rid);
    throw err;
  }
});

export const config = { path: "/api/paypal/create-order" };
