import { NextRequest, NextResponse } from "next/server";
import { fetchV85Game } from "@/lib/atg";
import { calculateFormscore } from "@/lib/formscore";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gameDate: string | undefined = body.date;

  try {
    const game = await fetchV85Game(gameDate);
    const supabase = createServiceClient();

    // Upsert game
    await supabase.from("games").upsert({
      id: game.game_id,
      game_type: game.game_type,
      date: game.date,
      track: game.track,
    });

    for (const race of game.races) {
      const raceId = `${game.game_id}_${race.race_number}`;

      // Upsert race
      await supabase.from("races").upsert({
        id: raceId,
        game_id: game.game_id,
        race_number: race.race_number,
        distance: race.distance,
        start_method: race.start_method,
        track_surface: null,
      });

      // Upsert horses
      const horseUpserts = race.starters.map((s) => ({
        id: s.horse_id,
        name: s.horse_name,
      }));
      if (horseUpserts.length > 0) {
        await supabase.from("horses").upsert(horseUpserts, { ignoreDuplicates: true });
      }

      // Beräkna formscore för hela loppet
      const scores = calculateFormscore(race.starters);

      // Ta bort gamla starters och lägg in nya
      await supabase.from("starters").delete().eq("race_id", raceId);
      const starterRows = race.starters.map((s, i) => ({
        race_id: raceId,
        horse_id: s.horse_id,
        start_number: s.start_number,
        driver: s.driver,
        trainer: s.trainer,
        odds: s.odds,
        bet_distribution: s.bet_distribution,
        starts_total: s.starts_total,
        wins_total: s.wins_total,
        earnings_total: s.earnings_total,
        starts_current_year: s.starts_current_year,
        wins_current_year: s.wins_current_year,
        starts_prev_year: s.starts_prev_year,
        wins_prev_year: s.wins_prev_year,
        best_time: s.best_time,
        life_records: s.life_records,
        last_5_results: s.last_5_results,
        formscore: scores[i],
      }));
      await supabase.from("starters").insert(starterRows);
    }

    return NextResponse.json({ success: true, game_id: game.game_id, races: game.races.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
