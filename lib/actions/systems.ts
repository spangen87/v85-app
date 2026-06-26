'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/guards'
import type { GameSystem, SystemSelection } from '@/lib/types'

type RawSystemRow = Omit<GameSystem, 'author_display_name' | 'group_name'>

type RawSystemWithGroup = RawSystemRow & {
  groups: { name: string } | null
}

async function fetchDisplayNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)
  const map = new Map<string, string>()
  for (const p of data ?? []) map.set(p.id, p.display_name ?? 'Okänd')
  return map
}

export async function createSystem(
  groupId: string | null,
  gameId: string,
  name: string,
  selections: SystemSelection[],
  totalRows: number,
  isDraft = false
): Promise<GameSystem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('game_systems')
    .insert({
      user_id: user.id,
      group_id: groupId,
      game_id: gameId,
      name,
      selections,
      total_rows: totalRows,
      is_draft: isDraft,
    })
    .select()
    .single()

  if (error) throw error
  return data as GameSystem
}

/** Hämtar användarens utkast för ett visst spel (max ett per spel och användare) */
export async function getDraftForGame(gameId: string): Promise<GameSystem | null> {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('game_systems')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .eq('is_draft', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data as GameSystem | null
}

/** Uppdaterar ett utkasts vald hästar och radantal */
export async function updateDraft(
  draftId: string,
  selections: SystemSelection[],
  totalRows: number
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('game_systems')
    .update({ selections, total_rows: totalRows })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .eq('is_draft', true)

  if (error) throw error
}

/** Hämtar alla utkast för användaren för ett givet spel */
export async function getUserDraftsForGame(gameId: string): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('game_systems')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .eq('is_draft', true)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as GameSystem[]
}

/** Gör om ett utkast till ett sparat system (is_draft → false) */
export async function publishDraft(
  draftId: string,
  name: string,
  groupId: string | null
): Promise<GameSystem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('game_systems')
    .update({ is_draft: false, name, group_id: groupId })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as GameSystem
}

export async function getGroupSystems(
  groupId: string,
  gameId: string
): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('game_systems')
    .select('*, groups(name)')
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as RawSystemWithGroup[]
  const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
  const names = await fetchDisplayNames(supabase, uniqueUserIds)

  return rows.map(({ groups, ...rest }) => ({
    ...rest,
    group_name: groups?.name ?? null,
    author_display_name: names.get(rest.user_id) ?? 'Okänd',
  }))
}

export async function getUserSystemsForGame(
  gameId: string
): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('game_systems')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as GameSystem[]
}

export async function getSystemsForUser(
  gameId: string
): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // RLS-policyn "Users can view own and group systems" hanterar filtreringen:
  // USING (auth.uid() = user_id OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
  // Ingen explicit .or()-filter behövs — RLS returnerar exakt rätt rader.
  const { data, error } = await supabase
    .from('game_systems')
    .select('*, groups(name)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as RawSystemWithGroup[]
  const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
  const names = await fetchDisplayNames(supabase, uniqueUserIds)

  return rows.map(({ groups, ...rest }) => ({
    ...rest,
    group_name: groups?.name ?? null,
    author_display_name: names.get(rest.user_id) ?? 'Okänd',
  }))
}

export async function deleteSystem(systemId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('game_systems')
    .delete()
    .eq('id', systemId)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function getWinnersForGame(
  gameId: string
): Promise<Record<number, string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('starters')
    .select('horse_id, races!inner(race_number, game_id)')
    .eq('races.game_id', gameId)
    .eq('finish_position', 1)

  if (error) throw error

  const result: Record<number, string> = {}
  for (const w of data ?? []) {
    const race = w.races as unknown as { race_number: number }
    result[race.race_number] = w.horse_id
  }
  return result
}

/** En medlems rad i sällskapsligan */
export interface LeagueRow {
  user_id: string
  display_name: string
  /** Antal rättade omgångar medlemmen hade system i */
  rounds: number
  /** Summa av bästa systemets rätt per omgång */
  total_score: number
  /** Snitträtt per omgång (en decimal) */
  avg_score: number
  /** Bästa enskilda omgång */
  best_score: number
  /** Bäst i sällskapet i den senast rättade omgången */
  is_last_round_winner: boolean
}

export interface GroupLeague {
  rows: LeagueRow[]
  /** Speldatum för den senast rättade omgången som ingår */
  last_round_date: string | null
}

/**
 * Sällskapsligan: medlemmarnas systemträffar över alla rättade omgångar.
 * Har en medlem flera system i samma omgång räknas det bästa — ligan mäter
 * tävlingen, inte volymen. RLS begränsar till sällskapets medlemmar.
 */
export async function getGroupLeague(groupId: string): Promise<GroupLeague> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('game_systems')
    .select('user_id, game_id, score, games(date)')
    .eq('group_id', groupId)
    .eq('is_graded', true)
    .eq('is_draft', false)
    .not('score', 'is', null)

  if (error) throw error

  type Row = { user_id: string; game_id: string; score: number; games: { date: string } | null }
  const rows = (data ?? []) as unknown as Row[]
  if (rows.length === 0) return { rows: [], last_round_date: null }

  // Bästa systemet per medlem och omgång
  const bestPerUserGame = new Map<string, { user_id: string; game_id: string; score: number; date: string }>()
  for (const r of rows) {
    const key = `${r.user_id}|${r.game_id}`
    const existing = bestPerUserGame.get(key)
    if (!existing || r.score > existing.score) {
      bestPerUserGame.set(key, {
        user_id: r.user_id,
        game_id: r.game_id,
        score: r.score,
        date: r.games?.date ?? '',
      })
    }
  }
  const entries = [...bestPerUserGame.values()]

  // Senast rättade omgången + dess vinnar-score
  const lastRoundDate = entries.reduce((max, e) => (e.date > max ? e.date : max), '')
  const lastRoundEntries = entries.filter((e) => e.date === lastRoundDate)
  const lastRoundBest = Math.max(...lastRoundEntries.map((e) => e.score))
  const lastRoundWinners = new Set(
    lastRoundEntries.filter((e) => e.score === lastRoundBest).map((e) => e.user_id)
  )

  // Aggregera per medlem
  const byUser = new Map<string, { rounds: number; total: number; best: number }>()
  for (const e of entries) {
    const agg = byUser.get(e.user_id) ?? { rounds: 0, total: 0, best: 0 }
    agg.rounds += 1
    agg.total += e.score
    agg.best = Math.max(agg.best, e.score)
    byUser.set(e.user_id, agg)
  }

  const names = await fetchDisplayNames(supabase, [...byUser.keys()])

  const leagueRows: LeagueRow[] = [...byUser.entries()]
    .map(([user_id, agg]) => ({
      user_id,
      display_name: names.get(user_id) ?? 'Okänd',
      rounds: agg.rounds,
      total_score: agg.total,
      avg_score: Math.round((agg.total / agg.rounds) * 10) / 10,
      best_score: agg.best,
      is_last_round_winner: lastRoundWinners.has(user_id),
    }))
    .sort((a, b) => b.total_score - a.total_score || b.avg_score - a.avg_score)

  return { rows: leagueRows, last_round_date: lastRoundDate || null }
}
