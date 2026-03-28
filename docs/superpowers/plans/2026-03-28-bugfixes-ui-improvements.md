# Bugfixar och UI-förbättringar – Implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Åtgärda 8 identifierade buggar och UI-problem: tidszon, hästlayout, Top 5-widget, tabbprestanda, marginaler, navigationsplacering, systemsidebar-position och utkast-UI.

**Architecture:** Åtta oberoende men relaterade förbättringar. Task 1–4 är helt isolerade. Task 5–6 är beroende av varandra (kontextbaserat tabbyte måste komma före scroll-till-häst). Task 7 (TopNav-split) och Task 8 (utkast-UI) är oberoende av övriga.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase

---

## Filöversikt

| Fil | Ändring |
|-----|---------|
| `components/RaceTabBar.tsx` | Tidszon + klient-sida tabbyte via context |
| `components/RaceList.tsx` | Grid → flex-col, data-attribut för scroll |
| `components/TopFiveRanking.tsx` | Tema, bredd, kollaps, klick-callback |
| `components/SystemSidebar.tsx` | top/z-index, utkastnamn-input, utkastlista |
| `components/MainPageClient.tsx` | RaceTabContext, activeRace state, draft-state |
| `components/TopNav.tsx` | Server component med ThemeToggle + UserMenu |
| `components/NavActiveLink.tsx` | **NY** – klient-komponent för aktiv länk |
| `components/RaceTabContext.tsx` | **NY** – React context för aktiv avdelning |
| `app/(authenticated)/page.tsx` | Marginaler, dölj ThemeToggle/UserMenu på desktop |
| `lib/actions/systems.ts` | Ny `getUserDraftsForGame` action |

---

## Task 1: Tidszon

**Files:**
- Modify: `components/RaceTabBar.tsx:26-29`
- Modify: `components/RaceList.tsx:164-167`

Tider visas en timme för sent (UTC istf Europe/Stockholm).

- [ ] **Steg 1.1: Fixa RaceTabBar**

```tsx
// components/RaceTabBar.tsx rad 25-30 – lägg till timeZone
const timeStr = race.start_time
  ? new Date(race.start_time).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    })
  : null;
```

- [ ] **Steg 1.2: Fixa RaceList**

```tsx
// components/RaceList.tsx rad 163-168 – lägg till timeZone
const startTimeStr = activeRace.start_time
  ? new Date(activeRace.start_time).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    })
  : null;
```

- [ ] **Steg 1.3: Verifiera**

Starta dev-server (`npm run dev`), öppna en omgång med kända lopptider och jämför med ATG:s webbplats. Tiderna ska matcha.

- [ ] **Steg 1.4: Commit**

```bash
git add components/RaceTabBar.tsx components/RaceList.tsx
git commit -m "fix: tidszon Europe/Stockholm för lopptider"
```

---

## Task 2: Desktop-marginaler

**Files:**
- Modify: `app/(authenticated)/page.tsx:114`

- [ ] **Steg 2.1: Lägg till responsiva marginaler**

Ändra rad 114 i `app/(authenticated)/page.tsx`:

```tsx
// Från:
<div className="px-4 py-6">

// Till:
<div className="px-4 lg:px-[5%] xl:px-[8%] py-6">
```

Sticky headern på rad 85-107 behålls oförändrad (full bredd).

- [ ] **Steg 2.2: Verifiera**

Öppna appen på en bred skärm (≥1280px). Kontrollera att innehållet har ~8% marginal på vardera sida och att headern fortfarande sträcker sig till kanten.

- [ ] **Steg 2.3: Commit**

```bash
git add app/\(authenticated\)/page.tsx
git commit -m "fix: responsiva marginaler på desktop (5-8%)"
```

---

## Task 3: SystemSidebar position

**Files:**
- Modify: `components/SystemSidebar.tsx:50`

Sidopanelen hamnar bakom sticky-navigationen. TopNav (~51px) + page header (~115px) = ~166px.

- [ ] **Steg 3.1: Justera top-offset och z-index**

Ändra rad 50 i `components/SystemSidebar.tsx`:

