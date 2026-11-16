// Print Club: plans, member records, the monthly list, sign-in links and emails.
//
// Prices live in Stripe and PayPal, not in this code:
// - Stripe: each plan's Price is found by its lookup key (e.g. "print_club_monthly").
//   To change the price, create a new Price in the Stripe Dashboard and move the
//   lookup key to it. New members get the new price; current members keep theirs.
// - PayPal: each plan's ID comes from an environment variable. To change the price,
//   create a new plan in PayPal and put its ID in the variable. Current members
//   stay on their old plan.
import { createHmac, timingSafeEqual } from "node:crypto";
import { d1Store } from "./store.mjs";
import { catalog, money } from "./catalog.mjs";
import { HttpError, siteUrl } from "./http.mjs";
import { sendEmail } from "./email.mjs";

export const PLANS = {
  monthly: { label: "Monthly", lookup: "print_club_monthly", paypalVar: "PAYPAL_PLAN_MONTHLY", months: null },
  gift3: { label: "Gift, 3 months", lookup: "print_club_gift_3", paypalVar: "PAYPAL_PLAN_GIFT_3", months: 3 },
  gift12: { label: "Gift, 12 months", lookup: "print_club_gift_12", paypalVar: "PAYPAL_PLAN_GIFT_12", months: 12 },
};

export function planFor(id) {
  const plan = PLANS[id];
  if (!plan) throw new HttpError(400, "Please choose a plan.");
  if (plan.months && !catalog().printClub?.giftsEnabled) throw new HttpError(404, "Gift plans are not available yet.");
  return { id, ...plan };
}

export const clubCountries = () => catalog().printClub?.countries?.length ? catalog().printClub.countries : ["GB"];

/** The next billing date: the configured day of the month, at 09:00 UTC, at least a day away. */
export function nextBillingDate(now = new Date()) {
  const day = Math.min(28, Math.max(1, Number(catalog().printClub?.billingDay) || 1));
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 9));
  if (d.getTime() - now.getTime() < 24 * 3600 * 1000) d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day, 9));
  return d;
}

export const monthOf = (date) => new Date(date).toISOString().slice(0, 7);
export const addMonths = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

/* ---------------------------------------------------------------- storage */
export function clubStore() {
  if (globalThis.__TEST_CLUB_STORE__) return globalThis.__TEST_CLUB_STORE__;
  return d1Store("print-club");
}
export const memberKey = (provider, subId) => `member:${provider}:${subId}`;
const emailKey = (email) => `email:${String(email || "").trim().toLowerCase()}`;

export async function getMember(key) {
  const r = await clubStore().getWithMetadata(key, { type: "json" });
  return r ? r.data : null;
}

