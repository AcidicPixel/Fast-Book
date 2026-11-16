// Print Club webhook events. Payments are only ever confirmed here.
import { stripe } from "./stripe.mjs";
import { paypal, paypalAddress } from "./paypal.mjs";
import { firstTimeSeen } from "./status.mjs";
import { PLANS, memberKey, updateMember, getMember, monthOf, addMonths, sendPaymentEmails, membersForEmail } from "./club.mjs";

const stripeAddress = (ship) => (ship ? { name: ship.name, ...(ship.address || {}) } : null);
const endFor = (plan, firstMonth) => (PLANS[plan]?.months ? addMonths(firstMonth, PLANS[plan].months - 1) : null);

/* ---------------------------------------------------------------- Stripe */
export async function handleStripeClub(event) {
  const o = event.data?.object || {};
  switch (event.type) {
    case "checkout.session.completed": {
      if (o.mode !== "subscription" || o.metadata?.kind !== "club") return false;
      const plan = o.metadata.plan || "monthly";
      const ship = o.collected_information?.shipping_details || o.shipping_details;
      const address = stripeAddress(ship);
      const firstMonth = o.metadata.firstMonth || monthOf(Date.now());
      await updateMember(memberKey("stripe", o.subscription), (cur) => ({
        provider: "stripe", subId: o.subscription, status: "pending", skips: [], joinedAt: new Date().toISOString(),
        ...cur,
        customerId: o.customer, plan, email: o.customer_details?.email || cur?.email, name: o.customer_details?.name || cur?.name,
        address: address || cur?.address || null,
        firstMonth: cur?.firstMonth && cur.firstMonth < firstMonth ? cur.firstMonth : firstMonth,
        endMonth: cur?.endMonth || endFor(plan, firstMonth),
      }));
      // Keep the address on the Stripe customer too, so the Customer Portal can change it.
      if (address) {
        await stripe(`/customers/${o.customer}`, { shipping: { name: address.name || o.customer_details?.name || "", address: ship.address } }).catch((e) => console.warn(e.message));
      }
      // Gifts are paid once and end after their months.
      if (PLANS[plan]?.months) await stripe(`/subscriptions/${o.subscription}`, { cancel_at_period_end: true }).catch((e) => console.warn(e.message));
      return true;
    }
    case "invoice.paid": {
      const subId = o.subscription || o.parent?.subscription_details?.subscription;
      const meta = o.subscription_details?.metadata || o.parent?.subscription_details?.metadata || {};
      if (!subId || (meta.kind && meta.kind !== "club")) return false;
      if (!meta.kind) {
        const known = await getMember(memberKey("stripe", subId));
        if (!known) return false; // not a Print Club subscription
      }
      if (!o.amount_paid) return true; // nothing was charged (e.g. a skipped month)
      const paidAt = (o.status_transitions?.paid_at || o.created) * 1000;
      const month = monthOf(paidAt);
      let m = await updateMember(memberKey("stripe", subId), (cur) => {
        const firstMonth = cur?.firstMonth && cur.firstMonth < month ? cur.firstMonth : month;
        const plan = cur?.plan || meta.plan || "monthly";
        return {
          provider: "stripe", subId, skips: [], joinedAt: new Date(paidAt).toISOString(), ...cur,
          plan, customerId: cur?.customerId || o.customer,
          email: cur?.email || o.customer_email, name: cur?.name || o.customer_name,
          address: cur?.address || stripeAddress(o.customer_shipping),
          status: "active", resumeAt: null, lastPaidMonth: month, firstMonth,
          endMonth: cur?.endMonth || endFor(plan, firstMonth),
        };
      });
      if (!m.address) {
        // The invoice can arrive before the checkout event: read the address from the checkout session.
        const list = await stripe(`/checkout/sessions?subscription=${subId}&limit=1`, null, { method: "GET" }).catch(() => ({ data: [] }));
        const sess = list.data?.[0];
        const addr = stripeAddress(sess?.collected_information?.shipping_details || sess?.shipping_details);
        if (addr) m = await updateMember(memberKey("stripe", subId), (cur) => ({ ...cur, address: addr, email: cur.email || sess.customer_details?.email, name: cur.name || sess.customer_details?.name }));
      }
      if (await firstTimeSeen("stripe-invoice", o.id)) {
        await sendPaymentEmails(m, { amount: o.amount_paid / 100, currency: o.currency, month });
      }
      return true;
    }
    case "customer.subscription.deleted": {
      const m = await getMember(memberKey("stripe", o.id));
      if (!m) return false;
      await updateMember(memberKey("stripe", o.id), (cur) => ({
        ...cur, status: PLANS[cur.plan]?.months ? "ended" : "cancelled", cancelledAt: new Date().toISOString(),
        endMonth: cur.endMonth && PLANS[cur.plan]?.months ? cur.endMonth : (cur.lastPaidMonth || addMonths(cur.firstMonth, -1)),
      }));
      return true;
    }
    case "customer.subscription.updated": {
      const m = await getMember(memberKey("stripe", o.id));
      if (!m) return false;
      // a skip ends when Stripe lifts the pause
      if (m.status === "skipping" && !o.pause_collection) {
        await updateMember(memberKey("stripe", o.id), (cur) => ({ ...cur, status: "active", resumeAt: null }));
      }
      return true;
    }
    case "customer.updated": {
      // address changed in the Customer Portal
      if (!o.shipping || !o.email) return false;
      for (const m of await membersForEmail(o.email)) {
        if (m.provider === "stripe" && m.customerId === o.id) {
          await updateMember(memberKey("stripe", m.subId), (cur) => ({ ...cur, address: stripeAddress(o.shipping) }));
        }
      }
      return true;
    }
  }
  return false;
}

