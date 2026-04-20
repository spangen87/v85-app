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
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ditt visningsnamn"
        maxLength={40}
        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
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
      {message && (
        <span className="text-xs self-center w-full" style={{ color: "var(--tn-text-faint)" }}>{message}</span>
      )}
    </form>
  );
}
