/**
 * Systemoptimerare (issue #98, avsnitt 1.2–1.3). Rena funktioner.
 *
 * Med kalibrerad chans p och streck s per häst, r = p / s:
 *
 *   P(alla rätt)        = Π_avd Σ_valda p
 *   P(alla utom en)     = Σ_avd (1 − täckning_avd) · Π_övriga täckning
 *   Värdeindex          = Π_avd medel_valda(r)   (förväntad utdelning per krona,
 *                                                 relativt ett "streckat" system)
 *
 * Utdelningen för alla rätt är ungefär proportionell mot 1 / Π streck(vinnare),
 * så förväntad utdelning faktoriserar per avdelning. Avdelningarna antas
 * oberoende.
 *
 * Optimeringen ordnar hästarna i varje avdelning efter p · r^λ, tar prefix
 * (topp 1 … 8) som kandidater och söker den kombination av antal per
 * avdelning som maximerar log P(alla rätt) + λ · log(värdeindex) inom
 * budgeten och spikvillkoret. Målet är en summa per avdelning, så sökningen
 * görs som dynamisk programmering över (rader, spikar) — exakt och snabb
 * eftersom antalet rader begränsas av budgeten.
 */
import { CALIBRATED_MODEL, calibratedForRace, type CalibratedModel, type CoverageCalibration } from "./calibrated";
import { scratchedMask, type FundamentalResult } from "./fundamental";
import type { Race } from "./raceTypes";
import type { SystemSelection } from "./types";

/** En spik kräver minst så här hög kalibrerad chans (annars spikas 25-procentare) */
export const MIN_SPIKE_CHANCE = 0.35;
/** Största antal hästar per avdelning som optimeraren prövar (utöver låsta) */
export const MAX_HORSES_PER_RACE = 8;
/** Golv för streck (andel) — en häst med 0 % streck får 0,1 % */
export const STRECK_FLOOR = 0.001;

export const PROPOSAL_PRESETS = [
  { key: "maxChans", label: "Max chans", lambda: 0 },
  { key: "balans", label: "Balans", lambda: 0.3 },
  { key: "varde", label: "Värde", lambda: 0.6 },
] as const;
export type ProposalKey = (typeof PROPOSAL_PRESETS)[number]["key"];

export interface OptimizerHorse {
  start_number: number;
  horse_id: string;
  horse_name: string;
  /** Kalibrerad chans 0–1 (0 för strukna) */
  chance: number;
  /** Streck som andel 0–1, null om det saknas */
  streck: number | null;
  scratched: boolean;
}

export interface OptimizerRace {
  race_number: number;
  horses: OptimizerHorse[];
}

export interface HorseRef {
  race_number: number;
  start_number: number;
}

/** in = alltid med, out = aldrig med, spike = ensam i avdelningen (räknas som spik) */
export type LockKind = "in" | "out" | "spike";
export interface OptimizerLock extends HorseRef {
  kind: LockKind;
}

/** Användarens egen chans (0–1) för en häst; övriga i loppet skalas om */
export interface ChanceOverride extends HorseRef {
  chance: number;
}

/** Exakt antal spikar, eller ett intervall */
export type SpikeConstraint = number | { min: number; max: number };

export interface RaceCoverage {
  race_number: number;
  /** Antal valda hästar */
  horses: number;
  spike: boolean;
  /** Chansen att avdelningen går in (0–1), efter kalibrering av täckningen */
  chans: number;
  /** Summa kalibrerad chans för de valda, före kalibrering av täckningen */
  chansRaw: number;
  /** Summa streck för de valda (0–1), null om avdelningen saknar streck */
  streck: number | null;
  /** Medel av r = chans/streck för de valda (1 när streck saknas) */
  value: number;
  streckMissing: boolean;
}

export interface SpikeTradeoff {
  race_number: number;
  start_number: number;
  /** Spikens chans 0–1 */
  chance: number;
  /** Nästa häst i ordningen (p · r^λ) som jämförs */
  nextStartNumber: number;
  /** Relativ ändring i träffchans i avdelningen mot att ta med nästa häst (−0,49 = −49 %) */
  chanceDelta: number;
  /** Relativ ändring i förväntad utdelning per krona (+0,19 = +19 %) */
  valueDelta: number;
  /** Systemets P(alla rätt) och värdeindex om nästa häst läggs till */
  p8IfAdded: number;
  valueIndexIfAdded: number;
}

