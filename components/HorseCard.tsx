"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { computeTrackFactor } from "@/lib/analysis";
import type { TrackConfig } from "@/lib/types";

interface LastResult {
  place: string;
  date: string;
  track: string;
  time: string;
}

interface LifeRecord {
  start_method: string;
  distance: string;
  place: number;
  time: string;
}

interface Starter {
  id: string;
  start_number: number;
  post_position: number | null;
  horse_id: string;
  driver: string;
  driver_win_pct: number | null;
  trainer: string;
  trainer_win_pct: number | null;
  odds: number | null;
  p_odds: number | null;
  bet_distribution: number | null;
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  sulky_type: string | null;
  horse_age: number | null;
  horse_sex: string | null;
  horse_color: string | null;
  pedigree_father: string | null;
  home_track: string | null;
  starts_total: number | null;
  wins_total: number | null;
  places_2nd: number | null;
  places_3rd: number | null;
  earnings_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  places_2nd_current_year: number | null;
  places_3rd_current_year: number | null;
  starts_prev_year: number | null;
  wins_prev_year: number | null;
  places_2nd_prev_year: number | null;
  places_3rd_prev_year: number | null;
  best_time: string | null;
  life_records: LifeRecord[] | null;
  last_5_results: LastResult[];
  formscore: number | null;
  finish_position: number | null;
  finish_time: string | null;
  horses: { name: string } | null;
}

const SEX_LABEL: Record<string, string> = {
  mare: "sto",
  gelding: "valack",
  stallion: "hingst",
  horse: "häst",
};

const DIST_LABEL: Record<string, string> = {
  short: "Kort",
  medium: "Medel",
  long: "Lång",
};

const CS_EXPLANATION =
  "CS – Composite Score (0–100): viktat index baserat på form (30%), vinstprocent (20%), odds (15%), tid (15%), konsistens (10%), distans (5%) och spårfaktor (5%).";

/* ── Form ring ───────────────────────────────────────────────── */
function FormRing({ score }: { score: number | null }) {
  const [open, setOpen] = useState(false);
  if (score == null) return null;
  const size = 38;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pct;
  const strokeColor =
    score >= 70 ? "var(--tn-value-high)" : score >= 50 ? "var(--tn-accent)" : "var(--tn-text-faint)";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="tn-form-ring"
        style={{ width: size, height: size }}
        title={CS_EXPLANATION}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            className="ring-bar"
            style={{ stroke: strokeColor, strokeDasharray: `${dash} ${c}` }}
          />
        </svg>
        <span className="ring-val" style={{ position: "relative", zIndex: 1 }}>{score}</span>
      </button>
      {open && (
        <span
          className="absolute right-0 top-full mt-1 z-20 w-64 text-xs rounded-lg shadow-xl p-3 leading-relaxed"
          style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)", color: "var(--tn-text-dim)" }}
        >
          {CS_EXPLANATION}
        </span>
      )}
    </span>
  );
}

/* ── Track adjustment badge ──────────────────────────────────── */
function TrackAdjustmentBadge({
  delta, trackConfig, postPosition, raceDistance,
}: {
  delta: number; trackConfig: TrackConfig; postPosition: number; raceDistance?: number;
}) {
  const isPositive = delta > 0;
  const parts: string[] = [];
  const openStretchApplied = trackConfig.open_stretch && trackConfig.open_stretch_lanes.includes(postPosition);
  const shortRaceApplied =
    trackConfig.short_race_threshold > 0 &&
    raceDistance !== undefined &&
    raceDistance <= trackConfig.short_race_threshold &&
    postPosition >= 5;
  if (openStretchApplied) parts.push(`Open stretch: +0.12 (spår ${postPosition}, ${trackConfig.track_name})`);
  if (shortRaceApplied) parts.push(`Kort lopp: -0.08 (spår ${postPosition})`);

  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded"
      title={parts.join(" · ")}
      style={{
        background: isPositive ? "var(--tn-value-high-bg)" : "var(--tn-value-low-bg)",
        color: isPositive ? "var(--tn-value-high)" : "var(--tn-value-low)",
      }}
    >
      {isPositive ? "↑" : "↓"}
    </span>
  );
}

