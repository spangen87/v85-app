"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  /** Rubrik, t.ex. "Ta bort anteckningen?" */
  title: string;
  /** Förklarande text om vad som händer — särskilt om det inte går att ångra */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = röd bekräftelseknapp (borttagning och annat oåterkalleligt) */
  danger?: boolean;
  /** Visas medan åtgärden pågår — knapparna låses */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bekräftelsedialog för åtgärder som inte går att ångra (ta bort anteckning,
 * lämna sällskap, kasta en påbörjad kupong). Stängs med Escape eller klick
 * utanför, och fokus flyttas till Avbryt så att ett extra Enter-tryck inte
 * råkar utföra åtgärden.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ja, fortsätt",
  cancelLabel = "Avbryt",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmColor = danger ? "var(--tn-value-low)" : "var(--tn-accent)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
        style={{
          background: "var(--tn-bg-raised)",
          border: "1px solid var(--tn-border)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-bold mb-1.5" style={{ color: "var(--tn-text)" }}>
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-desc" className="text-sm leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            {description}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: "var(--tn-bg-chip)",
              color: "var(--tn-text-dim)",
              border: "1px solid var(--tn-border)",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            style={{ background: confirmColor, color: "#fff", border: "none", cursor: "pointer" }}
          >
            {busy ? "Vänta…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
