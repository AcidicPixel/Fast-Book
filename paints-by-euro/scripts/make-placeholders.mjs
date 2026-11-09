// Generates clearly-labelled placeholder images so the site can be built and
// reviewed before the artist supplies real photographs.
// Run: npm run placeholders   (only needed once; the output is committed)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("src/images");

// Seeded random so the placeholders are the same on every run.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];

const oils = [
  { slug: "oil-01", w: 1600, h: 1200, pal: ["#2B3C9B", "#D9A441", "#E8E1CF", "#6E3B2A", "#1E2433"] },
  { slug: "oil-02", w: 1200, h: 1500, pal: ["#4D6B4A", "#C9B98A", "#2B3C9B", "#EDE6D3", "#8A5A3C"] },
  { slug: "oil-03", w: 1500, h: 1500, pal: ["#B4472F", "#E3C27A", "#2C2B2F", "#F0EADB", "#5D7385"] },
  { slug: "oil-04", w: 1600, h: 1100, pal: ["#7B8FA6", "#E9E2D0", "#3B4A63", "#C7883E", "#262A31"] },
  { slug: "oil-05", w: 1200, h: 1600, pal: ["#2B3C9B", "#7E9C9A", "#F2ECDD", "#A3423A", "#1F1E22"] },
];
const pencils = [
  { slug: "pencil-01", w: 1200, h: 1600 },
  { slug: "pencil-02", w: 1600, h: 1200 },
  { slug: "pencil-03", w: 1200, h: 1500 },
  { slug: "pencil-04", w: 1300, h: 1600 },
];

const label = (w, h, text, dark = false) => `
  <g font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.round(w * 0.022)}" letter-spacing="2">
    <rect x="${w * 0.03}" y="${h - w * 0.075}" width="${text.length * w * 0.0155 + w * 0.03}" height="${w * 0.045}" fill="${dark ? "#232326" : "#F3F1EC"}" opacity="0.85"/>
    <text x="${w * 0.045}" y="${h - w * 0.043}" fill="${dark ? "#F3F1EC" : "#232326"}">${text}</text>
  </g>`;

function oilSvg({ w, h, pal }, title) {
  let shapes = `<rect width="${w}" height="${h}" fill="${pal[3]}"/>`;
  // Big colour fields, then many short "brush strokes".
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w * 0.8, y = rnd() * h * 0.8;
    shapes += `<rect x="${x}" y="${y}" width="${w * (0.25 + rnd() * 0.5)}" height="${h * (0.2 + rnd() * 0.4)}" fill="${pick(pal)}" opacity="${0.55 + rnd() * 0.4}" transform="rotate(${rnd() * 8 - 4} ${x} ${y})"/>`;
  }
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h, len = w * (0.03 + rnd() * 0.09);
    shapes += `<rect x="${x}" y="${y}" width="${len}" height="${len * (0.12 + rnd() * 0.2)}" rx="${len * 0.05}" fill="${pick(pal)}" opacity="${0.35 + rnd() * 0.5}" transform="rotate(${rnd() * 50 - 25} ${x} ${y})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><filter id="b"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed="${Math.floor(rnd() * 99)}"/><feDisplacementMap in="SourceGraphic" scale="${w * 0.03}"/></filter>
    <filter id="g"><feTurbulence baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.10 0"/></filter></defs>
    <g filter="url(#b)">${shapes}</g><rect width="${w}" height="${h}" filter="url(#g)"/>
    ${label(w, h, `PLACEHOLDER · ${title}`)}</svg>`;
}

function pencilSvg({ w, h }, title) {
  let lines = "";
  // Contour-like curves plus hatching blocks.
  for (let i = 0; i < 26; i++) {
    const x0 = w * (0.15 + rnd() * 0.7), y0 = h * (0.15 + rnd() * 0.7);
    const d = `M${x0} ${y0} C ${x0 + (rnd() - 0.5) * w * 0.6} ${y0 + (rnd() - 0.5) * h * 0.5}, ${x0 + (rnd() - 0.5) * w * 0.6} ${y0 + (rnd() - 0.5) * h * 0.5}, ${x0 + (rnd() - 0.5) * w * 0.5} ${y0 + (rnd() - 0.5) * h * 0.5}`;
    lines += `<path d="${d}" fill="none" stroke="#2a2a2e" stroke-width="${1 + rnd() * 2.2}" opacity="${0.35 + rnd() * 0.5}"/>`;
  }
  for (let b = 0; b < 6; b++) {
    const bx = w * (0.1 + rnd() * 0.6), by = h * (0.1 + rnd() * 0.6), bw = w * (0.1 + rnd() * 0.25), bh = h * (0.08 + rnd() * 0.2);
    const ang = rnd() * 60 - 30;
    let hatch = "";
    for (let k = 0; k < bw; k += 5 + rnd() * 5) hatch += `<line x1="${bx + k}" y1="${by}" x2="${bx + k + bh * 0.3}" y2="${by + bh}" stroke="#2a2a2e" stroke-width="${0.8 + rnd()}" opacity="${0.25 + rnd() * 0.4}"/>`;
    lines += `<g transform="rotate(${ang} ${bx} ${by})">${hatch}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0 0.3  0 0 0 0.07 0"/></filter>
    <filter id="r"><feTurbulence baseFrequency="0.4" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs>
    <rect width="${w}" height="${h}" fill="#F6F3EC"/><rect width="${w}" height="${h}" filter="url(#p)"/>
    <g filter="url(#r)">${lines}</g>
    ${label(w, h, `PLACEHOLDER · ${title}`)}</svg>`;
}

const plain = (w, h, text, bg = "#D8D4CB") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <g stroke="#B9B4A9" stroke-width="2"><line x1="0" y1="0" x2="${w}" y2="${h}"/><line x1="${w}" y1="0" x2="0" y2="${h}"/></g>
  <text x="50%" y="50%" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.round(w * 0.03)}" fill="#3a3a3e" letter-spacing="2">${text}</text></svg>`;

