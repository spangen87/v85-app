"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AvailableGame } from "@/lib/atg";

interface UpcomingResponse {
  game: AvailableGame | null;
  date: string | null;
}

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
      <div className="text-center py-6 text-sm" style={{ color: "var(--tn-text-faint)" }}>
        Letar efter nästa spel...
      </div>
    );
  }

  if (!upcoming?.game) return null;

  const dateLabel = upcoming.date === new Date().toLocaleDateString("sv-SE") ? "idag" : "imorgon";

  return (
    <div
      className="mb-6 rounded-xl p-5 text-center"
      style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
    >
      <p className="tn-eyebrow mb-3">Nästa spel</p>
      <h2 className="text-base font-bold mb-1" style={{ color: "var(--tn-text)" }}>
        {upcoming.game.label} {dateLabel}
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--tn-text-faint)" }}>
        Hämta spelet för att se hästar och börja analysera.
      </p>
      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--tn-value-low)" }}>{error}</p>
      )}
      <button
        onClick={handleAutoLoad}
        disabled={fetching}
        className="text-sm font-bold rounded-xl transition disabled:opacity-60"
        style={{
          padding: "10px 24px",
          background: "var(--tn-accent)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        {fetching ? "Hämtar..." : `Hämta ${upcoming.game.label}`}
      </button>
    </div>
  );
}
