'use client'

import { useState, useCallback, useEffect, useRef, type ComponentProps } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import { SystemSidebar } from '@/components/SystemSidebar'
import { SystemDrawer } from '@/components/SystemDrawer'
import type { SystemSelection, SystemHorse, Group, GameSystem, TrackConfig } from '@/lib/types'
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
  draftId?: string | null
  initialSelections?: SystemSelection[]
  trackConfig?: TrackConfig | null
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
  trackConfig = null,
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

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
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
          const draft = await createSystem(initialGroupId, gameId, draftName, systemSelections, totalRows, true)
          setActiveDraftId(draft.id)
        }
        setDraftSaveStatus('saved')
      } catch {
        setDraftSaveStatus('idle')
      }
    }, 3000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSelections, systemMode])

  const handleToggleHorse = useCallback((raceNumber: number, horse: SystemHorse) => {
    setSystemSelections(prev => {
      const existing = prev.find(s => s.race_number === raceNumber)
      if (!existing) return [...prev, { race_number: raceNumber, horses: [horse] }]
      const alreadySelected = existing.horses.some(h => h.horse_id === horse.horse_id)
      if (alreadySelected) {
        const updatedHorses = existing.horses.filter(h => h.horse_id !== horse.horse_id)
        if (updatedHorses.length === 0) return prev.filter(s => s.race_number !== raceNumber)
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
      } catch { /* ignorera */ }
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
      const el = document.querySelector(`[data-race="${raceNumber}"][data-start="${startNumber}"]`)
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
      {!systemMode && races.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleActivateSystemMode}
            className="flex items-center gap-2 text-sm font-semibold rounded-lg transition-colors"
            style={{
              padding: "8px 16px",
              background: "var(--tn-accent-faint)",
              border: "1px solid var(--tn-accent-soft)",
              color: "var(--tn-accent)",
              cursor: "pointer",
            }}
          >
            Bygg system
          </button>
        </div>
      )}

      <div className={systemMode ? "md:pr-[320px]" : ""}>
        {races.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--tn-text-faint)" }}>
            <p className="text-lg mb-2">Ingen data inladdad ännu.</p>
            <p className="text-sm">Välj ett datum och klicka på ett spel för att ladda en omgång från ATG.</p>
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
            trackConfig={trackConfig}
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
          draftName={draftName}
          onDraftNameChange={setDraftName}
          savedDrafts={savedDrafts}
          onLoadDraft={handleLoadDraft}
        />
      )}

      {systemMode && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 md:hidden shadow-lg"
          style={{ background: "var(--tn-bg-raised)", borderTop: "1px solid var(--tn-border)" }}
        >
          <button
            aria-label="Öppna kupong"
            className="flex-1 w-full text-left px-4 py-3"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setShowDrawer(true)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
                  {completedRaces} av {races.length} avd. klara
                </div>
                <div className="text-sm font-bold" style={{ color: "var(--tn-text)" }}>
                  {totalRows} {totalRows === 1 ? 'rad' : 'rader'}
                  {totalRows > 0 && (
                    <> · <span style={{ color: "var(--tn-accent)" }}>{formatRowCost(totalRows, gameType ?? '')}</span></>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--tn-accent)" }}>↑ Visa kupong</div>
              </div>
              {draftSaveStatus === 'saving' && (
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Sparar utkast...</span>
              )}
              {draftSaveStatus === 'saved' && (
                <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>Utkast sparat</span>
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
    </>
  )
}
