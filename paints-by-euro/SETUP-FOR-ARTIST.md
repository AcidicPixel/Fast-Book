# Paints by Euro: setup guide for the artist

This guide covers three things:
1. Putting the site online for free.
2. Replacing every placeholder.
3. Setting up Stripe and PayPal, testing them, and then switching to real payments yourself.

## What it costs

| Service | What it does | Cost |
|---|---|---|
| Netlify (free plan) | Hosting, HTTPS, checkout functions, contact and newsletter forms, live Sold/Reserved status | Free for a site this size. Check netlify.com/pricing for current limits |
| Pages CMS | Edit works, prices and status in the browser | Free |
| Stripe | Card, Apple Pay and Google Pay | No monthly fee; a fee per sale |
| PayPal | PayPal payments | No monthly fee; a fee per sale |
| Resend | Order confirmation emails | Free up to 3,000 emails a month |
| Cloudflare Web Analytics | Visitor counts with no cookies and no personal data, so no cookie banner | Free |
| Your own domain, e.g. paintsbyeuro.com | Needed to send emails from your own address | About £10 a year |

---

## 1. Put the site online (Netlify)

1. Make a free account at netlify.com and choose **Add new site → Import an existing project → GitHub**. Pick this repository.
2. Netlify reads `netlify.toml` and builds the `paints-by-euro` folder. Leave the build settings as they are.
3. Go to **Site configuration → Forms** and turn on **form detection**. Then redeploy once. Under **Forms → Form notifications**, add an email notification so contact messages reach you.
4. HTTPS is switched on automatically. To use your own domain, go to **Domain management**.
5. The newsletter sign-ups appear under **Forms → newsletter**. Export them when you send an update. When the list grows, you can move it to a newsletter service such as Buttondown, which is free for small lists.

## 2. Edit the site without code (Pages CMS)

1. Go to app.pagescms.org and sign in with GitHub. Open this repository.
2. **Works:** add a work, upload its 4 photos (whole work, close detail, side edge, in a room), and set the price and status. Saving publishes the change in about a minute.
3. **Settings:** change your name, the home page line, currency, shipping costs, the tax line, social links, the prints switch and the analytics token.

Status is one of: **Available**, **Reserved**, **Sold** or **Not for sale**. Checkout sets Reserved and Sold on its own. You only change status when you hold or sell a work yourself.

---

## 3. Placeholders you must replace

### Photos (all in `src/images/`, labelled "PLACEHOLDER" in the image)
- [ ] 9 placeholder works, each with a main photo, close detail, side edge and in-a-room photo (`works/oil-01` … `works/pencil-04`). Delete them once your own works are in.
- [ ] `about/hands.jpg`: a portrait of you, or your hands at work.
- [ ] `process/studio-1.jpg` and `process/studio-2.jpg`: the studio.
- [ ] `process/wip-oil.jpg` and `process/wip-pencil.jpg`: works in progress.

### Works (`src/works/*.md`, or Works in the CMS)
- [ ] Titles "Oil I" to "Oil V" and "Pencil I" to "Pencil IV", with their years, materials, sizes, prices and statuses (all invented examples).
- [ ] Each work's text: "[A sentence or two about this work…]".
- [ ] Which work is **Featured** on the home page (now Oil I).

### Settings (`src/_data/site.json`, or Settings in the CMS)
- [ ] `[Artist name]` (appears on Home and About and in search descriptions)
- [ ] `[home city]` in the home page line
- [ ] `[artist email]`
- [ ] Social links: `instagram.com/[handle]`, `facebook.com/[page]`
- [ ] **Currency:** set to `GBP` as a placeholder. Change it to your currency, e.g. EUR or USD.
- [ ] **[tax rule]:** see "Sales tax or VAT" below
- [ ] Shipping regions: `[Home country]` label and country code (now `GB`); the Europe list
- [ ] **Shipping costs** 25 / 45 / 80. These are example numbers and the checkout uses them, so set your real costs.
- [ ] Cloudflare Web Analytics token (empty = no analytics)

### About page (`src/about.njk`)
- [ ] [artist name], [home city], [subjects the artist paints], [year started], [training or self-taught]
- [ ] Check that the reasons given for using oil and pencil are true for you. I wrote them; change them freely. Keep the text to 120–180 words (now 145).

### Process page (`src/process.njk`)
- [ ] The two short texts: [the surface], [first step], [stage], [time], [paper and pencils], [technique]
- [ ] Photo captions

### Contact page (`src/contact.njk`)
- [ ] [reply time]
- [ ] Commissions: [starting price], [smallest size], [largest size], [deposit], [time]

### Shipping and returns (`src/shipping-returns.njk`)
- [ ] Countries, costs per region for oil and pencil (these must match the costs in Settings), delivery times, customs, dispatch time, packing, courier, returns period, who pays for returns, commission returns, damage reporting period

### Terms of sale and privacy policy (`src/terms.njk`, `src/privacy.njk`)
- [ ] Both are drafts marked "Draft – the artist must check this text". Fill in your legal name, address, email, currency, the cancellation rights in your country, commission terms, governing law, how long you keep data, your email provider and your data protection authority. Have them checked, then remove the draft line.

