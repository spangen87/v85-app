"use client";

import { computeDistanceSignal, computeTrackFactor, type LifeRecord, type DistanceSignal } from "@/lib/analysis";
import type { SkrallSignal } from "@/lib/skrall";
import type { EdgeResult } from "@/lib/edge";
import type { WinProbability } from "@/lib/probability";
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
  /** Skrällsignaler beräknade på hela fältet, nycklade på startnummer */
  skrallMap?: Record<number, SkrallSignal>;
  /** Kalibrerad vinstsannolikhet beräknad på hela fältet, nycklad på startnummer */
  probMap?: Record<number, WinProbability>;
  /** Tysta signaler (barfota, toppkusk, formtrend, uppehåll), nycklade på startnummer */
  edgeMap?: Record<number, EdgeResult>;
}

function EdgeChips({ edge }: { edge?: EdgeResult }) {
  if (!edge || edge.signals.length === 0) {
    return <span style={{ color: "var(--tn-text-faint)" }}>–</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1 justify-end">
      {edge.signals.map((sig) => (
        <span
          key={sig.key}
          className="tn-mono text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
          title={sig.detail}
          style={{
            color: sig.points > 0 ? "var(--tn-value-high)" : "var(--tn-value-low)",
            background: sig.points > 0 ? "var(--tn-value-high-bg)" : "var(--tn-value-low-bg)",
          }}
        >
          {sig.label}
        </span>
      ))}
    </span>
  );
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
  /** Kalibrerad vinstchans i procent (blandning streck + odds) */
  chansPct: number;
  streckPct: number;
  hasChans: boolean;
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
  trackConfig?: TrackConfig,
  probMap?: Record<number, WinProbability>
): RankedStarter[] {
  const withDist = starters.map((s) => {
    const records: LifeRecord[] = Array.isArray(s.life_records) ? s.life_records : [];
    const distSignal = computeDistanceSignal(records, raceMeters, raceStartMethod);
    const cs = s.formscore ?? 0;
    const betDist = s.bet_distribution;
    const streckPct = betDist != null && isFinite(Number(betDist)) ? Number(betDist) : 0;
    const prob = probMap?.[s.start_number];
    const hasChans = prob != null && prob.source !== "uniform";
    const chansPct = hasChans ? Math.round(prob!.p * 1000) / 10 : 0;
    const value = hasChans && streckPct > 0 ? Math.round((chansPct - streckPct) * 10) / 10 : 0;
    const isValue = cs > 55 && value > 0;
    const postPos = (s as { post_position?: number | null }).post_position ?? 1;
    const horseHistory = (s as { horse_starts_history?: unknown[] }).horse_starts_history ?? [];
    const trackFactorBase = computeTrackFactor(postPos, raceStartMethod, horseHistory as never[]);
    const trackFactorAdjusted = trackConfig
      ? computeTrackFactor(postPos, raceStartMethod, horseHistory as never[], trackConfig, raceMeters)
      : trackFactorBase;
    const trackFactorDelta = Math.round((trackFactorAdjusted - trackFactorBase) * 100) / 100;
    return { starter: s, cs, distSignal, chansPct, streckPct, hasChans, value, rank: 0, isValue, trackFactorBase, trackFactorAdjusted, trackFactorDelta };
  });
  withDist.sort((a, b) => b.cs - a.cs);
  withDist.forEach((r, i) => (r.rank = i + 1));
  return withDist;
}

