"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";

interface UpcomingResponse {
  game: AvailableGame | null;
  date: string | null;
}

/**
 * Visas när inga spel är sparade.
 * Letar automatiskt upp nästkommande V86/V85/V75 och erbjuder att hämta det.
 */
export function AutoLoadUpcoming() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<UpcomingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/games/upcoming")
      .then((r) => r.json())
      .then((data: UpcomingResponse) => setUpcoming(data))
      .catch(() => setUpcoming({ game: null, date: null }))
      .finally(() => setLoading(false));
  }, []);

  async function handleAutoLoad() {
    if (!upcoming?.game) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/games/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: upcoming.game.type, gameId: upcoming.game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fel");
      router.push(`/?game=${encodeURIComponent(data.game_id)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Okänt fel");
      setFetching(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
        Letar efter nästa spel...
      </div>
    );
  }

  if (!upcoming?.game) {
    return null; // Inga spel hittades — visa standard tom-vy
  }

  const dateLabel = upcoming.date === new Date().toLocaleDateString("sv-SE") ? "idag" : "imorgon";

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 p-5 text-center">
      <div className="text-3xl mb-2">🏇</div>
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
        {upcoming.game.label} {dateLabel}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Hämta spelet för att se hästar och börja analysera.
      </p>
      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}
      <button
        onClick={handleAutoLoad}
        disabled={fetching}
        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-60 transition"
      >
        {fetching ? "Hämtar..." : `Hämta ${upcoming.game.label}`}
      </button>
    </div>
  );
}
