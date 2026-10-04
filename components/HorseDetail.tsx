"use client";

import { useEffect, useRef, useState } from "react";
import { Assessment, Badge, Button, FormStrip, StartNumber, Term, ValueDelta } from "@/components/ui";
import { HorseNotes } from "./notes/HorseNotes";
import { useModalLayer } from "@/lib/modalLayer";
import { fmtKmTime, fmtKr, fmtNum, fmtOrdinal, fmtPct } from "@/lib/format";
import { chansNote, distanceCategory, grundNote, placementLine, rankNote, trackNote } from "@/lib/horseDetail";
import type { RowModel } from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { Group, TrackConfig } from "@/lib/types";

interface FetchedStart {
  place: string; date: string; track: string; time: string; driver: string | null;
  post_position: number | null; distance: number | null; start_method: string | null;
}

const SEX: Record<string, string> = { mare: "sto", gelding: "valack", stallion: "hingst", horse: "häst" };
const DIST: Record<string, string> = { short: "Kort", medium: "Medel", long: "Lång" };
const PLACE_CLS: Record<string, string> = { "1": "ta-form-p1", "2": "ta-form-p2", "3": "ta-form-p3" };

function Section({ title, extra, children }: { title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ta-section-title">{title}</h3>
        {extra}
      </div>
      <div className="ta-card" style={{ padding: "2px 16px 4px" }}>{children}</div>
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
      <span style={{ font: "400 14px/20px var(--font-sans)", color: "var(--ink-muted)" }}>{label}</span>
      <span style={{ font: "600 14px/20px var(--font-sans)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SignalsSection({ signals, total }: { signals: { key: string; detail: string; points: number }[]; total: number }) {
  return (
    <Section title={<Term term="signal">Signaler</Term>}
      extra={signals.length ? <span style={{ font: "600 14px/20px var(--font-sans)" }}>{`Summa ${total > 0 ? "+" : ""}${total}`}</span> : undefined}>
      {signals.length === 0 ? (
        <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Inga signaler för den här hästen.</p>
      ) : signals.map((sig) => (
        <div key={sig.key} className="flex gap-3 py-2.5" style={{ borderTop: "1px solid var(--line)", font: "400 14px/20px var(--font-sans)", color: sig.points > 0 ? "var(--ink)" : "var(--ink-muted)" }}>
          <span style={{ width: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{sig.points > 0 ? `+${sig.points}` : `−${Math.abs(sig.points)}`}</span>
          <span>{sig.detail}</span>
        </div>
      ))}
    </Section>
  );
}

export function HorseDetail({ race, row, reasons, signals, trackConfig, userGroups, currentUserId, canSelect, onToggle, onClose }: {
  race: Race; row: RowModel; reasons: string[]; signals: { key: string; detail: string; points: number }[]; trackConfig: TrackConfig | null;
  userGroups: Group[]; currentUserId: string; canSelect: boolean; onToggle: () => void; onClose: () => void;
}) {
  const s = row.starter;
  const [starts, setStarts] = useState<FetchedStart[] | null>(null);
  const [startsError, setStartsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ raceId: race.id, startNumber: String(row.n) });
    fetch(`/api/horses/${s.horse_id}/starts?${params}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "fel");
        if (!cancelled) setStarts(data.starts ?? []);
      })
      .catch(() => { if (!cancelled) setStartsError("Kunde inte hämta starter från ATG. Försök igen."); });
    return () => { cancelled = true; };
  }, [race.id, row.n, s.horse_id, attempt]);

  const panelRef = useRef<HTMLDivElement>(null);
  useModalLayer(true, onClose, panelRef);

  const results = row.numberState !== "idle" && row.numberState !== "selected";
  const inSystem = row.numberState === "selected";
  const sex = SEX[s.horse_sex ?? ""] ?? s.horse_sex ?? "";
  const info = [s.horse_age ? `${s.horse_age} år` : null, sex || null, s.post_position != null ? `Spår ${s.post_position}` : null].filter(Boolean).join(" · ");
  const cat = distanceCategory(race.distance);
  const method = race.start_method ?? "auto";
  const methods = Array.from(new Set((s.life_records ?? []).map((r) => r.start_method)));
  const platsPct = s.starts_total ? Math.round((((s.wins_total ?? 0) + (s.places_2nd ?? 0) + (s.places_3rd ?? 0)) / s.starts_total) * 100) : null;
  const perStart = s.earnings_total && s.starts_total ? s.earnings_total / s.starts_total : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={row.name} className="fixed inset-0 z-[60] flex justify-center md:items-center md:p-6"
      style={{ background: "var(--scrim)" }} onClick={onClose}>
      <div ref={panelRef} tabIndex={-1} className="w-full md:max-w-[640px] h-full md:h-auto md:max-h-[90vh] overflow-y-auto md:rounded-[14px] outline-none"
        style={{ background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <button type="button" onClick={onClose} className="ta-link inline-flex items-center gap-1" style={{ background: "none", border: 0, cursor: "pointer", minHeight: 40 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            {`Avdelning ${race.race_number}`}
          </button>
        </header>

        <div className="flex flex-col gap-6 px-4 pt-5 pb-10">
          <section className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <StartNumber number={row.n} state={row.numberState} />
              <div className="min-w-0 flex-1">
                <h2 style={{ margin: 0, font: "600 22px/28px var(--font-sans)", letterSpacing: "-0.01em" }}>{row.name}</h2>
                {info && <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>{info}</p>}
                <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
                  {[s.driver ? `Kusk ${s.driver}` : null, s.trainer ? `Tränare ${s.trainer}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FormStrip results={row.form} />
              {row.badge === "skrall" && <Badge tone="skrall">Skräll</Badge>}
              {row.badge === "signal" && <Badge tone="signal">{`Signal +${row.edgeScore}`}</Badge>}
              {row.badge === "scratched" && <Badge>Struken</Badge>}
            </div>
            {results ? (
              <p style={{ margin: 0, font: "600 15px/20px var(--font-sans)" }}>
                {s.finish_position ? `${fmtOrdinal(s.finish_position)} plats · ${fmtKmTime(s.finish_time)}` : "Oplacerad"}
              </p>
            ) : canSelect && row.selectable ? (
              <Button variant={inSystem ? "secondary" : "primary"} onClick={onToggle} style={{ width: "100%" }}>
                {inSystem ? "Ta bort ur systemet" : "Lägg i systemet"}
              </Button>
            ) : null}
          </section>

          <Section title="Bedömning">
            <Assessment rows={[
              { key: "chans", label: <Term term="chans" />, value: fmtPct(row.chansPct), note: chansNote(row.chansRank) },
              { key: "streck", label: <Term term="streck" />, value: fmtPct(row.streckPct) },
              { key: "varde", label: <Term term="varde" />, value: row.valueDelta != null ? <ValueDelta delta={row.valueDelta} highlight={row.isValue} /> : "–",
                note: row.isValue ? "Vinner oftare än strecket säger." : null },
              { key: "odds", label: <Term term="odds" />, value: fmtNum(row.odds), note: s.p_odds != null ? `Platsodds ${fmtNum(s.p_odds, 2)}` : null },
              { key: "grund", label: <Term term="grund" />, value: fmtPct(row.grundPct), note: grundNote(reasons, row.disagree) },
              { key: "cs", label: <Term term="cs" />, value: row.cs != null ? String(row.cs) : "–", note: rankNote(row.csRank, "i fältet") },
              { key: "spar", label: <Term term="spar" />, value: s.post_position != null ? String(s.post_position) : "–", note: trackNote(s.post_position, trackConfig, race.distance) },
            ]} />
          </Section>

          <SignalsSection signals={signals} total={row.edgeScore} />

          <Section title="Senaste starter" extra={<span style={{ font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Från ATG</span>}>
            {startsError ? (
              <div className="flex flex-col gap-2 py-3">
                <p className="ta-error" style={{ margin: 0 }}>{startsError}</p>
                <Button size="sm" onClick={() => { setStarts(null); setStartsError(null); setAttempt((a) => a + 1); }}>Försök igen</Button>
              </div>
            ) : starts === null ? (
              <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Hämtar senaste starter från ATG …</p>
            ) : starts.length === 0 ? (
              <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Inga tidigare starter.</p>
            ) : (
              starts.map((r, i) => (
                <div key={i} className="grid items-center gap-2.5 py-2.5" style={{ gridTemplateColumns: "84px minmax(0,1fr) auto auto", borderTop: "1px solid var(--line)", font: "400 14px/20px var(--font-sans)" }}>
                  <span style={{ color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>{r.date}</span>
                  <span className="truncate">
                    {r.track}
                    <span style={{ color: "var(--ink-muted)" }}>{` · ${r.distance ?? "–"} ${r.start_method === "volte" ? "v" : r.start_method === "auto" ? "a" : ""}${r.driver ? ` · ${r.driver}` : ""}`}</span>
                  </span>
                  <span style={{ color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtKmTime(r.time)}</span>
                  <span className={`ta-form-cell ${PLACE_CLS[r.place] ?? (r.place === "d" ? "ta-form-dq" : "")}`}>{r.place || "–"}</span>
                </div>
              ))
            )}
          </Section>

          {methods.length > 0 && (
            <Section title="Bästa tider">
              <table className="w-full" style={{ borderCollapse: "collapse", font: "500 14px/20px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th scope="col" className="text-left" style={{ padding: "10px 0 6px", font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Start</th>
                    {(["short", "medium", "long"] as const).map((d) => (
                      <th key={d} scope="col" style={{ padding: "10px 0 6px", font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>{DIST[d]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m}>
                      <th scope="row" className="text-left" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>{m === "auto" ? "Auto" : "Volt"}</th>
                      {(["short", "medium", "long"] as const).map((d) => {
                        const rec = (s.life_records ?? []).find((r) => r.start_method === m && r.distance === d);
                        const current = m === method && d === cat;
                        return (
                          <td key={d} className="text-center" style={{ borderTop: "1px solid var(--line)", color: rec ? "var(--ink)" : "var(--ink-muted)" }}>
                            <span style={current ? { padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)", fontWeight: 600 } : undefined}>
                              {rec ? fmtKmTime(rec.time) : "–"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "6px 0 10px", font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>
                {`Markerad: dagens lopp, ${method === "auto" ? "autostart" : "voltstart"} ${DIST[cat].toLowerCase()}distans.`}
              </p>
            </Section>
          )}

          {s.shoes_reported && (
            <Section title="Utrustning">
              <StatRow label="Skor fram" value={`${s.shoes_front ? "Skor" : "Barfota"}${s.shoes_front_changed ? " (ny)" : ""}`} />
              <StatRow label="Skor bak" value={`${s.shoes_back ? "Skor" : "Barfota"}${s.shoes_back_changed ? " (ny)" : ""}`} />
              {s.sulky_type && <StatRow label="Vagn" value={s.sulky_type} />}
            </Section>
          )}

          <Section title="Statistik">
            <StatRow label="Livs" value={placementLine(s.starts_total, s.wins_total, s.places_2nd, s.places_3rd)} />
            <StatRow label="I år" value={placementLine(s.starts_current_year, s.wins_current_year, s.places_2nd_current_year, s.places_3rd_current_year)} />
            <StatRow label="Förra året" value={placementLine(s.starts_prev_year, s.wins_prev_year, s.places_2nd_prev_year, s.places_3rd_prev_year)} />
            {platsPct != null && <StatRow label="Plats" value={fmtPct(platsPct, 0)} />}
            {perStart != null && <StatRow label="Pengar per start" value={fmtKr(perStart)} />}
            {s.earnings_total ? <StatRow label="Totalt" value={fmtKr(s.earnings_total)} /> : null}
          </Section>

          {(s.driver || s.trainer) && (
            <Section title="Kusk och tränare">
              {s.driver && <StatRow label={`${s.driver}, kusk`} value={s.driver_win_pct != null ? `${fmtPct(s.driver_win_pct, 0)} segrar i år` : "–"} />}
              {s.trainer && <StatRow label={`${s.trainer}, tränare`} value={s.trainer_win_pct != null ? `${fmtPct(s.trainer_win_pct, 0)} segrar i år` : "–"} />}
            </Section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="ta-section-title">Anteckningar</h3>
            <HorseNotes horseId={s.horse_id} userGroups={userGroups} currentUserId={currentUserId} />
          </section>
        </div>
      </div>
    </div>
  );
}
