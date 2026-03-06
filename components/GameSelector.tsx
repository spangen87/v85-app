"use client";

import { useRouter } from "next/navigation";

interface Game {
  id: string;
  date: string;
  track: string;
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
      className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
    >
      {games.map((g) => (
        <option key={g.id} value={g.id}>
          {g.date} — {g.track}
        </option>
      ))}
    </select>
  );
}
