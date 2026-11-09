// Minimal Stripe REST client (no SDK needed) and webhook signature check.
import { createHmac, timingSafeEqual } from "node:crypto";
import { stripeKey } from "./guard.mjs";

function encode(value, prefix, out = new URLSearchParams()) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) value.forEach((v, i) => encode(v, `${prefix}[${i}]`, out));
  else if (typeof value === "object") for (const [k, v] of Object.entries(value)) encode(v, prefix ? `${prefix}[${k}]` : k, out);
  else out.append(prefix, String(value));
  return out;
}

export async function stripe(path, params, { method = "POST", idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${stripeKey()}`, "content-type": "application/x-www-form-urlencoded" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method, headers, body: method === "GET" ? undefined : encode(params || {}).toString(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${body?.error?.message || res.status}`);
  return body;
}

/** Verifies the Stripe-Signature header. Returns true only for a genuine, recent event. */
export function verifyStripeSignature(payload, header, secret, toleranceSec = 300, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = {};
  const sigs = [];
  for (const piece of header.split(",")) {
    const [k, v] = piece.split("=");
    if (k === "t") parts.t = v;
    if (k === "v1") sigs.push(v);
  }
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export async function expireSession(id) {
  try { await stripe(`/checkout/sessions/${id}/expire`, {}); } catch (e) { console.warn(e.message); }
}
