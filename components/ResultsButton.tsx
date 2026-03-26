"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  gameId: string | null;
}

export function ResultsButton({ gameId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleFetch() {
    if (!gameId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/results`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.status === 422) {
        setMessage("Inga resultat tillgängliga ännu");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Fel");
      setMessage(`Uppdaterade ${data.updated} hästar i ${data.races} avd`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Okänt fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
      )}
      <button
        onClick={handleFetch}
        disabled={!gameId || loading}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 transition"
      >
        {loading ? "Hämtar..." : "Hämta resultat"}
      </button>
    </div>
  );
}
