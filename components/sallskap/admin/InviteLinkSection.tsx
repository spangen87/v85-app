"use client";

import { useState } from "react";

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

export function InviteLinkSection({ inviteCode }: { inviteCode: string }) {
  return (
    <div className="rounded-lg px-3 py-3 flex items-center gap-3 flex-wrap" style={{ background: "var(--tn-bg-chip)" }}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Kod:</span>
        <CopyButton text={inviteCode} label="inbjudningskod" mono />
      </div>
      <CopyLinkButton inviteCode={inviteCode} />
      <p className="text-xs w-full" style={{ color: "var(--tn-text-faint)" }}>
        Dela koden eller länken med dina vänner så kan de gå med i sällskapet.
      </p>
    </div>
  );
}
