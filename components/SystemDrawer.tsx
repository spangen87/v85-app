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

interface SystemDrawerProps {
  open: boolean;
  onClose: () => void;
  races: RaceInfo[];
  selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  onSave: () => void;
  onCancel: () => void;
  totalRows: number;
  gameType: string | null;
}

export function SystemDrawer({
  open,
  onClose,
  races,
  selections,
  onToggleHorse,
  onSave,
  onCancel,
  totalRows,
  gameType,
}: SystemDrawerProps) {
  if (!open) return null;

  function isSelected(raceNumber: number, horseId: string): boolean {
    return (
      selections
        .find((s) => s.race_number === raceNumber)
        ?.horses.some((h) => h.horse_id === horseId) ?? false
    );
  }

  const completedRaces = selections.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      {/* Panel */}
      <div role="dialog" aria-modal="true" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900 rounded-t-2xl max-h-[70vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-gray-700" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
          <span className="font-bold text-sm text-white">🎯 Din kupong</span>
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="text-gray-400 hover:text-white text-lg leading-none transition"
          >
            ✕
          </button>
        </div>
        {/* Races */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {races.map((race) => {
            const sorted = [...race.starters].sort(
              (a, b) => a.start_number - b.start_number
            );
            return (
              <div key={race.id}>
                <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">
                  Avd {race.race_number} · {race.distance}m
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          selected
                            ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                            : "bg-gray-700 text-gray-400 hover:bg-emerald-900 hover:text-emerald-400"
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
        <div className="px-4 py-3 border-t-2 border-emerald-500 flex-shrink-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-lg font-extrabold text-emerald-400">
              {totalRows} {totalRows === 1 ? "rad" : "rader"}
            </span>
            <span className="text-xs text-gray-500">
              {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
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
            className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300 underline transition"
          >
            Avbryt systemläge
          </button>
        </div>
      </div>
    </>
  );
}
