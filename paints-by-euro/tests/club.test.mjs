// Print Club subscription tests: test keys only, with mock Stripe / PayPal / email servers.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

class MemoryStore {
  map = new Map(); n = 0;
  async getWithMetadata(key) { const v = this.map.get(key); return v ? { data: structuredClone(v.data), etag: v.etag } : null; }
  async get(key) { const v = this.map.get(key); return v ? structuredClone(v.data) : null; }
  async setJSON(key, data, o = {}) {
    const cur = this.map.get(key);
    if (o.onlyIfNew && cur) return { modified: false };
    if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
    const etag = `"e${++this.n}"`; this.map.set(key, { data: structuredClone(data), etag }); return { modified: true, etag };
  }
  async delete(key) { this.map.delete(key); }
  async list({ prefix = "" } = {}) { return { blobs: [...this.map.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
}

/* ---------- mock external APIs ---------- */
const calls = [], emails = [];
const now = Date.now();
const periodEnd = Math.floor(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1, 9) / 1000);
const ppSubs = new Map();
globalThis.fetch = async (url, init = {}) => {
  url = String(url); calls.push({ url, init });
  const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
  const form = () => Object.fromEntries(new URLSearchParams(init.body || ""));
  if (url.startsWith("https://api.stripe.com/v1/prices?")) {
    return ok({ data: url.includes("print_club_monthly") ? [{ id: "price_test_monthly", lookup_key: "print_club_monthly" }] : [] });
  }
  if (url === "https://api.stripe.com/v1/checkout/sessions") return ok({ id: "cs_test_club", url: "https://checkout.stripe.com/c/pay/cs_test_club", params: form() });
  if (url.startsWith("https://api.stripe.com/v1/checkout/sessions?subscription=")) return ok({ data: [] });
  if (/\/v1\/subscriptions\/sub_/.test(url) && (init.method || "GET") === "GET") return ok({ id: "sub_test_1", current_period_end: periodEnd });
  if (/\/v1\/subscriptions\/sub_/.test(url)) return ok({ id: "sub_test_1", ...form() });
  if (/\/v1\/customers\/cus_/.test(url)) return ok({ id: "cus_test_1" });
  if (url === "https://api.stripe.com/v1/billing_portal/sessions") return ok({ url: "https://billing.stripe.com/p/session/test_123" });
  if (url.endsWith("/v1/oauth2/token")) return ok({ access_token: "A21_test" });
  if (url.endsWith("/v1/billing/subscriptions") && init.method === "POST") {
    const body = JSON.parse(init.body); const id = "I-TEST" + (ppSubs.size + 1);
    ppSubs.set(id, body); return ok({ id, status: "APPROVAL_PENDING" });
  }
  let m = url.match(/\/v1\/billing\/subscriptions\/(I-[A-Z0-9]+)(\/(suspend|activate))?$/);
  if (m) {
    if (m[3]) return new Response(null, { status: 204 });
    if (init.method === "PATCH") return new Response(null, { status: 204 });
    return ok({ id: m[1], custom_id: "monthly", start_time: new Date(periodEnd * 1000).toISOString(),
      billing_info: { next_billing_time: new Date(periodEnd * 1000).toISOString() },
      subscriber: { email_address: "pp@example.com", name: { given_name: "Pat", surname: "Pal" },
        shipping_address: { name: { full_name: "Pat Pal" }, address: { address_line_1: "2 Test Road", admin_area_2: "Leeds", postal_code: "LS1 1AA", country_code: "GB" } } } });
  }
  if (url.endsWith("/v1/notifications/verify-webhook-signature")) return ok({ verification_status: JSON.parse(init.body).transmission_sig === "good" ? "SUCCESS" : "FAILURE" });
  if (url === "https://api.resend.com/emails") { emails.push(JSON.parse(init.body)); return ok({ id: "e" }); }
  throw new Error("Unexpected fetch " + url);
};

Object.assign(process.env, {
  URL: "https://paints-by-euro.example",
  STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  PAYPAL_CLIENT_ID: "test-client", PAYPAL_CLIENT_SECRET: "test-secret", PAYPAL_ENV: "sandbox", PAYPAL_WEBHOOK_ID: "WH-TEST",
  PAYPAL_PLAN_MONTHLY: "P-TESTMONTHLY",
  RESEND_API_KEY: "re_test", ARTIST_EMAIL: "artist@example.com",
  CLUB_LINK_SECRET: "a-long-test-secret-for-links", CLUB_ADMIN_PASSWORD: "correct-horse-battery",
});
delete process.env.ALLOW_LIVE_PAYMENTS;
globalThis.__TEST_STORE__ = new MemoryStore();
globalThis.__TEST_CLUB_STORE__ = new MemoryStore();

const fn = {};
let club;
before(async () => {
  for (const n of ["club-config", "club-stripe-checkout", "club-paypal-subscription", "club-manage-link", "club-me", "club-portal", "club-skip", "club-address", "club-members", "club-resume", "stripe-webhook", "paypal-webhook"]) {
    fn[n] = (await import(`../netlify/functions/${n}.mjs`)).default;
  }
  club = await import("../netlify/functions/_lib/club.mjs");
});
const post = (n, body, headers = {}) => fn[n](new Request(`https://x/api/${n}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
const get = (n, qs = "", headers = {}) => fn[n](new Request(`https://x/api/${n}${qs}`, { headers }));
const stripeEvent = (type, object) => {
  const payload = JSON.stringify({ type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  return post("stripe-webhook", payload, { "stripe-signature": `t=${t},v1=${createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex")}` });
};
const month = (ms) => new Date(ms).toISOString().slice(0, 7);
const thisMonth = month(now), nextMonth = month(periodEnd * 1000);
const stripeKey = "member:stripe:sub_test_1";

test("config: monthly plan on, gift plans hidden, no secrets", async () => {
  const c = await (await get("club-config")).json();
  assert.equal(c.stripe, true);
  assert.equal(c.paypalClientId, "test-client");
  assert.equal(c.gifts, false);
  assert.equal(c.testMode, true);
});

test("Stripe Billing: subscription checkout, address collected, charged on the billing date", async () => {
  const res = await post("club-stripe-checkout", { plan: "monthly" });
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/checkout\.stripe\.com\//);
  const p = new URLSearchParams(calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").at(-1).init.body);
  assert.equal(p.get("mode"), "subscription");
  assert.equal(p.get("line_items[0][price]"), "price_test_monthly", "price comes from Stripe (lookup key), not from code");
  assert.equal(p.get("shipping_address_collection[allowed_countries][0]"), "GB");
  const anchor = new Date(Number(p.get("subscription_data[billing_cycle_anchor]")) * 1000);
  assert.equal(anchor.getUTCDate(), 1, "billing day from Settings");
  assert.ok(anchor.getTime() - Date.now() > 23 * 3600 * 1000);
  assert.equal(p.get("subscription_data[proration_behavior]"), "none");
});

test("gift plans are refused while hidden", async () => {
  assert.equal((await post("club-stripe-checkout", { plan: "gift3" })).status, 404);
  assert.equal((await post("club-paypal-subscription", { plan: "gift12" })).status, 404);
});

test("Stripe webhook: sign-up records the member; each paid invoice emails member and artist once", async () => {
  await stripeEvent("checkout.session.completed", {
    mode: "subscription", subscription: "sub_test_1", customer: "cus_test_1",
    metadata: { kind: "club", plan: "monthly", firstMonth: thisMonth },
    customer_details: { email: "Member@Example.com", name: "Mo Member" },
    collected_information: { shipping_details: { name: "Mo Member", address: { line1: "1 Club Lane", city: "York", postal_code: "YO1 1AA", country: "GB" } } },
  });
  let m = await club.getMember(stripeKey);
  assert.equal(m.status, "pending");
  assert.equal(m.address.city, "York");
  assert.ok(calls.some((c) => c.url.includes("/v1/customers/cus_test_1")), "address copied to the Stripe customer for the portal");
  const before = emails.length;
  const invoice = { id: "in_test_1", subscription: "sub_test_1", customer: "cus_test_1", amount_paid: 2500, currency: "gbp", status_transitions: { paid_at: Math.floor(now / 1000) }, subscription_details: { metadata: { kind: "club", plan: "monthly" } } };
  assert.equal((await stripeEvent("invoice.paid", invoice)).status, 200);
  m = await club.getMember(stripeKey);
  assert.equal(m.status, "active");
  const sent = emails.slice(before);
  assert.deepEqual(sent.map((e) => e.to[0]).sort(), ["Member@Example.com", "artist@example.com"]);
  assert.ok(sent[0].text.includes("£25.00"));
  await stripeEvent("invoice.paid", invoice); // Stripe retry
  assert.equal(emails.length, before + 2);
});

test("artist list: password required; JSON and CSV with addresses", async () => {
  assert.equal((await get("club-members", `?month=${thisMonth}`, { authorization: "Bearer wrong" })).status, 401);
  const auth = { authorization: "Bearer correct-horse-battery" };
  const j = await (await get("club-members", `?month=${thisMonth}`, auth)).json();
  assert.equal(j.members.length, 1);
  assert.equal(j.members[0].line1, "1 Club Lane");
  const csv = await (await get("club-members", `?month=${thisMonth}&format=csv`, auth)).text();
  assert.match(csv, /^name,email,line1,line2,city,postal_code,state,country,plan,provider\n/);
  assert.match(csv, /Mo Member,Member@Example.com,1 Club Lane,,York,YO1 1AA,,GB,Monthly,Stripe/);
  assert.equal(club.toCsv([{ name: "=HYPERLINK(1)" }]).split("\n")[1].startsWith("'=HYPERLINK"), true, "no spreadsheet formulas");
});

let token;
test("self-service link: only members get one; it signs them in for an hour", async () => {
  const before = emails.length;
  assert.equal((await post("club-manage-link", { email: "stranger@example.com" })).status, 200);
  assert.equal(emails.length, before, "no email (and the same answer) for non-members");
  assert.equal((await post("club-manage-link", { email: "member@example.com" })).status, 200);
  const mail = emails.at(-1);
  token = mail.text.match(/\?t=([\w.-]+)/)[1];
  const me = await (await get("club-me", `?t=${token}`)).json();
  assert.equal(me.members.length, 1);
  assert.equal(me.members[0].canSkip, true);
  assert.equal((await get("club-me", `?t=${token}x`)).status, 401, "tampered link refused");
  assert.throws(() => club.readToken(club.makeToken("a@b.c", -1)), /expired/);
});

test("Stripe member: Customer Portal for address, card and cancelling", async () => {
  const r = await post("club-portal", { t: token, id: stripeKey });
  assert.equal(r.status, 200);
  assert.match((await r.json()).url, /billing\.stripe\.com/);
  const other = club.makeToken("someone@else.com");
  assert.equal((await post("club-portal", { t: other, id: stripeKey })).status, 404, "can't open someone else's portal");
});

test("skip one month (Stripe): next invoice voided, member left off that month's list", async () => {
  assert.equal((await post("club-skip", { t: token, id: stripeKey })).status, 200);
  const p = new URLSearchParams(calls.filter((c) => /\/v1\/subscriptions\/sub_test_1$/.test(c.url) && c.init.method === "POST").at(-1).init.body);
  assert.equal(p.get("pause_collection[behavior]"), "void");
  assert.equal(Number(p.get("pause_collection[resumes_at]")), periodEnd + 86400);
  const m = await club.getMember(stripeKey);
  assert.equal(m.status, "skipping");
  assert.deepEqual(m.skips, [nextMonth]);
  assert.equal(club.inMonth(m, nextMonth), false);
  assert.equal(club.inMonth(m, club.addMonths(nextMonth, 1)), true);
  assert.equal((await post("club-skip", { t: token, id: stripeKey })).status, 409, "one skip at a time");
});

test("PayPal Subscriptions: plan, billing date, address collected; payment confirmed by webhook", async () => {
  const r = await post("club-paypal-subscription", { plan: "monthly" });
  const { id } = await r.json();
  const body = ppSubs.get(id);
  assert.equal(body.plan_id, "P-TESTMONTHLY");
  assert.equal(body.application_context.shipping_preference, "GET_FROM_FILE");
  assert.equal(new Date(body.start_time).getUTCDate(), 1);
  const ev = (event_type, resource, sig = "good") => post("paypal-webhook", { event_type, resource }, { "paypal-transmission-sig": sig });
  assert.equal((await ev("BILLING.SUBSCRIPTION.ACTIVATED", { id: "I-TEST1" }, "forged")).status, 400);
  await ev("BILLING.SUBSCRIPTION.ACTIVATED", { id: "I-TEST1", custom_id: "monthly", start_time: new Date(periodEnd * 1000).toISOString(),
    subscriber: { email_address: "pp@example.com", name: { given_name: "Pat", surname: "Pal" }, shipping_address: { name: { full_name: "Pat Pal" }, address: { address_line_1: "2 Test Road", admin_area_2: "Leeds", postal_code: "LS1 1AA", country_code: "GB" } } } });
  assert.equal((await club.getMember("member:paypal:I-TEST1")).status, "pending");
  const before = emails.length;
  await ev("PAYMENT.SALE.COMPLETED", { id: "SALE-1", billing_agreement_id: "I-TEST1", amount: { total: "25.00", currency: "GBP" }, create_time: new Date(periodEnd * 1000).toISOString() });
  const m = await club.getMember("member:paypal:I-TEST1");
  assert.equal(m.status, "active");
  assert.equal(m.address.city, "Leeds");
  assert.equal(emails.length, before + 2);
  await ev("PAYMENT.SALE.COMPLETED", { id: "SALE-1", billing_agreement_id: "I-TEST1", amount: { total: "25.00", currency: "GBP" } });
  assert.equal(emails.length, before + 2, "no repeat emails");
});

test("PayPal member: change address, skip (suspend) and automatic resume, cancel", async () => {
  const t = club.makeToken("pp@example.com");
  const id = "member:paypal:I-TEST1";
  assert.equal((await post("club-address", { t, id, address: { name: "Pat Pal", line1: "3 New St", city: "Hull", postal_code: "HU1 1AA", country: "gb" } })).status, 200);
  assert.ok(calls.some((c) => c.url.endsWith("/v1/billing/subscriptions/I-TEST1") && c.init.method === "PATCH"));
  assert.equal((await club.getMember(id)).address.city, "Hull");
  assert.equal((await post("club-address", { t, id, address: { name: "X", line1: "1", city: "Paris", postal_code: "75001", country: "FR" } })).status, 400, "only shipping countries");
  assert.equal((await post("club-skip", { t, id })).status, 200);
  assert.ok(calls.some((c) => c.url.endsWith("/I-TEST1/suspend")));
  // pretend the skipped date has passed, then run the daily job
  await club.updateMember(id, (m) => ({ ...m, resumeAt: Date.now() - 1000 }));
  await fn["club-resume"]();
  assert.ok(calls.some((c) => c.url.endsWith("/I-TEST1/activate")));
  assert.equal((await club.getMember(id)).status, "active");
  await post("paypal-webhook", { event_type: "BILLING.SUBSCRIPTION.CANCELLED", resource: { id: "I-TEST1" } }, { "paypal-transmission-sig": "good" });
  const m = await club.getMember(id);
  assert.equal(m.status, "cancelled");
  assert.equal(club.inMonth(m, club.addMonths(m.endMonth, 1)), false, "no bundles after the last paid month");
});

test("Stripe cancellation ends the membership after the last paid month", async () => {
  await stripeEvent("customer.subscription.deleted", { id: "sub_test_1" });
  const m = await club.getMember(stripeKey);
  assert.equal(m.status, "cancelled");
  assert.equal(m.endMonth, thisMonth);
});

test("live keys are refused unless the artist switches them on", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_dummy";
  assert.equal((await post("club-stripe-checkout", { plan: "monthly" })).status, 503);
  process.env.PAYPAL_ENV = "live";
  assert.equal((await post("club-paypal-subscription", { plan: "monthly" })).status, 503);
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; process.env.PAYPAL_ENV = "sandbox";
});