export interface SystemMetrics {
  /** P(alla rätt) — 8 rätt på V85/V86, 6 rätt på V64 osv. */
  p8: number;
  /** P(exakt alla utom en rätt) — 7 rätt på V85/V86 */
  p7: number;
  /** Π medel(r) över avdelningar med val; 1 = som ett streckat system */
  valueIndex: number;
  /** Chansen att alla spikar håller (1 utan spikar) */
  pAllSpikesHold: number;
  rows: number;
  /** Alla avdelningar har minst en häst */
  complete: boolean;
  coverage: RaceCoverage[];
  spikeTradeoffs: SpikeTradeoff[];
}

export interface MetricsOptions {
  /** Värdevikten som bestämmer "nästa häst" i spikavvägningen (standard 0) */
  lambda?: number;
  overrides?: ChanceOverride[];
  /** Kalibrering av täckningen; utelämnad = ingen (ren matematik) */
  coverageCalibration?: CoverageCalibration | null;
}

/** Kalibreringen som appen använder (från lib/data/calibrated-model.json) */
export const APP_COVERAGE_CALIBRATION: CoverageCalibration | null = CALIBRATED_MODEL.coverage ?? null;

/** Kalibrerad täckning: logit(c′) = alpha + beta·logit(c). 0 och 1 behålls. */
export function adjustCoverage(c: number, cal?: CoverageCalibration | null): number {
  if (!cal || c <= 0 || c >= 1) return c;
  const x = cal.alpha + cal.beta * Math.log(c / (1 - c));
  return 1 / (1 + Math.exp(-x));
}

export interface OptimizeInput {
  races: OptimizerRace[];
  budgetKr: number;
  /** Radpris i kr (getRowPrice) */
  rowPrice: number;
  spikes: SpikeConstraint;
  /** Värdevikt: 0 = max chans, 0,3 = balans, 0,6 = värde */
  lambda: number;
  locks?: OptimizerLock[];
  overrides?: ChanceOverride[];
  /** Kalibrering av täckningen i de förutsagda måtten; utelämnad = ingen */
  coverageCalibration?: CoverageCalibration | null;
  /**
   * Använd kalibreringen även i målet (påverkar vilka hästar som väljs).
   * Av som standard: i backtesten gav det ingen förbättring (rapporten).
   */
  calibrateObjective?: boolean;
}

export interface OptimizedSystem {
  lambda: number;
  selection: SystemSelection[];
  rows: number;
  /** Kostnad i kr */
  cost: number;
  spikes: number;
  p8: number;
  p7: number;
  valueIndex: number;
  pAllSpikesHold: number;
  metrics: SystemMetrics;
  /** Upplysningar, t.ex. avdelningar utan streck eller låsta strukna hästar */
  notes: string[];
}

export type OptimizeResult = { ok: true; system: OptimizedSystem } | { ok: false; reason: string };

export interface SystemProposal {
  key: ProposalKey;
  label: string;
  lambda: number;
  system: OptimizedSystem | null;
  /** Svensk förklaring när inget system ryms */
  reason: string | null;
}

// ── Förberedelse ──────────────────────────────────────────────────────────

/**
 * Egna bedömningar ersätter den kalibrerade chansen; övriga icke strukna
 * hästar i loppet skalas om så att summan blir 1. Strukna hästar påverkas inte.
 */