```tsx
// Från:
<aside className="hidden md:flex flex-col fixed right-0 top-[120px] bottom-0 z-20 w-[320px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">

// Till:
<aside className="hidden md:flex flex-col fixed right-0 top-[170px] bottom-0 z-40 w-[320px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
```

- [ ] **Steg 3.2: Verifiera**

Aktivera systemläget (klicka "Bygg system"). Verifiera att panelen till höger börjar under både TopNav och page-headern, inte bakom dem.

- [ ] **Steg 3.3: Commit**

```bash
git add components/SystemSidebar.tsx
git commit -m "fix: SystemSidebar top-[170px] z-40 – döljs inte bakom sticky nav"
```

---

## Task 4: Top 5-widget (tema, bredd, kollaps, klick)

**Files:**
- Modify: `components/TopFiveRanking.tsx` (hela)
- Modify: `components/RaceList.tsx` (props till TopFiveRanking)

- [ ] **Steg 4.1: Ersätt TopFiveRanking med ny version**

Ersätt hela innehållet i `components/TopFiveRanking.tsx`:

```tsx
"use client";

import { useState } from "react";
import { analyzeRaceEnhanced } from "@/lib/analysis";
import type { AnalysisStarter } from "@/lib/analysis";

interface RaceForRanking {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: AnalysisStarter[];
}

interface RankedHorse {
  horseName: string;
  startNumber: number;
  raceNumber: number;
  compositeScore: number;
  estimatedWinPct: number;
  odds: number | null;
  isValue: boolean;
  finish_position: number | null;
  finish_time: string | null;
}

interface TopFiveRankingProps {
  races: RaceForRanking[];
  onHorseClick?: (raceNumber: number, startNumber: number) => void;
}

const MEDAL_COLORS = [
  "bg-yellow-500 text-white",
  "bg-gray-400 text-white",
  "bg-amber-700 text-white",
  "bg-indigo-600 text-white",
  "bg-indigo-600 text-white",
];

export function TopFiveRanking({ races, onHorseClick }: TopFiveRankingProps) {
  const [collapsed, setCollapsed] = useState(false);

  const allHorses: RankedHorse[] = [];

  for (const race of races) {
    const analyzed = analyzeRaceEnhanced(race.starters);
    const oddsMap = Object.fromEntries(
      race.starters.map((s) => [s.start_number, s.odds ?? null])
    );
    for (const h of analyzed) {
      allHorses.push({
        horseName: h.horseName,
        startNumber: h.startNumber,
        raceNumber: race.race_number,
        compositeScore: h.compositeScore,
        estimatedWinPct: h.estimatedWinPct,
        odds: oddsMap[h.startNumber] ?? null,
        isValue: h.isValue,
        finish_position: h.finish_position ?? null,
        finish_time: h.finish_time ?? null,
      });
    }
  }

  if (allHorses.length === 0) return null;

  allHorses.sort((a, b) => b.compositeScore - a.compositeScore);
  const top5 = allHorses.slice(0, 5);

  return (
    <div className="mb-6 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl overflow-hidden md:max-w-[45%]">
      {/* Header med kollaps-knapp */}
      <div className="px-5 py-3 border-b border-indigo-200 dark:border-indigo-800/30 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            Top 5 spelvärda hästar
          </h2>
          {!collapsed && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Rankad efter form, konsistens, tid och värde relativt marknaden
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-3 shrink-0 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
          aria-label={collapsed ? "Expandera Top 5" : "Minimera Top 5"}
        >
          {collapsed ? "▼ Visa" : "▲ Dölj"}
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-indigo-200 dark:divide-indigo-900/30">
          {top5.map((horse, i) => (
            <div
              key={`${horse.raceNumber}-${horse.startNumber}`}
              onClick={() => onHorseClick?.(horse.raceNumber, horse.startNumber)}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition ${onHorseClick ? "cursor-pointer" : ""}`}
            >
              {/* Rank badge */}
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDAL_COLORS[i]}`}
              >
                {i + 1}
              </span>

              {/* Horse info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {horse.horseName}
                  </span>
                  {horse.isValue && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Värde
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Avd {horse.raceNumber} &middot; Nr {horse.startNumber}
                  {horse.odds ? ` · Odds ${horse.odds}` : ""}
                </span>
              </div>

              {/* Resultat */}
              {horse.finish_position != null && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                    horse.finish_position === 1
                      ? "bg-yellow-400 text-black"
                      : horse.finish_position === 2
                      ? "bg-gray-300 text-black"
                      : horse.finish_position === 3
                      ? "bg-amber-600 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                  title={`Slutplacering: ${horse.finish_position}`}
                >
                  {horse.finish_position}:a{horse.finish_time ? ` ${horse.finish_time}` : ""}
                </span>
              )}

              {/* Score */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {horse.compositeScore}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  poäng
                </div>
              </div>

              {/* Win pct */}
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {horse.estimatedWinPct}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  vinstchans
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Steg 4.2: Lägg till onHorseClick-prop i RaceList**

I `components/RaceList.tsx`, lägg till `onHorseClick?: (raceNumber: number, startNumber: number) => void` i `RaceListProps`-interfacet och passa den till `<TopFiveRanking>`:

```tsx
// I RaceListProps-interfacet, lägg till:
onHorseClick?: (raceNumber: number, startNumber: number) => void;

