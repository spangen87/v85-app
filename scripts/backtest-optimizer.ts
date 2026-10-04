/**
 * Backtest av systemoptimeraren (issue #98, avsnitt 3) på ATG-cachen.
 *
 * För varje avgjord omgång bygger optimeraren system med fast budget och
 * 2/3/4 spikar (1/2/3 på sexloppsspel) för λ = 0 / 0,3 / 0,6. Mäts mot:
 *   Ref A — samma struktur (antal hästar per avdelning), hästar efter streck
 *   Ref B — optimeraren med streck som chans (λ = 0)
 * Faktisk utdelning: antal rader med k rätt räknas med en genererande
 * funktion per avdelning (träffar·x + missar) och multipliceras med ATG:s
 * utdelning per vinnande rad för k rätt.
 *
 * Kronologi (se scripts/shared/calibration.ts): kalibrerade vikter skattas
 * bara på träningsperioden; värdevikten λ väljs på träningsperioden och
 * utvärderas på valideringsperioden. Inga trösklar justeras.
 *
 * Förbehåll: allt bygger på slutodds och slutstreck.
 *
 * Körning:  npm run backtest-optimizer
 *           npm run backtest-optimizer -- --out rapport.md   (tabeller som markdown)
 *           npm run backtest-optimizer -- --row-price V65=1     (känslighet för radpriset)
 */
import fs from "node:fs";
import { getRowPrice } from "../lib/atg";
import { CALIBRATED_MODEL, computeCalibratedChance, type CalibratedModel, type CoverageCalibration } from "../lib/calibrated";
import { fitCoverageCalibration } from "./shared/coverage";
import { optimizeSystem, systemMetrics, type OptimizedSystem, type OptimizerRace } from "../lib/optimizer";
import type { SystemSelection } from "../lib/types";
import type { CachedGame } from "./shared/atgCache";
import { fitAllModes, prepareCalibration, type CalibRace } from "./shared/calibration";

const TYPES = ["V85", "V86", "V75", "GS75", "V64", "V65"];
const BUDGET_KR: Record<string, number> = { V85: 385, V86: 385, V75: 385, GS75: 385, V64: 200, V65: 200 };
const LAMBDAS = [0, 0.3, 0.6];
const spikeSettings = (legs: number) => (legs >= 7 ? [2, 3, 4] : [1, 2, 3]);
const AUTO = "λ=0, valfria spikar";
const BOOTSTRAP = 2000;

type Period = "träning" | "validering";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Radpris från getRowPrice, eller överstyrt med --row-price V65=1,V64=0.5 */
const PRICE_OVERRIDE: Record<string, number> = Object.fromEntries(
  (arg("--row-price") ?? "").split(",").filter(Boolean).map((kv) => {
    const [t, v] = kv.split("=");
    return [t.toUpperCase(), Number(v)];
  })
);
const rowPriceFor = (type: string) => PRICE_OVERRIDE[type] ?? getRowPrice(type);
// --temperature 0.95: samma krympning som i appen (standard: modellfilens värde)
const TEMPERATURE = Number(arg("--temperature") ?? CALIBRATED_MODEL.temperature ?? 1);
// Kalibrering av täckningen: skattas på träningsperiodens system (pass 1) om inte --no-coverage
const USE_COVERAGE = !process.argv.includes("--no-coverage");
// --write-coverage: skatta på alla omgångar med appens modell och skriv till modellfilen
const WRITE_COVERAGE = process.argv.includes("--write-coverage");
let COVERAGE: CoverageCalibration | null = null;
// Som i appen används kalibreringen bara i måtten; --coverage-objective använder den även i målet
const IN_OBJECTIVE = process.argv.includes("--coverage-objective");

// ── Indata per omgång ─────────────────────────────────────────────────────

interface BtGame {
  game: CachedGame;
  period: Period;
  legs: number;
  rowPrice: number;
  races: OptimizerRace[];
  streckRaces: OptimizerRace[];
  winners: Set<number>[];
  calib: CalibRace[];
}

function toOptimizerRace(c: CalibRace, leg: number, chance: number[], names: Map<number, { id: string; name: string }>): OptimizerRace {
  return {
    race_number: leg,
    horses: c.field.map((h, i) => ({
      start_number: h.start_number,
      horse_id: names.get(h.start_number)?.id ?? String(h.start_number),
      horse_name: names.get(h.start_number)?.name ?? "",
      chance: h.scratched ? 0 : chance[i],
      streck: h.streck != null && h.streck > 0 ? h.streck / 100 : null,
      scratched: !!h.scratched,
    })),
  };
}

function normalizedStreck(c: CalibRace): number[] {
  const v = c.field.map((h) => (!h.scratched && h.streck != null && h.streck > 0 ? h.streck : 0));
  const s = v.reduce((a, b) => a + b, 0);
  return v.map((x) => (s > 0 ? x / s : 0));
}

