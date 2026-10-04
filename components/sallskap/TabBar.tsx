"use client";

import { useRef, type KeyboardEvent } from "react";

export type SallskapTab = "forum" | "anteckningar" | "spel" | "sallskap";

export const SALLSKAP_TABS: { key: SallskapTab; label: string }[] = [
  { key: "forum", label: "Forum" },
  { key: "anteckningar", label: "Anteckningar" },
  { key: "spel", label: "Spel" },
  { key: "sallskap", label: "Sällskapet" },
];

export const tabId = (key: SallskapTab) => `sallskap-tab-${key}`;
export const panelId = (key: SallskapTab) => `sallskap-panel-${key}`;

/** Sällskapets flikar. Tab når bara aktiv flik; pilar, Home och End byter. */
export function TabBar({ activeTab, onChange }: { activeTab: SallskapTab; onChange: (tab: SallskapTab) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SALLSKAP_TABS.findIndex((t) => t.key === activeTab);
    const n = SALLSKAP_TABS.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next == null) return;
    e.preventDefault();
    onChange(SALLSKAP_TABS[next].key);
    bar.current?.querySelector<HTMLElement>(`#${tabId(SALLSKAP_TABS[next].key)}`)?.focus();
  };
  return (
    <div ref={bar} className="ta-tabs ta-tabs-text" role="tablist" aria-label="Sällskapets delar" onKeyDown={onKey}>
      {SALLSKAP_TABS.map((tab) => (
        <button
          key={tab.key}
          id={tabId(tab.key)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={panelId(tab.key)}
          tabIndex={activeTab === tab.key ? 0 : -1}
          className="ta-tab"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
