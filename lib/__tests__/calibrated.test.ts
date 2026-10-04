import {
  CALIBRATED_FLOOR,
  calibratedForRace,
  chooseMode,
  computeCalibratedChance,
  type CalibratedInput,
  type CalibratedModel,
} from "../calibrated";
import type { Race, Starter } from "../raceTypes";

/** Handgjord modell så att testerna inte beror på den skattade filen */
const W = (streck: number, odds: number, grund: number) => ({ streck, odds, grund });
const MODEL: CalibratedModel = {
  version: "test",
  floor: CALIBRATED_FLOOR,
  modes: {
    full: W(0.2, 0.8, 0.1),
    noOdds: W(0.9, 0, 0.2),
    grundOnly: W(0, 0, 1),
    noGrund: W(0.2, 0.8, 0),
    streckOnly: W(1, 0, 0),
    oddsOnly: W(0, 1, 0),
    oddsGrund: W(0, 0.9, 0.1),
  },
};

const h = (n: number, o: Partial<CalibratedInput> = {}): CalibratedInput => ({
  start_number: n, streck: null, odds: null, grund: null, ...o,
});
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

describe("chooseMode", () => {
  it("väljer läge efter vilka data som finns", () => {
    expect(chooseMode({ streck: true, odds: true, grund: true })).toBe("full");
    expect(chooseMode({ streck: true, odds: false, grund: true })).toBe("noOdds");
    expect(chooseMode({ streck: false, odds: false, grund: true })).toBe("grundOnly");
    expect(chooseMode({ streck: true, odds: true, grund: false })).toBe("noGrund");
    expect(chooseMode({ streck: true, odds: false, grund: false })).toBe("streckOnly");
    expect(chooseMode({ streck: false, odds: true, grund: false })).toBe("oddsOnly");
    expect(chooseMode({ streck: false, odds: true, grund: true })).toBe("oddsGrund");
    expect(chooseMode({ streck: false, odds: false, grund: false })).toBeNull();
  });
});

describe("computeCalibratedChance", () => {
  it("summerar till 1 och ger strukna hästar 0", () => {
    const r = computeCalibratedChance(
      [
        h(1, { streck: 50, odds: 2, grund: 0.4 }),
        h(2, { streck: 30, odds: 4, grund: 0.35 }),
        h(3, { streck: 20, odds: 6, grund: 0.25 }),
        h(4, { streck: 5, odds: null, grund: null, scratched: true }),
      ],
      MODEL
    );
    expect(r.mode).toBe("full");
    expect(sum(r.p)).toBeCloseTo(1, 10);
    expect(r.p[3]).toBe(0);
  });

  it("följer formeln softmax(a·log streck + b·log oddsP + c·log grund)", () => {
    const field = [h(1, { streck: 60, odds: 2, grund: 0.5 }), h(2, { streck: 40, odds: 3, grund: 0.5 })];
    const r = computeCalibratedChance(field, MODEL);
    // Skalan spelar ingen roll – normaliseringen inom fältet tar ut den
    const u1 = 0.2 * Math.log(0.6) + 0.8 * Math.log(0.6) + 0.1 * Math.log(0.5);
    const u2 = 0.2 * Math.log(0.4) + 0.8 * Math.log(0.4) + 0.1 * Math.log(0.5);
    expect(r.p[0]).toBeCloseTo(Math.exp(u1) / (Math.exp(u1) + Math.exp(u2)), 10);
  });

  it("enbart streck med vikt 1 ger normaliserat streck", () => {
    const r = computeCalibratedChance([h(1, { streck: 30 }), h(2, { streck: 10 })], MODEL);
    expect(r.mode).toBe("streckOnly");
    expect(r.p[0]).toBeCloseTo(0.75, 10);
  });

  it("använder läget utan odds innan vinnarpoolen öppnat", () => {
    const r = computeCalibratedChance([h(1, { streck: 30, grund: 0.6 }), h(2, { streck: 10, grund: 0.4 })], MODEL);
    expect(r.mode).toBe("noOdds");
  });

  it("enbart Grundchans innan någon pool öppnat", () => {
    const r = computeCalibratedChance([h(1, { grund: 0.7 }), h(2, { grund: 0.3 })], MODEL);
    expect(r.mode).toBe("grundOnly");
    expect(r.p[0]).toBeCloseTo(0.7, 10);
  });

  it("tål nollor och saknade värden med ett golv", () => {
    const r = computeCalibratedChance(
      [h(1, { streck: 0, odds: 5, grund: 0.5 }), h(2, { streck: 100, odds: 0, grund: 0 }), h(3, { streck: 50, odds: 2, grund: null })],
      MODEL
    );
    expect(r.p.every((p) => Number.isFinite(p) && p > 0)).toBe(true);
    expect(sum(r.p)).toBeCloseTo(1, 10);
  });

  it("likformig fördelning när inga data finns", () => {
    const r = computeCalibratedChance([h(1), h(2), h(3, { scratched: true }), h(4)], MODEL);
    expect(r.mode).toBeNull();
    expect(r.p).toEqual([1 / 3, 1 / 3, 0, 1 / 3]);
  });

  it("tomt fält ger tom lista", () => {
    expect(computeCalibratedChance([], MODEL)).toEqual({ mode: null, p: [] });
  });
});

