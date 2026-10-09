"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button, HorseList, HorseRow, RaceTabs } from "@/components/ui";
import { RaceToolbar, type RaceView } from "./RaceToolbar";
import { StartCountdown } from "./StartCountdown";
import { HorseDetail } from "./HorseDetail";
import { RaceTable } from "./RaceTable";
import { topReasons } from "@/lib/fundamental";
import { fmtClock, fmtStartMethod } from "@/lib/format";
import { usePref } from "@/lib/usePref";
import {
  activeFilterCount, ALL_RACES, buildRowModels, computeRaceMaps, EMPTY_FILTERS, filterRows, parseHastParam, QUICK_FILTERS,
  quickFilterCounts, raceLacksMarket, raceTabsInfo, ROUND_LIST_CAP, SORT_KEYS, SORT_LABELS, sortRows, toggleQuickFilter,
  type Filters, type RaceMaps, type RowModel,
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
  const [detail, setDetail] = useState<{ race: number; n: number } | null>(
    initialDetail != null ? { race: activeRaceNumber, n: initialDetail } : null
  );
  const [showAllRows, setShowAllRows] = useState(false);
  const panelId = useId();
  // Fliken "Alla": hela omgångens hästar i en lista
  const isAll = activeRaceNumber === ALL_RACES && races.length > 1;

  // Bakåtknappen: ?hast= styr om detaljvyn är öppen (i "Alla" stannar man kvar där)
  useEffect(() => {
    const onPop = () => {
      const hit = parseHastParam(new URLSearchParams(window.location.search).get("hast"), races);
      if (hit && !isAll) onSelectRace(hit.race);
      setDetail(hit ? { race: hit.race, n: hit.start } : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [races, onSelectRace, isAll]);

  const closeDetail = useCallback(() => {
    if (window.history.state?.hast) { window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete("hast");
    window.history.replaceState(window.history.state, "", url);
    setDetail(null);
  }, []);

  const race = isAll ? null : races.find((r) => r.race_number === activeRaceNumber) ?? races[0];
  // Fältrelativa mått per avdelning — räknas en gång per omgång, så flikbyten är gratis
  const mapsByRace = useMemo(() => new Map<number, RaceMaps>(races.map((r) => [r.race_number, computeRaceMaps(r)])), [races]);
  const selectedByRace = useMemo(() => new Map<number, Set<number>>(
    systemSelections.map((s) => [s.race_number, new Set(s.horses.map((h) => h.start_number))])
  ), [systemSelections]);
  const rowsFor = useCallback(
    (r: Race) => buildRowModels(r, mapsByRace.get(r.race_number)!, selectedByRace.get(r.race_number) ?? new Set()),
    [mapsByRace, selectedByRace],
  );
  const allRows = useMemo(() => (isAll ? races.flatMap(rowsFor) : race ? rowsFor(race) : []), [isAll, races, race, rowsFor]);
  const rows = sortRows(filterRows(allRows, filters), sort);
  // Utan filter visar "Alla" topplistan; resten bakom "Visa alla"
  const canExpand = isAll && activeFilterCount(filters) === 0 && rows.length > ROUND_LIST_CAP;
  const capped = canExpand && !showAllRows;
  const shownRows = capped ? rows.slice(0, ROUND_LIST_CAP) : rows;

  if (!isAll && !race) return null;

  const toggle = (r: RowModel) =>
    onToggleHorse(r.raceNumber, { horse_id: r.starter.horse_id, start_number: r.n, horse_name: r.name });
  const onToggle = (r: RowModel) => (canSelect && r.selectable ? () => toggle(r) : undefined);
  const openDetail = (r: RowModel) => {
    const url = new URL(window.location.href);
    url.searchParams.set("hast", `${r.raceNumber}-${r.n}`);
    window.history.pushState({ ...window.history.state, hast: true }, "", url);
    setDetail({ race: r.raceNumber, n: r.n });
  };
  const detailRace = detail ? races.find((r) => r.race_number === detail.race) ?? null : null;
  const detailMaps = detailRace ? mapsByRace.get(detailRace.race_number) ?? null : null;
  const detailRow = detail && detailRace ? rowsFor(detailRace).find((r) => r.n === detail.n) ?? null : null;
  const counts = isAll ? quickFilterCounts(allRows) : null;
  const firstStart = races.find((r) => r.start_time)?.start_time ?? null;

  return (
    <div className="flex flex-col gap-3">
      <RaceTabs races={raceTabsInfo(races, systemSelections)} active={isAll ? ALL_RACES : race!.race_number} onSelect={onSelectRace}
        panelId={panelId} allTab={races.length > 1} />

      <div role="tabpanel" id={panelId} aria-labelledby={`${panelId}-tab-${isAll ? ALL_RACES : race!.race_number}`} className="flex flex-col gap-3">

      {isAll ? (
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ta-section-title">Hela omgången</h2>
          <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
            {`${races.length} avdelningar · ${allRows.filter((r) => !r.scratched).length} hästar`}
          </p>
        </div>
        {firstStart && (
          <span style={{ font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
            {`Första start ${fmtClock(firstStart)}`}
          </span>
        )}
      </div>
      ) : race && (
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
      )}

      <RaceToolbar view={view} onView={setView} sort={sort} onSort={setSort} filters={filters} onFilters={setFilters} />

      {counts && (
        <div role="group" aria-label="Visa bara" className="flex items-center gap-2 flex-wrap">
          {QUICK_FILTERS.map((q) => (
            <button key={q.key} type="button" className="ta-chip" aria-pressed={filters[q.key]}
              onClick={() => setFilters(toggleQuickFilter(filters, q.key))}>
              {q.label} <span className="ta-chip-count">{counts[q.key]}</span>
            </button>
          ))}
        </div>
      )}

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
          {shownRows.map((r) => (
            <HorseRow
              key={`${r.raceNumber}-${r.n}`}
              race={isAll ? r.raceNumber : undefined}
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
              onOpen={() => openDetail(r)}
              noteCount={noteCounts[r.starter.horse_id] ?? 0}
            />
          ))}
        </HorseList>
      ) : (
        <RaceTable races={isAll ? races : [race!]} rows={shownRows} trackConfig={trackConfig} canSelect={canSelect}
          onToggle={toggle} onOpen={openDetail} showRace={isAll} />
      )}

      {canExpand && (
        <Button variant="quiet" onClick={() => setShowAllRows((v) => !v)} style={{ width: "100%" }}>
          {capped ? `Visa alla ${rows.length} hästar` : "Visa färre"}
        </Button>
      )}
      </div>

      {detailRow && detailRace && detailMaps && (
        <HorseDetail
          key={`${detailRace.race_number}-${detailRow.n}`}
          race={detailRace}
          row={detailRow}
          backLabel={isAll ? "Hela omgången" : undefined}
          reasons={detailMaps.fundamental[detailRow.n] ? topReasons(detailMaps.fundamental[detailRow.n]) : []}
          signals={detailMaps.edge[detailRow.n]?.signals ?? []}
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
