"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function todayLocal(): string {
  const d = new Date();
  return d.toLocaleDateString("sv-SE"); // "YYYY-MM-DD"
}

function minDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toLocaleDateString("sv-SE");
}

function maxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("sv-SE");
}

export function FetchButton() {
  const [date, setDate] = useState(todayLocal());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleFetch() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/games/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fel");
      setMessage(`Hämtade ${data.races} lopp`);
      router.push(`/?game=${encodeURIComponent(data.game_id)}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Okänt fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {message && <span className="text-sm text-gray-400">{message}</span>}
      <input
        type="date"
        value={date}
        min={minDate()}
        max={maxDate()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={handleFetch}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition"
      >
        {loading ? "Hämtar..." : "Hämta V85"}
      </button>
    </div>
  );
}
