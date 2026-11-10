import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "skrall" | "signal" | "value" | "place" | "accent" | "warn";

/** Märke med ett eller två ord. Tonen warn är för varningar (Överspelad, Skor på). */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ta-badge ta-badge-${tone}`}>{children}</span>;
}
