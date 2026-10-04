import type { ReactNode } from "react";

/** Tomt läge: rubrik, en mening och högst en handling. */
export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ta-card flex flex-col items-center gap-3 text-center" style={{ padding: "var(--space-8) var(--space-4)" }}>
      <p style={{ margin: 0, font: "600 17px/24px var(--font-sans)", color: "var(--ink)" }}>{title}</p>
      {text && <p className="ta-text">{text}</p>}
      {action}
    </div>
  );
}
