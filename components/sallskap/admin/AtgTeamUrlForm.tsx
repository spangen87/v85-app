"use client";

import { useState } from "react";
import { updateGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui";

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

  const link = savedUrl
    ? <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="ta-link" style={{ wordBreak: "break-all" }}>{savedUrl}</a>
    : <p className="ta-text">Ingen länk inlagd ännu.</p>;

  if (!isCreator) return link;

  if (!editing) {
    return (
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">{link}</div>
        <Button size="sm" onClick={() => { setUrl(savedUrl ?? ""); setEditing(true); setError(null); }}>
          {savedUrl ? "Ändra" : "Lägg till"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ta-stack">
      <label className="ta-field-label" htmlFor="atg-lag">Länk till laget</label>
      <input id="atg-lag" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.atg.se/lag/…"
        autoFocus className="ta-field" style={{ height: 44 }} />
      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="quiet" onClick={() => { setEditing(false); setError(null); }}>Avbryt</Button>
        <Button type="submit" disabled={loading}>{loading ? "Sparar …" : "Spara"}</Button>
      </div>
    </form>
  );
}
