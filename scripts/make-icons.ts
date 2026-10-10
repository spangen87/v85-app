/**
 * Bygger Travas ikonfiler från lib/brand.ts.
 * Körning: npm run make-icons
 *
 *   app/icon.svg                 favicon (SVG) för moderna webbläsare
 *   app/favicon.ico              16/32/48 px för äldre webbläsare
 *   public/icon-192.png, -512    PWA-ikoner (rundade hörn)
 *   public/icon-maskable-512.png PWA maskable (hela rutan, hästen inskjuten)
 *   public/apple-touch-icon.png  hemskärm på iPhone (hela rutan, 180 px)
 */
import fs from "node:fs";
import sharp from "sharp";
import { brandIconSvg } from "../lib/brand";

type Shape = "rounded" | "square" | "maskable";
const png = (shape: Shape, size: number) =>
  sharp(Buffer.from(brandIconSvg({ shape, size })), { density: 72 * Math.max(1, size / 100) }).resize(size, size).png().toBuffer();

/** ICO med PNG-bilder (stöds av alla webbläsare sedan länge) */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((img, i) => {
    const o = i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, o);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(img.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += img.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

async function main() {
  fs.writeFileSync("app/icon.svg", brandIconSvg({ shape: "rounded" }) + "\n");
  fs.writeFileSync("app/favicon.ico", ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png("rounded", size) })))));
  fs.writeFileSync("public/icon-192.png", await png("rounded", 192));
  fs.writeFileSync("public/icon-512.png", await png("rounded", 512));
  fs.writeFileSync("public/icon-maskable-512.png", await png("maskable", 512));
  fs.writeFileSync("public/apple-touch-icon.png", await png("square", 180));
  console.log("Skrev app/icon.svg, app/favicon.ico och ikonerna i public/.");
}

main();
