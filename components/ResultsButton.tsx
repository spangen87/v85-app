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
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/results`, { method: "POST" });
      const data = await res.json();
      if (res.status === 422) { setMessage("Inga resultat tillgängliga ännu"); return; }
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
        <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{message}</span>
      )}
      <button
        onClick={handleFetch}
        disabled={!gameId || loading}
        className="text-xs font-medium rounded-lg transition disabled:opacity-40"
        style={{
          padding: "5px 12px",
          background: "var(--tn-bg-chip)",
          border: "1px solid var(--tn-border)",
          color: "var(--tn-text-dim)",
          cursor: "pointer",
        }}
      >
        {loading ? "Hämtar..." : "Hämta resultat"}
      </button>
    </div>
  );
}
