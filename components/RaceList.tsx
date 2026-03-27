"use client";

import { useState, useEffect } from "react";
import { HorseCard } from "./HorseCard";
import { AnalysisPanel } from "./AnalysisPanel";
import { HorseNotes } from "./notes/HorseNotes";
import { TopFiveRanking } from "./TopFiveRanking";
import { analyzeRaceEnhanced } from "@/lib/analysis";
import type { Group, SystemSelection, SystemHorse } from "@/lib/types";

interface LifeRecord {
  start_method: string;
  distance: string;
  place: number;
  time: string;
}

type SortKey = "number" | "formscore" | "odds" | "bet" | "composite";

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
  last_5_results: { place: string; date: string; track: string; time: string }[];
  life_records: LifeRecord[] | null;
  formscore: number | null;
  finish_position: number | null;
  finish_time: string | null;
  horses: { name: string } | null;
}

interface Race {
  id: string;
  race_number: number;
  race_name: string | null;
  distance: number;
  start_method: string | null;
  start_time: string | null;
  starters: Starter[];
}

export function RaceList({
  races,
  activeRaceNumber,
  userGroups,
  currentUserId,
  systemMode,
  systemSelections,
  onToggleHorse,
}: {
  races: Race[];
  activeRaceNumber: number;
  userGroups: Group[];
  currentUserId: string;
  systemMode?: boolean;
  systemSelections?: SystemSelection[];
  onToggleHorse?: (raceNumber: number, horse: SystemHorse) => void;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [filterValue, setFilterValue] = useState(false);
  const [hideOutsiders, setHideOutsiders] = useState(false);
  const [search, setSearch] = useState("");

  // Reset analysis panel when switching races
  useEffect(() => {
    setShowAnalysis(false);
  }, [activeRaceNumber]);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "composite", label: "CS — sammansatt poäng" },
    { key: "formscore", label: "FS — formscore" },
    { key: "number", label: "Startnummer" },
    { key: "odds", label: "Odds (lägst)" },
    { key: "bet", label: "Streck% (högst)" },
  ];

  const activeRace = races.find((r) => r.race_number === activeRaceNumber) ?? races[0];

  function sortStarters(
    starters: Starter[],
    compositeMap: Record<number, number>
  ): Starter[] {
    return [...starters].sort((a, b) => {
      switch (sortKey) {
        case "number":
          return a.start_number - b.start_number;
        case "odds":
          if (a.odds == null && b.odds == null) return 0;
          if (a.odds == null) return 1;
          if (b.odds == null) return -1;
          return a.odds - b.odds;
        case "bet":
          if (a.bet_distribution == null && b.bet_distribution == null) return 0;
          if (a.bet_distribution == null) return 1;
          if (b.bet_distribution == null) return -1;
          return b.bet_distribution - a.bet_distribution;
        case "composite":
          return (compositeMap[b.start_number] ?? 0) - (compositeMap[a.start_number] ?? 0);
        case "formscore":
        default:
          return (b.formscore ?? 0) - (a.formscore ?? 0);
      }
    });
  }

  if (!activeRace) return null;

  const hasActiveFilter = filterValue || hideOutsiders || search.trim().length > 0;

  const enhanced = analyzeRaceEnhanced(activeRace.starters);
  const enhancedMap = Object.fromEntries(enhanced.map((h) => [h.startNumber, h]));
  const compositeMap = Object.fromEntries(enhanced.map((h) => [h.startNumber, h.compositeScore]));

  const q = search.trim().toLowerCase();
  const filtered = activeRace.starters
    .filter((s) => !filterValue || enhancedMap[s.start_number]?.isValue)
    .filter((s) => !hideOutsiders || s.odds == null || s.odds <= 50)
    .filter((s) => {
      if (!q) return true;
      return (
        (s.horses?.name ?? "").toLowerCase().includes(q) ||
        s.driver.toLowerCase().includes(q) ||
        s.trainer.toLowerCase().includes(q)
      );
    });

  const sorted = sortStarters(filtered, compositeMap);
  const raceSelections = systemSelections?.find((s) => s.race_number === activeRace.race_number);

  const startTimeStr = activeRace.start_time
    ? new Date(activeRace.start_time).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-3">
      <TopFiveRanking races={races} />

      {/* Toolbar: sortering + filter på en rad */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        {/* Sort dropdown */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400 cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Filter chips */}
        <button
          onClick={() => setFilterValue((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
            filterValue
              ? "bg-green-600 border-green-500 text-white"
              : "bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Värde
        </button>
        <button
          onClick={() => setHideOutsiders((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
            hideOutsiders
              ? "bg-indigo-700 border-indigo-600 text-white"
              : "bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Dölj &gt;50x
        </button>
        {hasActiveFilter && (
          <button
            onClick={() => {
              setFilterValue(false);
              setHideOutsiders(false);
              setSearch("");
            }}
            className="text-xs px-2 py-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 transition"
          >
            Rensa ✕
          </button>
        )}

        {/* Sök */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sök häst, kusk…"
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 w-full sm:w-44 ml-auto"
        />
      </div>

      {/* Loppinfo + analysknapp */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate">
          {activeRace.race_name ?? `Avdelning ${activeRace.race_number}`}
          {startTimeStr && <span className="ml-2">{startTimeStr}</span>}
          <span className="ml-2">{activeRace.distance} m</span>
          {activeRace.start_method && (
            <span className="ml-2 capitalize">{activeRace.start_method}</span>
          )}
        </span>
        <button
          onClick={() => setShowAnalysis((v) => !v)}
          className={`ml-3 shrink-0 text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
            showAnalysis
              ? "bg-indigo-700 border-indigo-600 text-white"
              : "bg-transparent border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          }`}
        >
          {showAnalysis ? "Dölj analys" : "Visa analys"}
        </button>
      </div>

      {/* Analysvy */}
      {showAnalysis && (
        <AnalysisPanel
          starters={sorted}
          raceMeters={activeRace.distance}
          raceStartMethod={activeRace.start_method ?? "auto"}
        />
      )}

      {sorted.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
          Inga hästar matchar filtret.
        </p>
      )}

      {/* Hästgrid: 1 → 2 → 3 → 4 kolumner */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((s, idx) => {
          const enh = enhancedMap[s.start_number];
          return (
            <HorseCard
              key={s.id}
              starter={s}
              raceDistance={activeRace.distance}
              raceStartMethod={activeRace.start_method ?? "auto"}
              compositeScore={enh?.compositeScore}
              valueIndex={enh?.valueIndex}
              isValue={enh?.isValue}
              sortRank={sortKey !== "number" ? idx + 1 : undefined}
              isSelected={
                systemMode
                  ? (raceSelections?.horses.some((h) => h.horse_id === s.horse_id) ?? false)
                  : undefined
              }
              onSelect={
                systemMode && onToggleHorse
                  ? () =>
                      onToggleHorse(activeRace.race_number, {
                        horse_id: s.horse_id,
                        start_number: s.start_number,
                        horse_name: s.horses?.name ?? "",
                      })
                  : undefined
              }
              notesSection={
                <HorseNotes
                  horseId={s.horse_id}
                  userGroups={userGroups}
                  currentUserId={currentUserId}
                />
              }
            />
          );
        })}
      </div>
    </div>
  );
}