// På rad 172, ändra:
<TopFiveRanking races={races} />
// Till:
<TopFiveRanking races={races} onHorseClick={onHorseClick} />
```

- [ ] **Steg 4.3: Verifiera**

1. Ljust tema: Top 5 ska vara läsbar (blå bakgrund, mörk text)
2. Mörkt tema: oförändrat utseende
3. Klicka "▲ Dölj" – listan döljs, bara header visas
4. Klicka "▼ Visa" – listan visas igen
5. Widgeten är max ~45% bred på desktop
6. Värde-badge läsbar i ljust tema

- [ ] **Steg 4.4: Commit**

```bash
git add components/TopFiveRanking.tsx components/RaceList.tsx
git commit -m "feat: Top 5 – tema-fix, bredd, kollaps, klick-callback"
```

---

## Task 5: Hästlista (flex-col istf grid)

**Files:**
- Modify: `components/RaceList.tsx:269-306`

- [ ] **Steg 5.1: Byt grid mot flex-col och lägg till data-attribut**

Ändra hästgrid-sektionen i `components/RaceList.tsx` (rad 268-307):

```tsx
{/* Hästlista: en per rad */}
<div className="flex flex-col gap-2">
  {sorted.map((s, idx) => {
    const enh = enhancedMap[s.start_number];
    return (
      <div
        key={s.id}
        data-race={activeRace.race_number}
        data-start={s.start_number}
      >
        <HorseCard
          starter={s}
          raceDistance={activeRace.distance}
          raceStartMethod={activeRace.start_method ?? "auto"}
          compositeScore={enh?.compositeScore}
          valueIndex={enh?.valueIndex}
          isValue={enh?.isValue}
          sortRank={sortKey !== "number" ? idx + 1 : undefined}
          isSelected={
            systemMode
              ? (raceSelections?.horses.some((h) => h.horse_id === s.horse_id) ?? false)
              : undefined
          }
          onSelect={
            systemMode && onToggleHorse
              ? () =>
                  onToggleHorse(activeRace.race_number, {
                    horse_id: s.horse_id,
                    start_number: s.start_number,
                    horse_name: s.horses?.name ?? "",
                  })
              : undefined
          }
          notesSection={
            <HorseNotes
              horseId={s.horse_id}
              userGroups={userGroups}
              currentUserId={currentUserId}
            />
          }
        />
      </div>
    );
  })}
</div>
```

- [ ] **Steg 5.2: Verifiera**

1. Desktop (≥768px): hästar visas en per rad, full bredd
2. Expandera ett hästkort – ingen tom luft bredvid
3. Mobil: hästar visas en per rad (oförändrat)

- [ ] **Steg 5.3: Commit**

```bash
git add components/RaceList.tsx
git commit -m "fix: hästlista flex-col (ATG-stil) – eliminerar tom luft vid expand"
```

---

## Task 6: Klientside-tabbyte + scroll-till-häst

**Files:**
- Create: `components/RaceTabContext.tsx`
- Modify: `components/RaceTabBar.tsx`
- Modify: `components/MainPageClient.tsx`
- Modify: `components/RaceList.tsx`

**Obs:** Task 5 måste vara klar (data-attributen på wrapper-divarna behövs för scroll).

- [ ] **Steg 6.1: Skapa RaceTabContext**

Skapa ny fil `components/RaceTabContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

