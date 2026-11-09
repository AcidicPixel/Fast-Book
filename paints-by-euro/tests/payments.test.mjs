// End-to-end tests of the checkout and webhook functions, using test keys and
// mock Stripe / PayPal / email servers. Run with: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

/* ---------- In-memory stand-in for Netlify Blobs (same conditional-write rules) ---------- */
class MemoryStore {
  map = new Map();
  n = 0;
  async getWithMetadata(key) {
    const v = this.map.get(key);
    return v ? { data: structuredClone(v.data), etag: v.etag, metadata: {} } : null;
  }
  async setJSON(key, data, opts = {}) {
    const cur = this.map.get(key);
    if (opts.onlyIfNew && cur) return { modified: false };
    if (opts.onlyIfMatch && (!cur || cur.etag !== opts.onlyIfMatch)) return { modified: false };
    const etag = `"e${++this.n}"`;
    this.map.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
  async delete(key) { this.map.delete(key); }
}

/* ---------- Mock external APIs ---------- */
const calls = [];
const emails = [];
let paypalShipCountry = "FR";
const paypalOrders = new Map();

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const body = init.body;
  calls.push({ url, init });
  const ok = (data) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });

  if (url === "https://api.stripe.com/v1/checkout/sessions") {
    const p = new URLSearchParams(body);
    return ok({ id: `cs_test_${calls.length}`, url: `https://checkout.stripe.com/c/pay/cs_test_${calls.length}`, params: Object.fromEntries(p) });
  }
  if (/api\.stripe\.com\/v1\/checkout\/sessions\/.+\/expire/.test(url)) return ok({ status: "expired" });
  if (url.endsWith("/v1/oauth2/token")) return ok({ access_token: "A21_test" });
  if (url.endsWith("/v2/checkout/orders") && init.method === "POST") {
    const o = JSON.parse(body);
    const id = `5O${String(paypalOrders.size + 1).padStart(15, "0")}`;
    paypalOrders.set(id, o);
    return ok({ id, status: "CREATED" });
  }
  let m = url.match(/\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/);
  if (m) return ok({ id: m[1], status: "COMPLETED" });
  m = url.match(/\/v2\/checkout\/orders\/([A-Z0-9]+)$/);
  if (m) {
    const o = paypalOrders.get(m[1]);
    return ok({
      id: m[1],
      payer: { email_address: "buyer@example.com", name: { given_name: "Sam", surname: "Buyer" } },
      purchase_units: [{ ...o.purchase_units[0], shipping: { name: { full_name: "Sam Buyer" }, address: { address_line_1: "1 Rue Test", admin_area_2: "Paris", postal_code: "75001", country_code: paypalShipCountry } } }],
    });
  }
  if (url.endsWith("/v1/notifications/verify-webhook-signature")) {
    const b = JSON.parse(body);
    return ok({ verification_status: b.transmission_sig === "good" ? "SUCCESS" : "FAILURE" });
  }
  if (url === "https://api.resend.com/emails") {
    emails.push(JSON.parse(body));
    return ok({ id: "email_1" });
  }
  throw new Error(`Unexpected fetch ${url}`);
};

/* ---------- Environment: test keys only ---------- */
Object.assign(process.env, {
  URL: "https://paints-by-euro.example",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  PAYPAL_CLIENT_ID: "test-client",
  PAYPAL_CLIENT_SECRET: "test-secret",
  PAYPAL_ENV: "sandbox",
  PAYPAL_WEBHOOK_ID: "WH-TEST",
  RESEND_API_KEY: "re_test",
  ARTIST_EMAIL: "artist@example.com",
});
delete process.env.ALLOW_LIVE_PAYMENTS;
globalThis.__TEST_STORE__ = new MemoryStore();

let fn = {};
const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;

before(async () => {
  const names = ["status", "config", "stripe-create-session", "stripe-webhook", "paypal-create-order", "paypal-capture-order", "paypal-webhook", "release"];
  for (const n of names) fn[n] = (await import(`../netlify/functions/${n}.mjs`)).default;
});

