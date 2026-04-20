"use client";

import { useState } from "react";

export function CollapsibleControls({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden w-full flex items-center justify-between py-1 text-xs transition-colors"
        style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
        aria-expanded={open}
        aria-label={open ? "Dölj spelkontroller" : "Visa spelkontroller"}
      >
        <span className="tn-mono" style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
          {open ? "Dölj kontroller" : "Spelkontroller"}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
