"use client";

import { useRouter } from "next/navigation";

interface Game {
  id: string;
  date: string;
  track: string;
  game_type: string;
}

interface GameSelectorProps {
  games: Game[];
  selectedId: string | null;
}

export function GameSelector({ games, selectedId }: GameSelectorProps) {
  const router = useRouter();

  if (games.length === 0) return null;

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => router.push(`/?game=${encodeURIComponent(e.target.value)}`)}
      className="rounded-lg text-sm px-3 py-2 focus:outline-none"
      style={{
        background: "var(--tn-bg-chip)",
        border: "1px solid var(--tn-border)",
        color: "var(--tn-text)",
      }}
    >
      {games.map((g) => (
        <option key={g.id} value={g.id}>
          {g.date} — {g.game_type} — {g.track}
        </option>
      ))}
    </select>
  );
}
