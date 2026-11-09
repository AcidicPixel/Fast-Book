// Turns every photo in src/images into WebP files in three widths.
// The two large widths get a small watermark; the 480px thumbnail does not.
import sharp from "sharp";
import { readdir, stat, mkdir } from "node:fs/promises";
import path from "node:path";

export const SIZES = [480, 1024, 2048];
const THUMB = 480;
const manifest = new Map();

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(jpe?g|png|webp|tiff?)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const mtime = async (f) => {
  try { return (await stat(f)).mtimeMs; } catch { return 0; }
};

function watermark(width, height) {
  const size = Math.max(12, Math.round(width * 0.014));
  const text = "© Paints by Euro";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <text x="${width - size * 1.2}" y="${height - size * 1.1}" text-anchor="end"
      font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="${size}" letter-spacing="${size * 0.08}"
      fill="#232326" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.35" stroke-width="${size * 0.06}">${text}</text></svg>`);
}

/** Normalise "/images/works/x.jpg", "images/works/x.jpg" or "works/x.jpg" to "works/x.jpg". */
export const keyOf = (p) => String(p || "").replace(/^\/?(src\/)?images\//, "").replace(/^\//, "");

export async function processImages(srcDir, outDir, publicPrefix = "/img") {
  await mkdir(outDir, { recursive: true });
  const files = await walk(srcDir);
  await Promise.all(
    files.map(async (file) => {
      const key = keyOf(path.relative(srcDir, file).split(path.sep).join("/"));
      const base = key.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const meta = await sharp(file).rotate().metadata();
      const rotated = (meta.orientation || 1) >= 5;
      const w = rotated ? meta.height : meta.width;
      const h = rotated ? meta.width : meta.height;
      const srcTime = await mtime(file);
      const variants = {};
      for (const size of SIZES) {
        const width = Math.min(size, w);
        const name = `${base}-${size}.webp`;
        const out = path.join(outDir, name);
        variants[size] = { url: `${publicPrefix}/${name}`, width };
        if ((await mtime(out)) > srcTime) continue;
        let img = sharp(file).rotate().resize({ width, withoutEnlargement: true });
        if (size !== THUMB) {
          const height = Math.round((h / w) * width);
          img = sharp(await img.toBuffer()).composite([{ input: watermark(width, height) }]);
        }
        await img.webp({ quality: size === THUMB ? 72 : 80 }).toFile(out);
      }
      manifest.set(key, { width: w, height: h, variants });
    })
  );
  return manifest;
}

export function getImage(p) {
  const img = manifest.get(keyOf(p));
  if (!img) throw new Error(`Image not found: ${p}. Put it in src/images/ (got key "${keyOf(p)}").`);
  return img;
}

export const imgUrl = (p, size = 1024) => getImage(p).variants[size].url;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * <img> markup. mode "thumb" uses only the 480px (no watermark) file;
 * mode "large" offers the two watermarked sizes.
 */
export function picture(p, alt, { mode = "thumb", sizes = "100vw", cls = "", eager = false } = {}) {
  const img = getImage(p);
  const list = mode === "thumb" ? [THUMB] : [1024, 2048];
  const srcset = list.map((s) => `${img.variants[s].url} ${img.variants[s].width}w`).join(", ");
  const src = img.variants[list[0]].url;
  return `<img src="${src}" srcset="${srcset}" sizes="${esc(sizes)}" width="${img.width}" height="${img.height}" alt="${esc(alt)}"${cls ? ` class="${esc(cls)}"` : ""} ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
}
