# System Sidebar & Kupongöversikt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lägg till en klickbar kupongpanel i systembyggarläget — fast sidopanel på desktop (320px), slide-up drawer på mobil — med klickbara hästnummercirklar för att lägga till/ta bort hästar utan att scrolla.

**Architecture:** Två nya komponenter (`SystemSidebar`, `SystemDrawer`) delar samma lokala `RaceInfo`-typ och `isSelected`-logik. `MainPageClient` wrappas i en flex-rad när systemläget är aktivt och skickar `races`-propen (som redan finns) vidare. Den befintliga fasta bottenbannern på desktop tas bort och ersätts av sidopanelen.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4

---

## Filöversikt

| Fil | Åtgärd |
|-----|--------|
| `components/SystemSidebar.tsx` | Skapa — desktop sidebar |
| `components/SystemDrawer.tsx` | Skapa — mobil slide-up drawer |
| `components/MainPageClient.tsx` | Ändra — layout + ny state + koppling till nya komponenter |

---

## Task 1: Skapa SystemSidebar

**Files:**
- Create: `components/SystemSidebar.tsx`

- [ ] **Steg 1: Skapa filen med komplett implementation**

Skapa `components/SystemSidebar.tsx` med exakt denna kod:

```tsx
"use client";

import type { SystemSelection, SystemHorse } from "@/lib/types";
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
}

export function SystemSidebar({
  races,
  selections,
  onToggleHorse,
  onSave,
  onCancel,
  totalRows,
  gameType,
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
    <aside className="hidden md:flex flex-col w-[320px] flex-shrink-0 sticky top-0 self-start max-h-screen border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="font-bold text-sm text-gray-900 dark:text-white">🎯 Din kupong</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Klicka för att lägga till / ta bort
        </div>
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
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          {completedRaces} av {races.length} avd. klara
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

- [ ] **Steg 2: Verifiera TypeScript**

```bash
cd "/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös" && npx tsc --noEmit 2>&1 | grep SystemSidebar
```

Förväntat: ingen utskrift (inga fel).

- [ ] **Steg 3: Commit**

```bash
git add components/SystemSidebar.tsx
git commit -m "feat: add SystemSidebar component for desktop system builder"
```

---

## Task 2: Skapa SystemDrawer

**Files:**
- Create: `components/SystemDrawer.tsx`

- [ ] **Steg 1: Skapa filen med komplett implementation**

Skapa `components/SystemDrawer.tsx` med exakt denna kod:

```tsx
"use client";

import type { SystemSelection, SystemHorse } from "@/lib/types";
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

interface SystemDrawerProps {
  open: boolean;
  onClose: () => void;
  races: RaceInfo[];
  selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  onSave: () => void;
  onCancel: () => void;
  totalRows: number;
  gameType: string | null;
}