// ── Utfall för ett system ─────────────────────────────────────────────────

interface Outcome {
  rows: number;
  stake: number;
  payout: number;
  /** Del av utdelningen som kommer från en nivå utan andra vinnare (hela potten skattad) */
  soloPayout: number;
  correct: number;
  spikesHeld: boolean;
}

function outcome(g: BtGame, selection: SystemSelection[]): Outcome {
  let poly = [1];
  let correct = 0;
  let rows = 1;
  let spikesHeld = true;
  selection.forEach((s, i) => {
    const n = s.horses.length;
    const hits = s.horses.filter((h) => g.winners[i].has(h.start_number)).length;
    rows *= n;
    if (hits > 0) correct++;
    if (n === 1 && hits === 0) spikesHeld = false;
    const next = new Array<number>(poly.length + 1).fill(0);
    poly.forEach((c, k) => {
      next[k] += c * (n - hits);
      next[k + 1] += c * hits;
    });
    poly = next;
  });
  let payout = 0;
  let soloPayout = 0;
  poly.forEach((count, k) => {
    if (count <= 0) return;
    const p = g.game.payouts[k];
    if (!p) return;
    if (p.payout != null) payout += count * (p.payout / 100);
    else if (p.systems === 0 && p.pool != null) {
      // Ingen annan hade k rätt: hela potten skulle ha gått till oss
      payout += p.pool / 100;
      soloPayout += p.pool / 100;
    }
  });
  return { rows, stake: rows * g.rowPrice, payout, soloPayout, correct, spikesHeld };
}

/** Samma antal per avdelning som systemet, men hästarna med högst streck */
function streckStructure(g: BtGame, system: OptimizedSystem): SystemSelection[] {
  return system.selection.map((s, i) => {
    const race = g.races[i];
    const horses = race.horses
      .filter((h) => !h.scratched)
      .sort((a, b) => (b.streck ?? 0) - (a.streck ?? 0) || a.start_number - b.start_number)
      .slice(0, s.horses.length);
    return {
      race_number: s.race_number,
      horses: horses.map((h) => ({ horse_id: h.horse_id, start_number: h.start_number, horse_name: h.horse_name })),
    };
  });
}

// ── Aggregering ───────────────────────────────────────────────────────────

interface Rec {
  gameId: string;
  stake: number;
  payout: number;
  soloPayout: number;
  hitAll: boolean;
  hitAllButOne: boolean;
  p8: number;
  p7: number;
  pSpikes: number;
  spikes: number;
  spikesHeld: boolean;
  legs: number;
}

