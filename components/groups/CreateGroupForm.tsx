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
    if (error) { setError(error); }
    else if (data) { setName(""); onCreated(data); }
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
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {loading ? "Skapar…" : "Skapa"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
    </form>
  );
}
