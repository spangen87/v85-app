"use client";

import { useState } from "react";
import { updateGroup } from "@/lib/actions/groups";

interface AtgTeamUrlFormProps {
  groupId: string;
  initialUrl: string | null | undefined;
  isCreator: boolean;
  onUpdated: (url: string | null) => void;
}

export function AtgTeamUrlForm({ groupId, initialUrl, isCreator, onUpdated }: AtgTeamUrlFormProps) {
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? null);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const trimmed = url.trim() || null;
    const { error } = await updateGroup(groupId, { atg_team_url: trimmed });
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSavedUrl(trimmed);
      onUpdated(trimmed);
      setEditing(false);
    }
  }

  // Icke-skapare: bara visa länk
  if (!isCreator) {
    if (!savedUrl) {
      return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Ingen ATG-lagslänk inlagd ännu.</p>;
    }
    return (
      <a
        href={savedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
      >
        {savedUrl}
      </a>
    );
  }

  // Skapare i visningsläge
  if (!editing) {
    return (
      <div className="flex items-start gap-3 flex-wrap">
        {savedUrl ? (
          <a
            href={savedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all flex-1"
          >
            {savedUrl}
          </a>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic flex-1">Ingen länk inlagd ännu.</p>
        )}
        <button
          onClick={() => { setUrl(savedUrl ?? ""); setEditing(true); setError(null); }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 transition shrink-0"
        >
          {savedUrl ? "Redigera" : "Lägg till"}
        </button>
      </div>
    );
  }

  // Redigeringsläge
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.atg.se/lag/..."
          autoFocus
          className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-2 rounded-lg transition"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          {loading ? "Sparar…" : "Spara"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  );
}
