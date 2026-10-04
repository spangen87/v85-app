import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/guards'
import { getSystemsForUser, getWinnersForGame } from '@/lib/actions/systems'
import Link from 'next/link'
import { SystemsPageClient } from '@/components/SystemsPageClient'
import { EmptyState, PageHeader } from '@/components/ui'

async function getAllGames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('games')
    .select('id, date, track, game_type')
    .order('date', { ascending: false })
  return data ?? []
}

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>
}) {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const games = await getAllGames(supabase)

  if (games.length === 0) {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PageHeader title="Mina system" sub="Dina utkast och sparade system per omgång" />
        <div className="ta-page">
          <EmptyState
            title="Ingen omgång inladdad ännu"
            text="Hämta en omgång i loppvyn, så kan du bygga ett system."
            action={<Link href="/" className="ta-btn ta-btn-primary">Till loppvyn</Link>}
          />
        </div>
      </main>
    )
  }

  const selectedId = params.game && games.find(g => g.id === params.game)
    ? params.game
    : games[0].id

  const [systems, winners] = await Promise.all([
    getSystemsForUser(selectedId),
    getWinnersForGame(selectedId),
  ])

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PageHeader title="Mina system" sub="Dina utkast och sparade system per omgång" />
      <SystemsPageClient
        games={games}
        initialGameId={selectedId}
        initialSystems={systems}
        initialWinners={winners}
        currentUserId={user.id}
      />
    </main>
  )
}
