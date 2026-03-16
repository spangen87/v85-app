import { SupabaseClient } from '@supabase/supabase-js'
import { SystemSelection } from '@/lib/types'

export async function gradeSystemsForGame(
  supabase: SupabaseClient,
  gameId: string
): Promise<void> {
  // Hämta antalet avdelningar i spelet
  const { data: races, error: racesError } = await supabase
    .from('races')
    .select('race_number')
    .eq('game_id', gameId)

  if (racesError || !races?.length) return
  const totalRaces = races.length

  // Hämta vinnare (finish_position = 1) per avdelning för detta spel
  const { data: winners, error: winnersError } = await supabase
    .from('starters')
    .select('horse_id, races!inner(race_number, game_id)')
    .eq('races.game_id', gameId)
    .eq('finish_position', 1)

  if (winnersError || !winners?.length) return

  // Bygg map: race_number → winning horse_id
  const winnerMap = new Map<number, string>()
  for (const w of winners) {
    const race = w.races as unknown as { race_number: number; game_id: string }
    winnerMap.set(race.race_number, w.horse_id)
  }

  // Rätta bara om alla avdelningar har en vinnare — annars otillräckliga data
  if (winnerMap.size < totalRaces) return

  // Hämta alla ograttade system för detta game_id
  const { data: systems, error: systemsError } = await supabase
    .from('game_systems')
    .select('id, selections')
    .eq('game_id', gameId)
    .eq('is_graded', false)

  if (systemsError || !systems?.length) return

  // Rätta varje system
  await Promise.all(systems.map(async (system) => {
    const selections = system.selections as SystemSelection[]
    let score = 0
    for (const sel of selections) {
      const winner = winnerMap.get(sel.race_number)
      if (winner && sel.horses.some(h => h.horse_id === winner)) {
        score++
      }
    }
    await supabase
      .from('game_systems')
      .update({ score, is_graded: true })
      .eq('id', system.id)
  }))
}
