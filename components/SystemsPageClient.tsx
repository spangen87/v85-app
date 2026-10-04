'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EmptyState, GameSelect } from '@/components/ui'
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

  const myDrafts = systems.filter(s => s.is_draft && s.user_id === currentUserId)
  const savedSystems = systems.filter(s => !s.is_draft)

  const sortedSaved = [...savedSystems].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    const groupA = a.group_name ?? ''
    const groupB = b.group_name ?? ''
    if (groupA !== groupB) return groupA.localeCompare(groupB, 'sv')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const gameType = games.find(g => g.id === selectedGameId)?.game_type ?? ''

  const cards = (list: GameSystem[]) => list.map(system => (
    <SystemCard
      key={system.id}
      system={system}
      currentUserId={currentUserId}
      onDeleted={handleDeleted}
      winnersByRace={winners}
      gameType={gameType}
      gameId={selectedGameId}
    />
  ))

  return (
    <div className="ta-page">
      <GameSelect games={games} value={selectedGameId} onChange={handleGameChange} />

      {loading ? (
        <p className="ta-text" role="status">Laddar system …</p>
      ) : myDrafts.length === 0 && sortedSaved.length === 0 ? (
        <EmptyState
          title="Inga system för omgången"
          text="Tryck på startnumren i loppvyn, så sparas systemet som utkast medan du bygger."
          action={selectedGameId ? <Link href={`/?game=${encodeURIComponent(selectedGameId)}`} className="ta-btn ta-btn-primary">Bygg ett system</Link> : undefined}
        />
      ) : (
        <>
          {myDrafts.length > 0 && (
            <section className="ta-section">
              <h2 className="ta-section-title">Utkast</h2>
              {cards(myDrafts)}
            </section>
          )}
          {sortedSaved.length > 0 && (
            <section className="ta-section">
              <h2 className="ta-section-title">Sparade system</h2>
              {cards(sortedSaved)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
