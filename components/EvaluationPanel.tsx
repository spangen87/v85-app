"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BulkResultsButton } from "@/components/BulkResultsButton";
import { deleteGame } from "@/lib/actions/games";

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

export interface GameSummary {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  has_results: boolean;
}

interface Props {
  overall: Overall;
  games: GameEval[];
  allGames: GameSummary[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
    >
      <p className="tn-eyebrow mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color: "var(--tn-text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--tn-text-faint)" }}>{sub}</p>}
    </div>
  );
}

export function EvaluationPanel({ overall, games, allGames }: Props) {
  const router = useRouter();
  const [openGame, setOpenGame] = useState<string | null>(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [localGames, setLocalGames] = useState(allGames);
  const pendingGames = localGames.filter((g) => !g.has_results);

  async function handleDeleteGame(gameId: string) {
    setLocalGames((prev) => prev.filter((g) => g.game_id !== gameId));
    const result = await deleteGame(gameId);
    if (result.error) {
      setLocalGames(allGames);
      alert(`Kunde inte ta bort omgången: ${result.error}`);
    } else {
      router.refresh();
    }
  }

  if (allGames.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: "var(--tn-text-faint)" }}>
        <p className="text-lg mb-2">Inga laddade omgångar ännu.</p>
        <p className="text-sm">Hämta en omgång via startsidan för att börja analysera.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <BulkResultsButton pendingGames={pendingGames} />

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowAllGames((v) => !v)}
          className="flex items-center gap-2 text-left"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <h2 className="tn-eyebrow">
            Laddade omgångar ({localGames.length})
          </h2>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${showAllGames ? "rotate-180" : ""}`}
            style={{ color: "var(--tn-text-faint)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showAllGames && (
          <div className="flex flex-col gap-1">
            {localGames.map((g) => (
              <div
                key={g.game_id}
                className="flex items-center justify-between px-4 py-2 rounded-lg"
                style={{ background: "var(--tn-bg-card)" }}
              >
                <span className="text-sm" style={{ color: "var(--tn-text)" }}>
                  {g.date} · {g.game_type} · {g.track}
                </span>
                <div className="flex items-center gap-2">
                  {g.has_results ? (
                    <span
                      className="tn-mono text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(52,211,153,0.15)", color: "var(--tn-value-high)" }}
                    >
                      Klar
                    </span>
                  ) : (
                    <>
                      <span
                        className="tn-mono text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(251,191,36,0.15)", color: "var(--tn-warn)" }}
                      >
                        Saknar resultat
                      </span>
                      <button
                        onClick={() => handleDeleteGame(g.game_id)}
                        title="Ta bort omgång"
                        className="text-sm leading-none px-1 transition"
                        style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {overall.races_evaluated > 0 && (
        <>
          <p className="text-sm" style={{ color: "var(--tn-text-faint)" }}>
            Utvärderar hur ofta hästarna med högst Composite Score (CS) vinner loppet.
            Topp-3 = de tre hästar med högst CS i varje avdelning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Topprankad (CS) vinner"
              value={`${overall.top_pick_win_rate.toFixed(0)}%`}
              sub={`av ${overall.races_evaluated} avdelningar`}
            />
            <StatCard
              label="Vinnare bland topp 3 (CS)"
              value={`${overall.top_3_coverage_rate.toFixed(0)}%`}
              sub="av avdelningarna"
            />
            <StatCard
              label="Spel utvärderade"
              value={String(overall.games_evaluated)}
              sub={`${overall.races_evaluated} avdelningar totalt`}
            />
          </div>

          <div className="flex flex-col gap-3">
            {games.map((game) => {
              const isOpen = openGame === game.game_id;
              const winRate = game.top_pick_win_rate;
              const rateColor = winRate >= 40
                ? "var(--tn-value-high)"
                : winRate >= 20
                ? "var(--tn-warn)"
                : "var(--tn-value-low)";
              const rateBg = winRate >= 40
                ? "rgba(52,211,153,0.15)"
                : winRate >= 20
                ? "rgba(251,191,36,0.15)"
                : "rgba(248,113,113,0.15)";

              return (
                <div
                  key={game.game_id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
                >
                  <button
                    onClick={() => setOpenGame(isOpen ? null : game.game_id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold" style={{ color: "var(--tn-text)" }}>
                        {game.date} · {game.game_type} · {game.track}
                      </span>
                      <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
                        {game.races_evaluated} avd
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="tn-mono text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: rateBg, color: rateColor }}
                      >
                        Topp {winRate.toFixed(0)}%
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        style={{ color: "var(--tn-text-faint)" }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--tn-border)" }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left px-5 py-2 font-normal tn-eyebrow">Avd</th>
                            <th className="text-left px-3 py-2 font-normal tn-eyebrow">Vinnare</th>
                            <th className="text-left px-3 py-2 font-normal tn-eyebrow">Toppval (CS)</th>
                            <th className="text-center px-3 py-2 font-normal tn-eyebrow">Toppval vann?</th>
                            <th className="text-center px-3 py-2 font-normal tn-eyebrow">Vinnare i topp 3?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {game.races.map((race) => {
                            const rowBg = race.top_pick_won
                              ? "rgba(52,211,153,0.08)"
                              : race.top_3_covered_winner
                              ? "rgba(251,191,36,0.08)"
                              : "rgba(248,113,113,0.06)";
                            return (
                              <tr key={race.race_number} style={{ borderTop: "1px solid var(--tn-border)", background: rowBg }}>
                                <td className="px-5 py-2" style={{ color: "var(--tn-text-faint)" }}>{race.race_number}</td>
                                <td className="px-3 py-2 font-medium" style={{ color: "var(--tn-text)" }}>{race.winner_name || "–"}</td>
                                <td className="px-3 py-2" style={{ color: "var(--tn-text-dim)" }}>{race.top_pick_name || "–"}</td>
                                <td className="px-3 py-2 text-center">
                                  {race.top_pick_won
                                    ? <span className="font-bold" style={{ color: "var(--tn-value-high)" }}>Ja</span>
                                    : <span style={{ color: "var(--tn-value-low)" }}>Nej</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {race.top_3_covered_winner
                                    ? <span className="font-bold" style={{ color: "var(--tn-value-high)" }}>Ja</span>
                                    : <span style={{ color: "var(--tn-value-low)" }}>Nej</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
