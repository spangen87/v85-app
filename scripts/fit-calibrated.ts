/**
 * Skattar vikterna för kalibrerad chans (lib/calibrated.ts, issue #98 §1.1):
 *
 *   p_i = softmax( a·log(streck_i) + b·log(oddsP_i) + c·log(grund_i) )
 *
 * per läge (full, noOdds, grundOnly, …) med maximum likelihood (conditional
 * logit) på ATG-cachen. Kronologisk uppdelning: vikterna skattas på
 * träningsperioden och rapporteras på den senare testperioden mot rent
 * streck, rena odds och dagens 50/50-blandning (lib/probability.ts).
 * Grundchans räknas framåtrullande (bara modeller tränade på äldre lopp),
 * så att c inte överskattas av att Grundchans redan sett facit.
 *
 * Körning:  npm run fit-calibrated              (rapport)
 *           npm run fit-calibrated -- --write   (skriver lib/data/calibrated-model.json)
 *
 * Den skrivna modellen skattas på tränings- + testperioden; testmåtten i
 * filen kommer från vikterna som bara sett träningsperioden.
 * Kräver .cache/atg (hämtas av npm run fit-fundamental). Läser inget i Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import { CALIBRATED_MODES, type CalibratedMode, type CalibratedModel } from "../lib/calibrated";
import { MODEL as FUNDAMENTAL_MODEL } from "../lib/fundamental/model";
import type { Metrics } from "../lib/fundamental/fit";
import { computeWinProbabilities } from "../lib/probability";
import {
  calibratedProbs, evaluateProbs, fitAllModes, MODE_SIGNALS, prepareCalibration, type CalibRace,
} from "./shared/calibration";

const MODEL_PATH = path.join("lib", "data", "calibrated-model.json");

const has = (flag: string) => process.argv.includes(flag);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function normalized(values: (number | null)[]): number[] | null {
  const v = values.map((x) => (x != null && x > 0 ? x : 0));
  const s = v.reduce((a, b) => a + b, 0);
  return s > 0 ? v.map((x) => x / s) : null;
}
const active = (r: CalibRace) => r.field.map((h) => !h.scratched);
const masked = (r: CalibRace, p: number[] | null) => (p ? p.map((x, i) => (active(r)[i] ? x : 0)) : null);

const BASELINES: Record<string, (r: CalibRace) => number[] | null> = {
  "Likformig": (r) => {
    const n = r.field.filter((h) => !h.scratched).length;
    return r.field.map((h) => (h.scratched ? 0 : 1 / n));
  },
  "Streck": (r) => masked(r, normalized(r.field.map((h) => (h.scratched ? null : h.streck)))),
  "Vinnarodds": (r) => masked(r, normalized(r.field.map((h) => (h.scratched || !h.odds ? null : 1 / h.odds)))),
  "50/50 streck+odds (Chans idag)": (r) => {
    const act = r.field.filter((h) => !h.scratched);
    const probs = computeWinProbabilities(act.map((h) => ({ odds: h.odds, bet_distribution: h.streck })));
    let j = 0;
    return r.field.map((h) => (h.scratched ? 0 : probs[j++].p));
  },
  "Grundchans (framåtrullande)": (r) => masked(r, normalized(r.field.map((h) => (h.scratched ? null : h.grund)))),
};

function line(name: string, m: Metrics) {
  console.log(
    `  ${name.padEnd(34)} logloss=${m.logloss.toFixed(4)}  pseudoR²=${m.pseudo_r2.toFixed(4)}  top1=${pct(m.top1)}  n=${m.n}`
  );
}
const fmtW = (w: { streck: number; odds: number; grund: number }) =>
  `a(streck)=${w.streck.toFixed(3)}  b(odds)=${w.odds.toFixed(3)}  c(grund)=${w.grund.toFixed(3)}`;

function main() {
  console.log("Läser cachen och tränar Grundchans framåtrullande …");
  const data = prepareCalibration((m) => console.log(m));
  const train = data.races.filter((r) => r.date < data.trainEnd);
  const test = data.races.filter((r) => r.date >= data.trainEnd);
  console.log(`\n${data.races.length} travlopp med Grundchans (${data.start} → ${data.end}).`);
  console.log(`Träning ${train.length} lopp (${data.start} – ${data.trainEnd}), test ${test.length} lopp (från ${data.trainEnd}).\n`);

  const trained = fitAllModes(train, "train");
  console.log("=== Vikter (träningsperioden) ===");
  for (const m of CALIBRATED_MODES) console.log(`  ${m.padEnd(11)} ${fmtW(trained.modes[m])}`);

  console.log("\n=== Testperiod ===");
  const testMetrics: Record<string, Metrics> = {};
  for (const [name, fn] of Object.entries(BASELINES)) {
    testMetrics[name] = evaluateProbs(test, fn);
    line(name, testMetrics[name]);
  }
  for (const m of CALIBRATED_MODES) {
    testMetrics[`Kalibrerad ${m}`] = evaluateProbs(test, calibratedProbs(trained, m));
    line(`Kalibrerad ${m} (${MODE_SIGNALS[m].join("+")})`, testMetrics[`Kalibrerad ${m}`]);
  }

  console.log("\n=== Testperiod per speltyp (pseudo-R²) ===");
  const types = [...new Set(test.map((r) => r.gameType))].sort();
  console.log(`  ${"typ".padEnd(6)} ${"n".padStart(5)}  ${"streck".padStart(7)}  ${"odds".padStart(7)}  ${"50/50".padStart(7)}  ${"full".padStart(7)}  ${"noOdds".padStart(7)}`);
  for (const t of types) {
    const sub = test.filter((r) => r.gameType === t);
    const row = [
      evaluateProbs(sub, BASELINES["Streck"]),
      evaluateProbs(sub, BASELINES["Vinnarodds"]),
      evaluateProbs(sub, BASELINES["50/50 streck+odds (Chans idag)"]),
      evaluateProbs(sub, calibratedProbs(trained, "full")),
      evaluateProbs(sub, calibratedProbs(trained, "noOdds")),
    ];
    console.log(`  ${t.padEnd(6)} ${String(row[0].n).padStart(5)}  ${row.map((m) => m.pseudo_r2.toFixed(4).padStart(7)).join("  ")}`);
  }

  console.log("\n=== Kalibrering, läge full (test) ===");
  const pairs: [number, number][] = [];
  const fullFn = calibratedProbs(trained, "full");
  for (const r of test) {
    if (r.winners.length !== 1) continue;
    fullFn(r).forEach((p, i) => {
      if (!r.field[i].scratched) pairs.push([p, i === r.winners[0] ? 1 : 0]);
    });
  }
  for (const [lo, hi] of [[0, 0.03], [0.03, 0.06], [0.06, 0.1], [0.1, 0.15], [0.15, 0.25], [0.25, 0.4], [0.4, 0.6], [0.6, 1.01]]) {
    const bin = pairs.filter(([p]) => p >= lo && p < hi);
    if (!bin.length) continue;
    const pred = bin.reduce((a, [p]) => a + p, 0) / bin.length;
    const act = bin.reduce((a, [, w]) => a + w, 0) / bin.length;
    console.log(`  [${lo.toFixed(2)}, ${hi.toFixed(2)})  n=${String(bin.length).padStart(5)}  förutsagt=${pct(pred)}  faktiskt=${pct(act)}`);
  }

  const final = fitAllModes([...train, ...test], new Date().toISOString().slice(0, 10));
  console.log("\n=== Vikter (tränings- + testperioden, skrivs till modellfilen) ===");
  for (const m of CALIBRATED_MODES) console.log(`  ${m.padEnd(11)} ${fmtW(final.modes[m])}`);

  if (!has("--write")) {
    console.log("\n(Kör med --write för att skriva modellfilen.)");
    return;
  }
  const round = (x: number) => Number(x.toFixed(4));
  const model: CalibratedModel = {
    version: final.version,
    floor: final.floor,
    fundamental_version: FUNDAMENTAL_MODEL.version,
    trained_races: final.trained_races,
    modes: Object.fromEntries(
      CALIBRATED_MODES.map((m) => [m, {
        streck: round(final.modes[m].streck), odds: round(final.modes[m].odds), grund: round(final.modes[m].grund),
      }])
    ) as Record<CalibratedMode, { streck: number; odds: number; grund: number }>,
    test_metrics: Object.fromEntries(
      Object.entries(testMetrics).map(([k, m]) => [k, { logloss: round(m.logloss), pseudo_r2: round(m.pseudo_r2), n: m.n }])
    ),
  };
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2) + "\n");
  console.log(`\nSkrev ${MODEL_PATH} (version ${model.version}, ${model.trained_races} lopp).`);
}

main();
