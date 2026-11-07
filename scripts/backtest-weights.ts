/**
 * Backtest av Composite Score-vikterna mot faktiska loppresultat.
 *
 * Läser alla lopp med resultat (finish_position) från Supabase, räknar om
 * delkomponenterna med exakt samma logik som produktionen (lib/formscore.ts →
 * computeComponents) och grid-söker viktuppsättningar som maximerar
 * topp-3-täckning (andel lopp där vinnaren finns bland de tre högst rankade).
 *
 * Körning:  npm run backtest                      (steg 0.05, kronologisk split)
 *           npm run backtest -- --step 10         (grövre steg 0.10)
 *           npm run backtest -- --split random    (slumpad split per lopp i stället)
 *           npm run backtest -- --from 2026-06-01 (bara lopp från och med datumet)
 *           npm run backtest -- --search local    (lokal sökning; väljs automatiskt
 *                                                  när hela gridden blir för stor)
 *
 * Strukna hästar (utan odds när loppet har odds) tas bort ur fältet innan
 * komponenterna räknas — de kan inte vinna och späder bara ut fältet.
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
import { scratchedMask } from "../lib/fundamental";

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
  /** Omgångens datum (YYYY-MM-DD), för kronologisk split */
  date: string;
  gameId: string;
}

async function loadRaces(fromDate?: string): Promise<RaceData[]> {
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
      db.from("games").select("id, track, date"),
      db.from("track_configs").select("*"),
      db.from("races").select("id, game_id, distance, start_method"),
    ]);

  const trackByGame = new Map((games ?? []).map((g) => [g.id, g.track as string | null]));
  const dateByGame = new Map((games ?? []).map((g) => [g.id as string, String(g.date ?? "")]));
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
  for (const [raceId, allRows] of byRace) {
    const meta = raceById.get(raceId);
    if (!meta) continue;
    const date = dateByGame.get(meta.game_id) ?? "";
    if (fromDate && date < fromDate) continue;
    const scratched = scratchedMask(allRows as unknown as Parameters<typeof scratchedMask>[0]);
    const rows = allRows.filter((_, i) => !scratched[i]);
    const winnerIdx = rows.findIndex((r) => r.finish_position === 1);
    if (winnerIdx < 0 || rows.length < 2) continue;

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
    result.push({ comp, n: rows.length, winnerIdx, date, gameId: meta.game_id });
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

/** Vinnarens log-loss per lopp (för parad jämförelse mellan vikter) */
function raceLogLoss(race: RaceData, w: number[]): number {
  const { comp, n, winnerIdx } = race;
  let fieldSum = 0;
  let winnerScore = 0;
  for (let i = 0; i < n; i++) {
    let score = 0;
    for (let k = 0; k < N_COMP; k++) score += w[k] * comp[i * N_COMP + k];
    fieldSum += score;
    if (i === winnerIdx) winnerScore = score;
  }
  const pWinner = fieldSum > 0 ? winnerScore / fieldSum : 1 / n;
  return -Math.log(Math.max(pWinner, 1e-12));
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

/**
 * Kronologisk split: de senaste omgångarna blir test. Hela omgångar hålls
 * ihop så att lopp från samma dag aldrig hamnar på båda sidor.
 */
function chronologicalSplit(
  races: RaceData[],
  testFraction: number
): { train: RaceData[]; test: RaceData[] } {
  const games = [...new Set(races.map((r) => `${r.date}|${r.gameId}`))].sort();
  const nTestRaces = Math.round(races.length * testFraction);
  const testGames = new Set<string>();
  let count = 0;
  for (let i = games.length - 1; i >= 0 && count < nTestRaces; i--) {
    testGames.add(games[i]);
    count += races.filter((r) => `${r.date}|${r.gameId}` === games[i]).length;
  }
  const key = (r: RaceData) => `${r.date}|${r.gameId}`;
  return {
    train: races.filter((r) => !testGames.has(key(r))),
    test: races.filter((r) => testGames.has(key(r))),
  };
}

/** Antal punkter i gridden: kompositioner av `units` i N_COMP delar */
function gridSize(units: number): number {
  // C(units + N − 1, N − 1)
  let c = 1;
  for (let i = 1; i <= N_COMP - 1; i++) c = (c * (units + i)) / i;
  return Math.round(c);
}

/**
 * Lokal sökning i viktrummet: flyttar ett steg (1/units) mellan två
 * komponenter så länge målet förbättras. Startar från nuvarande vikter,
 * likformiga vikter och varje hörn (allt på en komponent) för att undvika
 * att fastna i ett dåligt lokalt optimum.
 */
function localSearch(
  races: RaceData[],
  units: number,
  starts: number[][],
  score: (w: number[]) => number
): number[] {
  let bestW: number[] = [];
  let bestScore = Infinity;
  for (const start of starts) {
    // avrunda starten till gridden
    let u = start.map((x) => Math.round(x * units));
    let diff = units - u.reduce((a, b) => a + b, 0);
    for (let k = 0; diff !== 0; k = (k + 1) % N_COMP) {
      if (diff > 0) { u[k]++; diff--; } else if (u[k] > 0) { u[k]--; diff++; }
    }
    let cur = score(u.map((x) => x / units));
    let improved = true;
    while (improved) {
      improved = false;
      let bestMove: number[] | null = null;
      let bestMoveScore = cur;
      for (let from = 0; from < N_COMP; from++) {
        if (u[from] === 0) continue;
        for (let to = 0; to < N_COMP; to++) {
          if (to === from) continue;
          const cand = [...u];
          cand[from]--;
          cand[to]++;
          const sc = score(cand.map((x) => x / units));
          if (sc < bestMoveScore - 1e-12) {
            bestMoveScore = sc;
            bestMove = cand;
          }
        }
      }
      if (bestMove) {
        u = bestMove;
        cur = bestMoveScore;
        improved = true;
      }
    }
    if (cur < bestScore) {
      bestScore = cur;
      bestW = u.map((x) => x / units);
    }
  }
  void races;
  return bestW;
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
  const split = (argValue("--split") ?? "date") as "date" | "random";
  const fromDate = argValue("--from");
  const MAX_GRID = 2_000_000;
  const search = (argValue("--search") ?? (gridSize(units) > MAX_GRID ? "local" : "grid")) as
    | "grid"
    | "local";

  console.log("Hämtar lopp med resultat från Supabase …");
  const races = await loadRaces(fromDate);
  console.log(`${races.length} lopp med vinnare hittades${fromDate ? ` från ${fromDate}` : ""}.`);

  if (races.length < 300) {
    console.warn(
      `⚠ Endast ${races.length} lopp — testresultaten har bred osäkerhet. Kör om när mer data samlats in.`
    );
  }

  const { train, test } =
    split === "date" ? chronologicalSplit(races, testFraction) : trainTestSplit(races, testFraction, seed);
  const span = (rs: RaceData[]) => {
    const d = rs.map((r) => r.date).sort();
    return d.length ? `${d[0]} – ${d[d.length - 1]}` : "–";
  };
  console.log(
    split === "date"
      ? `Kronologisk split: ${train.length} träningslopp (${span(train)}), ${test.length} testlopp (${span(test)}).\n`
      : `Slumpad split (seed ${seed}): ${train.length} träningslopp, ${test.length} testlopp.\n`
  );

  const baseW = COMPONENT_ORDER.map((name) => CS_WEIGHTS[name]);
  console.log(`Nuvarande vikter (${fmtWeights(baseW)}):`);
  console.log(`  Train: ${fmtMetrics(evaluate(train, baseW), train.length)}`);
  console.log(`  Test:  ${fmtMetrics(evaluate(test, baseW), test.length)}\n`);

  // Varje komponent ensam — visar vilka som bär signal
  console.log("Varje komponent ensam (test):");
  for (let k = 0; k < N_COMP; k++) {
    const w = COMPONENT_ORDER.map((_, j) => (j === k ? 1 : 0));
    console.log(`  ${COMPONENT_ORDER[k].padEnd(12)} ${fmtMetrics(evaluate(test, w), test.length)}`);
  }
  console.log("");

  // Lägre logloss är bättre; högre top3 är bättre
  const better = (a: Metrics, b: Metrics) =>
    objective === "logloss"
      ? a.logloss - b.logloss // sortera stigande
      : b.top3 - a.top3 || b.top1 - a.top1;

  let championW: number[];
  if (search === "grid") {
    console.log(
      `Grid-söker viktrummet i steg om ${stepPct} pe (${gridSize(units)} punkter), optimerar "${objective}" på träningsdelen …`
    );
    type Result = { w: number[]; m: Metrics };
    let best: Result[] = [];
    for (const w of weightGrid(units)) {
      best.push({ w: [...w], m: evaluate(train, w) });
      if (best.length > 5000) {
        best.sort((a, b) => better(a.m, b.m));
        best.length = 200;
      }
    }
    best.sort((a, b) => better(a.m, b.m));
    console.log(`\nTopp 10 på träningsdelen (efter ${objective}):`);
    for (const { w, m } of best.slice(0, 10)) {
      console.log(`  ${fmtMetrics(m, train.length)}  ${fmtWeights(w)}`);
    }
    championW = best[0].w;
  } else {
    console.log(
      `Lokal sökning i steg om ${stepPct} pe (hela gridden vore ${gridSize(units)} punkter), optimerar "${objective}" på träningsdelen …`
    );
    const starts: number[][] = [baseW, COMPONENT_ORDER.map(() => 1 / N_COMP)];
    for (let k = 0; k < N_COMP; k++) starts.push(COMPONENT_ORDER.map((_, j) => (j === k ? 1 : 0)));
    const score = (w: number[]) => {
      const m = evaluate(train, w);
      return objective === "logloss" ? m.logloss : -(m.top3 + m.top1 / 1000);
    };
    championW = localSearch(train, units, starts, score);
  }

  // Den ärliga siffran: bästa träningsvikterna utvärderade på testdelen
  const championTrain = evaluate(train, championW);
  const championTest = evaluate(test, championW);
  console.log(`\nBästa träningsvikter: ${fmtWeights(championW)}`);
  console.log(`  Train: ${fmtMetrics(championTrain, train.length)}`);
  console.log(`  Test:  ${fmtMetrics(championTest, test.length)}   ← ärlig uppskattning av verklig prestanda`);

  // Parad jämförelse mot nuvarande vikter på testdelen (samma lopp)
  const diffs = test.map((r) => raceLogLoss(r, championW) - raceLogLoss(r, baseW));
  const mean = diffs.reduce((a, b) => a + b, 0) / Math.max(diffs.length, 1);
  const sd = Math.sqrt(
    diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(diffs.length - 1, 1)
  );
  const se = sd / Math.sqrt(Math.max(diffs.length, 1));
  console.log(
    `\nTest-logloss, nya minus nuvarande: ${mean >= 0 ? "+" : ""}${mean.toFixed(4)} ` +
      `(95 %-intervall ${(mean - 1.96 * se).toFixed(4)} – ${(mean + 1.96 * se).toFixed(4)}; negativt = bättre)`
  );

  const overfit = championTrain.logloss - championTest.logloss;
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
