// Contact and newsletter forms, CSV exports and the protected daily resume job.
import { test, before } from "node:test";
import assert from "node:assert/strict";

class MemoryStore {
  map = new Map(); n = 0;
  async getWithMetadata(k) { const v = this.map.get(k); return v ? { data: structuredClone(v.data), etag: v.etag } : null; }
  async get(k) { const v = this.map.get(k); return v ? structuredClone(v.data) : null; }
  async setJSON(k, data, o = {}) {
    const cur = this.map.get(k);
    if (o.onlyIfNew && cur) return { modified: false };
    if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
    const etag = `"e${++this.n}"`; this.map.set(k, { data: structuredClone(data), etag }); return { modified: true, etag };
  }
  async delete(k) { this.map.delete(k); }
  async list({ prefix = "" } = {}) { return { blobs: [...this.map.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
}
const emails = [];
globalThis.fetch = async (url, init = {}) => {
  if (String(url) === "https://api.resend.com/emails") { emails.push(JSON.parse(init.body)); return new Response("{}"); }
  throw new Error("Unexpected fetch " + url);
};
Object.assign(process.env, { RESEND_API_KEY: "re_test", ARTIST_EMAIL: "artist@example.com", CLUB_ADMIN_PASSWORD: "correct-horse-battery", CRON_SECRET: "a-long-cron-secret-123" });
globalThis.__TEST_FORMS_STORE__ = new MemoryStore();
globalThis.__TEST_CLUB_STORE__ = new MemoryStore();

const fn = {};
before(async () => { for (const n of ["form-contact", "form-newsletter", "admin-export", "club-resume"]) fn[n] = (await import(`../server/${n}.mjs`)).default; });
const form = (n, fields) => fn[n](new Request(`https://x/api/${n}`, { method: "POST", body: new URLSearchParams(fields) }));
const auth = { authorization: "Bearer correct-horse-battery" };
const exportCsv = (type, headers = auth) => fn["admin-export"](new Request(`https://x/api/admin/export?type=${type}`, { headers }));

test("contact form: emails the artist with the sender as reply-to, keeps a copy, then shows the thank-you page", async () => {
  const r = await form("form-contact", { name: "Ann", email: "ann@example.com", subject: "Print Club", message: "Hello", work: "", company: "" });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/thanks/?form=contact");
  assert.equal(emails.at(-1).to[0], "artist@example.com");
  assert.equal(emails.at(-1).reply_to, "ann@example.com");
  assert.match(emails.at(-1).subject, /^Print Club: message from Ann/);
  assert.equal((await form("form-contact", { name: "", email: "x", message: "" })).status, 400);
  const before = emails.length;
  assert.equal((await form("form-contact", { name: "Bot", email: "b@b.co", message: "spam", company: "Acme" })).status, 303, "spam trap looks like success");
  assert.equal(emails.length, before, "but nothing is sent");
});

test("newsletter: one entry per address, invalid addresses refused", async () => {
  assert.equal((await form("form-newsletter", { email: "Fan@Example.com" })).status, 303);
  assert.equal((await form("form-newsletter", { email: "fan@example.com" })).status, 303);
  assert.equal((await form("form-newsletter", { email: "nope" })).status, 400);
  const csv = await (await exportCsv("newsletter")).text();
  assert.equal(csv.trim().split("\n").length, 2, "header + one address");
  assert.match(csv, /fan@example.com/);
});

test("exports need the admin password", async () => {
  assert.equal((await exportCsv("messages", {})).status, 401);
  assert.match(await (await exportCsv("messages")).text(), /^at,name,email,subject,work,message\n.*Ann,ann@example.com,Print Club,,Hello/);
});

test("daily resume job refuses calls without the secret", async () => {
  assert.equal((await fn["club-resume"](new Request("https://x/api/club/resume", { method: "POST" }))).status, 401);
  assert.equal((await fn["club-resume"](new Request("https://x/api/club/resume", { method: "POST", headers: { "x-cron-secret": "a-long-cron-secret-123" } }))).status, 200);
});
