import { findItem, catalog } from "./catalog.mjs";
import { markSold, release, firstTimeSeen } from "./status.mjs";
import { sendSaleEmails, sendDoubleSaleAlert } from "./email.mjs";
import { expireSession } from "./stripe.mjs";

/** Called only from a verified webhook. */
export async function completeSale({ kind, slug, rid, provider, ref, buyer, address, total }) {
  const item = findItem(kind, slug);
  const currency = catalog().currency;
  if (kind === "work") {
    // Idempotent: the same payment marks the work sold only once.
    const result = await markSold(item.key, { provider, ref, buyerEmail: buyer.email || null });
    if (result.conflict) {
      if (await firstTimeSeen(provider, ref)) await sendDoubleSaleAlert({ item, provider, ref, buyer, existing: result.conflict });
      return { conflict: true };
    }
    // Someone else was holding the work (the first hold ran out): end their checkout.
    const prev = result.previous;
    if (prev?.state === "reserved" && prev.rid !== rid && prev.provider === "stripe" && prev.ref) {
      await expireSession(prev.ref);
    }
  }
  // Webhooks can arrive more than once: send the emails only the first time.
  if (!(await firstTimeSeen(provider, ref))) return { duplicate: true };
  await sendSaleEmails({ item, kind, buyer, address, total, currency, provider, ref });
  return { ok: true };
}

export async function cancelHold({ kind, slug, rid }) {
  if (kind !== "work" || !rid) return null;
  const item = findItem(kind, slug);
  return release(item.key, rid);
}
