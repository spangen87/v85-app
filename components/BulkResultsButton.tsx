"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    // Initialise all rounds as "pending" so the user sees the list immediately
    setStatuses(
      pendingGames.map((g) => ({
        game_id: g.game_id,
        date: g.date,
        game_type: g.game_type,
        track: g.track,
        status: "pending",
      }))
    );

    for (let i = 0; i < pendingGames.length; i++) {
      const game = pendingGames[i];

      // 500 ms delay between requests (skip before the very first one)
      if (i > 0) await delay(500);

      try {
        const res = await fetch(
          `/api/games/${encodeURIComponent(game.game_id)}/results`,
          { method: "POST" }
        );
        const data = await res.json().catch(() => ({}));

        let nextStatus: FetchStatus;
        let message: string | undefined;

        if (res.status === 422) {
          nextStatus = "not_ready";
          message = "Inte redo";
        } else if (res.ok) {
          nextStatus = "success";
          message = `${data.updated ?? "?"} hästar i ${data.races ?? "?"} avd`;
        } else {
          nextStatus = "error";
          message = data.error ?? `HTTP ${res.status}`;
        }

        setStatuses((prev) =>
          prev.map((s) =>
            s.game_id === game.game_id
              ? { ...s, status: nextStatus, message }
              : s
          )
        );
      } catch (err) {
        setStatuses((prev) =>
          prev.map((s) =>
            s.game_id === game.game_id
              ? {
                  ...s,
                  status: "error",
                  message: err instanceof Error ? err.message : "Nätverksfel",
                }
              : s
          )
        );
      }
    }

    setFetching(false);
    router.refresh();
  }

  const pendingCount = pendingGames.length;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleFetchAll}
        disabled={pendingCount === 0 || fetching}
        className="self-start px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 transition"
      >
        {fetching
          ? "Hämtar..."
          : pendingCount === 0
          ? "Alla resultat hämtade"
          : `Hämta alla resultat (${pendingCount})`}
      </button>

      {statuses.length > 0 && (
        <div className="flex flex-col gap-1">
          {statuses.map((s) => (
            <div
              key={s.game_id}
              className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {s.date} · {s.game_type} · {s.track}
              </span>
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  s.status === "success"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                    : s.status === "not_ready"
                    ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                    : s.status === "error"
                    ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {s.status === "pending" && "Väntar..."}
                {s.status === "success" && `Klar — ${s.message}`}
                {s.status === "not_ready" && "Inte redo"}
                {s.status === "error" && `Fel: ${s.message}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
