"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "running" | "done" | "error";

/**
 * Adminknapp som räknar om lagrad Composite Score för alla omgångar med de
 * aktuella vikterna (samma som npm run recompute-formscore, men körbar från
 * mobilen). Idempotent — säker att köra om.
 */
export function RecomputeFormscoreButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleRecompute() {
    if (status === "running") return;
    if (!confirm("Räkna om Composite Score för alla omgångar med aktuella vikter?")) return;
    setStatus("running");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/recompute-formscore", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setStatus("done");
      setMessage(`${data.updated} starter uppdaterade i ${data.races} avdelningar.`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nätverksfel");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRecompute}
        disabled={status === "running"}
        className="self-start text-sm font-medium rounded-lg transition disabled:opacity-50"
        style={{
          padding: "8px 16px",
          background: "var(--tn-bg-chip)",
          border: "1px solid var(--tn-border)",
          color: "var(--tn-text-dim)",
          cursor: "pointer",
        }}
      >
        {status === "running" ? "Räknar om…" : "Räkna om alla CS-poäng"}
      </button>
      {message && (
        <p
          className="text-xs"
          style={{ color: status === "error" ? "var(--tn-value-low)" : "var(--tn-value-high)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
