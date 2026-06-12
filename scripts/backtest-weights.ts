/**
 * Backtest av Composite Score-vikterna mot faktiska loppresultat.
 *
 * Läser alla lopp med resultat (finish_position) från Supabase, räknar om
 * delkomponenterna med exakt samma logik som produktionen (lib/formscore.ts →
 * computeComponents) och grid-söker viktuppsättningar som maximerar
 * topp-3-täckning (andel lopp där vinnaren finns bland de tre högst rankade).
 *
 * Körning:  npm run backtest            (steg 0.05 i viktrummet)
 *           npm run backtest -- --step 10   (grövre steg 0.10, snabbare)
 *
 * Kräver env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (.env.local läses automatiskt om den finns).
 */
import { createClient } from "@supabase/supabase-js";
import {
  computeComponents,
  CS_WEIGHTS,
  type ComponentName,
  type RaceContext,
} from "../lib/formscore";
import type { AtgStarter } from "../lib/atg";
import type { TrackConfig } from "../lib/types";

const COMPONENT_ORDER = Object.keys(CS_WEIGHTS) as ComponentName[];
const N_COMP = COMPONENT_ORDER.length;

// ---------------------------------------------------------------------------
// Datainläsning
// ---------------------------------------------------------------------------

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // filen finns inte — ok
    }
  }
}

// Mappar en starters-rad från DB till AtgStarter (fält som inte påverkar
// komponenterna får tomma defaultvärden)
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

interface RaceData {
  /** Komponentmatris: nStarters × N_COMP (radvis) */
  comp: Float64Array;
  n: number;
  winnerIdx: number;
}