const post = (name, body, headers = {}) =>
  fn[name](new Request(`https://x/api/${name}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
const statuses = async () => (await (await fn.status(new Request("https://x/api/status"))).json()).statuses;
const stripeSign = (payload, secret = process.env.STRIPE_WEBHOOK_SECRET) => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
};
const lastStripeParams = () => new URLSearchParams(calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").at(-1).init.body);

/* ---------- Tests ---------- */
test("status starts from the content files", async () => {
  const s = await statuses();
  assert.equal(s["oil-01"], "Available");
  assert.equal(s["oil-03"], "Reserved");
  assert.equal(s["oil-04"], "Sold");
  assert.equal(s["oil-05"], "Not for sale");
});

test("config reports test mode and exposes no secrets", async () => {
  const c = await (await fn.config(new Request("https://x/api/config"))).json();
  assert.equal(c.testMode, true);
  assert.equal(c.paypalClientId, "test-client");
  assert.ok(!JSON.stringify(c).includes("sk_test") && !JSON.stringify(c).includes("test-secret"));
});

let stripeHold;
test("Stripe: checkout adds shipping, collects address, holds the work", async () => {
  const res = await post("stripe-create-session", { kind: "work", slug: "oil-01", region: "home", price: 1 });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.match(j.url, /^https:\/\/checkout\.stripe\.com\//);
  stripeHold = j.rid;
  const p = lastStripeParams();
  assert.equal(p.get("line_items[0][price_data][unit_amount]"), "120000", "price from content file, not from the browser");
  assert.equal(p.get("line_items[0][quantity]"), "1");
  assert.equal(p.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "2500");
  assert.equal(p.get("shipping_address_collection[allowed_countries][0]"), "GB");
  const mins = (Number(p.get("expires_at")) * 1000 - Date.now()) / 60000;
  assert.ok(mins > 30 && mins <= 31.1, `session expires in ${mins} min`);
  assert.equal((await statuses())["oil-01"], "Reserved");
});

test("a held work cannot be bought by a second buyer (Stripe or PayPal)", async () => {
  assert.equal((await post("stripe-create-session", { kind: "work", slug: "oil-01", region: "home" })).status, 409);
  assert.equal((await post("paypal-create-order", { kind: "work", slug: "oil-01", region: "home" })).status, 409);
});

test("Sold, Reserved and Not-for-sale works cannot start checkout", async () => {
  for (const slug of ["oil-04", "oil-03", "oil-05"]) {
    assert.equal((await post("stripe-create-session", { kind: "work", slug, region: "home" })).status, 409, slug);
  }
});

test("two buyers clicking at the same moment: only one gets the hold", async () => {
  const [a, b] = await Promise.all([
    post("stripe-create-session", { kind: "work", slug: "pencil-04", region: "home" }),
    post("paypal-create-order", { kind: "work", slug: "pencil-04", region: "home" }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test("Stripe webhook: forged signature is rejected", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { payment_status: "paid", metadata: { kind: "work", slug: "oil-01" } } } });
  const res = await post("stripe-webhook", payload, { "stripe-signature": stripeSign(payload, "whsec_wrong") });
  assert.equal(res.status, 400);
  assert.equal((await statuses())["oil-01"], "Reserved");
});

test("Stripe webhook: confirmed payment marks Sold and emails buyer and artist once", async () => {
  const session = {
    id: "cs_test_paid", payment_status: "paid", amount_total: 122500, currency: "gbp",
    metadata: { kind: "work", slug: "oil-01", rid: stripeHold, region: "home" },
    customer_details: { name: "Alex Buyer", email: "alex@example.com" },
    collected_information: { shipping_details: { name: "Alex Buyer", address: { line1: "1 Test St", city: "London", postal_code: "N1 1AA", country: "GB" } } },
  };
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: session } });
  const before = emails.length;
  assert.equal((await post("stripe-webhook", payload, { "stripe-signature": stripeSign(payload) })).status, 200);
  assert.equal((await statuses())["oil-01"], "Sold");
  const sent = emails.slice(before);
  assert.deepEqual(sent.map((e) => e.to[0]).sort(), ["alex@example.com", "artist@example.com"]);
  assert.ok(sent.every((e) => e.text.includes("£1,225.00")));
  // Stripe retries webhooks: no second set of emails.
  await post("stripe-webhook", payload, { "stripe-signature": stripeSign(payload) });
  assert.equal(emails.length, before + 2);
});

test("hold runs out after 30 minutes and an expired session frees the work", async () => {
  const j = await (await post("stripe-create-session", { kind: "work", slug: "oil-02", region: "europe" })).json();
  assert.equal((await statuses())["oil-02"], "Reserved");
  offset = 32 * 60 * 1000;
  assert.equal((await statuses())["oil-02"], "Available");
  offset = 0;
  const payload = JSON.stringify({ type: "checkout.session.expired", data: { object: { metadata: { kind: "work", slug: "oil-02", rid: j.rid } } } });
  await post("stripe-webhook", payload, { "stripe-signature": stripeSign(payload) });
  assert.equal((await statuses())["oil-02"], "Available");
});

test("cancel: only the buyer's own hold id releases the work", async () => {
  const j = await (await post("stripe-create-session", { kind: "work", slug: "pencil-01", region: "home" })).json();
  assert.equal((await (await post("release", { kind: "work", slug: "pencil-01", rid: "wrong" })).json()).released, false);
  assert.equal((await statuses())["pencil-01"], "Reserved");
  assert.equal((await (await post("release", { kind: "work", slug: "pencil-01", rid: j.rid })).json()).released, true);
  assert.equal((await statuses())["pencil-01"], "Available");
  assert.ok(calls.some((c) => /\/expire$/.test(c.url)), "Stripe session was expired");
});

let ppOrder;
test("PayPal: order total includes shipping and asks PayPal for the address", async () => {
  const res = await post("paypal-create-order", { kind: "work", slug: "pencil-02", region: "europe" });
  assert.equal(res.status, 200);
  ppOrder = (await res.json()).id;
  const o = paypalOrders.get(ppOrder);
  const pu = o.purchase_units[0];
  assert.equal(pu.amount.value, "325.00");
  assert.equal(pu.amount.breakdown.item_total.value, "280.00");
  assert.equal(pu.amount.breakdown.shipping.value, "45.00");
  assert.equal(o.payment_source.paypal.experience_context.shipping_preference, "GET_FROM_FILE");
  assert.equal((await statuses())["pencil-02"], "Reserved");
});

test("PayPal: address outside the chosen region is refused before capture", async () => {
  paypalShipCountry = "US";
  assert.equal((await post("paypal-capture-order", { orderID: ppOrder })).status, 422);
  paypalShipCountry = "FR";
});

test("PayPal: capture does not mark Sold; the verified webhook does", async () => {
  assert.equal((await post("paypal-capture-order", { orderID: ppOrder })).status, 200);
  assert.equal((await statuses())["pencil-02"], "Reserved", "return page alone is not trusted");
  const event = {
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: "CAP123", status: "COMPLETED", custom_id: paypalOrders.get(ppOrder).purchase_units[0].custom_id,
      amount: { value: "325.00", currency_code: "GBP" }, supplementary_data: { related_ids: { order_id: ppOrder } } },
  };
  assert.equal((await post("paypal-webhook", event, { "paypal-transmission-sig": "forged" })).status, 400);
  assert.equal((await statuses())["pencil-02"], "Reserved");
  const before = emails.length;
  assert.equal((await post("paypal-webhook", event, { "paypal-transmission-sig": "good" })).status, 200);
  assert.equal((await statuses())["pencil-02"], "Sold");
  assert.equal(emails.length, before + 2);
  assert.ok(emails.at(-2).text.includes("Paris") || emails.at(-1).text.includes("Paris"));
});

test("PayPal: capture after the hold has run out is refused (no money taken)", async () => {
  const id = (await (await post("paypal-create-order", { kind: "work", slug: "pencil-04", region: "home" })).json()).id
    ?? null;
  // pencil-04 may still be held by the race test; use a fresh work instead if so.
  const orderId = id || (await (await post("paypal-create-order", { kind: "work", slug: "oil-02", region: "home" })).json()).id;
  offset = 32 * 60 * 1000;
  paypalShipCountry = "GB";
  const res = await post("paypal-capture-order", { orderID: orderId });
  offset = 0;
  assert.equal(res.status, 409);
});

test("live keys are refused unless the artist switches them on", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_dummy";
  const res = await post("stripe-create-session", { kind: "work", slug: "pencil-01", region: "home" });
  assert.equal(res.status, 503);
  process.env.PAYPAL_ENV = "live";
  assert.equal((await post("paypal-create-order", { kind: "work", slug: "pencil-01", region: "home" })).status, 503);
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.PAYPAL_ENV = "sandbox";
});
