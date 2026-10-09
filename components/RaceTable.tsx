"use client";

import { useState } from "react";
import { Badge, Button, FormStrip, StartNumber, Term, ValueDelta } from "@/components/ui";
import { computeDistanceSignal, computeTrackFactor } from "@/lib/analysis";
import { fmtKmTime, fmtNum, fmtOrdinal, fmtPct } from "@/lib/format";
import type { RowModel } from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { TrackConfig } from "@/lib/types";

function badge(r: RowModel) {
  if (r.badge === "skrall") return <Badge tone="skrall">Skräll</Badge>;
  if (r.badge === "signal") return <Badge tone="signal">{`Signal +${r.edgeScore}`}</Badge>;
  if (r.badge === "scratched") return <Badge>Struken</Badge>;
  return null;
}

export function RaceTable({ races, rows, trackConfig, canSelect, onToggle, onOpen, showRace = false }: {
  /** Avdelningarna som raderna kommer från (en, eller alla i fliken Alla) */
  races: Race[]; rows: RowModel[]; trackConfig: TrackConfig | null; canSelect: boolean;
  onToggle: (r: RowModel) => void; onOpen: (r: RowModel) => void;
  /** Visa kolumnen Avd (när tabellen blandar avdelningar) */
  showRace?: boolean;
}) {
  const [all, setAll] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="ta-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ta-table">
            <thead>
              <tr>
                <th scope="col" className="ta-stick">Häst</th>
                {showRace && <th scope="col">Avd</th>}
                <th scope="col" className="ta-left hidden md:table-cell"><Term term="form">Senaste 5</Term></th>
                <th scope="col"><Term term="chans">Chans</Term></th>
                <th scope="col"><Term term="streck">Streck</Term></th>
                <th scope="col"><Term term="odds">Odds</Term></th>
                <th scope="col"><Term term="varde">Värde</Term></th>
                <th scope="col"><Term term="grund">Grund</Term></th>
                <th scope="col" className="ta-left">Märke</th>
                {all && <th scope="col"><Term term="cs">CS</Term></th>}
                {all && <th scope="col" className="ta-left">Distans</th>}
                {all && <th scope="col"><Term term="spar">Spår</Term></th>}
                {all && <th scope="col">Resultat</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = r.starter;
                const race = races.find((x) => x.race_number === r.raceNumber) ?? races[0];
                const method = race.start_method ?? "auto";
                const dist = all ? computeDistanceSignal(s.life_records ?? [], race.distance, method) : null;
                const trackF = all && s.post_position != null
                  ? computeTrackFactor(s.post_position, method, s.horse_starts_history ?? [], trackConfig ?? undefined, race.distance)
                  : null;
                return (
                  <tr key={`${r.raceNumber}-${r.n}`} style={r.scratched ? { opacity: 0.55 } : undefined}>
                    <td className="ta-stick">
                      <div className="flex items-center gap-2.5">
                        <StartNumber number={r.n} state={r.numberState} onClick={canSelect && r.selectable ? () => onToggle(r) : undefined}
                          label={showRace && canSelect && r.selectable
                            ? (r.numberState === "selected" ? `Ta bort avd ${r.raceNumber} nr ${r.n} från systemet` : `Lägg avd ${r.raceNumber} nr ${r.n} i systemet`)
                            : undefined} />
                        <button type="button" onClick={() => onOpen(r)} className="text-left truncate"
                          style={{ maxWidth: 160, background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", font: "600 14px/20px var(--font-sans)" }}>
                          {r.name}
                        </button>
                      </div>
                    </td>
                    {showRace && <td className="ta-muted">{r.raceNumber}</td>}
                    <td className="ta-left hidden md:table-cell"><FormStrip results={r.form} /></td>
                    <td className="ta-strong">{fmtPct(r.chansPct)}</td>
                    <td className="ta-muted">{fmtPct(r.streckPct)}</td>
                    <td className="ta-muted">{fmtNum(r.odds)}</td>
                    <td>{r.valueDelta != null ? <ValueDelta delta={r.valueDelta} highlight={r.isValue} /> : "–"}</td>
                    <td className="ta-muted">{fmtPct(r.grundPct)}</td>
                    <td className="ta-left">{badge(r)}</td>
                    {all && <td className="ta-muted">{r.cs ?? "–"}</td>}
                    {all && <td className="ta-left ta-muted">{dist?.label ?? "–"}</td>}
                    {all && <td className="ta-muted">{trackF != null ? `${s.post_position} (${fmtNum(trackF, 2)})` : "–"}</td>}
                    {all && <td className="ta-muted">{s.finish_position ? `${fmtOrdinal(s.finish_position)} · ${fmtKmTime(s.finish_time)}` : "–"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span style={{ font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Tryck på en rubrik för att se vad den betyder.</span>
        <Button variant="quiet" size="sm" onClick={() => setAll((v) => !v)}>{all ? "Visa färre kolumner" : "Visa alla kolumner"}</Button>
      </div>
    </div>
  );
}
