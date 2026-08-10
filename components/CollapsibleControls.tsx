"use client";

import { useEffect, useState } from "react";
import { OPEN_GAME_PICKER_EVENT } from "@/lib/uiEvents";

export function CollapsibleControls({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  /** Fälls ut direkt — används när ingen omgång är vald och användaren måste hämta en */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Startsidans tomma läge (och andra genvägar) kan be om att kontrollerna
  // fälls ut, annars går spelväljaren inte att nå på mobil
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GAME_PICKER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GAME_PICKER_EVENT, onOpen);
  }, []);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden w-full flex items-center justify-between py-2 text-xs rounded-lg transition-colors"
        style={{
          color: open ? "var(--tn-text-dim)" : "var(--tn-accent)",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
        aria-expanded={open}
      >
        <span className="tn-mono" style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11 }}>
          {open ? "Dölj spelkontroller" : "Byt eller hämta omgång"}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className={`${open ? "flex" : "hidden"} md:flex items-center gap-2 flex-wrap pt-1`}>
        {children}
      </div>
    </div>
  );
}
