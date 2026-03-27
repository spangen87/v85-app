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
  if (selections.length === 0) return 0
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
    setShowDrawer(false)
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

      {/* Innehåll: får högerpadding på desktop när sidopanelen är öppen */}
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
            userGroups={userGroups}
            currentUserId={currentUserId}
            systemMode={systemMode}
            systemSelections={systemSelections}
            onToggleHorse={handleToggleHorse}
          />
        )}
      </div>

      {/* Desktop-sidopanel: fast till högerkanten (dold på mobil) */}
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

      {/* Mobil: sticky banner längst ner (dold på desktop) */}
      {systemMode && (
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden border-t border-gray-800 bg-gray-900 text-white shadow-lg">
          <button
            aria-label="Öppna kupong"
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
