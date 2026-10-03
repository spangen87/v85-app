import {
  computeRawFeatures,
  distCategory,
  FACTORS,
  isAmericanSulky,
  isFaulty,
  shrink,
  speedFigure,
} from "../fundamental/features";
import { RACE, TABLES, hist, starter } from "../__fixtures__/fundamental";

describe("hjälpfunktioner", () => {
  it("distCategory", () => {
    expect(distCategory(1640)).toBe("short");
    expect(distCategory(1800)).toBe("short");
    expect(distCategory(2140)).toBe("medium");
    expect(distCategory(2640)).toBe("long");
  });
  it("shrink drar mot p0 när n är litet", () => {
    expect(shrink(0, 0, 0.1, 6)).toBeCloseTo(0.1);
    expect(shrink(10, 10, 0.1, 6)).toBeCloseTo(10.6 / 16);
  });
  it("isFaulty känner igen galopp och diskning", () => {
    expect(isFaulty(hist({ place: "5g" }))).toBe(true);
    expect(isFaulty(hist({ place: "d" }))).toBe(true);
    expect(isFaulty(hist({ galloped: true, place: "3" }))).toBe(true);
    expect(isFaulty(hist({ place: "3" }))).toBe(false);
  });
  it("isAmericanSulky", () => {
    expect(isAmericanSulky("Amerikansk")).toBe(true);
    expect(isAmericanSulky("Vanlig")).toBe(false);
    expect(isAmericanSulky(null)).toBe(false);
  });
});

describe("speedFigure", () => {
  it("använder banpar och underlag", () => {
    // 73,0 s/km mot par 73,5 på lätt bana → +0,5
    expect(speedFigure(hist(), "V", TABLES)).toBeCloseTo(0.5);
    // tungt underlag: 74,0 − 73,5 − 0,7 = −0,2 → +0,2
    expect(speedFigure(hist({ time: "1:14,0", track_condition: "heavy" }), "V", TABLES)).toBeCloseTo(0.2);
  });
  it("faller tillbaka på ras+metod+distans när banan saknas", () => {
    expect(speedFigure(hist({ track: "Okänd", start_method: "volte", time: "1:14,0" }), "V", TABLES)).toBeCloseTo(1.0);
  });
  it("ger null för galopp, saknad tid eller saknat par", () => {
    expect(speedFigure(hist({ place: "0g" }), "V", TABLES)).toBeNull();
    expect(speedFigure(hist({ time: "" }), "V", TABLES)).toBeNull();
    expect(speedFigure(hist(), "K", TABLES)).toBeNull();
  });
});

describe("computeRawFeatures", () => {
  it("returnerar alla 33 faktorer", () => {
    const f = computeRawFeatures(RACE, starter(), TABLES);
    expect(Object.keys(f).sort()).toEqual([...FACTORS].sort());
  });

  it("karriär och år", () => {
    const f = computeRawFeatures(RACE, starter(), TABLES);
    expect(f.log_eps).toBeCloseTo(Math.log1p(400000 / 20));
    expect(f.win_rate_life).toBeCloseTo((4 + 0.6) / 26);
    expect(f.top3_rate_life).toBeCloseTo((9 + 1.8) / 26);
    expect(f.win_rate_cy).toBeCloseTo((2 + 0.6) / 14);
    expect(f.log_starts).toBeCloseTo(Math.log1p(20));
  });

  it("rekord i rätt kategori eller NaN", () => {
    expect(computeRawFeatures(RACE, starter(), TABLES).record_cat).toBeCloseTo(-72);
    const volte = computeRawFeatures({ ...RACE, start_method: "volte" }, starter(), TABLES);
    expect(volte.record_cat).toBeNaN();
    expect(volte.record_missing).toBe(1);
  });

  it("spår: auto och volt", () => {
    expect(computeRawFeatures(RACE, starter({ post_position: 1 }), TABLES).post_inner).toBeCloseTo(1);
    expect(computeRawFeatures(RACE, starter({ post_position: 9 }), TABLES).post_2nd_row).toBe(1);
    const v = computeRawFeatures({ ...RACE, start_method: "volte" }, starter({ post_position: 8 }), TABLES);
    expect(v.post_inner).toBeCloseTo(5 / 12);
    expect(v.post_2nd_row).toBe(1);
  });

  it("skor, sulky, kön, ålder", () => {
    const f = computeRawFeatures(
      RACE,
      starter({ shoes_front: false, shoes_back: false, shoes_front_changed: true, american_sulky: true, horse_sex: "mare", horse_age: 4 }),
      TABLES
    );
    expect(f.barefoot_all).toBe(1);
    expect(f.shoes_off_change).toBe(1);
    expect(f.american_sulky).toBe(1);
    expect(f.mare).toBe(1);
    expect(f.stallion).toBe(0);
    expect(f.age_sq).toBe(4);
  });

  it("kusk- och tränarprocent blir andelar, null blir NaN", () => {
    const f = computeRawFeatures(RACE, starter({ trainer_win_pct: null }), TABLES);
    expect(f.driver_wr).toBeCloseTo(0.15);
    expect(f.trainer_wr).toBeNaN();
  });

  it("historikfaktorer", () => {
    const s = starter({
      history: [
        hist({ date: "2026-09-10", place: "2", first_prize: 100000, driver: "Annan Kusk" }),
        hist({ date: "2026-08-20", place: "5g" }),
        hist({ date: "2026-08-01", place: "1", time: "1:12,5" }),
      ],
    });
    const f = computeRawFeatures(RACE, s, TABLES);
    expect(f.form_pts).toBeCloseTo(0.35 * 7 + 0.25 * 0 + 0.18 * 10);
    expect(f.gallop_rate).toBeCloseTo(1 / 3);
    expect(f.days_since).toBe(10);
    expect(f.long_rest).toBe(0);
    expect(f.driver_changed).toBe(1);
    // figurer (nyast först): 0,5 (2:a) och 1,0 (1:a); galoppen saknar figur
    expect(f.fig_last).toBeCloseTo(0.5);
    expect(f.fig_best).toBeCloseTo(1.0);
    expect(f.fig_mean).toBeCloseTo(0.75);
    expect(f.trend).toBeNaN(); // < 3 figurer
    const meanLogPrize = (Math.log1p(100000) + 2 * Math.log1p(50000)) / 3;
    expect(f.class_drop).toBeCloseTo(meanLogPrize - Math.log1p(50000));
    expect(f.recent_money).toBeCloseTo(Math.log1p(0.5 * 100000 + 1.0 * 50000));
  });

  it("ignorerar historik från och med loppdatumet", () => {
    const f = computeRawFeatures(RACE, starter({ history: [hist({ date: "2026-09-20", place: "1" })] }), TABLES);
    expect(f.form_pts).toBeNaN();
    expect(f.fig_missing).toBe(1);
    expect(f.days_since).toBe(365);
  });

  it("utan historik: NaN-faktorer och 365 dagars vila", () => {
    const f = computeRawFeatures(RACE, starter({ history: [] }), TABLES);
    expect(f.form_pts).toBeNaN();
    expect(f.gallop_rate).toBeNaN();
    expect(f.class_drop).toBeNaN();
    expect(f.days_since).toBe(365);
    expect(f.long_rest).toBe(1);
    expect(f.recent_money).toBe(0);
  });

  it("tillägg", () => {
    expect(computeRawFeatures(RACE, starter({ start_distance: 2160 }), TABLES).handicap_m).toBe(20);
    expect(computeRawFeatures(RACE, starter({ start_distance: null }), TABLES).handicap_m).toBe(0);
  });
});
