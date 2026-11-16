// POST /api/club/resume — run daily: reactivates PayPal memberships whose skipped
// month has passed. (Stripe resumes by itself at the pause's resumes_at time.)
// Runs daily from the Worker's cron (worker.js). It can also be called by hand
// with the header "x-cron-secret: <CRON_SECRET>".
import { timingSafeEqual, createHash } from "node:crypto";
import { paypal } from "./_lib/paypal.mjs";
import { allMembers, updateMember, memberKey } from "./_lib/club.mjs";

const same = (a, b) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export default async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = req?.headers?.get("x-cron-secret") || "";
  if (req && (!secret || secret.length < 16 || !same(given, secret))) return new Response("Unauthorised", { status: 401 });
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
export const config = { path: "/api/club/resume" };
