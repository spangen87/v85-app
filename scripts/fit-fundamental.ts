/**
 * Tränar Grundchans (odds-fri conditional logit) på ett års ATG-data.
 *
 * Körning:  npm run fit-fundamental                 (hämtar/uppdaterar cache, tränar, rapporterar)
 *           npm run fit-fundamental -- --write      (skriver lib/data/fundamental-model.json)
 *           npm run fit-fundamental -- --skip-fetch (bara cachen)
 *           npm run fit-fundamental -- --months 13 --force
 *
 * Cache: .cache/atg/{games,races}/<id>.json.gz (checkas inte in).
 * Läser/skriver inget i Supabase. Spec: docs/superpowers/specs/2026-10-03-grundchans-design.md §4.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseTimeToSeconds } from "../lib/analysis";
import { fromAtgRace, fromAtgStart } from "../lib/fundamental/atgAdapter";
import {
  computeRawFeatures, FACTORS, isFaulty,
  type FundamentalRace, type FundamentalStarter, type SpeedTables,
} from "../lib/fundamental/features";
import { standardizeField, type FundamentalModel } from "../lib/fundamental/model";
import {
  estimateSpeedTables, evaluate, fitConditionalLogit, raceProbs,
  type SpeedRecord, type TrainingRace,
} from "../lib/fundamental/fit";

const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};
const GAME_TYPES = ["V85", "V86", "V75", "V64", "V65", "GS75"];
const CACHE = path.join(".cache", "atg");
const LAMBDA = 3;
const MIN_PSEUDO_R2 = 0.19;
const MODEL_PATH = path.join("lib", "data", "fundamental-model.json");

type Json = Record<string, unknown>;

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

function readGz(file: string): Json {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
}
function writeGz(file: string, data: unknown) {
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(data)));
}

async function getJson(url: string): Promise<Json | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return (await res.json()) as Json;
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // nätverksfel — försök igen
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

/** Hämtar avgjorda omgångar + /extended per lopp för en lista dagar (inkrementellt) */
async function fetchDays(days: string[], label: string) {
  for (const day of days) {
    const cal = await getJson(`${ATG_BASE}/calendar/day/${day}`);
    const games = obj(cal?.["games"]);
    for (const type of GAME_TYPES) {
      for (const g of (games[type] as Json[] | undefined) ?? []) {
        const gid = String(g["id"]);
        const gameFile = path.join(CACHE, "games", `${gid}.json.gz`);
        let game: Json | null = fs.existsSync(gameFile) ? readGz(gameFile) : null;
        if (!game) {
          game = await getJson(`${ATG_BASE}/games/${gid}`);
          if (!game || game["status"] !== "results") continue;
          writeGz(gameFile, game);
        }
        for (const r of (game["races"] as Json[] | undefined) ?? []) {
          const raceFile = path.join(CACHE, "races", `${r["id"]}.json.gz`);
          if (fs.existsSync(raceFile)) continue;
          const ext = await getJson(`${ATG_BASE}/races/${r["id"]}/extended`);
          if (ext) writeGz(raceFile, ext);
        }
      }
    }
    process.stdout.write(`\r  [${label}] ${day}`);
  }
}

function obj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}

interface Example {
  id: string;
  race: FundamentalRace;
  starters: FundamentalStarter[];
  horseIds: string[];
  winner: number;
  odds: number[];
  streck: number[];
}

