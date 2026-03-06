"use client";

import { useState } from "react";
import { createGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

export function CreateGroupForm({ onCreated }: { onCreated: (group: Group) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await createGroup(name);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (data) {
      setName("");
      onCreated(data);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Namn på sällskapet"
          maxLength={50}
          className="flex-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          {loading ? "Skapar…" : "Skapa"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  );
}
