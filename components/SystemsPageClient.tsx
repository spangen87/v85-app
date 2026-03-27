'use client'

import { useState } from 'react'
import { SystemCard } from '@/components/sallskap/spel/SystemCard'
import { getSystemsForUser, getWinnersForGame } from '@/lib/actions/systems'
import type { GameSystem } from '@/lib/types'

type Game = { id: string; date: string; track: string | null; game_type: string }

interface SystemsPageClientProps {
  games: Game[]
  initialGameId: string | null
  initialSystems: GameSystem[]
  initialWinners: Record<number, string>
  currentUserId: string
}

export function SystemsPageClient({
  games,
  initialGameId,
  initialSystems,
  initialWinners,
  currentUserId,
}: SystemsPageClientProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(initialGameId)
  const [systems, setSystems] = useState<GameSystem[]>(initialSystems)
  const [winners, setWinners] = useState<Record<number, string>>(initialWinners)
  const [loading, setLoading] = useState(false)

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId)
    setLoading(true)
    try {
      const [newSystems, newWinners] = await Promise.all([
        getSystemsForUser(gameId),
        getWinnersForGame(gameId),
      ])
      setSystems(newSystems)
      setWinners(newWinners)
    } catch {
      setSystems([])
      setWinners({})
    } finally {
      setLoading(false)
    }
  }

  function handleDeleted(id: string) {
    setSystems(prev => prev.filter(s => s.id !== id))
  }

  // Dela upp i utkast och sparade system
  const myDrafts = systems.filter(s => s.is_draft && s.user_id === currentUserId)
  const savedSystems = systems.filter(s => !s.is_draft)

  // Sortering sparade: egna först, sedan per sällskapsnamn A-Ö, sedan created_at desc
  const sortedSaved = [...savedSystems].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    const groupA = a.group_name ?? ''
    const groupB = b.group_name ?? ''
    if (groupA !== groupB) return groupA.localeCompare(groupB, 'sv')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const gameType = games.find(g => g.id === selectedGameId)?.game_type ?? ''

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      {/* Omgångsväljare */}
      <div className="mb-6">
        <select
          value={selectedGameId ?? ''}
          onChange={e => handleGameChange(e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.date} · {g.game_type}{g.track ? ` · ${g.track}` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Laddar system...</div>
      ) : (
        <>
          {/* Mina utkast */}
          {myDrafts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>✏️</span> Mina utkast
              </h2>
              <div className="flex flex-col gap-4">
                {myDrafts.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    currentUserId={currentUserId}
                    onDeleted={handleDeleted}
                    winnersByRace={winners}
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
              {myDrafts.length > 0 && (
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
                    winnersByRace={winners}
                    gameType={gameType}
                    gameId={selectedGameId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tomt tillstånd */}
          {myDrafts.length === 0 && sortedSaved.length === 0 && (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <p className="text-base mb-1">Inga system sparade för denna omgång.</p>
              <p className="text-sm">Gå till Analys-fliken och klicka &ldquo;Bygg system&rdquo;.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
