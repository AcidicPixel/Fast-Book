# Paints by Euro: setup guide for the artist

This guide covers three things:
1. Putting the site online for free.
2. Replacing every placeholder.
3. Setting up Stripe and PayPal, testing them, and then switching to real payments yourself.

## What it costs

| Service | What it does | Cost |
|---|---|---|
| Cloudflare Workers (free plan) | Hosting, HTTPS, checkout and Print Club, contact and newsletter forms, daily Print Club job | Free: page and image requests are not limited; 100,000 checkout/form requests a day. No credits to run out. Check cloudflare.com/plans for current limits |
| Cloudflare D1 (free) | Small database for live Reserved/Sold status, Print Club members, newsletter sign-ups and messages | Free: 5 GB, millions of reads a day |
| Pages CMS | Edit works, prices and status in the browser | Free |
| Stripe | Card, Apple Pay and Google Pay | No monthly fee; a fee per sale |
| PayPal | PayPal payments | No monthly fee; a fee per sale |
| Resend | Order and Print Club emails | Free up to 3,000 emails a month |
| Cloudflare Web Analytics | Visitor counts with no cookies and no personal data, so no cookie banner | Free |
| Your own domain, e.g. paintsbyeuro.com | Needed to send emails from your own address | About £10 a year |

---

## 1. Put the site online (Cloudflare Workers)

Everything below is in the Cloudflare dashboard (dash.cloudflare.com). No command line is needed. The site runs as one Worker: it serves the pages and runs checkout, the Print Club, the forms and the daily Print Club job.

1. **Create the application.** Make a free Cloudflare account. Go to **Workers & Pages → Create application → Import a repository** (Continue with GitHub), and pick this repository.
2. **Fill in the build settings:**

   | Field | Value |
   |---|---|
   | Project name | `paints-by-euro` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler versions upload` (the default) |
   | Path / Root directory (under **Advanced settings**) | leave empty, or `/` |

   Click **Deploy**. The first build takes a few minutes, because it makes all the image sizes. You don't need a web address yet: when it finishes, Cloudflare shows the site's free address (like `https://paints-by-euro.<your-name>.workers.dev`) on the Worker's overview page.
3. **Add the address.** Copy that address. Add it as `SITE_URL` in two places: the Worker's **Settings → Variables and Secrets**, and **Settings → Build → Variables** (for the build). Then redeploy once from **Deployments**. The site works without it, but the address appears in emails and search-engine links.
4. **Database.** Nothing to do. The settings file (`wrangler.jsonc`) asks for a D1 database called `paints-by-euro`, and Cloudflare creates it on the first deploy. The site creates its table by itself. If the deploy log says it couldn't create the database, go to **Storage & Databases → D1 → Create**, name it `paints-by-euro`, and tell me its ID.
5. **Keys and settings** (sections 5–9) go in the Worker's **Settings → Variables and Secrets**. Choose **Secret** for anything secret.  Changes take effect straight away.
6. **Your own domain** (optional): in the Worker, go to **Settings → Domains & Routes → Add → Custom domain**. HTTPS is automatic. Then update `SITE_URL` in both places.
7. **Save builds** (optional): in **Settings → Build → Branch control**, turn off builds for non-production branches.
8. **Forms.** The contact form emails each message to you; this needs the Resend setup in section 5. It also keeps a copy. Newsletter sign-ups are saved too. Download both as CSV files at `/print-club/admin/`, using the `CLUB_ADMIN_PASSWORD` from section 9.

## 2. Edit the site without code (Pages CMS)

1. Go to app.pagescms.org and sign in with GitHub. Open this repository.
2. **Works:** add a work, upload its 4 photos (whole work, close detail, side edge, in a room), and set the price and status. Saving publishes the change in about a minute.
3. **Settings:** change your name, the home page line, currency, shipping costs, the tax line, social links, the prints switch and the analytics token.

Status is one of: **Available**, **Reserved**, **Sold** or **Not for sale**. Checkout sets Reserved and Sold on its own. You only change status when you hold or sell a work yourself.

---

## 3. Placeholders you must replace

### Photos: replace all of these before you sell anything
Every placeholder file name starts with `placeholder-`, and its alt text starts with "Placeholder". Sources and licences are in `src/images/PLACEHOLDER-SOURCES.md`.

