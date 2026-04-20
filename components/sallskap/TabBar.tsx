"use client";

export type SallskapTab = "forum" | "anteckningar" | "spel" | "sallskap";

const TABS: { key: SallskapTab; label: string }[] = [
  { key: "forum", label: "Forum" },
  { key: "anteckningar", label: "Anteckn." },
  { key: "spel", label: "Spel" },
  { key: "sallskap", label: "Sällskap" },
];

interface TabBarProps {
  activeTab: SallskapTab;
  onChange: (tab: SallskapTab) => void;
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div
      className="sticky top-0 z-20"
      style={{ background: "var(--tn-bg)", borderBottom: "1px solid var(--tn-border)" }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex-1 py-3 text-sm font-medium transition"
              style={{
                borderBottom: isActive ? "2px solid var(--tn-accent)" : "2px solid transparent",
                color: isActive ? "var(--tn-accent)" : "var(--tn-text-faint)",
                background: "none",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