export function SystemDrawer({
  open,
  onClose,
  races,
  selections,
  onToggleHorse,
  onSave,
  onCancel,
  totalRows,
  gameType,
}: SystemDrawerProps) {
  if (!open) return null;

  function isSelected(raceNumber: number, horseId: string): boolean {
    return (
      selections
        .find((s) => s.race_number === raceNumber)
        ?.horses.some((h) => h.horse_id === horseId) ?? false
    );
  }

  const completedRaces = selections.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900 rounded-t-2xl max-h-[70vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-gray-700" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
          <span className="font-bold text-sm text-white">🎯 Din kupong</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none transition"
          >
            ✕
          </button>
        </div>
        {/* Races */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {races.map((race) => {
            const sorted = [...race.starters].sort(
              (a, b) => a.start_number - b.start_number
            );
            return (
              <div key={race.id}>
                <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">
                  Avd {race.race_number} · {race.distance}m
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          selected
                            ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                            : "bg-gray-700 text-gray-400 hover:bg-emerald-900 hover:text-emerald-400"
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
        </div>
        {/* Footer */}
        <div className="px-4 py-3 border-t-2 border-emerald-500 flex-shrink-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-lg font-extrabold text-emerald-400">
              {totalRows} {totalRows === 1 ? "rad" : "rader"}
            </span>
            <span className="text-xs text-gray-500">
              {totalRows > 0 ? formatRowCost(totalRows, gameType ?? "") : "–"}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {completedRaces} av {races.length} avd. klara
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
            className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300 underline transition"
          >
            Avbryt systemläge
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Steg 2: Verifiera TypeScript**

```bash
cd "/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös" && npx tsc --noEmit 2>&1 | grep SystemDrawer
```

Förväntat: ingen utskrift (inga fel).

- [ ] **Steg 3: Commit**

```bash
git add components/SystemDrawer.tsx
git commit -m "feat: add SystemDrawer component for mobile system builder"
```

---

## Task 3: Uppdatera MainPageClient

**Files:**
- Modify: `components/MainPageClient.tsx`

**Vad som ändras:**
1. Importera `SystemSidebar` och `SystemDrawer`
2. Lägg till `showDrawer` state
3. Ta bort den övre "Systemläge aktivt"-bannern (sidopanelen/drawern ger feedback)
4. Wrappa race-listan i `<div className="flex items-start">` när `systemMode` är aktivt, med `SystemSidebar` som syskon
5. Ersätt den fasta bottenbannern (`fixed bottom-16`) med:
   - Mobil-banner (`md:hidden`, `bottom-16`) som öppnar drawern vid klick
   - `SystemDrawer` (öppnas av bannern)
6. Flytta `onSave`-logiken (`setShowSaveDialog(true)`) till en variabel för återanvändning

- [ ] **Steg 1: Ersätt hela MainPageClient.tsx med uppdaterad version**

```tsx
'use client'

import { useState, useCallback, type ComponentProps } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import { SystemSidebar } from '@/components/SystemSidebar'
import { SystemDrawer } from '@/components/SystemDrawer'
import type { SystemSelection, SystemHorse, Group } from '@/lib/types'
import { formatRowCost } from '@/lib/atg'

type RaceListRaces = ComponentProps<typeof RaceList>['races']

function computeTotalRows(selections: SystemSelection[]): number {
  return selections.reduce((acc, s) => acc * Math.max(s.horses.length, 1), 1)
}

interface MainPageClientProps {
  races: RaceListRaces
  userGroups: Group[]
  currentUserId: string
  initialSystemMode?: boolean
  initialGroupId?: string | null
  gameId: string | null
  gameType: string | null
}

export function MainPageClient({
  races,
  userGroups,
  currentUserId,
  initialSystemMode = false,
  initialGroupId = null,
  gameId,
  gameType,
}: MainPageClientProps) {
  const [systemMode, setSystemMode] = useState(initialSystemMode)
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

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

  const handleActivateSystemMode = useCallback(() => {
    setSystemMode(true)
    setSystemSelections([])
  }, [])

  const handleCancelSystemMode = useCallback(() => {
    setSystemMode(false)
    setSystemSelections([])
    setShowDrawer(false)
  }, [])

  const handleOpenSaveDialog = useCallback(() => {
    setShowDrawer(false)
    setShowSaveDialog(true)
  }, [])

  const totalRows = computeTotalRows(systemSelections)
  const completedRaces = systemSelections.length

  return (
    <>
      {/* "Bygg system"-knapp visas ovanför listan när systemläge är AV */}
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

      {/* Flex-rad: listan + desktop-sidopanel */}
      <div className={systemMode ? "flex items-start" : ""}>
        <div className={systemMode ? "flex-1 min-w-0" : ""}>
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
              userGroups={userGroups}
              currentUserId={currentUserId}
              systemMode={systemMode}
              systemSelections={systemSelections}
              onToggleHorse={handleToggleHorse}
            />
          )}
        </div>

        {/* Desktop-sidopanel (dold på mobil) */}
        {systemMode && (
          <SystemSidebar
            races={races}
            selections={systemSelections}
            onToggleHorse={handleToggleHorse}
            onSave={handleOpenSaveDialog}
            onCancel={handleCancelSystemMode}
            totalRows={totalRows}
            gameType={gameType}
          />
        )}
      </div>

      {/* Mobil: sticky banner längst ner (dold på desktop) */}
      {systemMode && (
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden border-t border-gray-800 bg-gray-900 text-white shadow-lg">
          <button
            className="flex-1 w-full text-left px-4 py-3"
            onClick={() => setShowDrawer(true)}
          >
            <div className="text-xs text-gray-400">{completedRaces} av {races.length} avd. klara</div>
            <div className="text-sm font-bold">
              {totalRows} {totalRows === 1 ? 'rad' : 'rader'}{totalRows > 0 && <> · <span className="text-emerald-400">{formatRowCost(totalRows, gameType ?? '')}</span></>}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">↑ Visa kupong</div>
          </button>
        </div>
      )}

      {/* Mobil: slide-up drawer */}
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
        }}
        gameId={gameId}
        gameType={gameType}
        selections={systemSelections}
        totalRows={totalRows}
        userGroups={userGroups}
        defaultGroupId={initialGroupId}
      />
    </>
  )
}
```

- [ ] **Steg 2: Verifiera TypeScript**

```bash
cd "/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös" && npx tsc --noEmit 2>&1
```

Förväntat: ingen utskrift. Om TypeScript klagar på att `races` (typ `RaceListRaces`) inte är kompatibelt med `RaceInfo[]` i sidebar/drawer — det ska fungera pga strukturell typning, men om det inte gör det, lägg till `as RaceInfo[]` på props-platsen. Tänk: `Race` har fler fält än `RaceInfo` → `Race[]` är ett strukturellt superset av `RaceInfo[]` → direkt tilldelning fungerar.

- [ ] **Steg 3: Kör lint**

```bash
cd "/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös" && npx eslint components/MainPageClient.tsx components/SystemSidebar.tsx components/SystemDrawer.tsx 2>&1
```

Förväntat: inga errors.

- [ ] **Steg 4: Kör dev-server och verifiera manuellt**

```bash
npm run dev
```

Checklist att testa i webbläsaren:
- [ ] Desktop (≥ md): klicka "Bygg system" → sidopanel dyker upp till höger
- [ ] Desktop: klicka en cirkel i sidopanelen → samma häst markeras grön i hästkortet
- [ ] Desktop: klicka en häst i hästkortet → cirkeln i sidopanelen uppdateras omedelbart
- [ ] Desktop: ingen fast banner vid botten
- [ ] Mobil (< md): klicka "Bygg system" → sticky banner längst ner (`bottom-16`)
- [ ] Mobil: klicka bannern → drawer glider upp med alla hästar
- [ ] Mobil: klicka häst i drawer → cirkeln togglas + räknaren uppdateras
- [ ] Mobil: klicka backdrop → drawer stängs
- [ ] Båda: "Spara system →" öppnar SaveSystemDialog
- [ ] Båda: "Avbryt systemläge" rensar och stänger

- [ ] **Steg 5: Bygg-check**

```bash
cd "/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös" && npm run build 2>&1 | tail -20
```

Förväntat: `✓ Compiled successfully` (eller liknande).

- [ ] **Steg 6: Commit**

```bash
git add components/MainPageClient.tsx
git commit -m "feat: integrate system sidebar and drawer into main page"
```
