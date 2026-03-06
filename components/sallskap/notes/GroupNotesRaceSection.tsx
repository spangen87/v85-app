"use client";

import { useState } from "react";
import { HorseNotes } from "@/components/notes/HorseNotes";
import type { Group } from "@/lib/types";

interface Starter {
  id: string;
  start_number: number;
  horse_id: string;
  horses: { name: string } | null;
}

interface Race {
  id: string;
  race_number: number;
  race_name: string | null;
  start_time: string | null;
  starters: Starter[];
}

interface GroupNotesRaceSectionProps {
  race: Race;
  userGroups: Group[];
  currentUserId: string;
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function GroupNotesRaceSection({ race, userGroups, currentUserId }: GroupNotesRaceSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedStarters = [...race.starters].sort((a, b) => a.start_number - b.start_number);
  const timeStr = race.start_time ? formatTime(race.start_time) : null;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Avd {race.race_number}
          {race.race_name ? ` – ${race.race_name}` : ""}
          {timeStr ? ` · ${timeStr}` : ""}
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {sortedStarters.map((starter) => (
            <div key={starter.id} className="px-4 py-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {starter.start_number}. {starter.horses?.name ?? starter.horse_id}
              </p>
              <HorseNotes
                horseId={starter.horse_id}
                userGroups={userGroups}
                currentUserId={currentUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
