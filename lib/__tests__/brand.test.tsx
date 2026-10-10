import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { renderToStaticMarkup as html } from "react-dom/server";
import sharp from "sharp";
import { BRAND, brandIconSvg } from "@/lib/brand";
import { TravaIcon, TravaWordmark } from "@/components/ui";
import manifest from "@/app/manifest";

describe("varumärket", () => {
  it("heter Trava", () => {
    expect(BRAND.name).toBe("Trava");
  });

  it("ikonen: rundad för favicon, fyrkantig för hemskärm, inskjuten för maskable", () => {
    const rounded = brandIconSvg({ shape: "rounded" });
    expect(rounded).toContain('rx="22"');
    expect(rounded).toContain(BRAND.mane);
    expect(rounded).toContain(BRAND.accent);
    expect(brandIconSvg({ shape: "square" })).not.toContain("rx=");
    expect(brandIconSvg({ shape: "maskable" })).toMatch(/transform="translate\([^)]*\) scale\(0\.\d+\)"/);
  });

  it("ordmärket: ikon och namnet", () => {
    const out = html(<TravaWordmark />);
    expect(out).toContain(">Trava<");
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html(<TravaIcon size={24} />)).toMatch(/width="24"/);
  });

  it("manifestet: namn och ikoner, maskable separat", () => {
    const m = manifest();
    expect(m.name).toBe("Trava");
    expect(m.short_name).toBe("Trava");
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.purpose === "maskable" && i.src === "/icon-maskable-512.png")).toBe(true);
    expect(icons.find((i) => i.src === "/icon-512.png")?.purpose).toBeUndefined();
  });
});

describe("ikonfilerna (npm run make-icons)", () => {
  // Pixel nära vänsterkanten mitt på höjden ska vara Travas blå
  const pixel = async (file: string, x: number, y: number) => {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  it.each([
    ["public/icon-192.png", 192, false],
    ["public/icon-512.png", 512, false],
    ["public/icon-maskable-512.png", 512, true],
    ["public/apple-touch-icon.png", 180, true],
  ])("%s är %ipx och Travas blå", async (file, size, fullBleed) => {
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([size, size]);
    const [r, g, b] = await pixel(file, Math.round(size * 0.1), Math.round(size * 0.5));
    expect([r, g, b]).toEqual([0x23, 0x50, 0xc8]);
    // Hemskärm och maskable fyller hela rutan; övriga har rundade hörn
    expect((await pixel(file, 0, 0))[3]).toBe(fullBleed ? 255 : 0);
  });

  it("app/icon.svg är samma som brandIconSvg", () => {
    expect(readFileSync("app/icon.svg", "utf8").trim()).toBe(brandIconSvg({ shape: "rounded" }).trim());
  });

  it("app/favicon.ico finns och är en ICO", () => {
    const buf = readFileSync("app/favicon.ico");
    expect(buf.readUInt16LE(0)).toBe(0);
    expect(buf.readUInt16LE(2)).toBe(1);
    expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(2);
  });

  it("inga standardbilder från Next/Vercel kvar", () => {
    for (const f of ["vercel.svg", "next.svg", "file.svg", "globe.svg", "window.svg"]) expect(existsSync(path.join("public", f))).toBe(false);
  });
});

describe("gamla namn", () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (f === "__tests__") return [];
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
  it.each(["app", "components", "lib"])("%s nämner inte Travappen eller V85 Analys", (dir) => {
    for (const f of files(dir)) expect({ f, hit: /Travappen|V85 Analys/.test(readFileSync(f, "utf8")) }).toEqual({ f, hit: false });
  });
});
