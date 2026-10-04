import type { ReactNode } from "react";
import { cx } from "./cx";

/** Ett mått: etikett, värde och undertext. Etiketten kan vara en <Term>. */
export function Metric({ label, value, sub, size = "md", align = "start" }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; size?: "md" | "lg"; align?: "start" | "end";
}) {
  return (
    <div className={cx("ta-metric", `ta-metric-${size}`, align === "end" && "ta-metric-end")}>
      <span className="ta-metric-label">{label}</span>
      <span className="ta-metric-value">{value}</span>
      {sub && <span className="ta-metric-sub">{sub}</span>}
    </div>
  );
}
