import { fmtDelta } from "@/lib/format";

/** Chans minus streck i procentenheter. Grön bara när hästen uppfyller värderegeln. */
export function ValueDelta({ delta, highlight = false }: { delta: number; highlight?: boolean }) {
  return <span className={`ta-delta ${highlight ? "ta-delta-hl" : "ta-delta-plain"}`}>{fmtDelta(delta)}</span>;
}
