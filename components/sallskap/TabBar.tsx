"use client";

export type SallskapTab = "forum" | "anteckningar" | "sallskap";

const TABS: { key: SallskapTab; label: string }[] = [
  { key: "forum", label: "Forum" },
  { key: "anteckningar", label: "Anteckningar" },
  { key: "sallskap", label: "Sällskap" },
];

interface TabBarProps {
  activeTab: SallskapTab;
  onChange: (tab: SallskapTab) => void;
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="flex">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
