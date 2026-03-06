"use client";

import { analyzeRace, StarterAnalysis, AnalysisStarter } from "@/lib/analysis";

interface AnalysisPanelProps {
  starters: AnalysisStarter[];
  raceMeters: number;
  raceStartMethod: string;
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

function ValueBadge({ value, active }: { value: number; active: boolean }) {
  if (!active)
    return <span className="text-xs text-gray-400 dark:text-gray-500 italic">inväntar streckning</span>;
  if (value >= 5)
    return (
      <span className="text-xs font-bold text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded whitespace-nowrap">
        +{value} pp ★
      </span>
    );
  if (value >= 2)
    return (
      <span className="text-xs font-semibold text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded whitespace-nowrap">
        +{value} pp
      </span>
    );
  if (value <= -5)
    return (
      <span className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded whitespace-nowrap">
        {value} pp
      </span>
    );
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
      {value > 0 ? `+${value}` : value} pp
    </span>
  );
}

export function AnalysisPanel({ starters, raceMeters, raceStartMethod }: AnalysisPanelProps) {
  const results: StarterAnalysis[] = analyzeRace(starters, raceMeters, raceStartMethod).sort(
    (a, b) => b.calc_pct - a.calc_pct
  );

  const hasStreckning = results.some((r) => r.streckning_loaded);
  const distLabel =
    raceMeters <= 1800 ? "kort" : raceMeters <= 2400 ? "medel" : "lång";

  return (
    <div className="mt-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
      <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">
        Matematisk analys — beräknad vinstchans
      </h3>
      <p className="text-xs text-indigo-600 dark:text-indigo-400/80 mb-2">
        Baspoäng: 40% karriärvinst-% + 40% senaste form-% + 20% odds-implicit sannolikhet.
        Multipliceras med <strong>distansfaktor</strong> (×0.6–×1.35) baserat på hästens
        historik på {distLabel} distans ({raceMeters} m, {raceStartMethod}start).
        Spelvärde = beräknad chans − streckning.
      </p>

      {!hasStreckning && (
        <p className="text-xs text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 mb-2">
          Streckningsdata saknas — hämta om spelet när V85-poolen är öppen.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-indigo-500 dark:text-indigo-400/60 border-b border-indigo-200 dark:border-indigo-800/40">
              <th className="text-left py-1 pr-2 font-medium w-6">Nr</th>
              <th className="text-left py-1 pr-2 font-medium">Häst</th>
              <th className="text-right py-1 pr-2 font-medium w-20">Beräknad</th>
              <th className="text-right py-1 pr-2 font-medium w-20">Streckning</th>
              <th className="text-right py-1 pr-2 font-medium w-16">Odds</th>
              <th className="text-left py-1 pr-2 font-medium min-w-[100px]">Distans</th>
              <th className="text-right py-1 font-medium min-w-[100px]">Spelvärde</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isValue = r.streckning_loaded && r.value >= 2;
              return (
                <tr
                  key={r.start_number}
                  className={`border-b border-indigo-100 dark:border-indigo-800/20 ${isValue ? "bg-green-50 dark:bg-green-900/20" : ""}`}
                >
                  <td className="py-1.5 pr-2 text-gray-400 dark:text-gray-500 tabular-nums">{r.start_number}</td>
                  <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100">{r.horse_name}</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-indigo-700 dark:text-indigo-300 tabular-nums">
                    {r.calc_pct}%
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                    {r.streckning_loaded ? (
                      <span className="text-purple-600 dark:text-purple-400">{r.streckning_pct}%</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-600">–</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                    {r.odds != null ? `${r.odds.toFixed(1)}x` : "–"}
                  </td>
                  <td className="py-1.5 pr-2">
                    <DistBadge factor={r.dist_signal.factor} label={r.dist_signal.label} />
                  </td>
                  <td className="py-1.5 text-right">
                    <ValueBadge value={r.value} active={r.streckning_loaded} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-500 dark:text-indigo-400/60">
        <span>↑↑ Vunnit på distansen (×1.35)</span>
        <span>↑ Placerat (×1.1)</span>
        <span>→ Sprungit utan placering</span>
        <span>↓ Annan startmetod</span>
        <span>↓↓ Aldrig sprungit på distansen (×0.6)</span>
        <span className="ml-auto">★ = spelvärde ≥ 5 pp</span>
      </div>
    </div>
  );
}
