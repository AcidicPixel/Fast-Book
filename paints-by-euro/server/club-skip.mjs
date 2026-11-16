// POST /api/club/skip  { t, id } — skip the next month: no charge, no bundle.
// Stripe: pause collection so the next invoice is voided, then resume.
// PayPal: suspend now; the daily club-resume job reactivates it after the skipped date.
import { handler, json, readJson, HttpError } from "./_lib/http.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { paypal } from "./_lib/paypal.mjs";
import { memberForToken, updateMember, memberKey, monthOf, PLANS } from "./_lib/club.mjs";

const DAY = 24 * 3600 * 1000;

export default handler("POST", async (req) => {
  const { t, id } = await readJson(req);
  const m = await memberForToken(t, id);
  if (PLANS[m.plan]?.months) throw new HttpError(400, "Gift memberships can't skip a month.");
  if (m.status === "skipping") throw new HttpError(409, "You are already skipping your next month.");
  if (m.status !== "active") throw new HttpError(409, "Only active memberships can skip a month.");

  let nextCharge, resumeAt;
  if (m.provider === "stripe") {
    const sub = await stripe(`/subscriptions/${m.subId}`, null, { method: "GET" });
    const periodEnd = (sub.current_period_end || sub.items?.data?.[0]?.current_period_end) * 1000;
    nextCharge = periodEnd;
    resumeAt = periodEnd + DAY;
    await stripe(`/subscriptions/${m.subId}`, { pause_collection: { behavior: "void", resumes_at: Math.floor(resumeAt / 1000) } });
  } else {
    const sub = await paypal(`/v1/billing/subscriptions/${m.subId}`);
    nextCharge = Date.parse(sub.billing_info?.next_billing_time);
    if (!nextCharge) throw new HttpError(409, "PayPal has no next payment date for this membership.");
    resumeAt = nextCharge + DAY;
    await paypal(`/v1/billing/subscriptions/${m.subId}/suspend`, { method: "POST", body: { reason: "Member skipped one month" } });
  }
  const month = monthOf(nextCharge);
  await updateMember(memberKey(m.provider, m.subId), (cur) => cur && {
    ...cur, status: "skipping", resumeAt, skips: [...new Set([...(cur.skips || []), month])],
  });
  return json({ skipping: month });
});
export const config = { path: "/api/club/skip" };