### Prints (optional, hidden now)
- [ ] `src/prints-items/print-oil-01.md`: [print size], [edition], price 60 (example), description. Also the intro text in `src/prints.njk`.
- [ ] Turn on **Prints page** in Settings when you are ready. The link then appears in the footer, and prints use the same checkout.

### Design
- [ ] Accent colour: ultramarine `#2B3C9B` is a stand-in. Pick a pigment from your own paintings and I can set it everywhere.

---

## 4. Sales tax or VAT: a question for you

The checkout shows a line "Tax: [tax rule]" and adds no tax. Please tell me:
- Are you registered for VAT or sales tax, and in which country?
- Are your prices tax-inclusive, or should tax be added?
- Do you sell to buyers in other countries who might owe import tax?

Your answer decides the text of that line. It may also mean switching on Stripe Tax, which charges a small extra fee per sale.

---

## 5. Order emails (Resend)

1. Make a free account at resend.com. Add and verify your domain. This needs your own domain; until then Resend only sends to your own address.
2. Create an API key.
3. In Netlify → **Site configuration → Environment variables**, add:
   - `RESEND_API_KEY`: the key
   - `EMAIL_FROM`: e.g. `Paints by Euro <orders@yourdomain.com>`
   - `ARTIST_EMAIL`: where sale notices go (your email)

Without a key, the site still works, but the emails are only written to the Netlify function log.

---

## 6. Stripe: set up in test mode

1. Make an account at stripe.com. Keep the **Test mode** switch on (top right).
2. **Developers → API keys:** copy the **Secret key** (`sk_test_…`). In Netlify, add it as `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-site>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
   - Copy the **Signing secret** (`whsec_…`). In Netlify, add it as `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Payment methods:** choose which methods to offer (cards, Apple Pay, Google Pay…).
5. **Settings → Business → Public details:** the name buyers see on their card statement.
6. In Netlify, choose **Deploys → Trigger deploy** so the new keys are used.
7. Test: buy a work with card `4242 4242 4242 4242`, any future date and any CVC. Then check that:
   - the work shows **Reserved** while you are on the Stripe page;
   - after paying, it shows **Sold**, and the buyer and artist emails arrive;
   - if you press back on the Stripe page, it shows **Available** again.

## 7. PayPal: set up in sandbox (test) mode

1. You need a PayPal **Business** account (free; upgrade a personal one at paypal.com).
2. Go to developer.paypal.com, log in, and open **Apps & Credentials**. Choose **Sandbox → Create App** (type: Merchant).
3. Copy the **Client ID** and **Secret**. In Netlify, add:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV` = `sandbox`
4. In the app, open **Webhooks → Add webhook:**
   - URL: `https://<your-site>/api/paypal/webhook`
   - Events: `Payment capture completed`, `Payment capture denied`
   - Copy the **Webhook ID** and add it in Netlify as `PAYPAL_WEBHOOK_ID`.
5. Trigger a deploy. Test with the sandbox **personal** account listed under **Sandbox → Accounts** (it has a test email and password).

---

## 8. Switching to live payments (only you do this)

The site refuses live keys until you deliberately switch them on. Do this only when everything works in test mode and the placeholders are replaced.

**Stripe**
1. Choose **Activate account** and give your business details, bank account and ID.
2. Turn **Test mode** off. Copy the live **Secret key** (`sk_live_…`).
3. Add the webhook again in live mode (same URL and events). This gives you a new live signing secret.
4. In Netlify, replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live values.

**PayPal**
1. In developer.paypal.com, choose **Apps & Credentials → Live → Create App**. Copy the live Client ID and Secret.
2. Add the live webhook (same URL and events) and copy its Webhook ID.
3. In Netlify, replace `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID`. Set `PAYPAL_ENV` = `live`.

**Then**
1. In Netlify, add `ALLOW_LIVE_PAYMENTS` = `true`. This is the safety switch.
2. Trigger a deploy. The "Test mode" label disappears from the checkout.
3. Buy something cheap yourself with each method, check that the emails arrive, then refund both payments in the Stripe and PayPal dashboards. Add 1 to that work's **Relist counter** to make it Available again.

Never paste keys into the code, the CMS or a chat. They belong only in Netlify's environment variables.

## All environment variables

| Name | Example | Needed for |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` | Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Stripe |
| `PAYPAL_CLIENT_ID` | `AY…` | PayPal |
| `PAYPAL_CLIENT_SECRET` | `EL…` | PayPal |
| `PAYPAL_WEBHOOK_ID` | `8PT…` | PayPal |
| `PAYPAL_ENV` | `sandbox` or `live` | PayPal |
| `RESEND_API_KEY` | `re_…` | Emails |
| `EMAIL_FROM` | `Paints by Euro <orders@…>` | Emails |
| `ARTIST_EMAIL` | `you@…` | Emails |
| `ALLOW_LIVE_PAYMENTS` | `true` (only when going live) | Live payments |
