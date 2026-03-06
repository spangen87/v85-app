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
      className={`text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 transition ${mono ? "font-mono tracking-widest" : ""}`}
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
      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 transition"
      title="Kopiera inbjudningslänk"
    >
      Kopiera länk {copied ? "✓" : "🔗"}
    </button>
  );
}

export function InviteLinkSection({ inviteCode }: { inviteCode: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">Kod:</span>
        <CopyButton text={inviteCode} label="inbjudningskod" mono />
      </div>
      <CopyLinkButton inviteCode={inviteCode} />
      <p className="text-xs text-gray-400 dark:text-gray-500 w-full">
        Dela koden eller länken med dina vänner så kan de gå med i sällskapet.
      </p>
    </div>
  );
}
