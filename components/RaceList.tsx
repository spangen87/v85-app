"use client";

import { useState, useEffect } from "react";
import { HorseCard } from "./HorseCard";
import { AnalysisPanel } from "./AnalysisPanel";
import { HorseNotes } from "./notes/HorseNotes";
import { TopFiveRanking } from "./TopFiveRanking";
import type { Group, SystemSelection, SystemHorse, TrackConfig } from "@/lib/types";

interface LifeRecord {
  start_method: string;
  distance: string;
  place: number;
  time: string;
}

type SortKey = "number" | "odds" | "bet" | "composite";

interface Starter {
  id: string;
  start_number: number;
  post_position: number | null;
  horse_id: string;
  driver: string;
  driver_win_pct: number | null;
  trainer: string;
  trainer_win_pct: number | null;
  odds: number | null;
  p_odds: number | null;
  bet_distribution: number | null;
  shoes_reported: boolean | null;
  shoes_front: boolean | null;
  shoes_back: boolean | null;
  shoes_front_changed: boolean | null;
  shoes_back_changed: boolean | null;
  sulky_type: string | null;
  horse_age: number | null;
  horse_sex: string | null;
  horse_color: string | null;
  pedigree_father: string | null;
  home_track: string | null;
  starts_total: number | null;
  wins_total: number | null;
  places_2nd: number | null;
  places_3rd: number | null;
  earnings_total: number | null;
  starts_current_year: number | null;
  wins_current_year: number | null;
  places_2nd_current_year: number | null;
  places_3rd_current_year: number | null;
  starts_prev_year: number | null;
  wins_prev_year: number | null;
  places_2nd_prev_year: number | null;
  places_3rd_prev_year: number | null;
  best_time: string | null;
  last_5_results: { place: string; date: string; track: string; time: string }[];
  life_records: LifeRecord[] | null;
  formscore: number | null;
  finish_position: number | null;
  finish_time: string | null;
  horses: { name: string } | null;
}

interface Race {
  id: string;
  race_number: number;
  race_name: string | null;
  distance: number;
  start_method: string | null;
  start_time: string | null;
  starters: Starter[];
}