interface RaceTabContextValue {
  activeRaceNumber: number;
  setActiveRaceNumber: (n: number) => void;
}

export const RaceTabContext = createContext<RaceTabContextValue | null>(null);

export function useRaceTab(): RaceTabContextValue {
  const ctx = useContext(RaceTabContext);
  if (!ctx) throw new Error("useRaceTab must be used inside RaceTabContext.Provider");
  return ctx;
}
```

- [ ] **Steg 6.2: Uppdatera RaceTabBar att använda context**

Ersätt hela `components/RaceTabBar.tsx`:

```tsx
"use client";

import { useRaceTab } from "@/components/RaceTabContext";

interface RaceTabBarProps {
  races: { race_number: number; start_time: string | null }[];
}

export function RaceTabBar({ races }: RaceTabBarProps) {
  const { activeRaceNumber, setActiveRaceNumber } = useRaceTab();

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-none">
      <div className="flex px-3 gap-0.5 py-1.5 min-w-max">
        {races.map((race) => {
          const isActive = race.race_number === activeRaceNumber;
          const timeStr = race.start_time
            ? new Date(race.start_time).toLocaleTimeString("sv-SE", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Stockholm",
              })
            : null;
          return (
            <button
              key={race.race_number}
              onClick={() => setActiveRaceNumber(race.race_number)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-indigo-700 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              AVD {race.race_number}
              {timeStr && (
                <span className="ml-1 font-normal opacity-70">{timeStr}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Obs:** `RaceTabBar` tar nu inte längre `activeRaceNumber` som prop – den läser det från context. Uppdatera anropet i `app/(authenticated)/page.tsx` (rad 103-105):

```tsx
// Från:
<RaceTabBar
  races={races.map((r) => ({ race_number: r.race_number, start_time: r.start_time }))}
  activeRaceNumber={activeRaceNumber}
/>

// Till:
<RaceTabBar
  races={races.map((r) => ({ race_number: r.race_number, start_time: r.start_time }))}
/>
```

- [ ] **Steg 6.3: Uppdatera MainPageClient med context + activeRace state + scroll-callback**

Ersätt `components/MainPageClient.tsx` med följande (ändrade delar markerade):

```tsx
'use client'

import { useState, useCallback, useEffect, useRef, type ComponentProps } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import { SystemSidebar } from '@/components/SystemSidebar'
import { SystemDrawer } from '@/components/SystemDrawer'
import { RaceTabContext } from '@/components/RaceTabContext'
import type { SystemSelection, SystemHorse, Group } from '@/lib/types'
import { formatRowCost } from '@/lib/atg'
import { createSystem, updateDraft } from '@/lib/actions/systems'

type RaceListRaces = ComponentProps<typeof RaceList>['races']

function computeTotalRows(selections: SystemSelection[]): number {
  if (selections.length === 0) return 0
  return selections.reduce((acc, s) => acc * Math.max(s.horses.length, 1), 1)
}

interface MainPageClientProps {
  races: RaceListRaces
  activeRaceNumber: number
  userGroups: Group[]
  currentUserId: string
  initialSystemMode?: boolean
  initialGroupId?: string | null
  gameId: string | null
  gameType: string | null
  draftId?: string | null
  initialSelections?: SystemSelection[]
}

export function MainPageClient({
  races,
  activeRaceNumber,
  userGroups,
  currentUserId,
  initialSystemMode = false,
  initialGroupId = null,
  gameId,
  gameType,
  draftId = null,
  initialSelections = [],
}: MainPageClientProps) {
  // --- NY: klientside activeRace state ---
  const [activeRace, setActiveRace] = useState(activeRaceNumber)

  const [systemMode, setSystemMode] = useState(initialSystemMode)
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>(initialSelections)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId)
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!systemMode || !gameId) return

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    setDraftSaveStatus('idle')

    draftTimerRef.current = setTimeout(async () => {
      setDraftSaveStatus('saving')
      try {
        const totalRows = computeTotalRows(systemSelections)
        if (activeDraftId) {
          await updateDraft(activeDraftId, systemSelections, totalRows)
        } else {
          const draft = await createSystem(initialGroupId, gameId, 'Utkast', systemSelections, totalRows, true)
          setActiveDraftId(draft.id)
        }
        setDraftSaveStatus('saved')
      } catch {
        setDraftSaveStatus('idle')
      }
    }, 3000)

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSelections, systemMode])

  const handleToggleHorse = useCallback((raceNumber: number, horse: SystemHorse) => {
    setSystemSelections(prev => {
      const existing = prev.find(s => s.race_number === raceNumber)
      if (!existing) {
        return [...prev, { race_number: raceNumber, horses: [horse] }]
      }
      const alreadySelected = existing.horses.some(h => h.horse_id === horse.horse_id)
      if (alreadySelected) {
        const updatedHorses = existing.horses.filter(h => h.horse_id !== horse.horse_id)
        if (updatedHorses.length === 0) {
          return prev.filter(s => s.race_number !== raceNumber)
        }
        return prev.map(s => s.race_number === raceNumber ? { ...s, horses: updatedHorses } : s)
      } else {
        return prev.map(s => s.race_number === raceNumber ? { ...s, horses: [...s.horses, horse] } : s)
      }
    })
  }, [])

  // --- NY: scroll-till-häst från Top 5 ---
  const handleHorseClick = useCallback((raceNumber: number, startNumber: number) => {
    setActiveRace(raceNumber)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-race="${raceNumber}"][data-start="${startNumber}"]`
      )
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const handleActivateSystemMode = useCallback(() => {
    setSystemMode(true)
    setSystemSelections([])
    setActiveDraftId(null)
    setShowDrawer(false)
    isFirstRender.current = true
  }, [])

  const handleCancelSystemMode = useCallback(() => {
    setSystemMode(false)
    setSystemSelections([])
    setActiveDraftId(null)
    setShowDrawer(false)
    setDraftSaveStatus('idle')
  }, [])

  const handleOpenSaveDialog = useCallback(() => {
    setShowDrawer(false)
    setShowSaveDialog(true)
  }, [])

  const totalRows = computeTotalRows(systemSelections)
  const completedRaces = systemSelections.length

  return (
    // --- NY: RaceTabContext.Provider wrapping allt ---
    <RaceTabContext.Provider value={{ activeRaceNumber: activeRace, setActiveRaceNumber: setActiveRace }}>
      {!systemMode && races.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleActivateSystemMode}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            🎯 Bygg system
          </button>
        </div>
      )}

      <div className={systemMode ? "md:pr-[320px]" : ""}>
        {races.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <p className="text-lg mb-2">Ingen data inladdad ännu.</p>
            <p className="text-sm">
              Välj ett datum och klicka på ett spel för att ladda en omgång från ATG.
            </p>
          </div>
        ) : (
          <RaceList
            races={races}
            activeRaceNumber={activeRace}
            userGroups={userGroups}
            currentUserId={currentUserId}
            systemMode={systemMode}
            systemSelections={systemSelections}
            onToggleHorse={handleToggleHorse}
            onHorseClick={handleHorseClick}
          />
        )}
      </div>

      {systemMode && (
        <SystemSidebar
          races={races}
          selections={systemSelections}
          onToggleHorse={handleToggleHorse}
          onSave={handleOpenSaveDialog}
          onCancel={handleCancelSystemMode}
          totalRows={totalRows}
          gameType={gameType}
          draftSaveStatus={draftSaveStatus}
        />
      )}

      {systemMode && (
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden border-t border-gray-800 bg-gray-900 text-white shadow-lg">
          <button
            aria-label="Öppna kupong"
            className="flex-1 w-full text-left px-4 py-3"
            onClick={() => setShowDrawer(true)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">{completedRaces} av {races.length} avd. klara</div>
                <div className="text-sm font-bold">
                  {totalRows} {totalRows === 1 ? 'rad' : 'rader'}{totalRows > 0 && <> · <span className="text-emerald-400">{formatRowCost(totalRows, gameType ?? '')}</span></>}
                </div>
                <div className="text-xs text-emerald-400 mt-0.5">↑ Visa kupong</div>
              </div>
              {draftSaveStatus === 'saving' && (
                <span className="text-xs text-gray-500">Sparar utkast...</span>
              )}
              {draftSaveStatus === 'saved' && (
                <span className="text-xs text-gray-500">Utkast sparat</span>
              )}
            </div>
          </button>
        </div>
      )}

      {systemMode && (
        <SystemDrawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          races={races}
          selections={systemSelections}
          onToggleHorse={handleToggleHorse}
          onSave={handleOpenSaveDialog}
          onCancel={handleCancelSystemMode}
          totalRows={totalRows}
          gameType={gameType}
        />
      )}

      <SaveSystemDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSaved={() => {
          setShowSaveDialog(false)
          setSystemMode(false)
          setSystemSelections([])
          setActiveDraftId(null)
        }}
        gameId={gameId}
        gameType={gameType}
        selections={systemSelections}
        totalRows={totalRows}
        userGroups={userGroups}
        defaultGroupId={initialGroupId}
        existingDraftId={activeDraftId}
      />
    </RaceTabContext.Provider>
  )
}
```

- [ ] **Steg 6.4: Ta bort activeRaceNumber-prop från RaceTabBar i page.tsx**

I `app/(authenticated)/page.tsx` rad 103-106, ta bort `activeRaceNumber`-propen från `<RaceTabBar>`:

```tsx
<RaceTabBar
  races={races.map((r) => ({ race_number: r.race_number, start_time: r.start_time }))}
/>
```

**Obs:** `Suspense`-wrappern behålls eftersom `RaceTabBar` är en client component.

- [ ] **Steg 6.5: Verifiera**

1. Byt avdelning – ska kännas omedelbart, inget URL-flimmer
2. Öppna devtools Network-tab – ingen ny server request vid tabbbyte
3. Klicka en häst i Top 5-listan – rätt avdelning aktiveras och sidan scrollar till hästen
4. Deep link `?avd=3` i URL – startar på rätt avdelning (server-renderat initialvärde passas till useState)

- [ ] **Steg 6.6: Commit**

```bash
git add components/RaceTabContext.tsx components/RaceTabBar.tsx components/MainPageClient.tsx app/\(authenticated\)/page.tsx
git commit -m "feat: klientside-tabbyte via RaceTabContext + scroll-till-häst"
```

---

## Task 7: ThemeToggle + UserMenu till TopNav (desktop)

**Files:**
- Create: `components/NavActiveLink.tsx`
- Modify: `components/TopNav.tsx`
- Modify: `app/(authenticated)/page.tsx`

- [ ] **Steg 7.1: Skapa NavActiveLink**

Skapa ny fil `components/NavActiveLink.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavActiveLinkProps {
  href: string;
  label: string;
}

export function NavActiveLink({ href, label }: NavActiveLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`py-4 text-xs uppercase tracking-wide font-semibold border-b-2 transition-colors ${
        isActive
          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
          : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
```

- [ ] **Steg 7.2: Gör om TopNav till async server component**

Ersätt hela `components/TopNav.tsx`:

```tsx
import { NavActiveLink } from "@/components/NavActiveLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/groups/UserMenu";
import { getProfile, getMyGroups } from "@/lib/actions/groups";
import { createClient } from "@/lib/supabase/server";

const tabs = [
  { label: "Analys", href: "/" },
  { label: "Utvärdering", href: "/evaluation" },
  { label: "System", href: "/system" },
  { label: "Manual", href: "/manual" },
];

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, groups] = user
    ? await Promise.all([getProfile(), getMyGroups()])
    : [null, []];

  return (
    <nav className="hidden md:flex items-center sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 gap-6">
      {tabs.map((tab) => (
        <NavActiveLink key={tab.href} href={tab.href} label={tab.label} />
      ))}
      <div className="flex-1" />
      <div className="flex items-center gap-2 py-2">
        <ThemeToggle />
        {user && profile !== null && (
          <UserMenu
            profile={profile}
            groups={groups}
            userEmail={user.email ?? ""}
          />
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Steg 7.3: Dölj ThemeToggle + UserMenu i page header på desktop**

I `app/(authenticated)/page.tsx` rad 89-95, lägg till `md:hidden`:

```tsx
// Från:
<div className="flex items-center gap-2">
  <ThemeToggle />
  <UserMenu
    profile={profile}
    groups={userGroups}
    userEmail={user.email ?? ""}
  />
</div>

// Till:
<div className="flex items-center gap-2 md:hidden">
  <ThemeToggle />
  <UserMenu
    profile={profile}
    groups={userGroups}
    userEmail={user.email ?? ""}
  />
</div>
```

- [ ] **Steg 7.4: Verifiera**

1. Desktop (≥768px): ThemeToggle och UserMenu syns i TopNav längst till höger, INTE i page-headern
2. Mobil (<768px): ThemeToggle och UserMenu syns i page-headern som förut, TopNav syns inte
3. Temabyte fungerar på desktop

- [ ] **Steg 7.5: Commit**

```bash
git add components/NavActiveLink.tsx components/TopNav.tsx app/\(authenticated\)/page.tsx
git commit -m "feat: ThemeToggle + UserMenu i TopNav på desktop"
```

---

## Task 8: Utkastsystem UI (spara + ladda)

**Files:**
- Modify: `lib/actions/systems.ts`
- Modify: `components/SystemSidebar.tsx`
- Modify: `components/MainPageClient.tsx`

- [ ] **Steg 8.1: Lägg till getUserDraftsForGame i systems.ts**

I `lib/actions/systems.ts`, lägg till ny export efter `updateDraft`-funktionen (rad 84):

```ts
/** Hämtar alla utkast för användaren för ett givet spel */
export async function getUserDraftsForGame(gameId: string): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('game_systems')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .eq('is_draft', true)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as GameSystem[]
}
```

- [ ] **Steg 8.2: Uppdatera SystemSidebarProps och lägg till UI**

Ersätt hela `components/SystemSidebar.tsx`:

```tsx
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
    return (
      selections
        .find((s) => s.race_number === raceNumber)
        ?.horses.some((h) => h.horse_id === horseId) ?? false
    );
  }

  const completedRaces = selections.length;

  return (
    <aside className="hidden md:flex flex-col fixed right-0 top-[170px] bottom-0 z-40 w-[320px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="font-bold text-sm text-gray-900 dark:text-white">
          🎯 Din kupong
        </div>
        <input
          type="text"
          value={draftName}
          onChange={(e) => onDraftNameChange(e.target.value)}
          placeholder="Namnge utkast..."
          maxLength={80}
          className="mt-1.5 w-full px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Races */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {races.map((race) => {
          const sorted = [...race.starters].sort(
            (a, b) => a.start_number - b.start_number
          );
          return (
            <div key={race.id}>
              <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                Avd {race.race_number} · {race.distance}m
              </div>
              <div className="flex flex-wrap gap-1">
                {sorted.map((starter) => {
                  const selected = isSelected(race.race_number, starter.horse_id);
                  return (
                    <button
                      key={starter.horse_id}
                      onClick={() =>
                        onToggleHorse(race.race_number, {
                          horse_id: starter.horse_id,
                          start_number: starter.start_number,
                          horse_name: starter.horses?.name ?? "",
                        })
                      }
                      title={starter.horses?.name ?? `Nr ${starter.start_number}`}
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        selected
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-400"
                      }`}
                    >
                      {starter.start_number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Sparade utkast */}
        {savedDrafts.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-2">
              Mina utkast
            </p>
            {savedDrafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => onLoadDraft?.(draft)}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition mb-1"
              >
                <span className="font-semibold">{draft.name}</span>
                <span className="text-gray-400 dark:text-gray-500 ml-2">
                  {draft.total_rows} rader ·{" "}
                  {new Date(draft.created_at).toLocaleDateString("sv-SE")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t-2 border-emerald-500 flex-shrink-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-extrabold text-emerald-500">
            {totalRows} {totalRows === 1 ? "rad" : "rader"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {completedRaces} av {races.length} avd. klara
          </span>
          {draftSaveStatus === "saving" && (
            <span className="text-xs text-gray-500">Sparar utkast...</span>
          )}
          {draftSaveStatus === "saved" && (
            <span className="text-xs text-emerald-500">Utkast sparat ✓</span>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={selections.length === 0}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg disabled:opacity-40 transition"
        >
          Spara system →
        </button>
        <button
          onClick={onCancel}
          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline transition"
        >
          Avbryt systemläge
        </button>
      </div>
    </aside>
  );
}
```

**Obs:** `GameSystem` måste exporteras från `@/lib/types`. Kontrollera att typen finns där. Om inte, lägg till:
```ts
// I lib/types.ts (lägg till om saknas):
export type { GameSystem } from './actions/systems'
// eller definiera interfacet direkt
```

- [ ] **Steg 8.3: Uppdatera MainPageClient med utkastnamn + laddning**

Lägg till följande i `components/MainPageClient.tsx` (ovanpå de befintliga state-deklarationerna efter rad 47):

```tsx
// Importera högst upp:
import { getUserDraftsForGame } from '@/lib/actions/systems'
import type { GameSystem } from '@/lib/types'

// Ny state (lägg till under draftSaveStatus på rad 47):
const [draftName, setDraftName] = useState('Utkast')
const [savedDrafts, setSavedDrafts] = useState<GameSystem[]>([])
```

Uppdatera `handleActivateSystemMode` för att hämta sparade utkast:

```tsx
const handleActivateSystemMode = useCallback(async () => {
  setSystemMode(true)
  setSystemSelections([])
  setActiveDraftId(null)
  setShowDrawer(false)
  isFirstRender.current = true
  if (gameId) {
    try {
      const drafts = await getUserDraftsForGame(gameId)
      setSavedDrafts(drafts)
    } catch {
      // ignorera fel vid hämtning av utkast
    }
  }
}, [gameId])
```

Lägg till `handleLoadDraft`-callback:

```tsx
const handleLoadDraft = useCallback((draft: GameSystem) => {
  setSystemSelections(draft.selections ?? [])
  setActiveDraftId(draft.id)
  setDraftName(draft.name)
  isFirstRender.current = true
  setSavedDrafts(prev => prev.filter(d => d.id !== draft.id))
}, [])
```

Uppdatera auto-save för att inkludera `draftName`:

```tsx
// Rad 71 i ursprunglig fil – ändra 'Utkast' till draftName:
const draft = await createSystem(initialGroupId, gameId, draftName, systemSelections, totalRows, true)
```

Passa nya props till `SystemSidebar` (lägg till i befintligt anrop):

```tsx
<SystemSidebar
  races={races}
  selections={systemSelections}
  onToggleHorse={handleToggleHorse}
  onSave={handleOpenSaveDialog}
  onCancel={handleCancelSystemMode}
  totalRows={totalRows}
  gameType={gameType}
  draftSaveStatus={draftSaveStatus}
  draftName={draftName}
  onDraftNameChange={setDraftName}
  savedDrafts={savedDrafts}
  onLoadDraft={handleLoadDraft}
/>
```

- [ ] **Steg 8.4: Kontrollera GameSystem-typen i lib/types.ts**

Kör:
```bash
grep -n "GameSystem" /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/lib/types.ts
```

Om `GameSystem` inte finns exporterad från `lib/types.ts`, kontrollera om den finns i `lib/actions/systems.ts` och lägg till re-export. Sök med:
```bash
grep -n "interface GameSystem\|type GameSystem" /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/lib/types.ts /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/lib/actions/systems.ts
```

- [ ] **Steg 8.5: Verifiera**

1. Aktivera systemläget – ett namnfält visas i panelens header
2. Välj hästar i flera avdelningar – vänta 3 sekunder – "Utkast sparat ✓" visas
3. Avaktivera systemläget, aktivera igen – listan "Mina utkast" visas med det sparade utkastet
4. Klicka ett utkast i listan – hästvalen laddas in
5. Ändra namn i namnfältet, vänta 3 sekunder – utkastet sparas med nytt namn

- [ ] **Steg 8.6: Commit**

```bash
git add lib/actions/systems.ts components/SystemSidebar.tsx components/MainPageClient.tsx
git commit -m "feat: utkastsystem UI – namnge, spara och ladda utkast"
```

---

## Slutverifiering

- [ ] Kör `npm run build` och kontrollera att inga TypeScript-fel finns
- [ ] Kör `npm run lint` – inga nya ESLint-fel
- [ ] Testa manuellt på desktop och mobil: alla 8 förbättringar fungerar
- [ ] Commit + push + öppna PR mot main
