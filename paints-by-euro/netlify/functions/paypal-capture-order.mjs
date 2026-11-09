// POST /api/paypal/capture-order  { orderID }
// Captures an approved PayPal order if the hold is still valid and the
// address is in the chosen region. The sale itself is confirmed by the webhook.
import { findItem, findRegion, countriesFor } from "./_lib/catalog.mjs";
import { getRecord } from "./_lib/status.mjs";
import { paypal, unpackCustom } from "./_lib/paypal.mjs";
import { handler, json, readJson, HttpError } from "./_lib/http.mjs";

export default handler("POST", async (req) => {
  const { orderID } = await readJson(req);
  if (!/^[A-Z0-9]{5,40}$/.test(orderID || "")) throw new HttpError(400, "Invalid request.");
  const order = await paypal(`/v2/checkout/orders/${orderID}`);
  const pu = order.purchase_units?.[0] || {};
  const c = unpackCustom(pu.custom_id);
  const item = findItem(c.kind, c.slug);

  if (c.kind === "work") {
    const rec = (await getRecord(item.key))?.data;
    if (!(rec?.state === "reserved" && rec.rid === c.rid && rec.until > Date.now())) {
      throw new HttpError(409, "Your 30-minute hold on this work has ended, so no money was taken. Please start checkout again.");
    }
  }
  const country = pu.shipping?.address?.country_code;
  const region = findRegion(c.region);
  if (country && !countriesFor(region).includes(country)) {
    throw new HttpError(422, `Your PayPal address is outside “${region.label}”. No money was taken. Please choose the right shipping region and try again.`);
  }

  const result = await paypal(`/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `capture-${orderID}` },
  });
  return json({ status: result.status });
});

export const config = { path: "/api/paypal/capture-order" };
