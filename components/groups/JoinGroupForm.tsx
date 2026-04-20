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
    if (error) { setError(error); }
    else if (data) { setCode(""); onJoined(data); }
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
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none tn-mono"
          style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)", letterSpacing: "0.1em" }}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          style={{ background: "var(--tn-accent-faint)", border: "1px solid var(--tn-accent-soft)", color: "var(--tn-accent)", cursor: "pointer" }}
        >
          {loading ? "Går med…" : "Gå med"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </form>
  );
}
