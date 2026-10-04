"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, HorseList, HorseRow, RaceTabs } from "@/components/ui";
import { RaceToolbar, type RaceView } from "./RaceToolbar";
import { StartCountdown } from "./StartCountdown";
import { HorseDetail } from "./HorseDetail";
import { RaceTable } from "./RaceTable";
import { topReasons } from "@/lib/fundamental";
import { fmtClock, fmtStartMethod } from "@/lib/format";
import { usePref } from "@/lib/usePref";
import {
  buildRowModels, computeRaceMaps, EMPTY_FILTERS, filterRows, parseHastParam, raceLacksMarket, raceTabsInfo, SORT_KEYS, SORT_LABELS,
  sortRows, type Filters, type RowModel,
} from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { Group, SystemHorse, SystemSelection, TrackConfig } from "@/lib/types";

const VIEWS = ["lista", "tabell"] as const;

export function RaceList({
  races, activeRaceNumber, onSelectRace, userGroups, currentUserId, systemSelections, canSelect, onToggleHorse,
  trackConfig = null, noteCounts = {}, initialDetail = null,
}: {
  races: Race[];
  activeRaceNumber: number;
  onSelectRace: (n: number) => void;
  userGroups: Group[];
  currentUserId: string;
  systemSelections: SystemSelection[];
  canSelect: boolean;
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  trackConfig?: TrackConfig | null;
  noteCounts?: Record<string, number>;
  /** Startnummer att öppna direkt (från ?hast= i länken) */
  initialDetail?: number | null;
}) {
  const [view, setView] = usePref<RaceView>("travappen.view", VIEWS, "lista");
  const [sort, setSort] = usePref("travappen.sort", SORT_KEYS, "chans");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<number | null>(initialDetail);

  // Bakåtknappen: ?hast= styr om detaljvyn är öppen
  useEffect(() => {
    const onPop = () => {
      const hit = parseHastParam(new URLSearchParams(window.location.search).get("hast"), races);
      if (hit) onSelectRace(hit.race);
      setDetail(hit ? hit.start : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [races, onSelectRace]);

  const closeDetail = useCallback(() => {
    if (window.history.state?.hast) { window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete("hast");
    window.history.replaceState(window.history.state, "", url);
    setDetail(null);
  }, []);

  const race = races.find((r) => r.race_number === activeRaceNumber) ?? races[0];
  const selected = useMemo(() => new Set(
    (systemSelections.find((s) => s.race_number === race?.race_number)?.horses ?? []).map((h) => h.start_number)
  ), [systemSelections, race?.race_number]);
  const maps = useMemo(() => (race ? computeRaceMaps(race) : null), [race]);
  const allRows = useMemo(() => (race && maps ? buildRowModels(race, maps, selected) : []), [race, maps, selected]);
  const rows = sortRows(filterRows(allRows, filters), sort);

  if (!race || !maps) return null;

  const toggle = (r: RowModel) =>
    onToggleHorse(race.race_number, { horse_id: r.starter.horse_id, start_number: r.n, horse_name: r.name });
  const onToggle = (r: RowModel) => (canSelect && r.selectable ? () => toggle(r) : undefined);
  const openDetail = (n: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("hast", `${race.race_number}-${n}`);
    window.history.pushState({ ...window.history.state, hast: true }, "", url);
    setDetail(n);
  };
  const detailRow = detail != null ? allRows.find((r) => r.n === detail) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      <RaceTabs races={raceTabsInfo(races, systemSelections)} active={race.race_number} onSelect={onSelectRace} />

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ta-section-title">{`Avdelning ${race.race_number}`}</h2>
          <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
            {[`${race.distance} m`, fmtStartMethod(race.start_method), `${race.starters.length} hästar`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end" style={{ font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>
          {race.start_time && <span>{`Start ${fmtClock(race.start_time)}`}</span>}
          <StartCountdown startTime={race.start_time} />
        </div>
      </div>

      <RaceToolbar view={view} onView={setView} sort={sort} onSort={setSort} filters={filters} onFilters={setFilters} />

      {raceLacksMarket(allRows) && (
        <p className="ta-banner" style={{ margin: 0 }}>Streck och odds saknas än. Hämta om omgången när spelet har öppnat.</p>
      )}

      {rows.length === 0 ? (
        <div className="ta-card flex flex-col items-center gap-3 py-8">
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>Inga hästar matchar filtret.</p>
          <Button onClick={() => setFilters(EMPTY_FILTERS)}>Rensa filter</Button>
        </div>
      ) : view === "lista" ? (
        <HorseList sortLabel={SORT_LABELS[sort]}>
          {rows.map((r) => (
            <HorseRow
              key={r.n}
              number={r.n}
              name={r.name}
              driver={r.driver}
              chans={r.chansPct}
              streck={r.streckPct}
              odds={r.odds}
              form={r.form}
              badge={r.badge}
              signalScore={r.edgeScore}
              valueDelta={r.valueDelta}
              isValue={r.isValue}
              state={r.numberState}
              dimmed={r.scratched}
              onToggleSystem={onToggle(r)}
              onOpen={() => openDetail(r.n)}
              noteCount={noteCounts[r.starter.horse_id] ?? 0}
            />
          ))}
        </HorseList>
      ) : (
        <RaceTable race={race} rows={rows} trackConfig={trackConfig} canSelect={canSelect} onToggle={toggle} onOpen={openDetail} />
      )}

      {detailRow && (
        <HorseDetail
          key={`${race.race_number}-${detailRow.n}`}
          race={race}
          row={detailRow}
          reasons={maps.fundamental[detailRow.n] ? topReasons(maps.fundamental[detailRow.n]) : []}
          signals={maps.edge[detailRow.n]?.signals ?? []}
          trackConfig={trackConfig}
          userGroups={userGroups}
          currentUserId={currentUserId}
          canSelect={canSelect}
          onToggle={() => toggle(detailRow)}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
