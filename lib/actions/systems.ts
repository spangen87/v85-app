'use server'

import { createClient } from '@/lib/supabase/server'
import type { GameSystem, SystemSelection } from '@/lib/types'

type RawSystemRow = Omit<GameSystem, 'author_display_name'>

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
  totalRows: number
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
    })
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
    .select('*')
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as RawSystemRow[]
  const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))]
  const names = await fetchDisplayNames(supabase, uniqueUserIds)

  return rows.map((row) => ({
    ...row,
    author_display_name: names.get(row.user_id) ?? 'Okänd',
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
