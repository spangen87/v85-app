"use client";

import { useState } from "react";
import type { ReactNode } from "react";

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

function FormBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color =
    score >= 70 ? "bg-green-600" : score >= 40 ? "bg-yellow-600" : "bg-gray-600";
  return (
    <span
      className={`${color} text-white text-xs font-bold px-2 py-1 rounded-full`}
      title="Formscore (0–100): viktat index baserat på senaste form, vinstprocent (år), odds och bästa tid. Inte samma som streckprocent."
    >
      FS {score}
    </span>
  );
}

function HorseshoeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
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

function LifeRecordsTable({ records, currentMethod, currentDistance }: {
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
                  d === currentDistance ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-gray-500 dark:text-gray-400"
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
              <td className={`pr-2 py-0.5 ${method === currentMethod ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
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
}

export function HorseCard({
  starter,
  notesSection,
  raceDistance,
  raceStartMethod,
}: {
  starter: Starter;
  notesSection?: ReactNode;
  raceDistance?: number;
  raceStartMethod?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fetchedStarts, setFetchedStarts] = useState<FetchedStart[] | null>(null);
  const [fetchingStarts, setFetchingStarts] = useState(false);
  const [startsError, setStartsError] = useState<string | null>(null);

  async function handleFetchStarts() {
    setFetchingStarts(true);
    setStartsError(null);
    try {
      const res = await fetch(`/api/horses/${starter.horse_id}/starts`);
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
    ? Math.round((((starter.wins_total ?? 0) + (starter.places_2nd ?? 0) + (starter.places_3rd ?? 0)) / starter.starts_total) * 100)
    : null;

  const krPerStart =
    starter.earnings_total && starter.starts_total && starter.starts_total > 0
      ? Math.round(starter.earnings_total / starter.starts_total)
      : null;

  const sex = SEX_LABEL[starter.horse_sex ?? ""] ?? starter.horse_sex ?? "";
  const shoesChanged = starter.shoes_front_changed || starter.shoes_back_changed;

  // Bestäm nuvarande distans-kategori för life_records-tabellen
  const currentDistanceCategory =
    raceDistance == null
      ? "short"
      : raceDistance <= 1800
      ? "short"
      : raceDistance <= 2400
      ? "medium"
      : "long";
  const currentMethod = raceStartMethod ?? "auto";

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Huvud: nummer, namn, driver, streck, odds, FS */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-500 dark:text-gray-400 text-sm shrink-0 w-5 text-center">
            {starter.start_number}
          </span>
          <div className="min-w-0">
            <p className="text-gray-900 dark:text-white font-semibold truncate">
              {starter.horses?.name ?? "–"}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{starter.driver}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {starter.bet_distribution != null && starter.bet_distribution > 0 && (
            <span
              className="text-blue-700 dark:text-blue-400 text-xs font-semibold"
              title="Streckprocent i V85-poolen"
            >
              {starter.bet_distribution.toFixed(1)}%
            </span>
          )}
          {starter.odds != null && (
            <span className="text-gray-700 dark:text-gray-300 text-sm" title="Vinnarodds">
              {starter.odds.toFixed(1)}x
            </span>
          )}
          <FormBadge score={starter.formscore} />
        </div>
      </div>

      {/* Häst-info: ålder, kön, färg, far, hemmaplan */}
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
          <p>Far: <span className="text-gray-700 dark:text-gray-300">{starter.pedigree_father}</span></p>
        )}
        {starter.home_track && (
          <p>Hemmaplan: <span className="text-gray-700 dark:text-gray-300">{starter.home_track}</span></p>
        )}
      </div>

      {/* Skoinfo + sulky */}
      {starter.shoes_reported && (
        <div
          className={`rounded p-2 text-xs ${
            shoesChanged
              ? "bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50"
              : "bg-gray-200 dark:bg-gray-700/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <ShoeBadge hasShoe={starter.shoes_front} changed={starter.shoes_front_changed} label="Fram" />
              <ShoeBadge hasShoe={starter.shoes_back} changed={starter.shoes_back_changed} label="Bak" />
            </div>
            {starter.sulky_type && (
              <span className="text-gray-500 dark:text-gray-400 ml-auto">Vagn: {starter.sulky_type}</span>
            )}
          </div>
        </div>
      )}

      {/* Snabbstatistik: karriär */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-200 dark:bg-gray-700 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400">Livs</p>
          <p className="text-gray-900 dark:text-white font-medium">
            {starter.wins_total ?? "–"}-{starter.places_2nd ?? "–"}-{starter.places_3rd ?? "–"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px]">{starter.starts_total ?? "–"} st</p>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400">År</p>
          <p className="text-gray-900 dark:text-white font-medium">
            {winRateYear != null ? `${winRateYear}%` : "–"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px]">{starter.starts_current_year ?? "–"} st</p>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded p-2">
          <p className="text-gray-500 dark:text-gray-400">Rekord</p>
          <p className="text-gray-900 dark:text-white font-medium">{starter.best_time || "–"}</p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px]">
            {platsRate != null ? `Plats ${platsRate}%` : ""}
          </p>
        </div>
      </div>

      {/* Senaste 5 bubblor (om data finns) */}
      {starter.last_5_results.length > 0 && (
        <div className="flex gap-1">
          {starter.last_5_results.map((r, i) => {
            const color =
              r.place === "1" ? "bg-yellow-500 text-black" :
              r.place === "2" ? "bg-gray-300 text-black" :
              r.place === "3" ? "bg-orange-600 text-white" :
              "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
            return (
              <span
                key={i}
                className={`${color} text-xs font-bold w-6 h-6 flex items-center justify-center rounded`}
                title={`${r.date} · ${r.track} · ${r.time}`}
              >
                {r.place || "–"}
              </span>
            );
          })}
        </div>
      )}

      {/* Expand-knapp */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 self-start transition"
      >
        {expanded ? "▲ Dölj detaljer" : "▼ Visa detaljer"}
      </button>

      {/* Expanderat innehåll */}
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">

          {/* Bästa tider per distans & startmetod */}
          {starter.life_records && starter.life_records.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Bästa tider</p>
              <LifeRecordsTable
                records={starter.life_records}
                currentMethod={currentMethod}
                currentDistance={currentDistanceCategory}
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Markerat = dagens lopp ({currentMethod === "auto" ? "autostart" : "voltstart"}, {DIST_LABEL[currentDistanceCategory]?.toLowerCase()})
              </p>
            </div>
          )}

          {/* Karriärstatistik detaljerad */}
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Statistik</p>
            <div className="bg-gray-200 dark:bg-gray-700/60 rounded p-2 space-y-0.5">
              <StatRow
                label="Starter livs"
                value={PlacementStr(starter.starts_total, starter.wins_total, starter.places_2nd, starter.places_3rd)}
              />
              <StatRow
                label="Innevarande år"
                value={PlacementStr(starter.starts_current_year, starter.wins_current_year, starter.places_2nd_current_year, starter.places_3rd_current_year)}
              />
              <StatRow
                label="Föregående år"
                value={PlacementStr(starter.starts_prev_year, starter.wins_prev_year, starter.places_2nd_prev_year, starter.places_3rd_prev_year)}
              />
              {platsRate != null && (
                <StatRow label="Plats%" value={`${platsRate}%`} />
              )}
              {krPerStart != null && (
                <StatRow label="Kr/start" value={krPerStart.toLocaleString("sv-SE")} />
              )}
              {starter.earnings_total != null && starter.earnings_total > 0 && (
                <StatRow label="Total intjänat" value={starter.earnings_total.toLocaleString("sv-SE") + " kr"} />
              )}
            </div>
          </div>

          {/* Odds */}
          {(starter.odds != null || starter.p_odds != null) && (
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Odds</p>
              <div className="bg-gray-200 dark:bg-gray-700/60 rounded p-2 space-y-0.5">
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
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kusk & Tränare</p>
              <div className="bg-gray-200 dark:bg-gray-700/60 rounded p-2 space-y-1">
                {starter.driver && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{starter.driver}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {starter.driver_win_pct != null ? `${starter.driver_win_pct}% vinst (år)` : "–"}
                    </span>
                  </div>
                )}
                {starter.trainer && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{starter.trainer}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {starter.trainer_win_pct != null ? `${starter.trainer_win_pct}% vinst (år)` : "–"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Senaste 5 starter — detaljvy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Senaste starter</p>
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 dark:text-gray-500">
                      <th className="text-left pb-1 font-normal">Datum</th>
                      <th className="text-left pb-1 font-normal">Bana</th>
                      <th className="text-center pb-1 font-normal">Plac</th>
                      <th className="text-right pb-1 font-normal">Tid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchedStarts.map((r, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-1 text-gray-500 dark:text-gray-400">{r.date}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-300">{r.track}</td>
                        <td className="py-1 text-center font-bold text-gray-900 dark:text-white">{r.place || "–"}</td>
                        <td className="py-1 text-right text-gray-700 dark:text-gray-300">{r.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {fetchedStarts !== null && fetchedStarts.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Inga starter hittades.</p>
            )}
            {fetchedStarts === null && !fetchingStarts && !startsError && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Klicka "Hämta från ATG" för att visa senaste starter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Anteckningar */}
      {notesSection}
    </div>
  );
}
