// POST /api/stripe/create-session  { kind, slug, region }
// Reserves the work for 30 minutes and returns the Stripe Checkout URL.
import { buildOrder, toMinor } from "./_lib/catalog.mjs";
import { reserve, attachRef, release } from "./_lib/status.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { stripeKey } from "./_lib/guard.mjs";
import { handler, json, readJson, siteUrl, HttpError } from "./_lib/http.mjs";

export default handler("POST", async (req) => {
  const { kind, slug, region } = await readJson(req);
  stripeKey(); // fail early if Stripe is not set up
  const o = buildOrder(kind, slug, region);

  let hold = { rid: null, until: Date.now() + 31 * 60 * 1000 };
  if (kind === "work") {
    hold = await reserve(o.item, "stripe");
    if (!hold.ok) throw new HttpError(409, "Sorry, someone else is buying this work right now, or it has just sold.");
  }

  const meta = { kind, slug, rid: hold.rid || "", region: o.region.id };
  const back = new URLSearchParams({ kind, slug, rid: hold.rid || "" });
  try {
    const session = await stripe("/checkout/sessions", {
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: o.currency.toLowerCase(),
          unit_amount: toMinor(o.price, o.currency),
          product_data: {
            name: kind === "print" ? `${o.item.title} (print)` : o.item.title,
            description: kind === "print" ? `${o.item.size}, ${o.item.edition}` : `${o.item.materials}, ${o.item.size}, ${o.item.year}. Original.`,
          },
        },
      }],
      shipping_address_collection: { allowed_countries: o.countries },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: `Shipping: ${o.region.label}`,
          fixed_amount: { amount: toMinor(o.shipping, o.currency), currency: o.currency.toLowerCase() },
        },
      }],
      expires_at: Math.floor(hold.until / 1000),
      metadata: meta,
      payment_intent_data: { metadata: meta, description: o.item.title },
      success_url: `${siteUrl()}/thank-you/?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/checkout/cancelled/?${back}`,
    }, { idempotencyKey: hold.rid ? `session-${hold.rid}` : undefined });

    if (hold.rid) await attachRef(o.item, hold.rid, session.id);
    return json({ url: session.url, rid: hold.rid });
  } catch (err) {
    if (hold.rid) await release(o.item.key, hold.rid);
    throw err;
  }
});

export const config = { path: "/api/stripe/create-session" };
