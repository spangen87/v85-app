"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";

interface SavedGame {
  id: string;
  date: string;
  track: string | null;
  game_type: string;
}

interface GamePickerBarProps {
  /** Redan sparade omgångar i databasen */
  savedGames: SavedGame[];
  /** Aktuellt valt spel-ID */
  selectedId: string | null;
}

function todayLocal(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function tomorrowLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

function minDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toLocaleDateString("sv-SE");
}

function maxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("sv-SE");
}

export function GamePickerBar({ savedGames, selectedId }: GamePickerBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedGame = savedGames.find((g) => g.id === selectedId) ?? null;

  // Hämta tillgängliga spel när datumet ändras eller panelen öppnas
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingGames(true);
    setAvailableGames([]);
    fetch(`/api/games/available?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAvailableGames(data.games ?? []);
      })
      .catch(() => {
        if (!cancelled) setAvailableGames([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGames(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, open]);

  const handleFetch = useCallback(
    async (game: AvailableGame) => {
      setFetchingId(game.id);
      setMessage(null);
      try {
        const res = await fetch("/api/games/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameType: game.type, gameId: game.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Fel");
        setOpen(false);
        router.push(`/?game=${encodeURIComponent(data.game_id)}`);
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Okänt fel");
      } finally {
        setFetchingId(null);
      }
    },
    [router]
  );

  // Navigera mellan sparade omgångar
  const currentIndex = savedGames.findIndex((g) => g.id === selectedId);
  const prevGame = currentIndex > 0 ? savedGames[currentIndex - 1] : null;
  const nextGame =
    currentIndex < savedGames.length - 1 ? savedGames[currentIndex + 1] : null;

  return (
    <div className="relative">
      {/* Kompakt spelväljare-rad */}
      <div className="flex items-center gap-1">
        {/* Föregående spel */}
        <button
          onClick={() => prevGame && router.push(`/?game=${prevGame.id}`)}
          disabled={!prevGame}
          aria-label="Föregående spel"
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Aktuellt spel / öppna väljaren */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-900 dark:text-white min-w-0"
        >
          {selectedGame ? (
            <>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                {selectedGame.game_type}
              </span>
              <span className="text-gray-400 dark:text-gray-500 shrink-0">·</span>
              <span className="truncate max-w-[120px]">
                {selectedGame.track ?? selectedGame.date}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">
                {selectedGame.date}
              </span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Välj spel</span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Nästa spel */}
        <button
          onClick={() => nextGame && router.push(`/?game=${nextGame.id}`)}
          disabled={!nextGame}
          aria-label="Nästa spel"
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Dropdown-panel */}
      {open && (
        <>
          {/* Bakgrundsoverlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-4">
            {/* Rubrik */}
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Hämta nytt spel
            </div>

            {/* Datumväljare */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() - 1);
                  const s = d.toLocaleDateString("sv-SE");
                  if (s >= minDate()) setDate(s);
                }}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Föregående dag"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="date"
                value={date}
                min={minDate()}
                max={maxDate()}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() + 1);
                  const s = d.toLocaleDateString("sv-SE");
                  if (s <= maxDate()) setDate(s);
                }}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Nästa dag"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Tillgängliga spel — klick = auto-hämta */}
            {loadingGames ? (
              <div className="text-sm text-gray-400 text-center py-3">Letar spel...</div>
            ) : availableGames.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-3">Inga spel {date === todayLocal() ? "idag" : date === tomorrowLocal() ? "imorgon" : date}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {availableGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleFetch(game)}
                    disabled={fetchingId !== null}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-sm disabled:opacity-50 transition"
                  >
                    <span>{game.label}</span>
                    {fetchingId === game.id ? (
                      <span className="text-xs text-indigo-400">Hämtar...</span>
                    ) : (
                      <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {message && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">{message}</p>
            )}

            {/* Separerare + sparade omgångar */}
            {savedGames.length > 0 && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-3" />
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Sparade omgångar
                </div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {savedGames.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/?game=${encodeURIComponent(g.id)}`);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        g.id === selectedId
                          ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="font-semibold">{g.game_type}</span>
                      <span className="text-gray-500 dark:text-gray-400 mx-1.5">·</span>
                      {g.track && <span>{g.track} · </span>}
                      <span className="text-gray-500 dark:text-gray-400">{g.date}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
