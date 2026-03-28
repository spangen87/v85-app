"use client";

import { useState } from "react";
import { analyzeRaceEnhanced } from "@/lib/analysis";
import type { AnalysisStarter } from "@/lib/analysis";

interface RaceForRanking {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: AnalysisStarter[];
}

interface RankedHorse {
  horseName: string;
  startNumber: number;
  raceNumber: number;
  compositeScore: number;
  estimatedWinPct: number;
  odds: number | null;
  isValue: boolean;
  finish_position: number | null;
  finish_time: string | null;
}

interface TopFiveRankingProps {
  races: RaceForRanking[];
  onHorseClick?: (raceNumber: number, startNumber: number) => void;
}

const MEDAL_COLORS = [
  "bg-yellow-500 text-white",
  "bg-gray-400 text-white",
  "bg-amber-700 text-white",
  "bg-indigo-600 text-white",
  "bg-indigo-600 text-white",
];

export function TopFiveRanking({ races, onHorseClick }: TopFiveRankingProps) {
  const [collapsed, setCollapsed] = useState(false);

  const allHorses: RankedHorse[] = [];

  for (const race of races) {
    const analyzed = analyzeRaceEnhanced(
      race.starters.map((s) => ({ ...s, start_method: race.start_method }))
    );
    const oddsMap = Object.fromEntries(
      race.starters.map((s) => [s.start_number, s.odds ?? null])
    );
    for (const h of analyzed) {
      allHorses.push({
        horseName: h.horseName,
        startNumber: h.startNumber,
        raceNumber: race.race_number,
        compositeScore: h.compositeScore,
        estimatedWinPct: h.estimatedWinPct,
        odds: oddsMap[h.startNumber] ?? null,
        isValue: h.isValue,
        finish_position: h.finish_position ?? null,
        finish_time: h.finish_time ?? null,
      });
    }
  }

  if (allHorses.length === 0) return null;

  allHorses.sort((a, b) => b.compositeScore - a.compositeScore);
  const top5 = allHorses.slice(0, 5);

  return (
    <div className="mb-6 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl overflow-hidden md:max-w-[45%]">
      {/* Header med kollaps-knapp */}
      <div className="px-5 py-3 border-b border-indigo-200 dark:border-indigo-800/30 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            Top 5 spelvärda hästar
          </h2>
          {!collapsed && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Rankad efter form, konsistens, tid och värde relativt marknaden
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-3 shrink-0 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
          aria-label={collapsed ? "Expandera Top 5" : "Minimera Top 5"}
        >
          {collapsed ? "▼ Visa" : "▲ Dölj"}
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-indigo-200 dark:divide-indigo-900/30">
          {top5.map((horse, i) => (
            <div
              key={`${horse.raceNumber}-${horse.startNumber}`}
              onClick={() => onHorseClick?.(horse.raceNumber, horse.startNumber)}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition ${onHorseClick ? "cursor-pointer" : ""}`}
            >
              {/* Rank badge */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDAL_COLORS[i]}`}
              >
                {i + 1}
              </span>

              {/* Horse info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {horse.horseName}
                  </span>
                  {horse.isValue && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Värde
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Avd {horse.raceNumber} &middot; Nr {horse.startNumber}
                  {horse.odds ? ` · Odds ${horse.odds}` : ""}
                </span>
              </div>

              {/* Resultat */}
              {horse.finish_position != null && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                    horse.finish_position === 1
                      ? "bg-yellow-400 text-black"
                      : horse.finish_position === 2
                      ? "bg-gray-300 text-black"
                      : horse.finish_position === 3
                      ? "bg-amber-600 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                  title={`Slutplacering: ${horse.finish_position}`}
                >
                  {horse.finish_position}:a{horse.finish_time ? ` ${horse.finish_time}` : ""}
                </span>
              )}

              {/* Score */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {horse.compositeScore}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  poäng
                </div>
              </div>

              {/* Win pct */}
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {horse.estimatedWinPct}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  vinstchans
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
