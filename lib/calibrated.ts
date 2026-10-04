/**
 * Kalibrerad chans — Benters tvåstegsmodell (issue #98, avsnitt 1.1).
 *
 *   p_i = softmax( a·log(streck_i) + b·log(oddsP_i) + c·log(grund_i) )
 *
 * Streck, oddsens implicita sannolikhet och Grundchans normaliseras var för
 * sig inom fältet (skalan spelar därför ingen roll: procent eller andel går
 * lika bra), golvas och kombineras log-linjärt. Vikterna skattas med
 * maximum likelihood (conditional logit) på ATG-cachen i
 * scripts/fit-calibrated.ts och lagras i lib/data/calibrated-model.json.
 *
 * Läget väljs per lopp utifrån vilka data som finns: före vinnarpoolen finns
 * inga odds (noOdds), före V-poolen inte heller streck (grundOnly). Varje
 * läge har egna vikter. Strukna hästar får alltid 0.
 *
 * Påverkar inte Chans i loppvyn (lib/probability.ts) — används av
 * systemoptimeraren (lib/optimizer.ts).
 */
import modelJson from "@/lib/data/calibrated-model.json";
import { computeFundamentalMapForRows, scratchedMask, type FundamentalResult } from "./fundamental";
import type { Race } from "./raceTypes";

/** Golv för normaliserade andelar innan log — en häst med 0 % streck får 0,1 % */
export const CALIBRATED_FLOOR = 0.001;

export const CALIBRATED_MODES = [
  "full", "noOdds", "grundOnly", "noGrund", "streckOnly", "oddsOnly", "oddsGrund",
] as const;
export type CalibratedMode = (typeof CALIBRATED_MODES)[number];

export interface CalibratedWeights {
  /** a — vikt på log(streck) */
  streck: number;
  /** b — vikt på log(oddsens implicita sannolikhet) */
  odds: number;
  /** c — vikt på log(Grundchans) */
  grund: number;
}

export interface CalibratedModeMetrics {
  logloss: number;
  pseudo_r2: number;
  n: number;
}

export interface CalibratedModel {
  /** "untrained" tills scripts/fit-calibrated.ts skrivit en riktig modell */
  version: string;
  floor: number;
  modes: Record<CalibratedMode, CalibratedWeights>;
  /** Grundchans-versionen som vikterna skattades mot */
  fundamental_version?: string;
  trained_races?: number;
  /** Mått på testperioden (vikter skattade enbart på träningsperioden) */
  test_metrics?: Record<string, CalibratedModeMetrics>;
}

// JSON-filen typas av TypeScript utifrån innehållet — omvandla via unknown
export const CALIBRATED_MODEL = modelJson as unknown as CalibratedModel;

export interface CalibratedInput {
  start_number: number;
  /** Streck i valfri skala (procent eller andel); null/0 = saknas */
  streck: number | null;
  /** Vinnarodds (decimal, t.ex. 3,45); null/0 = saknas */
  odds: number | null;
  /** Grundchans 0–1; null = saknas */
  grund: number | null;
  scratched?: boolean;
}

export interface CalibratedResult {
  /** Läget som användes, null när inga data fanns (likformig fördelning) */
  mode: CalibratedMode | null;
  /** Kalibrerad chans per häst i samma ordning som indata; strukna = 0 */
  p: number[];
}

export interface Availability {
  streck: boolean;
  odds: boolean;
  grund: boolean;
}

export function chooseMode(a: Availability): CalibratedMode | null {
  if (a.streck && a.odds && a.grund) return "full";
  if (a.streck && a.grund) return "noOdds";
  if (a.odds && a.grund) return "oddsGrund";
  if (a.streck && a.odds) return "noGrund";
  if (a.grund) return "grundOnly";
  if (a.streck) return "streckOnly";
  if (a.odds) return "oddsOnly";
  return null;
}

const positive = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/** Normaliserar inom fältet och golvar; saknade värden får golvet */
function normalizedLogs(values: (number | null)[], floor: number): number[] {
  const total = values.reduce<number>((a, v) => a + (positive(v) ? v : 0), 0);
  return values.map((v) => Math.log(Math.max(positive(v) && total > 0 ? v / total : 0, floor)));
}

/** Log-värden för en signal (streck, oddsP eller grund) — exporteras för skattningen */
export function signalLogs(field: CalibratedInput[], floor = CALIBRATED_FLOOR): {
  streck: number[]; odds: number[]; grund: number[]; available: Availability;
} {
  const streck = field.map((h) => (positive(h.streck) ? h.streck : null));
  const odds = field.map((h) => (positive(h.odds) ? 1 / h.odds : null));
  const grund = field.map((h) => (positive(h.grund) ? h.grund : null));
  return {
    streck: normalizedLogs(streck, floor),
    odds: normalizedLogs(odds, floor),
    grund: normalizedLogs(grund, floor),
    available: {
      streck: streck.some((v) => v != null),
      odds: odds.some((v) => v != null),
      grund: grund.some((v) => v != null),
    },
  };
}

/**
 * Kalibrerad chans för ett helt fält. Måste anropas med fältets samtliga
 * hästar; strukna (scratched) hålls utanför normaliseringen och får 0.
 */
export function computeCalibratedChance(
  field: CalibratedInput[],
  model: CalibratedModel = CALIBRATED_MODEL
): CalibratedResult {
  if (field.length === 0) return { mode: null, p: [] };
  const activeIdx = field.map((h, i) => (h.scratched ? -1 : i)).filter((i) => i >= 0);
  const p = field.map(() => 0);
  if (activeIdx.length === 0) return { mode: null, p };

  const active = activeIdx.map((i) => field[i]);
  const logs = signalLogs(active, model.floor ?? CALIBRATED_FLOOR);
  const mode = chooseMode(logs.available);
  if (mode == null) {
    activeIdx.forEach((i) => (p[i] = 1 / active.length));
    return { mode: null, p };
  }
  const w = model.modes[mode];
  const u = active.map((_, j) => w.streck * logs.streck[j] + w.odds * logs.odds[j] + w.grund * logs.grund[j]);
  const max = Math.max(...u);
  const e = u.map((v) => Math.exp(v - max));
  const total = e.reduce((a, b) => a + b, 0);
  activeIdx.forEach((i, j) => (p[i] = e[j] / total));
  return { mode, p };
}

export interface CalibratedForRaceOptions {
  model?: CalibratedModel;
  /** Redan beräknad Grundchans (t.ex. RaceMaps.fundamental) — annars räknas den här */
  fundamental?: Record<number, FundamentalResult>;
}

/**
 * Kalibrerad chans per startnummer för en avdelning i appen. Grundchans och
 * strukna hästar räknas på samma sätt som i loppvyn (lib/raceView.ts).
 */
export function calibratedForRace(race: Race, opts: CalibratedForRaceOptions = {}): Record<number, number> {
  const mask = scratchedMask(race.starters);
  const raceDate = race.start_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const fundamental = opts.fundamental ?? computeFundamentalMapForRows(race, raceDate, race.starters);
  const { p } = computeCalibratedChance(
    race.starters.map((s, i) => ({
      start_number: s.start_number,
      streck: s.bet_distribution,
      odds: s.odds,
      grund: fundamental[s.start_number]?.p ?? null,
      scratched: mask[i],
    })),
    opts.model
  );
  return Object.fromEntries(race.starters.map((s, i) => [s.start_number, p[i]]));
}