- [ ] **The 9 "works" are real paintings and pen drawings by other artists**, among them Manet, Monet, Van Gogh and Millet. They are public-domain images from the Art Institute of Chicago (CC0), used only so you can see the design. Each work page says so. Never sell or present them as your own. Replace each with your own photos: the whole piece, a close detail, the side edge and the piece in a room.
- [ ] **Products:** `products/placeholder-print-oil-01.jpg`, `placeholder-print-oil-05.jpg`, `placeholder-card-oil-03.jpg`, `placeholder-postcard-pen-02.jpg`. These are mock-ups made from the placeholder art. Replace them with photos of your real prints, cards and postcards.
- [ ] **Print Club:** `print-club/placeholder-bundle-01.jpg` to `-03.jpg`, used on the home page and as "past bundles". Replace with photos of real monthly bundles.
- [ ] `about/placeholder-hands.jpg` (About page and home page): a portrait of you, or your own hands at work.
- [ ] `process/placeholder-studio-1.jpg`, `placeholder-studio-2.jpg`: your studio.
- [ ] `process/placeholder-wip-oil.jpg`, `placeholder-wip-pen.jpg`: your own work in progress.

### Pieces (`src/works/*.md`, or Works in the CMS)
- [ ] Titles "Oil I" to "Oil V" and "Pen I" to "Pen IV", with their years, prices and statuses (invented examples). The materials and sizes are those of the placeholder images.
- [ ] Each piece's text: "[A sentence or two about this piece…]", and the italic placeholder-image credit under it.
- [ ] Which piece is **Featured** on the home page (now Oil I).

### Prints, cards and postcards (`src/prints-items/*.md`, or "Prints, cards and postcards" in the CMS)
- [ ] 2 prints and 2 cards with example titles and prices (£60, £75, £4, £2): [print size], [edition], [card size], [postcard size], and the description of paper and printing.

### Settings (`src/_data/site.json`, or Settings in the CMS)
- [ ] `[Artist name]`, `[artist email]`, social links (`instagram.com/[handle]`, `facebook.com/[page]`)
- [ ] **Home page introduction**: option 1 is in use. All three options are in Settings, and in the reply that came with this change.
- [ ] **Home page artist statement**: option 1 is in use. It contains [subjects the artist paints] and [home city].
- [ ] **Tagline**: "Oil and ink, made slowly by hand." I changed "graphite" to "ink" because pencil is no longer one of your mediums. The other options are "Paint, pen, paper, patience." and "Quiet work in oil and pen."
- [ ] **Currency**: GBP is a placeholder.
- [ ] **[tax rule]**: see "Sales tax or VAT" below.
- [ ] **Shipping regions and costs** (25 / 45 / 80 are example numbers that checkout uses).
- [ ] **Print Club text**: [monthly price], [price of the 3 items bought one at a time], [saving], [print size], [shipping cost], [shipping countries], [billing date]. Also set **Billing day** (a number, 1–28; now 1) and the **shipping country codes** (now GB). The amount actually charged is set in Stripe and PayPal (section 9), so keep the two the same.
- [ ] **Gift plans**: hidden. Switch on "Show gift plans" only after you create the gift prices and plans (section 9). Also fill in [3-month gift price] and [12-month gift price].
- [ ] **Exhibitions and news**: empty, so the home page hides this section. Add an event (name, date as YYYY-MM-DD, date as shown, place) to show the next one.
- [ ] Cloudflare Web Analytics token (empty = no analytics).

### About page (`src/about.njk`)
- [ ] [artist name], [home city], [subjects the artist paints], [year started], [training or self-taught].
- [ ] Check that the reasons given for oil paint and pen sketches are true for you. I wrote them. Keep the text to 120–180 words (now 157).

### Process page (`src/process.njk`)
- [ ] Oil: [the surface], [first step], [stage], [time]. Pen: [paper and pen], [first step], [how you handle mistakes], [time]. Also the photo captions.

### Commission & Contact page (`src/commission-contact.njk`)
- [ ] [reply time], [starting price], [smallest size], [largest size], [deposit], [time].

### Print Club page (`src/print-club/index.njk`)
- [ ] Questions: [number] working days to post, [delivery time]. Past bundles: [Month and year] under each photo.

