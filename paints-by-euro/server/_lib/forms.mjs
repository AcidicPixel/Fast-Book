// Contact and newsletter forms (these replace Netlify Forms).
import { d1Store } from "./store.mjs";

export function formsStore() {
  if (globalThis.__TEST_FORMS_STORE__) return globalThis.__TEST_FORMS_STORE__;
  return d1Store("forms");
}

export async function readForm(req) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return req.json();
  const fd = await req.formData();
  return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
}

export const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || "").trim());
export const clip = (s, n) => String(s || "").trim().slice(0, n);

/** Send the browser on to a page (forms work without JavaScript). */
export const goTo = (url) => new Response(null, { status: 303, headers: { location: url } });

export const problem = (message, back) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Please check the form</title>
<body style="font:18px/1.6 system-ui,sans-serif;max-width:36em;margin:3em auto;padding:0 16px;background:#F4EFE6;color:#1E1C19">
<p>${message}</p><p><a href="${back}" style="color:#1E1C19">Go back</a></p></body>`, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
