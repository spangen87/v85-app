/**
 * Trava — namn, färger och ikonen. Enda källan för loggan: komponenterna i
 * components/ui/Logo.tsx och ikonfilerna (npm run make-icons) byggs härifrån.
 * Designen kommer från Claude Design-duken "Logga · Trava" (A, hästhuvudet).
 */
export const BRAND = {
  name: "Trava",
  description: "Analys och spelsystem för V85 och andra V-spel",
  accent: "#2350c8",
  mane: "#f2b33d",
  white: "#ffffff",
} as const;

type Fill = "accent" | "mane" | "white";
export interface IconShape { d?: string; circle?: [number, number, number]; fill: Fill }

/** Hästhuvudet i en 100×100-ruta: man, huvud, lugg, öga och näsborre. */
export const ICON_SHAPES: IconShape[] = [
  { d: "M44 24 C32 30 23 44 23 60 C23 74 25 86 27 94 L32 94 C30 74 32 50 44 28 Z", fill: "mane" },
  { d: "M30 94 C28 72 32 50 42 28 L40 10 L51 22 C60 24 68 32 74 42 L85 58 C88 64 85 70 79 70 L70 69 C64 68 60 64 55 58 C54 70 58 82 62 94 Z", fill: "white" },
  { d: "M46 24 C49 18 55 17 59 21 C55 22 51 24 48 28 Z", fill: "mane" },
  { circle: [57, 36, 3.2], fill: "accent" },
  { circle: [81, 63, 1.7], fill: "accent" },
];

export const fillColor = (f: Fill) => BRAND[f];

/**
 * Ikonen som SVG-text. rounded = favicon och appens egen ikon, square = hemskärm
 * (systemet rundar själv), maskable = PWA, hästen inskjuten mot säkra zonen.
 */
export function brandIconSvg({ shape = "rounded", size }: { shape?: "rounded" | "square" | "maskable"; size?: number } = {}): string {
  const dim = size ? ` width="${size}" height="${size}"` : "";
  const bg = `<rect width="100" height="100"${shape === "rounded" ? ' rx="22"' : ""} fill="${BRAND.accent}"/>`;
  const shapes = ICON_SHAPES.map((s) => s.d
    ? `<path d="${s.d}" fill="${fillColor(s.fill)}"/>`
    : `<circle cx="${s.circle![0]}" cy="${s.circle![1]}" r="${s.circle![2]}" fill="${fillColor(s.fill)}"/>`).join("");
  const glyph = shape === "maskable" ? `<g transform="translate(10 20) scale(0.8)">${shapes}</g>` : shapes;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dim}>${bg}${glyph}</svg>`;
}
