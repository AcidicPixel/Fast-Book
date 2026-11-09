// Makes the seamless handmade-paper tile used behind every page.
// Run: node scripts/make-paper-texture.mjs
import sharp from "sharp";

const S = 640; // tile size in px
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// Fibres: short wandering strokes. Each is drawn 9 times (shifted by ±S) so
// fibres that cross an edge continue on the opposite edge: no seams.
let fibres = "";
for (let i = 0; i < 260; i++) {
  const x = rnd() * S, y = rnd() * S, len = 14 + rnd() * 70, a = rnd() * Math.PI * 2;
  const bend = (rnd() - 0.5) * len * 0.8;
  const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
  const cx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, cy = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
  const dark = rnd() < 0.6;
  const stroke = dark ? "#6e604c" : "#ffffff";
  const op = dark ? 0.35 + rnd() * 0.45 : 0.6 + rnd() * 0.4;
  const wdt = 0.5 + rnd() * 1.1;
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
    fibres += `<path d="M${x + dx} ${y + dy}Q${cx + dx} ${cy + dy} ${x2 + dx} ${y2 + dy}" stroke="${stroke}" stroke-opacity="${op.toFixed(2)}" stroke-width="${wdt.toFixed(2)}" fill="none" stroke-linecap="round"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <!-- uneven tone: low-frequency clouds -->
    <filter id="tone" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(4 / S).toFixed(5)}" numOctaves="3" seed="8" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.84  0 0 0 0 0.79  0 0 0 0 0.70  0 0 0 1.4 -0.45"/>
    </filter>
    <!-- pulp grain: high-frequency speckle -->
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(160 / S).toFixed(5)}" numOctaves="2" seed="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.40  0 0 0 0 0.33  0 0 0 1.1 -0.5"/>
    </filter>
  </defs>
  <rect width="${S}" height="${S}" fill="#f4efe6"/>
  <rect width="${S}" height="${S}" filter="url(#tone)"/>
  <rect width="${S}" height="${S}" filter="url(#grain)"/>
  ${fibres}
</svg>`;

const out = "src/assets/paper-texture.webp";
const info = await sharp(Buffer.from(svg)).webp({ quality: 62, effort: 6 }).toFile(out);
console.log(out, info.width, "×", info.height, Math.round(info.size / 1024), "KB");
