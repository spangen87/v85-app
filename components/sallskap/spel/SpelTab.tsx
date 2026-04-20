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

  const myDrafts = systems.filter(s => s.is_draft && s.user_id === currentUserId)
  const groupDrafts = systems.filter(s => s.is_draft && s.user_id !== currentUserId)
  const savedSystems = systems.filter(s => !s.is_draft)

  const sortedSaved = [...savedSystems].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const allDrafts = [...myDrafts, ...groupDrafts]
  const isEmpty = allDrafts.length === 0 && sortedSaved.length === 0

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedGameId ?? ''}
          onChange={e => handleGameChange(e.target.value)}
          className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none"
          style={{
            background: "var(--tn-bg-chip)",
            border: "1px solid var(--tn-border)",
            color: "var(--tn-text)",
          }}
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
            className="shrink-0 px-3 py-2 text-sm font-semibold rounded-lg transition"
            style={{
              background: "var(--tn-accent-faint)",
              color: "var(--tn-accent)",
              border: "1px solid var(--tn-accent-soft)",
            }}
          >
            + Bygg system
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm" style={{ color: "var(--tn-text-faint)" }}>
          Laddar system...
        </div>
      ) : isEmpty ? (
        <div className="text-center py-10">
          <p className="mb-2 text-sm" style={{ color: "var(--tn-text-faint)" }}>
            Inga system sparade för denna omgång ännu.
          </p>
          {selectedGame && (
            <Link
              href={`/?systemMode=1&groupId=${groupId}&game=${selectedGameId}`}
              className="text-sm hover:underline"
              style={{ color: "var(--tn-accent)" }}
            >
              Bygg ett system
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {allDrafts.length > 0 && (
            <section>
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 tn-eyebrow"
                style={{ color: "var(--tn-warn)" }}
              >
                Utkast
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

          {sortedSaved.length > 0 && (
            <section>
              {allDrafts.length > 0 && (
                <h2
                  className="text-sm font-semibold uppercase tracking-wide mb-3 tn-eyebrow"
                  style={{ color: "var(--tn-text-dim)" }}
                >
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