async function save(svgOrBuffer, rel, opts = {}) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  const img = Buffer.isBuffer(svgOrBuffer) ? sharp(svgOrBuffer) : sharp(Buffer.from(svgOrBuffer));
  await img.jpeg({ quality: opts.q ?? 80, mozjpeg: true }).toFile(file);
  return file;
}

async function extras(slug, mainBuf, w, h, title, isPencil) {
  // Close detail: a crop of the main image, enlarged.
  const cw = Math.round(w * 0.3), ch = Math.round(cw * 0.75);
  const detail = await sharp(mainBuf).extract({ left: Math.round(w * 0.35), top: Math.round(h * 0.3), width: cw, height: ch }).resize(1600, 1200).toBuffer();
  const detailLabelled = await sharp(detail).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">${label(1600, 1200, `PLACEHOLDER · ${title} · close detail`)}</svg>`) }]).toBuffer();
  await save(detailLabelled, `works/${slug}/detail.jpg`);

  // Side edge: a thin slice of colour on a neutral ground, like a photo of the canvas edge.
  const strip = await sharp(mainBuf).extract({ left: w - 40, top: 0, width: 40, height: h }).resize(220, 1100, { fit: "fill" }).toBuffer();
  const edgeBase = Buffer.from(plain(1600, 1200, "", "#E4E0D7"));
  const edge = await sharp(edgeBase).composite([
    { input: strip, left: 690, top: 50 },
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect x="910" y="50" width="${isPencil ? 6 : 26}" height="1100" fill="${isPencil ? "#cfc9bd" : "#bfb6a3"}"/>${label(1600, 1200, `PLACEHOLDER · ${title} · side edge`)}</svg>`) },
  ]).toBuffer();
  await save(edge, `works/${slug}/edge.jpg`);

  // In a room: wall, floor and the work hung at a believable scale.
  const maxW = 520, scale = Math.min(maxW / w, 480 / h);
  const small = await sharp(mainBuf).resize(Math.round(w * scale), Math.round(h * scale)).toBuffer();
  const sw = Math.round(w * scale), sh = Math.round(h * scale);
  const room = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
    <rect width="1600" height="1200" fill="#E7E3DA"/><rect y="930" width="1600" height="270" fill="#B9A88E"/>
    <rect x="${800 - sw / 2 - 6}" y="${430 - sh / 2 - 6}" width="${sw + 12}" height="${sh + 12}" fill="${isPencil ? "#2b2b2e" : "#d9d2c4"}"/>
    <rect x="${800 - sw / 2 + 8}" y="${430 + sh / 2 + 14}" width="${sw - 16}" height="8" fill="#000" opacity="0.06"/>
    <rect x="980" y="700" width="420" height="240" rx="18" fill="#8D8a84"/><rect x="1000" y="640" width="380" height="110" rx="20" fill="#9c9993"/>
    ${label(1600, 1200, `PLACEHOLDER · ${title} · in a room`)}</svg>`;
  const roomBuf = await sharp(Buffer.from(room)).composite([{ input: small, left: Math.round(800 - sw / 2), top: Math.round(430 - sh / 2) }]).toBuffer();
  await save(roomBuf, `works/${slug}/room.jpg`);
}

const roman = ["I", "II", "III", "IV", "V"];
for (const [i, o] of oils.entries()) {
  const title = `OIL ${roman[i]}`;
  const buf = await sharp(Buffer.from(oilSvg(o, title))).png().toBuffer();
  await save(buf, `works/${o.slug}/main.jpg`, { q: 82 });
  await extras(o.slug, buf, o.w, o.h, title, false);
  console.log("made", o.slug);
}
for (const [i, p] of pencils.entries()) {
  const title = `PENCIL ${roman[i]}`;
  const buf = await sharp(Buffer.from(pencilSvg(p, title))).png().toBuffer();
  await save(buf, `works/${p.slug}/main.jpg`, { q: 82 });
  await extras(p.slug, buf, p.w, p.h, title, true);
  console.log("made", p.slug);
}

await save(plain(1200, 1500, "PLACEHOLDER · artist's hands at work"), "about/hands.jpg");
await save(plain(1600, 1100, "PLACEHOLDER · studio, wide view"), "process/studio-1.jpg");
await save(plain(1200, 1500, "PLACEHOLDER · studio, easel and palette"), "process/studio-2.jpg");
await save(plain(1200, 1500, "PLACEHOLDER · oil painting in progress"), "process/wip-oil.jpg");
await save(plain(1500, 1200, "PLACEHOLDER · pencil drawing in progress"), "process/wip-pencil.jpg");
console.log("done");
