// Order emails via Resend (free tier: 3,000 emails/month). Without an API key
// the emails are written to the function log instead, so testing still works.
import { money } from "./catalog.mjs";

export async function sendEmail({ to, subject, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) {
    console.log(`[email not sent: ${key ? "no recipient" : "RESEND_API_KEY not set"}] To: ${to} | ${subject}\n${text}`);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Paints by Euro <onboarding@resend.dev>",
      to: [to], subject, text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) console.error("Email failed", res.status, await res.text());
  return { ok: res.ok };
}

const addressLines = (a = {}) =>
  [a.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state, a.country].filter(Boolean).join("\n");

export async function sendSaleEmails({ item, kind, buyer, address, total, currency, provider, ref }) {
  const artist = process.env.ARTIST_EMAIL;
  const what = kind === "print" ? `${item.title} (print)` : item.title;
  const amount = money(total, currency);
  await sendEmail({
    to: buyer.email,
    replyTo: artist,
    subject: `Your purchase from Paints by Euro: ${what}`,
    text:
`Hello${buyer.name ? " " + buyer.name : ""},

Thank you for buying ${what}. Your payment of ${amount} is confirmed.

It will be sent to:
${addressLines(address)}

I will email you when it has been posted. Delivery times are on the Shipping and returns page.
If you have any questions, reply to this email.

Paints by Euro`,
  });
  await sendEmail({
    to: artist,
    subject: `Sold: ${what} — ${amount}`,
    text:
`${what} has been paid for and is now marked Sold on the website.

Amount: ${amount} (${provider}, reference ${ref})
Buyer: ${buyer.name || "-"} <${buyer.email || "-"}>

Ship to:
${addressLines(address)}`,
  });
}

export async function sendDoubleSaleAlert({ item, provider, ref, buyer, existing }) {
  await sendEmail({
    to: process.env.ARTIST_EMAIL,
    subject: `Action needed: ${item.title} was paid for twice`,
    text:
`${item.title} was already sold (${existing.provider} ${existing.ref}), but a second payment arrived:
${provider} ${ref} from ${buyer.name || "-"} <${buyer.email || "-"}>.

Please refund the second payment in your ${provider === "stripe" ? "Stripe" : "PayPal"} dashboard and let the buyer know.`,
  });
}
