// POST /api/club/manage-link  { email } — emails a one-hour sign-in link to members.
// Always answers the same way, so it can't be used to find out who is a member.
import { handler, json, readJson } from "./_lib/http.mjs";
import { membersForEmail, makeToken, sendManageLink } from "./_lib/club.mjs";

export default handler("POST", async (req) => {
  const { email } = await readJson(req);
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return json({ error: "Please enter a valid email address." }, 400);
  const token = makeToken(clean); // also checks that self-service is set up
  if ((await membersForEmail(clean)).length) await sendManageLink(clean, token);
  return json({ sent: true });
});
export const config = { path: "/api/club/manage-link" };
