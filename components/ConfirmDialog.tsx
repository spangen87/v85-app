"use client";

import { Button, Sheet } from "@/components/ui";

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
 * Bekräftelse för åtgärder som inte går att ångra (ta bort, lämna sällskap,
 * kasta en påbörjad kupong). Bygger på Sheet: Esc och klick utanför avbryter,
 * Tab stannar i dialogen och fokus går tillbaka när den stängs.
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
  return (
    <Sheet
      open={open}
      onClose={() => { if (!busy) onCancel(); }}
      title={title}
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant="primary" className={danger ? "ta-btn-danger" : undefined} onClick={onConfirm} disabled={busy}>
            {busy ? "Vänta …" : confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="ta-sheet-text">{description}</p>}
    </Sheet>
  );
}
