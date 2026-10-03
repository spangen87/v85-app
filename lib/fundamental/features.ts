/**
 * Grundchans — faktorberäkning (se docs/superpowers/specs/2026-10-03-grundchans-design.md §3).
 *
 * Rena funktioner utan I/O: samma kod används i appen, fetch-routen,
 * omräkningen och träningsskriptet så att faktorerna räknas identiskt.
 * Odds och streck används ALDRIG här.
 */
import type { HorseStart, LifeRecord } from "@/lib/atg";
import { parseTimeToSeconds } from "@/lib/analysis";

export interface FundamentalRace {
  /** ISO-datum för loppet (YYYY-MM-DD) */
  date: string;
  distance: number;
  start_method: string;
  breed: "V" | "K";
  /** Förstapris i kr, null om okänt */
  first_prize: number | null;
}

export interface FundamentalStarter {
  start_number: number;
  post_position: number;
  start_distance: number | null;
  horse_age: number | null;
  horse_sex: string | null;
  starts_total: number;
  wins_total: number;
  places_2nd: number;
  places_3rd: number;
  /** Intjänat i kr */
  earnings_total: number;
  starts_current_year: number;
  wins_current_year: number;
  places_2nd_current_year: number;
  places_3rd_current_year: number;
  life_records: LifeRecord[];
  shoes_reported: boolean;
  shoes_front: boolean;
  shoes_back: boolean;
  shoes_front_changed: boolean;
  shoes_back_changed: boolean;
  american_sulky: boolean;
  driver: string | null;
  /** Procent (t.ex. 15 = 15 %) */
  driver_win_pct: number | null;
  trainer_win_pct: number | null;
  start_points: number | null;
  /** Senaste starterna, nyast först */
  history: HorseStart[];
}

export const FACTORS = [
  "log_eps", "win_rate_life", "top3_rate_life", "win_rate_cy", "top3_rate_cy",
  "record_cat", "record_missing", "age", "age_sq", "stallion", "mare", "log_starts",
  "post_inner", "post_2nd_row", "barefoot_all", "shoes_off_change", "american_sulky",
  "driver_wr", "trainer_wr", "fig_best", "fig_mean", "fig_last", "fig_missing",
  "form_pts", "gallop_rate", "days_since", "long_rest", "class_drop", "handicap_m",
  "driver_changed", "start_points", "trend", "recent_money",
] as const;

export type FactorName = (typeof FACTORS)[number];
export type FactorVector = Record<FactorName, number>;

/** Binära faktorer centreras inom fältet i stället för att z-poängsättas */
export const BINARY_FACTORS: ReadonlySet<FactorName> = new Set<FactorName>([
  "record_missing", "stallion", "mare", "post_2nd_row", "barefoot_all", "shoes_off_change",
  "american_sulky", "fig_missing", "long_rest", "driver_changed",
]);

/** Saknade värden fylls med fältets sämsta (min) i stället för medelvärdet */
export const WORST_FILL_FACTORS: ReadonlySet<FactorName> = new Set<FactorName>([
  "fig_best", "fig_mean", "fig_last", "record_cat",
]);

/** Banpar (s/km) och underlagsjusteringar — skattas av träningsskriptet */
export interface SpeedTables {
  par: Record<string, number>;
  par_fallback: Record<string, number>;
  condition_adj: Record<string, number>;
}

const FORM_WEIGHTS = [0.35, 0.25, 0.18, 0.12, 0.1];
const PLACE_POINTS: Record<string, number> = { "1": 10, "2": 7, "3": 5, "4": 3, "5": 2 };
/** Ungefärlig andel av förstapriset per placering (svensk prisskala) */
const PRIZE_SHARE: Record<string, number> = {
  "1": 1.0, "2": 0.5, "3": 0.28, "4": 0.2, "5": 0.14, "6": 0.1, "7": 0.08, "8": 0.06,
};

export function distCategory(meters: number): "short" | "medium" | "long" {
  if (meters <= 1800) return "short";
  if (meters <= 2400) return "medium";
  return "long";
}

/** Krympt andel: drar mot p0 när antalet försök är litet */
export function shrink(w: number, n: number, p0: number, k: number): number {
  return (w + k * p0) / (n + k);
}

/** Galopp eller diskning (flaggor från ATG eller travsportnotation "5g"/"d") */
export function isFaulty(h: HorseStart): boolean {
  return h.galloped === true || h.disqualified === true || /[gd]/i.test(h.place);
}

export function isAmericanSulky(text: string | null | undefined): boolean {
  return (text ?? "").toLowerCase().startsWith("amerik");
}

export function parKey(breed: string, track: string, startMethod: string, cat: string): string {
  return `${breed}|${track}|${startMethod}|${cat}`;
}

export function parFallbackKey(breed: string, startMethod: string, cat: string): string {
  return `${breed}|${startMethod}|${cat}`;
}

