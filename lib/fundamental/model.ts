/**
 * Grundchans — standardisering inom fältet, conditional logit (softmax) och
 * förklaringar. Se docs/superpowers/specs/2026-10-03-grundchans-design.md §3.4.
 */
import modelJson from "@/lib/data/fundamental-model.json";
import {
  BINARY_FACTORS,
  computeRawFeatures,
  FACTORS,
  WORST_FILL_FACTORS,
  type FactorName,
  type FactorVector,
  type FundamentalRace,
  type FundamentalStarter,
  type SpeedTables,
} from "./features";

export interface FundamentalModel extends SpeedTables {
  /** "untrained" tills träningsskriptet skrivit en riktig modell */
  version: string;
  trained_races: number;
  test_metrics: { logloss: number; pseudo_r2: number; top1: number; top3: number } | null;
  temperature: number;
  /** Vikter (redan multiplicerade med temperaturen) */
  beta: Partial<Record<FactorName, number>>;
}

// JSON-filen typas av TypeScript utifrån innehållet — omvandla via unknown
export const MODEL = modelJson as unknown as FundamentalModel;

export function isModelTrained(model: FundamentalModel = MODEL): boolean {
  return model.version !== "untrained";
}

export interface Contribution {
  factor: FactorName;
  /** β · z — hur mycket faktorn lyfter (+) eller sänker (−) hästens styrka */
  value: number;
}

export interface FundamentalResult {
  start_number: number;
  /** Grundchans 0–1, null när fältet är för litet */
  p: number | null;
  /** Bidrag sorterade efter storlek (nollbidrag utelämnas) */
  contributions: Contribution[];
}

export const FACTOR_LABELS: Record<FactorName, string> = {
  log_eps: "pengar/start",
  win_rate_life: "vinst% karriär",
  top3_rate_life: "plats% karriär",
  win_rate_cy: "vinst% i år",
  top3_rate_cy: "plats% i år",
  record_cat: "rekordtid på distansen",
  record_missing: "saknar rekord på distansen",
  age: "ålder",
  age_sq: "ålder",
  stallion: "hingst",
  mare: "sto",
  log_starts: "antal starter",
  post_inner: "innerspår",
  post_2nd_row: "andra startled",
  barefoot_all: "barfota",
  shoes_off_change: "skor av",
  american_sulky: "jänkarvagn",
  driver_wr: "kuskform",
  trainer_wr: "tränarform",
  fig_best: "bästa km-tid (justerad)",
  fig_mean: "km-tider senaste",
  fig_last: "senaste km-tid",
  fig_missing: "saknar km-tider",
  form_pts: "form",
  gallop_rate: "galopprisk",
  days_since: "vila",
  long_rest: "långt uppehåll",
  class_drop: "klassbyte",
  handicap_m: "tillägg",
  driver_changed: "kuskbyte",
  start_points: "startpoäng",
  trend: "formtrend",
  recent_money: "pengar senaste starterna",
};

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Fyll saknade värden och z-poängsätt varje faktor inom fältet */
export function standardizeField(raw: FactorVector[]): FactorVector[] {
  const out = raw.map(() => ({}) as FactorVector);
  for (const f of FACTORS) {
    const values = raw.map((r) => r[f]);
    const finite = values.filter((v) => Number.isFinite(v));
    if (finite.length === 0) {
      out.forEach((o) => (o[f] = 0));
      continue;
    }
    const fill = WORST_FILL_FACTORS.has(f) ? Math.min(...finite) : mean(finite);
    const filled = values.map((v) => (Number.isFinite(v) ? v : fill));
    const m = mean(filled);
    if (BINARY_FACTORS.has(f)) {
      filled.forEach((v, i) => (out[i][f] = v - m));
      continue;
    }
    const sd = Math.sqrt(mean(filled.map((v) => (v - m) ** 2)));
    filled.forEach((v, i) => (out[i][f] = sd < 1e-9 ? 0 : (v - m) / sd));
  }
  return out;
}

export function softmax(u: number[]): number[] {
  const max = Math.max(...u);
  const e = u.map((v) => Math.exp(v - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/** Grundchans för ett helt fält (strukna hästar ska redan vara borttagna) */
export function computeFundamental(
  race: FundamentalRace,
  starters: FundamentalStarter[],
  model: FundamentalModel = MODEL
): FundamentalResult[] {
  if (starters.length < 2) {
    return starters.map((s) => ({ start_number: s.start_number, p: null, contributions: [] }));
  }
  const z = standardizeField(starters.map((s) => computeRawFeatures(race, s, model)));
  const contributions = z.map((row) =>
    FACTORS.map((f) => ({ factor: f, value: (model.beta[f] ?? 0) * row[f] }))
  );
  const p = softmax(contributions.map((cs) => cs.reduce((a, c) => a + c.value, 0)));
  return starters.map((s, i) => ({
    start_number: s.start_number,
    p: p[i],
    contributions: contributions[i]
      .filter((c) => c.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  }));
}

export function computeFundamentalMap(
  race: FundamentalRace,
  starters: FundamentalStarter[],
  model: FundamentalModel = MODEL
): Record<number, FundamentalResult> {
  return Object.fromEntries(computeFundamental(race, starters, model).map((r) => [r.start_number, r]));
}

/** De n största bidragen som text, t.ex. "+ pengar/start" (en etikett visas en gång) */
export function topReasons(result: FundamentalResult, n = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of result.contributions) {
    const label = FACTOR_LABELS[c.factor];
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(`${c.value > 0 ? "+" : "−"} ${label}`);
    if (out.length === n) break;
  }
  return out;
}

/** "Oense": Grundchans och streck skiljer sig kraftigt (kvot och minst 3 procentenheter) */
export function isDisagreement(p: number | null, streckPct: number | null): boolean {
  if (p == null || streckPct == null || streckPct <= 0) return false;
  const pPct = p * 100;
  const ratioOff = pPct >= 1.5 * streckPct || pPct <= 0.5 * streckPct;
  return ratioOff && Math.abs(pPct - streckPct) >= 3;
}
