"use client";

import { useId, useRef, type ReactNode } from "react";
import { useModalLayer } from "@/lib/modalLayer";
import { createPortal } from "react-dom";
import { cx } from "./cx";

/**
 * Blad nerifrån på mobil, dialog i mitten från md och uppåt. Renderas i en
 * portal så att sticky-huvuden med backdrop-filter inte klipper det.
 */
export function Sheet({ open, onClose, title, children, footer, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useModalLayer(open, onClose, panelRef);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="ta-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("ta-sheet", wide && "ta-sheet-wide")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ta-sheet-handle" aria-hidden="true" />
        <div className="ta-sheet-head">
          <h2 className="ta-sheet-title" id={titleId}>{title}</h2>
        </div>
        {children}
        {footer && <div className="ta-sheet-actions">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