/* ── Horseshoe icon ──────────────────────────────────────────── */
function HorseshoeIcon({ className = "", style, size = 18 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M8 20 L8 11 C8 7 10 5 12 5 C14 5 16 7 16 11 L16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <line x1="5.5" y1="20" x2="10.5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13.5" y1="20" x2="18.5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Shoe badge ──────────────────────────────────────────────── */
function ShoeBadge({ hasShoe, changed, label }: { hasShoe: boolean | null; changed: boolean | null; label: string }) {
  if (hasShoe == null) return null;
  const color = changed ? "var(--tn-warn)" : "var(--tn-text-faint)";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        <HorseshoeIcon style={{ color }} size={16} />
        {!hasShoe && (
          <svg width="16" height="16" viewBox="0 0 24 24" className="absolute inset-0" style={{ color }}>
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span className="text-[9px] leading-none" style={{ color }}>{label}</span>
      {changed && <span className="text-[9px] leading-none font-bold" style={{ color: "var(--tn-warn)" }}>Ny</span>}
    </div>
  );
}

/* ── Stat row ────────────────────────────────────────────────── */
function StatRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "" || value === "–") return null;
  return (
    <div className="flex justify-between text-xs py-1">
      <span style={{ color: "var(--tn-text-faint)" }}>{label}</span>
      <span className="tn-mono" style={{ color: "var(--tn-text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PlacementStr(starts: number | null, wins: number | null, p2: number | null, p3: number | null): string {
  if (!starts) return "–";
  return `${starts} st  ${wins ?? 0}-${p2 ?? 0}-${p3 ?? 0}`;
}

/* ── Life records table ──────────────────────────────────────── */
function LifeRecordsTable({ records, currentMethod, currentDistance }: {
  records: LifeRecord[]; currentMethod: string; currentDistance: string;
}) {
  if (!records.length) return null;
  const methods = Array.from(new Set(records.map((r) => r.start_method)));
  const distances = ["short", "medium", "long"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left pb-1.5 pr-2 font-normal tn-eyebrow">Start</th>
            {distances.map((d) => (
              <th
                key={d}
                className="text-center pb-1.5 px-2 font-normal tn-mono"
                style={{
                  fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: d === currentDistance ? "var(--tn-accent)" : "var(--tn-text-faint)",
                  fontWeight: d === currentDistance ? 600 : 400,
                }}
              >
                {DIST_LABEL[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {methods.map((method) => (
            <tr key={method}>
              <td
                className="pr-2 py-1 tn-mono text-xs"
                style={{
                  color: method === currentMethod ? "var(--tn-accent)" : "var(--tn-text-faint)",
                  fontWeight: method === currentMethod ? 600 : 400,
                }}
              >
                {method === "auto" ? "Auto" : "Volt"}
              </td>
              {distances.map((dist) => {
                const rec = records.find((r) => r.start_method === method && r.distance === dist);
                const isCurrent = method === currentMethod && dist === currentDistance;
                return (
                  <td
                    key={dist}
                    className="text-center px-2 py-1 tn-mono text-xs rounded"
                    style={{
                      background: isCurrent ? "var(--tn-accent-faint)" : "transparent",
                      color: isCurrent ? "var(--tn-accent)" : "var(--tn-text-dim)",
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    {rec ? rec.time : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Fetched starts table ────────────────────────────────────── */
interface FetchedStart {
  place: string;
  date: string;
  track: string;
  time: string;
  driver: string | null;
  post_position: number | null;
  distance: number | null;
  start_method: string | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
}

/* ── Main HorseCard ──────────────────────────────────────────── */
export function HorseCard({
  starter,
  notesSection,
  raceDistance,
  raceStartMethod,
  isValue,
  sortRank,
  isSelected,
  onSelect,
  trackConfig,
  internalRaceId,
}: {
  starter: Starter;
  notesSection?: ReactNode;
  raceDistance?: number;
  raceStartMethod?: string;
  isValue?: boolean;
  sortRank?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  trackConfig?: TrackConfig;
  internalRaceId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fetchedStarts, setFetchedStarts] = useState<FetchedStart[] | null>(null);
  const [fetchingStarts, setFetchingStarts] = useState(false);
  const [startsError, setStartsError] = useState<string | null>(null);

  async function handleFetchStarts() {
    setFetchingStarts(true);
    setStartsError(null);
    try {
      const params = new URLSearchParams();
      if (internalRaceId) params.set("raceId", internalRaceId);
      params.set("startNumber", String(starter.start_number));
      const res = await fetch(`/api/horses/${starter.horse_id}/starts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Okänt fel");
      setFetchedStarts(data.starts);
    } catch (err) {
      setStartsError(err instanceof Error ? err.message : "Okänt fel");
    } finally {
      setFetchingStarts(false);
    }
  }

  const winRateYear = starter.starts_current_year
    ? Math.round(((starter.wins_current_year ?? 0) / starter.starts_current_year) * 100)
    : null;
  const platsRate = starter.starts_total
    ? Math.round(
        (((starter.wins_total ?? 0) + (starter.places_2nd ?? 0) + (starter.places_3rd ?? 0)) /
          starter.starts_total) * 100
      )
    : null;
  const krPerStart =
    starter.earnings_total && starter.starts_total && starter.starts_total > 0
      ? Math.round(starter.earnings_total / starter.starts_total)
      : null;

  const sex = SEX_LABEL[starter.horse_sex ?? ""] ?? starter.horse_sex ?? "";
  const shoesChanged = starter.shoes_front_changed || starter.shoes_back_changed;

  const currentDistanceCategory =
    raceDistance == null ? "short"
    : raceDistance <= 1800 ? "short"
    : raceDistance <= 2400 ? "medium"
    : "long";
  const currentMethod = raceStartMethod ?? "auto";

  // Start number box color based on finish position
  const finishBoxStyle: React.CSSProperties = (() => {
    if (starter.finish_position === 1) return { background: "var(--tn-p1)", color: "#0a0e14" };
    if (starter.finish_position === 2) return { background: "var(--tn-p2)", color: "#0a0e14" };
    if (starter.finish_position === 3) return { background: "var(--tn-p3)", color: "#fff" };
    if (starter.finish_position != null) return { background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" };
    return { background: "var(--tn-bg-chip)", color: "var(--tn-text)" };
  })();

  // Card border style
  const cardStyle: React.CSSProperties = {
    background: "var(--tn-bg-card)",
    border: isSelected
      ? "1px solid var(--tn-value-high)"
      : isValue
      ? `1px solid color-mix(in oklab, var(--tn-value-high) 40%, var(--tn-border))`
      : "1px solid var(--tn-border)",
    borderRadius: 12,
    overflow: "hidden",
    transition: "border-color 0.15s",
    ...(isSelected ? { boxShadow: "inset 3px 0 0 var(--tn-value-high)" } : {}),
  };

  // Track adjustment delta
  const trackDelta: number | null = (() => {
    if (!trackConfig || starter.post_position == null) return null;
    const history: never[] = [];
    const startMethod = raceStartMethod ?? "auto";
    const baseF = computeTrackFactor(starter.post_position, startMethod, history);
    const adjustedF = computeTrackFactor(starter.post_position, startMethod, history, trackConfig, raceDistance);
    const csDelta = Math.round((adjustedF - baseF) * 500);
    if (Math.abs(csDelta) < 1) return null;
    return csDelta;
  })();

  return (
    <div style={cardStyle} className="cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
      {/* ── Compact header ── */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Start number / system button */}
        {onSelect != null ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            title={isSelected ? "Ta bort från system" : "Lägg till i system"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold tn-mono transition-colors shrink-0"
            style={
              isSelected
                ? { background: "var(--tn-value-high)", color: "#0a0e14" }
                : { background: "var(--tn-bg-chip)", color: "var(--tn-text)" }
            }
          >
            {starter.start_number}
          </button>
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold tn-mono shrink-0"
            style={finishBoxStyle}
            title={
              starter.finish_position != null
                ? `Slutplacering: ${starter.finish_position}${starter.finish_time ? ` · ${starter.finish_time}` : ""}`
                : undefined
            }
          >
            {starter.start_number}
          </div>
        )}

        {/* Horse name + driver */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {sortRank != null && (
              <span className="tn-mono text-[10px] font-bold shrink-0" style={{ color: "var(--tn-accent)" }}>
                #{sortRank}
              </span>
            )}
            <span
              className="font-semibold text-sm truncate"
              style={{ color: "var(--tn-text)", letterSpacing: "-0.01em" }}
            >
              {starter.horses?.name ?? "–"}
              {shoesChanged && (
                <span className="ml-1 text-[10px] font-semibold" style={{ color: "var(--tn-warn)" }} title="Skoändring">
                  ●
                </span>
              )}
            </span>
          </div>
          <span className="text-xs truncate block" style={{ color: "var(--tn-text-dim)" }}>
            {starter.driver}
          </span>
        </div>

        {/* Right: streck% · odds · badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            {starter.bet_distribution != null && starter.bet_distribution > 0 && (
              <span className="tn-mono text-xs font-semibold" style={{ color: "var(--tn-accent)" }} title="Streckprocent">
                {starter.bet_distribution.toFixed(1)}%
              </span>
            )}
            {starter.odds != null && (
              <span className="tn-mono text-xs" style={{ color: "var(--tn-text-dim)" }} title="Vinnarodds">
                {starter.odds.toFixed(1)}x
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FormRing score={starter.formscore} />
            {trackDelta !== null && trackConfig && starter.post_position != null && (
              <TrackAdjustmentBadge
                delta={trackDelta}
                trackConfig={trackConfig}
                postPosition={starter.post_position}
                raceDistance={raceDistance}
              />
            )}
          </div>
        </div>
      </div>

      {/* Last-5 results */}
      {starter.last_5_results.length > 0 && (
        <div className="tn-last5 px-3.5 pb-2.5">
          {starter.last_5_results.map((r, i) => {
            const cls = r.place === "1" ? "r1" : r.place === "2" ? "r2" : r.place === "3" ? "r3" : "rdq";
            return (
              <span key={i} className={cls} title={`${r.date} · ${r.track} · ${r.time}`}>
                {r.place || "–"}
              </span>
            );
          })}
        </div>
      )}

      {/* Expand indicator */}
      <div className="px-3.5 pb-2 flex items-center">
        <span className="tn-mono text-[9px]" style={{ color: "var(--tn-text-faint)", letterSpacing: "0.1em" }}>
          {expanded ? "▲ DÖLJ" : "▼ DETALJER"}
        </span>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div
          className="flex flex-col gap-4 px-3.5 pt-3.5 pb-4"
          style={{ borderTop: "1px solid var(--tn-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Finish result badge */}
          {starter.finish_position != null && (
            <div className="flex items-center gap-2">
              <span
                className="tn-mono text-sm font-bold px-3 py-1.5 rounded-full"
                style={finishBoxStyle}
              >
                {starter.finish_position}:a
                {starter.finish_time ? ` · ${starter.finish_time}` : ""}
              </span>
            </div>
          )}

          {/* Horse info */}
          <div className="text-xs space-y-1" style={{ color: "var(--tn-text-dim)" }}>
            {(starter.horse_age || sex || starter.horse_color) && (
              <p>{[starter.horse_age ? `${starter.horse_age} år` : null, sex || null, starter.horse_color || null].filter(Boolean).join(" · ")}</p>
            )}
            {starter.pedigree_father && (
              <p>Far: <span style={{ color: "var(--tn-text)" }}>{starter.pedigree_father}</span></p>
            )}
            {starter.home_track && (
              <p>Hemmaplan: <span style={{ color: "var(--tn-text)" }}>{starter.home_track}</span></p>
            )}
          </div>

          {/* Shoe info */}
          {starter.shoes_reported && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                border: `1px solid ${shoesChanged ? "var(--tn-warn)" : "var(--tn-border)"}`,
                background: shoesChanged ? "var(--tn-warn-bg)" : "var(--tn-bg-chip)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-5">
                  <ShoeBadge hasShoe={starter.shoes_front} changed={starter.shoes_front_changed} label="Fram" />
                  <ShoeBadge hasShoe={starter.shoes_back} changed={starter.shoes_back_changed} label="Bak" />
                </div>
                {starter.sulky_type && (
                  <span style={{ color: "var(--tn-text-faint)" }}>Vagn: {starter.sulky_type}</span>
                )}
              </div>
            </div>
          )}

          {/* Quick stats grid */}
          <div
            className="grid grid-cols-3 text-center text-xs rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--tn-border)" }}
          >
            {[
              {
                label: "LIVS",
                val: `${starter.wins_total ?? "–"}-${starter.places_2nd ?? "–"}-${starter.places_3rd ?? "–"}`,
                sub: `${starter.starts_total ?? "–"} st`,
              },
              {
                label: "ÅR",
                val: winRateYear != null ? `${winRateYear}%` : "–",
                sub: `${starter.starts_current_year ?? "–"} st`,
              },
              {
                label: "REKORD",
                val: starter.best_time || "–",
                sub: platsRate != null ? `Plats ${platsRate}%` : "",
              },
            ].map((s, i) => (
              <div
                key={s.label}
                className="p-2.5"
                style={{ borderLeft: i > 0 ? "1px solid var(--tn-border)" : "none" }}
              >
                <p className="tn-eyebrow mb-1">{s.label}</p>
                <p className="tn-mono font-semibold" style={{ color: "var(--tn-text)" }}>{s.val}</p>
                <p className="tn-mono text-[10px] mt-0.5" style={{ color: "var(--tn-text-faint)" }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Life records */}
          {starter.life_records && starter.life_records.length > 0 && (
            <div>
              <p className="tn-eyebrow mb-2">BÄSTA TIDER</p>
              <LifeRecordsTable
                records={starter.life_records}
                currentMethod={currentMethod}
                currentDistance={currentDistanceCategory}
              />
              <p className="tn-mono text-[10px] mt-1" style={{ color: "var(--tn-text-faint)" }}>
                Markerat = dagens lopp ({currentMethod === "auto" ? "autostart" : "voltstart"},{" "}
                {DIST_LABEL[currentDistanceCategory]?.toLowerCase()})
              </p>
            </div>
          )}

          {/* Detailed career stats */}
          <div>
            <p className="tn-eyebrow mb-2">STATISTIK</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tn-border)" }}>
              <StatRow label="Starter livs" value={PlacementStr(starter.starts_total, starter.wins_total, starter.places_2nd, starter.places_3rd)} />
              <StatRow label="Innevarande år" value={PlacementStr(starter.starts_current_year, starter.wins_current_year, starter.places_2nd_current_year, starter.places_3rd_current_year)} />
              <StatRow label="Föregående år" value={PlacementStr(starter.starts_prev_year, starter.wins_prev_year, starter.places_2nd_prev_year, starter.places_3rd_prev_year)} />
              {platsRate != null && <StatRow label="Plats%" value={`${platsRate}%`} />}
              {krPerStart != null && <StatRow label="Kr/start" value={krPerStart.toLocaleString("sv-SE")} />}
              {starter.earnings_total != null && starter.earnings_total > 0 && (
                <StatRow label="Total intjänat" value={starter.earnings_total.toLocaleString("sv-SE") + " kr"} />
              )}
            </div>
          </div>

          {/* Odds */}
          {(starter.odds != null || starter.p_odds != null) && (
            <div>
              <p className="tn-eyebrow mb-2">ODDS</p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tn-border)" }}>
                {starter.odds != null && <StatRow label="Vinnarodds" value={`${starter.odds.toFixed(2)}x`} />}
                {starter.p_odds != null && <StatRow label="Platsodds" value={`${starter.p_odds.toFixed(2)}x`} />}
              </div>
            </div>
          )}

          {/* Driver & Trainer */}
          {(starter.driver || starter.trainer) && (
            <div>
              <p className="tn-eyebrow mb-2">KUSK & TRÄNARE</p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tn-border)", background: "var(--tn-bg-chip)" }}>
                {starter.driver && (
                  <div className="flex justify-between text-xs px-3 py-2" style={{ borderBottom: starter.trainer ? "1px solid var(--tn-border)" : "none" }}>
                    <span style={{ color: "var(--tn-text-dim)" }}>{starter.driver}</span>
                    <span className="tn-mono" style={{ color: "var(--tn-text)" }}>
                      {starter.driver_win_pct != null ? `${starter.driver_win_pct}% vinst (år)` : "–"}
                    </span>
                  </div>
                )}
                {starter.trainer && (
                  <div className="flex justify-between text-xs px-3 py-2">
                    <span style={{ color: "var(--tn-text-dim)" }}>{starter.trainer}</span>
                    <span className="tn-mono" style={{ color: "var(--tn-text)" }}>
                      {starter.trainer_win_pct != null ? `${starter.trainer_win_pct}% vinst (år)` : "–"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent starts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="tn-eyebrow">SENASTE STARTER</p>
              {fetchedStarts === null && (
                <button
                  onClick={handleFetchStarts}
                  disabled={fetchingStarts}
                  className="tn-mono text-xs transition-colors disabled:opacity-50"
                  style={{ color: "var(--tn-accent)" }}
                >
                  {fetchingStarts ? "Hämtar..." : "Hämta från ATG"}
                </button>
              )}
            </div>
            {startsError && (
              <p className="text-xs rounded-lg p-2" style={{ color: "var(--tn-value-low)", background: "var(--tn-value-low-bg)" }}>
                {startsError}
              </p>
            )}
            {fetchedStarts !== null && fetchedStarts.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--tn-border)" }}>
                        {["Datum", "Bana", "Kusk", "Spår", "Dist", "Start", "Plac", "Tid", "Skor"].map((h) => (
                          <th key={h} className="text-left pb-2 pr-3 font-normal tn-eyebrow" style={{ paddingRight: 8 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedStarts.map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid var(--tn-border)" }}>
                          <td className="py-2 pr-3 tn-mono text-[11px] whitespace-nowrap" style={{ color: "var(--tn-text-faint)" }}>{r.date}</td>
                          <td className="py-2 pr-3 text-xs" style={{ color: "var(--tn-text-dim)" }}>{r.track}</td>
                          <td className="py-2 pr-3 text-xs" style={{ color: "var(--tn-text-dim)" }}>{r.driver || "–"}</td>
                          <td className="py-2 pr-3 text-center tn-mono text-xs" style={{ color: "var(--tn-text-faint)" }}>{r.post_position ?? "–"}</td>
                          <td className="py-2 pr-3 text-right tn-mono text-xs whitespace-nowrap" style={{ color: "var(--tn-text-faint)" }}>{r.distance != null ? `${r.distance} m` : "–"}</td>
                          <td className="py-2 pr-3 text-center">
                            {r.start_method ? (
                              <span
                                className="tn-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{
                                  background: "var(--tn-bg-chip)",
                                  color: r.start_method === "auto" ? "var(--tn-text-faint)" : "var(--tn-accent)",
                                }}
                              >
                                {r.start_method === "auto" ? "Auto" : "Volt"}
                              </span>
                            ) : "–"}
                          </td>
                          <td className="py-2 pr-3 text-center tn-mono font-bold" style={{ color: "var(--tn-text)" }}>{r.place || "–"}</td>
                          <td className="py-2 pr-3 text-right tn-mono text-xs whitespace-nowrap" style={{ color: "var(--tn-text-dim)" }}>{r.time}</td>
                          <td className="py-2">
                            <div className="flex items-center justify-center gap-2">
                              {r.shoes_front != null && (
                                <span className="flex flex-col items-center gap-0.5">
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={13} style={{ color: r.shoes_front ? "var(--tn-text-faint)" : "var(--tn-border-strong)" }} />
                                    {!r.shoes_front && (
                                      <svg width="13" height="13" viewBox="0 0 24 24" className="absolute inset-0" style={{ color: "var(--tn-border-strong)" }}>
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="tn-mono" style={{ fontSize: 8, color: "var(--tn-text-faint)" }}>F</span>
                                </span>
                              )}
                              {r.shoes_back != null && (
                                <span className="flex flex-col items-center gap-0.5">
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={13} style={{ color: r.shoes_back ? "var(--tn-text-faint)" : "var(--tn-border-strong)" }} />
                                    {!r.shoes_back && (
                                      <svg width="13" height="13" viewBox="0 0 24 24" className="absolute inset-0" style={{ color: "var(--tn-border-strong)" }}>
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="tn-mono" style={{ fontSize: 8, color: "var(--tn-text-faint)" }}>B</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden">
                  {fetchedStarts.map((r, i) => (
                    <div key={i} className="py-2 space-y-1" style={{ borderTop: "1px solid var(--tn-border)" }}>
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="tn-mono shrink-0" style={{ color: "var(--tn-text-faint)", width: 68 }}>{r.date}</span>
                        <span className="flex-1 truncate min-w-0" style={{ color: "var(--tn-text-dim)" }}>{r.track}</span>
                        {r.post_position != null && (
                          <span className="tn-mono text-[10px] shrink-0" style={{ color: "var(--tn-text-faint)" }}>Sp {r.post_position}</span>
                        )}
                        {r.distance != null && (
                          <span className="tn-mono text-[10px] shrink-0" style={{ color: "var(--tn-text-faint)" }}>{r.distance} m</span>
                        )}
                        {r.start_method && (
                          <span
                            className="tn-mono text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                            style={{ background: "var(--tn-bg-chip)", color: r.start_method === "auto" ? "var(--tn-text-faint)" : "var(--tn-accent)" }}
                          >
                            {r.start_method === "auto" ? "A" : "V"}
                          </span>
                        )}
                        <span className="tn-mono font-bold shrink-0" style={{ color: "var(--tn-text)", width: 16, textAlign: "center" }}>{r.place || "–"}</span>
                        <span className="tn-mono text-xs shrink-0" style={{ color: "var(--tn-text-dim)", width: 48, textAlign: "right" }}>{r.time}</span>
                      </div>
                      {r.driver && (
                        <div className="text-[11px] truncate" style={{ color: "var(--tn-text-faint)" }}>{r.driver}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {fetchedStarts !== null && fetchedStarts.length === 0 && (
              <p className="text-xs italic" style={{ color: "var(--tn-text-faint)" }}>Inga starter hittades.</p>
            )}
            {fetchedStarts === null && !fetchingStarts && !startsError && (
              <p className="text-xs italic" style={{ color: "var(--tn-text-faint)" }}>
                Klicka &quot;Hämta från ATG&quot; för att visa senaste starter.
              </p>
            )}
          </div>

          {/* Notes */}
          {notesSection}
        </div>
      )}
    </div>
  );
}
