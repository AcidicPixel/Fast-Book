// GET /api/club/members?month=YYYY-MM&format=json|csv — the artist's shipping list.
// Needs the CLUB_ADMIN_PASSWORD as "Authorization: Bearer <password>".
import { timingSafeEqual, createHash } from "node:crypto";
import { handler, json } from "./_lib/http.mjs";
import { allMembers, shippingList, toCsv, inMonth } from "./_lib/club.mjs";

const same = (a, b) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export default handler("GET", async (req) => {
  const pass = process.env.CLUB_ADMIN_PASSWORD;
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!pass || pass.length < 10 || !given || !same(given, pass)) return json({ error: "Unauthorised" }, 401);
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") || "") ? url.searchParams.get("month") : new Date().toISOString().slice(0, 7);
  const all = await allMembers();
  const rows = shippingList(all, month);
  const skipped = all.filter((m) => (m.skips || []).includes(month) && inMonth({ ...m, skips: [] }, month)).length;
  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="print-club-${month}.csv"`, "cache-control": "no-store" } });
  }
  return json({ month, members: rows, skipped });
});
export const config = { path: "/api/club/members" };
