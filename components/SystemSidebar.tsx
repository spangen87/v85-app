"use client";

import type { SystemSelection, SystemHorse, GameSystem } from "@/lib/types";
import { formatRowCost } from "@/lib/atg";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: {
    horse_id: string;
    start_number: number;
    horses: { name: string } | null;
  }[];
}

interface SystemSidebarProps {
  races: RaceInfo[];
  selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  onSave: () => void;
  onCancel: () => void;
  totalRows: number;
  gameType: string | null;
  draftSaveStatus?: "idle" | "saving" | "saved";
  draftName: string;
  onDraftNameChange: (name: string) => void;
  savedDrafts?: GameSystem[];
  onLoadDraft?: (draft: GameSystem) => void;
}

export function SystemSidebar({
  races,
  selections,
  onToggleHorse,
  onSave,
  onCancel,
  totalRows,
  gameType,
  draftSaveStatus = "idle",
  draftName,
  onDraftNameChange,
  savedDrafts = [],
  onLoadDraft,
}: SystemSidebarProps) {
  function isSelected(raceNumber: number, horseId: string): boolean {
    return selections.find((s) => s.race_number === raceNumber)?.horses.some((h) => h.horse_id === horseId) ?? false;
  }

  const completedRaces = selections.length;

  return (
    <aside
      className="hidden md:flex flex-col fixed right-0 top-[170px] bottom-0 z-40 w-[320px]"
      style={{ background: "var(--tn-bg-raised)", borderLeft: "1px solid var(--tn-border)" }}
    >
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--tn-border)" }}
      >
        <div className="tn-eyebrow mb-1.5">Din kupong</div>
        <input
          type="text"
          value={draftName}
          onChange={(e) => onDraftNameChange(e.target.value)}
          placeholder="Namnge utkast..."
          maxLength={80}
          className="w-full px-2 py-1 text-xs rounded outline-none"
          style={{
            background: "var(--tn-bg-chip)",
            border: "1px solid var(--tn-border)",
            color: "var(--tn-text)",
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {races.map((race) => {
          const sorted = [...race.starters].sort((a, b) => a.start_number - b.start_number);
          return (
            <div key={race.id}>
              <div className="tn-eyebrow mb-1.5">Avd {race.race_number} · {race.distance}m</div>
              <div className="flex flex-wrap gap-1">
                {sorted.map((starter) => {
                  const selected = isSelected(race.race_number, starter.horse_id);
                  return (
                    <button
                      key={starter.horse_id}
                      onClick={() => onToggleHorse(race.race_number, {
                        horse_id: starter.horse_id,
                        start_number: starter.start_number,
                        horse_name: starter.horses?.name ?? "",
                      })}
                      title={starter.horses?.name ?? `Nr ${starter.start_number}`}
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                      style={selected
                        ? { background: "var(--tn-accent)", color: "#fff", outline: "2px solid var(--tn-accent-soft)", outlineOffset: 1 }
                        : { background: "var(--tn-bg-chip)", color: "var(--tn-text-faint)" }
                      }
                    >
                      {starter.start_number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {savedDrafts.length > 0 && (
          <div className="pt-3 mt-2" style={{ borderTop: "1px solid var(--tn-border)" }}>
            <p className="tn-eyebrow mb-2">Mina utkast</p>
            {savedDrafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => onLoadDraft?.(draft)}
                className="w-full text-left px-2 py-1.5 rounded text-xs transition mb-1"
                style={{ color: "var(--tn-text-dim)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <span className="font-semibold" style={{ color: "var(--tn-text)" }}>{draft.name}</span>
                <span className="ml-2" style={{ color: "var(--tn-text-faint)" }}>
                  {draft.total_rows} rader · {new Date(draft.created_at).toLocaleDateString("sv-SE")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: "2px solid var(--tn-accent)" }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-extrabold" style={{ color: "var(--tn-accent)" }}>
            {totalRows} {totalRows === 1 ? "rad" : "rader"}
          </span>
          <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            {completedRaces} av {races.length} avd. klara
          </span>
          {draftSaveStatus === "saving" && (
            <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Sparar utkast...</span>
          )}
          {draftSaveStatus === "saved" && (
            <span className="text-xs" style={{ color: "var(--tn-value-high)" }}>Utkast sparat ✓</span>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={selections.length === 0}
          className="w-full py-2 text-sm font-bold rounded-lg disabled:opacity-40 transition"
          style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Spara system →
        </button>
        <button
          onClick={onCancel}
          className="w-full mt-2 text-xs underline transition"
          style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
        >
          Avbryt systemläge
        </button>
      </div>
    </aside>
  );
}