export function RaceList({
  races,
  activeRaceNumber,
  userGroups,
  currentUserId,
  systemMode,
  systemSelections,
  onToggleHorse,
  onHorseClick,
  trackConfig,
}: {
  races: Race[];
  activeRaceNumber: number;
  userGroups: Group[];
  currentUserId: string;
  systemMode?: boolean;
  systemSelections?: SystemSelection[];
  onToggleHorse?: (raceNumber: number, horse: SystemHorse) => void;
  onHorseClick?: (raceNumber: number, startNumber: number) => void;
  trackConfig?: TrackConfig | null;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [filterValue, setFilterValue] = useState(false);
  const [hideOutsiders, setHideOutsiders] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setShowAnalysis(false);
  }, [activeRaceNumber]);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "composite", label: "CS — Composite Score" },
    { key: "number", label: "Startnummer" },
    { key: "odds", label: "Odds (lägst)" },
    { key: "bet", label: "Streck% (högst)" },
  ];

  const activeRace = races.find((r) => r.race_number === activeRaceNumber) ?? races[0];

  function sortStarters(starters: Starter[], compositeMap: Record<number, number>): Starter[] {
    return [...starters].sort((a, b) => {
      switch (sortKey) {
        case "number": return a.start_number - b.start_number;
        case "odds":
          if (a.odds == null && b.odds == null) return 0;
          if (a.odds == null) return 1;
          if (b.odds == null) return -1;
          return a.odds - b.odds;
        case "bet":
          if (a.bet_distribution == null && b.bet_distribution == null) return 0;
          if (a.bet_distribution == null) return 1;
          if (b.bet_distribution == null) return -1;
          return b.bet_distribution - a.bet_distribution;
        case "composite":
          return (compositeMap[b.start_number] ?? 0) - (compositeMap[a.start_number] ?? 0);
        default:
          return (b.formscore ?? 0) - (a.formscore ?? 0);
      }
    });
  }

  if (!activeRace) return null;

  const hasActiveFilter = filterValue || hideOutsiders || search.trim().length > 0;
  const compositeMap = Object.fromEntries(activeRace.starters.map((s) => [s.start_number, s.formscore ?? 0]));
  const totalCS = activeRace.starters.reduce((sum, s) => sum + (s.formscore ?? 0), 0);
  const valueMap = Object.fromEntries(
    activeRace.starters.map((s) => {
      const cs = s.formscore ?? 0;
      const calcPct = totalCS > 0 ? (cs / totalCS) * 100 : 0;
      const streckPct = s.bet_distribution ?? 0;
      return [s.start_number, cs > 55 && streckPct > 0 && calcPct > streckPct];
    })
  );

  const q = search.trim().toLowerCase();
  const filtered = activeRace.starters
    .filter((s) => !filterValue || valueMap[s.start_number])
    .filter((s) => !hideOutsiders || s.odds == null || s.odds <= 50)
    .filter((s) => {
      if (!q) return true;
      return (s.horses?.name ?? "").toLowerCase().includes(q) || s.driver.toLowerCase().includes(q) || s.trainer.toLowerCase().includes(q);
    });

  const sorted = sortStarters(filtered, compositeMap);
  const raceSelections = systemSelections?.find((s) => s.race_number === activeRace.race_number);
  const startTimeStr = activeRace.start_time
    ? new Date(activeRace.start_time).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" })
    : null;

  const chipBase: React.CSSProperties = {
    background: "var(--tn-bg-chip)",
    border: "1px solid var(--tn-border)",
    color: "var(--tn-text-dim)",
    borderRadius: 8,
    fontSize: 12,
    padding: "5px 10px",
    cursor: "pointer",
    transition: "background 0.15s",
    fontFamily: "var(--font-geist-sans)",
  };

  return (
    <div className="space-y-3">
      <TopFiveRanking races={races} onHorseClick={onHorseClick} />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-xs rounded-lg outline-none cursor-pointer"
          style={{ ...chipBase, minWidth: 0 }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={() => setFilterValue((v) => !v)}
          className="text-xs font-medium transition-colors"
          style={{
            ...chipBase,
            background: filterValue ? "var(--tn-value-high-bg)" : "var(--tn-bg-chip)",
            color: filterValue ? "var(--tn-value-high)" : "var(--tn-text-dim)",
            border: filterValue ? "1px solid transparent" : "1px solid var(--tn-border)",
          }}
        >
          Värde
        </button>

        <button
          onClick={() => setHideOutsiders((v) => !v)}
          className="text-xs font-medium transition-colors"
          style={{
            ...chipBase,
            background: hideOutsiders ? "var(--tn-accent-faint)" : "var(--tn-bg-chip)",
            color: hideOutsiders ? "var(--tn-accent)" : "var(--tn-text-dim)",
            border: hideOutsiders ? "1px solid transparent" : "1px solid var(--tn-border)",
          }}
        >
          Dölj &gt;50x
        </button>

        {hasActiveFilter && (
          <button
            onClick={() => { setFilterValue(false); setHideOutsiders(false); setSearch(""); }}
            className="text-xs transition-colors"
            style={{ color: "var(--tn-text-faint)", background: "none", border: "none", cursor: "pointer" }}
          >
            Rensa ✕
          </button>
        )}

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sök häst, kusk…"
          className="text-xs rounded-lg outline-none w-full sm:w-44 ml-auto"
          style={{
            ...chipBase,
            color: "var(--tn-text)",
          }}
        />
      </div>

      {/* Race info + analysis toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs truncate" style={{ color: "var(--tn-text-faint)" }}>
          {activeRace.race_name ?? `Avdelning ${activeRace.race_number}`}
          {startTimeStr && <span className="ml-2">{startTimeStr}</span>}
          <span className="ml-2">{activeRace.distance} m</span>
          {activeRace.start_method && <span className="ml-2 capitalize">{activeRace.start_method}</span>}
        </span>
        <button
          onClick={() => setShowAnalysis((v) => !v)}
          className="ml-3 shrink-0 text-xs font-medium transition-colors"
          style={{
            ...chipBase,
            background: showAnalysis ? "var(--tn-accent-faint)" : "transparent",
            color: showAnalysis ? "var(--tn-accent)" : "var(--tn-accent)",
            border: "1px solid var(--tn-accent-soft)",
          }}
        >
          {showAnalysis ? "Dölj analys" : "Visa analys"}
        </button>
      </div>

      {showAnalysis && (
        <AnalysisPanel
          starters={sorted}
          raceMeters={activeRace.distance}
          raceStartMethod={activeRace.start_method ?? "auto"}
          trackConfig={trackConfig ?? undefined}
        />
      )}

      {sorted.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--tn-text-faint)" }}>
          Inga hästar matchar filtret.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((s, idx) => (
          <div key={s.id} data-race={activeRace.race_number} data-start={s.start_number}>
            <HorseCard
              starter={s}
              internalRaceId={activeRace.id}
              raceDistance={activeRace.distance}
              raceStartMethod={activeRace.start_method ?? "auto"}
              isValue={valueMap[s.start_number] ?? false}
              sortRank={sortKey !== "number" ? idx + 1 : undefined}
              trackConfig={trackConfig ?? undefined}
              isSelected={systemMode ? (raceSelections?.horses.some((h) => h.horse_id === s.horse_id) ?? false) : undefined}
              onSelect={
                systemMode && onToggleHorse
                  ? () => onToggleHorse(activeRace.race_number, { horse_id: s.horse_id, start_number: s.start_number, horse_name: s.horses?.name ?? "" })
                  : undefined
              }
              notesSection={
                <HorseNotes horseId={s.horse_id} userGroups={userGroups} currentUserId={currentUserId} />
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
