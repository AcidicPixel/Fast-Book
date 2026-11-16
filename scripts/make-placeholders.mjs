// Builds the placeholder photos from openly licensed sources:
// - artworks: public-domain images (CC0) from the Art Institute of Chicago
// - rooms, studio, hands: photos under the Pexels License (free for commercial use)
// Every output file name starts with "placeholder-". Sources and licences are
// listed in src/images/PLACEHOLDER-SOURCES.md.
//
// Run: npm run placeholders   (needs network access to www.artic.edu and images.pexels.com)
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("src/images");
const CACHE = path.resolve(".cache/placeholder-sources");

/* ---------------------------------------------------------------- sources */
const AIC = (img, w) => `https://www.artic.edu/iiif/2/${img}/full/${w},/0/default.jpg`;
const PEX = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2000`;

// h, w: real size in cm (from the museum record). focus: centre of the close-detail crop.
export const WORKS = [
  { slug: "oil-01", kind: "oil", aic: 874, img: "3a34f988-f779-2e96-1786-8945b6b9c87d", px: 2829, h: 32, w: 41, depth: 2, room: "A", focus: [0.3, 0.55],
    credit: "Jean Charles Cazin, Landscape, c. 1895, oil on canvas" },
  { slug: "oil-02", kind: "oil", aic: 14594, img: "23c6c5c9-b8bf-8664-f547-4ddc932733f8", px: 1839, h: 62, w: 51, depth: 2, room: "B", focus: [0.47, 0.28],
    credit: "Édouard Manet, Portrait of a Woman with a Black Fichu, c. 1878, oil on canvas" },
  { slug: "oil-03", kind: "oil", aic: 21682, img: "574695d5-6bf3-fe58-a1d5-e6cbb5e10c77", px: 3000, h: 48, w: 76, depth: 2, room: "A", focus: [0.55, 0.62],
    credit: "Pieter Claesz, Still Life, c. 1625, oil on panel" },
  { slug: "oil-04", kind: "oil", aic: 94841, img: "48b2de88-ba73-8e19-f448-d1cef4a1c847", px: 3000, h: 110, w: 85, depth: 3, room: "C", focus: [0.62, 0.2],
    credit: "Jules Breton, The Song of the Lark, 1884, oil on canvas" },
  { slug: "oil-05", kind: "oil", aic: 16568, img: "3c27b499-af56-f0d5-93b5-a7f2f1ad5813", px: 3000, h: 89, w: 94, depth: 3, room: "C", focus: [0.42, 0.62],
    credit: "Claude Monet, Water Lilies, 1906, oil on canvas" },
  { slug: "pen-01", kind: "pen", aic: 145830, img: "12d457aa-db47-b15e-5550-c6c1a9708a2f", px: 2658, h: 23, w: 25, room: "B", focus: [0.62, 0.42],
    credit: "Baccio Bandinelli, Two Studies of the Head of a Youth, c. 1550, pen and brown ink on tan paper" },
  { slug: "pen-02", kind: "pen", aic: 133605, img: "1d789b2f-7821-b5a8-5f84-6fb2549b4e30", px: 3000, h: 25, w: 33, room: "A", focus: [0.5, 0.35],
    credit: "Vincent van Gogh, Landscape at Arles, 1888, pen and brown ink over graphite on cream wove paper" },
  { slug: "pen-03", kind: "pen", aic: 13572, img: "e1722e55-ab1e-1c31-05c7-7e30bd681d00", px: 1482, h: 28, w: 19, room: "B", focus: [0.5, 0.25],
    credit: "Constantin Guys, Three-Quarter Length Portrait of a Woman, 1865/70, pen and brown ink with brush and grey wash" },
  { slug: "pen-04", kind: "pen", aic: 136977, img: "514411b3-2930-9245-f9cf-ec8b6c42fb6c", px: 3000, h: 30, w: 36, room: "C", focus: [0.45, 0.3],
    credit: "Jean-François Millet, Landscape – Hillside in Gruchy, Normandy, 1869/70, pen and brown ink on cream laid paper" },
];

// Rooms are photographed straight on, so the wall is parallel to the picture plane.
// floor: y of the wall/floor line; ppc: pixels per cm on the wall; cx: x of the hanging centre;
// light: side the daylight comes from; white: brightness of white paper relative to the wall;
// scale: the known object used to set ppc. clear: a framed print to paint out [x0,y0,x1,y1].
const ROOMS = {
  A: { pexels: 29298710, floor: 2480, ppc: 13.56, cx: 1150, light: "right", white: 1.18,
       scale: "sofa seat 45 cm high (seat top y=1870, floor y=2480)" },
  B: { pexels: 3705539, floor: 2600, ppc: 13.75, cx: 980, light: "right", white: 1.08,
       scale: "existing 40 × 50 cm frame (550 × 687 px); the 73 cm armchair confirms it",
       clear: [600, 410, 1360, 1245] },
  C: { pexels: 4992480, floor: 2041, ppc: 8.87, cx: 780, light: "left", white: 1.0,
       scale: "bench top 45 cm high (top y=1642, floor y=2041)",
       clear: [225, 0, 1350, 1110] },
};

const PHOTOS = [
  { out: "about/placeholder-hands.jpg", pexels: 12575706, desc: "Hands sketching faces in a sketchbook with a pen" },
  { out: "process/placeholder-studio-1.jpg", pexels: 6731911, desc: "An easel in a painting workshop" },
  { out: "process/placeholder-studio-2.jpg", pexels: 6184426, desc: "Mixing oil paint on a palette" },
  { out: "process/placeholder-wip-oil.jpg", pexels: 7885621, desc: "Painting at the easel (cropped to the hand and canvas)", crop: [0, 0.05, 0.5, 0.95] },
  { out: "process/placeholder-wip-pen.jpg", pexels: 4238483, desc: "A pen sketch in progress in a sketchbook" },
];

/* ---------------------------------------------------------------- helpers */
const exists = (f) => access(f).then(() => true, () => false);
async function fetchCached(url, name) {
  const file = path.join(CACHE, name);
  if (await exists(file)) return file;
  const res = await fetch(url, { headers: { "user-agent": "paints-by-euro-placeholder-build" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}
async function save(input, rel, q = 84) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(input).jpeg({ quality: q, mozjpeg: true }).toFile(file);
}
const raw = async (input) => {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Paint out a framed print: fit a smooth lighting surface (cubic in x and y) to the
 * wall in a ring around the print, fill the print with it plus matching grain, and
 * feather the edges into the photo.
 */
function clearRegion(img, [x0, y0, x1, y1]) {
  const { data, w, h } = img;
  const ring = 160, feather = 40;
  const orig = Buffer.from(data);
  const nx = (x) => (x - (x0 + x1) / 2) / ((x1 - x0) / 2 + ring);
  const ny = (y) => (y - (y0 + y1) / 2) / ((y1 - y0) / 2 + ring);
  const terms = (u, v) => [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
  const K = 10;
  const fits = [0, 1, 2].map(() => ({ A: Array.from({ length: K }, () => new Float64Array(K)), b: new Float64Array(K) }));
  let gsum = 0, gsum2 = 0, gn = 0;
  for (let y = Math.max(0, y0 - ring); y < Math.min(h, y1 + ring); y += 3) {
    for (let x = Math.max(0, x0 - ring); x < Math.min(w, x1 + ring); x += 3) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const t = terms(nx(x), ny(y));
      for (let c = 0; c < 3; c++) {
        const val = orig[(y * w + x) * 3 + c];
        const f = fits[c];
        for (let i = 0; i < K; i++) { f.b[i] += t[i] * val; for (let j = 0; j < K; j++) f.A[i][j] += t[i] * t[j]; }
      }
      if (x + 1 < w) { const d = orig[(y * w + x) * 3 + 1] - orig[(y * w + x + 1) * 3 + 1]; gsum += d; gsum2 += d * d; gn++; }
    }
  }
  const solve = ({ A, b }) => { // Gaussian elimination
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < K; i++) {
      let p = i; for (let r = i + 1; r < K; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      [M[i], M[p]] = [M[p], M[i]];
      for (let r = 0; r < K; r++) if (r !== i) { const k = M[r][i] / M[i][i]; for (let c = i; c <= K; c++) M[r][c] -= k * M[i][c]; }
    }
    return M.map((row, i) => row[K] / row[i]);
  };
  const coef = fits.map(solve);
  const grain = Math.sqrt(Math.max(0, gsum2 / gn - (gsum / gn) ** 2)) / Math.SQRT2;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const t = terms(nx(x), ny(y));
    const d = Math.min(x - x0, x1 - 1 - x, y1 - 1 - y, y0 === 0 ? 1e9 : y - y0);
    const a = Math.min(1, d / feather);
    const g = gauss() * grain;
    for (let c = 0; c < 3; c++) {
      let fill = g; for (let i = 0; i < K; i++) fill += coef[c][i] * t[i];
      const o = (y * w + x) * 3 + c;
      data[o] = clamp8(fill * a + orig[o] * (1 - a));
    }
  }
}

/** Builds the face of an oil painting: the canvas plus a visible side edge and a faint sheen. */
async function oilFace(src, pxH, ppc, depth, sideOnLeft, light) {
  const meta = await sharp(src).metadata();
  const pxW = Math.round(pxH * (meta.width / meta.height)); // uniform scale: never stretched
  const face = await raw(await sharp(src).resize(pxW, pxH).toBuffer());
  const side = Math.max(2, Math.round(depth * ppc * 0.14)); // camera is a little to one side
  const W = pxW + side, H = pxH;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      let r, g, b, shade = 1;
      const fx = sideOnLeft ? x - side : x;
      if (fx < 0 || fx >= pxW) {
        // canvas side: paint wraps round the edge, in shade
        const sx = fx < 0 ? 0 : pxW - 1;
        const i = (y * pxW + sx) * 3;
        r = face.data[i]; g = face.data[i + 1]; b = face.data[i + 2]; shade = 0.62;
      } else {
        const i = (y * pxW + fx) * 3;
        r = face.data[i]; g = face.data[i + 1]; b = face.data[i + 2];
        // faint sheen of varnished paint, strongest near the top corner facing the light
        const u = light === "left" ? fx / pxW : 1 - fx / pxW;
        const sheen = Math.max(0, 1 - Math.hypot(u, y / pxH) / 0.75) * 0.09;
        r += (255 - r) * sheen; g += (255 - g) * sheen; b += (255 - b) * sheen;
        if (y < 2) shade = 0.85; // top edge catches less light
      }
      out[o] = r * shade; out[o + 1] = g * shade; out[o + 2] = b * shade; out[o + 3] = 255;
    }
  }
  return { data: out, w: W, h: H, depthPx: depth * ppc };
}

/** Builds a framed drawing: oak frame, white mount with bevel, glass with a faint reflection. */
async function framedDrawing(src, hCm, ppc, light) {
  const meta = await sharp(src).metadata();
  const dH = Math.round(hCm * ppc), dW = Math.round(dH * (meta.width / meta.height));
  const mount = Math.round((hCm > 28 ? 7 : 6) * ppc), frame = Math.round(2.2 * ppc), bevel = Math.max(1, Math.round(0.25 * ppc));
  const W = dW + 2 * (mount + frame), H = dH + 2 * (mount + frame);
  const drawing = await raw(await sharp(src).resize(dW, dH).toBuffer());
  const out = Buffer.alloc(W * H * 4);
  const oak = [150, 117, 80], mountC = [242, 239, 231];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const inFrame = x < frame || y < frame || x >= W - frame || y >= H - frame;
    let c;
    if (inFrame) {
      // simple moulding: lighter towards the light, darker on the far side, grain streaks
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y) / frame;
      const facing = (light === "left" ? x < frame : x >= W - frame) || y < frame ? 1.08 : 0.86;
      const grain = 1 + 0.05 * Math.sin((x + y * 0.15) * 0.9) + 0.03 * Math.sin(y * 0.31 + x * 0.07);
      const bevelLight = edge < 0.18 || edge > 0.82 ? 0.82 : 1;
      c = oak.map((v) => v * facing * grain * bevelLight);
    } else {
      const mx = x - frame, my = y - frame;
      const ix = mx - mount, iy = my - mount;
      if (ix >= 0 && iy >= 0 && ix < dW && iy < dH) {
        const i = (iy * dW + ix) * 3;
        c = [drawing.data[i], drawing.data[i + 1], drawing.data[i + 2]];
      } else {
        const nearOpening = ix >= -bevel && iy >= -bevel && ix < dW + bevel && iy < dH + bevel;
        c = nearOpening ? [250, 248, 243] : mountC.slice(); // cut bevel catches the light
        // frame casts a soft shadow onto the mount (top, and the side away from the light)
        const fromTop = my / (0.9 * ppc), fromSide = (light === "left" ? (W - 2 * frame - mx) : mx) / (0.9 * ppc);
        const sh = 1 - 0.13 * Math.exp(-fromTop) - 0.1 * Math.exp(-fromSide);
        c = c.map((v) => v * sh);
      }
      // glass: a very faint diagonal reflection band
      const d = (mx / (W - 2 * frame)) * 0.8 + (my / (H - 2 * frame)) * 0.6;
      const refl = 0.045 * Math.exp(-(((d - 0.45) / 0.12) ** 2)) + 0.012;
      c = c.map((v) => v + (255 - v) * refl);
    }
    out[o] = clamp8(c[0]); out[o + 1] = clamp8(c[1]); out[o + 2] = clamp8(c[2]); out[o + 3] = 255;
  }
  return { data: out, w: W, h: H, depthPx: 2.5 * ppc };
}

/** Hang a piece on a room wall: soft shadow away from the light, then lit by the wall's own light. */
async function hang(roomName, room, wallBuf, wallBlur, piece, outRel) {
  const { w: RW, h: RH } = wallBlur;
  const cy = Math.round(room.floor - 147 * room.ppc); // centre 147 cm above the floor
  const x0 = Math.round(room.cx - piece.w / 2), y0 = Math.round(cy - piece.h / 2);
  if (y0 < 0) throw new Error(`${outRel} does not fit room ${roomName}`);
  const away = room.light === "left" ? 1 : -1;
  const off = piece.depthPx * 0.55;
  const sigma = Math.max(2, piece.depthPx * 0.6);
  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RW}" height="${RH}">
    <rect x="${x0 + away * off}" y="${y0 + off * 1.3}" width="${piece.w}" height="${piece.h}" fill="#000" fill-opacity="0.42"/></svg>`;
  const shadow = await sharp(Buffer.from(shadowSvg)).blur(sigma).png().toBuffer();
  const shadowed = await sharp(wallBuf).composite([{ input: shadow, blend: "over" }]).toBuffer();

  // Light the piece with the wall's own (blurred) light: same direction and colour temperature.
  const lit = Buffer.alloc(piece.w * piece.h * 4);
  for (let y = 0; y < piece.h; y++) for (let x = 0; x < piece.w; x++) {
    const i = (y * piece.w + x) * 4;
    const wx = Math.min(RW - 1, Math.max(0, x0 + x)), wy = Math.min(RH - 1, Math.max(0, y0 + y));
    const wi = (wy * RW + wx) * 3;
    for (let c = 0; c < 3; c++) lit[i + c] = clamp8((piece.data[i + c] / 255) * wallBlur.data[wi + c] * room.white);
    lit[i + 3] = piece.data[i + 3];
  }
  const layer = await sharp(lit, { raw: { width: piece.w, height: piece.h, channels: 4 } }).png().toBuffer();
  const img = await sharp(shadowed).composite([{ input: layer, left: x0, top: y0 }]).toBuffer();
  await save(await sharp(img).resize({ width: 1800, withoutEnlargement: true }).toBuffer(), outRel, 82);
}

