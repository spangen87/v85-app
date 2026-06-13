import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, isAdmin } from "@/lib/supabase/guards";
import { calculateCompositeScore, type RaceContext } from "@/lib/formscore";
import type { AtgStarter } from "@/lib/atg";
import type { TrackConfig } from "@/lib/types";

// Omräkningen rör alla starters i alla omgångar — kan ta längre tid än standard
export const maxDuration = 60;

// Mappar en starters-rad till AtgStarter (samma fältuppsättning som
// scripts/recompute-formscore.ts; endast fält som påverkar CS måste vara exakta)
function rowToStarter(r: Record<string, unknown>): AtgStarter {
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const numOrNull = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    start_number: num(r.start_number),
    post_position: typeof r.post_position === "number" ? r.post_position : 1,
    horse_id: String(r.horse_id ?? ""),
    horse_name: "",
    horse_age: numOrNull(r.horse_age),
    horse_sex: "",
    horse_color: "",
    pedigree_father: "",
    home_track: "",
    driver: String(r.driver ?? ""),
    driver_win_pct: numOrNull(r.driver_win_pct),
    trainer: String(r.trainer ?? ""),
    trainer_win_pct: numOrNull(r.trainer_win_pct),
    odds: numOrNull(r.odds),
    p_odds: numOrNull(r.p_odds),
    bet_distribution: num(r.bet_distribution),
    shoes_reported: !!r.shoes_reported,
    shoes_front: !!r.shoes_front,
    shoes_back: !!r.shoes_back,
    shoes_front_changed: !!r.shoes_front_changed,
    shoes_back_changed: !!r.shoes_back_changed,
    sulky_type: String(r.sulky_type ?? ""),
    starts_total: num(r.starts_total),
    wins_total: num(r.wins_total),
    places_2nd: num(r.places_2nd),
    places_3rd: num(r.places_3rd),
    earnings_total: num(r.earnings_total),
    starts_current_year: num(r.starts_current_year),
    wins_current_year: num(r.wins_current_year),
    places_2nd_current_year: num(r.places_2nd_current_year),
    places_3rd_current_year: num(r.places_3rd_current_year),
    starts_prev_year: num(r.starts_prev_year),
    wins_prev_year: num(r.wins_prev_year),
    places_2nd_prev_year: num(r.places_2nd_prev_year),
    places_3rd_prev_year: num(r.places_3rd_prev_year),
    best_time: String(r.best_time ?? ""),
    life_records: Array.isArray(r.life_records) ? r.life_records : [],
    last_5_results: Array.isArray(r.last_5_results) ? r.last_5_results : [],
    horse_starts_history: Array.isArray(r.horse_starts_history) ? r.horse_starts_history : undefined,
  } as AtgStarter;
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  if (!isAdmin(user.id)) return NextResponse.json({ error: "Endast admin" }, { status: 403 });

  const db = createServiceClient();

  try {
    const [{ data: games }, { data: configs }, { data: races }] = await Promise.all([
      db.from("games").select("id, track"),
      db.from("track_configs").select("*"),
      db.from("races").select("id, game_id, distance, start_method"),
    ]);

    const trackByGame = new Map((games ?? []).map((g) => [g.id, g.track as string | null]));
    const configByTrack = new Map(
      ((configs ?? []) as TrackConfig[]).filter((c) => c.active).map((c) => [c.track_name, c])
    );
    const raceById = new Map(
      (races ?? []).map((r) => [
        r.id as string,
        {
          game_id: r.game_id as string,
          distance: (r.distance as number) ?? 2140,
          start_method: (r.start_method as string) ?? "auto",
        },
      ])
    );

    // Hämta alla starters sidvis
    const allStarters: Record<string, unknown>[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("starters")
        .select("*")
        .order("race_id")
        .order("start_number")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`starters: ${error.message}`);
      allStarters.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    // Gruppera per lopp
    const byRace = new Map<string, Record<string, unknown>[]>();
    for (const s of allStarters) {
      const rid = s.race_id as string;
      if (!byRace.has(rid)) byRace.set(rid, []);
      byRace.get(rid)!.push(s);
    }

    // Räkna om och samla id:n per ny poäng (bulk-update grupperat per score)
    const idsByScore = new Map<number, string[]>();
    let changed = 0;
    let racesProcessed = 0;
    for (const [raceId, rows] of byRace) {
      const meta = raceById.get(raceId);
      if (!meta) continue;
      const starters = rows.map(rowToStarter);
      const ctx: RaceContext = {
        distance: meta.distance,
        start_method: meta.start_method,
        field_size: starters.length,
      };
      const track = trackByGame.get(meta.game_id) ?? null;
      const config = track ? configByTrack.get(track) : undefined;
      const scores = calculateCompositeScore(starters, ctx, config);
      racesProcessed++;
      rows.forEach((r, i) => {
        const id = r.id as string;
        const oldScore = typeof r.formscore === "number" ? r.formscore : null;
        if (id && oldScore !== scores[i]) {
          const arr = idsByScore.get(scores[i]) ?? [];
          arr.push(id);
          idsByScore.set(scores[i], arr);
          changed++;
        }
      });
    }

    // En update per distinkt poäng (max ~101 statements oavsett radantal)
    for (const [score, ids] of idsByScore) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await db
          .from("starters")
          .update({ formscore: score })
          .in("id", ids.slice(i, i + 200));
        if (error) throw new Error(`update score=${score}: ${error.message}`);
      }
    }

    return NextResponse.json({ updated: changed, races: racesProcessed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
