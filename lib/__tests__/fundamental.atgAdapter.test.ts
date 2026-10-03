import { fromAtgRace, fromAtgStart } from "../fundamental/atgAdapter";
import { ATG_RACE, ATG_START } from "../__fixtures__/fundamental";

describe("fromAtgRace", () => {
  it("tolkar lopp", () => {
    expect(fromAtgRace(ATG_RACE)).toEqual({
      date: "2026-09-21", distance: 2140, start_method: "volte", breed: "V", first_prize: 50000,
    });
  });
});

describe("fromAtgStart", () => {
  const s = fromAtgStart(ATG_START, fromAtgRace(ATG_RACE));
  it("karriär, år och pengar i kr", () => {
    expect(s).toMatchObject({
      start_number: 4, post_position: 4, start_distance: 2160, horse_age: 6, horse_sex: "gelding",
      starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
      starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
      start_points: 900,
    });
  });
  it("skor, sulky, kusk och tränare", () => {
    expect(s.shoes_front).toBe(false);
    expect(s.shoes_front_changed).toBe(true);
    expect(s.american_sulky).toBe(true);
    expect(s.driver).toBe("Ulf Ohlsson");
    expect(s.driver_win_pct).toBeCloseTo(15);
    expect(s.trainer_win_pct).toBeCloseTo(10);
    expect(s.life_records).toEqual([{ start_method: "volte", distance: "medium", place: 1, time: "1:13,0" }]);
  });
  it("historik utan loppet självt", () => {
    expect(s.history.map((h) => h.date)).toEqual(["2026-09-01"]);
    expect(s.history[0].first_prize).toBe(50000);
  });
});
