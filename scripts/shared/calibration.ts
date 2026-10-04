/**
 * Skattning av kalibrerad chans (lib/calibrated.ts) på ATG-cachen. Delas av
 * scripts/fit-calibrated.ts och scripts/backtest-optimizer.ts så att båda
 * använder samma kronologiska uppdelning och samma framåtrullande Grundchans.
 *
 * Tidslinje (kvantiler av loppdatum):
 *   0 – 30 %   bara träning av Grundchans (ingen Grundchans utan läckage)
 *   30 – 65 %  träningsperiod: vikter a, b, c (och λ/trösklar i backtesten)
 *   65 – 100 % testperiod: utvärdering
 * Grundchans omtränas vid 30, 40, …, 90 % och används bara framåt i tiden.
 */
import {
  CALIBRATED_FLOOR, CALIBRATED_MODES, computeCalibratedChance, signalLogs,
  type CalibratedInput, type CalibratedMode, type CalibratedModel, type CalibratedWeights,
} from "../../lib/calibrated";
import { evaluate, fitConditionalLogit, type Metrics, type TrainingRace } from "../../lib/fundamental/fit";
import {
  dateQuantile, loadExamples, loadGames, walkForwardGrund,
  type CachedGame, type CachedRace,
} from "./atgCache";

export const WALK_FORWARD_CUTS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
export const TRAIN_END_QUANTILE = 0.65;

/** Vilka signaler varje läge använder */
export const MODE_SIGNALS: Record<CalibratedMode, ("streck" | "odds" | "grund")[]> = {
  full: ["streck", "odds", "grund"],
  noOdds: ["streck", "grund"],
  grundOnly: ["grund"],
  noGrund: ["streck", "odds"],
  streckOnly: ["streck"],
  oddsOnly: ["odds"],
  oddsGrund: ["odds", "grund"],
};

export interface CalibRace {
  id: string;
  date: string;
  gameType: string;
  /** Hela fältet inklusive strukna (scratched = true) */
  field: CalibratedInput[];
  /** Index i field för vinnaren/vinnarna */
  winners: number[];
}

export interface CalibrationData {
  games: CachedGame[];
  grund: Map<string, Map<number, number>>;
  races: CalibRace[];
  /** Första datum med Grundchans utan läckage */
  start: string;
  /** Första datum i testperioden */
  trainEnd: string;
  end: string;
}

export function toCalibRace(r: CachedRace, gameType: string, grund: Map<number, number> | undefined): CalibRace {
  const field = r.starts.map((s) => ({
    start_number: s.number,
    streck: s.streck,
    odds: s.odds,
    grund: grund?.get(s.number) ?? null,
    scratched: s.scratched,
  }));
  return {
    id: r.id, date: r.date, gameType, field,
    winners: r.winners.map((w) => field.findIndex((h) => h.start_number === w)).filter((i) => i >= 0),
  };
}

export function prepareCalibration(log: (msg: string) => void = () => {}): CalibrationData {
  const examples = loadExamples();
  const games = loadGames();
  const cuts = WALK_FORWARD_CUTS.map((q) => dateQuantile(examples, q));
  const grund = walkForwardGrund(examples, games, cuts, log);
  const races: CalibRace[] = [];
  for (const g of games) {
    for (const r of g.races) {
      if (r.date < cuts[0] || !grund.has(r.id)) continue;
      races.push(toCalibRace(r, g.type, grund.get(r.id)));
    }
  }
  races.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return {
    games, grund, races,
    start: cuts[0],
    trainEnd: dateQuantile(examples, TRAIN_END_QUANTILE),
    end: examples[examples.length - 1].race.date,
  };
}

/** Lopp med exakt en vinnare bland de icke strukna och minst två startande */
function fittable(r: CalibRace): boolean {
  return r.winners.length === 1 && !r.field[r.winners[0]].scratched && r.field.filter((h) => !h.scratched).length >= 2;
}

function toTrainingRace(r: CalibRace, mode: CalibratedMode, floor: number): TrainingRace {
  const active = r.field.filter((h) => !h.scratched);
  const logs = signalLogs(active, floor);
  const winner = active.indexOf(r.field[r.winners[0]]);
  return { z: active.map((_, i) => MODE_SIGNALS[mode].map((sig) => logs[sig][i])), winner };
}

/** Maximum likelihood (conditional logit) för ett läge */
export function fitMode(races: CalibRace[], mode: CalibratedMode, floor = CALIBRATED_FLOOR): CalibratedWeights {
  const data = races.filter(fittable).map((r) => toTrainingRace(r, mode, floor));
  const beta = fitConditionalLogit(data, MODE_SIGNALS[mode].length, 1e-6);
  const w: CalibratedWeights = { streck: 0, odds: 0, grund: 0 };
  MODE_SIGNALS[mode].forEach((sig, i) => (w[sig] = beta[i]));
  return w;
}

export function fitAllModes(races: CalibRace[], version: string): CalibratedModel {
  const modes = Object.fromEntries(CALIBRATED_MODES.map((m) => [m, fitMode(races, m)])) as Record<CalibratedMode, CalibratedWeights>;
  return { version, floor: CALIBRATED_FLOOR, modes, trained_races: races.filter(fittable).length };
}

/** Tar bort signaler som läget inte använder, så att lägesvalet blir rätt */
export function restrictToMode(field: CalibratedInput[], mode: CalibratedMode): CalibratedInput[] {
  const sig = MODE_SIGNALS[mode];
  return field.map((h) => ({
    ...h,
    streck: sig.includes("streck") ? h.streck : null,
    odds: sig.includes("odds") ? h.odds : null,
    grund: sig.includes("grund") ? h.grund : null,
  }));
}

/** Mått för en sannolikhetsfunktion (fältets aktiva hästar) på passande lopp */
export function evaluateProbs(races: CalibRace[], probs: (r: CalibRace) => number[] | null): Metrics {
  const ps: number[][] = [];
  const ws: number[] = [];
  for (const r of races) {
    if (!fittable(r)) continue;
    const p = probs(r);
    if (!p) continue;
    const activeIdx = r.field.map((h, i) => (h.scratched ? -1 : i)).filter((i) => i >= 0);
    ps.push(activeIdx.map((i) => p[i]));
    ws.push(activeIdx.indexOf(r.winners[0]));
  }
  return evaluate(ps, ws);
}

export function calibratedProbs(model: CalibratedModel, mode: CalibratedMode) {
  return (r: CalibRace) => computeCalibratedChance(restrictToMode(r.field, mode), model).p;
}
