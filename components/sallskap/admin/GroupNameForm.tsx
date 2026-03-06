"use client";

import { useState } from "react";
import { updateGroup } from "@/lib/actions/groups";

interface GroupNameFormProps {
  groupId: string;
  initialName: string;
  onUpdated: (name: string) => void;
}

export function GroupNameForm({ groupId, initialName, onUpdated }: GroupNameFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await updateGroup(groupId, { name: name.trim() });
    setLoading(false);
    if (error) {
      setMessage(error);
    } else {
      setMessage("Sparat!");
      onUpdated(name.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sällskapets namn"
        maxLength={60}
        className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
      >
        {loading ? "Sparar…" : "Spara"}
      </button>
      {message && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{message}</span>
      )}
    </form>
  );
}
