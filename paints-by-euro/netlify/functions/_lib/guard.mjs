// Safety switch: live payment keys are refused unless the artist sets
// ALLOW_LIVE_PAYMENTS=true themselves. Build and test with test keys only.
import { HttpError } from "./http.mjs";

const liveAllowed = () => process.env.ALLOW_LIVE_PAYMENTS === "true";

export function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new HttpError(503, "Card payments are not set up yet.");
  if (/^(sk|rk)_live_/.test(key) && !liveAllowed()) {
    console.error("Refusing live Stripe key: set ALLOW_LIVE_PAYMENTS=true to go live.");
    throw new HttpError(503, "Card payments are not switched on yet.");
  }
  return key;
}

export function paypalEnv() {
  const env = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new HttpError(503, "PayPal is not set up yet.");
  if (env === "live" && !liveAllowed()) {
    console.error("Refusing PAYPAL_ENV=live: set ALLOW_LIVE_PAYMENTS=true to go live.");
    throw new HttpError(503, "PayPal is not switched on yet.");
  }
  return env;
}

export const isTestMode = () =>
  !/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || "") && process.env.PAYPAL_ENV !== "live";