/** Hastighetssiffra: sekunder/km snabbare än banpar (högre = bättre); null om ej användbar */
export function speedFigure(h: HorseStart, breed: string, tables: SpeedTables): number | null {
  if (isFaulty(h) || !h.start_method) return null;
  const t = parseTimeToSeconds(h.time);
  if (t == null) return null;
  const cat = distCategory(h.distance ?? 2140);
  const par =
    tables.par[parKey(breed, h.track, h.start_method, cat)] ??
    tables.par_fallback[parFallbackKey(breed, h.start_method, cat)];
  if (par == null) return null;
  const adj = tables.condition_adj[h.track_condition ?? ""] ?? 0;
  return -(t - par - adj);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso.slice(0, 10));
  const to = Date.parse(toIso.slice(0, 10));
  return Math.round((to - from) / 86_400_000);
}

/** Råa faktorer för en häst (NaN = saknas; fylls i vid standardiseringen) */
export function computeRawFeatures(
  race: FundamentalRace,
  s: FundamentalStarter,
  tables: SpeedTables
): FactorVector {
  const nan = Number.NaN;
  const cat = distCategory(race.distance);
  const auto = race.start_method === "auto";
  const pp = s.post_position;
  const age = s.horse_age ?? 5;

  const rec = s.life_records.find((r) => r.start_method === race.start_method && r.distance === cat);
  const recSec = rec ? parseTimeToSeconds(rec.time) : null;

  // Bara starter före loppet — äldre rader kan innehålla loppet självt
  const hist = s.history.filter((h) => h.date.slice(0, 10) < race.date).slice(0, 5);
  const figs = hist
    .map((h) => speedFigure(h, race.breed, tables))
    .filter((f): f is number => f != null);
  const clean = hist.filter((h) => !isFaulty(h));
  const days = hist.length > 0 ? Math.min(daysBetween(hist[0].date, race.date), 365) : 365;
  const prizes = hist.map((h) => h.first_prize ?? 0).filter((p) => p > 0);
  const lastDriver = hist[0]?.driver ?? null;

  return {
    log_eps: Math.log1p(s.earnings_total / Math.max(s.starts_total, 1)),
    win_rate_life: shrink(s.wins_total, s.starts_total, 0.1, 6),
    top3_rate_life: shrink(s.wins_total + s.places_2nd + s.places_3rd, s.starts_total, 0.3, 6),
    win_rate_cy: shrink(s.wins_current_year, s.starts_current_year, 0.1, 6),
    top3_rate_cy: shrink(
      s.wins_current_year + s.places_2nd_current_year + s.places_3rd_current_year,
      s.starts_current_year, 0.3, 6
    ),
    record_cat: recSec != null ? -recSec : nan,
    record_missing: recSec != null ? 0 : 1,
    age,
    age_sq: (age - 6) ** 2,
    stallion: s.horse_sex === "stallion" ? 1 : 0,
    mare: s.horse_sex === "mare" ? 1 : 0,
    log_starts: Math.log1p(s.starts_total),
    post_inner: auto ? (pp <= 8 ? (9 - pp) / 8 : 0) : Math.max(0, (13 - pp) / 12),
    post_2nd_row: (auto ? pp > 8 : pp > 7) ? 1 : 0,
    barefoot_all: s.shoes_reported && !s.shoes_front && !s.shoes_back ? 1 : 0,
    shoes_off_change:
      (s.shoes_front_changed && !s.shoes_front) || (s.shoes_back_changed && !s.shoes_back) ? 1 : 0,
    american_sulky: s.american_sulky ? 1 : 0,
    driver_wr: s.driver_win_pct != null ? s.driver_win_pct / 100 : nan,
    trainer_wr: s.trainer_win_pct != null ? s.trainer_win_pct / 100 : nan,
    fig_best: figs.length > 0 ? Math.max(...figs) : nan,
    fig_mean: figs.length > 0 ? mean(figs.slice(0, 3)) : nan,
    fig_last: figs.length > 0 ? figs[0] : nan,
    fig_missing: figs.length > 0 ? 0 : 1,
    form_pts:
      hist.length > 0
        ? hist.reduce((sum, h, i) => sum + FORM_WEIGHTS[i] * (isFaulty(h) ? 0 : PLACE_POINTS[h.place] ?? 0), 0)
        : nan,
    gallop_rate: hist.length > 0 ? hist.filter(isFaulty).length / hist.length : nan,
    days_since: days,
    long_rest: days > 60 ? 1 : 0,
    class_drop:
      prizes.length > 0 && race.first_prize
        ? mean(prizes.map((p) => Math.log1p(p))) - Math.log1p(race.first_prize)
        : nan,
    handicap_m: (s.start_distance ?? race.distance) - race.distance,
    driver_changed: lastDriver && s.driver && lastDriver !== s.driver ? 1 : 0,
    start_points: s.start_points ?? nan,
    trend: figs.length >= 3 ? figs[0] - mean(figs.slice(1)) : nan,
    recent_money: Math.log1p(
      clean.reduce((sum, h) => sum + (PRIZE_SHARE[h.place] ?? 0) * (h.first_prize ?? 0), 0)
    ),
  };
}
