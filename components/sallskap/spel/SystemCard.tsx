'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { GameSystem } from '@/lib/types'
import { deleteSystem } from '@/lib/actions/systems'
import { addBetFromSystem } from '@/lib/actions/bets'
import { isWinningHorse } from '@/lib/systemsHelpers'
import { formatRowCost } from '@/lib/atg'
import { Badge, Button } from '@/components/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AtgFileButton } from '@/components/AtgFileButton'

interface SystemCardProps {
  system: GameSystem
  currentUserId: string
  onDeleted?: (id: string) => void
  winnersByRace?: Record<number, string>
  gameType?: string
  gameId?: string | null
  /** True om inloggad användare redan registrerat detta system som insats */
  alreadyLogged?: boolean
  /** Anropas när en insats registrerats från systemet (för att uppdatera insatslistan) */
  onBetLogged?: (systemId: string) => void
}

/**
 * Ett sparat system eller utkast: namn, märke, resultat och hästarna per
 * avdelning. När loppet är rättat är vinnaren guld och övriga utgångna.
 */
export function SystemCard({ system, currentUserId, onDeleted, winnersByRace, gameType = '', gameId, alreadyLogged = false, onBetLogged }: SystemCardProps) {
  const isOwner = system.user_id === currentUserId
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loggedHere, setLogged] = useState(false)
  // Listan över spelade system kan komma efter att kortet visats
  const logged = alreadyLogged || loggedHere
  const [logging, setLogging] = useState(false)

  // Bara sparade sällskapssystem kan registreras som spel
  const canLogBet = !system.is_draft && system.group_id != null
  const sorted = [...system.selections].sort((a, b) => a.race_number - b.race_number)
  const rowsText = `${system.total_rows} ${system.total_rows === 1 ? 'rad' : 'rader'} · ${formatRowCost(system.total_rows, gameType)}`
  const graded = !system.is_draft && system.is_graded

  async function handleLogBet() {
    setLogging(true)
    setError(null)
    const result = await addBetFromSystem(system.id)
    setLogging(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setLogged(true)
    if (!result.alreadyLogged) onBetLogged?.(system.id)
  }

  function handleCopy() {
    const lines = sorted.map(s => {
      const numbers = [...s.horses].sort((a, b) => a.start_number - b.start_number).map(h => h.start_number).join(' ')
      return `Avd ${s.race_number}: ${numbers}`
    })
    const write = navigator.clipboard?.writeText([`${system.name} — ${rowsText}`, ...lines].join('\n')) ?? Promise.reject()
    write
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setError('Kunde inte kopiera till urklipp.'))
  }

  function handleDelete() {
    setError(null)
    setConfirmDelete(false)
    startTransition(async () => {
      try {
        await deleteSystem(system.id)
        onDeleted?.(system.id)
      } catch {
        setError('Kunde inte ta bort systemet. Försök igen.')
      }
    })
  }

  return (
    <article className="ta-card ta-card-pad flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 style={{ margin: 0, font: '600 16px/22px var(--font-sans)', color: 'var(--ink)' }}>{system.name}</h3>
            {system.is_draft ? <Badge>Utkast</Badge> : <Badge>{system.group_name ?? 'Privat'}</Badge>}
          </div>
          <span className="ta-text-sm">
            {[system.author_display_name, rowsText].filter(Boolean).join(' · ')}
          </span>
        </div>
        {!system.is_draft && (
          <span style={{ font: '600 15px/20px var(--font-sans)', color: graded ? 'var(--ink)' : 'var(--ink-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {graded && system.score != null ? `${system.score} av ${sorted.length} rätt` : 'Pågår'}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="ta-text-sm">Inga hästar valda ännu.</p>
      ) : (
        <div className="ta-divided">
          {sorted.map(sel => {
            const resultKnown = graded && winnersByRace != null && sel.race_number in winnersByRace
            return (
              <div key={sel.race_number} className="flex items-center gap-3" style={{ padding: '6px 0' }}>
                <span style={{ width: 48, flex: 'none', font: '500 13px/18px var(--font-sans)', color: 'var(--ink-muted)' }}>{`Avd ${sel.race_number}`}</span>
                <span className="flex flex-wrap gap-1">
                  {[...sel.horses].sort((a, b) => a.start_number - b.start_number).map(h => {
                    const won = resultKnown && isWinningHorse(winnersByRace, sel.race_number, h.horse_id)
                    const state = !resultKnown ? '' : won ? ' ta-sn-p1' : ' ta-sn-finished'
                    return (
                      <span key={h.horse_id} className={`ta-sn${state}`} aria-label={won ? `${h.start_number}, vann` : undefined}>
                        {h.start_number}
                      </span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}

      <div className="flex gap-2 flex-wrap">
        {system.is_draft && isOwner && gameId && (
          <Link href={`/?game=${encodeURIComponent(gameId)}`} className="ta-btn ta-btn-secondary ta-btn-sm">Fortsätt bygga</Link>
        )}
        {!system.is_draft && (
          <Button size="sm" onClick={handleCopy}>{copied ? 'Kopierat' : 'Kopiera'}</Button>
        )}
        {sorted.length > 0 && <AtgFileButton size="sm" gameId={gameId} selections={system.selections} />}
        {canLogBet && (
          <Button size="sm" onClick={handleLogBet} disabled={logged || logging}>
            {logged ? 'Spelat' : logging ? 'Registrerar…' : 'Jag spelade detta'}
          </Button>
        )}
        {isOwner && (
          <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(true)} disabled={isPending}>
            {isPending ? 'Tar bort…' : 'Ta bort'}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={system.is_draft ? 'Ta bort utkastet?' : 'Ta bort systemet?'}
        description={`${system.name} tas bort och går inte att få tillbaka.`}
        confirmLabel="Ta bort"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  )
}
