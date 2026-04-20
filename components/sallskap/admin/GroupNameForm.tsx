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
    if (error) { setMessage(error); }
    else { setMessage("Sparat!"); onUpdated(name.trim()); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sällskapets namn"
        maxLength={60}
        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm outline-none"
        style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
        style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
      >
        {loading ? "Sparar…" : "Spara"}
      </button>
      {message && <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{message}</span>}
    </form>
  );
}