### Shipping and returns (`src/shipping-returns.njk`)
- [ ] Countries, costs per region for oil, pen sketches and prints/cards (these must match the costs in Settings), delivery times, customs, dispatch time, packing, courier, returns period, who pays for returns, commission returns, damage reporting period.

### Terms of sale and privacy policy (`src/terms.njk`, `src/privacy.njk`)
- [ ] Both are drafts marked "Draft – the artist must check this text". Both now include a Print Club section. Fill in your legal name, address, email, currency, cancellation rights, commission terms, [price change notice for Print Club members], governing law, retention periods, email provider and data protection authority. Have them checked, then remove the draft line.

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
3. In Cloudflare (your Worker → **Settings → Variables and Secrets**), add:
   - `RESEND_API_KEY`: the key
   - `EMAIL_FROM`: e.g. `Paints by Euro <orders@yourdomain.com>`
   - `ARTIST_EMAIL`: where sale notices go (your email)

Without a key, the site still works, but the emails are only written to the function log (your Worker → **Observability → Logs**). Contact messages are still saved, and you can download them at `/print-club/admin/`.

---

## 6. Stripe: set up in test mode

1. Make an account at stripe.com. Keep the **Test mode** switch on (top right).
2. **Developers → API keys:** copy the **Secret key** (`sk_test_…`). In Cloudflare, add it as `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-site>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
   - Copy the **Signing secret** (`whsec_…`). In Cloudflare, add it as `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Payment methods:** choose which methods to offer (cards, Apple Pay, Google Pay…).
5. **Settings → Business → Public details:** the name buyers see on their card statement.
6. Keys added in **Variables and Secrets** take effect straight away. No redeploy is needed.
7. Test: buy a work with card `4242 4242 4242 4242`, any future date and any CVC. Then check that:
   - the work shows **Reserved** while you are on the Stripe page;
   - after paying, it shows **Sold**, and the buyer and artist emails arrive;
   - if you press back on the Stripe page, it shows **Available** again.

## 7. PayPal: set up in sandbox (test) mode

1. You need a PayPal **Business** account (free; upgrade a personal one at paypal.com).
2. Go to developer.paypal.com, log in, and open **Apps & Credentials**. Choose **Sandbox → Create App** (type: Merchant).
3. Copy the **Client ID** and **Secret**. In Cloudflare, add:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_ENV` = `sandbox`
4. In the app, open **Webhooks → Add webhook:**
   - URL: `https://<your-site>/api/paypal/webhook`
   - Events: `Payment capture completed`, `Payment capture denied`
   - Copy the **Webhook ID** and add it in Cloudflare as `PAYPAL_WEBHOOK_ID`.
5. Trigger a deploy. Test with the sandbox **personal** account listed under **Sandbox → Accounts** (it has a test email and password).

---

## 8. Switching to live payments (only you do this)

The site refuses live keys until you deliberately switch them on. Do this only when everything works in test mode and the placeholders are replaced.

**Stripe**
1. Choose **Activate account** and give your business details, bank account and ID.
2. Turn **Test mode** off. Copy the live **Secret key** (`sk_live_…`).
3. Add the webhook again in live mode (same URL and events). This gives you a new live signing secret.
4. In Cloudflare, replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live values.

**PayPal**
1. In developer.paypal.com, choose **Apps & Credentials → Live → Create App**. Copy the live Client ID and Secret.
2. Add the live webhook (same URL and events) and copy its Webhook ID.
3. In Cloudflare, replace `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID`. Set `PAYPAL_ENV` = `live`.

**Then**
1. In Cloudflare, add `ALLOW_LIVE_PAYMENTS` = `true`. This is the safety switch.
2. Trigger a deploy. The "Test mode" label disappears from the checkout.
3. Buy something cheap yourself with each method, check that the emails arrive, then refund both payments in the Stripe and PayPal dashboards. Add 1 to that work's **Relist counter** to make it Available again.

Never paste keys into the code, the CMS or a chat. They belong only in Cloudflare's Variables and Secrets (encrypted).

## 9. Print Club subscriptions

The Print Club uses **Stripe Billing** (subscriptions) and **PayPal Subscriptions**. Do everything in test mode or the PayPal sandbox first.

