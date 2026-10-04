import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "skrall" | "signal" | "value" | "place" | "accent";

/** Märke med ett eller två ord. Högst ett per häst på hästraden. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ta-badge ta-badge-${tone}`}>{children}</span>;
}
