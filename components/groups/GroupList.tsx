"use client";

import { useState } from "react";
import { leaveGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-indigo-400 hover:text-indigo-300 transition font-mono tracking-widest"
      title="Kopiera inbjudningskod"
    >
      {text} {copied ? "✓" : "⎘"}
    </button>
  );
}

export function GroupList({
  groups,
  onLeft,
}: {
  groups: Group[];
  onLeft: (groupId: string) => void;
}) {
  const [leaving, setLeaving] = useState<string | null>(null);

  async function handleLeave(groupId: string) {
    setLeaving(groupId);
    await leaveGroup(groupId);
    setLeaving(null);
    onLeft(groupId);
  }

  if (groups.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        Du tillhör inga sällskap ännu. Skapa ett eller gå med via en inbjudningskod.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between gap-3 bg-gray-700 rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{g.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-gray-400 text-xs">Kod:</span>
              <CopyButton text={g.invite_code} />
            </div>
          </div>
          <button
            onClick={() => handleLeave(g.id)}
            disabled={leaving === g.id}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition shrink-0"
          >
            {leaving === g.id ? "Lämnar…" : "Lämna"}
          </button>
        </li>
      ))}
    </ul>
  );
}
