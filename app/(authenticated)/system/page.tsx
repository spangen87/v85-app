import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSystemsForUser, getWinnersForGame } from '@/lib/actions/systems'
import { SystemsPageClient } from '@/components/SystemsPageClient'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const games = await getAllGames(supabase)

  if (games.length === 0) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-6">Mina system</h1>
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-base mb-1">Ingen omgång inladdad ännu.</p>
            <p className="text-sm">Gå till Analys-fliken för att hämta ett spel.</p>
          </div>
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
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="px-4 pt-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-4">Mina system</h1>
      </div>
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
