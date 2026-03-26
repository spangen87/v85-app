"use client";

import type { SystemSelection, SystemHorse } from "@/lib/types";
import { formatRowCost } from "@/lib/atg";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: {
    horse_id: string;
    start_number: number;
    horses: { name: string } | null;
  }[];
}

interface SystemSidebarProps {
  races: RaceInfo[];
  selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  onSave: () => void;
  onCancel: () => void;
  totalRows: number;
  gameType: string | null;
}

export function SystemSidebar({
  races,
  selections,
  onToggleHorse,
  onSave,
  onCancel,
  totalRows,
  gameType,
}: SystemSidebarProps) {
  function isSelected(raceNumber: number, horseId: string): boolean {
    return (
      selections
        .find((s) => s.race_number === raceNumber)
        ?.horses.some((h) => h.horse_id === horseId) ?? false
    );
  }

  const completedRaces = selections.length;

  return (
    <aside className="hidden md:flex flex-col w-[320px] flex-shrink-0 sticky top-0 self-start max-h-screen border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="font-bold text-sm text-gray-900 dark:text-white">🎯 Din kupong</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Klicka för att lägga till / ta bort
        </div>
      </div>

      {/* Races */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {races.map((race) => {
          const sorted = [...race.starters].sort(
            (a, b) => a.start_number - b.start_number
          );
          return (
            <div key={race.id}>
              <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                Avd {race.race_number} · {race.distance}m
              </div>
              <div className="flex flex-wrap gap-1">
                {sorted.map((starter) => {
                  const selected = isSelected(race.race_number, starter.horse_id);
                  return (
                    <button
                      key={starter.horse_id}
                      onClick={() =>
                        onToggleHorse(race.race_number, {
                          horse_id: starter.horse_id,
                          start_number: starter.start_number,
                          horse_name: starter.horses?.name ?? "",
                        })
                      }
                      title={starter.horses?.name ?? `Nr ${starter.start_number}`}
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        selected
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-400"
                      }`}
                    >
                      {starter.start_number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t-2 border-emerald-500 flex-shrink-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-extrabold text-emerald-500">
            {totalRows} {totalRows === 1 ? "rad" : "rader"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          {completedRaces} av {races.length} avd. klara
        </div>
        <button
          onClick={onSave}
          disabled={selections.length === 0}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg disabled:opacity-40 transition"
        >
          Spara system →
        </button>
        <button
          onClick={onCancel}
          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline transition"
        >
          Avbryt systemläge
        </button>
      </div>
    </aside>
  );
}
