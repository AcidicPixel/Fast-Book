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

**Colour.** Three neutrals and one pigment. No colour is ever placed behind artwork: frames, viewer and cards are transparent on paper.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F3F1EC` + fine grain texture | page background |
| `--graphite` | `#232326` | text, solid buttons |
| `--graphite-soft` | `#5C5B61` | secondary text (6:1 contrast) |
| `--rule` | `#CDC9C0` | hairlines |
| `--pigment` | `#2B3C9B` ultramarine | the only accent: hover, focus, "Available" |

The pigment is a placeholder. Set it to a pigment that appears in the artist's own paintings (one line in `src/assets/css/site.css`, plus the two pencil-line SVGs and the favicon that use the same hex).

**Type.** Self-hosted, so no third-party font requests.
- Display: *Bodoni Moda* (variable, with optical sizes): page titles, work titles, the wordmark (italic).
- Body: *Instrument Sans* (variable): text, labels, buttons.
- Scale: 13 · 15 · 17 · 22 · 28–38 · 36–68 · 44–104 px (the top three are fluid).
- Labels: 13 px uppercase with 0.1–0.12em letter-spacing. Sizes read "h × w (× d) cm", the convention for artwork.

**Space.** 4 · 8 · 16 · 24 · 40 · 64 · 104 · 160 px (`--s-1` … `--s-8`). Side gutter: 16 px on phones to 64 px. Content max width: 1440 px. A 12-column grid places work off-centre on Home, About and Process.

**Motion.** Every effect is slow and quiet, moves only opacity, transform or mask, never loops, never covers the art, and is switched off by `prefers-reduced-motion`.
- Brush-stroke page transition: the new page wipes in behind a dry-brush edge, 1 s (cross-document View Transitions; other browsers simply change page).
- Pencil-line underlines draw in on hover or focus, 0.9 s.
- Cards lift 4 px on hover. The featured work drifts up to 40 px with scroll.
- Viewer: smooth zoom (0.38 s) for buttons and keys, direct for pinch, drag and wheel.

**Artsy details.** Paper grain on the background, hand-drawn pencil underlines, pencil-hatch "reserved" mark, brush-stroke transition, and a small watermark on the large images.

## Content and images

- Works: one Markdown file per work in `src/works/` (edited through Pages CMS, see `.pages.yml` at the repo root).
- Settings: `src/_data/site.json` (currency, shipping, tax line, socials, prints switch, analytics).
- Photos: put JPG or PNG files in `src/images/`. The build makes WebP at 480, 1024 and 2048 px wide (never enlarged). 1024 and 2048 get a small watermark; the 480 thumbnail does not. All images except the first on a page are lazy-loaded.
- Alt text is generated as "Title, oil painting" / "Title, pencil drawing (close detail)".
- `npm run placeholders` regenerates the labelled placeholder photos.

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
