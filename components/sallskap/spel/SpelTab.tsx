'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SystemCard } from './SystemCard'
import { getGroupSystems } from '@/lib/actions/systems'
import type { GameSystem } from '@/lib/types'

type Game = { id: string; date: string; track: string | null; game_type?: string }

interface SpelTabProps {
  groupId: string
  games: Game[]
  initialGameId: string | null
  initialSystems: GameSystem[]
  currentUserId: string
}

export function SpelTab({ groupId, games, initialGameId, initialSystems, currentUserId }: SpelTabProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(initialGameId)
  const [systems, setSystems] = useState<GameSystem[]>(initialSystems)
  const [loading, setLoading] = useState(false)

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId)
    setLoading(true)
    try {
      const data = await getGroupSystems(groupId, gameId)
      setSystems(data)
    } catch {
      setSystems([])
    } finally {
      setLoading(false)
    }
  }

  function handleDeleted(id: string) {
    setSystems(prev => prev.filter(s => s.id !== id))
  }

  const selectedGame = games.find(g => g.id === selectedGameId)

  // Sortera: egna system först, sedan andras
  const sorted = [...systems].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      {/* Omgångsväljare */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedGameId ?? ''}
          onChange={e => handleGameChange(e.target.value)}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.date} {g.track ? `· ${g.track}` : ''}
            </option>
          ))}
        </select>
        {selectedGame && (
          <Link
            href={`/?systemMode=1&groupId=${groupId}&game=${selectedGameId}`}
            className="shrink-0 px-3 py-2 text-sm font-semibold bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg transition"
          >
            + Bygg system
          </Link>
        )}
      </div>

      {/* Systemlista */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Laddar system...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <p className="mb-2">Inga system sparade för denna omgång ännu.</p>
          {selectedGame && (
            <Link
              href={`/?systemMode=1&groupId=${groupId}&game=${selectedGameId}`}
              className="text-sm text-emerald-600 dark:text-emerald-400 underline"
            >
              Bygg ett system
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map(system => (
            <SystemCard
              key={system.id}
              system={system}
              currentUserId={currentUserId}
              onDeleted={handleDeleted}
              gameType={games.find(g => g.id === selectedGameId)?.game_type ?? ''}
            />
          ))}
        </div>
      )}
    </div>
  )
}