export function AnalysisPanel({ starters, raceMeters, raceStartMethod, trackConfig, skrallMap, probMap, edgeMap }: AnalysisPanelProps) {
  const ranked = rankStarters(starters, raceMeters, raceStartMethod, trackConfig, probMap);
  const hasStreckning = ranked.some((r) => r.streckPct > 0);
  const distLabel = raceMeters <= 1800 ? "kort" : raceMeters <= 2400 ? "medel" : "lång";
  const skrallCandidates = ranked.filter((r) => skrallMap?.[r.starter.start_number]?.isCandidate);
  // "Tysta värden": flera positiva signaler utanför odds/streck på en häst poolen inte redan älskar
  const quietEdges = ranked.filter(
    (r) => edgeMap?.[r.starter.start_number]?.isEdge && r.streckPct > 0 && r.streckPct < 20
  );

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
          CS (0–100) rankar fältet: streckning (55%) + distans (20%) + odds (10%) + konsistens (10%) + form (5%).
          {" "}<strong>Chans</strong> = kalibrerad vinstsannolikhet (50% streckning + 50% oddsmarknad).
          {" "}Distans: {distLabel} ({raceMeters} m, {raceStartMethod}start).
          {" "}Spelvärde = chans − streckning.
          {" "}<strong>Signaler</strong> = faktorer utanför odds/streck: barfota-byte, toppkusk, formtrend och uppehåll.
        </p>
        {!hasStreckning && (
          <p
            className="text-xs mt-2 rounded-lg px-3 py-2"
            style={{ color: "var(--tn-warn)", background: "var(--tn-warn-bg)" }}
          >
            Streckningsdata saknas — hämta om spelet när poolen är öppen.
          </p>
        )}
        {skrallCandidates.length > 0 && (
          <p
            className="text-xs mt-2 rounded-lg px-3 py-2"
            style={{ color: "var(--tn-warn)", background: "var(--tn-warn-bg)", lineHeight: 1.5 }}
          >
            <span className="font-bold">Skrällkandidat{skrallCandidates.length > 1 ? "er" : ""}:</span>{" "}
            {skrallCandidates.map((r) => {
              const sig = skrallMap![r.starter.start_number];
              return `${r.starter.start_number}. ${r.starter.horses?.name ?? "–"} (odds säger ${sig.oddsProbPct?.toFixed(1)} % mot ${r.streckPct} % streck, klass ${sig.classRank})`;
            }).join(" · ")}
            {" "}— lågstreckad häst med hög klass där vinnaroddsen säger mer än strecken.
          </p>
        )}
        {quietEdges.length > 0 && (
          <p
            className="text-xs mt-2 rounded-lg px-3 py-2"
            style={{ color: "var(--tn-value-high)", background: "var(--tn-value-high-bg)", lineHeight: 1.5 }}
          >
            <span className="font-bold">Tysta signaler:</span>{" "}
            {quietEdges.map((r) => {
              const edge = edgeMap![r.starter.start_number];
              const labels = edge.signals.filter((s) => s.points > 0).map((s) => s.label).join(", ");
              return `${r.starter.start_number}. ${r.starter.horses?.name ?? "–"} (${labels})`;
            }).join(" · ")}
            {" "}— lågstreckade hästar med flera positiva signaler som inte syns i odds och streck.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--tn-border)" }}>
              {["#", "Häst", "CS", "Odds", "Chans", "Strk.", "Distans", ...(trackConfig ? ["Spår"] : []), "Värde", "Signaler", "Res."].map((h) => (
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
                    {skrallMap?.[r.starter.start_number]?.isCandidate && (
                      <span
                        className="ml-2 tn-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--tn-warn-bg)", color: "var(--tn-warn)", letterSpacing: "0.08em" }}
                      >
                        SKRÄLL
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
                  {/* Calibrated win chance */}
                  <td className="py-2.5 pr-2 text-right tn-mono text-xs font-semibold" style={{ color: "var(--tn-accent)" }}>
                    {r.hasChans ? `${r.chansPct}%` : "–"}
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
                    <DeltaChip value={r.value} hasStreck={r.hasChans && r.streckPct > 0} />
                  </td>
                  {/* Tysta signaler */}
                  <td className="py-2.5 pr-2 text-right">
                    <EdgeChips edge={edgeMap?.[r.starter.start_number]} />
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
