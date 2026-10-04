'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SystemCard } from './SystemCard'
import { BetsSection } from './BetsSection'
import { LeagueTable } from './LeagueTable'
import { EmptyState } from '@/components/ui'
import { getGroupSystems, getWinnersForGame, type GroupLeague } from '@/lib/actions/systems'
import { getMyLoggedSystemIds } from '@/lib/actions/bets'
import type { GameSystem } from '@/lib/types'

interface SpelTabProps {
  groupId: string
  gameId: string
  gameType: string
  /** System som redan är hämtade (sidans standardomgång); null = hämta */
  initialSystems: GameSystem[] | null
  league: GroupLeague
  currentUserId: string
}

export function SpelTab({ groupId, gameId, gameType, initialSystems, league, currentUserId }: SpelTabProps) {
  const [systems, setSystems] = useState<GameSystem[] | null>(initialSystems)
  const [winnersByRace, setWinnersByRace] = useState<Record<number, string>>({})
  const [loggedSystemIds, setLoggedSystemIds] = useState<Set<string>>(new Set())
  const [betsRefresh, setBetsRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    getWinnersForGame(gameId).then((w) => { if (!cancelled) setWinnersByRace(w) }).catch(() => {})
    return () => { cancelled = true }
  }, [gameId])

  useEffect(() => {
    if (systems !== null) return
    let cancelled = false
    getGroupSystems(groupId, gameId)
      .then((data) => { if (!cancelled) setSystems(data) })
      .catch(() => { if (!cancelled) setSystems([]) })
    return () => { cancelled = true }
  }, [groupId, gameId, systems])

  useEffect(() => {
    getMyLoggedSystemIds(groupId)
      .then((ids) => setLoggedSystemIds(new Set(ids)))
      .catch(() => {})
  }, [groupId])

  function handleBetLogged(systemId: string) {
    setLoggedSystemIds(prev => new Set(prev).add(systemId))
    setBetsRefresh(n => n + 1)
  }

  function handleDeleted(id: string) {
    setSystems(prev => (prev ?? []).filter(s => s.id !== id))
  }

  const buildHref = `/?game=${encodeURIComponent(gameId)}&groupId=${encodeURIComponent(groupId)}`
  const list = systems ?? []
  const drafts = list.filter(s => s.is_draft)
  const saved = [...list.filter(s => !s.is_draft)].sort((a, b) => {
    if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1
    if (a.user_id !== currentUserId && b.user_id === currentUserId) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const card = (system: GameSystem) => (
    <SystemCard
      key={system.id}
      system={system}
      currentUserId={currentUserId}
      onDeleted={handleDeleted}
      winnersByRace={winnersByRace}
      gameType={gameType}
      gameId={gameId}
      alreadyLogged={loggedSystemIds.has(system.id)}
      onBetLogged={handleBetLogged}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      {systems === null ? (
        <p className="ta-text" role="status">Laddar system …</p>
      ) : list.length === 0 ? (
        <EmptyState
          title="Inga system för omgången"
          text="Spara ett system till sällskapet, så rättas det mot resultaten och ni ser vem som fick flest rätt."
          action={<Link href={buildHref} className="ta-btn ta-btn-primary">Bygg system</Link>}
        />
      ) : (
        <>
          <div><Link href={buildHref} className="ta-btn ta-btn-primary">Bygg system</Link></div>
          {drafts.length > 0 && (
            <section className="ta-section">
              <h2 className="ta-section-title">Utkast</h2>
              {drafts.map(card)}
            </section>
          )}
          {saved.length > 0 && (
            <section className="ta-section">
              <h2 className="ta-section-title">Sparade system</h2>
              {saved.map(card)}
            </section>
          )}
        </>
      )}

      <LeagueTable league={league} />

      <BetsSection groupId={groupId} gameId={gameId} currentUserId={currentUserId} refreshSignal={betsRefresh} />
    </div>
  )
}
