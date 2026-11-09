// Minimal PayPal REST client (Orders v2) and webhook verification.
import { paypalEnv } from "./guard.mjs";

const base = () => (paypalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function token() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return body.access_token;
}

export async function paypal(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`PayPal ${path}: ${data?.details?.[0]?.issue || data?.name || res.status}`);
    err.paypal = data;
    throw err;
  }
  return data;
}

/** Asks PayPal to confirm the webhook really came from PayPal. */
export async function verifyPayPalWebhook(headers, event) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const h = (n) => headers.get(n);
  if (!h("paypal-transmission-sig")) return false;
  const res = await paypal("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return res.verification_status === "SUCCESS";
}

/** custom_id carries "kind|slug|rid|region" through PayPal. */
export const packCustom = (o) => [o.kind, o.slug, o.rid || "-", o.region].join("|");
export function unpackCustom(s = "") {
  const [kind, slug, rid, region] = s.split("|");
  return { kind, slug, rid: rid === "-" ? null : rid, region };
}

export function paypalAddress(shipping) {
  const a = shipping?.address || {};
  return {
    name: shipping?.name?.full_name, line1: a.address_line_1, line2: a.address_line_2,
    city: a.admin_area_2, state: a.admin_area_1, postal_code: a.postal_code, country: a.country_code,
  };
}
