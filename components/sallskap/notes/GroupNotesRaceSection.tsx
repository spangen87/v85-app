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
  try { return new Date(isoStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export function GroupNotesRaceSection({ race, userGroups, currentUserId }: GroupNotesRaceSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const sortedStarters = [...race.starters].sort((a, b) => a.start_number - b.start_number);
  const timeStr = race.start_time ? formatTime(race.start_time) : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tn-border)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition"
        style={{ background: "var(--tn-bg-card)", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--tn-bg-card)"; }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--tn-text)" }}>
          Avd {race.race_number}{race.race_name ? ` – ${race.race_name}` : ""}{timeStr ? ` · ${timeStr}` : ""}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--tn-text-faint)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--tn-border)" }}>
          {sortedStarters.map((starter, i) => (
            <div
              key={starter.id}
              className="px-4 py-3"
              style={{ borderTop: i > 0 ? "1px solid var(--tn-border)" : "none" }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: "var(--tn-text-dim)" }}>
                {starter.start_number}. {starter.horses?.name ?? starter.horse_id}
              </p>
              <HorseNotes horseId={starter.horse_id} userGroups={userGroups} currentUserId={currentUserId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
