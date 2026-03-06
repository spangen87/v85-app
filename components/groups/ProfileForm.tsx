"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/groups";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await updateProfile(name);
    setLoading(false);
    setMessage(error ?? "Sparat!");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ditt visningsnamn"
        maxLength={40}
        className="flex-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
      >
        {loading ? "Sparar…" : "Spara"}
      </button>
      {message && (
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center">{message}</span>
      )}
    </form>
  );
}
