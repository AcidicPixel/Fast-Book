// POST /api/newsletter — newsletter sign-up. The list is downloadable on the admin page.
import { handler } from "./_lib/http.mjs";
import { formsStore, readForm, validEmail, clip, goTo, problem } from "./_lib/forms.mjs";

export default handler("POST", async (req) => {
  const f = await readForm(req);
  if (f.company) return goTo("/thanks/?form=newsletter");
  const email = clip(f.email, 200).toLowerCase();
  if (!validEmail(email)) return problem("Please enter a valid email address.", "/");
  await formsStore().setJSON(`newsletter:${email}`, { email, at: new Date().toISOString() }, { onlyIfNew: true });
  return goTo("/thanks/?form=newsletter");
});
export const config = { path: "/api/newsletter" };
