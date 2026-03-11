"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";

function todayLocal(): string {
  const d = new Date();
  return d.toLocaleDateString("sv-SE"); // "YYYY-MM-DD"
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

export function FetchButton() {
  const [date, setDate] = useState(todayLocal());
  const [availableGames, setAvailableGames] = useState<AvailableGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
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
    return () => { cancelled = true; };
  }, [date]);

  async function handleFetch(game: AvailableGame) {
    setLoading(game.id);
    setMessage(null);
    try {
      const res = await fetch("/api/games/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: game.type, gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fel");
      setMessage(`Hämtade ${data.races} lopp`);
      router.push(`/?game=${encodeURIComponent(data.game_id)}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Okänt fel");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
      <input
        type="date"
        value={date}
        min={minDate()}
        max={maxDate()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
      />
      {loadingGames ? (
        <span className="text-sm text-gray-400 dark:text-gray-500">Laddar...</span>
      ) : availableGames.length === 0 ? (
        <span className="text-sm text-gray-400 dark:text-gray-500">Inga spel</span>
      ) : (
        availableGames.map((game) => (
          <button
            key={game.id}
            onClick={() => handleFetch(game)}
            disabled={loading !== null}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {loading === game.id ? "Hämtar..." : `Hämta ${game.label}`}
          </button>
        ))
      )}
    </div>
  );
}
