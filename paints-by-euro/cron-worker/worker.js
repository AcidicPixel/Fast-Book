// A tiny Cloudflare Worker that runs once a day and asks the site to resume
// PayPal Print Club members whose skipped month is over.
// Set it up in the Cloudflare dashboard (see SETUP-FOR-ARTIST.md, section 9):
//   variables SITE_URL (e.g. https://paintsbyeuro.com) and CRON_SECRET (same as the site's),
//   and a Cron Trigger such as "0 10 * * *" (10:00 UTC every day).
export default {
  async scheduled(event, env, ctx) {
    const res = await fetch(`${env.SITE_URL.replace(/\/$/, "")}/api/club/resume`, {
      method: "POST",
      headers: { "x-cron-secret": env.CRON_SECRET },
    });
    if (!res.ok) throw new Error(`Resume job failed: ${res.status}`);
  },
};
