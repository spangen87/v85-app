'use server'

import { createClient } from '@/lib/supabase/server'
import { GameSystem, SystemSelection } from '@/lib/types'

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

type RawSystemRow = Omit<GameSystem, 'author_display_name'> & {
  profiles: { display_name: string } | null
}

export async function getGroupSystems(
  groupId: string,
  gameId: string
): Promise<GameSystem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('game_systems')
    .select(`
      *,
      profiles!game_systems_user_id_fkey(display_name)
    `)
    .eq('group_id', groupId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: RawSystemRow) => ({
    ...row,
    author_display_name: row.profiles?.display_name ?? '',
  })) as GameSystem[]
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
