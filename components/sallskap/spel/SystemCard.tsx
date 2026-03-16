'use client'

import { useState, useTransition } from 'react'
import { GameSystem } from '@/lib/types'
import { deleteSystem } from '@/lib/actions/systems'

interface SystemCardProps {
  system: GameSystem
  currentUserId: string
  onDeleted?: (id: string) => void
}

export function SystemCard({ system, currentUserId, onDeleted }: SystemCardProps) {
  const isOwner = system.user_id === currentUserId
  const [, startTransition] = useTransition()
  const [isPending, setIsPending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleCopy() {
    const lines = system.selections.map(s => {
      const numbers = s.horses.map(h => h.start_number).join(' ')
      return `Avd ${s.race_number}: ${numbers}`
    })
    const text = [
      `${system.name} — ${system.total_rows} ${system.total_rows === 1 ? 'rad' : 'rader'} · ${system.total_rows * 10} kr`,
      ...lines
    ].join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function handleDelete() {
    if (!confirm('Ta bort systemet?')) return
    setIsPending(true)
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteSystem(system.id)
        onDeleted?.(system.id)
      } catch {
        setDeleteError('Kunde inte ta bort systemet. Försök igen.')
      } finally {
        setIsPending(false)
      }
    })
  }

  // Bestäm score-badge-färg
  const scoreColor = system.score == null
    ? null
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
            {system.author_display_name} · {system.total_rows} {system.total_rows === 1 ? 'rad' : 'rader'} · {system.total_rows * 10} kr
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {system.selections.map(sel => {
            const numbers = sel.horses.map(h => h.start_number).join('  ')
            return (
              <tr key={sel.race_number} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1.5 px-1 font-bold text-base text-gray-900 dark:text-white">{sel.race_number}</td>
                <td className="py-1.5 px-1 font-semibold text-gray-900 dark:text-white tracking-wide">{numbers}</td>
              </tr>
            )
          })}
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
