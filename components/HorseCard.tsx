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
  // Skoinfo
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  sulky_type: string | null;
  // Häst
  horse_age: number | null;
  horse_sex: string | null;
  horse_color: string | null;
  pedigree_father: string | null;
  home_track: string | null;
  // Karriärstatistik
  starts_total: number | null;
  wins_total: number | null;
  places_2nd: number | null;
  places_3rd: number | null;
  earnings_total: number | null;
  // Innevarande år
  starts_current_year: number | null;
  wins_current_year: number | null;
  places_2nd_current_year: number | null;
  places_3rd_current_year: number | null;
  // Föregående år
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

function ScoreBadge({ score }: { score: number | null }) {
  const [open, setOpen] = useState(false);
  if (score == null) return null;
  const color =
    score >= 70 ? "bg-green-600" : score >= 40 ? "bg-yellow-600" : "bg-gray-600";
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`${color} text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded cursor-pointer select-none`}
      >
        CS {score}
      </button>
      {open && (
        <span className="absolute right-0 top-full mt-1 z-20 w-64 bg-gray-900 text-gray-100 text-xs rounded shadow-lg p-2 leading-relaxed">
          {CS_EXPLANATION}
        </span>
      )}
    </span>
  );
}

function TrackAdjustmentBadge({
  delta,
  trackConfig,
  postPosition,
  raceDistance,
}: {
  delta: number;
  trackConfig: TrackConfig;
  postPosition: number;
  raceDistance?: number;
}) {
  const isPositive = delta > 0;
  const color = isPositive
    ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
    : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400";
  const arrow = isPositive ? "↑" : "↓";

  const parts: string[] = [];
  const openStretchApplied =
    trackConfig.open_stretch && trackConfig.open_stretch_lanes.includes(postPosition);
  const shortRaceApplied =
    trackConfig.short_race_threshold > 0 &&
    raceDistance !== undefined &&
    raceDistance <= trackConfig.short_race_threshold &&
    postPosition >= 5;

  if (openStretchApplied) {
    parts.push(`Open stretch: +0.12 (spår ${postPosition}, ${trackConfig.track_name})`);
  }
  if (shortRaceApplied) {
    parts.push(`Kort lopp: -0.08 (spår ${postPosition})`);
  }
  const tooltip = parts.join(" · ");

  const absCs = Math.abs(delta);
  const ariaLabel = isPositive
    ? `Spårjustering: +${absCs} CS-poäng (open stretch)`
    : `Spårjustering: -${absCs} CS-poäng (kort lopp)`;

  return (
    <span
      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}
      title={tooltip}
      aria-label={ariaLabel}
    >
      {arrow}
    </span>
  );
}

function HorseshoeIcon({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 20 L8 11 C8 7 10 5 12 5 C14 5 16 7 16 11 L16 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="5.5" y1="20" x2="10.5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13.5" y1="20" x2="18.5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ShoeBadge({
  hasShoe,
  changed,
  label,
}: {
  hasShoe: boolean | null;
  changed: boolean | null;
  label: string;
}) {
  if (hasShoe == null) return null;

  if (hasShoe) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <HorseshoeIcon className={changed ? "text-amber-400" : "text-gray-400"} />
        <span className={`text-[10px] leading-none ${changed ? "text-amber-400 font-semibold" : "text-gray-500"}`}>
          {label}
        </span>
        {changed && (
          <span className="text-[10px] leading-none text-amber-400 font-bold">Ändrad</span>
        )}
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center gap-0.5 relative">
        <div className="relative">
          <HorseshoeIcon className={changed ? "text-amber-400" : "text-gray-600"} />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className={`absolute inset-0 ${changed ? "text-amber-400" : "text-gray-600"}`}
          >
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className={`text-[10px] leading-none ${changed ? "text-amber-400 font-semibold" : "text-gray-600"}`}>
          {label}
        </span>
        {changed && (
          <span className="text-[10px] leading-none text-amber-400 font-bold">Ändrad</span>
        )}
      </div>
    );
  }
}

function StatRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "" || value === "–") return null;
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}