/** Side view: the work seen at a steep angle, showing the canvas edge or the frame's side. */
async function sideView(piece, kind, outRel) {
  const W = 1600, H = 1200;
  const bg = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 226, g: 223, b: 216 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#cfcbc3"/><stop offset="1" stop-color="#ebe8e1"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`) }])
    .raw().toBuffer();
  const out = Buffer.from(bg);
  const hNear = H * 0.8, hFar = hNear * 0.82, faceW = W * 0.24;
  const xa = W * 0.36, xb = xa + faceW; // far edge, near edge
  const sideW = Math.max(18, (kind === "oil" ? 0.9 : 1.1) * piece.depthPx * (hNear / piece.h));
  const cyS = H / 2;
  // shadow on the wall behind the far side
  for (let y = 0; y < H; y++) for (let x = Math.round(xa - 70); x < xa; x++) {
    const t = (x - (xa - 70)) / 70, o = (y * W + x) * 3, dy = Math.abs(y - cyS) / (hFar / 2);
    if (dy > 1.05) continue;
    for (let c = 0; c < 3; c++) out[o + c] = out[o + c] * (1 - 0.28 * t * t);
  }
  const sample = (sx, sy, c) => piece.data[(Math.min(piece.h - 1, Math.max(0, sy)) * piece.w + Math.min(piece.w - 1, Math.max(0, sx))) * 4 + c];
  for (let x = Math.round(xa); x < Math.round(xb + sideW); x++) {
    let colH, sxFrac, isSide = false;
    if (x < xb) {
      const t = (x - xa) / faceW;
      colH = hFar * (1 - t) + hNear * t;
      sxFrac = (t * hNear) / ((1 - t) * hFar + t * hNear); // perspective-correct
    } else {
      isSide = true;
      colH = hNear * (1 + 0.02 * ((x - xb) / sideW));
      sxFrac = 1;
    }
    for (let y = Math.round(cyS - colH / 2); y < Math.round(cyS + colH / 2); y++) {
      const v = (y - (cyS - colH / 2)) / colH;
      const sx = Math.round(sxFrac * (piece.w - 1)), sy = Math.round(v * (piece.h - 1));
      const o = (y * W + x) * 3;
      const shade = isSide ? 0.7 - 0.12 * ((x - xb) / sideW) : 0.97;
      for (let c = 0; c < 3; c++) out[o + c] = clamp8(sample(sx, sy, c) * shade);
    }
  }
  await save(await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer(), outRel, 84);
}

