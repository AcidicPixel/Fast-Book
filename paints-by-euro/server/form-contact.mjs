// POST /api/contact — the Commission & Contact form.
// Emails the message to the artist (reply goes straight to the sender) and keeps a copy.
import { handler } from "./_lib/http.mjs";
import { sendEmail } from "./_lib/email.mjs";
import { formsStore, readForm, validEmail, clip, goTo, problem } from "./_lib/forms.mjs";
import { newId } from "./_lib/status.mjs";

const SUBJECTS = ["Commission", "Purchase", "Prints", "Print Club", "Exhibition", "Other"];

export default handler("POST", async (req) => {
  const f = await readForm(req);
  if (f.company) return goTo("/thanks/?form=contact"); // spam trap: pretend it worked
  const name = clip(f.name, 120), email = clip(f.email, 200), message = clip(f.message, 5000);
  const subject = SUBJECTS.includes(f.subject) ? f.subject : "Other";
  const work = clip(f.work, 200);
  if (!name || !validEmail(email) || !message) return problem("Please fill in your name, a valid email address and a message.", "/commission-contact/");
  const at = new Date().toISOString();
  await formsStore().setJSON(`message:${at}:${newId()}`, { at, name, email, subject, work, message });
  await sendEmail({
    to: process.env.ARTIST_EMAIL, replyTo: email,
    subject: `${subject}: message from ${name}`,
    text: `${name} <${email}> wrote${work ? ` about "${work}"` : ""}:\n\n${message}\n\nReply to this email to answer.`,
  });
  return goTo("/thanks/?form=contact");
});
export const config = { path: "/api/contact" };