export function applyOverrides(races: OptimizerRace[], overrides: ChanceOverride[] = []): OptimizerRace[] {
  if (overrides.length === 0) return races;
  return races.map((race) => {
    const own = new Map<number, number>();
    for (const o of overrides) {
      const h = race.horses.find((x) => x.start_number === o.start_number);
      if (o.race_number === race.race_number && h && !h.scratched) own.set(o.start_number, Math.min(Math.max(o.chance, 0), 1));
    }
    if (own.size === 0) return race;
    let fixed = [...own.values()].reduce((a, b) => a + b, 0);
    const scaleOwn = fixed > 1 ? 1 / fixed : 1;
    fixed = Math.min(fixed, 1);
    const others = race.horses.filter((h) => !h.scratched && !own.has(h.start_number));
    const othersSum = others.reduce((a, h) => a + h.chance, 0);
    return {
      ...race,
      horses: race.horses.map((h) => {
        if (h.scratched) return { ...h, chance: 0 };
        if (own.has(h.start_number)) return { ...h, chance: own.get(h.start_number)! * scaleOwn };
        const rest = 1 - fixed;
        const chance = othersSum > 0 ? (h.chance / othersSum) * rest : rest / others.length;
        return { ...h, chance };
      }),
    };
  });
}

interface PreparedHorse {
  start_number: number;
  horse_id: string;
  horse_name: string;
  p: number;
  /** Streck (andel, normaliserat bland icke strukna, golvat); = p när avdelningen saknar streck */
  s: number;
  r: number;
  scratched: boolean;
}

interface PreparedRace {
  race_number: number;
  horses: PreparedHorse[];
  streckMissing: boolean;
}

function prepare(races: OptimizerRace[]): PreparedRace[] {
  return [...races]
    .sort((a, b) => a.race_number - b.race_number)
    .map((race) => {
      const active = race.horses.filter((h) => !h.scratched);
      const streckSum = active.reduce((a, h) => a + (h.streck != null && h.streck > 0 ? h.streck : 0), 0);
      const streckMissing = streckSum <= 0;
      return {
        race_number: race.race_number,
        streckMissing,
        horses: race.horses.map((h) => {
          if (h.scratched) return { ...base(h), p: 0, s: 0, r: 0, scratched: true };
          const p = Math.max(h.chance, 0);
          const s = streckMissing ? p : Math.max((h.streck != null && h.streck > 0 ? h.streck : 0) / streckSum, STRECK_FLOOR);
          return { ...base(h), p, s, r: streckMissing || s <= 0 ? 1 : p / s, scratched: false };
        }),
      };
    });
}

const base = (h: OptimizerHorse) => ({ start_number: h.start_number, horse_id: h.horse_id, horse_name: h.horse_name });

