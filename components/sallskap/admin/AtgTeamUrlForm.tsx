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
    if (error) { setError(error); }
    else { setSavedUrl(trimmed); onUpdated(trimmed); setEditing(false); }
  }

  if (!isCreator) {
    if (!savedUrl) return <p className="text-sm italic" style={{ color: "var(--tn-text-faint)" }}>Ingen ATG-lagslänk inlagd ännu.</p>;
    return (
      <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline break-all" style={{ color: "var(--tn-accent)" }}>
        {savedUrl}
      </a>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-3 flex-wrap">
        {savedUrl ? (
          <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline break-all flex-1" style={{ color: "var(--tn-accent)" }}>
            {savedUrl}
          </a>
        ) : (
          <p className="text-sm italic flex-1" style={{ color: "var(--tn-text-faint)" }}>Ingen länk inlagd ännu.</p>
        )}
        <button
          onClick={() => { setUrl(savedUrl ?? ""); setEditing(true); setError(null); }}
          className="text-xs transition shrink-0"
          style={{ color: "var(--tn-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          {savedUrl ? "Redigera" : "Lägg till"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.atg.se/lag/..."
          autoFocus
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
        />
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="text-xs px-3 py-2 rounded-lg transition"
          style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {loading ? "Sparar…" : "Spara"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </form>
  );
}