function PlacementStr(
  starts: number | null,
  wins: number | null,
  p2: number | null,
  p3: number | null
): string {
  if (!starts) return "–";
  return `${starts} st  ${wins ?? 0}-${p2 ?? 0}-${p3 ?? 0}`;
}

function LifeRecordsTable({
  records,
  currentMethod,
  currentDistance,
}: {
  records: LifeRecord[];
  currentMethod: string;
  currentDistance: string;
}) {
  if (!records.length) return null;

  const methods = Array.from(new Set(records.map((r) => r.start_method)));
  const distances = ["short", "medium", "long"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-gray-500 dark:text-gray-400 pb-1 pr-2 font-normal">Start</th>
            {distances.map((d) => (
              <th
                key={d}
                className={`text-center pb-1 px-2 font-normal ${
                  d === currentDistance
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
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
                className={`pr-2 py-0.5 ${
                  method === currentMethod
                    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {method === "auto" ? "Auto" : "Volt"}
              </td>
              {distances.map((dist) => {
                const rec = records.find(
                  (r) => r.start_method === method && r.distance === dist
                );
                const isCurrent = method === currentMethod && dist === currentDistance;
                return (
                  <td
                    key={dist}
                    className={`text-center px-2 py-0.5 ${
                      isCurrent
                        ? "bg-indigo-100 dark:bg-indigo-900/40 rounded font-semibold text-indigo-700 dark:text-indigo-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
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
          starter.starts_total) *
          100
      )
    : null;

  const krPerStart =
    starter.earnings_total && starter.starts_total && starter.starts_total > 0
      ? Math.round(starter.earnings_total / starter.starts_total)
      : null;

  const sex = SEX_LABEL[starter.horse_sex ?? ""] ?? starter.horse_sex ?? "";
  const shoesChanged = starter.shoes_front_changed || starter.shoes_back_changed;

  const currentDistanceCategory =
    raceDistance == null
      ? "short"
      : raceDistance <= 1800
      ? "short"
      : raceDistance <= 2400
      ? "medium"
      : "long";
  const currentMethod = raceStartMethod ?? "auto";

  // Färg för startnummerboxen baserat på slutplacering
  const finishBoxColor =
    starter.finish_position === 1
      ? "bg-yellow-400 text-black"
      : starter.finish_position === 2
      ? "bg-gray-300 text-black"
      : starter.finish_position === 3
      ? "bg-amber-600 text-white"
      : starter.finish_position != null
      ? "bg-gray-500 text-white"
      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white";

  const cardBorder = isSelected
    ? "border-gray-200 dark:border-gray-800 border-l-4 border-l-emerald-500"
    : isValue
    ? "border-green-400 dark:border-green-600"
    : "border-gray-200 dark:border-gray-800";

  // Beräkna spårjusteringsdelta för TrackAdjustmentBadge
  const trackDelta: number | null = (() => {
    if (!trackConfig || starter.post_position == null) return null;
    const history: never[] = [];
    const startMethod = raceStartMethod ?? "auto";
    const baseF = computeTrackFactor(starter.post_position, startMethod, history);
    const adjustedF = computeTrackFactor(
      starter.post_position,
      startMethod,
      history,
      trackConfig,
      raceDistance
    );
    const csDelta = Math.round((adjustedF - baseF) * 500);
    if (Math.abs(csDelta) < 1) return null;
    return csDelta;
  })();

  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-900 ${cardBorder} cursor-pointer select-none`}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* ── Kompakt huvud ── */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Startnummerbox / systemknapp */}
        {onSelect != null ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            title={isSelected ? "Ta bort från system" : "Lägg till i system"}
            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${
              isSelected
                ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-200 dark:hover:bg-emerald-800"
            }`}
          >
            {starter.start_number}
          </button>
        ) : (
          <div
            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0 ${finishBoxColor}`}
            title={
              starter.finish_position != null
                ? `Slutplacering: ${starter.finish_position}${starter.finish_time ? ` · ${starter.finish_time}` : ""}`
                : undefined
            }
          >
            {starter.start_number}
          </div>
        )}

        {/* Hästnamn + kusk */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            {sortRank != null && (
              <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 shrink-0">
                #{sortRank}
              </span>
            )}
            <span className="font-bold text-[13px] tracking-tight text-gray-900 dark:text-white truncate">
              {starter.horses?.name ?? "–"}
              {shoesChanged && (
                <span className="ml-1 text-[10px] text-amber-400 font-semibold" title="Skoändring">
                  ★
                </span>
              )}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
            {starter.driver}
          </span>
        </div>

        {/* Höger: streck% · odds · badges */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {starter.bet_distribution != null && starter.bet_distribution > 0 && (
              <span
                className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
                title="Streckprocent"
              >
                {starter.bet_distribution.toFixed(1)}%
              </span>
            )}
            {starter.odds != null && (
              <span className="text-gray-700 dark:text-gray-300 text-xs" title="Vinnarodds">
                {starter.odds.toFixed(1)}x
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ScoreBadge score={starter.formscore} />
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

      {/* Senaste 5 resultat — alltid synliga */}
      {starter.last_5_results.length > 0 && (
        <div className="flex gap-1 px-3 pb-2">
          {starter.last_5_results.map((r, i) => {
            const color =
              r.place === "1"
                ? "bg-yellow-500 text-black"
                : r.place === "2"
                ? "bg-gray-300 text-black"
                : r.place === "3"
                ? "bg-orange-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
            return (
              <span
                key={i}
                className={`${color} text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded`}
                title={`${r.date} · ${r.track} · ${r.time}`}
              >
                {r.place || "–"}
              </span>
            );
          })}
        </div>
      )}

      {/* Expand-indikator */}
      <div className="px-3 pb-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-300 dark:text-gray-700">
          {expanded ? "▲ Dölj" : "▼ Detaljer"}
        </span>
      </div>

      {/* ── Expanderat innehåll ── */}
      {expanded && (
        <div
          className="border-t border-gray-200 dark:border-gray-700 px-3 pt-3 pb-3 flex flex-col gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Slutplacering (om resultat finns) */}
          {starter.finish_position != null && (
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                  starter.finish_position === 1
                    ? "bg-yellow-400 text-black"
                    : starter.finish_position === 2
                    ? "bg-gray-300 text-black"
                    : starter.finish_position === 3
                    ? "bg-amber-600 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {starter.finish_position}:a
                {starter.finish_time ? ` ${starter.finish_time}` : ""}
              </span>
            </div>
          )}

          {/* Häst-info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            {(starter.horse_age || sex || starter.horse_color) && (
              <p>
                {[
                  starter.horse_age ? `${starter.horse_age} år` : null,
                  sex || null,
                  starter.horse_color || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {starter.pedigree_father && (
              <p>
                Far:{" "}
                <span className="text-gray-700 dark:text-gray-300">
                  {starter.pedigree_father}
                </span>
              </p>
            )}
            {starter.home_track && (
              <p>
                Hemmaplan:{" "}
                <span className="text-gray-700 dark:text-gray-300">{starter.home_track}</span>
              </p>
            )}
          </div>

          {/* Skoinfo + sulky */}
          {starter.shoes_reported && (
            <div
              className={`rounded p-2 text-xs border ${
                shoesChanged
                  ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-gray-700/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <ShoeBadge
                    hasShoe={starter.shoes_front}
                    changed={starter.shoes_front_changed}
                    label="Fram"
                  />
                  <ShoeBadge
                    hasShoe={starter.shoes_back}
                    changed={starter.shoes_back_changed}
                    label="Bak"
                  />
                </div>
                {starter.sulky_type && (
                  <span className="text-gray-500 dark:text-gray-400 ml-auto">
                    Vagn: {starter.sulky_type}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Snabbstatistik: karriär */}
          <div className="grid grid-cols-3 text-center text-xs border border-gray-200 dark:border-gray-700 rounded-lg divide-x divide-gray-200 dark:divide-gray-700">
            <div className="p-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Livs</p>
              <p className="text-gray-900 dark:text-white font-semibold">
                {starter.wins_total ?? "–"}-{starter.places_2nd ?? "–"}-{starter.places_3rd ?? "–"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-[10px]">
                {starter.starts_total ?? "–"} st
              </p>
            </div>
            <div className="p-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">År</p>
              <p className="text-gray-900 dark:text-white font-semibold">
                {winRateYear != null ? `${winRateYear}%` : "–"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-[10px]">
                {starter.starts_current_year ?? "–"} st
              </p>
            </div>
            <div className="p-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Rekord</p>
              <p className="text-gray-900 dark:text-white font-semibold">
                {starter.best_time || "–"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-[10px]">
                {platsRate != null ? `Plats ${platsRate}%` : ""}
              </p>
            </div>
          </div>

          {/* Bästa tider per distans & startmetod */}
          {starter.life_records && starter.life_records.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Bästa tider
              </p>
              <LifeRecordsTable
                records={starter.life_records}
                currentMethod={currentMethod}
                currentDistance={currentDistanceCategory}
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Markerat = dagens lopp (
                {currentMethod === "auto" ? "autostart" : "voltstart"},{" "}
                {DIST_LABEL[currentDistanceCategory]?.toLowerCase()})
              </p>
            </div>
          )}

          {/* Karriärstatistik detaljerad */}
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Statistik</p>
            <div className="border border-gray-200 dark:border-gray-700 rounded p-2 space-y-0.5">
              <StatRow
                label="Starter livs"
                value={PlacementStr(
                  starter.starts_total,
                  starter.wins_total,
                  starter.places_2nd,
                  starter.places_3rd
                )}
              />
              <StatRow
                label="Innevarande år"
                value={PlacementStr(
                  starter.starts_current_year,
                  starter.wins_current_year,
                  starter.places_2nd_current_year,
                  starter.places_3rd_current_year
                )}
              />
              <StatRow
                label="Föregående år"
                value={PlacementStr(
                  starter.starts_prev_year,
                  starter.wins_prev_year,
                  starter.places_2nd_prev_year,
                  starter.places_3rd_prev_year
                )}
              />
              {platsRate != null && <StatRow label="Plats%" value={`${platsRate}%`} />}
              {krPerStart != null && (
                <StatRow label="Kr/start" value={krPerStart.toLocaleString("sv-SE")} />
              )}
              {starter.earnings_total != null && starter.earnings_total > 0 && (
                <StatRow
                  label="Total intjänat"
                  value={starter.earnings_total.toLocaleString("sv-SE") + " kr"}
                />
              )}
            </div>
          </div>

          {/* Odds */}
          {(starter.odds != null || starter.p_odds != null) && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Odds</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-2 space-y-0.5">
                {starter.odds != null && (
                  <StatRow label="Vinnarodds" value={`${starter.odds.toFixed(2)}x`} />
                )}
                {starter.p_odds != null && (
                  <StatRow label="Platsodds" value={`${starter.p_odds.toFixed(2)}x`} />
                )}
              </div>
            </div>
          )}

          {/* Kusk & Tränare */}
          {(starter.driver || starter.trainer) && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Kusk & Tränare
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 space-y-1">
                {starter.driver && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{starter.driver}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {starter.driver_win_pct != null
                        ? `${starter.driver_win_pct}% vinst (år)`
                        : "–"}
                    </span>
                  </div>
                )}
                {starter.trainer && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{starter.trainer}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {starter.trainer_win_pct != null
                        ? `${starter.trainer_win_pct}% vinst (år)`
                        : "–"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Senaste starter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Senaste starter
              </p>
              {fetchedStarts === null && (
                <button
                  onClick={handleFetchStarts}
                  disabled={fetchingStarts}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50 transition"
                >
                  {fetchingStarts ? "Hämtar..." : "Hämta från ATG"}
                </button>
              )}
            </div>
            {startsError && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                {startsError}
              </p>
            )}
            {fetchedStarts !== null && fetchedStarts.length > 0 && (
              <>
                {/* Desktop: strukturerad tabell */}
                <div className="hidden md:block">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                        <th className="text-left pb-1.5 pr-3 font-normal">Datum</th>
                        <th className="text-left pb-1.5 pr-3 font-normal">Bana</th>
                        <th className="text-left pb-1.5 pr-3 font-normal">Kusk</th>
                        <th className="text-center pb-1.5 pr-3 font-normal">Spår</th>
                        <th className="text-right pb-1.5 pr-3 font-normal">Dist</th>
                        <th className="text-center pb-1.5 pr-3 font-normal">Startmetod</th>
                        <th className="text-center pb-1.5 pr-3 font-normal">Plac</th>
                        <th className="text-right pb-1.5 pr-3 font-normal">Tid</th>
                        <th className="text-center pb-1.5 font-normal">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedStarts.map((r, i) => (
                        <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.date}</td>
                          <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{r.track}</td>
                          <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{r.driver || "–"}</td>
                          <td className="py-1.5 pr-3 text-center text-gray-500 dark:text-gray-400">{r.post_position ?? "–"}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.distance != null ? `${r.distance} m` : "–"}</td>
                          <td className="py-1.5 pr-3 text-center">
                            {r.start_method ? (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                r.start_method === "auto"
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                              }`}>
                                {r.start_method === "auto" ? "Auto" : "Volt"}
                              </span>
                            ) : "–"}
                          </td>
                          <td className="py-1.5 pr-3 text-center font-bold text-gray-900 dark:text-white">{r.place || "–"}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.time}</td>
                          <td className="py-1.5">
                            <div className="flex items-center justify-center gap-2">
                              {r.shoes_front != null && (
                                <span className="flex flex-col items-center gap-0.5">
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={14} className={r.shoes_front ? "text-gray-400" : "text-gray-600"} />
                                    {!r.shoes_front && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" className="absolute inset-0 text-gray-600">
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-none">Fram</span>
                                </span>
                              )}
                              {r.shoes_back != null && (
                                <span className="flex flex-col items-center gap-0.5">
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={14} className={r.shoes_back ? "text-gray-400" : "text-gray-600"} />
                                    {!r.shoes_back && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" className="absolute inset-0 text-gray-600">
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-none">Bak</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobil: tvåraders flex-layout */}
                <div className="md:hidden">
                  {fetchedStarts.map((r, i) => (
                    <div key={i} className="border-t border-gray-200 dark:border-gray-700 py-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0 w-[68px]">{r.date}</span>
                        <span className="flex-1 text-gray-700 dark:text-gray-300 truncate min-w-0">{r.track}</span>
                        {r.post_position != null && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">Sp {r.post_position}</span>
                        )}
                        {r.distance != null && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{r.distance} m</span>
                        )}
                        {r.start_method && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${
                            r.start_method === "auto"
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          }`}>
                            {r.start_method === "auto" ? "A" : "V"}
                          </span>
                        )}
                        <span className="font-bold text-gray-900 dark:text-white shrink-0 w-4 text-center">{r.place || "–"}</span>
                        <span className="text-gray-500 dark:text-gray-400 shrink-0 w-12 text-right">{r.time}</span>
                      </div>
                      {(r.driver || r.shoes_front != null || r.shoes_back != null) && (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-[11px] text-gray-500 dark:text-gray-400 truncate min-w-0">{r.driver ?? ""}</span>
                          {(r.shoes_front != null || r.shoes_back != null) && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {r.shoes_front != null && (
                                <span className="flex items-center gap-0.5">
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500">F</span>
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={12} className={r.shoes_front ? "text-gray-400" : "text-gray-600"} />
                                    {!r.shoes_front && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" className="absolute inset-0 text-gray-600">
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                </span>
                              )}
                              {r.shoes_back != null && (
                                <span className="flex items-center gap-0.5">
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500">B</span>
                                  <span className="relative inline-flex">
                                    <HorseshoeIcon size={12} className={r.shoes_back ? "text-gray-400" : "text-gray-600"} />
                                    {!r.shoes_back && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" className="absolute inset-0 text-gray-600">
                                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    )}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {fetchedStarts !== null && fetchedStarts.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Inga starter hittades.
              </p>
            )}
            {fetchedStarts === null && !fetchingStarts && !startsError && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Klicka &quot;Hämta från ATG&quot; för att visa senaste starter.
              </p>
            )}
          </div>

          {/* Anteckningar */}
          {notesSection}
        </div>
      )}
    </div>
  );
}
