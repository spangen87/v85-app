"use client";

import { useState } from "react";
import { leaveGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

function CopyButton({ text, label, mono }: { text: string; label: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className={`text-xs transition ${mono ? "tn-mono" : ""}`}
      style={{ color: "var(--tn-accent)", background: "none", border: "none", cursor: "pointer" }}
      title={`Kopiera ${label}`}
    >
      {mono ? text : label} {copied ? "✓" : "⎘"}
    </button>
  );
}

function CopyLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    const url = `${window.location.origin}/join/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs transition"
      style={{ color: "var(--tn-accent)", background: "none", border: "none", cursor: "pointer" }}
      title="Kopiera inbjudningslänk"
    >
      Kopiera länk {copied ? "✓" : "🔗"}
    </button>
  );
}

export function GroupList({ groups, onLeft }: { groups: Group[]; onLeft: (groupId: string) => void }) {
  const [leaving, setLeaving] = useState<string | null>(null);

  async function handleLeave(groupId: string) {
    setLeaving(groupId);
    await leaveGroup(groupId);
    setLeaving(null);
    onLeft(groupId);
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--tn-text-faint)" }}>
        Du tillhör inga sällskap ännu. Skapa ett eller gå med via en inbjudningskod.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
          style={{ background: "var(--tn-bg-chip)" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--tn-text)" }}>{g.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Kod:</span>
                <CopyButton text={g.invite_code} label="inbjudningskod" mono />
              </div>
              <CopyLinkButton inviteCode={g.invite_code} />
            </div>
          </div>
          <button
            onClick={() => handleLeave(g.id)}
            disabled={leaving === g.id}
            className="text-xs disabled:opacity-50 transition shrink-0"
            style={{ color: "var(--tn-value-low)", background: "none", border: "none", cursor: "pointer" }}
          >
            {leaving === g.id ? "Lämnar…" : "Lämna"}
          </button>
        </li>
      ))}
    </ul>
  );
}
