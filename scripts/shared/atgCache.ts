/**
 * Delad inläsning av ATG-cachen (.cache/atg) för skripten fit-fundamental,
 * fit-calibrated och backtest-optimizer. Läser bara lokala filer.
 *
 *   games/<id>.json.gz  — /games/{id}: streck, vinnarodds, vinnare, utdelning
 *   races/<id>.json.gz  — /races/{id}/extended: hästdata för Grundchans
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseTimeToSeconds } from "../../lib/analysis";
import { fromAtgRace, fromAtgStart } from "../../lib/fundamental/atgAdapter";
import {
  computeRawFeatures, FACTORS, isFaulty,
  type FundamentalRace, type FundamentalStarter, type SpeedTables,
} from "../../lib/fundamental/features";
import { computeFundamental, standardizeField, type FundamentalModel } from "../../lib/fundamental/model";
import {
  estimateSpeedTables, fitConditionalLogit, raceProbs,
  type SpeedRecord, type TrainingRace,
} from "../../lib/fundamental/fit";

export const CACHE = path.join(".cache", "atg");
/** L2-straff för Grundchans — samma som scripts/fit-fundamental.ts */
export const FUNDAMENTAL_LAMBDA = 3;

export type Json = Record<string, unknown>;

export function obj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}
export function readGz(file: string): Json {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
}

// ── Träningsexempel för Grundchans ────────────────────────────────────────

export interface Example {
  id: string;
  race: FundamentalRace;
  starters: FundamentalStarter[];
  horseIds: string[];
  winner: number;
  odds: number[];
  streck: number[];
}

