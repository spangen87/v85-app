'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Group, SystemSelection } from '@/lib/types'
import { createSystem } from '@/lib/actions/systems'
import { formatRowCost } from '@/lib/atg'

interface SaveSystemDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  gameId: string | null
  gameType: string | null
  selections: SystemSelection[]
  totalRows: number
  userGroups: Group[]
  defaultGroupId?: string | null
}

export function SaveSystemDialog({
  open,
  onClose,
  onSaved,
  gameId,
  gameType,
  selections,
  totalRows,
  userGroups,
  defaultGroupId = null,
}: SaveSystemDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('Mitt system')
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  if (!open) return null

  function handleSave() {
    if (!name.trim()) {
      setError('Systemet måste ha ett namn.')
      return
    }
    if (!gameId) {
      setError('Inget spel valt.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createSystem(groupId, gameId, name.trim(), selections, totalRows)
        setSavedName(name.trim())
      } catch (err) {
        setError('Kunde inte spara systemet. Försök igen.')
        console.error(err)
      }
    })
  }

  function handleGoToSystem() {
    onSaved()
    router.push(`/system?game=${gameId}`)
  }

  // Success-vy
  if (savedName !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">System sparat!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              &ldquo;{savedName}&rdquo; &mdash; {totalRows} {totalRows === 1 ? 'rad' : 'rader'} &middot; {formatRowCost(totalRows, gameType ?? '')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSaved}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Stäng
            </button>
            <button
              onClick={handleGoToSystem}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Se systemet →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Sparavy
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Spara system</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Systemnamn
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sällskap
          </label>
          {userGroups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Privat system (du är inte med i något sällskap ännu)
            </p>
          ) : (
            <select
              value={groupId ?? ''}
              onChange={e => setGroupId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Privat — inget sällskap</option>
              {userGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {totalRows} {totalRows === 1 ? 'rad' : 'rader'} &middot; {formatRowCost(totalRows, gameType ?? '')}
        </div>

        {!gameId && (
          <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">Inget spel valt.</p>
        )}

        {error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || selections.length === 0 || !gameId}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Sparar...' : 'Spara system'}
          </button>
        </div>
      </div>
    </div>
  )
}
