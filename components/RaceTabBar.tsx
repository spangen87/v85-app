"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface RaceTabBarProps {
  races: { race_number: number; start_time: string | null }[];
  activeRaceNumber: number;
}

export function RaceTabBar({ races, activeRaceNumber }: RaceTabBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabClick(raceNumber: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("avd", String(raceNumber));
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-none">
      <div className="flex px-3 gap-0.5 py-1.5 min-w-max">
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
              onClick={() => handleTabClick(race.race_number)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-indigo-700 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              AVD {race.race_number}
              {timeStr && (
                <span className="ml-1 font-normal opacity-70">{timeStr}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
