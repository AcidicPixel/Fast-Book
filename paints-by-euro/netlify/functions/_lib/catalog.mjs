// Prices, statuses and shipping come from the site's content files.
// catalog.generated.json is written by the site build (npm run build).
import generated from "./catalog.generated.json" with { type: "json" };
import { ALL_COUNTRIES } from "./countries.mjs";
import { HttpError } from "./http.mjs";

export const catalog = () => globalThis.__TEST_CATALOG__ || generated;

export function findItem(kind, slug) {
  const c = catalog();
  const list = kind === "print" ? c.prints : kind === "work" ? c.works : null;
  const item = list && list.find((x) => x.slug === slug);
  if (!item) throw new HttpError(404, "This item was not found.");
  return item;
}

export function findRegion(id) {
  const region = catalog().shipping.regions.find((r) => r.id === id);
  if (!region) throw new HttpError(400, "Please choose a shipping region.");
  return region;
}

/** Expands "*" to every country not listed in another region. */
export function countriesFor(region) {
  if (!region.countries.includes("*")) return region.countries;
  const taken = new Set(catalog().shipping.regions.filter((r) => r !== region).flatMap((r) => r.countries));
  return ALL_COUNTRIES.filter((c) => !taken.has(c));
}

/** Currencies without minor units (Stripe "zero-decimal"). */
const ZERO_DECIMAL = new Set(["BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);
export const toMinor = (amount, currency) =>
  ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
export const fromMinor = (amount, currency) =>
  ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount / 100;
export const toDecimalString = (amount, currency) =>
  ZERO_DECIMAL.has(currency.toUpperCase()) ? String(Math.round(amount)) : Number(amount).toFixed(2);

/** Everything a checkout needs, worked out on the server from trusted data. */
export function buildOrder(kind, slug, regionId) {
  if (kind !== "work" && kind !== "print") throw new HttpError(400, "Invalid request.");
  const item = findItem(kind, slug);
  if (!(item.price > 0)) throw new HttpError(409, "This work is not for sale.");
  const region = findRegion(regionId);
  const currency = catalog().currency;
  return {
    kind, slug, item, region, currency,
    key: kind === "work" ? item.key : null,
    countries: countriesFor(region),
    price: item.price,
    shipping: region.cost,
    total: item.price + region.cost,
  };
}

export const money = (amount, currency = catalog().currency) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
