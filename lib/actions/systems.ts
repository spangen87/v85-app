'use server'

import { createClient } from '@/lib/supabase/server'
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
  const { data: { user } } = await supabase.auth.getUser()
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