/* ---------------------------------------------------------------- build */
const roomCache = {};
async function room(name) {
  if (roomCache[name]) return roomCache[name];
  const r = ROOMS[name];
  const file = await fetchCached(PEX(r.pexels), `room-${r.pexels}.jpg`);
  const img = await raw(file);
  if (r.clear) clearRegion(img, r.clear);
  const wallBuf = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 3 } }).png().toBuffer();
  const wallBlur = await raw(await sharp(wallBuf).blur(28).toBuffer());
  return (roomCache[name] = { r, wallBuf, wallBlur });
}

for (const wk of WORKS) {
  const src = await fetchCached(AIC(wk.img, wk.px), `aic-${wk.aic}.jpg`);
  const dir = `works/${wk.slug}`;
  const meta = await sharp(src).metadata();

  // Main photo: the whole work, never enlarged.
  await save(await sharp(src).resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).toBuffer(), `${dir}/placeholder-${wk.slug}-main.jpg`, 86);

  // Close detail: a 4:3 crop at the source's full resolution.
  const cw = Math.round(meta.width * (meta.width >= 2800 ? 0.3 : 0.42)), ch = Math.round(cw * 0.75);
  const left = Math.round(Math.min(meta.width - cw, Math.max(0, wk.focus[0] * meta.width - cw / 2)));
  const top = Math.round(Math.min(meta.height - ch, Math.max(0, wk.focus[1] * meta.height - ch / 2)));
  await save(await sharp(src).extract({ left, top, width: cw, height: ch }).toBuffer(), `${dir}/placeholder-${wk.slug}-detail.jpg`, 88);

  // In a room, at true size.
  const { r, wallBuf, wallBlur } = await room(wk.room);
  const sideOnLeft = r.cx > wallBlur.w / 2; // camera sees the side facing the image centre
  const piece = wk.kind === "oil"
    ? await oilFace(src, Math.round(wk.h * r.ppc), r.ppc, wk.depth, sideOnLeft, r.light)
    : await framedDrawing(src, wk.h, r.ppc, r.light);
  await hang(wk.room, r, wallBuf, wallBlur, piece, `${dir}/placeholder-${wk.slug}-room.jpg`);

  // Side edge.
  const sidePiece = wk.kind === "oil"
    ? await oilFace(src, 900, 900 / wk.h, wk.depth, false, "left")
    : await framedDrawing(src, wk.h, 900 / (wk.h + 2 * ((wk.h > 28 ? 7 : 6) + 2.2)), "left");
  await sideView(sidePiece, wk.kind, `${dir}/placeholder-${wk.slug}-edge.jpg`);
  console.log("made", wk.slug, `room ${wk.room}`);
}