/* ---------------------------------------------------------------- PayPal */
function fromPayPalSubscription(sub) {
  const s = sub.subscriber || {};
  return {
    email: s.email_address,
    name: [s.name?.given_name, s.name?.surname].filter(Boolean).join(" "),
    address: s.shipping_address ? paypalAddress(s.shipping_address) : null,
    plan: PLANS[sub.custom_id] ? sub.custom_id : "monthly",
  };
}

export async function handlePayPalClub(event) {
  const r = event.resource || {};
  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.UPDATED": {
      const info = fromPayPalSubscription(r);
      const firstMonth = monthOf(r.start_time || Date.now());
      await updateMember(memberKey("paypal", r.id), (cur) => ({
        provider: "paypal", subId: r.id, status: "pending", skips: [], joinedAt: new Date().toISOString(),
        firstMonth, ...cur,
        ...Object.fromEntries(Object.entries(info).filter(([, v]) => v)),
        endMonth: cur?.endMonth || endFor(info.plan, cur?.firstMonth || firstMonth),
      }));
      return true;
    }
    case "PAYMENT.SALE.COMPLETED": {
      const subId = r.billing_agreement_id;
      if (!subId) return false;
      let m = await getMember(memberKey("paypal", subId));
      if (!m || !m.address) {
        const sub = await paypal(`/v1/billing/subscriptions/${subId}`);
        const info = fromPayPalSubscription(sub);
        m = await updateMember(memberKey("paypal", subId), (cur) => ({
          provider: "paypal", subId, skips: [], joinedAt: new Date().toISOString(), firstMonth: monthOf(sub.start_time || Date.now()),
          status: "pending", ...cur, ...Object.fromEntries(Object.entries(info).filter(([, v]) => v)),
        }));
      }
      const month = monthOf(r.create_time || Date.now());
      m = await updateMember(memberKey("paypal", subId), (cur) => {
        const firstMonth = cur.firstMonth && cur.firstMonth < month ? cur.firstMonth : month;
        return { ...cur, status: "active", resumeAt: null, lastPaidMonth: month, firstMonth, endMonth: cur.endMonth || endFor(cur.plan, firstMonth) };
      });
      if (await firstTimeSeen("paypal-sale", r.id)) {
        await sendPaymentEmails(m, { amount: Number(r.amount?.total || 0), currency: r.amount?.currency, month });
      }
      return true;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      const m = await getMember(memberKey("paypal", r.id));
      if (!m) return false;
      await updateMember(memberKey("paypal", r.id), (cur) => ({
        ...cur, status: event.event_type.endsWith("EXPIRED") || PLANS[cur.plan]?.months ? "ended" : "cancelled", cancelledAt: new Date().toISOString(),
        endMonth: cur.endMonth && PLANS[cur.plan]?.months ? cur.endMonth : (cur.lastPaidMonth || addMonths(cur.firstMonth, -1)),
      }));
      return true;
    }
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      return Boolean(await getMember(memberKey("paypal", r.id))); // our skip already recorded it
  }
  return false;
}
