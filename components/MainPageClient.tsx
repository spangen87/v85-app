'use client'

import { useState, useCallback } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import type { SystemSelection, SystemHorse, Group } from '@/lib/types'

// Beräkna totalt antal rader i ett system
function computeTotalRows(selections: SystemSelection[]): number {
  return selections.reduce((acc, s) => acc * Math.max(s.horses.length, 1), 1)
}

interface MainPageClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  races: any[]
  userGroups: Group[]
  currentUserId: string
  initialSystemMode?: boolean
  initialGroupId?: string | null
  gameId: string | null
}

export function MainPageClient({
  races,
  userGroups,
  currentUserId,
  initialSystemMode = false,
  initialGroupId = null,
  gameId,
}: MainPageClientProps) {
  const [systemMode, setSystemMode] = useState(initialSystemMode)
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>([])
  const [targetGroupId, setTargetGroupId] = useState<string | null>(initialGroupId)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Toggle en häst i/ur systemet för en given avdelning
  const handleToggleHorse = useCallback((raceNumber: number, horse: SystemHorse) => {
    setSystemSelections(prev => {
      const existing = prev.find(s => s.race_number === raceNumber)
      if (!existing) {
        // Ny avdelning — lägg till hästen
        return [...prev, { race_number: raceNumber, horses: [horse] }]
      }
      const alreadySelected = existing.horses.some(h => h.horse_id === horse.horse_id)
      if (alreadySelected) {
        // Ta bort hästen
        const updatedHorses = existing.horses.filter(h => h.horse_id !== horse.horse_id)
        if (updatedHorses.length === 0) {
          // Ta bort hela avdelningen om inga hästar kvar
          return prev.filter(s => s.race_number !== raceNumber)
        }
        return prev.map(s => s.race_number === raceNumber ? { ...s, horses: updatedHorses } : s)
      } else {
        // Lägg till hästen i befintlig avdelning
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

      {/* Systemläge-banner */}
      {systemMode && (
        <div className="flex items-center justify-between px-3 py-2 mb-4 bg-emerald-900 text-white rounded-lg text-sm">
          <span>
            🎯 Systemläge aktivt &middot; <strong>{completedRaces}/8 avd. klara</strong> &middot; {totalRows} {totalRows === 1 ? 'rad' : 'rader'}
          </span>
          <button
            onClick={handleCancelSystemMode}
            className="text-emerald-300 hover:text-white text-xs underline"
          >
            Avbryt
          </button>
        </div>
      )}

      {races.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-2">Ingen data inladdad ännu.</p>
          <p className="text-sm">
            Välj ett datum och klicka på ett spel för att ladda en omgång från ATG.
          </p>
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <RaceList {...({ races, userGroups, currentUserId, systemMode, systemSelections, onToggleHorse: handleToggleHorse } as any)} />
      )}

      {/* SystemStatusBar — visas i Steg 4 */}
      {systemMode && systemSelections.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gray-900 text-white shadow-lg">
          <div>
            <div className="text-xs text-gray-400">{completedRaces} avd. klara av 8</div>
            <div className="text-sm font-bold">
              {totalRows} rader &middot; <span className="text-emerald-400">{totalRows * 10} kr</span>
            </div>
          </div>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-lg"
            disabled={systemSelections.length === 0}
          >
            Spara system →
          </button>
        </div>
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
        selections={systemSelections}
        totalRows={totalRows}
        userGroups={userGroups}
        defaultGroupId={targetGroupId}
      />
    </>
  )
}
