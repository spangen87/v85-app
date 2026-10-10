'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { RaceList } from '@/components/RaceList'
import { SaveSystemDialog } from '@/components/SaveSystemDialog'
import { SystemSidebar } from '@/components/SystemSidebar'
import { SystemDrawer } from '@/components/SystemDrawer'
import { SystemBar } from '@/components/SystemBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui'
import type { SystemSelection, SystemHorse, Group, GameSystem, TrackConfig } from '@/lib/types'
import { createSystem, deleteSystem, updateDraft, getUserDraftsForGame } from '@/lib/actions/systems'
import { useRaceTab } from '@/components/RaceTabContext'
import { openGamePicker } from '@/lib/uiEvents'
import { summarizeSystem } from '@/lib/systemSummary'
import { createDraftAutosave, type DraftStatus } from '@/lib/draftAutosave'
import { APP_COVERAGE_CALIBRATION, optimizerRacesFromRaces, systemMetrics } from '@/lib/optimizer'
import { getRowPrice } from '@/lib/atg'
import { ProposeSheet, SystemInsights } from '@/components/OptimizerPanel'
import type { Race } from '@/lib/raceTypes'

interface MainPageClientProps {
  races: Race[]
  userGroups: Group[]
  currentUserId: string
  initialGroupId?: string | null
  gameId: string | null
  gameType: string | null
  draftId?: string | null
  /** Namnet på utkastet som läses in */
  draftName?: string | null
  initialSelections?: SystemSelection[]
  trackConfig?: TrackConfig | null
  /** Antal anteckningar per häst-id */
  noteCounts?: Record<string, number>
  /** Startnummer att öppna direkt (från ?hast= i länken) */
  initialDetail?: number | null
  /** Systemförslag och träffchans visas bara för administratörer (under utvärdering) */
  isAdmin?: boolean
}

