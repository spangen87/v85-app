"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { fmtGameLabel } from "@/lib/format";

export type FetchStatus = "idle" | "pending" | "success" | "not_ready" | "error";

interface GameStatus {
  game_id: string;
  date: string;
  game_type: string;
  track: string;
  status: FetchStatus;
  message?: string;
}

interface Props {
  pendingGames: Array<{
    game_id: string;
    date: string;
    game_type: string;
    track: string;
  }>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function BulkResultsButton({ pendingGames }: Props) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [statuses, setStatuses] = useState<GameStatus[]>([]);

  async function handleFetchAll() {
    if (pendingGames.length === 0 || fetching) return;
    setFetching(true);
    setStatuses(
      pendingGames.map((g) => ({ game_id: g.game_id, date: g.date, game_type: g.game_type, track: g.track, status: "pending" }))
    );

    for (let i = 0; i < pendingGames.length; i++) {
      const game = pendingGames[i];
      if (i > 0) await delay(500);
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(game.game_id)}/results`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        let nextStatus: FetchStatus;
        let message: string | undefined;
        if (res.status === 422) { nextStatus = "not_ready"; message = "Inte redo"; }
        else if (res.ok) { nextStatus = "success"; message = `${data.updated ?? "?"} hästar i ${data.races ?? "?"} avd`; }
        else { nextStatus = "error"; message = data.error ?? `HTTP ${res.status}`; }
        setStatuses((prev) => prev.map((s) => s.game_id === game.game_id ? { ...s, status: nextStatus, message } : s));
      } catch (err) {
        setStatuses((prev) => prev.map((s) =>
          s.game_id === game.game_id ? { ...s, status: "error", message: err instanceof Error ? err.message : "Nätverksfel" } : s
        ));
      }
    }
    setFetching(false);
    router.refresh();
  }

  const pendingCount = pendingGames.length;
  const statusText = (s: GameStatus) =>
    s.status === "pending" ? "Väntar …"
      : s.status === "success" ? `Klar: ${s.message}`
      : s.status === "not_ready" ? "Inte klar än"
      : `Fel: ${s.message}`;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button onClick={handleFetchAll} disabled={pendingCount === 0 || fetching}>
          {fetching ? "Hämtar …" : pendingCount === 0 ? "Alla resultat hämtade" : "Hämta saknade resultat"}
        </Button>
      </div>
      {statuses.length > 0 && (
        <ul className="ta-card ta-divided" style={{ listStyle: "none", margin: 0, padding: 0, overflow: "hidden" }} aria-live="polite">
          {statuses.map((s) => (
            <li key={s.game_id} className="ta-linkrow">
              <span className="flex-1 min-w-0">{fmtGameLabel(s)}</span>
              <span className="ta-text-sm" style={s.status === "error" ? { color: "var(--danger)" } : undefined}>{statusText(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
