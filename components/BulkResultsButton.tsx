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

  const statusStyle = (status: FetchStatus): React.CSSProperties => {
    if (status === "success") return { background: "rgba(52,211,153,0.15)", color: "var(--tn-value-high)" };
    if (status === "not_ready") return { background: "rgba(251,191,36,0.15)", color: "var(--tn-warn)" };
    if (status === "error") return { background: "rgba(248,113,113,0.15)", color: "var(--tn-value-low)" };
    return { background: "var(--tn-bg-chip)", color: "var(--tn-text-faint)" };
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleFetchAll}
        disabled={pendingCount === 0 || fetching}
        className="self-start text-sm font-medium rounded-lg transition disabled:opacity-40"
        style={{
          padding: "8px 16px",
          background: "var(--tn-bg-chip)",
          border: "1px solid var(--tn-border)",
          color: "var(--tn-text-dim)",
          cursor: "pointer",
        }}
      >
        {fetching ? "Hämtar..." : pendingCount === 0 ? "Alla resultat hämtade" : `Hämta alla resultat (${pendingCount})`}
      </button>

      {statuses.length > 0 && (
        <div className="flex flex-col gap-1">
          {statuses.map((s) => (
            <div
              key={s.game_id}
              className="flex items-center justify-between px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--tn-bg-card)" }}
            >
              <span style={{ color: "var(--tn-text)" }}>{s.date} · {s.game_type} · {s.track}</span>
              <span
                className="tn-mono flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={statusStyle(s.status)}
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