async function loadRaces(): Promise<RaceData[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Saknar NEXT_PUBLIC_SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY i miljön."
    );
    process.exit(1);
  }
  const db = createClient(url, key);

  const [{ data: games }, { data: configs }, { data: races }] =
    await Promise.all([
      db.from("games").select("id, track"),
      db.from("track_configs").select("*"),
      db.from("races").select("id, game_id, distance, start_method"),
    ]);

  const trackByGame = new Map((games ?? []).map((g) => [g.id, g.track as string | null]));
  const configByTrack = new Map(
    ((configs ?? []) as TrackConfig[])
      .filter((c) => c.active)
      .map((c) => [c.track_name, c])
  );
  const raceById = new Map(
    (races ?? []).map((r) => [
      r.id as string,
      { game_id: r.game_id as string, distance: (r.distance as number) ?? 2140, start_method: (r.start_method as string) ?? "auto" },
    ])
  );

  // Hämta alla starters sidvis (kan vara >1000 rader)
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

  // Gruppera per lopp och behåll lopp som har en vinnare
  const byRace = new Map<string, Record<string, unknown>[]>();
  for (const s of allStarters) {
    const rid = s.race_id as string;
    if (!byRace.has(rid)) byRace.set(rid, []);
    byRace.get(rid)!.push(s);
  }

  const result: RaceData[] = [];
  for (const [raceId, rows] of byRace) {
    const winnerIdx = rows.findIndex((r) => r.finish_position === 1);
    if (winnerIdx < 0) continue;
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
    const vectors = computeComponents(starters, ctx, config);

    const comp = new Float64Array(rows.length * N_COMP);
    for (let i = 0; i < rows.length; i++) {
      for (let k = 0; k < N_COMP; k++) {
        comp[i * N_COMP + k] = vectors[COMPONENT_ORDER[k]][i];
      }
    }
    result.push({ comp, n: rows.length, winnerIdx });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Utvärdering och grid-sökning
// ---------------------------------------------------------------------------

interface Metrics {
  top1: number;
  top3: number;
  /** Genomsnittlig log-loss på vinnaren (lägre = bättre kalibrerat) */
  logloss: number;
}

function evaluate(races: RaceData[], w: number[]): Metrics {
  let top1 = 0;
  let top3 = 0;
  let llSum = 0;
  for (const race of races) {
    const { comp, n, winnerIdx } = race;
    let winnerScore = 0;
    let fieldSum = 0;
    for (let i = 0; i < n; i++) {
      let score = 0;
      for (let k = 0; k < N_COMP; k++) score += w[k] * comp[i * N_COMP + k];
      fieldSum += score;
      if (i === winnerIdx) winnerScore = score;
    }
    // Vinnarens rang = 1 + antal hästar med strikt högre poäng
    let better = 0;
    for (let i = 0; i < n; i++) {
      if (i === winnerIdx) continue;
      let score = 0;
      for (let k = 0; k < N_COMP; k++) score += w[k] * comp[i * N_COMP + k];
      if (score > winnerScore) better++;
    }
    if (better === 0) top1++;
    if (better <= 2) top3++;
    // Sannolikhet = vinnarens poängandel av fältet (samma normalisering som
    // appens "chans"); likformig fördelning om alla poäng är 0
    const pWinner = fieldSum > 0 ? winnerScore / fieldSum : 1 / n;
    llSum += -Math.log(Math.max(pWinner, 1e-12));
  }
  return {
    top1: top1 / races.length,
    top3: top3 / races.length,
    logloss: llSum / races.length,
  };
}

/** Deterministisk PRNG (mulberry32) så att train/test-splitten är reproducerbar */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blandar och delar loppen i train/test (Fisher–Yates med seedad RNG) */
function trainTestSplit(
  races: RaceData[],
  testFraction: number,
  seed: number
): { train: RaceData[]; test: RaceData[] } {
  const rng = makeRng(seed);
  const shuffled = [...races];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const nTest = Math.round(shuffled.length * testFraction);
  return { test: shuffled.slice(0, nTest), train: shuffled.slice(nTest) };
}

/** Alla sätt att fördela `units` enheter över N_COMP vikter (kompositioner) */
function* weightGrid(units: number): Generator<number[]> {
  const w = new Array<number>(N_COMP).fill(0);
  function* rec(slot: number, left: number): Generator<number[]> {
    if (slot === N_COMP - 1) {
      w[slot] = left;
      yield w.map((u) => u / units);
      return;
    }
    for (let u = left; u >= 0; u--) {
      w[slot] = u;
      yield* rec(slot + 1, left - u);
    }
  }
  yield* rec(0, units);
}

function fmtWeights(w: number[]): string {
  return COMPONENT_ORDER.map((name, k) => `${name}=${(w[k] * 100).toFixed(0)}%`).join(" ");
}

/** Binomial standardfel i procentenheter för en andel p över n försök */
function sePct(p: number, n: number): number {
  if (n <= 0) return 0;
  return Math.sqrt((p * (1 - p)) / n) * 100;
}

function fmtMetrics(m: Metrics, n: number): string {
  return (
    `logloss=${m.logloss.toFixed(4)}  ` +
    `top1=${(m.top1 * 100).toFixed(1)}±${sePct(m.top1, n).toFixed(1)}%  ` +
    `top3=${(m.top3 * 100).toFixed(1)}±${sePct(m.top3, n).toFixed(1)}%`
  );
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnv();
  // steg i hundradelar: 5 → vikter i steg om 0.05
  const stepPct = parseInt(argValue("--step") ?? "5");
  const units = Math.round(100 / stepPct);
  const seed = parseInt(argValue("--seed") ?? "42");
  const testFraction = parseFloat(argValue("--test") ?? "0.3");
  // optimeringsmål på träningsdelen: "logloss" (default) eller "top3"
  const objective = (argValue("--objective") ?? "logloss") as "logloss" | "top3";

  console.log("Hämtar lopp med resultat från Supabase …");
  const races = await loadRaces();
  console.log(`${races.length} lopp med vinnare hittades.`);

  if (races.length < 300) {
    console.warn(
      `⚠ Endast ${races.length} lopp — testresultaten har bred osäkerhet. Kör om när mer data samlats in.`
    );
  }

  const { train, test } = trainTestSplit(races, testFraction, seed);
  console.log(
    `Split (seed ${seed}): ${train.length} träningslopp, ${test.length} testlopp.\n`
  );

  const baseW = COMPONENT_ORDER.map((name) => CS_WEIGHTS[name]);
  console.log(`Nuvarande vikter (${fmtWeights(baseW)}):`);
  console.log(`  Train: ${fmtMetrics(evaluate(train, baseW), train.length)}`);
  console.log(`  Test:  ${fmtMetrics(evaluate(test, baseW), test.length)}\n`);

  console.log(
    `Grid-söker viktrummet i steg om ${stepPct} pe, optimerar "${objective}" på träningsdelen …`
  );
  // Lägre logloss är bättre; högre top3 är bättre
  const better = (a: Metrics, b: Metrics) =>
    objective === "logloss"
      ? a.logloss - b.logloss // sortera stigande
      : b.top3 - a.top3 || b.top1 - a.top1;

  type Result = { w: number[]; m: Metrics };
  let best: Result[] = [];
  let count = 0;
  for (const w of weightGrid(units)) {
    best.push({ w: [...w], m: evaluate(train, w) });
    count++;
    if (best.length > 5000) {
      best.sort((a, b) => better(a.m, b.m));
      best.length = 200;
    }
  }
  best.sort((a, b) => better(a.m, b.m));
  best = best.slice(0, 200);
  console.log(`${count} viktuppsättningar utvärderade på träningsdelen.\n`);

  console.log(`Topp 10 på träningsdelen (efter ${objective}):`);
  for (const { w, m } of best.slice(0, 10)) {
    console.log(`  ${fmtMetrics(m, train.length)}  ${fmtWeights(w)}`);
  }

  // Den ärliga siffran: bästa träningsvikterna utvärderade på testdelen
  const champion = best[0];
  const championTest = evaluate(test, champion.w);
  console.log(`\nBästa träningsvikter: ${fmtWeights(champion.w)}`);
  console.log(`  Train: ${fmtMetrics(champion.m, train.length)}`);
  console.log(`  Test:  ${fmtMetrics(championTest, test.length)}   ← ärlig uppskattning av verklig prestanda`);

  const overfit = champion.m.logloss - championTest.logloss;
  if (overfit < -0.03) {
    console.log(
      `\n⚠ Test-logloss är ${Math.abs(overfit).toFixed(3)} sämre än train — tecken på överanpassning. Behåll hellre robusta/jämna vikter.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
