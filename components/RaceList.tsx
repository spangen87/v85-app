"use client";

import { useState } from "react";
import { HorseCard } from "./HorseCard";
import { AnalysisPanel } from "./AnalysisPanel";
import type { LifeRecord } from "@/lib/analysis";

interface Starter {
  id: string;
  start_number: number;
  horse_id: string;
  driver: string;
  trainer: string;
  odds: number | null;
  bet_distribution: number | null;
  starts_total: number | null;
  wins_total: number | null;
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
  distance: number;
  start_method: string | null;
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
              <span className="text-white font-semibold">Lopp {race.race_number}</span>
              <span className="text-gray-400 text-sm">
                {race.distance} m &nbsp; {isOpen ? "▲" : "▼"}
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
