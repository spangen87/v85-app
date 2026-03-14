"use client";

import { useState } from "react";

export function CollapsibleControls({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      {/* Toggle-knapp – bara synlig på mobil */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden w-full flex items-center justify-between py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        aria-expanded={open}
        aria-label={open ? "Dölj spelkontroller" : "Visa spelkontroller"}
      >
        <span className="font-medium">{open ? "Dölj kontroller" : "Spelkontroller"}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Kontroller – alltid synliga på desktop, expanderbara på mobil */}
      <div
        className={`${
          open ? "flex" : "hidden"
        } md:flex items-center gap-2 flex-wrap pt-1`}
      >
        {children}
      </div>
    </div>
  );
}
