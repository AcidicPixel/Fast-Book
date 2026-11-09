// Live sale state (Reserved / Sold) lives in Netlify Blobs, so it changes the
// moment a checkout starts or a payment is confirmed, without a rebuild.
import { getStore } from "@netlify/blobs";

export function store() {
  if (globalThis.__TEST_STORE__) return globalThis.__TEST_STORE__;
  return getStore({ name: "sales", consistency: "strong" });
}
