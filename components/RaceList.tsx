"use client";

import { useState } from "react";
import { HorseCard } from "./HorseCard";
import { AnalysisPanel } from "./AnalysisPanel";
import type { LifeRecord } from "@/lib/analysis";

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
  places_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  starts_prev_year: number | null;
  wins_prev_year: number | null;
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

export function RaceList({ races }: { races: Race[] }) {
  const [openRace, setOpenRace] = useState<string | null>(races[0]?.id ?? null);
  const [analysisRace, setAnalysisRace] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {races.map((race) => {
        const sorted = [...race.starters].sort(
          (a, b) => (b.formscore ?? 0) - (a.formscore ?? 0)
        );
        const isOpen = openRace === race.id;
        const showAnalysis = analysisRace === race.id;

        return (
          <div key={race.id} className="bg-gray-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenRace(isOpen ? null : race.id)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-800 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-white font-semibold shrink-0">
                  Lopp {race.race_number}
                </span>
                {race.race_name && (
                  <span className="text-gray-400 text-xs truncate hidden sm:block">
                    {race.race_name}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm shrink-0 ml-2">
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
                        : "bg-transparent border-indigo-700 text-indigo-400 hover:bg-indigo-900/30"
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
                  {sorted.map((s) => (
                    <HorseCard key={s.id} starter={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