const buckets = new Map<string, Rec[]>();
const skipped = new Map<string, number>();
const key = (type: string, period: Period, spikes: number, kind: string) => `${type}|${period}|${spikes}|${kind}`;
const push = (k: string, r: Rec) => (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(r);

let systemsBuilt = 0;

function record(g: BtGame, spikes: number, kind: string, selection: SystemSelection[], races: OptimizerRace[]) {
  const o = outcome(g, selection);
  // Kontroll: varje system ska hålla budgeten
  if (o.stake > BUDGET_KR[g.game.type] + 1e-9) throw new Error(`${kind} ${g.game.id}: ${o.stake} kr över budget`);
  systemsBuilt++;
  const m = systemMetrics(races, selection, { coverageCalibration: COVERAGE });
  push(key(g.game.type, g.period, spikes, kind), {
    gameId: g.game.id, stake: o.stake, payout: o.payout, soloPayout: o.soloPayout,
    hitAll: o.correct === g.legs, hitAllButOne: o.correct === g.legs - 1,
    p8: m.p8, p7: m.p7, pSpikes: m.pAllSpikesHold, spikes: m.coverage.filter((c) => c.spike).length,
    spikesHeld: o.spikesHeld, legs: g.legs,
  });
  return m;
}

interface Summary {
  games: number;
  hitAll: number;
  hitAllButOne: number;
  p8: number;
  p7: number;
  var8: number;
  var7: number;
  stake: number;
  payout: number;
  solo: number;
  spikeGames: number;
  spikesHeld: number;
  pSpikes: number;
}

function summarize(recs: Rec[]): Summary {
  const s: Summary = { games: 0, hitAll: 0, hitAllButOne: 0, p8: 0, p7: 0, var8: 0, var7: 0, stake: 0, payout: 0, solo: 0, spikeGames: 0, spikesHeld: 0, pSpikes: 0 };
  for (const r of recs) {
    s.games++;
    s.hitAll += r.hitAll ? 1 : 0;
    s.hitAllButOne += r.hitAllButOne ? 1 : 0;
    s.p8 += r.p8;
    s.p7 += r.p7;
    s.var8 += r.p8 * (1 - r.p8);
    s.var7 += r.p7 * (1 - r.p7);
    s.stake += r.stake;
    s.payout += r.payout;
    s.solo += r.soloPayout;
    if (r.spikes > 0) {
      s.spikeGames++;
      s.spikesHeld += r.spikesHeld ? 1 : 0;
      s.pSpikes += r.pSpikes;
    }
  }
  return s;
}

const roi = (s: { stake: number; payout: number }) => (s.stake > 0 ? s.payout / s.stake : 0);

/** Deterministisk slumpgenerator (mulberry32) för bootstrap */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parad bootstrap över omgångar: 90 %-intervall för ROI(a) − ROI(b) */
function bootstrapDiff(a: Rec[], b: Rec[], seed = 1): { diff: number; lo: number; hi: number; pPos: number } {
  const bm = new Map(b.map((r) => [r.gameId, r]));
  const pairs = a.filter((r) => bm.has(r.gameId)).map((r) => [r, bm.get(r.gameId)!] as const);
  const diffOf = (ps: (readonly [Rec, Rec])[]) => {
    const sa = ps.reduce((x, [r]) => ({ stake: x.stake + r.stake, payout: x.payout + r.payout }), { stake: 0, payout: 0 });
    const sb = ps.reduce((x, [, r]) => ({ stake: x.stake + r.stake, payout: x.payout + r.payout }), { stake: 0, payout: 0 });
    return roi(sa) - roi(sb);
  };
  if (pairs.length === 0) return { diff: 0, lo: 0, hi: 0, pPos: 0 };
  const rand = rng(seed);
  const diffs: number[] = [];
  for (let i = 0; i < BOOTSTRAP; i++) {
    const sample = pairs.map(() => pairs[Math.floor(rand() * pairs.length)]);
    diffs.push(diffOf(sample));
  }
  diffs.sort((x, y) => x - y);
  return {
    diff: diffOf(pairs),
    lo: diffs[Math.floor(BOOTSTRAP * 0.05)],
    hi: diffs[Math.floor(BOOTSTRAP * 0.95)],
    pPos: diffs.filter((d) => d > 0).length / BOOTSTRAP,
  };
}

// ── Utskrift ──────────────────────────────────────────────────────────────

const out: string[] = [];
const emit = (s = "") => {
  out.push(s);
  console.log(s);
};
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d).replace(".", ",")} %`;
const num = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
const kr = (x: number) => `${Math.round(x).toLocaleString("sv-SE")} kr`;
const z = (actual: number, pred: number, v: number) => (v > 0 ? (actual - pred) / Math.sqrt(v) : 0);
const lamText = (l: number) => `λ=${String(l).replace(".", ",")}`;

function table(header: string[], rows: (string | number)[][]) {
  emit(`| ${header.join(" | ")} |`);
  emit(`|${header.map(() => "---").join("|")}|`);
  for (const r of rows) emit(`| ${r.join(" | ")} |`);
  emit();
}

function kinds(): string[] {
  return [
    ...LAMBDAS.map(lamText),
    ...LAMBDAS.map((l) => `Ref A (${lamText(l)})`),
    "Ref B",
  ];
}

function main() {
  console.error("Läser cachen och tränar Grundchans framåtrullande …");
  const data = prepareCalibration((m) => console.error(m));
  const trainRaces = data.races.filter((r) => r.date < data.trainEnd);
  const model: CalibratedModel = { ...fitAllModes(trainRaces, "backtest-train"), temperature: TEMPERATURE };
  const calibById = new Map(data.races.map((r) => [r.id, r]));

  // Omgångar där alla avdelningar är travlopp med Grundchans utan läckage
  const games: BtGame[] = [];
  const excluded: Record<string, { gallop: number; early: number }> = {};
  for (const game of data.games) {
    if (!TYPES.includes(game.type)) continue;
    const ex = (excluded[game.type] ??= { gallop: 0, early: 0 });
    if (game.date < data.start) {
      ex.early++;
      continue;
    }
    if (game.races.some((r) => r.sport !== "trot" || !calibById.has(r.id) || r.winners.length === 0)) {
      ex.gallop++;
      continue;
    }
    const calib = game.races.map((r) => calibById.get(r.id)!);
    const names = game.races.map((r) => new Map(r.starts.map((s) => [s.number, { id: s.horseId, name: s.horseName }])));
    games.push({
      game,
      period: game.date < data.trainEnd ? "träning" : "validering",
      legs: game.races.length,
      rowPrice: rowPriceFor(game.type),
      races: calib.map((c, i) => toOptimizerRace(c, i + 1, computeCalibratedChance(c.field, model).p, names[i])),
      streckRaces: calib.map((c, i) => toOptimizerRace(c, i + 1, normalizedStreck(c), names[i])),
      winners: game.races.map((r) => new Set(r.winners)),
      calib,
    });
  }

  // Pass 1: optimerarens system utan kalibrering → (täckning, gick in) per unik avdelning och urval
  const coveragePoints = (gs: BtGame[], racesOf: (g: BtGame) => OptimizerRace[]) => {
    const pts = new Map<string, [number, boolean]>();
    for (const g of gs) {
      for (const spikes of spikeSettings(g.legs)) {
        for (const lambda of LAMBDAS) {
          const res = optimizeSystem({ races: racesOf(g), budgetKr: BUDGET_KR[g.game.type], rowPrice: g.rowPrice, spikes, lambda });
          if (!res.ok) continue;
          res.system.selection.forEach((s, i) => {
            const id = `${g.calib[i].id}|${s.horses.map((h) => h.start_number).join(",")}`;
            pts.set(id, [res.system.metrics.coverage[i].chansRaw, s.horses.some((h) => g.winners[i].has(h.start_number))]);
          });
        }
      }
    }
    return [...pts.values()];
  };

  if (WRITE_COVERAGE) {
    // Appens modell (vikter från fit-calibrated) på alla omgångar
    const prod = (g: BtGame) => g.calib.map((c, i) =>
      toOptimizerRace(c, i + 1, computeCalibratedChance(c.field, CALIBRATED_MODEL).p, new Map(g.game.races[i].starts.map((s) => [s.number, { id: s.horseId, name: s.horseName }]))));
    const fit = fitCoverageCalibration(coveragePoints(games, prod));
    const file = "lib/data/calibrated-model.json";
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.coverage = { ...fit, weights_version: json.version };
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
    console.error(`Skrev täckningskalibrering till ${file}: alpha ${fit.alpha}, beta ${fit.beta}, n ${fit.n}`);
    return;
  }

  if (USE_COVERAGE) COVERAGE = fitCoverageCalibration(coveragePoints(games.filter((g) => g.period === "träning"), (g) => g.races));

  // Pass 2: optimeraren (med kalibrerad täckning) och referenssystemen
  const raceLevel = new Map<string, [number, boolean, Period, number]>();
  const spikeLevel = new Map<string, [number, boolean, Period, number]>();
  for (const g of games) {
    const budgetKr = BUDGET_KR[g.game.type];
    for (const spikes of spikeSettings(g.legs)) {
      for (const lambda of LAMBDAS) {
        const res = optimizeSystem({ races: g.races, budgetKr, rowPrice: g.rowPrice, spikes, lambda, coverageCalibration: COVERAGE, calibrateObjective: IN_OBJECTIVE });
        if (!res.ok) {
          const k = key(g.game.type, g.period, spikes, lamText(lambda));
          skipped.set(k, (skipped.get(k) ?? 0) + 1);
          continue;
        }
        const m = record(g, spikes, lamText(lambda), res.system.selection, g.races);
        record(g, spikes, `Ref A (${lamText(lambda)})`, streckStructure(g, res.system), g.races);
        res.system.selection.forEach((s, i) => {
          const id = `${g.calib[i].id}|${s.horses.map((h) => h.start_number).join(",")}`;
          const hit = s.horses.some((h) => g.winners[i].has(h.start_number));
          raceLevel.set(id, [m.coverage[i].chans, hit, g.period, m.coverage[i].chansRaw]);
          if (s.horses.length === 1) spikeLevel.set(id, [m.coverage[i].chans, hit, g.period, m.coverage[i].chansRaw]);
        });
      }
      const refB = optimizeSystem({ races: g.streckRaces, budgetKr, rowPrice: g.rowPrice, spikes, lambda: 0 });
      if (refB.ok) record(g, spikes, "Ref B", refB.system.selection, g.races);
      else skipped.set(key(g.game.type, g.period, spikes, "Ref B"), (skipped.get(key(g.game.type, g.period, spikes, "Ref B")) ?? 0) + 1);
    }
    // Appens standard: optimeraren väljer själv antalet spikar (0 till högsta inställningen)
    const maxSpikes = Math.max(...spikeSettings(g.legs));
    const auto = optimizeSystem({ races: g.races, budgetKr, rowPrice: g.rowPrice, spikes: { min: 0, max: maxSpikes }, lambda: 0, coverageCalibration: COVERAGE, calibrateObjective: IN_OBJECTIVE });
    if (auto.ok) record(g, 0, AUTO, auto.system.selection, g.races);
  }

  const get = (type: string | null, period: Period, spikes: number | null, kind: string): Rec[] => {
    const res: Rec[] = [];
    for (const [k, recs] of buckets) {
      const [t, p, s, kd] = k.split("|");
      if ((type == null || t === type) && p === period && (spikes == null || Number(s) === spikes) && kd === kind) res.push(...recs);
    }
    return res;
  };

  // ── Rapport ──
  emit(`## Underlag`);
  emit();
  emit(`Kalibrerade vikter (träningsperioden, läge full): a = ${num(model.modes.full.streck, 3)}, b = ${num(model.modes.full.odds, 3)}, c = ${num(model.modes.full.grund, 3)}. Temperatur τ = ${num(TEMPERATURE, 2)}.`);
  emit(`Träningsperiod ${data.start} – ${data.trainEnd}, valideringsperiod ${data.trainEnd} – ${data.end}.`);
  emit(COVERAGE
    ? `Kalibrering av täckningen (skattad på träningsperiodens system): logit(c′) = ${num(COVERAGE.alpha, 3)} + ${num(COVERAGE.beta, 3)}·logit(c), n = ${COVERAGE.n}. ${IN_OBJECTIVE ? "Används både i optimerarens mål och i de förutsagda måtten (--coverage-objective)." : "Används i alla förutsagda träffar nedan men inte i optimerarens mål (som i appen)."}`
    : "Ingen kalibrering av täckningen (--no-coverage).");
  emit(`${systemsBuilt} system byggda (optimerare och referenser); alla höll budgeten.`);
  emit();
  table(
    ["Spel", "Radpris", "Budget", "Spikar", "Omgångar träning", "Omgångar validering", "Uteslutna (galopp/monté saknas)", "Uteslutna (före Grundchans)"],
    TYPES.map((t) => {
      const gs = games.filter((g) => g.game.type === t);
      return [
        t, `${num(rowPriceFor(t))} kr`, `${BUDGET_KR[t]} kr`, spikeSettings(gs[0]?.legs ?? 8).join("/"),
        gs.filter((g) => g.period === "träning").length, gs.filter((g) => g.period === "validering").length,
        excluded[t]?.gallop ?? 0, excluded[t]?.early ?? 0,
      ];
    })
  );

  // Radpriskontroll: implicit radpris = omsättning / skattat antal spelade rader
  emit(`## Radpriskontroll`);
  emit();
  emit("Antal spelade rader skattas som (vinnande rader för alla rätt) / Π streck(vinnare), vilket förutsätter att raderna fördelas som strecket. Implicit radpris = omsättning / skattade rader (median över omgångar med minst 20 vinnande rader). Samma skattning görs med nivån alla utom en. Sista kolumnen kontrollerar att utdelningen anges per vinnande rad: antal vinnande rader × utdelning ≈ potten för nivån.");
  emit();
  const priceRows: (string | number)[][] = [];
  for (const t of TYPES) {
    const est: number[] = [];
    const est1: number[] = [];
    const ratio: number[] = [];
    for (const game of data.games.filter((g) => g.type === t)) {
      const n = game.races.length;
      const top = game.payouts[n];
      if (!top || top.systems < 20) continue;
      const sw = game.races.map((r) => {
        const total = r.starts.reduce((a, s) => a + (s.streck ?? 0), 0);
        const w = r.starts.filter((s) => r.winners.includes(s.number)).reduce((a, s) => a + (s.streck ?? 0), 0);
        return total > 0 ? w / total : 0;
      });
      const prod = sw.reduce((a, x) => a * x, 1);
      if (prod <= 0) continue;
      est.push(game.turnover / 100 / (top.systems / prod));
      // Samma skattning med nivån alla utom en (fler vinnande rader, mindre brus)
      const second = game.payouts[n - 1];
      const share = sw.reduce((a, _, i) => a + (1 - sw[i]) * sw.reduce((b, x, j) => (j === i ? b : b * x), 1), 0);
      if (second && second.systems > 0 && share > 0) est1.push(game.turnover / 100 / (second.systems / share));
      // Kontroll att utdelningen anges per vinnande rad: systems × payout ≈ potten för nivån
      for (const p of Object.values(game.payouts)) {
        if (p.payout != null && p.pool && p.systems > 0) ratio.push((p.systems * p.payout) / p.pool);
      }
    }
    est.sort((a, b) => a - b);
    est1.sort((a, b) => a - b);
    ratio.sort((a, b) => a - b);
    const med = (v: number[]) => (v.length ? v[Math.floor(v.length / 2)] : NaN);
    priceRows.push([t, `${num(getRowPrice(t))} kr`, est.length ? `${num(med(est))} kr` : "–", est.length,
      est.length ? `${num(est[Math.floor(est.length * 0.25)])}–${num(est[Math.floor(est.length * 0.75)])} kr` : "–",
      est1.length ? `${num(med(est1))} kr` : "–",
      ratio.length ? num(med(ratio), 3) : "–"]);
  }
  table(["Spel", "getRowPrice", "Implicit radpris, alla rätt (median)", "n", "Kvartiler", "Implicit radpris, alla−1 (median)", "rader × utdelning / pott (median)"], priceRows);

  // Huvudtabeller per spel och period
  for (const period of ["validering", "träning"] as Period[]) {
    emit(`## Utfall – ${period}sperioden`);
    emit();
    for (const t of TYPES) {
      const legs = games.find((g) => g.game.type === t)?.legs ?? 8;
      if (!games.some((g) => g.game.type === t && g.period === period)) continue;
      emit(`### ${t} (${legs} avd, ${BUDGET_KR[t]} kr)`);
      emit();
      const rows: (string | number)[][] = [];
      for (const spikes of spikeSettings(legs)) {
        for (const kind of kinds()) {
          const recs = get(t, period, spikes, kind);
          if (!recs.length) continue;
          const s = summarize(recs);
          rows.push([
            spikes, kind, s.games,
            `${s.hitAll} / ${num(s.p8, 1)}`, `${s.hitAllButOne} / ${num(s.p7, 1)}`,
            s.spikeGames ? `${pct(s.spikesHeld / s.spikeGames, 0)} / ${pct(s.pSpikes / s.spikeGames, 0)}` : "–",
            kr(s.stake), kr(s.payout), num(roi(s)), s.solo > 0 ? num((s.payout - s.solo) / s.stake) : num(roi(s)),
            skipped.get(key(t, period, spikes, kind)) ?? 0,
          ]);
        }
      }
      table(["Spikar", "System", "Omg", `${legs} rätt faktiskt / förutsagt`, `${legs - 1} rätt faktiskt / förutsagt`, "Spikar höll faktiskt / förutsagt", "Insats", "Utdelning", "Avk./kr", "Avk./kr utan ensam pott", "Utan system"], rows);
    }
  }

  // Sammanslaget V85 + V86 och alla spel
  for (const period of ["träning", "validering"] as Period[]) {
    emit(`## Sammanslaget – ${period}sperioden`);
    emit();
    const rows: (string | number)[][] = [];
    for (const group of [["V85", "V86"], TYPES]) {
      for (const kind of kinds()) {
        const recs = group.flatMap((t) => get(t, period, null, kind));
        if (!recs.length) continue;
        const s = summarize(recs);
        // Känslighet: utan den enskilt största utdelningen
        const top = recs.reduce((a, r) => (r.payout > a.payout ? r : a), recs[0]);
        const withoutTop = { stake: s.stake - top.stake, payout: s.payout - top.payout };
        rows.push([group.length === 2 ? "V85+V86" : "Alla", kind, s.games, `${s.hitAll} / ${num(s.p8, 1)}`, `${s.hitAllButOne} / ${num(s.p7, 1)}`, kr(s.stake), kr(s.payout), num(roi(s)), num((s.payout - s.solo) / s.stake), num(roi(withoutTop))]);
      }
    }
    table(["Spel", "System", "System×omg", "Alla rätt faktiskt / förutsagt", "Alla−1 faktiskt / förutsagt", "Insats", "Utdelning", "Avk./kr", "Avk./kr utan ensam pott", "Avk./kr utan största utdelningen"], rows);
  }

  // Val av värdevikt på träningsperioden
  emit(`## Val av värdevikt (träningsperioden)`);
  emit();
  const trainRoi = LAMBDAS.map((l) => {
    const s = summarize(TYPES.flatMap((t) => get(t, "träning", null, lamText(l))));
    return { l, roi: roi(s), roiNoSolo: (s.payout - s.solo) / s.stake };
  });
  table(["λ", "Avk./kr träning", "Avk./kr utan ensam pott"], trainRoi.map((r) => [lamText(r.l), num(r.roi), num(r.roiNoSolo)]));
  const chosen = trainRoi.filter((r) => r.l > 0).sort((a, b) => b.roiNoSolo - a.roiNoSolo)[0].l;
  emit(`Vald värdevikt (högst avkastning utan ensam pott bland λ > 0 på träningen): **${lamText(chosen)}**.`);
  emit();

  // Bootstrap av avkastningsskillnader på valideringen
  emit(`## Avkastningsskillnad på valideringen (parad bootstrap, 90 %-intervall)`);
  emit();
  const diffRows: (string | number)[][] = [];
  const comparisons: [string, string][] = [
    [lamText(chosen), `Ref A (${lamText(chosen)})`],
    [lamText(chosen), lamText(0)],
    [lamText(chosen), "Ref B"],
    [lamText(0), `Ref A (${lamText(0)})`],
    [lamText(0), "Ref B"],
  ];
  for (const group of [["V85"], ["V86"], ["V85", "V86"], TYPES]) {
    for (const [a, b] of comparisons) {
      // Para per (omgång, spikar) så att samma omgång jämförs med sig själv
      const tag = (recs: Rec[], s: number) => recs.map((r) => ({ ...r, gameId: `${r.gameId}|${s}` }));
      const ra: Rec[] = [];
      const rb: Rec[] = [];
      for (const t of group) {
        for (const s of [1, 2, 3, 4]) {
          ra.push(...tag(get(t, "validering", s, a), s));
          rb.push(...tag(get(t, "validering", s, b), s));
        }
      }
      if (!ra.length) continue;
      const noSolo = (rs: Rec[]) => rs.map((r) => ({ ...r, payout: r.payout - r.soloPayout }));
      const d = bootstrapDiff(ra, rb);
      const d2 = bootstrapDiff(noSolo(ra), noSolo(rb));
      diffRows.push([group.length === TYPES.length ? "Alla" : group.join("+"), `${a} − ${b}`, ra.length,
        `${num(d.diff)} [${num(d.lo)}; ${num(d.hi)}]`, pct(d.pPos, 0), `${num(d2.diff)} [${num(d2.lo)}; ${num(d2.hi)}]`]);
    }
  }
  table(["Spel", "Jämförelse", "System×omg", "Skillnad avk./kr [90 %]", "Andel > 0", "Utan ensam pott [90 %]"], diffRows);

  // Kalibrering av P(alla rätt) och P(alla utom en)
  emit(`## Kalibrering av förutsagd träff`);
  emit();
  const calRows: (string | number)[][] = [];
  for (const period of ["träning", "validering"] as Period[]) {
    for (const l of LAMBDAS) {
      for (const spikes of [1, 2, 3, 4, null]) {
        const recs = TYPES.flatMap((t) => get(t, period, spikes, lamText(l)));
        if (!recs.length) continue;
        const s = summarize(recs);
        calRows.push([period, lamText(l), spikes ?? "alla (beroende)", s.games,
          `${s.hitAll} / ${num(s.p8, 1)}`, num(z(s.hitAll, s.p8, s.var8)),
          `${s.hitAllButOne} / ${num(s.p7, 1)}`, num(z(s.hitAllButOne, s.p7, s.var7)),
          s.spikeGames ? `${s.spikesHeld} / ${num(s.pSpikes, 1)}` : "–"]);
      }
    }
  }
  table(["Period", "λ", "Spikar", "Omg", "Alla rätt faktiskt / förutsagt", "z", "Alla−1 faktiskt / förutsagt", "z", "Alla spikar höll faktiskt / förutsagt"], calRows);

  const calTable = (title: string, level: Map<string, [number, boolean, Period, number]>, bins: number[][], raw = false) => {
    emit(title);
    emit();
    const rows: (string | number)[][] = [];
    for (const period of ["träning", "validering"] as Period[]) {
      for (const [lo, hi] of bins) {
        const v = [...level.values()].map(([c, h, p, r]) => [raw ? r : c, h, p] as [number, boolean, Period]).filter(([c, , p]) => p === period && c >= lo && c < hi);
        if (!v.length) continue;
        const pred = v.reduce((a, [c]) => a + c, 0);
        const act = v.filter(([, h]) => h).length;
        const variance = v.reduce((a, [c]) => a + c * (1 - c), 0);
        rows.push([period, `${pct(lo, 0)}–${pct(Math.min(hi, 1), 0)}`, v.length, pct(pred / v.length), pct(act / v.length), num(z(act, pred, variance))]);
      }
    }
    table(["Period", "Förutsagd", "n", "Förutsagt", "Faktiskt", "z"], rows);
  };
  calTable(
    "Täckning per avdelning (unika avdelning + urval i optimerarens system):",
    raceLevel,
    [[0, 0.5], [0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.01]]
  );
  if (COVERAGE) {
    calTable(
      "Samma system före kalibreringen av täckningen (summa kalibrerad chans för urvalet):",
      raceLevel,
      [[0, 0.5], [0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.01]],
      true
    );
  }
  emit("Spikar (unika spikhästar i optimerarens system), fack efter hästens råa kalibrerade chans (kravet är minst 35 %):");
  emit();
  const spikeRows: (string | number)[][] = [];
  for (const period of ["träning", "validering"] as Period[]) {
    for (const [lo, hi] of [[0.35, 0.45], [0.45, 0.55], [0.55, 0.7], [0.7, 1.01]]) {
      const v = [...spikeLevel.values()].filter(([, , p, r]) => p === period && r >= lo && r < hi);
      if (!v.length) continue;
      const pred = v.reduce((a, [c]) => a + c, 0);
      const raw = v.reduce((a, [, , , r]) => a + r, 0);
      const act = v.filter(([, h]) => h).length;
      const variance = v.reduce((a, [c]) => a + c * (1 - c), 0);
      spikeRows.push([period, `${pct(lo, 0)}–${pct(Math.min(hi, 1), 0)}`, v.length, pct(raw / v.length), pct(pred / v.length), pct(act / v.length), num(z(act, pred, variance))]);
    }
  }
  table(["Period", "Rå chans", "n", "Förutsagt rå", "Förutsagt kalibrerad", "Faktiskt", "z (kalibrerad)"], spikeRows);

  // Märkena Understreckad / Överstreckad
  emit(`## Valfritt antal spikar (Max chans)`);
  emit();
  emit("Optimeraren väljer själv mellan 0 och 4 spikar (sexloppsspel 0–3) inom samma budget, jämfört med ett fast antal. Spikar = genomsnittligt antal i de byggda systemen.");
  emit();
  const autoRows: (string | number)[][] = [];
  for (const period of ["träning", "validering"] as Period[]) {
    for (const spikes of [null, ...[1, 2, 3, 4]]) {
      const recs = spikes == null ? TYPES.flatMap((t) => get(t, period, 0, AUTO)) : TYPES.flatMap((t) => get(t, period, spikes, lamText(0)));
      if (!recs.length) continue;
      const s = summarize(recs);
      autoRows.push([period, spikes == null ? "valfritt" : String(spikes), s.games, num(recs.reduce((a, r) => a + r.spikes, 0) / recs.length, 1),
        `${s.hitAll} / ${num(s.p8, 1)}`, `${s.hitAllButOne} / ${num(s.p7, 1)}`, num(s.payout / s.stake)]);
    }
  }
  table(["Period", "Spikar (inställning)", "Omg", "Spikar i snitt", "Alla rätt faktiskt / förutsagt", "Alla−1 faktiskt / förutsagt", "Avk./kr"], autoRows);
  emit("Parad jämförelse på samma omgångar (spel med 7–8 avdelningar), valfritt minus exakt antal:");
  emit();
  const pairRows: (string | number)[][] = [];
  for (const period of ["träning", "validering"] as Period[]) {
    const auto = TYPES.flatMap((t) => get(t, period, 0, AUTO)).filter((r) => r.legs >= 7);
    for (const spikes of [2, 3, 4]) {
      const exact = TYPES.flatMap((t) => get(t, period, spikes, lamText(0))).filter((r) => r.legs >= 7);
      const ids = new Set(exact.map((r) => r.gameId));
      const a = auto.filter((r) => ids.has(r.gameId));
      const ex = new Map(exact.map((r) => [r.gameId, r]));
      const b = a.map((r) => ex.get(r.gameId)!);
      const d = bootstrapDiff(a, b, 7 + spikes);
      pairRows.push([period, `valfritt − ${spikes}`, a.length, `${a.filter((r) => r.hitAll).length} / ${b.filter((r) => r.hitAll).length}`,
        `${a.filter((r) => r.hitAllButOne).length} / ${b.filter((r) => r.hitAllButOne).length}`, `${num(d.diff)} [${num(d.lo)}; ${num(d.hi)}]`]);
    }
  }
  table(["Period", "Jämförelse", "Omg", "Alla rätt valfritt / exakt", "Alla−1 valfritt / exakt", "Skillnad avk./kr [90 %]"], pairRows);

  emit(`## Märkena Understreckad och Överstreckad`);
  emit();
  emit("Understreckad: r = chans/streck > 1,5 och chans ≥ 5 %. Överstreckad: r < 0,75 och streck ≥ 10 %. Alla travlopp med Grundchans (även omgångar som inte backtestades). Avkastning = vinnarspel 1 kr på slutoddset.");
  emit();
  const markRows: (string | number)[][] = [];
  for (const period of ["träning", "validering"] as Period[]) {
    const groups: Record<string, { n: number; streck: number; chance: number; wins: number; ret: number }> = {};
    const add = (g: string, s: number, p: number, win: boolean, odds: number | null) => {
      const x = (groups[g] ??= { n: 0, streck: 0, chance: 0, wins: 0, ret: 0 });
      x.n++;
      x.streck += s;
      x.chance += p;
      x.wins += win ? 1 : 0;
      x.ret += win && odds ? odds : 0;
    };
    for (const r of data.races) {
      if ((r.date < data.trainEnd) !== (period === "träning")) continue;
      if (r.winners.length === 0) continue;
      const p = computeCalibratedChance(r.field, model).p;
      r.field.forEach((h, i) => {
        if (h.scratched || h.streck == null || h.streck <= 0) return;
        const s = h.streck / 100;
        const ratio = p[i] / s;
        const win = r.winners.includes(i);
        const g = ratio > 1.5 && p[i] >= 0.05 ? "Understreckad" : ratio < 0.75 && s >= 0.1 ? "Överstreckad" : "Övriga";
        add(g, s, p[i], win, h.odds);
        add("Alla", s, p[i], win, h.odds);
      });
    }
    for (const g of ["Understreckad", "Överstreckad", "Övriga", "Alla"]) {
      const x = groups[g];
      if (!x) continue;
      markRows.push([period, g, x.n, pct(x.streck / x.n), pct(x.chance / x.n), pct(x.wins / x.n), num(x.wins / x.n / (x.streck / x.n)), num(x.ret / x.n)]);
    }
  }
  table(["Period", "Märke", "Hästar", "Medel streck", "Medel chans", "Vann", "Vann / streck", "Avk./kr vinnarspel"], markRows);

  const file = arg("--out");
  if (file) {
    fs.writeFileSync(file, out.join("\n") + "\n");
    console.error(`Skrev ${file}`);
  }
}

main();
