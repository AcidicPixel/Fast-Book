import { randomBytes } from "node:crypto";
import { store } from "./store.mjs";

// Stripe's shortest checkout session is 30 minutes, so the hold is
// 30 minutes plus a minute of margin for clock differences.
export const HOLD_MS = 31 * 60 * 1000;

const rec = (key) => `work:${key}`;
export const newId = () => randomBytes(12).toString("hex");

/** Status shown to visitors: content status, overridden by a live sale record. */
export function effectiveStatus(contentStatus, record, now = Date.now()) {
  if (record?.state === "sold") return "Sold";
  if (record?.state === "reserved" && record.until > now) return "Reserved";
  return contentStatus;
}

export async function getRecord(key) {
  const res = await store().getWithMetadata(rec(key), { type: "json" });
  return res ? { data: res.data, etag: res.etag } : null;
}

/**
 * Reserve a work for HOLD_MS. Uses a conditional write so two buyers who
 * click at the same moment cannot both get the hold.
 */
export async function reserve(work, provider) {
  if (work.status !== "Available") return { ok: false };
  const cur = await getRecord(work.key);
  if (effectiveStatus(work.status, cur?.data) !== "Available") return { ok: false };
  const value = { state: "reserved", rid: newId(), until: Date.now() + HOLD_MS, provider, ref: null };
  const res = await store().setJSON(rec(work.key), value, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
  if (res && res.modified === false) return { ok: false };
  return { ok: true, rid: value.rid, until: value.until, etag: res?.etag };
}

/** Record the checkout session / order id on the hold. */
export async function attachRef(work, rid, ref) {
  const cur = await getRecord(work.key);
  if (!cur || cur.data.rid !== rid) return;
  await store().setJSON(rec(work.key), { ...cur.data, ref }, { onlyIfMatch: cur.etag });
}

/** Release a hold, but only the holder (who knows rid) can. Returns the old record. */
export async function release(key, rid) {
  const cur = await getRecord(key);
  if (!cur || cur.data.state !== "reserved" || cur.data.rid !== rid) return null;
  await store().delete(rec(key));
  return cur.data;
}

/**
 * Mark a work sold after a confirmed payment.
 * Returns { conflict } if it was already sold to someone else.
 */
export async function markSold(key, sale) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getRecord(key);
    if (cur?.data.state === "sold") {
      return cur.data.ref === sale.ref ? { already: true } : { conflict: cur.data };
    }
    const value = { state: "sold", soldAt: new Date().toISOString(), ...sale };
    const res = await store().setJSON(rec(key), value, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (!res || res.modified !== false) return { ok: true, previous: cur?.data || null };
  }
  throw new Error(`Could not mark ${key} as sold`);
}

/** Record each payment once, so repeated webhooks don't send repeat emails. */
export async function firstTimeSeen(provider, ref) {
  const res = await store().setJSON(`payment:${provider}:${ref}`, { at: new Date().toISOString() }, { onlyIfNew: true });
  return !(res && res.modified === false);
}

export async function allRecords(keys) {
  const out = {};
  await Promise.all(keys.map(async (k) => { out[k] = (await getRecord(k))?.data || null; }));
  return out;
}
