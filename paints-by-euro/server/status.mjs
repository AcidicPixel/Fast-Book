// GET /api/status — live status of every work (Available / Reserved / Sold / Not for sale).
import { catalog } from "./_lib/catalog.mjs";
import { allRecords, effectiveStatus } from "./_lib/status.mjs";
import { handler, json } from "./_lib/http.mjs";

export default handler("GET", async () => {
  const works = catalog().works;
  const records = await allRecords(works.map((w) => w.key));
  const statuses = Object.fromEntries(works.map((w) => [w.slug, effectiveStatus(w.status, records[w.key])]));
  return json({ statuses });
});

export const config = { path: "/api/status" };
