// Runs daily: reactivates PayPal memberships whose skipped month has passed.
// (Stripe resumes by itself at the pause's resumes_at time.)
import { paypal } from "./_lib/paypal.mjs";
import { allMembers, updateMember, memberKey } from "./_lib/club.mjs";

export default async () => {
  const now = Date.now();
  for (const m of await allMembers()) {
    if (m.provider !== "paypal" || m.status !== "skipping" || !m.resumeAt || m.resumeAt > now) continue;
    try {
      await paypal(`/v1/billing/subscriptions/${m.subId}/activate`, { method: "POST", body: { reason: "Skipped month is over" } });
      await updateMember(memberKey("paypal", m.subId), (cur) => cur && { ...cur, status: "active", resumeAt: null });
    } catch (e) { console.error("resume failed", m.subId, e.message); }
  }
  return new Response("ok");
};
export const config = { schedule: "@daily" };
