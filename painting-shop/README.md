# Painting Shop

A simple website for selling original paintings. It's plain HTML, CSS and JavaScript, so there's no server, no database and nothing to install.

## What it costs

| Thing | Cost |
|---|---|
| Building it | Free |
| Hosting (GitHub Pages, Netlify or Cloudflare Pages) | Free |
| Taking payments (Stripe Payment Links) | No monthly fee. Stripe takes a small cut of each sale (around 1.5% + 20p for UK cards; check stripe.com/pricing for your country) |
| Your own domain name, e.g. `yourname.art` (optional) | About £10/year |

You only pay anything when you actually sell a painting.

## Try it on your computer

Double-click `index.html` and it opens in your browser. That's all you need to do.

## Adding your paintings

1. Take a good photo of each painting: straight on, in daylight, cropped to the edges of the canvas. A JPG about 1600px on its longest side is plenty.
2. Put the photo in the `images/` folder, e.g. `images/harbour-at-dawn.jpg`.
3. Open `paintings.js` and copy one of the existing entries, then change the details:

```js
{
  id: "harbour-at-dawn",
  title: "Harbour at Dawn",
  image: "images/harbour-at-dawn.jpg",
  price: 350,
  medium: "Oil on canvas",
  size: "40 × 50 cm",
  year: 2026,
  description: "Fishing boats waiting for the tide.",
  status: "available",   // change to "sold" once it sells
  buyLink: "",           // your Stripe Payment Link, see below
},
```

4. Delete the four sample paintings and the `sample-*.svg` files in `images/` once you've added your own.
5. Open `config.js` and fill in your name, email, about text and currency.

## Taking payments with Stripe (no monthly fee)

If a painting has no `buyLink`, its button says **Enquire to buy** and opens an email to you. That works fine to start with: agree the sale by email and send a payment request.

To let people pay straight away:

1. Create a free account at [stripe.com](https://stripe.com).
2. Go to **Payment Links → New**, add a product with the painting's name, photo and price.
3. Under the options:
   - turn on **Collect customers' addresses** (shipping address), so you know where to send it.
   - under **Advanced options**, turn on **Limit the number of payments** and set it to **1**. Each painting is an original, so this stops two people buying the same one.
4. Copy the link (it looks like `https://buy.stripe.com/...`) and paste it into that painting's `buyLink`.

Stripe emails you when someone buys. Then set the painting's `status` to `"sold"` so the site shows it as sold.

*(PayPal.me or a PayPal "Buy Now" link also works in `buyLink` if you'd rather use PayPal.)*

## Putting the site online for free

Pick **one** of these.

### Option A: Netlify drag-and-drop (easiest)
1. Sign up at [netlify.com](https://netlify.com) (free).
2. Go to **Sites → Add new site → Deploy manually**.
3. Drag the whole `painting-shop` folder onto the page. You get a link like `your-name.netlify.app`.
4. To update the site later, drag the folder on again.

### Option B: GitHub Pages (updates automatically)
This repo includes `.github/workflows/deploy-painting-shop.yml`, which publishes the `painting-shop` folder whenever you push changes to it on `main`.

1. On GitHub, go to the repo's **Settings → Pages**.
2. Under **Source**, choose **GitHub Actions**.
3. Merge to `main`. The site appears at `https://<your-github-username>.github.io/<repo-name>/`.

> GitHub Pages is free for **public** repos. A private repo needs a paid GitHub plan, so use Netlify or Cloudflare Pages instead if you want to keep it private. Both can connect to a private GitHub repo for free: set the "publish directory" to `painting-shop` and leave the build command empty.

### Custom domain (optional)
All three hosts let you attach your own domain for free. You just pay the registrar for the domain itself (Cloudflare Registrar and Porkbun are cheap and charge no markup on renewals).

## Files

| File | What it's for |
|---|---|
| `config.js` | Your name, email, about text, currency, social links |
| `paintings.js` | The list of paintings for sale |
| `images/` | Photos of your paintings |
| `index.html` | Page layout (you won't usually need to touch it) |
| `styles.css` | Colours and fonts. Change `--accent` at the top to change the button colour |
| `app.js` | Makes the gallery work (no need to edit) |

## Sharing a single painting

Each painting has its own link, e.g. `your-site.com/#painting-harbour-at-dawn`. That opens the site with the painting already showing, which is handy for Instagram bios and posts.
