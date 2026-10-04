'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import type { Race } from '@/lib/raceTypes'

interface MainPageClientProps {
  races: Race[]
  userGroups: Group[]
  currentUserId: string
  initialGroupId?: string | null
  gameId: string | null
  gameType: string | null
  draftId?: string | null
  initialSelections?: SystemSelection[]
  trackConfig?: TrackConfig | null
  /** Antal anteckningar per häst-id */
  noteCounts?: Record<string, number>
  /** Startnummer att öppna direkt (från ?hast= i länken) */
  initialDetail?: number | null
}

export function MainPageClient({
  races,
  userGroups,
  currentUserId,
  initialGroupId = null,
  gameId,
  gameType,
  draftId = null,
  initialSelections = [],
  trackConfig = null,
  noteCounts = {},
  initialDetail = null,
}: MainPageClientProps) {
  const { activeRaceNumber: activeRace, setActiveRaceNumber: setActiveRace } = useRaceTab()
  const [systemSelections, setSystemSelections] = useState<SystemSelection[]>(initialSelections)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId)
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [draftName, setDraftName] = useState('Utkast')
  const [savedDrafts, setSavedDrafts] = useState<GameSystem[]>([])

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // Utkastet sparas automatiskt några sekunder efter senaste ändringen
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!gameId || systemSelections.length === 0) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      setDraftSaveStatus('saving')
      try {
        const totalRows = summarizeSystem(systemSelections, races.length, gameType).rows
        if (activeDraftId) {
          await updateDraft(activeDraftId, systemSelections, totalRows)
        } else {
          const draft = await createSystem(initialGroupId, gameId, draftName, systemSelections, totalRows, true)
          setActiveDraftId(draft.id)
        }
        setDraftSaveStatus('saved')
      } catch {
        setDraftSaveStatus('error')
      }
    }, 3000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSelections])

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

  const handleLoadDraft = useCallback((draft: GameSystem) => {
    setSystemSelections(draft.selections ?? [])
    setActiveDraftId(draft.id)
    setDraftName(draft.name)
    isFirstRender.current = true
    setSavedDrafts(prev => prev.filter(d => d.id !== draft.id))
  }, [])

  // Rensa tar även bort utkastet — annars läses det in igen nästa gång sidan öppnas
  const clearSystem = useCallback(async () => {
    const id = activeDraftId
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    isFirstRender.current = true
    setSystemSelections([])
    setActiveDraftId(null)
    setShowDrawer(false)
    setConfirmClear(false)
    setDraftSaveStatus('idle')
    if (id) {
      try { await deleteSystem(id) } catch { /* utkastet ligger kvar under Mina utkast */ }
    }
  }, [activeDraftId])

  // En påbörjad kupong ska inte kunna kastas med ett enda tryck
  const handleClear = useCallback(() => {
    if (systemSelections.length === 0) return
    setShowDrawer(false)
    setConfirmClear(true)
  }, [systemSelections.length])

  const handleOpenSaveDialog = useCallback(() => {
    setShowDrawer(false)
    setShowSaveDialog(true)
  }, [])

  const summary = summarizeSystem(systemSelections, races.length, gameType)
  const hasSystem = systemSelections.length > 0

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
      <div className="flex flex-wrap gap-6 items-start" style={{ paddingBottom: hasSystem ? 88 : 0 }}>
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
          races={races}
          selections={systemSelections}
          onSave={handleOpenSaveDialog}
          onClear={handleClear}
          summary={summary}
          draftName={draftName}
          draftStatus={draftSaveStatus}
        />
      </div>

      {hasSystem && (
        <SystemBar summary={summary} draftStatus={draftSaveStatus} onOpen={() => setShowDrawer(true)} />
      )}

      <SystemDrawer
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
      />

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
          isFirstRender.current = true
          setSystemSelections([])
          setActiveDraftId(null)
          setDraftSaveStatus('idle')
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
