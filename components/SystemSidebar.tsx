"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import type { SystemSelection } from "@/lib/types";
import type { SystemSummary } from "@/lib/systemSummary";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: { horse_id: string; start_number: number; horses: { name: string } | null }[];
}

const STATUS = { idle: "", saving: "Sparar utkast …", saved: "Utkastet är sparat", error: "Kunde inte spara utkastet" } as const;

/** Systemet på dator: alltid synligt bredvid loppet. */
export function SystemSidebar({ races, selections, onSave, onClear, summary, draftName, draftStatus, insights, onPropose }: {
  races: RaceInfo[];
  selections: SystemSelection[];
  onSave: () => void;
  onClear: () => void;
  summary: SystemSummary;
  draftName: string;
  draftStatus: keyof typeof STATUS;
  /** Träffchans och värde (administratörer) */
  insights?: ReactNode;
  /** Öppnar "Föreslå system" (administratörer) */
  onPropose?: () => void;
}) {
  const empty = selections.length === 0;
  return (
    <aside aria-label="Ditt system" className="ta-card hidden lg:flex flex-col" style={{ flex: "1 1 300px", maxWidth: 360, minWidth: 0, position: "sticky", top: 80, maxHeight: "calc(100vh - 96px)", overflowY: "auto" }}>
      <div className="flex flex-col gap-0.5" style={{ padding: "16px 16px 8px" }}>
        <h2 className="ta-section-title">Ditt system</h2>
        <span style={{ font: "400 13px/18px var(--font-sans)", color: draftStatus === "error" ? "var(--danger)" : "var(--ink-muted)" }}>
          {[draftName, STATUS[draftStatus]].filter(Boolean).join(" · ")}
        </span>
      </div>
      {empty ? (
        <p style={{ margin: 0, padding: "12px 16px 16px", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>
          Tryck på ett nummer för att lägga hästen i systemet.
        </p>
      ) : (
        races.map((r) => {
          const nums = (selections.find((s) => s.race_number === r.race_number)?.horses ?? []).map((h) => h.start_number).sort((a, b) => a - b);
          return (
            <div key={r.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "52px minmax(0,1fr)", padding: "8px 16px", borderTop: "1px solid var(--line)" }}>
              <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>{`Avd ${r.race_number}`}</span>
              <span className="flex flex-wrap gap-1">
                {nums.length === 0 ? <span style={{ color: "var(--ink-muted)", font: "400 13px/18px var(--font-sans)" }}>Ingen vald</span> : nums.map((n) => (
                  <span key={n} style={{ minWidth: 28, height: 28, padding: "0 4px", boxSizing: "border-box", borderRadius: "var(--radius-sm)", display: "inline-grid",
                    placeItems: "center", background: "var(--accent)", color: "var(--on-accent)", font: "600 13px/1 var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                ))}
              </span>
            </div>
          );
        })
      )}
      {insights && <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>{insights}</div>}
      <div className="flex flex-col gap-3" style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
        {onPropose && <Button onClick={onPropose}>Föreslå system</Button>}
        <div className="flex justify-between items-baseline">
          <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.complete ? `${summary.rows} ${summary.rows === 1 ? "rad" : "rader"}` : summary.headline}</span>
          <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.costText ?? "–"}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClear} disabled={empty}>Rensa</Button>
          <Button variant="primary" onClick={onSave} disabled={!summary.complete} style={{ flex: 1 }}>Spara system</Button>
        </div>
      </div>
    </aside>
  );
}
