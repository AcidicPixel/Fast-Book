// GET /api/club/me?t=TOKEN — the signed-in member's memberships.
import { handler, json } from "./_lib/http.mjs";
import { readToken, membersForEmail, describe } from "./_lib/club.mjs";

export default handler("GET", async (req) => {
  const email = readToken(new URL(req.url).searchParams.get("t"));
  const members = (await membersForEmail(email)).filter((m) => m.status !== "ended");
  return json({ email, members: members.map(describe) });
});
export const config = { path: "/api/club/me" };