export function MainPageClient({
  races,
  userGroups,
  currentUserId,
  initialGroupId = null,
  gameId,
  gameType,
  draftId = null,
  draftName: initialDraftName = null,
  initialSelections = [],
  trackConfig = null,
  noteCounts = {},
  initialDetail = null,
  isAdmin = false,
}: MainPageClientProps) {
  const { activeRaceNumber: activeRace, setActiveRaceNumber: setActiveRace } = useRaceTab()
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>(initialSelections)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId)
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftStatus>('idle')
  const [draftName, setDraftName] = useState(initialDraftName ?? 'Utkast')
  const [savedDrafts, setSavedDrafts] = useState<GameSystem[]>([])

  // Autosparning som utkast; skapas en gång per omgång (komponenten får ny key per omgång)
  const [autosave] = useState(() => createDraftAutosave(
    {
      create: async (selections, name) =>
        (await createSystem(initialGroupId, gameId!, name, selections, summarizeSystem(selections, races.length, gameType).rows, true)).id,
      update: (id, selections, name) => updateDraft(id, selections, summarizeSystem(selections, races.length, gameType).rows, name),
      remove: deleteSystem,
    },
    { onDraftId: setActiveDraftId, onStatus: setDraftSaveStatus },
    draftId,
  ))
  const skipNextSave = useRef(true)

  // Sparas automatiskt några sekunder efter senaste ändringen (även namnbyte)
  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return }
    if (gameId) autosave.schedule(systemSelections, draftName)
  }, [systemSelections, draftName, gameId, autosave])

  // Lämnar man sidan eller appen inom fördröjningen sparas det direkt
  useEffect(() => {
    const flush = () => { void autosave.flush() }
    const onHidden = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHidden)
      flush()
    }
  }, [autosave])

  // Tidigare utkast för omgången (utom det som redan är inläst)
  useEffect(() => {
    if (!gameId) return
    let cancelled = false
    getUserDraftsForGame(gameId)
      .then((drafts) => { if (!cancelled) setSavedDrafts(drafts.filter((d) => d.id !== draftId)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [gameId, draftId])

  const handleToggleHorse = useCallback((raceNumber: number, horse: SystemHorse) => {
    setSystemSelections(prev => {
      const existing = prev.find(s => s.race_number === raceNumber)
      if (!existing) return [...prev, { race_number: raceNumber, horses: [horse] }]
      const alreadySelected = existing.horses.some(h => h.horse_id === horse.horse_id)
      if (alreadySelected) {
        const updatedHorses = existing.horses.filter(h => h.horse_id !== horse.horse_id)
        if (updatedHorses.length === 0) return prev.filter(s => s.race_number !== raceNumber)
        return prev.map(s => s.race_number === raceNumber ? { ...s, horses: updatedHorses } : s)
      }
      return prev.map(s => s.race_number === raceNumber ? { ...s, horses: [...s.horses, horse] } : s)
    })
  }, [])

  const handleLoadDraft = useCallback(async (draft: GameSystem) => {
    // Det som väntar sparas i det nuvarande utkastet innan bytet
    await autosave.adopt(draft.id)
    skipNextSave.current = true
    setSystemSelections(draft.selections ?? [])
    setActiveDraftId(draft.id)
    setDraftName(draft.name)
    setSavedDrafts(prev => prev.filter(d => d.id !== draft.id))
  }, [autosave])

  // Rensa tar även bort utkastet — annars läses det in igen nästa gång sidan öppnas
  const clearSystem = useCallback(() => {
    skipNextSave.current = true
    setSystemSelections([])
    setShowDrawer(false)
    setConfirmClear(false)
    void autosave.discard()
  }, [autosave])

  // En påbörjad kupong ska inte kunna kastas med ett enda tryck
  const handleClear = useCallback(() => {
    if (systemSelections.length === 0) return
    setShowDrawer(false)
    setConfirmClear(true)
  }, [systemSelections.length])

  // Spara det som syns innan systemet publiceras — annars kan de senaste sekundernas ändringar saknas
  const handleOpenSaveDialog = useCallback(async () => {
    setShowDrawer(false)
    await autosave.flush()
    setShowSaveDialog(true)
  }, [autosave])

  const summary = summarizeSystem(systemSelections, races.length, gameType)
  const hasSystem = systemSelections.length > 0
  const showBar = hasSystem || isAdmin

  // Optimeraren: kalibrerad chans per avdelning, bara för administratörer
  const [showPropose, setShowPropose] = useState(false)
  const optimizerRaces = useMemo(() => (isAdmin ? optimizerRacesFromRaces(races) : null), [isAdmin, races])
  const metrics = useMemo(
    () => (optimizerRaces && hasSystem ? systemMetrics(optimizerRaces, systemSelections, { coverageCalibration: APP_COVERAGE_CALIBRATION }) : null),
    [optimizerRaces, hasSystem, systemSelections],
  )
  const insights = optimizerRaces && metrics ? <SystemInsights races={optimizerRaces} metrics={metrics} /> : undefined
  const openPropose = isAdmin ? () => { setShowDrawer(false); setShowPropose(true) } : undefined

  if (races.length === 0) {
    return (
      <div className="ta-card flex flex-col items-center gap-3 text-center" style={{ padding: 'var(--space-8) var(--space-4)' }}>
        <p style={{ margin: 0, font: '600 18px/24px var(--font-sans)', color: 'var(--ink)' }}>Ingen omgång inladdad ännu.</p>
        <p style={{ margin: 0, font: '400 14px/20px var(--font-sans)', color: 'var(--ink-muted)' }}>Välj ett datum och ett spel så hämtas omgången från ATG.</p>
        <Button variant="primary" onClick={openGamePicker}>Hämta en omgång</Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-6 items-start" style={{ paddingBottom: showBar ? 88 : 0 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0 }}>
          <RaceList
            races={races}
            activeRaceNumber={activeRace}
            onSelectRace={setActiveRace}
            userGroups={userGroups}
            currentUserId={currentUserId}
            systemSelections={systemSelections}
            canSelect
            onToggleHorse={handleToggleHorse}
            trackConfig={trackConfig}
            noteCounts={noteCounts}
            initialDetail={initialDetail}
          />
        </div>
        <SystemSidebar
          gameId={gameId}
          races={races}
          selections={systemSelections}
          onSave={handleOpenSaveDialog}
          onClear={handleClear}
          summary={summary}
          draftName={draftName}
          draftStatus={draftSaveStatus}
          insights={insights}
          onPropose={openPropose}
        />
      </div>

      {showBar && (
        <SystemBar summary={summary} draftStatus={draftSaveStatus} onOpen={() => setShowDrawer(true)} />
      )}

      <SystemDrawer
        gameId={gameId}
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        races={races}
        selections={systemSelections}
        onToggleHorse={handleToggleHorse}
        onSave={handleOpenSaveDialog}
        onClear={handleClear}
        summary={summary}
        draftName={draftName}
        onDraftNameChange={setDraftName}
        draftStatus={draftSaveStatus}
        savedDrafts={savedDrafts}
        onLoadDraft={handleLoadDraft}
        insights={insights}
        onPropose={openPropose}
      />

      {optimizerRaces && (
        <ProposeSheet
          open={showPropose}
          onClose={() => setShowPropose(false)}
          races={optimizerRaces}
          gameType={gameType}
          rowPrice={getRowPrice(gameType ?? '')}
          selections={systemSelections}
          onApply={setSystemSelections}
        />
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Rensa systemet?"
        description={`Du har markerat hästar i ${summary.done} av ${summary.total} avdelningar (${summary.rows} ${summary.rows === 1 ? 'rad' : 'rader'}). Markeringarna och utkastet tas bort.`}
        confirmLabel="Rensa"
        cancelLabel="Behåll"
        danger
        onConfirm={clearSystem}
        onCancel={() => setConfirmClear(false)}
      />

      <SaveSystemDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSaved={() => {
          setShowSaveDialog(false)
          skipNextSave.current = true
          setSystemSelections([])
          autosave.forget()
        }}
        gameId={gameId}
        gameType={gameType}
        selections={systemSelections}
        totalRows={summary.rows}
        userGroups={userGroups}
        defaultGroupId={initialGroupId}
        existingDraftId={activeDraftId}
      />
    </>
  )
}