function loadExamples(): Example[] {
  // Streck per (lopp-id, startnummer) från spelfilerna
  const streck = new Map<string, number>();
  for (const f of fs.readdirSync(path.join(CACHE, "games"))) {
    const game = readGz(path.join(CACHE, "games", f));
    const gameType = String(game["id"]).split("_")[0];
    for (const r of (game["races"] as Json[] | undefined) ?? []) {
      for (const s of (r["starts"] as Json[] | undefined) ?? []) {
        const bd = obj(obj(s["pools"])[gameType])["betDistribution"];
        if (bd != null) streck.set(`${r["id"]}#${s["number"]}`, Number(bd) / 100);
      }
    }
  }

  const out: Example[] = [];
  for (const f of fs.readdirSync(path.join(CACHE, "races"))) {
    const raw = readGz(path.join(CACHE, "races", f));
    if (raw["sport"] !== "trot") continue;
    const terms = ((raw["terms"] as string[] | undefined) ?? []).join(" ").toLowerCase();
    if (String(raw["name"] ?? "").toLowerCase().includes("monté") || terms.includes("monté")) continue;
    const scratched = new Set(((obj(raw["result"])["scratchings"] as number[] | undefined) ?? []).map(Number));
    const starts = ((raw["starts"] as Json[] | undefined) ?? []).filter(
      (s) => !scratched.has(Number(s["number"])) && s["result"]
    );
    if (starts.length < 5) continue;
    const finish = starts.map((s) => Number(obj(s["result"])["finishOrder"] ?? 99));
    if (finish.filter((x) => x === 1).length !== 1) continue;
    const race = fromAtgRace(raw);
    out.push({
      id: String(raw["id"]),
      race,
      starters: starts.map((s) => fromAtgStart(s, race)),
      horseIds: starts.map((s) => String(obj(s["horse"])["id"] ?? obj(s["horse"])["name"] ?? "")),
      winner: finish.indexOf(1),
      odds: starts.map((s) => Number(obj(s["result"])["finalOdds"] ?? 0)),
      streck: starts.map((s) => streck.get(`${raw["id"]}#${s["number"]}`) ?? 0),
    });
  }
  return out.sort((a, b) => a.race.date.localeCompare(b.race.date));
}