for (const p of PHOTOS) {
  const file = await fetchCached(PEX(p.pexels), `photo-${p.pexels}.jpg`);
  let img = sharp(file);
  if (p.crop) {
    const m = await img.metadata();
    const [l, t, w, h] = p.crop;
    img = sharp(file).extract({ left: Math.round(l * m.width), top: Math.round(t * m.height), width: Math.round(w * m.width), height: Math.round(h * m.height) });
  }
  await save(await img.toBuffer(), p.out, 84);
  console.log("made", p.out);
}

/* ---------------------------------------------------------------- products */
// Product photos (prints, cards, postcards, Print Club bundles) are flat-lay
// renderings made from the placeholder artworks above, on a linen-coloured ground.
const art = async (slug) => fetchCached(AIC(WORKS.find((w) => w.slug === slug).img, WORKS.find((w) => w.slug === slug).px), `aic-${WORKS.find((w) => w.slug === slug).aic}.jpg`);

async function linen(W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0.45 0 0 0 0 0.40 0 0 0 0 0.33 0 0 0 0.10 0"/></filter>
    <filter id="m"><feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 0.45 0 0 0 0 0.40 0 0 0 0 0.33 0 0 0 0.08 0"/></filter>
    <filter id="t"><feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 0.97 0 0 0 0 0.92 0 0 0 0.18 0"/></filter>
    <rect width="${W}" height="${H}" fill="#e6ddcf"/><rect width="${W}" height="${H}" filter="url(#t)"/>
    <rect width="${W}" height="${H}" filter="url(#n)"/><rect width="${W}" height="${H}" filter="url(#m)"/>
    <defs><radialGradient id="v" cx="0.35" cy="0.3" r="0.9"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** A sheet of paper with the artwork printed on it (border = white margin as a fraction of width). */
async function sheet(src, w, { border = 0.08, paper = "#f7f3ea", back = null } = {}) {
  if (back) {
    const h = back;
    // reverse of a postcard: dividing line, address lines and a stamp box
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${paper}"/>
      <line x1="${w / 2}" y1="${h * 0.12}" x2="${w / 2}" y2="${h * 0.88}" stroke="#b9b0a2" stroke-width="2"/>
      ${[0.5, 0.62, 0.74, 0.86].map((y) => `<line x1="${w * 0.56}" y1="${h * y}" x2="${w * 0.92}" y2="${h * y}" stroke="#c9c0b2" stroke-width="2"/>`).join("")}
      <rect x="${w * 0.78}" y="${h * 0.1}" width="${w * 0.14}" height="${h * 0.22}" fill="none" stroke="#b9b0a2" stroke-width="2" stroke-dasharray="6 5"/>
      <text x="${w * 0.08}" y="${h * 0.86}" font-family="DejaVu Serif, serif" font-size="${w * 0.03}" fill="#8f877a">Paints by Euro</text></svg>`;
    return { buf: await sharp(Buffer.from(svg)).png().toBuffer(), w, h };
  }
  const meta = await sharp(src).metadata();
  const b = Math.round(w * border);
  const aw = w - 2 * b, ah = Math.round(aw * (meta.height / meta.width));
  const h = ah + 2 * b;
  const img = await sharp(src).resize(aw, ah).toBuffer();
  const buf = await sharp({ create: { width: w, height: h, channels: 4, background: paper } })
    .composite([{ input: img, left: b, top: b }]).png().toBuffer();
  return { buf, w, h };
}

/** Kraft envelope for cards. */
async function envelope(w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#c8a57a"/>
    <path d="M0 0 L${w / 2} ${h * 0.55} L${w} 0" fill="none" stroke="#a9875e" stroke-width="3"/>
    <filter id="g"><feTurbulence baseFrequency="0.8" numOctaves="2"/><feColorMatrix values="0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0.12 0"/></filter>
    <rect width="${w}" height="${h}" filter="url(#g)"/></svg>`;
  return { buf: await sharp(Buffer.from(svg)).png().toBuffer(), w, h };
}

/** Lay sheets on linen with soft shadows. items: { piece, x, y, rot } (x, y = centre). */
async function flatlay(W, H, items, outRel) {
  const layers = [];
  for (const it of items) {
    const rotated = await sharp(it.piece.buf).ensureAlpha().rotate(it.rot || 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const m = await sharp(rotated).metadata();
    const alpha = await sharp(rotated).extractChannel(3).toBuffer();
    const shadow = await sharp({ create: { width: m.width, height: m.height, channels: 3, background: "#2a2118" } })
      .joinChannel(await sharp(alpha).linear(0.38, 0).toBuffer()).png().toBuffer();
    const pad = 40;
    const shadowBlur = await sharp(shadow).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(9).png().toBuffer();
    const left = Math.round(it.x - m.width / 2), top = Math.round(it.y - m.height / 2);
    layers.push({ input: shadowBlur, left: left - pad + 8, top: top - pad + 12 });
    layers.push({ input: rotated, left, top });
  }
  const img = await sharp(await linen(W, H)).composite(layers).png().toBuffer();
  await save(img, outRel, 84);
}

const PRODUCTS = [];
async function product(out, desc, build) { await build(); PRODUCTS.push({ out, desc }); console.log("made", out); }

await product("products/placeholder-print-oil-01.jpg", "Print of Oil I (Cazin) on paper", async () =>
  flatlay(1800, 1350, [{ piece: await sheet(await art("oil-01"), 1100, { border: 0.09 }), x: 900, y: 690, rot: -2 }], "products/placeholder-print-oil-01.jpg"));
await product("products/placeholder-print-oil-05.jpg", "Print of Oil V (Monet) on paper", async () =>
  flatlay(1800, 1350, [{ piece: await sheet(await art("oil-05"), 900, { border: 0.1 }), x: 900, y: 680, rot: 1.5 }], "products/placeholder-print-oil-05.jpg"));
await product("products/placeholder-card-oil-03.jpg", "Greeting card of Oil III (Claesz) with envelope", async () =>
  flatlay(1800, 1350, [
    { piece: await envelope(980, 700), x: 1050, y: 740, rot: 4 },
    { piece: await sheet(await art("oil-03"), 880, { border: 0.07 }), x: 820, y: 640, rot: -3 },
  ], "products/placeholder-card-oil-03.jpg"));
await product("products/placeholder-postcard-pen-02.jpg", "Postcard of Pen II (van Gogh), front and back", async () => {
  const front = await sheet(await art("pen-02"), 820, { border: 0.04 });
  await flatlay(1800, 1350, [
    { piece: await sheet(null, 820, { back: front.h }), x: 1120, y: 760, rot: 6 },
    { piece: front, x: 760, y: 600, rot: -4 },
  ], "products/placeholder-postcard-pen-02.jpg");
});

// Print Club bundles: 1 print + 1 card + 1 postcard
const BUNDLES = [
  { n: "01", print: "oil-05", card: "oil-03", post: "pen-02" },
  { n: "02", print: "oil-01", card: "pen-01", post: "oil-02" },
  { n: "03", print: "oil-04", card: "pen-04", post: "oil-01" },
];
for (const bd of BUNDLES) {
  const out = `print-club/placeholder-bundle-${bd.n}.jpg`;
  await product(out, `Print Club bundle: print of ${bd.print}, card of ${bd.card}, postcard of ${bd.post}`, async () =>
    flatlay(1800, 1350, [
      { piece: await sheet(await art(bd.print), 760, { border: 0.09 }), x: 560, y: 660, rot: -3 },
      { piece: await envelope(520, 380), x: 1330, y: 980, rot: 5 },
      { piece: await sheet(await art(bd.card), 470, { border: 0.07 }), x: 1260, y: 470, rot: 4 },
      { piece: await sheet(await art(bd.post), 500, { border: 0.04 }), x: 1300, y: 900, rot: -6 },
    ], out));
}

/* ---------------------------------------------------------------- credits */
const lines = [
  "# Placeholder images: sources and licences",
  "",
  "Every file whose name starts with `placeholder-` is a stand-in until the artist supplies photos of their own work.",
  "Generated by `npm run placeholders` (scripts/make-placeholders.mjs).",
  "",
  "## Artworks (main photo, close detail, side edge, in a room)",
  "",
  "All from the Art Institute of Chicago open-access collection. Public domain, released under **CC0 1.0** (free for any use, including commercial; no attribution required).",
  "",
  "| Files | Work | Size (h × w) | Source |",
  "|---|---|---|---|",
  ...WORKS.map((w) => `| works/${w.slug}/placeholder-${w.slug}-*.jpg | ${w.credit} | ${w.h} × ${w.w} cm | https://www.artic.edu/artworks/${w.aic} |`),
  "",
  "The close detail is a crop of the same image. The side edge is a rendering made from it. The in-a-room image places it in one of the rooms below.",
  "",
  "## Rooms (used in the in-a-room images)",
  "",
  "Photos from Pexels under the **Pexels License** (free for commercial use; no attribution required; https://www.pexels.com/license/). Framed prints in rooms B and C were painted out.",
  "",
  "| Room | Photo | Scale reference | Works |",
  "|---|---|---|---|",
  ...Object.entries(ROOMS).map(([k, r]) => `| ${k} | https://www.pexels.com/photo/${r.pexels}/ | ${r.scale} | ${WORKS.filter((w) => w.room === k).map((w) => w.slug).join(", ")} |`),
  "",
  "## Studio, hands and work-in-progress photos",
  "",
  "Photos from Pexels under the **Pexels License** (free for commercial use; no attribution required).",
  "",
  "| File | Subject | Source |",
  "|---|---|---|",
  ...PHOTOS.map((p) => `| ${p.out} | ${p.desc} | https://www.pexels.com/photo/${p.pexels}/ |`),
  "",
  "## Prints, cards, postcards and Print Club bundles",
  "",
  "Renderings made by the script from the CC0 artworks above, laid on a generated linen background. No third-party photos.",
  "",
  "| File | Shows |",
  "|---|---|",
  ...PRODUCTS.map((p) => `| ${p.out} | ${p.desc} |`),
  "",
];
await writeFile(path.join(OUT, "PLACEHOLDER-SOURCES.md"), lines.join("\n"));
console.log("done");
