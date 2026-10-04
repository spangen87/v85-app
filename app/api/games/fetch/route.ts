import { NextRequest, NextResponse } from "next/server";
import { fetchGame, fetchRaceHistories, HorseStart } from "@/lib/atg";
import { calculateCompositeScore } from "@/lib/formscore";
import { computeFundamentalForRows, MODEL, type FundamentalResult } from "@/lib/fundamental";
import { getTrackConfig } from "@/lib/actions/tracks";
import { buildOddsSnapshots, saveOddsSnapshots, type OddsSnapshotRow } from "@/lib/oddsSnapshots";
import { createServiceClient } from "@/lib/supabase/server";

// Historikhämtningen (ett anrop per avdelning, med retry) kan ta längre tid
// än standardgränsen
export const maxDuration = 60;

type ExistingStarter = {
  horse_id: string;
  last_5_results: HorseStart[] | null;
  horse_starts_history: HorseStart[] | null;
  formscore: number | null;
  finish_position: number | null;
  finish_time: string | null;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gameType: string = body.gameType ?? "V85";
  const gameId: string = body.gameId;

  if (!gameId) {
    return NextResponse.json({ error: "gameId krävs" }, { status: 400 });
  }

  try {
    const game = await fetchGame(gameType, gameId);

    // Banspecifik konfiguration (open stretch m.m.) ska påverka spårfaktorn i CS
    const trackConfigRaw = game.track ? await getTrackConfig(game.track) : null;
    const trackConfig = trackConfigRaw?.active ? trackConfigRaw : undefined;

    const supabase = createServiceClient();

    await supabase.from("games").upsert({
      id: game.game_id,
      game_type: game.game_type,
      date: game.date,
      track: game.track,
    });

    // Hämta befintliga starters INNAN vi raderar — bevara last_5_results, finish_position och finish_time
    const { data: oldRaces } = await supabase
      .from("races")
      .select("id")
      .eq("game_id", game.game_id);

    const existingMap = new Map<string, ExistingStarter>();
    if (oldRaces && oldRaces.length > 0) {
      const oldIds = oldRaces.map((r: { id: string }) => r.id);
      const { data: existingStarterData } = await supabase
        .from("starters")
        .select("horse_id, last_5_results, horse_starts_history, formscore, finish_position, finish_time")
        .in("race_id", oldIds);
      for (const s of (existingStarterData ?? []) as ExistingStarter[]) {
        existingMap.set(s.horse_id, s);
      }
      await supabase.from("starters").delete().in("race_id", oldIds);
      await supabase.from("races").delete().eq("game_id", game.game_id);
    }

    // Fyll i last_5_results från DB om ATG-anropet returnerade tomt (rate-limiting etc.)
    for (const race of game.races) {
      for (const starter of race.starters) {
        if (starter.last_5_results.length === 0) {
          const existing = existingMap.get(starter.horse_id);
          if (existing?.last_5_results && existing.last_5_results.length > 0) {
            starter.last_5_results = existing.last_5_results;
          }
        }
      }
    }

    // Ögonblicksbild av odds och streck för varje start (samma tidsstämpel för hela hämtningen)
    const capturedAt = new Date().toISOString();
    const snapshots: OddsSnapshotRow[] = [];

    for (const race of game.races) {
      const raceId = `${game.game_id}_${race.race_number}`;

      await supabase.from("races").upsert({
        id: raceId,
        game_id: game.game_id,
        race_number: race.race_number,
        race_name: race.race_name,
        distance: race.distance,
        start_method: race.start_method,
        first_prize: race.first_prize,
        breed: race.breed,
        start_time: race.start_time || null,
        track_surface: null,
      });

      // Filtrera bort starters utan giltigt horse_id (saknas i ATG-svaret)
      const validStarters = race.starters.filter((s) => {
        if (!s.horse_id) {
          console.warn(`[fetch] Avd ${race.race_number}: starter saknar horse_id (nr=${s.start_number}, namn=${s.horse_name}) — hoppas över`);
        }
        return !!s.horse_id;
      });

      // Deduplicera — ATG kan ibland returnera samma häst två gånger i ett lopp
      const seenHorseIds = new Set<string>();
      const uniqueStarters = validStarters.filter((s) => {
        if (seenHorseIds.has(s.horse_id)) return false;
        seenHorseIds.add(s.horse_id);
        return true;
      });

      console.log(`[fetch] Avd ${race.race_number}: ATG=${race.starters.length}, giltiga=${validStarters.length}, unika=${uniqueStarters.length}`);
      snapshots.push(...buildOddsSnapshots(game.game_id, raceId, race.race_number, uniqueStarters, capturedAt));

      // Hämta starterhistorik för hela avdelningen med ett anrop
      // (/races/{id}/extended ger de 5 senaste starterna per häst)
      if (race.atg_race_id) {
        const histories = await fetchRaceHistories(race.atg_race_id, game.date || undefined);
        for (const starter of uniqueStarters) {
          const starts = histories.get(starter.start_number);
          if (starts && starts.length > 0) {
            starter.last_5_results = starts.slice(0, 5);
            starter.horse_starts_history = starts;
          }
        }
      }

      // Fallback: bevara historik från tidigare hämtning om ATG-anropet misslyckades
      for (const starter of uniqueStarters) {
        if (!starter.horse_starts_history || starter.horse_starts_history.length === 0) {
          const existing = existingMap.get(starter.horse_id);
          if (existing?.horse_starts_history && existing.horse_starts_history.length > 0) {
            starter.horse_starts_history = existing.horse_starts_history;
          }
        }
      }

      // Logga datatäckningen — tysta bortfall här har tidigare gjort att form-,
      // galopp- och kuskkomponenterna saknat data utan att det syntes
      const withHistory = uniqueStarters.filter((s) => s.last_5_results.length > 0).length;
      const withDriverPct = uniqueStarters.filter((s) => s.driver_win_pct != null).length;
      if (withHistory < uniqueStarters.length || withDriverPct === 0) {
        console.warn(
          `[fetch] Avd ${race.race_number}: starterhistorik ${withHistory}/${uniqueStarters.length}, kuskstatistik ${withDriverPct}/${uniqueStarters.length}`
        );
      }

      // Upsert horses — uppdatera namn om det har ändrats
      const horseUpserts = uniqueStarters.map((s) => ({
        id: s.horse_id,
        name: s.horse_name,
      }));
      if (horseUpserts.length > 0) {
        const { error: horseErr } = await supabase.from("horses").upsert(horseUpserts, { onConflict: "id" });
        if (horseErr) console.error(`[fetch] horses.upsert fel avd ${race.race_number}:`, horseErr.message);
      }

      // Composite Score beräknas med merged last_5_results (inkl. fallback från DB)
      const scores = calculateCompositeScore(uniqueStarters, {
        distance: race.distance,
        start_method: race.start_method,
        field_size: uniqueStarters.length,
      }, trackConfig);
      if (scores.length !== uniqueStarters.length) {
        console.error(`[fetch] Formscore-längd matchar inte starters (${scores.length} vs ${uniqueStarters.length}) avd ${race.race_number}`);
      }

      // Grundchans (odds-fri) — fel här får inte stoppa hämtningen
      let fundamental: (FundamentalResult | null)[] = uniqueStarters.map(() => null);
      try {
        fundamental = computeFundamentalForRows(
          { distance: race.distance, start_method: race.start_method, breed: race.breed, first_prize: race.first_prize },
          game.date || new Date().toISOString().slice(0, 10),
          uniqueStarters
        );
      } catch (err) {
        console.error(`[fetch] Grundchans fel avd ${race.race_number}:`, err instanceof Error ? err.message : String(err));
      }

      await supabase.from("starters").delete().eq("race_id", raceId);
      const starterRows = uniqueStarters.map((s, i) => {
        const existing = existingMap.get(s.horse_id);
        return {
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
          start_distance: s.start_distance ?? null,
          start_points: s.start_points ?? null,
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
          horse_starts_history: s.horse_starts_history ?? null,
          formscore: scores[i],
          fundamental_p: fundamental[i]?.p ?? null,
          fundamental_version: fundamental[i]?.p != null ? MODEL.version : null,
          // Bevara resultat från tidigare hämtning
          finish_position: existing?.finish_position ?? null,
          finish_time: existing?.finish_time ?? null,
        };
      });
      const { error: insertErr } = await supabase.from("starters").insert(starterRows);
      if (insertErr) console.error(`[fetch] starters.insert fel avd ${race.race_number}:`, insertErr.message);
    }

    // Får inte stoppa hämtningen — saknas tabellen (migration v15) loggas det bara
    await saveOddsSnapshots(supabase, snapshots);

    const totalStarters = game.races.reduce((sum, r) => sum + r.starters.length, 0);
    return NextResponse.json({ success: true, game_id: game.game_id, races: game.races.length, starters: totalStarters });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
