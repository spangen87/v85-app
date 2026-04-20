'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { GameSystem } from '@/lib/types'
import { deleteSystem } from '@/lib/actions/systems'
import { isWinningHorse } from '@/lib/systemsHelpers'
import { formatRowCost } from '@/lib/atg'

interface SystemCardProps {
  system: GameSystem
  currentUserId: string
  onDeleted?: (id: string) => void
  winnersByRace?: Record<number, string>
  gameType?: string
  gameId?: string | null
}

export function SystemCard({ system, currentUserId, onDeleted, winnersByRace, gameType = '', gameId }: SystemCardProps) {
  const isOwner = system.user_id === currentUserId
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleCopy() {
    const sortedSelections = [...system.selections].sort((a, b) => a.race_number - b.race_number)
    const lines = sortedSelections.map(s => {
      const numbers = [...s.horses].sort((a, b) => a.start_number - b.start_number).map(h => h.start_number).join(' ')
      return `Avd ${s.race_number}: ${numbers}`
    })
    const text = [
      `${system.name} — ${system.total_rows} ${system.total_rows === 1 ? 'rad' : 'rader'} · ${formatRowCost(system.total_rows, gameType)}`,
      ...lines
    ].join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function handleDelete() {
    if (!confirm('Ta bort systemet?')) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteSystem(system.id)
        onDeleted?.(system.id)
      } catch {
        setDeleteError('Kunde inte ta bort systemet. Försök igen.')
      }
    })
  }

  const score = system.score
  const scoreStyle: React.CSSProperties = score == null ? {}
    : score >= 7 ? { background: "var(--tn-value-high)", color: "#0a0e14" }
    : score >= 5 ? { background: "var(--tn-warn)", color: "#0a0e14" }
    : { background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }

  const continueHref = gameId ? `/?game=${encodeURIComponent(gameId)}&systemMode=1` : null

  const borderColor = system.is_draft ? "var(--tn-warn)" : "var(--tn-border)"

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--tn-bg-card)", border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: "var(--tn-text)" }}>{system.name}</span>
            {system.is_draft && (
              <span
                className="tn-mono text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(251,191,36,0.15)", color: "var(--tn-warn)" }}
              >
                Utkast
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            {system.author_display_name} · {system.total_rows} {system.total_rows === 1 ? 'rad' : 'rader'} · {formatRowCost(system.total_rows, gameType)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!system.is_draft && (
            system.group_name != null ? (
              <span
                className="tn-mono text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap"
                style={{ background: "var(--tn-accent-faint)", color: "var(--tn-accent)" }}
              >
                {system.group_name}
              </span>
            ) : (
              <span
                className="tn-mono text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-faint)" }}
              >
                Privat
              </span>
            )
          )}
          {!system.is_draft && system.is_graded && score != null && (
            <span className="tn-mono text-lg font-black px-3 py-1 rounded-lg" style={scoreStyle}>
              {score}/8
            </span>
          )}
          {!system.is_draft && !system.is_graded && (
            <span className="tn-mono text-xs px-2 py-1 rounded-md" style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-faint)" }}>
              Pågår
            </span>
          )}
        </div>
      </div>

      <table className="w-full border-collapse text-sm mb-3">
        <thead>
          <tr style={{ borderBottom: `2px solid var(--tn-text)` }}>
            <th className="text-left py-1 px-1 tn-eyebrow w-9">Avd</th>
            <th className="text-left py-1 px-1 tn-eyebrow">Hästar</th>
          </tr>
        </thead>
        <tbody>
          {[...system.selections].sort((a, b) => a.race_number - b.race_number).map(sel => (
            <tr key={sel.race_number} style={{ borderBottom: "1px solid var(--tn-border)" }}>
              <td className="py-1.5 px-1 font-bold text-base" style={{ color: "var(--tn-text)" }}>{sel.race_number}</td>
              <td className="py-1.5 px-1">
                <div className="flex gap-1.5 flex-wrap">
                  {[...sel.horses].sort((a, b) => a.start_number - b.start_number).map(h => {
                    const raceResultKnown = winnersByRace != null && sel.race_number in winnersByRace
                    const won = !system.is_draft && system.is_graded && raceResultKnown && isWinningHorse(winnersByRace, sel.race_number, h.horse_id)
                    const lost = !system.is_draft && system.is_graded && raceResultKnown && !won
                    return (
                      <span
                        key={h.horse_id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm"
                        style={
                          won ? { border: "2px solid var(--tn-value-high)", color: "var(--tn-value-high)", background: "rgba(52,211,153,0.1)" }
                          : lost ? { color: "var(--tn-text-faint)" }
                          : system.is_draft ? { color: "var(--tn-warn)", background: "rgba(251,191,36,0.1)" }
                          : { color: "var(--tn-text)" }
                        }
                      >
                        {h.start_number}
                      </span>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
          {system.selections.length === 0 && (
            <tr>
              <td colSpan={2} className="py-2 px-1 text-xs italic" style={{ color: "var(--tn-text-faint)" }}>
                Inga hästar valda ännu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {deleteError && <p className="text-xs mb-2" style={{ color: "var(--tn-value-low)" }}>{deleteError}</p>}

      <div className="flex gap-2 flex-wrap">
        {system.is_draft && isOwner && continueHref && (
          <Link
            href={continueHref}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition"
            style={{ background: "rgba(251,191,36,0.15)", color: "var(--tn-warn)", border: "1px solid rgba(251,191,36,0.3)" }}
          >
            Fortsätt utkast
          </Link>
        )}
        {!system.is_draft && (
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-lg transition"
            style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text-dim)", cursor: "pointer" }}
          >
            Kopiera system
          </button>
        )}
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            style={{ border: "1px solid rgba(248,113,113,0.3)", color: "var(--tn-value-low)", background: "none", cursor: "pointer" }}
          >
            Ta bort
          </button>
        )}
      </div>
    </div>
  )
}