export function loadExamples(): Example[] {
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

export function speedRecords(examples: Example[], beforeDate: string | null): SpeedRecord[] {
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

export function toTraining(examples: Example[], tables: SpeedTables): TrainingRace[] {
  return examples.map((ex) => {
    const z = standardizeField(ex.starters.map((s) => computeRawFeatures(ex.race, s, tables)));
    return { z: z.map((row) => FACTORS.map((f) => row[f])), winner: ex.winner };
  });
}

// ── Hela omgångar (backtest och kalibrering) ──────────────────────────────

export interface CachedStart {
  number: number;
  horseId: string;
  horseName: string;
  scratched: boolean;
  /** Slutodds i vinnarpoolen (decimal), null om saknas */
  odds: number | null;
  /** Slutstreck i procent (som starters.bet_distribution), null om saknas */
  streck: number | null;
  /** Grundchans-indata (bara travlopp) */
  fund: FundamentalStarter | null;
}

export interface CachedRace {
  id: string;
  date: string;
  /** Avdelning 1..n i spelet */
  leg: number;
  sport: string;
  monte: boolean;
  fundRace: FundamentalRace;
  starts: CachedStart[];
  /** Vinnande startnummer (två vid dött lopp) */
  winners: number[];
}

export interface CachedPayout {
  /** Antal vinnande rader i hela poolen */
  systems: number;
  /** Utdelning per vinnande rad i öre, null om nivån inte betalades ut */
  payout: number | null;
  jackpot: boolean;
  moved: boolean;
  /** Potten för nivån i öre (pools.<typ>.payouts) */
  pool: number | null;
}

export interface CachedGame {
  id: string;
  type: string;
  date: string;
  races: CachedRace[];
  /** Omsättning i öre */
  turnover: number;
  payouts: Record<number, CachedPayout>;
}

export function loadGames(types?: string[]): CachedGame[] {
  const out: CachedGame[] = [];
  for (const f of fs.readdirSync(path.join(CACHE, "games")).sort()) {
    const game = readGz(path.join(CACHE, "games", f));
    const id = String(game["id"]);
    const type = id.split("_")[0];
    if (types && !types.includes(type)) continue;
    const pool = obj(obj(game["pools"])[type]);
    const result = obj(obj(pool["result"])["payouts"]);
    const poolTotals = obj(pool["payouts"]);
    const payouts: Record<number, CachedPayout> = {};
    for (const [k, v] of Object.entries(result)) {
      const p = obj(v);
      payouts[Number(k)] = {
        systems: Number(p["systems"] ?? 0),
        payout: p["payout"] != null ? Number(p["payout"]) : null,
        jackpot: Boolean(p["jackpot"]),
        moved: Boolean(p["movedDividend"]),
        pool: poolTotals[k] != null ? Number(poolTotals[k]) : null,
      };
    }

    const races: CachedRace[] = [];
    let ok = true;
    ((game["races"] as Json[] | undefined) ?? []).forEach((r, idx) => {
      const file = path.join(CACHE, "races", `${r["id"]}.json.gz`);
      if (!fs.existsSync(file)) {
        ok = false;
        return;
      }
      const ext = readGz(file);
      const fundRace = fromAtgRace(ext);
      const sport = String(ext["sport"] ?? "");
      const terms = ((ext["terms"] as string[] | undefined) ?? []).join(" ").toLowerCase();
      const monte = String(ext["name"] ?? "").toLowerCase().includes("monté") || terms.includes("monté");
      const scratchings = new Set(((obj(ext["result"])["scratchings"] as number[] | undefined) ?? []).map(Number));
      const extStarts = new Map(((ext["starts"] as Json[] | undefined) ?? []).map((s) => [Number(s["number"]), s]));

      const starts: CachedStart[] = ((r["starts"] as Json[] | undefined) ?? []).map((s) => {
        const number = Number(s["number"]);
        const pools = obj(s["pools"]);
        const oddsRaw = obj(pools["vinnare"])["odds"];
        const bd = obj(pools[type])["betDistribution"];
        const es = extStarts.get(number);
        const scratched = Boolean(s["scratched"]) || scratchings.has(number);
        return {
          number,
          horseId: String(obj(s["horse"])["id"] ?? ""),
          horseName: String(obj(s["horse"])["name"] ?? ""),
          scratched,
          odds: oddsRaw != null && Number(oddsRaw) > 0 ? Number(oddsRaw) / 100 : null,
          streck: bd != null ? Number(bd) / 100 : null,
          fund: sport === "trot" && es && !scratched ? fromAtgStart(es, fundRace) : null,
        };
      });

      let winners = ((obj(obj(obj(r["pools"])["vinnare"])["result"])["winners"] as Json[] | undefined) ?? [])
        .map((w) => Number(w["number"]));
      if (winners.length === 0) {
        winners = [...extStarts.values()]
          .filter((s) => obj(s["result"])["finishOrder"] === 1 || obj(s["result"])["place"] === 1)
          .map((s) => Number(s["number"]));
      }
      races.push({ id: String(r["id"]), date: fundRace.date, leg: idx + 1, sport, monte, fundRace, starts, winners });
    });
    if (!ok || races.length === 0) continue;
    out.push({
      id, type, date: races[0].date, races,
      turnover: Number(pool["turnover"] ?? 0), payouts,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

// ── Grundchans framåtrullande (ingen läckage) ─────────────────────────────

/** Tränar Grundchans på exemplen före ett datum, som fit-fundamental (inkl. temperatur) */
export function fitFundamentalBefore(examples: Example[], cutDate: string): FundamentalModel {
  const before = examples.filter((e) => e.race.date < cutDate);
  const tables = estimateSpeedTables(speedRecords(examples, cutDate));
  const z = toTraining(before, tables);
  const iVa = Math.floor(z.length * 0.75);
  const k = FACTORS.length;
  const betaTr = fitConditionalLogit(z.slice(0, iVa), k, FUNDAMENTAL_LAMBDA);
  const tempRaces: TrainingRace[] = z.slice(iVa).map((r) => ({
    z: raceProbs(r.z, betaTr).map((p) => [Math.log(Math.max(p, 1e-12))]),
    winner: r.winner,
  }));
  const temperature = fitConditionalLogit(tempRaces, 1, 1e-6)[0];
  const beta = fitConditionalLogit(z, k, FUNDAMENTAL_LAMBDA);
  return {
    version: `wf-${cutDate}`,
    trained_races: before.length,
    test_metrics: null,
    temperature,
    beta: Object.fromEntries(FACTORS.map((f, i) => [f, beta[i] * temperature])),
    ...tables,
  };
}

/** Datum vid kvantilen q (0–1) av exemplens loppdatum */
export function dateQuantile(examples: Example[], q: number): string {
  return examples[Math.min(examples.length - 1, Math.floor(examples.length * q))].race.date;
}

/**
 * Grundchans för varje travlopp i omgångarna, från en modell som bara sett
 * lopp före respektive brytdatum (omtränas vid varje brytpunkt). Lopp före
 * första brytpunkten får ingen Grundchans.
 * Returnerar lopp-id → (startnummer → p).
 */
export function walkForwardGrund(
  examples: Example[],
  games: CachedGame[],
  cutDates: string[],
  log: (msg: string) => void = () => {}
): Map<string, Map<number, number>> {
  const out = new Map<string, Map<number, number>>();
  const cuts = [...cutDates].sort();
  for (let i = 0; i < cuts.length; i++) {
    const from = cuts[i];
    const to = cuts[i + 1] ?? "9999-12-31";
    const model = fitFundamentalBefore(examples, from);
    log(`  Grundchans tränad före ${from} (${model.trained_races} lopp) → används ${from} – ${to}`);
    for (const g of games) {
      for (const r of g.races) {
        if (r.date < from || r.date >= to || r.sport !== "trot") continue;
        const active = r.starts.filter((s) => !s.scratched && s.fund);
        if (active.length < 2) continue;
        const res = computeFundamental(r.fundRace, active.map((s) => s.fund!), model);
        out.set(r.id, new Map(res.filter((x) => x.p != null).map((x) => [x.start_number, x.p!])));
      }
    }
  }
  return out;
}
