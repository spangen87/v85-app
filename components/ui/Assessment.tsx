import type { ReactNode } from "react";

/** Bedömningen i detaljvyn: etikett (oftast en Term), värde och en rad förklaring. */
export function Assessment({ rows }: { rows: { key: string; label: ReactNode; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className="ta-assess">
      {rows.map((r) => (
        <div key={r.key} className="ta-assess-row">
          <dt className="ta-assess-label">{r.label}</dt>
          <dd className="ta-assess-value">{r.value}</dd>
          {r.note && <dd className="ta-assess-note">{r.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
