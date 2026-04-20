"use client";

import { useRaceTab } from "@/components/RaceTabContext";

interface RaceTabBarProps {
  races: { race_number: number; start_time: string | null }[];
}

export function RaceTabBar({ races }: RaceTabBarProps) {
  const { activeRaceNumber, setActiveRaceNumber } = useRaceTab();

  return (
    <div
      className="overflow-x-auto scrollbar-none"
      style={{ borderTop: "1px solid var(--tn-border)" }}
    >
      <div className="flex px-3 gap-1 py-2 min-w-max">
        {races.map((race) => {
          const isActive = race.race_number === activeRaceNumber;
          const timeStr = race.start_time
            ? new Date(race.start_time).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Stockholm",
              })
            : null;
          return (
            <button
              key={race.race_number}
              onClick={() => setActiveRaceNumber(race.race_number)}
              className="px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors tn-mono text-xs"
              style={{
                background: isActive ? "var(--tn-accent-faint)" : "transparent",
                color: isActive ? "var(--tn-accent)" : "var(--tn-text-faint)",
                border: isActive ? "1px solid transparent" : "1px solid transparent",
                fontWeight: isActive ? "600" : "400",
              }}
            >
              AVD {race.race_number}
              {timeStr && (
                <span
                  className="ml-1.5"
                  style={{ opacity: 0.65, fontWeight: 400 }}
                >
                  {timeStr}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
