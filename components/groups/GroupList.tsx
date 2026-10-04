"use client";

import { useState } from "react";
import Link from "next/link";
import { leaveGroup } from "@/lib/actions/groups";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge, Button } from "@/components/ui";
import type { Group } from "@/lib/types";

function CopyButton({ text, label }: { text: () => string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text());
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }
  return <Button size="sm" variant="quiet" onClick={handleCopy}>{state === "copied" ? "Kopierat" : state === "failed" ? "Gick inte att kopiera" : label}</Button>;
}

export function GroupList({
  groups,
  onLeft,
  unseenByGroup = {},
}: {
  groups: Group[];
  onLeft: (groupId: string) => void;
  /** Osedda händelser per sällskap — visas som badge bredvid namnet */
  unseenByGroup?: Record<string, number>;
}) {
  const [leaving, setLeaving] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave(groupId: string) {
    setLeaving(groupId);
    setError(null);
    const { error } = await leaveGroup(groupId);
    setLeaving(null);
    if (error) {
      // Sällskapet ligger kvar i listan om servern nekade
      setError("Kunde inte lämna sällskapet. Försök igen.");
      setConfirmLeave(null);
      return;
    }
    setConfirmLeave(null);
    onLeft(groupId);
  }

  if (groups.length === 0) {
    return <p className="ta-text">Du tillhör inga sällskap ännu. Skapa ett eller gå med via en inbjudningskod.</p>;
  }

  return (
    <>
    {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}
    <ul className="ta-card ta-divided" style={{ listStyle: "none", margin: 0, padding: 0, overflow: "hidden" }}>
      {groups.map((g) => (
        <li key={g.id} className="flex flex-col gap-1" style={{ padding: "var(--space-3) var(--space-4)" }}>
          <div className="flex items-center gap-2">
            <Link href={`/sallskap/${g.id}`} className="ta-link flex-1 min-w-0 truncate" style={{ fontSize: 15 }}>{g.name}</Link>
            {(unseenByGroup[g.id] ?? 0) > 0 && <Badge tone="accent">{`${unseenByGroup[g.id]} nya`}</Badge>}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="ta-text-sm">{`Kod ${g.invite_code}`}</span>
            <CopyButton text={() => g.invite_code} label="Kopiera kod" />
            <CopyButton text={() => `${window.location.origin}/join/${g.invite_code}`} label="Kopiera länk" />
            <Button size="sm" variant="quiet" onClick={() => setConfirmLeave(g)} disabled={leaving === g.id}>
              {leaving === g.id ? "Lämnar …" : "Lämna"}
            </Button>
          </div>
        </li>
      ))}
    </ul>

    <ConfirmDialog
      open={confirmLeave !== null}
      title={`Lämna ${confirmLeave?.name ?? "sällskapet"}?`}
      description="Du förlorar åtkomst till sällskapets forum, anteckningar och system. För att komma tillbaka behöver du en ny inbjudningskod."
      confirmLabel="Lämna sällskapet"
      danger
      busy={leaving !== null}
      onConfirm={() => { if (confirmLeave) handleLeave(confirmLeave.id); }}
      onCancel={() => setConfirmLeave(null)}
    />
    </>
  );
}
