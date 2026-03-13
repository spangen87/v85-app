import { NextRequest, NextResponse } from "next/server";
import { fetchV85Game, fetchHorseStarts } from "@/lib/atg";
import { calculateFormscore } from "@/lib/formscore";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gameDate: string | undefined = body.date;

  try {
    const game = await fetchV85Game(gameDate);

    // Berika starters med senaste 5 lopp (lopp för lopp för att undvika rate-limiting)
    for (const race of game.races) {
      await Promise.all(
        race.starters.map(async (starter) => {
          starter.last_5_results = await fetchHorseStarts(starter.horse_id);
        })
      );
    }

    const supabase = createServiceClient();

    await supabase.from("games").upsert({
      id: game.game_id,
      game_type: game.game_type,
      date: game.date,
      track: game.track,
    });

    for (const race of game.races) {
      const raceId = `${game.game_id}_${race.race_number}`;

      await supabase.from("races").upsert({
        id: raceId,
        game_id: game.game_id,
        race_number: race.race_number,
        race_name: race.race_name,
        distance: race.distance,
        start_method: race.start_method,
        start_time: race.start_time || null,
        track_surface: null,
      });

      // Upsert horses (stable data — ignorera dubbletter, uppdatera ej)
      const horseUpserts = race.starters.map((s) => ({
        id: s.horse_id,
        name: s.horse_name,
      }));
      if (horseUpserts.length > 0) {
        await supabase.from("horses").upsert(horseUpserts, { ignoreDuplicates: true });
      }

      const scores = calculateFormscore(race.starters);

      await supabase.from("starters").delete().eq("race_id", raceId);
      const starterRows = race.starters.map((s, i) => ({
        race_id: raceId,
        horse_id: s.horse_id,
        start_number: s.start_number,
        post_position: s.post_position,
        driver: s.driver,
        driver_win_pct: s.driver_win_pct,
        trainer: s.trainer,
        trainer_win_pct: s.trainer_win_pct,
        odds: s.odds,
        bet_distribution: s.bet_distribution,
        // Skoinfo
        shoes_reported: s.shoes_reported,
        shoes_front: s.shoes_front,
        shoes_back: s.shoes_back,
        shoes_front_changed: s.shoes_front_changed,
        shoes_back_changed: s.shoes_back_changed,
        sulky_type: s.sulky_type,
        // Häststats
        horse_age: s.horse_age,
        horse_sex: s.horse_sex,
        horse_color: s.horse_color,
        pedigree_father: s.pedigree_father,
        home_track: s.home_track,
        // Karriär
        starts_total: s.starts_total,
        wins_total: s.wins_total,
        places_2nd: s.places_2nd,
        places_3rd: s.places_3rd,
        earnings_total: s.earnings_total,
        starts_current_year: s.starts_current_year,
        wins_current_year: s.wins_current_year,
        places_2nd_current_year: s.places_2nd_current_year,
        places_3rd_current_year: s.places_3rd_current_year,
        starts_prev_year: s.starts_prev_year,
        wins_prev_year: s.wins_prev_year,
        places_2nd_prev_year: s.places_2nd_prev_year,
        places_3rd_prev_year: s.places_3rd_prev_year,
        p_odds: s.p_odds,
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
