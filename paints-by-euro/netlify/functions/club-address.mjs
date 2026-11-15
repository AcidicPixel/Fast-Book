// POST /api/club/address  { t, id, address } — PayPal members change their delivery address.
// (Stripe members do this in the Stripe Customer Portal.)
import { handler, json, readJson, HttpError } from "./_lib/http.mjs";
import { paypal } from "./_lib/paypal.mjs";
import { memberForToken, updateMember, memberKey, clubCountries } from "./_lib/club.mjs";

export default handler("POST", async (req) => {
  const { t, id, address: a = {} } = await readJson(req);
  const m = await memberForToken(t, id);
  if (m.provider !== "paypal") throw new HttpError(400, "Card members change their address in the Stripe portal.");
  const clean = Object.fromEntries(["name", "line1", "line2", "city", "postal_code", "country"].map((k) => [k, String(a[k] || "").trim().slice(0, 120)]));
  clean.country = clean.country.toUpperCase();
  if (!clean.name || !clean.line1 || !clean.city || !clean.postal_code) throw new HttpError(400, "Please fill in your name, address, town and postcode.");
  if (!clubCountries().includes(clean.country)) throw new HttpError(400, `The Print Club ships to: ${clubCountries().join(", ")}.`);
  await paypal(`/v1/billing/subscriptions/${m.subId}`, {
    method: "PATCH",
    body: [{ op: "replace", path: "/subscriber/shipping_address", value: {
      name: { full_name: clean.name },
      address: { address_line_1: clean.line1, address_line_2: clean.line2, admin_area_2: clean.city, postal_code: clean.postal_code, country_code: clean.country },
    } }],
  });
  await updateMember(memberKey("paypal", m.subId), (cur) => cur && { ...cur, address: clean });
  return json({ saved: true });
});
export const config = { path: "/api/club/address" };
