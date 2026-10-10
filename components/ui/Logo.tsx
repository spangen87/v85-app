import { BRAND, ICON_SHAPES, fillColor } from "@/lib/brand";

/** Travas ikon: hästhuvudet på blått (lib/brand.ts). */
export function TravaIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <rect width="100" height="100" rx="22" fill={BRAND.accent} />
      {ICON_SHAPES.map((s, i) => s.d
        ? <path key={i} d={s.d} fill={fillColor(s.fill)} />
        : <circle key={i} cx={s.circle![0]} cy={s.circle![1]} r={s.circle![2]} fill={fillColor(s.fill)} />)}
    </svg>
  );
}

/** Ordmärket: ikonen och "Trava" i Fredoka. */
export function TravaWordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="ta-wordmark">
      <TravaIcon size={size} />
      <span className="ta-wordmark-text" style={{ fontSize: Math.round(size * 0.85) }}>{BRAND.name}</span>
    </span>
  );
}
