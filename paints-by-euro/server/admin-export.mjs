// GET /api/admin/export?type=newsletter|messages — CSV downloads for the artist.
// Uses the same password as the Print Club list (CLUB_ADMIN_PASSWORD).
import { timingSafeEqual, createHash } from "node:crypto";
import { handler, json } from "./_lib/http.mjs";
import { formsStore } from "./_lib/forms.mjs";
import { toCsvRows } from "./_lib/club.mjs";

const same = (a, b) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
const TYPES = {
  newsletter: { prefix: "newsletter:", cols: ["email", "at"] },
  messages: { prefix: "message:", cols: ["at", "name", "email", "subject", "work", "message"] },
};

export default handler("GET", async (req) => {
  const pass = process.env.CLUB_ADMIN_PASSWORD;
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!pass || pass.length < 10 || !given || !same(given, pass)) return json({ error: "Unauthorised" }, 401);
  const type = TYPES[new URL(req.url).searchParams.get("type")];
  if (!type) return json({ error: "Unknown export" }, 400);
  const s = formsStore();
  const { blobs } = await s.list({ prefix: type.prefix });
  const rows = [];
  for (const b of blobs) { const r = await s.get(b.key, { type: "json" }); if (r) rows.push(r); }
  return new Response(toCsvRows(rows, type.cols), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${new URL(req.url).searchParams.get("type")}.csv"`, "cache-control": "no-store" },
  });
});
export const config = { path: "/api/admin/export" };
