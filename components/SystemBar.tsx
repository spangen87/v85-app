"use client";

import type { SystemSummary } from "@/lib/systemSummary";

/** Fältet ovanför menyn på mobil. Inverterade färger så att det syns i båda teman. */
export function SystemBar({ summary, draftStatus, onOpen }: {
  summary: SystemSummary;
  draftStatus: "idle" | "saving" | "saved" | "error";
  onOpen: () => void;
}) {
  return (
    <div className="fixed left-3 right-3 z-50 md:hidden flex items-center gap-3"
      style={{ bottom: "calc(66px + max(16px, env(safe-area-inset-bottom)))", padding: "10px 10px 10px 16px",
        background: "var(--ink)", color: "var(--bg)", borderRadius: "var(--radius-lg)" }}>
      <div className="flex-1 min-w-0 flex flex-col">
        <span style={{ font: "600 15px/20px var(--font-sans)" }}>{`Ditt system · ${summary.headline}`}</span>
        <span style={{ font: "400 12px/16px var(--font-sans)", opacity: 0.85 }}>
          {draftStatus === "error" ? "Kunde inte spara utkastet" : summary.hint}
        </span>
      </div>
      <button type="button" onClick={onOpen}
        style={{ height: 36, padding: "0 14px", borderRadius: "var(--radius-md)", background: "var(--bg)", color: "var(--ink)",
          border: 0, font: "500 14px/20px var(--font-sans)", cursor: "pointer" }}>
        Visa
      </button>
    </div>
  );
}
