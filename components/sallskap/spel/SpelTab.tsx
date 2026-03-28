'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SystemCard } from './SystemCard'
import { getGroupSystems, getWinnersForGame } from '@/lib/actions/systems'
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
  const [winnersByRace, setWinnersByRace] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!initialGameId) return
    getWinnersForGame(initialGameId).then(setWinnersByRace).catch(() => {})
  }, [initialGameId])

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId)
    setLoading(true)
    try {
      const [data, winners] = await Promise.all([
        getGroupSystems(groupId, gameId),
        getWinnersForGame(gameId),
      ])
      setSystems(data)
      setWinnersByRace(winners)
    } catch {
      setSystems([])
      setWinnersByRace({})
    } finally {
      setLoading(false)
    }
  }

  function handleDeleted(id: string) {
    setSystems(prev => prev.filter(s => s.id !== id))
  }

  const selectedGame = games.find(g => g.id === selectedGameId)
  const gameType = selectedGame?.game_type ?? ''

  // Dela upp: utkast (egna) och sparade system (hela gruppen)
  const myDrafts = systems.filter(s => s.is_draft && s.user_id === currentUserId)
  const groupDrafts = systems.filter(s => s.is_draft && s.user_id !== currentUserId)
  const savedSystems = systems.filter(s => !s.is_draft)

  // Sortera sparade: egna system först, sedan andras
  const sortedSaved = [...savedSystems].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const allDrafts = [...myDrafts, ...groupDrafts]
  const isEmpty = allDrafts.length === 0 && sortedSaved.length === 0

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
      ) : isEmpty ? (
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
        <div className="flex flex-col gap-6">
          {/* Utkast */}
          {allDrafts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>✏️</span> Utkast
              </h2>
              <div className="flex flex-col gap-4">
                {allDrafts.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    currentUserId={currentUserId}
                    onDeleted={handleDeleted}
                    winnersByRace={winnersByRace}
                    gameType={gameType}
                    gameId={selectedGameId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Sparade system */}
          {sortedSaved.length > 0 && (
            <section>
              {allDrafts.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Sparade system
                </h2>
              )}
              <div className="flex flex-col gap-4">
                {sortedSaved.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    currentUserId={currentUserId}
                    onDeleted={handleDeleted}
                    winnersByRace={winnersByRace}
                    gameType={gameType}
                    gameId={selectedGameId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