function starter(n: number, o: Partial<Starter> = {}): Starter {
  return {
    id: `s${n}`, start_number: n, post_position: n, horse_id: `h${n}`, driver: `Kusk ${n}`, driver_win_pct: null,
    trainer: `Tränare ${n}`, trainer_win_pct: null, odds: 10, p_odds: null, bet_distribution: 10,
    shoes_reported: null, shoes_front: null, shoes_back: null, shoes_front_changed: null, shoes_back_changed: null,
    sulky_type: null, horse_age: 5, horse_sex: "gelding", horse_color: null, pedigree_father: null, home_track: null,
    starts_total: 10 + n, wins_total: n, places_2nd: 1, places_3rd: 1, earnings_total: 100000 * n,
    starts_current_year: null, wins_current_year: null, places_2nd_current_year: null, places_3rd_current_year: null,
    starts_prev_year: null, wins_prev_year: null, places_2nd_prev_year: null, places_3rd_prev_year: null,
    best_time: null, last_5_results: [], life_records: null, formscore: 50, finish_position: null, finish_time: null,
    horses: { name: `Häst ${n}` }, ...o,
  } as Starter;
}

describe("calibratedForRace", () => {
  const race = (starters: Starter[]): Race =>
    ({ id: "V85_2026-10-10_1_3", race_number: 3, race_name: null, distance: 2140, start_method: "auto",
      start_time: "2026-10-10T14:45:00Z", starters } as Race);

  it("ger chans per startnummer, strukna hästar får 0", () => {
    const out = calibratedForRace(
      race([
        starter(1, { odds: 2.5, bet_distribution: 45 }),
        starter(2, { odds: 4, bet_distribution: 30 }),
        starter(3, { odds: 0, bet_distribution: 5 }), // struken: vinnarpoolen öppen men inga odds
        starter(4, { odds: 8, bet_distribution: 20 }),
      ]),
      { model: MODEL }
    );
    expect(Object.keys(out).map(Number).sort()).toEqual([1, 2, 3, 4]);
    expect(out[3]).toBe(0);
    expect(out[1] + out[2] + out[4]).toBeCloseTo(1, 10);
    expect(out[1]).toBeGreaterThan(out[2]);
  });

  it("använder en given Grundchans-karta i stället för att räkna om", () => {
    const out = calibratedForRace(
      race([starter(1, { odds: null, bet_distribution: null }), starter(2, { odds: null, bet_distribution: null })]),
      { model: MODEL, fundamental: { 1: { start_number: 1, p: 0.8, contributions: [] }, 2: { start_number: 2, p: 0.2, contributions: [] } } }
    );
    expect(out[1]).toBeCloseTo(0.8, 10);
  });
});
