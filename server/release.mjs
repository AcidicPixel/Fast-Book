// POST /api/release  { kind, slug, rid } — buyer cancelled: free the work now
// instead of waiting for the 30 minutes to run out.
import { cancelHold } from "./_lib/sales.mjs";
import { expireSession } from "./_lib/stripe.mjs";
import { handler, json, readJson } from "./_lib/http.mjs";

export default handler("POST", async (req) => {
  const { kind, slug, rid } = await readJson(req);
  const old = await cancelHold({ kind, slug, rid });
  if (old?.provider === "stripe" && old.ref && process.env.STRIPE_SECRET_KEY) await expireSession(old.ref);
  return json({ released: Boolean(old) });
});

export const config = { path: "/api/release" };
