"use client";

import { computeDistanceSignal, computeTrackFactor, type LifeRecord, type DistanceSignal } from "@/lib/analysis";
import type { TrackConfig } from "@/lib/types";

interface AnalysisStarter {
  start_number: number;
  horses: { name: string } | null;
  odds: number | null;
  bet_distribution: number | null;
  life_records: LifeRecord[] | null;
  formscore: number | null;
  finish_position?: number | null;
  finish_time?: string | null;
}

interface AnalysisPanelProps {
  starters: AnalysisStarter[];
  raceMeters: number;
  raceStartMethod: string;
  trackConfig?: TrackConfig;
}

function DistBadge({ factor, label }: { factor: number; label: string }) {
  let icon: string;
  let color: string;
  let bg: string;
  if (factor >= 1.3) { icon = "↑↑"; color = "var(--tn-value-high)"; bg = "var(--tn-value-high-bg)"; }
  else if (factor >= 1.1) { icon = "↑"; color = "var(--tn-value-high)"; bg = "var(--tn-value-high-bg)"; }
  else if (factor >= 0.95) { icon = "→"; color = "var(--tn-text-faint)"; bg = "var(--tn-bg-chip)"; }
  else if (factor >= 0.7) { icon = "↓"; color = "var(--tn-warn)"; bg = "var(--tn-warn-bg)"; }
  else { icon = "↓↓"; color = "var(--tn-value-low)"; bg = "var(--tn-value-low-bg)"; }

  return (
    <span
      className="inline-flex items-center gap-1 tn-mono text-xs px-1.5 py-0.5 rounded"
      style={{ color, background: bg }}
      title={label}
    >
      <span className="font-bold">{icon}</span>
      <span className="hidden sm:inline truncate max-w-[160px]">{label}</span>
    </span>
  );
}

function DeltaChip({ value, hasStreck }: { value: number; hasStreck: boolean }) {
  if (!hasStreck) {
    return <span className="text-xs italic" style={{ color: "var(--tn-text-faint)" }}>—</span>;
  }
  if (value >= 5) {
    return (
      <span className="tn-delta tn-delta-pos font-bold">+{value} pp</span>
    );
  }
  if (value >= 2) {
    return (
      <span className="tn-delta tn-delta-pos">+{value} pp</span>
    );
  }
  if (value <= -5) {
    return (
      <span className="tn-delta tn-delta-neg">{value} pp</span>
    );
  }
  return (
    <span className="tn-delta tn-delta-neu">{value > 0 ? `+${value}` : value} pp</span>
  );
}

interface RankedStarter {
  starter: AnalysisStarter;
  cs: number;
  distSignal: DistanceSignal;
  calcPct: number;
  streckPct: number;
  value: number;
  rank: number;
  isValue: boolean;
  trackFactorBase: number;
  trackFactorAdjusted: number;
  trackFactorDelta: number;
}

function rankStarters(
  starters: AnalysisStarter[],
  raceMeters: number,
  raceStartMethod: string,
  trackConfig?: TrackConfig
): RankedStarter[] {
  const withDist = starters.map((s) => {
    const records: LifeRecord[] = Array.isArray(s.life_records) ? s.life_records : [];
    const distSignal = computeDistanceSignal(records, raceMeters, raceStartMethod);
    const cs = s.formscore ?? 0;
    const betDist = s.bet_distribution;
    const streckPct = betDist != null && isFinite(Number(betDist)) ? Number(betDist) : 0;
    const totalCS = starters.reduce((sum, st) => sum + (st.formscore ?? 0), 0);
    const calcPct = totalCS > 0 ? Math.round(((cs / totalCS) * 100) * 10) / 10 : 0;
    const value = streckPct > 0 ? Math.round((calcPct - streckPct) * 10) / 10 : 0;
    const isValue = cs > 55 && value > 0;
    const postPos = (s as { post_position?: number | null }).post_position ?? 1;
    const horseHistory = (s as { horse_starts_history?: unknown[] }).horse_starts_history ?? [];
    const trackFactorBase = computeTrackFactor(postPos, raceStartMethod, horseHistory as never[]);
    const trackFactorAdjusted = trackConfig
      ? computeTrackFactor(postPos, raceStartMethod, horseHistory as never[], trackConfig, raceMeters)
      : trackFactorBase;
    const trackFactorDelta = Math.round((trackFactorAdjusted - trackFactorBase) * 100) / 100;
    return { starter: s, cs, distSignal, calcPct, streckPct, value, rank: 0, isValue, trackFactorBase, trackFactorAdjusted, trackFactorDelta };
  });
  withDist.sort((a, b) => b.cs - a.cs);
  withDist.forEach((r, i) => (r.rank = i + 1));
  return withDist;
}

