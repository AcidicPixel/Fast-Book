// ============================================================
//  YOUR PAINTINGS — add, edit or remove entries here.
// ============================================================
//
//  For each painting:
//    id        A short unique name with no spaces (used in links).
//    title     The painting's title.
//    image     Path to the photo, e.g. "images/my-painting.jpg".
//              Put the photo file in the images/ folder.
//    price     Number only, no currency sign (e.g. 250).
//    medium    e.g. "Oil on canvas".
//    size      e.g. "40 × 50 cm".
//    year      e.g. 2026.
//    description  A sentence or two about the piece.
//    status    "available" or "sold".
//    buyLink   Your Stripe Payment Link (https://buy.stripe.com/...).
//              Leave as "" and the button becomes "Enquire to buy",
//              which opens an email to you instead.
//
//  Tip: the list order here is the order shown on the site.
// ============================================================
window.PAINTINGS = [
  {
    id: "evening-glow",
    title: "Evening Glow",
    image: "images/sample-sunset.svg",
    price: 320,
    medium: "Acrylic on canvas",
    size: "40 × 50 cm",
    year: 2026,
    description: "The last light of a summer evening sinking behind the hills.",
    status: "available",
    buyLink: "",
  },
  {
    id: "spring-meadow",
    title: "Spring Meadow",
    image: "images/sample-meadow.svg",
    price: 280,
    medium: "Oil on board",
    size: "50 × 40 cm",
    year: 2026,
    description: "Wildflowers scattered across rolling green fields.",
    status: "available",
    buyLink: "",
  },
  {
    id: "composition-no-3",
    title: "Composition No. 3",
    image: "images/sample-abstract.svg",
    price: 450,
    medium: "Acrylic on canvas",
    size: "60 × 60 cm",
    year: 2025,
    description: "Bold blocks of colour balanced against one another.",
    status: "sold",
    buyLink: "",
  },
  {
    id: "calm-waters",
    title: "Calm Waters",
    image: "images/sample-sea.svg",
    price: 260,
    medium: "Watercolour on paper",
    size: "50 × 35 cm",
    year: 2025,
    description: "A lone sail on a still morning sea.",
    status: "available",
    buyLink: "",
  },
];
