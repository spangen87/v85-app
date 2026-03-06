"use client";

import { useState } from "react";
import { joinGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

export function JoinGroupForm({ onJoined }: { onJoined: (group: Group) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await joinGroup(code);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (data) {
      setCode("");
      onJoined(data);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Inbjudningskod (t.ex. AB12CD)"
          maxLength={10}
          className="flex-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          {loading ? "Går med…" : "Gå med"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  );
}
