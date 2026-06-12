/**
 * Räknar om lagrad Composite Score (starters.formscore) för alla omgångar med
 * de aktuella vikterna i lib/formscore.ts → CS_WEIGHTS.
 *
 * Bakgrund: formscore beräknas vid omgångshämtning. Omgångar som hämtades innan
 * vikterna kalibrerades om bär därför poäng från gamla vikter, vilket gör att
 * Top 5, sortering och utvärderingssidan visar inaktuella tal. Det här skriptet
 * läser samma data som produktionen, kör om calculateCompositeScore och skriver
 * tillbaka — idempotent, kör om när helst vikterna ändrats.
 *
 * Körning:  npm run recompute-formscore
 *           npm run recompute-formscore -- --dry   (visar bara, skriver inget)
 *
 * Kräver env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (.env.local läses automatiskt om den finns).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateCompositeScore, type RaceContext } from "../lib/formscore";
import type { AtgStarter } from "../lib/atg";
import type { TrackConfig } from "../lib/types";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // filen finns inte — ok
    }
  }
}

// Mappar en starters-rad från DB till AtgStarter (samma fältuppsättning som
// scripts/backtest-weights.ts — endast fält som påverkar CS behöver vara exakta)
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
    horse_starts_history: Array.isArray(r.horse_starts_history)
      ? r.horse_starts_history
      : undefined,
  };
}

async function fetchAllStarters(db: SupabaseClient): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("starters")
      .select("*")
      .order("race_id")
      .order("start_number")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`starters: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function main() {
  loadEnv();
  const dry = process.argv.includes("--dry");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Saknar NEXT_PUBLIC_SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY i miljön.");
    process.exit(1);
  }
  const db = createClient(url, key);

  console.log("Läser games, track_configs, races och starters …");
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

  const allStarters = await fetchAllStarters(db);
  console.log(`${allStarters.length} starters i ${raceById.size} avdelningar.\n`);

  // Gruppera per lopp och bevara radordning (start_number)
  const byRace = new Map<string, Record<string, unknown>[]>();
  for (const s of allStarters) {
    const rid = s.race_id as string;
    if (!byRace.has(rid)) byRace.set(rid, []);
    byRace.get(rid)!.push(s);
  }

  // Bygg listan av uppdateringar (rad-id → ny formscore)
  const updates: { id: string; from: number | null; to: number }[] = [];
  let skipped = 0;
  for (const [raceId, rows] of byRace) {
    const meta = raceById.get(raceId);
    if (!meta) {
      skipped += rows.length;
      continue;
    }
    const starters = rows.map(rowToStarter);
    const ctx: RaceContext = {
      distance: meta.distance,
      start_method: meta.start_method,
      field_size: starters.length,
    };
    const track = trackByGame.get(meta.game_id) ?? null;
    const config = track ? configByTrack.get(track) : undefined;
    const scores = calculateCompositeScore(starters, ctx, config);
    rows.forEach((r, i) => {
      const id = r.id as string;
      const oldScore = typeof r.formscore === "number" ? r.formscore : null;
      if (id && oldScore !== scores[i]) {
        updates.push({ id, from: oldScore, to: scores[i] });
      }
    });
  }

  const changed = updates.length;
  console.log(
    `${changed} rader får ny formscore${skipped ? ` (${skipped} hoppade över — saknar avdelning)` : ""}.`
  );
  // Visa ett par exempel på största förändringarna
  const sample = [...updates]
    .sort((a, b) => Math.abs((b.to - (b.from ?? 0))) - Math.abs((a.to - (a.from ?? 0))))
    .slice(0, 5);
  for (const u of sample) {
    console.log(`  ${u.id.slice(0, 8)}…  ${u.from ?? "–"} → ${u.to}`);
  }

  if (dry) {
    console.log("\n--dry: inget skrevs.");
    return;
  }
  if (changed === 0) {
    console.log("\nInget att uppdatera — alla poäng är redan aktuella.");
    return;
  }

  console.log("\nSkriver uppdateringar …");
  const CONCURRENCY = 20;
  let written = 0;
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((u) => db.from("starters").update({ formscore: u.to }).eq("id", u.id))
    );
    for (const res of results) {
      if (res.error) console.error(`  fel: ${res.error.message}`);
      else written++;
    }
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, updates.length)}/${updates.length}`);
  }
  console.log(`\nKlart — ${written} rader uppdaterade.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
