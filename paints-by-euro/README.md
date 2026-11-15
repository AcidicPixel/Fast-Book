# Paints by Euro

Portfolio and shop for an artist who works in oil paint and pen, with prints, cards, postcards and a monthly Print Club.
Static site (Eleventy) + Netlify serverless functions for Stripe Checkout and PayPal.

The artist's setup guide, the list of placeholders to replace and the steps to go live are in **[SETUP-FOR-ARTIST.md](SETUP-FOR-ARTIST.md)**.

## Site map

```
/                          Home: hero (work + introduction), about the artist, the four collections,
                           new work, Print Club, commissions, next event (hidden if none), newsletter
/collections/              All pieces; filters Medium (All, Oil Paint, Pen Sketches, Prints, Cards & Postcards)
                           and Show (All, Available); ?medium=oil|pen|print|card preselects; zoom viewer
/collections/<slug>/       One page per original: facts, photo slider, Buy / Make an enquiry
/prints/                   Prints, and Cards & Postcards (each with #slug anchor and Buy)
/print-club/               Monthly bundle (1 print, 1 card, 1 postcard): price, saving, join, past bundles, Q&A
/print-club/manage/        Members: email link → change address, skip a month, cancel (noindex)
/print-club/admin/         Artist: this month's members and addresses, CSV export (password; noindex)
/print-club/welcome/       After sign-up (noindex)
/about/  /process/
/commission-contact/       Commissions first, then the contact form (subjects include Print Club)
/shipping-returns/  /terms/ (draft)  /privacy/ (draft)
/checkout/  /checkout/cancelled/  /thank-you/  /thanks/  /404.html  /sitemap.xml  /catalog.json

Old addresses (301 via _redirects, plus fallback pages): /work → /collections, /work/<slug>/ → /collections/<slug>/,
/work/pencil-0N/ → /collections/pen-0N/, /contact → /commission-contact

/api/club/config                 GET   public Print Club settings
/api/club/stripe-checkout        POST  Stripe Billing subscription (Checkout)
/api/club/paypal-subscription    POST  PayPal subscription
/api/club/manage-link            POST  email a one-hour sign-in link
/api/club/me | portal | skip | address   member self-service
/api/club/members                GET   artist list (JSON / CSV), Authorization: Bearer CLUB_ADMIN_PASSWORD
club-resume                      daily scheduled: resumes PayPal members after a skipped month
/api/stripe/webhook, /api/paypal/webhook also handle subscription events
(plus the original-artwork checkout endpoints: /api/status, /api/config, /api/stripe/*, /api/paypal/*, /api/release)
```

## Design system

**Colour.** Three neutrals and one pigment. No colour is ever placed behind artwork: frames, viewer and cards are transparent on paper. Every text colour is at least 7:1 on the paper, measured on the darkest pixel of the texture.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--paper` | `#F4EFE6` warm off-white | background on every page | — |
| `--graphite` | `#1E1C19` | text | 14.8:1 (13.7 on darkest texture) |
| `--graphite-soft` | `#45423C` | secondary text | 8.7:1 (8.1) |
| `--accent` | `#9A4526` dark clay | the one accent: buttons, link lines, hover, focus, small details (dots) | 5.6:1 (5.2) |
| `--rule` | `#CFC7B9` | hairlines only, never text | — |

There is no blue anywhere on the site. Body text stays graphite (7:1 or more). Clay is used only where 4.5:1 is enough: buttons, link lines, hover states and small details. The hex also appears in the `--line-accent` SVG and the favicon.

**Background.** `#F4EFE6`, plus a seamless 640 px handmade-paper tile (`src/assets/paper-texture.webp`, 28 KB) with fibres and uneven tone. It sits at 6% opacity on a fixed layer behind all content, so it is never on top of artwork. Rebuild it with `node scripts/make-paper-texture.mjs`.

**Type.** Two self-hosted families, so no third-party font requests.
- Headings: *Fraunces*, weight 500 (italic for the wordmark and work titles in captions).
- Body: *Source Sans 3*, weight 400, line height 1.6, 18 px on phones rising to 20 px on desktop.
- Wordmark: Fraunces 500, upright, 27 px, letter spacing 0.03em (fits at 320 px).
- Scale: 18–20 (the minimum for any text) · 25 · 31–40 · 40–62 · 48–90 px.
- Home sections are 64 px apart on phones, 80 px on tablets and 112 px on desktop.

**Space.** 4 · 8 · 16 · 24 · 40 · 64 · 104 · 160 px (`--s-1` … `--s-8`). Side gutter 16–64 px. Content max width 1440 px. A 12-column grid places work off-centre.

**Motion.** Simple and quiet.
- Paintings, captions and headings fade up once (24 px, 0.7 s) as they come into view. Paintings side by side follow each other by 80 ms, and captions follow their painting by 150 ms. Anything already on screen when the page opens appears straight away.
- The browser runs these as CSS transitions, so no script runs while scrolling. Nothing is pinned, and scrolling speed is never changed.
- One easing curve: `cubic-bezier(0.22, 1, 0.36, 1)`. Only `opacity` and `transform` are animated.
- Viewer: the painting grows from its place on the page and goes back on close. Next and previous use a 700 ms crossfade, and swiping follows your finger. The photo slider crossfades in 600 ms.
- Page changes: a 450 ms crossfade (View Transitions, where supported).
- Reduced motion: only 200 ms fades.

## Content and images

- Originals: one Markdown file per piece in `src/works/` (medium `oil` or `pen`). Prints, cards and postcards: `src/prints-items/` (type `print` or `card`). Both are (edited through Pages CMS, see `.pages.yml` at the repo root).
- Settings: `src/_data/site.json` (currency, shipping, tax line, socials, prints switch, analytics).
- Photos: put JPG or PNG files in `src/images/`. The build makes WebP at 480, 1024 and 2048 px wide (never enlarged). 1024 and 2048 get a small watermark; the 480 thumbnail does not. All images except the first on a page are lazy-loaded.
- Alt text is generated as "Placeholder: Title, oil painting" / "Title, pen sketch (close detail)" / "Title, print" / "Title, card".
- `npm run placeholders` rebuilds the placeholder photos from their sources (Art Institute of Chicago CC0 artworks; Pexels room and studio photos). Sources and licences: `src/images/PLACEHOLDER-SOURCES.md`.

## Live status (Reserved / Sold)

The artist sets status in the content file. Checkout adds a live layer in Netlify Blobs:
- Starting checkout writes a hold for 31 minutes. The write is conditional, so two buyers can't both get it. (Stripe's shortest session is 30 minutes; the extra minute covers clock differences.)
- No payment in that time: the hold simply expires and the work shows Available again. Stripe's `checkout.session.expired` event or the cancel page releases it sooner.
- Only a signature-verified webhook marks a work Sold and sends the emails. The return page is never trusted.
- Repeated webhooks don't repeat emails. A second payment for an already-sold work emails the artist to refund it.
- If a sold work comes back (e.g. refunded), add 1 to its **Relist counter** in the CMS.

## Develop

```bash
cd paints-by-euro
npm install
npm start          # http://localhost:8080 (pages only; /api needs `netlify dev`)
npm test           # builds, then runs the payment tests with mock Stripe/PayPal
npx netlify dev    # pages + functions locally, with your test keys in .env
```

Environment variables are listed in SETUP-FOR-ARTIST.md. Live keys are refused unless `ALLOW_LIVE_PAYMENTS=true`.
