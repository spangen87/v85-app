/**
 * Fyller i hästhistorik och resultat i efterhand för alla sparade omgångar.
 *
 * Bakgrund: fram till rättelsen av datainsamlingen sparades ingen
 * starthistorik (last_5_results/horse_starts_history) och ingen km-tid i
 * resultaten (finish_time). ATG:s /races/{id}/extended levererar historiken
 * som den såg ut vid loppet — även för avgjorda lopp — så den kan
 * efterkonstrueras utan läckage.
 *
 * Fyller även i races.first_prize/breed och starters.start_distance/start_points
 * (migration v14, Grundchans) ur spel-JSON:en.
 *
 * Skriptet rör bara historik-, resultat- och ovan nämnda kolumner. Odds, streck och övrig
 * startlistedata lämnas orörda (en omhämtning av omgången skulle skriva över
 * dem med slutodds). Sparade system rättas för omgångar som fått facit, men
 * inga resultatnotiser skickas för gamla omgångar.
 *
 * Körning:  npm run backfill-history
 *           npm run backfill-history -- --dry   (visar bara, skriver inget)
 *           npm run backfill-history -- --game V85_2026-09-26_6_5   (en omgång)
 *
 * Kör därefter `npm run recompute-formscore` så att lagrad CS använder den
 * nya historiken.
 *
 * Kräver env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (.env.local läses automatiskt om den finns).
 */
import { createClient } from "@supabase/supabase-js";
import { detectBreed, fetchRaceHistories, parseFirstPrize, parseGameResults } from "../lib/atg";
import { gradeSystemsForGame } from "../lib/systems";

const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // filen finns inte — ok
    }
  }
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

  const gameIdx = process.argv.indexOf("--game");
  let query = db.from("games").select("id, date").order("date");
  if (gameIdx >= 0) query = query.eq("id", process.argv[gameIdx + 1]);
  const { data: games, error } = await query;
  if (error) throw new Error(`games: ${error.message}`);
  console.log(`${games.length} omgångar${dry ? " (torrkörning — inget skrivs)" : ""}\n`);

  const totals = { history: 0, results: 0, graded: 0 };
  for (const game of games) {
    const res = await fetch(`${ATG_BASE}/games/${game.id}`, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`${game.id}: ATG svarade ${res.status} — hoppar över`);
      continue;
    }
    const raw = await res.json();
    const atgRaces = (raw["races"] as Record<string, unknown>[]) ?? [];

    const { data: races } = await db
      .from("races")
      .select("id, race_number")
      .eq("game_id", game.id)
      .order("race_number");

    // --- Historik per avdelning (ett anrop per lopp) ---
    let historyRows = 0;
    let starterRows = 0;
    for (const race of races ?? []) {
      const atgRaceId = atgRaces[race.race_number - 1]?.["id"];
      if (!atgRaceId) continue;
      const atgRace = atgRaces[race.race_number - 1] ?? {};
      const atgStarts = (atgRace["starts"] as Record<string, unknown>[] | undefined) ?? [];
      const startByNumber = new Map(atgStarts.map((s) => [Number(s["number"]), s]));
      if (!dry) {
        await db
          .from("races")
          .update({ first_prize: parseFirstPrize(atgRace["prize"]), breed: detectBreed(atgRace["terms"]) })
          .eq("id", race.id);
      }
      const histories = await fetchRaceHistories(String(atgRaceId), game.date);
      const { data: starters } = await db
        .from("starters")
        .select("id, start_number")
        .eq("race_id", race.id);
      for (const s of starters ?? []) {
        starterRows++;
        const atgStart = startByNumber.get(s.start_number) ?? {};
        const life = ((atgStart["horse"] as Record<string, unknown> | undefined)?.["statistics"] as Record<string, unknown> | undefined)?.["life"] as Record<string, unknown> | undefined;
        const patch: Record<string, unknown> = {
          start_distance: atgStart["distance"] != null ? Number(atgStart["distance"]) : null,
          start_points: life?.["startPoints"] != null ? Number(life["startPoints"]) : null,
        };
        const history = histories.get(s.start_number);
        if (history && history.length > 0) {
          historyRows++;
          patch.last_5_results = history.slice(0, 5);
          patch.horse_starts_history = history;
        }
        if (!dry) {
          const { error: upErr } = await db.from("starters").update(patch).eq("id", s.id);
          if (upErr) console.warn(`  ${race.id} nr ${s.start_number}: ${upErr.message}`);
        }
      }
    }

    // --- Resultat (slutplacering + km-tid) om omgången är avgjord ---
    let resultRows = 0;
    const results = parseGameResults(raw);
    if (results.is_complete) {
      const raceIdByIndex = new Map((races ?? []).map((r) => [r.race_number - 1, r.id as string]));
      for (const r of results.results) {
        const raceId = raceIdByIndex.get(r.race_index);
        if (!raceId) continue;
        resultRows++;
        if (!dry) {
          await db
            .from("starters")
            .update({ finish_position: r.finish_position, finish_time: r.finish_time })
            .eq("race_id", raceId)
            .eq("start_number", r.start_number);
        }
      }
      if (!dry) {
        const graded = await gradeSystemsForGame(db, game.id);
        totals.graded += graded.length;
      }
    }

    totals.history += historyRows;
    totals.results += resultRows;
    console.log(
      `${game.id}: historik ${historyRows}/${starterRows} starter, ` +
        (results.is_complete ? `resultat ${resultRows} starter` : "inga resultat ännu")
    );
  }

  console.log(
    `\nKlart: historik för ${totals.history} starter, resultat för ${totals.results} starter` +
      (dry ? "" : `, system rättade i ${totals.graded} sällskap (inga notiser skickade)`)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