### Stripe Billing (test mode)
1. **Products → Add product**: "Print Club". Add a **recurring** price: monthly, in your currency, for the monthly amount. Under **Advanced**, set the **lookup key** to `print_club_monthly`.
2. Optional gift plans: add two more recurring prices to the same product. The first is every 3 months, with lookup key `print_club_gift_3`. The second is every 12 months, with lookup key `print_club_gift_12`. Each gift is charged once; the site then sets it to end after that period.
3. **Settings → Billing → Customer portal**: turn on **Customers can update shipping address**, **update payment methods** and **cancel subscriptions** (choose "at the end of the billing period"). Save.
4. **Developers → Webhooks → your existing endpoint** (`/api/stripe/webhook`): add these events: `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.updated`. Keep the existing events.
5. Test: on the Print Club page, choose **Join with card** and pay with `4242 4242 4242 4242`. Because the first charge is on the next billing date, there is nothing to pay at sign-up. To see a payment at once in test mode, use **Billing → Subscriptions → (the subscription) → … → Advance test clock**, or temporarily set the billing day to tomorrow. Then check that both emails arrive and that the member appears at `/print-club/admin/`.

### PayPal Subscriptions (sandbox)
1. In developer.paypal.com (sandbox), or in your sandbox business account under **Pay & Get Paid → Subscriptions**, create a product "Print Club".
2. Create a **plan**: monthly, the monthly amount, no end date (infinite cycles). Copy its plan ID (starts `P-`) into Cloudflare as `PAYPAL_PLAN_MONTHLY`.
3. Optional gift plans: a plan that bills once every 3 months for 1 cycle (`PAYPAL_PLAN_GIFT_3`), and one that bills once every 12 months for 1 cycle (`PAYPAL_PLAN_GIFT_12`).
4. On your existing webhook (`/api/paypal/webhook`), add these events: `Billing subscription activated`, `Billing subscription updated`, `Billing subscription cancelled`, `Billing subscription expired`, `Billing subscription suspended`, `Payment sale completed`.
5. Test with your sandbox personal account. The first payment is taken on the billing date.

### Member self-service and your member list
1. In Cloudflare, add `CLUB_LINK_SECRET`: a long random text of 32 or more characters. It signs the "Manage my Print Club" email links.
2. Add `CLUB_ADMIN_PASSWORD`: a password of 10 or more characters. You use it at `/print-club/admin/` to see each month's members and addresses, and to download them as a CSV file.
3. **Daily job for PayPal skips:** nothing to set up. The Worker runs it every day at 10:00 UTC. It wakes PayPal members up again after a skipped month; Stripe does this by itself.
4. Members can change their address, skip one month or cancel from **Manage my Print Club** in the footer. They get an email link; there's no account to create. Card members use the Stripe portal. PayPal members change their address on the site and cancel in PayPal.

### Changing the price (no code)
- **Stripe:** add a new monthly price to the Print Club product and move the lookup key `print_club_monthly` to it ("Transfer lookup key"). New members pay the new price. **Current members keep their old price** until you move them yourself, in Stripe under each subscription → Update subscription.
- **PayPal:** create a new plan at the new price and put its ID in `PAYPAL_PLAN_MONTHLY`. Current members stay on the old plan until you change them.
- Then update the price text in Settings → Print Club.

### Going live with the Print Club
Do this at the same time as section 8:
- create the live Stripe prices with the same lookup keys, and set up the live customer portal;
- create live PayPal plans and put their IDs in the `PAYPAL_PLAN_…` variables;
- add the new webhook events to the live webhooks.

## All environment variables (your Worker → Settings → Variables and Secrets)

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
| `PAYPAL_PLAN_MONTHLY` | `P-…` | Print Club (PayPal) |
| `PAYPAL_PLAN_GIFT_3`, `PAYPAL_PLAN_GIFT_12` | `P-…` | Optional gift plans (PayPal) |
| `CLUB_LINK_SECRET` | 32+ random characters | Print Club member links |
| `CLUB_ADMIN_PASSWORD` | 10+ characters | Print Club member list |
| `CRON_SECRET` | 24+ random characters | Optional: only if you want to run the daily job by hand at `/api/club/resume` |
| `SITE_URL` | `https://paintsbyeuro.com` | Links in emails and the sitemap (also a build variable) |
| `ALLOW_LIVE_PAYMENTS` | `true` (only when going live) | Live payments |
