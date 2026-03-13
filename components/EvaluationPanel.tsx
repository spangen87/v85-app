"use client";

import { useState } from "react";

interface RaceEval {
  race_number: number;
  winner_name: string;
  top_pick_name: string;
  top_pick_won: boolean;
  top_3_covered_winner: boolean;
}

interface GameEval {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  races_evaluated: number;
  top_pick_win_rate: number;
  top_3_coverage_rate: number;
  races: RaceEval[];
}

interface Overall {
  games_evaluated: number;
  races_evaluated: number;
  top_pick_win_rate: number;
  top_3_coverage_rate: number;
}

interface Props {
  overall: Overall;
  games: GameEval[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-5 text-center">
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function EvaluationPanel({ overall, games }: Props) {
  const [openGame, setOpenGame] = useState<string | null>(null);

  if (overall.races_evaluated === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-lg mb-2">Inga utvärderade lopp ännu.</p>
        <p className="text-sm">
          Hämta resultat för avgjorda spel via "Hämta resultat"-knappen på startsidan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Totalstatistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Topphäst vinner"
          value={`${overall.top_pick_win_rate.toFixed(0)}%`}
          sub={`av ${overall.races_evaluated} avdelningar`}
        />
        <StatCard
          label="Vinnare i topp-3"
          value={`${overall.top_3_coverage_rate.toFixed(0)}%`}
          sub="av avdelningarna"
        />
        <StatCard
          label="Spel utvärderade"
          value={String(overall.games_evaluated)}
          sub={`${overall.races_evaluated} avdelningar totalt`}
        />
      </div>

      {/* Per spel */}
      <div className="flex flex-col gap-3">
        {games.map((game) => {
          const isOpen = openGame === game.game_id;
          return (
            <div
              key={game.game_id}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenGame(isOpen ? null : game.game_id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {game.date} · {game.game_type} · {game.track}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {game.races_evaluated} avd
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      game.top_pick_win_rate >= 40
                        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                        : game.top_pick_win_rate >= 20
                        ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                    }`}
                  >
                    Topp {game.top_pick_win_rate.toFixed(0)}%
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-sm">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 dark:text-gray-500 text-xs">
                        <th className="text-left px-5 py-2 font-normal">Avd</th>
                        <th className="text-left px-3 py-2 font-normal">Vinnare</th>
                        <th className="text-left px-3 py-2 font-normal">Toppval</th>
                        <th className="text-center px-3 py-2 font-normal">Toppval vann?</th>
                        <th className="text-center px-3 py-2 font-normal">I topp-3?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.races.map((race) => (
                        <tr
                          key={race.race_number}
                          className={`border-t border-gray-200 dark:border-gray-700 ${
                            race.top_pick_won
                              ? "bg-green-50 dark:bg-green-900/20"
                              : race.top_3_covered_winner
                              ? "bg-yellow-50 dark:bg-yellow-900/20"
                              : "bg-red-50 dark:bg-red-900/10"
                          }`}
                        >
                          <td className="px-5 py-2 text-gray-500 dark:text-gray-400">
                            {race.race_number}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            {race.winner_name || "–"}
                          </td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                            {race.top_pick_name || "–"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {race.top_pick_won ? (
                              <span className="text-green-600 dark:text-green-400 font-bold">Ja</span>
                            ) : (
                              <span className="text-red-500 dark:text-red-400">Nej</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {race.top_3_covered_winner ? (
                              <span className="text-green-600 dark:text-green-400 font-bold">Ja</span>
                            ) : (
                              <span className="text-red-500 dark:text-red-400">Nej</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
