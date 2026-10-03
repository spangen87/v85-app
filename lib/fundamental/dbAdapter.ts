/**
 * Databasrader (starters/races) → Grundchans. Används av loppvyn, fetch-routen
 * och omräkningen. Odds/streck används bara för att känna igen strukna hästar.
 */
import type { HorseStart, LifeRecord } from "@/lib/atg";
import { isAmericanSulky, type FundamentalRace, type FundamentalStarter } from "./features";
import {
  computeFundamental,
  isModelTrained,
  MODEL,
  type FundamentalModel,
  type FundamentalResult,
} from "./model";

export interface DbRaceLike {
  distance: number | null;
  start_method: string | null;
  breed?: string | null;
  first_prize?: number | null;
}

export interface DbStarterLike {
  start_number: number;
  post_position?: number | null;
  start_distance?: number | null;
  horse_age?: number | null;
  horse_sex?: string | null;
  starts_total?: number | null;
  wins_total?: number | null;
  places_2nd?: number | null;
  places_3rd?: number | null;
  earnings_total?: number | null;
  starts_current_year?: number | null;
  wins_current_year?: number | null;
  places_2nd_current_year?: number | null;
  places_3rd_current_year?: number | null;
  life_records?: LifeRecord[] | null;
  shoes_reported?: boolean | null;
  shoes_front?: boolean | null;
  shoes_back?: boolean | null;
  shoes_front_changed?: boolean | null;
  shoes_back_changed?: boolean | null;
  sulky_type?: string | null;
  driver?: string | null;
  driver_win_pct?: number | null;
  trainer_win_pct?: number | null;
  start_points?: number | null;
  last_5_results?: HorseStart[] | null;
  horse_starts_history?: HorseStart[] | null;
  odds?: number | null;
  bet_distribution?: number | null;
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function fromDbRace(race: DbRaceLike, date: string): FundamentalRace {
  return {
    date: date.slice(0, 10),
    distance: race.distance ?? 2140,
    start_method: race.start_method ?? "auto",
    breed: race.breed === "K" ? "K" : "V",
    first_prize: race.first_prize ?? null,
  };
}

export function fromDbStarter(row: DbStarterLike): FundamentalStarter {
  const history =
    row.horse_starts_history && row.horse_starts_history.length > 0
      ? row.horse_starts_history
      : row.last_5_results ?? [];
  return {
    start_number: row.start_number,
    post_position: row.post_position ?? row.start_number,
    start_distance: row.start_distance ?? null,
    horse_age: row.horse_age ?? null,
    horse_sex: row.horse_sex ?? null,
    starts_total: n(row.starts_total),
    wins_total: n(row.wins_total),
    places_2nd: n(row.places_2nd),
    places_3rd: n(row.places_3rd),
    earnings_total: n(row.earnings_total),
    starts_current_year: n(row.starts_current_year),
    wins_current_year: n(row.wins_current_year),
    places_2nd_current_year: n(row.places_2nd_current_year),
    places_3rd_current_year: n(row.places_3rd_current_year),
    life_records: Array.isArray(row.life_records) ? row.life_records : [],
    shoes_reported: !!row.shoes_reported,
    shoes_front: !!row.shoes_front,
    shoes_back: !!row.shoes_back,
    shoes_front_changed: !!row.shoes_front_changed,
    shoes_back_changed: !!row.shoes_back_changed,
    american_sulky: isAmericanSulky(row.sulky_type),
    driver: row.driver || null,
    driver_win_pct: row.driver_win_pct ?? null,
    trainer_win_pct: row.trainer_win_pct ?? null,
    start_points: row.start_points ?? null,
    history: Array.isArray(history) ? history : [],
  };
}

const hasMarket = (r: DbStarterLike) => (r.odds ?? 0) > 0 || (r.bet_distribution ?? 0) > 0;

/** Struken = fältet har marknadsdata men hästen saknar både odds och streck */
export function scratchedMask(rows: DbStarterLike[]): boolean[] {
  const marketOpen = rows.some(hasMarket);
  return rows.map((r) => marketOpen && !hasMarket(r));
}

export function computeFundamentalForRows(
  race: DbRaceLike,
  date: string,
  rows: DbStarterLike[],
  model: FundamentalModel = MODEL
): (FundamentalResult | null)[] {
  if (!isModelTrained(model)) return rows.map(() => null);
  const scratched = scratchedMask(rows);
  const active = rows.filter((_, i) => !scratched[i]);
  const results = computeFundamental(fromDbRace(race, date), active.map(fromDbStarter), model);
  const byNumber = new Map(results.map((r) => [r.start_number, r]));
  return rows.map((r, i) => (scratched[i] ? null : byNumber.get(r.start_number) ?? null));
}

export function computeFundamentalMapForRows(
  race: DbRaceLike,
  date: string,
  rows: DbStarterLike[],
  model: FundamentalModel = MODEL
): Record<number, FundamentalResult> {
  const out: Record<number, FundamentalResult> = {};
  computeFundamentalForRows(race, date, rows, model).forEach((r) => {
    if (r) out[r.start_number] = r;
  });
  return out;
}
