"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { oddsFetchedText } from "@/lib/optimizerView";

/**
 * Hämtar om omgången från ATG så att odds, streck och chans är färska när
 * systemet byggs. Kalibrerad chans är skattad på slutodds, så förslagen blir
 * bättre ju närmare start de räknas. Kupongen och låsen ligger kvar i klienten
 * (sidan uppdateras med router.refresh, samma omgång behåller sitt tillstånd).
 */
export function RefreshOddsButton({ gameId, gameType, fetchedAt }: {
  gameId: string;
  gameType: string;
  /** Senaste hämtningens tid (odds_snapshots), null om den inte finns */
  fetchedAt: string | null;
}) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = fetching || refreshing;

  async function handleClick() {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/games/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType, gameId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Kunde inte hämta oddsen");
      startRefresh(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte hämta oddsen");
    } finally {
      setFetching(false);
    }
  }

  const text = oddsFetchedText(fetchedAt);
  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={busy}>{busy ? "Uppdaterar odds …" : "Uppdatera odds"}</Button>
      {text && <span role="status" style={{ font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>{text}</span>}
      {error && <p className="ta-error" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
