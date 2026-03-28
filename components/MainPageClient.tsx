'use client'

import { useState, useCallback, useEffect, useRef, type ComponentProps } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import { SystemSidebar } from '@/components/SystemSidebar'
import { SystemDrawer } from '@/components/SystemDrawer'
import type { SystemSelection, SystemHorse, Group, GameSystem } from '@/lib/types'
import { formatRowCost } from '@/lib/atg'
import { createSystem, updateDraft, getUserDraftsForGame } from '@/lib/actions/systems'
import { useRaceTab } from '@/components/RaceTabContext'

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
  /** Befintligt utkast-ID att fortsätta redigera */
  draftId?: string | null
  /** Förvalda hästar från ett utkast */
  initialSelections?: SystemSelection[]
}

export function MainPageClient({
  races,
  userGroups,
  currentUserId,
  initialSystemMode = false,
  initialGroupId = null,
  gameId,
  gameType,
  draftId = null,
  initialSelections = [],
}: MainPageClientProps) {
  const [systemMode, setSystemMode] = useState(initialSystemMode)
  const { activeRaceNumber: activeRace, setActiveRaceNumber: setActiveRace } = useRaceTab()
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>(initialSelections)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId)
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [draftName, setDraftName] = useState('Utkast')
  const [savedDrafts, setSavedDrafts] = useState<GameSystem[]>([])

  // Auto-spara utkast (debounce 3 s) när systemMode är aktivt och val ändras
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Hoppa över triggern vid initial render
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
          // Spara utkastet med group_id om vi är i sällskapsläge
          const draft = await createSystem(initialGroupId, gameId, draftName, systemSelections, totalRows, true)
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
        // ignorera fel
      }
    }
  }, [gameId])

  const handleLoadDraft = useCallback((draft: GameSystem) => {
    setSystemSelections(draft.selections ?? [])
    setActiveDraftId(draft.id)
    setDraftName(draft.name)
    isFirstRender.current = true
    setSavedDrafts(prev => prev.filter(d => d.id !== draft.id))
  }, [])

  const handleHorseClick = useCallback((raceNumber: number, startNumber: number) => {
    setActiveRace(raceNumber)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-race="${raceNumber}"][data-start="${startNumber}"]`
      )
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [setActiveRace])

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
          draftSaveStatus={draftSaveStatus}
          draftName={draftName}
          onDraftNameChange={setDraftName}
          savedDrafts={savedDrafts}
          onLoadDraft={handleLoadDraft}
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
    </>
  )
}