function speedRecords(examples: Example[], beforeDate: string | null): SpeedRecord[] {
  const seen = new Set<string>();
  const records: SpeedRecord[] = [];
  for (const ex of examples) {
    ex.starters.forEach((s, i) => {
      for (const h of s.history) {
        const key = `${ex.horseIds[i]}#${h.date}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (beforeDate && h.date >= beforeDate) continue;
        if (isFaulty(h) || !h.start_method) continue;
        const seconds = parseTimeToSeconds(h.time);
        if (seconds == null) continue;
        records.push({
          breed: ex.race.breed, track: h.track, start_method: h.start_method,
          distance: h.distance ?? 2140, condition: h.track_condition ?? null, seconds,
        });
      }
    });
  }
  return records;
}

function toTraining(examples: Example[], tables: SpeedTables): TrainingRace[] {
  return examples.map((ex) => {
    const z = standardizeField(ex.starters.map((s) => computeRawFeatures(ex.race, s, tables)));
    return { z: z.map((row) => FACTORS.map((f) => row[f])), winner: ex.winner };
  });
}

const normalize = (v: number[]) => {
  const s = v.reduce((a, b) => a + b, 0);
  return s > 0 ? v.map((x) => x / s) : v.map(() => 1 / v.length);
};
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
function line(name: string, m: ReturnType<typeof evaluate>) {
  console.log(
    `  ${name.padEnd(28)} logloss=${m.logloss.toFixed(4)}  pseudoR²=${m.pseudo_r2.toFixed(3)}  top1=${pct(m.top1)}  top3=${pct(m.top3)}  n=${m.n}`
  );
}

async function main() {
  const months = Number(arg("--months") ?? 13);
  fs.mkdirSync(path.join(CACHE, "games"), { recursive: true });
  fs.mkdirSync(path.join(CACHE, "races"), { recursive: true });

  if (!has("--skip-fetch")) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - months);
    const days: string[] = [];
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    const chunk = Math.ceil(days.length / 4);
    console.log(`Hämtar ATG ${days[0]} → ${days[days.length - 1]} (4 parallella intervall) …`);
    await Promise.all(
      [0, 1, 2, 3].map((i) => fetchDays(days.slice(i * chunk, (i + 1) * chunk), `${i + 1}/4`))
    );
    console.log("\n");
  }

  const examples = loadExamples();
  if (examples.length < 500) {
    console.error(`Bara ${examples.length} lopp i cachen — för lite för att träna (minst 500).`);
    process.exit(1);
  }
  const iTr = Math.floor(examples.length * 0.6);
  const iVa = Math.floor(examples.length * 0.8);
  const train = examples.slice(0, iTr);
  const val = examples.slice(iTr, iVa);
  const test = examples.slice(iVa);
  const testStart = test[0].race.date;
  console.log(`${examples.length} travlopp (${examples[0].race.date} → ${examples[examples.length - 1].race.date}).`);
  console.log(`Split: train ${train.length}, val ${val.length}, test ${test.length} (från ${testStart}).\n`);

  // Banpar enbart från historik före testperioden — ingen läckage
  const evalTables = estimateSpeedTables(speedRecords(examples, testStart));
  const trZ = toTraining(train, evalTables);
  const vaZ = toTraining(val, evalTables);
  const teZ = toTraining(test, evalTables);
  const k = FACTORS.length;

  const betaTrain = fitConditionalLogit(trZ, k, LAMBDA);
  // Temperatur: enparameterslogit på log p för valideringsdelen
  const tempRaces: TrainingRace[] = vaZ.map((r) => ({
    z: raceProbs(r.z, betaTrain).map((p) => [Math.log(Math.max(p, 1e-12))]),
    winner: r.winner,
  }));
  const temperature = fitConditionalLogit(tempRaces, 1, 1e-6)[0];
  const betaTrVa = fitConditionalLogit([...trZ, ...vaZ], k, LAMBDA);

  const testMetrics = evaluate(teZ.map((r) => raceProbs(r.z, betaTrVa)), teZ.map((r) => r.winner));
  console.log("=== Testperiod ===");
  line("Likformig", evaluate(test.map((e) => e.starters.map(() => 1 / e.starters.length)), test.map((e) => e.winner)));
  line("Grundchans", testMetrics);
  line("Vinnarodds (jämförelse)", evaluate(test.map((e) => normalize(e.odds.map((o) => (o > 0 ? 1 / o : 0)))), test.map((e) => e.winner)));
  const withStreck = test.filter((e) => e.streck.some((x) => x > 0));
  if (withStreck.length) {
    line("Streck (jämförelse)", evaluate(withStreck.map((e) => normalize(e.streck)), withStreck.map((e) => e.winner)));
  }
  console.log(`\nTemperatur (val): ${temperature.toFixed(3)}`);

  console.log("\n=== Kalibrering (test) ===");
  const pairs: [number, number][] = [];
  teZ.forEach((r) => raceProbs(r.z, betaTrVa).forEach((p, i) => pairs.push([p, i === r.winner ? 1 : 0])));
  for (const [lo, hi] of [[0, 0.03], [0.03, 0.06], [0.06, 0.1], [0.1, 0.15], [0.15, 0.25], [0.25, 0.4], [0.4, 1.01]]) {
    const bin = pairs.filter(([p]) => p >= lo && p < hi);
    if (!bin.length) continue;
    const pred = bin.reduce((a, [p]) => a + p, 0) / bin.length;
    const act = bin.reduce((a, [, w]) => a + w, 0) / bin.length;
    console.log(`  [${lo.toFixed(2)}, ${hi.toFixed(2)})  n=${String(bin.length).padStart(5)}  förutsagt=${pct(pred)}  faktiskt=${pct(act)}`);
  }

  console.log("\n=== Vikter (train+val) ===");
  FACTORS.map((f, i) => [f, betaTrVa[i]] as const)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([f, b]) => console.log(`  ${f.padEnd(18)} ${b >= 0 ? "+" : ""}${b.toFixed(3)}`));

  if (!has("--write")) {
    console.log("\n(Kör med --write för att skriva modellfilen.)");
    return;
  }
  if (testMetrics.pseudo_r2 < MIN_PSEUDO_R2 && !has("--force")) {
    console.error(
      `\nVägrar skriva: pseudo-R² ${testMetrics.pseudo_r2.toFixed(3)} < ${MIN_PSEUDO_R2}. ` +
        "Troligen fel i faktorberäkningen — undersök, eller kör med --force."
    );
    process.exit(1);
  }

  // Slutlig modell: banpar och vikter på all data
  const finalTables = estimateSpeedTables(speedRecords(examples, null));
  const betaAll = fitConditionalLogit(toTraining(examples, finalTables), k, LAMBDA);
  const model: FundamentalModel = {
    version: new Date().toISOString().slice(0, 10),
    trained_races: examples.length,
    test_metrics: {
      logloss: Number(testMetrics.logloss.toFixed(4)),
      pseudo_r2: Number(testMetrics.pseudo_r2.toFixed(4)),
      top1: Number(testMetrics.top1.toFixed(4)),
      top3: Number(testMetrics.top3.toFixed(4)),
    },
    temperature: Number(temperature.toFixed(4)),
    beta: Object.fromEntries(FACTORS.map((f, i) => [f, Number((betaAll[i] * temperature).toFixed(5))])),
    par: roundValues(finalTables.par),
    par_fallback: roundValues(finalTables.par_fallback),
    condition_adj: roundValues(finalTables.condition_adj),
  };
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2) + "\n");
  console.log(`\nSkrev ${MODEL_PATH} (version ${model.version}, ${examples.length} lopp).`);
}

function roundValues(rec: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(rec).sort().map(([k, v]) => [k, Number(v.toFixed(3))]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
