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
  let color: string;
  let icon: string;
  if (factor >= 1.3) {
    color = "text-green-400 bg-green-100 dark:bg-green-900/40";
    icon = "↑↑";
  } else if (factor >= 1.1) {
    color = "text-green-400 bg-green-50 dark:bg-green-900/30";
    icon = "↑";
  } else if (factor >= 0.95) {
    color = "text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700";
    icon = "→";
  } else if (factor >= 0.7) {
    color = "text-orange-400 bg-orange-50 dark:bg-orange-900/30";
    icon = "↓";
  } else {
    color = "text-red-400 bg-red-50 dark:bg-red-900/30";
    icon = "↓↓";
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${color}`}
      title={label}
    >
      <span className="font-bold">{icon}</span>
      <span className="hidden sm:inline truncate max-w-[180px]">{label}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
      : score >= 40
      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
      : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400";
  return (
    <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {score}
    </span>
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
  // Beräkna distanssignal per häst (för visning)
  const withDist = starters.map((s) => {
    const records: LifeRecord[] = Array.isArray(s.life_records) ? s.life_records : [];
    const distSignal = computeDistanceSignal(records, raceMeters, raceStartMethod);
    const cs = s.formscore ?? 0;

    const betDist = s.bet_distribution;
    const streckPct = betDist != null && isFinite(Number(betDist)) ? Number(betDist) : 0;

    // Beräknad chans baserad på CS relativt fältet
    const totalCS = starters.reduce((sum, st) => sum + (st.formscore ?? 0), 0);
    const calcPct = totalCS > 0 ? Math.round(((cs / totalCS) * 100) * 10) / 10 : 0;

    const value = streckPct > 0 ? Math.round((calcPct - streckPct) * 10) / 10 : 0;
    const isValue = cs > 55 && value > 0;

    // Beräkna spårfaktordelta (base vs. banspecifikt justerad)
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

  const distLabel =
    raceMeters <= 1800 ? "kort" : raceMeters <= 2400 ? "medel" : "lång";

  return (
    <div className="mt-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
      <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">
        Analys — Composite Score
      </h3>
      <p className="text-xs text-indigo-600 dark:text-indigo-400/80 mb-2">
        CS (0–100) = form (30%) + vinstprocent (20%) + odds (15%) + tid (15%) + konsistens (10%) + distans (5%) + spår (5%).
        {" "}Distans: {distLabel} ({raceMeters} m, {raceStartMethod}start).
        {" "}Spelvärde = CS-andel − streckning.
      </p>

      {!hasStreckning && (
        <p className="text-xs text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 mb-2">
          Streckningsdata saknas — hämta om spelet när poolen är öppen.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-indigo-500 dark:text-indigo-400/60 border-b border-indigo-200 dark:border-indigo-800/40">
              <th className="text-left py-1 pr-2 font-medium w-8">Rank</th>
              <th className="text-left py-1 pr-2 font-medium">Häst</th>
              <th className="text-center py-1 pr-2 font-medium w-14">CS</th>
              <th className="text-right py-1 pr-2 font-medium w-16">Odds</th>
              <th className="text-right py-1 pr-2 font-medium w-20">Beräknad</th>
              <th className="text-right py-1 pr-2 font-medium w-20">Streckning</th>
              <th className="text-left py-1 pr-2 font-medium min-w-[100px]">Distans</th>
              {trackConfig && <th className="text-right py-1 pr-2 font-medium w-20">Spårfaktor</th>}
              <th className="text-right py-1 pr-2 font-medium min-w-[90px]">Spelvärde</th>
              <th className="text-right py-1 font-medium w-20">Resultat</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr
                key={r.starter.start_number}
                className={`border-b border-indigo-100 dark:border-indigo-800/20 ${
                  r.isValue ? "border-l-2 border-l-green-500 bg-green-50 dark:bg-green-900/10" : ""
                }`}
              >
                <td className="py-1.5 pr-2 tabular-nums">
                  {r.rank === 1 ? (
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">#1</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">#{r.rank}</span>
                  )}
                </td>
                <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100">
                  <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">{r.starter.start_number}.</span>
                  {r.starter.horses?.name ?? "–"}
                  {r.isValue && (
                    <span className="ml-1.5 text-[10px] font-bold bg-green-600 text-white px-1 py-0.5 rounded uppercase tracking-wide">
                      Värde
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <ScoreBadge score={r.cs} />
                </td>
                <td className="py-1.5 pr-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                  {r.starter.odds != null ? `${r.starter.odds.toFixed(1)}x` : "–"}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {r.calcPct}%
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {r.streckPct > 0 ? (
                    <span className="text-purple-600 dark:text-purple-400">{r.streckPct}%</span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-600">–</span>
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <DistBadge factor={r.distSignal.factor} label={r.distSignal.label} />
                </td>
                {trackConfig && (
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {Math.abs(r.trackFactorDelta) >= 0.01 ? (
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          r.trackFactorDelta > 0
                            ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                        }`}
                        title={`Spårfaktor: ${r.trackFactorAdjusted.toFixed(2)} (${r.trackFactorDelta >= 0 ? "+" : ""}${r.trackFactorDelta.toFixed(2)})`}
                      >
                        {r.trackFactorAdjusted.toFixed(2)}{" "}
                        <span className="opacity-70">
                          ({r.trackFactorDelta >= 0 ? "+" : ""}{r.trackFactorDelta.toFixed(2)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {r.trackFactorBase.toFixed(2)}
                      </span>
                    )}
                  </td>
                )}
                <td className="py-1.5 pr-2 text-right">
                  {r.streckPct > 0 ? (
                    r.value >= 5 ? (
                      <span className="text-xs font-bold text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded whitespace-nowrap">
                        +{r.value} pp
                      </span>
                    ) : r.value >= 2 ? (
                      <span className="text-xs font-semibold text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                        +{r.value} pp
                      </span>
                    ) : r.value <= -5 ? (
                      <span className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {r.value} pp
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {r.value > 0 ? `+${r.value}` : r.value} pp
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">inväntar streckning</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {r.starter.finish_position != null ? (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        r.starter.finish_position === 1
                          ? "bg-yellow-400 text-black"
                          : r.starter.finish_position === 2
                          ? "bg-gray-300 text-black"
                          : r.starter.finish_position === 3
                          ? "bg-amber-600 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {r.starter.finish_position}:a{r.starter.finish_time ? ` ${r.starter.finish_time}` : ""}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 text-xs">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-500 dark:text-indigo-400/60">
        <span>↑↑ Vunnit på distansen (×1.35)</span>
        <span>↑ Placerat (×1.1)</span>
        <span>→ Sprungit utan placering</span>
        <span>↓ Annan startmetod</span>
        <span>↓↓ Aldrig sprungit (×0.6)</span>
      </div>
    </div>
  );
}
