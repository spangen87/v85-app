import {
  computeFundamental,
  FACTOR_LABELS,
  isDisagreement,
  softmax,
  standardizeField,
  topReasons,
  type FundamentalModel,
} from "../fundamental/model";
import { FACTORS, computeRawFeatures, type FactorVector } from "../fundamental/features";
import { RACE, TABLES, hist, starter } from "../__fixtures__/fundamental";

const TEST_MODEL: FundamentalModel = {
  ...TABLES,
  version: "test",
  trained_races: 0,
  test_metrics: null,
  temperature: 1,
  beta: { log_eps: 0.3, barefoot_all: 0.35, handicap_m: -0.3, form_pts: 0.25, fig_last: 0.15 },
};

function vec(o: Partial<FactorVector>): FactorVector {
  const v = {} as FactorVector;
  for (const f of FACTORS) v[f] = o[f] ?? 0;
  return v;
}

describe("standardizeField", () => {
  it("z-poängsätter kontinuerliga och centrerar binära", () => {
    const z = standardizeField([vec({ log_eps: 1, mare: 1 }), vec({ log_eps: 3, mare: 0 })]);
    expect(z[0].log_eps).toBeCloseTo(-1);
    expect(z[1].log_eps).toBeCloseTo(1);
    expect(z[0].mare).toBeCloseTo(0.5);
    expect(z[1].mare).toBeCloseTo(-0.5);
  });
  it("påverkas inte av att alla förskjuts lika mycket", () => {
    const a = standardizeField([vec({ log_eps: 1 }), vec({ log_eps: 2 }), vec({ log_eps: 4 })]);
    const b = standardizeField([vec({ log_eps: 11 }), vec({ log_eps: 12 }), vec({ log_eps: 14 })]);
    a.forEach((row, i) => expect(row.log_eps).toBeCloseTo(b[i].log_eps));
  });
  it("fyller NaN: fig/record med fältets min, övriga med medel, allt-NaN blir 0", () => {
    const z = standardizeField([
      vec({ fig_last: 1, form_pts: 2, trend: Number.NaN }),
      vec({ fig_last: 3, form_pts: 4, trend: Number.NaN }),
      vec({ fig_last: Number.NaN, form_pts: Number.NaN, trend: Number.NaN }),
    ]);
    // fig_last fylls med 1 → värdena [1,3,1]
    expect(z[2].fig_last).toBeCloseTo(z[0].fig_last);
    // form_pts fylls med medel 3 → mittvärde → z = 0
    expect(z[2].form_pts).toBeCloseTo(0);
    expect(z.map((r) => r.trend)).toEqual([0, 0, 0]);
  });
  it("konstant faktor ger 0", () => {
    const z = standardizeField([vec({ age: 5 }), vec({ age: 5 })]);
    expect(z[0].age).toBe(0);
  });
});

describe("softmax", () => {
  it("summerar till 1 och tål stora värden", () => {
    const p = softmax([1000, 1001, 999]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[1]).toBeGreaterThan(p[0]);
  });
});

describe("computeFundamental", () => {
  const field = [
    starter({ start_number: 1, earnings_total: 800000 }),
    starter({ start_number: 2 }),
    starter({ start_number: 3, earnings_total: 100000 }),
  ];

  it("summerar till 1 och alla p i (0,1)", () => {
    const res = computeFundamental(RACE, field, TEST_MODEL);
    const sum = res.reduce((a, r) => a + (r.p ?? 0), 0);
    expect(sum).toBeCloseTo(1);
    res.forEach((r) => {
      expect(r.p).toBeGreaterThan(0);
      expect(r.p).toBeLessThan(1);
    });
    expect(res[0].p!).toBeGreaterThan(res[2].p!);
  });

  it("tillägg sänker och barfota höjer, allt annat lika", () => {
    const base = [starter({ start_number: 1 }), starter({ start_number: 2 })];
    const handicap = computeFundamental(RACE, [base[0], { ...base[1], start_distance: 2160 }], TEST_MODEL);
    expect(handicap[1].p!).toBeLessThan(0.5);
    const barefoot = computeFundamental(RACE, [base[0], { ...base[1], shoes_front: false, shoes_back: false }], TEST_MODEL);
    expect(barefoot[1].p!).toBeGreaterThan(0.5);
  });

  it("bidragen förklarar skillnaden i log-odds", () => {
    const res = computeFundamental(RACE, field, TEST_MODEL);
    const u = res.map((r) => r.contributions.reduce((a, c) => a + c.value, 0));
    expect(Math.log(res[0].p! / res[1].p!)).toBeCloseTo(u[0] - u[1]);
  });

  it("färre än två hästar ger p = null", () => {
    expect(computeFundamental(RACE, [starter()], TEST_MODEL)).toEqual([
      { start_number: 1, p: null, contributions: [] },
    ]);
    expect(computeFundamental(RACE, [], TEST_MODEL)).toEqual([]);
  });

  it("debutant utan historik och statistik får ett ändligt p", () => {
    const debutant = starter({
      start_number: 2, starts_total: 0, wins_total: 0, places_2nd: 0, places_3rd: 0, earnings_total: 0,
      starts_current_year: 0, wins_current_year: 0, places_2nd_current_year: 0, places_3rd_current_year: 0,
      life_records: [], driver_win_pct: null, trainer_win_pct: null, start_points: null, history: [],
      horse_age: null, horse_sex: null,
    });
    const res = computeFundamental(RACE, [starter({ history: [hist()] }), debutant], TEST_MODEL);
    res.forEach((r) => expect(Number.isFinite(r.p!)).toBe(true));
  });

  it("råa faktorer är oberoende av modellens vikter", () => {
    expect(computeRawFeatures(RACE, field[0], TEST_MODEL).log_eps).toBeCloseTo(Math.log1p(40000));
  });
});

describe("topReasons", () => {
  it("ger de största bidragen med tecken och svensk etikett, utan dubbletter", () => {
    const reasons = topReasons({
      start_number: 1,
      p: 0.2,
      contributions: [
        { factor: "log_eps", value: 0.6 },
        { factor: "handicap_m", value: -0.4 },
        { factor: "age", value: 0.2 },
        { factor: "age_sq", value: 0.1 },
        { factor: "barefoot_all", value: 0.05 },
      ],
    });
    expect(reasons).toEqual([
      `+ ${FACTOR_LABELS.log_eps}`,
      `− ${FACTOR_LABELS.handicap_m}`,
      `+ ${FACTOR_LABELS.age}`,
    ]);
  });
  it("alla faktorer har en etikett", () => {
    for (const f of FACTORS) expect(FACTOR_LABELS[f].length).toBeGreaterThan(0);
  });
});

describe("isDisagreement", () => {
  it("kräver kvot ≥ 1,5 eller ≤ 0,5 och minst 3 procentenheter", () => {
    expect(isDisagreement(0.3, 15)).toBe(true);   // 30 % mot 15 %
    expect(isDisagreement(0.05, 12)).toBe(true);  // 5 % mot 12 %
    expect(isDisagreement(0.06, 3)).toBe(true);   // 6 % mot 3 %: kvot 2, diff 3
    expect(isDisagreement(0.04, 2)).toBe(false);  // kvot 2 men bara 2 pe
    expect(isDisagreement(0.2, 18)).toBe(false);  // för lik
    expect(isDisagreement(null, 18)).toBe(false);
    expect(isDisagreement(0.2, 0)).toBe(false);   // streck saknas
  });
});
