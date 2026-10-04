"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

function CopyButton({ text, label }: { text: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return <Button size="sm" onClick={handleCopy}>{copied ? "Kopierat" : label}</Button>;
}

export function InviteLinkSection({ inviteCode }: { inviteCode: string }) {
  return (
    <div className="ta-card ta-card-pad flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="ta-field-label">Inbjudningskod</span>
        <span style={{ font: "600 17px/22px var(--font-sans)", letterSpacing: "0.08em", color: "var(--ink)" }}>{inviteCode}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <CopyButton text={() => inviteCode} label="Kopiera kod" />
        <CopyButton text={() => `${window.location.origin}/join/${inviteCode}`} label="Kopiera länk" />
      </div>
      <p className="ta-text-sm">Dela koden eller länken med dina vänner så kan de gå med i sällskapet.</p>
    </div>
  );
}
