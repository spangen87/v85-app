'use client'

import { useState, useTransition } from 'react'
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
}

export function SystemCard({ system, currentUserId, onDeleted, winnersByRace, gameType = '' }: SystemCardProps) {
  const isOwner = system.user_id === currentUserId
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleCopy() {
    const lines = system.selections.map(s => {
      const numbers = s.horses.map(h => h.start_number).join(' ')
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

  const scoreColor = system.score == null
    ? ''
    : system.score >= 7
    ? 'bg-emerald-500 text-white'
    : system.score >= 5
    ? 'bg-amber-400 text-black'
    : 'bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-white'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      {/* Systemhuvud */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{system.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {system.author_display_name} · {system.total_rows} {system.total_rows === 1 ? 'rad' : 'rader'} · {formatRowCost(system.total_rows, gameType)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Privat/sällskap-bricka */}
          {system.group_name != null ? (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap">
              👥 {system.group_name}
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold">
              🔒 Privat
            </span>
          )}
          {/* Poängbadge */}
          {system.is_graded && system.score != null && (
            <span className={`text-lg font-black px-3 py-1 rounded-lg ${scoreColor}`}>
              {system.score}/8
            </span>
          )}
          {!system.is_graded && (
            <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">Pågår</span>
          )}
        </div>
      </div>

      {/* ATG-kvittoformat tabell */}
      <table className="w-full border-collapse text-sm mb-3">
        <thead>
          <tr className="border-b-2 border-gray-900 dark:border-gray-100">
            <th className="text-left py-1 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide w-9">Avd</th>
            <th className="text-left py-1 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hästar</th>
          </tr>
        </thead>
        <tbody>
          {system.selections.map(sel => (
            <tr key={sel.race_number} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1.5 px-1 font-bold text-base text-gray-900 dark:text-white">{sel.race_number}</td>
              <td className="py-1.5 px-1">
                <div className="flex gap-1.5 flex-wrap">
                  {sel.horses.map(h => {
                    const raceResultKnown = winnersByRace != null && sel.race_number in winnersByRace
                    const won = system.is_graded && raceResultKnown && isWinningHorse(winnersByRace, sel.race_number, h.horse_id)
                    const lost = system.is_graded && raceResultKnown && !won
                    return (
                      <span
                        key={h.horse_id}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm transition-colors ${
                          won
                            ? 'border-2 border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950'
                            : lost
                            ? 'text-gray-400 dark:text-gray-600'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {h.start_number}
                      </span>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteError && (
        <p className="text-xs text-red-500 mb-2">{deleteError}</p>
      )}

      {/* Åtgärder */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Kopiera system
        </button>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
          >
            Ta bort
          </button>
        )}
      </div>
    </div>
  )
}
