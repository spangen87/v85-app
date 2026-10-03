import {
  computeFundamentalForRows,
  fromDbRace,
  fromDbStarter,
  scratchedMask,
  type DbStarterLike,
} from "../fundamental/dbAdapter";
import { computeRawFeatures } from "../fundamental/features";
import type { FundamentalModel } from "../fundamental/model";
import { fromAtgRace, fromAtgStart } from "../fundamental/atgAdapter";
import { ATG_RACE, ATG_START, TABLES } from "../__fixtures__/fundamental";

const TRAINED: FundamentalModel = {
  ...TABLES, version: "test", trained_races: 1, test_metrics: null, temperature: 1,
  beta: { log_eps: 0.3, handicap_m: -0.3 },
};
const UNTRAINED: FundamentalModel = { ...TRAINED, version: "untrained" };

function row(o: Partial<DbStarterLike> = {}): DbStarterLike {
  return {
    start_number: 1, post_position: 1, start_distance: 2140, horse_age: 6, horse_sex: "gelding",
    starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
    starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
    life_records: [], shoes_reported: true, shoes_front: true, shoes_back: true,
    shoes_front_changed: false, shoes_back_changed: false, sulky_type: "Vanlig",
    driver: "K", driver_win_pct: 10, trainer_win_pct: 10, start_points: 500,
    last_5_results: [], horse_starts_history: null, odds: 5, bet_distribution: 10, ...o,
  };
}
const RACE = { distance: 2140, start_method: "auto", breed: "V", first_prize: 50000 };

describe("fromDbRace", () => {
  it("fyller i reservvärden", () => {
    expect(fromDbRace({ distance: null, start_method: null }, "2026-09-20")).toEqual({
      date: "2026-09-20", distance: 2140, start_method: "auto", breed: "V", first_prize: null,
    });
  });
});

describe("fromDbStarter", () => {
  it("föredrar horse_starts_history men faller tillbaka på last_5_results", () => {
    const h = { date: "2026-09-01", track: "S", place: "1", time: "1:13,0", post_position: 1 };
    expect(fromDbStarter(row({ last_5_results: [h] })).history).toHaveLength(1);
    expect(fromDbStarter(row({ last_5_results: [h], horse_starts_history: [h, h] })).history).toHaveLength(2);
  });
  it("sulky och null-värden", () => {
    const s = fromDbStarter(row({ sulky_type: "Amerikansk", starts_total: null, post_position: null, start_number: 7 }));
    expect(s.american_sulky).toBe(true);
    expect(s.starts_total).toBe(0);
    expect(s.post_position).toBe(7);
  });
});

describe("paritet ATG ↔ DB", () => {
  it("samma häst ger samma faktorer oavsett källa", () => {
    const race = fromAtgRace(ATG_RACE);
    const fromAtg = fromAtgStart(ATG_START, race);
    // Samma värden som de skulle ha lagrats i DB via lib/atg.ts parseGame
    const fromDb = fromDbStarter(row({
      start_number: 4, post_position: 4, start_distance: 2160, horse_age: 6, horse_sex: "gelding",
      starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
      starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
      life_records: fromAtg.life_records, shoes_reported: true, shoes_front: false, shoes_back: false,
      shoes_front_changed: true, shoes_back_changed: false, sulky_type: "Amerikansk",
      driver: "Ulf Ohlsson", driver_win_pct: 15, trainer_win_pct: 10, start_points: 900,
      horse_starts_history: fromAtg.history, last_5_results: fromAtg.history,
    }));
    const dbRace = fromDbRace({ distance: 2140, start_method: "volte", breed: "V", first_prize: 50000 }, "2026-09-21");
    expect(computeRawFeatures(dbRace, fromDb, TABLES)).toEqual(computeRawFeatures(race, fromAtg, TABLES));
  });
});

describe("scratchedMask", () => {
  it("struken = fältet har marknadsdata men hästen saknar odds och streck", () => {
    expect(scratchedMask([row(), row({ odds: null, bet_distribution: 0 })])).toEqual([false, true]);
  });
  it("innan poolen öppnat är ingen struken", () => {
    expect(scratchedMask([row({ odds: null, bet_distribution: 0 }), row({ odds: 0, bet_distribution: null })]))
      .toEqual([false, false]);
  });
});

describe("computeFundamentalForRows", () => {
  it("ger null för strukna och summerar till 1 för övriga", () => {
    const res = computeFundamentalForRows(RACE, "2026-09-20", [
      row({ start_number: 1 }), row({ start_number: 2, earnings_total: 100000 }),
      row({ start_number: 3, odds: null, bet_distribution: 0 }),
    ], TRAINED);
    expect(res[2]).toBeNull();
    expect((res[0]!.p ?? 0) + (res[1]!.p ?? 0)).toBeCloseTo(1);
  });
  it("fungerar innan poolen öppnat", () => {
    const res = computeFundamentalForRows(RACE, "2026-09-20", [
      row({ start_number: 1, odds: null, bet_distribution: 0 }),
      row({ start_number: 2, odds: null, bet_distribution: 0 }),
    ], TRAINED);
    expect(res.every((r) => r?.p != null)).toBe(true);
  });
  it("otränad modell ger bara null", () => {
    expect(computeFundamentalForRows(RACE, "2026-09-20", [row(), row({ start_number: 2 })], UNTRAINED))
      .toEqual([null, null]);
  });
});
