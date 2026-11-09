# Paints by Euro

Portfolio and shop for an artist who works in oil paint and pencil.
Static site (Eleventy) + Netlify serverless functions for Stripe Checkout and PayPal.

The artist's setup guide, the list of placeholders to replace and the steps to go live are in **[SETUP-FOR-ARTIST.md](SETUP-FOR-ARTIST.md)**.

## Site map

```
/                         Home: featured work, who the artist is, 4 recent works
/work/                    Work: grid of all works, filters (medium; all/available), full-screen zoom viewer
/work/<slug>/             Work detail: one page per work, facts, extra-photo slider, Buy / Make an enquiry
/about/                   About (first person, placeholders for facts)
/process/                 Process: studio photos, how an oil painting / a pencil drawing starts
/contact/                 Contact form, how commissions work, social links
/shipping-returns/        Shipping costs, countries, delivery times, returns (placeholders)
/terms/                   Terms of sale (draft)
/privacy/                 Privacy policy (draft)
/prints/                  Prints (hidden until prints.enabled = true in Settings)
/checkout/?work=<slug>    Checkout step: shipping region, total, Stripe + PayPal side by side (noindex)
/checkout/cancelled/      Stripe "back" page: releases the 30-minute hold (noindex)
/thank-you/               After payment: "being confirmed" (noindex)
/thanks/                  After a contact / newsletter form (noindex)
/404.html, /sitemap.xml, /robots.txt, /catalog.json

/api/status                    GET   live status of every work
/api/config                    GET   public checkout settings (no secrets)
/api/stripe/create-session     POST  hold work 30 min → Stripe Checkout URL
/api/stripe/webhook            POST  verified Stripe events → Sold + emails / release hold
/api/paypal/create-order       POST  hold work 30 min → PayPal order
/api/paypal/capture-order      POST  capture if hold valid and address in region
/api/paypal/webhook            POST  verified PayPal events → Sold + emails
/api/release                   POST  buyer cancelled → release hold
```

## Design system

**Colour.** Three neutrals and one pigment. No colour is ever placed behind artwork: frames, viewer and cards are transparent on paper. Every text colour is at least 7:1 on the paper, measured on the darkest pixel of the texture.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--paper` | `#F4EFE6` warm off-white | background on every page | — |
| `--graphite` | `#1E1C19` | text | 14.8:1 (13.7 on darkest texture) |
| `--graphite-soft` | `#45423C` | secondary text | 8.7:1 (8.1) |
| `--pigment` | `#2A3990` ultramarine | the one accent: hover, focus, "Available" | 8.8:1 (8.1) |
| `--rule` | `#CFC7B9` | hairlines only, never text | — |

The pigment is a placeholder. Set it to a pigment from the artist's own paintings (`--pigment` in `src/assets/css/site.css`, plus the hex in the `--pencil-pigment` SVG and the favicon).

**Background.** `#F4EFE6`, plus a seamless 640 px handmade-paper tile (`src/assets/paper-texture.webp`, 28 KB) with fibres and uneven tone. It sits at 6% opacity on a fixed layer behind all content, so it is never on top of artwork. Rebuild it with `node scripts/make-paper-texture.mjs`.

**Type.** Two self-hosted families, so no third-party font requests.
- Headings: *Fraunces*, weight 500 (italic for the wordmark and work titles in captions).
- Body: *Source Sans 3*, weight 400, line height 1.6.
- Scale: 18 (the minimum for any text) · 22 · 28–36 · 36–56 · 44–80 px.

**Space.** 4 · 8 · 16 · 24 · 40 · 64 · 104 · 160 px (`--s-1` … `--s-8`). Side gutter 16–64 px. Content max width 1440 px. A 12-column grid places work off-centre.

**Motion.** Simple and quiet.
- Paintings, captions and headings fade up once (24 px, 0.7 s) as they come into view. Paintings side by side follow each other by 80 ms, and captions follow their painting by 150 ms. Anything already on screen when the page opens appears straight away.
- The browser runs these as CSS transitions, so no script runs while scrolling. Nothing is pinned, and scrolling speed is never changed.
- One easing curve: `cubic-bezier(0.22, 1, 0.36, 1)`. Only `opacity` and `transform` are animated.
- Viewer: the painting grows from its place on the page and goes back on close. Next and previous use a 700 ms crossfade, and swiping follows your finger. The photo slider crossfades in 600 ms.
- Page changes: a 450 ms crossfade (View Transitions, where supported).
- Reduced motion: only 200 ms fades.

## Content and images

- Works: one Markdown file per work in `src/works/` (edited through Pages CMS, see `.pages.yml` at the repo root).
- Settings: `src/_data/site.json` (currency, shipping, tax line, socials, prints switch, analytics).
- Photos: put JPG or PNG files in `src/images/`. The build makes WebP at 480, 1024 and 2048 px wide (never enlarged). 1024 and 2048 get a small watermark; the 480 thumbnail does not. All images except the first on a page are lazy-loaded.
- Alt text is generated as "Title, oil painting" / "Title, pencil drawing (close detail)".
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
