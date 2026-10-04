"use client";

import type { ReactNode } from "react";
import { Badge, Button, Sheet, StartNumber } from "@/components/ui";
import type { GameSystem, SystemHorse, SystemSelection } from "@/lib/types";
import { lockedStarts, type SystemSummary } from "@/lib/systemSummary";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: { horse_id: string; start_number: number; horses: { name: string } | null; odds?: number | null; finish_position?: number | null }[];
}

const STATUS = { idle: "", saving: "Sparar utkast …", saved: "Utkastet sparas automatiskt", error: "Kunde inte spara utkastet" } as const;

/** Kupongen på mobil: alla avdelningar med nummer att trycka på. */
export function SystemDrawer({
  open, onClose, races, selections, onToggleHorse, onSave, onClear, summary, draftName, onDraftNameChange, draftStatus, savedDrafts, onLoadDraft,
  insights, onPropose,
}: {
  open: boolean; onClose: () => void; races: RaceInfo[]; selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void; onSave: () => void; onClear: () => void;
  summary: SystemSummary; draftName: string; onDraftNameChange: (s: string) => void; draftStatus: keyof typeof STATUS;
  savedDrafts: GameSystem[]; onLoadDraft: (d: GameSystem) => void;
  /** Träffchans och värde (administratörer) */
  insights?: ReactNode;
  /** Öppnar "Föreslå system" (administratörer) */
  onPropose?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Ditt system" wide
      footer={
        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-between items-baseline">
            <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.complete ? `${summary.rows} ${summary.rows === 1 ? "rad" : "rader"}` : summary.headline}</span>
            <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.costText ?? "–"}</span>
          </div>
          <span style={{ font: "400 13px/18px var(--font-sans)", color: draftStatus === "error" ? "var(--danger)" : "var(--ink-muted)" }}>
            {[summary.hint, STATUS[draftStatus]].filter(Boolean).join(" · ")}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClear} disabled={selections.length === 0} style={{ flex: 1 }}>Rensa</Button>
            <Button variant="primary" onClick={onSave} disabled={!summary.complete} style={{ flex: 2 }}>Spara system</Button>
          </div>
        </div>
      }>
      <div className="flex flex-col gap-1.5 mb-4">
        <label htmlFor="system-name" className="ta-field-label">Namn</label>
        <input id="system-name" className="ta-field" value={draftName} maxLength={80} onChange={(e) => onDraftNameChange(e.target.value)} />
      </div>
      {onPropose && <div className="mb-4"><Button onClick={onPropose}>Föreslå system</Button></div>}
      <div className="ta-card" style={{ overflow: "hidden" }}>
        {races.map((r, i) => {
          const picked = selections.find((s) => s.race_number === r.race_number)?.horses ?? [];
          const isPicked = (id: string) => picked.some((h) => h.horse_id === id);
          const locked = lockedStarts(r);
          return (
            <div key={r.id} className="flex flex-col gap-2.5" style={{ padding: "12px 16px", borderTop: i === 0 ? 0 : "1px solid var(--line)" }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ font: "600 15px/20px var(--font-sans)" }}>{`Avdelning ${r.race_number}`}</span>
                <span className="flex items-center gap-2">
                  {picked.length === 1 && <Badge>Spik</Badge>}
                  <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
                    {picked.length === 0 ? "Ingen vald" : `${picked.length} ${picked.length === 1 ? "häst" : "hästar"}`}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...r.starters].sort((a, b) => a.start_number - b.start_number).map((s) => (
                  <StartNumber key={s.horse_id} number={s.start_number} state={isPicked(s.horse_id) ? "selected" : "idle"}
                    label={locked.has(s.start_number) && !isPicked(s.horse_id)
                      ? `Nr ${s.start_number} ${s.horses?.name ?? ""} går inte att välja`
                      : `${isPicked(s.horse_id) ? "Ta bort" : "Lägg till"} nr ${s.start_number} ${s.horses?.name ?? ""} i avdelning ${r.race_number}`}
                    onClick={locked.has(s.start_number) && !isPicked(s.horse_id) ? undefined
                      : () => onToggleHorse(r.race_number, { horse_id: s.horse_id, start_number: s.start_number, horse_name: s.horses?.name ?? "" })} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {insights && <div className="mt-4">{insights}</div>}
      {savedDrafts.length > 0 && (
        <>
          <h3 className="ta-sheet-sub">Mina utkast</h3>
          {savedDrafts.map((d) => (
            <button key={d.id} type="button" onClick={() => onLoadDraft(d)} className="w-full text-left py-2"
              style={{ background: "none", border: 0, borderTop: "1px solid var(--line)", cursor: "pointer", font: "400 15px/22px var(--font-sans)", color: "var(--ink)" }}>
              {d.name}
              <span style={{ color: "var(--ink-muted)" }}>{` · ${d.total_rows} rader · ${new Date(d.created_at).toLocaleDateString("sv-SE")}`}</span>
            </button>
          ))}
        </>
      )}
    </Sheet>
  );
}