export function AnalysisPanel({ starters, raceMeters, raceStartMethod, trackConfig }: AnalysisPanelProps) {
  const ranked = rankStarters(starters, raceMeters, raceStartMethod, trackConfig);
  const hasStreckning = ranked.some((r) => r.streckPct > 0);
  const distLabel = raceMeters <= 1800 ? "kort" : raceMeters <= 2400 ? "medel" : "lång";

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--tn-border)",
        background: `linear-gradient(180deg, color-mix(in oklab, var(--tn-accent) 4%, var(--tn-bg-card)), var(--tn-bg-card) 60%)`,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--tn-border)" }}>
        <h3 className="tn-serif text-lg" style={{ color: "var(--tn-text)", letterSpacing: "-0.01em" }}>
          Matematisk analys
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--tn-text-dim)", lineHeight: 1.5 }}>
          CS (0–100) = form (30%) + vinstprocent (20%) + odds (15%) + tid (15%) + konsistens (10%) + distans (5%) + spår (5%).
          {" "}Distans: {distLabel} ({raceMeters} m, {raceStartMethod}start).
          {" "}Spelvärde = CS-andel − streckning.
        </p>
        {!hasStreckning && (
          <p
            className="text-xs mt-2 rounded-lg px-3 py-2"
            style={{ color: "var(--tn-warn)", background: "var(--tn-warn-bg)" }}
          >
            Streckningsdata saknas — hämta om spelet när poolen är öppen.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--tn-border)" }}>
              {["#", "Häst", "CS", "Odds", "Ber.", "Strk.", "Distans", ...(trackConfig ? ["Spår"] : []), "Värde", "Res."].map((h) => (
                <th
                  key={h}
                  className="tn-eyebrow py-2.5 px-2 first:pl-4 last:pr-4 font-normal"
                  style={{ textAlign: h === "Häst" || h === "Distans" ? "left" : h === "#" ? "left" : "right" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const finishStyle: React.CSSProperties =
                r.starter.finish_position === 1 ? { background: "var(--tn-p1)", color: "#0a0e14" }
                : r.starter.finish_position === 2 ? { background: "var(--tn-p2)", color: "#0a0e14" }
                : r.starter.finish_position === 3 ? { background: "var(--tn-p3)", color: "#fff" }
                : r.starter.finish_position != null ? { background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }
                : {};

              return (
                <tr
                  key={r.starter.start_number}
                  style={{
                    borderBottom: "1px solid var(--tn-border)",
                    background: r.isValue ? "var(--tn-value-high-bg)" : "transparent",
                    ...(r.isValue ? { boxShadow: "inset 3px 0 0 var(--tn-value-high)" } : {}),
                  }}
                >
                  {/* Rank */}
                  <td className="py-2.5 pl-4 pr-2 tn-mono text-xs" style={{ color: r.rank === 1 ? "var(--tn-warn)" : "var(--tn-text-faint)" }}>
                    #{r.rank}
                  </td>
                  {/* Name */}
                  <td className="py-2.5 pr-2 text-sm" style={{ color: "var(--tn-text)", fontWeight: 500 }}>
                    <span className="tn-mono text-xs mr-1" style={{ color: "var(--tn-text-faint)" }}>{r.starter.start_number}.</span>
                    {r.starter.horses?.name ?? "–"}
                    {r.isValue && (
                      <span
                        className="ml-2 tn-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--tn-value-high-bg)", color: "var(--tn-value-high)", letterSpacing: "0.08em" }}
                      >
                        VÄRDE
                      </span>
                    )}
                  </td>
                  {/* CS */}
                  <td className="py-2.5 pr-2 text-right">
                    <span
                      className="tn-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: r.cs >= 70 ? "var(--tn-value-high)" : r.cs >= 40 ? "var(--tn-accent)" : "var(--tn-text-faint)",
                        background: r.cs >= 70 ? "var(--tn-value-high-bg)" : r.cs >= 40 ? "var(--tn-accent-faint)" : "var(--tn-bg-chip)",
                      }}
                    >
                      {r.cs}
                    </span>
                  </td>
                  {/* Odds */}
                  <td className="py-2.5 pr-2 text-right tn-mono text-xs" style={{ color: "var(--tn-text-dim)" }}>
                    {r.starter.odds != null ? `${r.starter.odds.toFixed(1)}x` : "–"}
                  </td>
                  {/* Calculated % */}
                  <td className="py-2.5 pr-2 text-right tn-mono text-xs font-semibold" style={{ color: "var(--tn-accent)" }}>
                    {r.calcPct}%
                  </td>
                  {/* Streck % */}
                  <td className="py-2.5 pr-2 text-right tn-mono text-xs" style={{ color: "var(--tn-text-dim)" }}>
                    {r.streckPct > 0 ? `${r.streckPct}%` : "–"}
                  </td>
                  {/* Distance signal */}
                  <td className="py-2.5 pr-2">
                    <DistBadge factor={r.distSignal.factor} label={r.distSignal.label} />
                  </td>
                  {/* Track factor */}
                  {trackConfig && (
                    <td className="py-2.5 pr-2 text-right tn-mono text-xs">
                      {Math.abs(r.trackFactorDelta) >= 0.01 ? (
                        <span
                          className="font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: r.trackFactorDelta > 0 ? "var(--tn-value-high)" : "var(--tn-value-low)",
                            background: r.trackFactorDelta > 0 ? "var(--tn-value-high-bg)" : "var(--tn-value-low-bg)",
                          }}
                          title={`Spårfaktor: ${r.trackFactorAdjusted.toFixed(2)} (${r.trackFactorDelta >= 0 ? "+" : ""}${r.trackFactorDelta.toFixed(2)})`}
                        >
                          {r.trackFactorAdjusted.toFixed(2)}{" "}
                          <span style={{ opacity: 0.7 }}>
                            ({r.trackFactorDelta >= 0 ? "+" : ""}{r.trackFactorDelta.toFixed(2)})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--tn-text-faint)" }}>{r.trackFactorBase.toFixed(2)}</span>
                      )}
                    </td>
                  )}
                  {/* Value */}
                  <td className="py-2.5 pr-2 text-right">
                    <DeltaChip value={r.value} hasStreck={r.streckPct > 0} />
                  </td>
                  {/* Result */}
                  <td className="py-2.5 pr-4 text-right">
                    {r.starter.finish_position != null ? (
                      <span
                        className="tn-mono text-xs font-bold px-2 py-0.5 rounded-full"
                        style={finishStyle}
                      >
                        {r.starter.finish_position}:a{r.starter.finish_time ? ` ${r.starter.finish_time}` : ""}
                      </span>
                    ) : (
                      <span style={{ color: "var(--tn-text-faint)" }}>–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 tn-mono text-[10px]" style={{ color: "var(--tn-text-faint)" }}>
        <span>↑↑ Vunnit på distansen (×1.35)</span>
        <span>↑ Placerat (×1.1)</span>
        <span>→ Sprungit utan placering</span>
        <span>↓ Annan startmetod</span>
        <span>↓↓ Aldrig sprungit (×0.6)</span>
      </div>
    </div>
  );
}
