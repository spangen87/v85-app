/** Delade testfixturer för Grundchans (importeras av lib/__tests__/fundamental.*.test.ts) */
import type { HorseStart } from "../atg";
import type { FundamentalRace, FundamentalStarter, SpeedTables } from "../fundamental/features";

export const RACE: FundamentalRace = {
  date: "2026-09-20", distance: 2140, start_method: "auto", breed: "V", first_prize: 50000,
};

export function hist(o: Partial<HorseStart> = {}): HorseStart {
  return {
    date: "2026-09-01", track: "Solvalla", place: "1", time: "1:13,0", post_position: 3,
    galloped: false, disqualified: false, distance: 2140, start_method: "auto",
    track_condition: "light", first_prize: 50000, driver: "Kalle Kusk", ...o,
  };
}

export function starter(o: Partial<FundamentalStarter> = {}): FundamentalStarter {
  return {
    start_number: 1, post_position: 1, start_distance: 2140, horse_age: 6, horse_sex: "gelding",
    starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
    starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
    life_records: [{ start_method: "auto", distance: "medium", place: 1, time: "1:12,0" }],
    shoes_reported: true, shoes_front: true, shoes_back: true, shoes_front_changed: false, shoes_back_changed: false,
    american_sulky: false, driver: "Kalle Kusk", driver_win_pct: 15, trainer_win_pct: 10, start_points: 900,
    history: [], ...o,
  };
}

export const TABLES: SpeedTables = {
  par: { "V|Solvalla|auto|medium": 73.5 },
  par_fallback: { "V|auto|medium": 74.0, "V|volte|medium": 75.0 },
  condition_adj: { light: 0, heavy: 0.7 },
};