/** Ordning inom avdelningen: p · r^λ, högst först; lika → lägst startnummer */
function order(horses: PreparedHorse[], lambda: number): PreparedHorse[] {
  const score = (h: PreparedHorse) => h.p * Math.pow(h.r, lambda);
  return horses
    .filter((h) => !h.scratched)
    .sort((a, b) => score(b) - score(a) || a.start_number - b.start_number);
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** P(alla) och P(exakt alla utom en) ur täckningen per avdelning */
function hitProbabilities(coverage: number[]): { all: number; allButOne: number } {
  const all = coverage.reduce((a, c) => a * c, 1);
  let allButOne = 0;
  coverage.forEach((c, i) => {
    let prod = 1 - c;
    coverage.forEach((d, j) => {
      if (j !== i) prod *= d;
    });
    allButOne += prod;
  });
  return { all, allButOne };
}

// ── Mått för ett system ───────────────────────────────────────────────────

function metricsFor(prepared: PreparedRace[], selection: SystemSelection[], lambda: number, cal: CoverageCalibration | null = null): SystemMetrics {
  const adj = (c: number) => adjustCoverage(c, cal);
  const coverage: RaceCoverage[] = [];
  const chosen: PreparedHorse[][] = [];
  for (const race of prepared) {
    const picks = new Set(selection.find((s) => s.race_number === race.race_number)?.horses.map((h) => h.start_number) ?? []);
    const horses = race.horses.filter((h) => picks.has(h.start_number));
    chosen.push(horses);
    coverage.push({
      race_number: race.race_number,
      horses: horses.length,
      spike: horses.length === 1,
      chans: adj(horses.reduce((a, h) => a + h.p, 0)),
      chansRaw: horses.reduce((a, h) => a + h.p, 0),
      streck: race.streckMissing ? null : horses.reduce((a, h) => a + h.s, 0),
      value: mean(horses.map((h) => h.r)),
      streckMissing: race.streckMissing,
    });
  }
  const { all, allButOne } = hitProbabilities(coverage.map((c) => c.chans));
  const withPicks = coverage.filter((c) => c.horses > 0);
  const valueIndex = withPicks.length ? withPicks.reduce((a, c) => a * c.value, 1) : 0;
  const pAllSpikesHold = coverage.filter((c) => c.spike).reduce((a, c) => a * c.chans, 1);

  const spikeTradeoffs: SpikeTradeoff[] = [];
  prepared.forEach((race, i) => {
    const cov = coverage[i];
    if (!cov.spike || chosen[i][0].scratched) return;
    const spike = chosen[i][0];
    const next = order(race.horses, lambda).find((h) => h.start_number !== spike.start_number);
    if (!next) return;
    const withNext = adj(cov.chansRaw + next.p);
    const valueWith = (spike.r + next.r) / 2;
    spikeTradeoffs.push({
      race_number: race.race_number,
      start_number: spike.start_number,
      chance: spike.p,
      nextStartNumber: next.start_number,
      chanceDelta: withNext > 0 ? cov.chans / withNext - 1 : 0,
      valueDelta: valueWith > 0 ? spike.r / valueWith - 1 : 0,
      p8IfAdded: cov.chans > 0 ? (all * withNext) / cov.chans : 0,
      valueIndexIfAdded: cov.value > 0 ? (valueIndex * valueWith) / cov.value : 0,
    });
  });

  return {
    p8: all,
    p7: allButOne,
    valueIndex,
    pAllSpikesHold,
    rows: coverage.reduce((a, c) => a * c.horses, 1),
    complete: coverage.length > 0 && coverage.every((c) => c.horses > 0),
    coverage,
    spikeTradeoffs,
  };
}

/** P(alla rätt), P(alla utom en), värdeindex, täckning och spikavvägningar för ett system */
export function systemMetrics(races: OptimizerRace[], selection: SystemSelection[], opts: MetricsOptions = {}): SystemMetrics {
  return metricsFor(prepare(applyOverrides(races, opts.overrides)), selection, opts.lambda ?? 0, opts.coverageCalibration ?? null);
}

// ── Optimering ────────────────────────────────────────────────────────────

interface Option {
  horses: PreparedHorse[];
  spike: boolean;
  /** log(täckning) + λ·log(medel r) */
  score: number;
}

const kr = (x: number) => `${Math.round(x * 100) / 100}`.replace(".", ",");

function spikeBounds(spikes: SpikeConstraint, races: number): { min: number; max: number } {
  if (typeof spikes === "number") return { min: spikes, max: spikes };
  return { min: Math.max(0, spikes.min), max: Math.min(races, spikes.max) };
}

function spikeText(n: number) {
  return `${n} ${n === 1 ? "spik" : "spikar"}`;
}

/**
 * Bästa systemet inom budget och spikvillkor för en värdevikt λ.
 * Returnerar { ok: false, reason } med en svensk förklaring när inget ryms.
 */
export function optimizeSystem(input: OptimizeInput): OptimizeResult {
  const { budgetKr, rowPrice, lambda } = input;
  const prepared = prepare(applyOverrides(input.races, input.overrides));
  const notes: string[] = [];
  if (prepared.length === 0) return { ok: false, reason: "Omgången saknar avdelningar." };
  const maxRows = rowPrice > 0 ? Math.floor(budgetKr / rowPrice + 1e-9) : 0;
  if (maxRows < 1) return { ok: false, reason: `Budgeten räcker inte till en enda rad (radpris ${kr(rowPrice)} kr).` };
  const { min: minSpikes, max: maxSpikes } = spikeBounds(input.spikes, prepared.length);
  if (minSpikes > maxSpikes) return { ok: false, reason: "Antalet spikar går inte ihop med antalet avdelningar." };

  // Kandidater per avdelning
  const options: Option[][] = [];
  let lockedSpikes = 0;
  for (const race of prepared) {
    const locks = (input.locks ?? []).filter((l) => l.race_number === race.race_number);
    const byNumber = new Map(race.horses.map((h) => [h.start_number, h]));
    const usable = (l: OptimizerLock) => {
      const h = byNumber.get(l.start_number);
      if (!h) return false;
      if (h.scratched && l.kind !== "out") {
        notes.push(`Avd ${race.race_number}: nr ${l.start_number} är struken och kan inte väljas.`);
        return false;
      }
      return true;
    };
    const valid = locks.filter(usable);
    const spikeLocks = [...new Set(valid.filter((l) => l.kind === "spike").map((l) => l.start_number))];
    const ins = new Set(valid.filter((l) => l.kind === "in").map((l) => l.start_number));
    const outs = new Set(valid.filter((l) => l.kind === "out").map((l) => l.start_number));
    for (const n of [...ins, ...spikeLocks]) {
      if (outs.has(n)) return { ok: false, reason: `Avd ${race.race_number}: nr ${n} är både låst och utesluten.` };
    }
    if (spikeLocks.length > 1) return { ok: false, reason: `Avd ${race.race_number}: bara en häst kan vara låst spik.` };
    if (spikeLocks.length === 1 && [...ins].some((n) => n !== spikeLocks[0])) {
      return { ok: false, reason: `Avd ${race.race_number}: en låst spik kan inte kombineras med fler låsta hästar.` };
    }
    if (race.streckMissing) notes.push(`Avd ${race.race_number} saknar streck – chansen används som streck (värde 1).`);

    const scoreOf = (horses: PreparedHorse[]) =>
      Math.log(Math.max(adjustCoverage(horses.reduce((a, h) => a + h.p, 0), input.calibrateObjective ? input.coverageCalibration : null), 1e-12)) +
      lambda * Math.log(Math.max(mean(horses.map((h) => h.r)), 1e-12));

    if (spikeLocks.length === 1) {
      lockedSpikes++;
      const h = byNumber.get(spikeLocks[0])!;
      options.push([{ horses: [h], spike: true, score: scoreOf([h]) }]);
      continue;
    }
    const eligible = order(race.horses, lambda).filter((h) => !outs.has(h.start_number));
    if (eligible.length === 0) return { ok: false, reason: `Avd ${race.race_number} har inga hästar kvar att välja.` };
    const locked = eligible.filter((h) => ins.has(h.start_number));
    const rest = eligible.filter((h) => !ins.has(h.start_number));
    const opts: Option[] = [];
    const from = Math.max(1, locked.length);
    const to = Math.max(locked.length, Math.min(MAX_HORSES_PER_RACE, eligible.length));
    for (let k = from; k <= to; k++) {
      const horses = [...locked, ...rest.slice(0, k - locked.length)];
      if (k === 1 && horses[0].p < MIN_SPIKE_CHANCE) continue;
      opts.push({ horses, spike: k === 1, score: scoreOf(horses) });
    }
    options.push(opts);
  }

  if (lockedSpikes > maxSpikes) {
    return { ok: false, reason: `Du har låst ${spikeText(lockedSpikes)} men valt högst ${spikeText(maxSpikes)}.` };
  }
  const spikeable = options.filter((o) => o.some((x) => x.spike)).length;
  if (spikeable < minSpikes) {
    return {
      ok: false,
      reason: `Bara ${spikeable} ${spikeable === 1 ? "avdelning har" : "avdelningar har"} en häst med minst ${Math.round(MIN_SPIKE_CHANCE * 100)} % chans (eller en låst spik) – det räcker inte till ${spikeText(minSpikes)}.`,
    };
  }

  // Dynamisk programmering över (rader, spikar); lika poäng → första vägen behålls
  type State = { rows: number; spikes: number; score: number; picks: number[] };
  let states = new Map<string, State>([["1|0", { rows: 1, spikes: 0, score: 0, picks: [] }]]);
  for (const opts of options) {
    const next = new Map<string, State>();
    for (const st of states.values()) {
      opts.forEach((o, idx) => {
        const rows = st.rows * o.horses.length;
        const spikes = st.spikes + (o.spike ? 1 : 0);
        if (rows > maxRows || spikes > maxSpikes) return;
        const key = `${rows}|${spikes}`;
        const score = st.score + o.score;
        const cur = next.get(key);
        if (!cur || score > cur.score + 1e-12) next.set(key, { rows, spikes, score, picks: [...st.picks, idx] });
      });
    }
    states = next;
  }
  let best: State | null = null;
  for (const st of states.values()) {
    if (st.spikes < minSpikes) continue;
    if (!best || st.score > best.score + 1e-12 || (Math.abs(st.score - best.score) <= 1e-12 && st.rows < best.rows)) best = st;
  }

  if (!best) {
    const need = minimumRows(options, minSpikes, maxSpikes);
    return {
      ok: false,
      reason: need == null
        ? "Inget system uppfyller villkoren."
        : `Budgeten räcker inte för ${minSpikes === maxSpikes ? spikeText(minSpikes) : `${minSpikes}–${maxSpikes} spikar`}: minst ${need} rader (${kr(need * rowPrice)} kr) krävs.`,
    };
  }

  const selection: SystemSelection[] = prepared.map((race, i) => ({
    race_number: race.race_number,
    horses: [...options[i][best!.picks[i]].horses]
      .sort((a, b) => a.start_number - b.start_number)
      .map((h) => ({ horse_id: h.horse_id, start_number: h.start_number, horse_name: h.horse_name })),
  }));
  const metrics = metricsFor(prepared, selection, lambda, input.coverageCalibration ?? null);
  return {
    ok: true,
    system: {
      lambda,
      selection,
      rows: best.rows,
      cost: Math.round(best.rows * rowPrice * 100) / 100,
      spikes: best.spikes,
      p8: metrics.p8,
      p7: metrics.p7,
      valueIndex: metrics.valueIndex,
      pAllSpikesHold: metrics.pAllSpikesHold,
      metrics,
      notes: [...new Set(notes)],
    },
  };
}

/** Minsta antal rader som uppfyller spikvillkoret (utan budget), för felmeddelandet */
function minimumRows(options: Option[][], minSpikes: number, maxSpikes: number): number | null {
  let states = new Map<number, number>([[0, 1]]); // spikar → minsta rader
  for (const opts of options) {
    const next = new Map<number, number>();
    for (const [spikes, rows] of states) {
      for (const o of opts) {
        const s = spikes + (o.spike ? 1 : 0);
        if (s > maxSpikes) continue;
        const r = rows * o.horses.length;
        if (r < (next.get(s) ?? Infinity)) next.set(s, r);
      }
    }
    states = next;
  }
  const valid = [...states.entries()].filter(([s]) => s >= minSpikes).map(([, r]) => r);
  return valid.length ? Math.min(...valid) : null;
}

/** Tre förslag: Max chans (λ = 0), Balans (0,3) och Värde (0,6) */
export function proposeSystems(input: Omit<OptimizeInput, "lambda">): SystemProposal[] {
  return PROPOSAL_PRESETS.map((preset) => {
    const res = optimizeSystem({ ...input, lambda: preset.lambda });
    return {
      key: preset.key,
      label: preset.label,
      lambda: preset.lambda,
      system: res.ok ? res.system : null,
      reason: res.ok ? null : res.reason,
    };
  });
}

// ── Från appens avdelningar ───────────────────────────────────────────────

export interface FromRacesOptions {
  model?: CalibratedModel;
  /** Redan beräknad Grundchans per avdelning (race_number → karta) */
  fundamental?: Record<number, Record<number, FundamentalResult>>;
}

/** Appens avdelningar → optimerarens indata (kalibrerad chans, streck som andel) */
export function optimizerRacesFromRaces(races: Race[], opts: FromRacesOptions = {}): OptimizerRace[] {
  return races.map((race) => {
    const chance = calibratedForRace(race, { model: opts.model, fundamental: opts.fundamental?.[race.race_number] });
    const mask = scratchedMask(race.starters);
    return {
      race_number: race.race_number,
      horses: race.starters.map((s, i) => ({
        start_number: s.start_number,
        horse_id: s.horse_id,
        horse_name: s.horses?.name ?? "",
        chance: mask[i] ? 0 : chance[s.start_number] ?? 0,
        streck: s.bet_distribution != null && s.bet_distribution > 0 ? s.bet_distribution / 100 : null,
        scratched: mask[i],
      })),
    };
  });
}
