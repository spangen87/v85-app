"use client";

import { useState } from "react";
import { HorseCard } from "./HorseCard";
import { AnalysisPanel } from "./AnalysisPanel";
import { HorseNotes } from "./notes/HorseNotes";
import { analyzeRaceEnhanced } from "@/lib/analysis";
import type { Group } from "@/lib/types";

interface LifeRecord {
  start_method: string;
  distance: string;
  place: number;
  time: string;
}

type SortKey = "number" | "formscore" | "odds" | "bet";

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
  userGroups,
  currentUserId,
}: {
  races: Race[];
  userGroups: Group[];
  currentUserId: string;
}) {
  const [openRace, setOpenRace] = useState<string | null>(races[0]?.id ?? null);
  const [analysisRace, setAnalysisRace] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("formscore");

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "number", label: "Nr" },
    { key: "formscore", label: "Formscore" },
    { key: "odds", label: "Odds" },
    { key: "bet", label: "Streck" },
  ];

  function sortStarters(starters: Starter[]): Starter[] {
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
        case "formscore":
        default:
          return (b.formscore ?? 0) - (a.formscore ?? 0);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Sortera:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`text-xs px-3 py-1 rounded-lg border transition font-medium ${
              sortKey === opt.key
                ? "bg-indigo-700 border-indigo-600 text-white"
                : "bg-transparent border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {races.map((race, index) => {
        const sorted = sortStarters(race.starters);
        const isOpen = openRace === race.id;
        const showAnalysis = analysisRace === race.id;

        // Beräkna utökad analys per lopp — indexeras på start_number
        const enhancedMap = Object.fromEntries(
          analyzeRaceEnhanced(race.starters).map((h) => [h.startNumber, h])
        );

        return (
          <div key={race.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenRace(isOpen ? null : race.id)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-900 dark:text-white font-semibold shrink-0">
                  Avd {index + 1}
                </span>
                {race.race_name && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs truncate hidden sm:block">
                    {race.race_name}
                  </span>
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm shrink-0 ml-2">
                {race.start_time
                  ? new Date(race.start_time).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) + " · "
                  : ""}
                {race.distance} m &nbsp;{isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setAnalysisRace(showAnalysis ? null : race.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                      showAnalysis
                        ? "bg-indigo-700 border-indigo-600 text-white"
                        : "bg-transparent border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    }`}
                  >
                    {showAnalysis ? "Dölj analys" : "Visa analys"}
                  </button>
                </div>

                {showAnalysis && (
                  <AnalysisPanel
                    starters={sorted}
                    raceMeters={race.distance}
                    raceStartMethod={race.start_method ?? "auto"}
                  />
                )}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                  {sorted.map((s) => {
                    const enh = enhancedMap[s.start_number];
                    return (
                      <HorseCard
                        key={s.id}
                        starter={s}
                        raceDistance={race.distance}
                        raceStartMethod={race.start_method ?? "auto"}
                        compositeScore={enh?.compositeScore}
                        valueIndex={enh?.valueIndex}
                        isValue={enh?.isValue}
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
            )}
          </div>
        );
      })}
    </div>
  );
}
