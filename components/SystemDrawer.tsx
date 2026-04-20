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
    return selections.find((s) => s.race_number === raceNumber)?.horses.some((h) => h.horse_id === horseId) ?? false;
  }

  const completedRaces = selections.length;

  return (
    <>
      <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-2xl max-h-[70vh] flex flex-col"
        style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: "var(--tn-border-strong)" }} />
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--tn-border)" }}
        >
          <span className="tn-eyebrow">Din kupong</span>
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="text-lg leading-none transition"
            style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {races.map((race) => {
            const sorted = [...race.starters].sort((a, b) => a.start_number - b.start_number);
            return (
              <div key={race.id}>
                <div className="tn-eyebrow mb-1.5">Avd {race.race_number} · {race.distance}m</div>
                <div className="flex flex-wrap gap-1.5">
                  {sorted.map((starter) => {
                    const selected = isSelected(race.race_number, starter.horse_id);
                    return (
                      <button
                        key={starter.horse_id}
                        onClick={() => onToggleHorse(race.race_number, {
                          horse_id: starter.horse_id,
                          start_number: starter.start_number,
                          horse_name: starter.horses?.name ?? "",
                        })}
                        title={starter.horses?.name ?? `Nr ${starter.start_number}`}
                        className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                        style={selected
                          ? { background: "var(--tn-accent)", color: "#fff", outline: "2px solid var(--tn-accent-soft)", outlineOffset: 1 }
                          : { background: "var(--tn-bg-chip)", color: "var(--tn-text-faint)" }
                        }
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

        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "2px solid var(--tn-accent)" }}
        >
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-lg font-extrabold" style={{ color: "var(--tn-accent)" }}>
              {totalRows} {totalRows === 1 ? "rad" : "rader"}
            </span>
            <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
              {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
            </span>
          </div>
          <div className="text-xs mb-2" style={{ color: "var(--tn-text-faint)" }}>
            {completedRaces} av {races.length} avd. klara
          </div>
          <button
            onClick={onSave}
            disabled={selections.length === 0}
            className="w-full py-2 text-sm font-bold rounded-lg disabled:opacity-40 transition"
            style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            Spara system →
          </button>
          <button
            onClick={onCancel}
            className="w-full mt-2 text-xs underline transition"
            style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
          >
            Avbryt systemläge
          </button>
        </div>
      </div>
    </>
  );
}
