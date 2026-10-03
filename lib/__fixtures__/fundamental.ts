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

export const ATG_RACE = {
  id: "2026-09-21_12_7",
  date: "2026-09-21",
  distance: 2140,
  startMethod: "volte",
  prize: "Pris: 50.000-25.000-12.500 kr (5 prisplacerade).",
  terms: ["3-åriga och äldre 85.001 - 225.000 kr.", "2140 m. Voltstart."],
};

export const ATG_START = {
  number: 4,
  postPosition: 4,
  distance: 2160,
  driver: {
    firstName: "Ulf", lastName: "Ohlsson",
    statistics: { years: { "2026": { starts: 100, placement: { "1": 15 } } } },
  },
  horse: {
    age: 6, sex: "gelding",
    shoes: { reported: true, front: { hasShoe: false, changed: true }, back: { hasShoe: false, changed: false } },
    sulky: { type: { code: "AM", text: "Amerikansk" } },
    trainer: { statistics: { years: { "2026": { starts: 50, placement: { "1": 5 } } } } },
    statistics: {
      life: {
        starts: 20, earnings: 40000000, placement: { "1": 4, "2": 3, "3": 2 }, startPoints: 900,
        records: [{ startMethod: "volte", distance: "medium", place: 1, time: { minutes: 1, seconds: 13, tenths: 0 } }],
      },
      years: { "2026": { starts: 8, placement: { "1": 2, "2": 1, "3": 1 } } },
    },
    results: {
      records: [
        {
          date: "2026-09-21", place: "1", kmTime: { minutes: 1, seconds: 12, tenths: 0 }, // loppet självt
          race: { startMethod: "volte", firstPrize: 5000000 }, track: { name: "Bollnäs", condition: "light" },
          start: { distance: 2140, postPosition: 4 },
        },
        {
          date: "2026-09-01", place: "2", kmTime: { minutes: 1, seconds: 14, tenths: 0 },
          race: { startMethod: "volte", firstPrize: 5000000 }, track: { name: "Bollnäs", condition: "light" },
          start: { distance: 2140, postPosition: 2, driver: { firstName: "Ulf", lastName: "Ohlsson" } },
        },
      ],
    },
  },
};