/** Read-modify-write with a conditional write, so two webhooks can't overwrite each other. */
export async function updateMember(key, change) {
  const s = clubStore();
  for (let i = 0; i < 5; i++) {
    const cur = await s.getWithMetadata(key, { type: "json" });
    const next = change(cur ? { ...cur.data } : null);
    if (!next) return cur?.data || null;
    const res = await s.setJSON(key, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (!res || res.modified !== false) {
      if (next.email && next.email !== cur?.data?.email) await indexEmail(next.email, key);
      return next;
    }
  }
  throw new Error(`Could not update ${key}`);
}

async function indexEmail(email, key) {
  const s = clubStore(), k = emailKey(email);
  for (let i = 0; i < 5; i++) {
    const cur = await s.getWithMetadata(k, { type: "json" });
    const list = cur ? cur.data : [];
    if (list.includes(key)) return;
    const res = await s.setJSON(k, [...list, key], cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (!res || res.modified !== false) return;
  }
}

export async function membersForEmail(email) {
  const keys = (await clubStore().get(emailKey(email), { type: "json" })) || [];
  const out = [];
  for (const k of keys) { const m = await getMember(k); if (m) out.push(m); }
  return out;
}

export async function allMembers() {
  const { blobs } = await clubStore().list({ prefix: "member:" });
  const out = [];
  for (const b of blobs) { const m = await getMember(b.key); if (m) out.push(m); }
  return out;
}

/* ---------------------------------------------------------------- the monthly list */
/**
 * Members who get a bundle in a month: they have started, have not ended,
 * and are not skipping that month. A month counts once its payment is due.
 */
export function inMonth(m, month) {
  if (!m.firstMonth || month < m.firstMonth) return false;
  if (m.endMonth && month > m.endMonth) return false;
  if ((m.skips || []).includes(month)) return false;
  return m.status !== "pending";
}

export function shippingList(members, month) {
  return members.filter((m) => inMonth(m, month)).map((m) => ({
    name: m.address?.name || m.name || "", email: m.email || "",
    line1: m.address?.line1 || "", line2: m.address?.line2 || "", city: m.address?.city || "",
    postal_code: m.address?.postal_code || "", state: m.address?.state || "", country: m.address?.country || "",
    plan: PLANS[m.plan]?.label || m.plan, provider: m.provider === "stripe" ? "Stripe" : "PayPal",
  }));
}

export function toCsv(rows) {
  return toCsvRows(rows, ["name", "email", "line1", "line2", "city", "postal_code", "state", "country", "plan", "provider"]);
}

export function toCsvRows(rows, cols) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheets treating text as a formula
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

/* ---------------------------------------------------------------- sign-in links */
const secret = () => {
  const s = process.env.CLUB_LINK_SECRET;
  if (!s || s.length < 16) throw new HttpError(503, "Member self-service is not set up yet.");
  return s;
};
export function makeToken(email, ttlMs = 3600 * 1000, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ e: String(email).trim().toLowerCase(), x: now + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function readToken(token, now = Date.now()) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) throw new HttpError(401, "This link is not valid. Please ask for a new one.");
  const want = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new HttpError(401, "This link is not valid. Please ask for a new one.");
  const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString());
  if (x < now) throw new HttpError(401, "This link has expired. Please ask for a new one.");
  return e;
}
export async function memberForToken(token, id) {
  const email = readToken(token);
  const m = await getMember(id);
  if (!m || String(m.email).toLowerCase() !== email) throw new HttpError(404, "Membership not found.");
  return m;
}

/* ---------------------------------------------------------------- emails */
const addressText = (a = {}) =>
  [a.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state, a.country].filter(Boolean).join("\n");

export async function sendPaymentEmails(m, { amount, currency, month }) {
  const price = money(amount, (currency || catalog().currency).toUpperCase());
  const plan = PLANS[m.plan]?.label || m.plan;
  await sendEmail({
    to: m.email, replyTo: process.env.ARTIST_EMAIL,
    subject: `Print Club: payment confirmed for ${month}`,
    text: `Hello${m.name ? " " + m.name : ""},

Your Print Club payment of ${price} for ${month} is confirmed (${plan}).
Your bundle (1 print, 1 card, 1 postcard) will be sent to:
${addressText(m.address)}

To change your address, skip a month or cancel, go to ${siteUrl()}/print-club/manage/

Paints by Euro`,
  });
  await sendEmail({
    to: process.env.ARTIST_EMAIL,
    subject: `Print Club payment: ${m.name || m.email} — ${price}`,
    text: `${m.name || "-"} <${m.email}> paid ${price} for ${month} (${plan}, ${m.provider === "stripe" ? "Stripe" : "PayPal"}).

Ship to:
${addressText(m.address)}

The full list for the month is at ${siteUrl()}/print-club/admin/`,
  });
}

export async function sendManageLink(email, token) {
  await sendEmail({
    to: email,
    subject: "Your Print Club link",
    text: `Use this link to change your address, skip a month or cancel your Print Club membership. It works for one hour.

${siteUrl()}/print-club/manage/?t=${token}

If you did not ask for this, you can ignore this email.

Paints by Euro`,
  });
}

/** Labels for the member page. */
export function describe(m) {
  const next = m.skips?.length ? m.skips[m.skips.length - 1] : null;
  return {
    id: memberKey(m.provider, m.subId), provider: m.provider,
    providerLabel: m.provider === "stripe" ? "Card (Stripe)" : "PayPal",
    plan: m.plan, planLabel: PLANS[m.plan]?.label || m.plan,
    statusLabel: { active: "Active", pending: "Starting", cancelled: "Cancelled", skipping: "Active, skipping a month", ended: "Ended" }[m.status] || m.status,
    skipMonth: m.status === "skipping" ? next : null,
    canSkip: !PLANS[m.plan]?.months && m.status === "active",
    address: m.address || null,
  };
}
