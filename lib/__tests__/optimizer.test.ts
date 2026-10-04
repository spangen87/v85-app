import {
  adjustCoverage,
  applyOverrides,
  MIN_SPIKE_CHANCE,
  optimizeSystem,
  optimizerRacesFromRaces,
  proposeSystems,
  systemMetrics,
  type OptimizeInput,
  type OptimizerRace,
} from "../optimizer";
import type { Race, Starter } from "../raceTypes";
import type { SystemSelection } from "../types";

/** Avdelning från [chans, streck]-par; startnummer 1, 2, 3 … */
function race(race_number: number, horses: [number, number | null][], scratched: number[] = []): OptimizerRace {
  return {
    race_number,
    horses: horses.map(([chance, streck], i) => ({
      start_number: i + 1,
      horse_id: `h${race_number}-${i + 1}`,
      horse_name: `Häst ${race_number}-${i + 1}`,
      chance: scratched.includes(i + 1) ? 0 : chance,
      streck,
      scratched: scratched.includes(i + 1),
    })),
  };
}

const sel = (picks: Record<number, number[]>): SystemSelection[] =>
  Object.entries(picks).map(([r, nums]) => ({
    race_number: Number(r),
    horses: nums.map((n) => ({ horse_id: `h${r}-${n}`, start_number: n, horse_name: `Häst ${r}-${n}` })),
  }));

const picks = (s: SystemSelection[]) => Object.fromEntries(s.map((x) => [x.race_number, x.horses.map((h) => h.start_number)]));
const rowsOf = (s: SystemSelection[]) => s.reduce((a, x) => a * x.horses.length, 1);
const spikesOf = (s: SystemSelection[]) => s.filter((x) => x.horses.length === 1).length;

/** Åtta jämna men olika avdelningar — en V85-liknande omgång */
function v85(): OptimizerRace[] {
  const fields: [number, number][][] = [
    [[0.29, 0.36], [0.2, 0.15], [0.15, 0.12], [0.12, 0.1], [0.09, 0.08], [0.08, 0.1], [0.04, 0.05], [0.03, 0.04]],
    [[0.67, 0.6], [0.12, 0.15], [0.09, 0.06], [0.05, 0.08], [0.04, 0.06], [0.03, 0.05]],
    [[0.25, 0.3], [0.2, 0.2], [0.15, 0.17], [0.12, 0.1], [0.1, 0.08], [0.08, 0.07], [0.05, 0.03], [0.05, 0.05]],
    [[0.3, 0.3], [0.16, 0.14], [0.14, 0.16], [0.12, 0.12], [0.1, 0.1], [0.08, 0.09], [0.06, 0.05], [0.04, 0.04]],
    [[0.22, 0.25], [0.2, 0.22], [0.15, 0.15], [0.13, 0.1], [0.11, 0.1], [0.09, 0.05], [0.06, 0.08], [0.04, 0.05]],
    [[0.41, 0.55], [0.2, 0.15], [0.15, 0.1], [0.1, 0.08], [0.08, 0.07], [0.06, 0.05]],
    [[0.38, 0.37], [0.37, 0.5286], [0.1, 0.05], [0.08, 0.03], [0.07, 0.0214]],
    [[0.2, 0.2], [0.18, 0.18], [0.16, 0.2], [0.14, 0.12], [0.12, 0.1], [0.1, 0.1], [0.07, 0.06], [0.03, 0.04]],
  ];
  return fields.map((f, i) => race(i + 1, f));
}

const base = (o: Partial<OptimizeInput> = {}): OptimizeInput => ({
  races: v85(), budgetKr: 385, rowPrice: 0.5, spikes: 3, lambda: 0, ...o,
});

describe("systemMetrics", () => {
  const races = [
    race(1, [[0.3, 0.2], [0.2, 0.4], [0.5, 0.4]]),
    race(2, [[0.6, 0.5], [0.4, 0.5]]),
    race(3, [[0.8, 0.6], [0.2, 0.4]]),
  ];

  it("räknar P(alla rätt) och P(alla utom en) som produkter av täckningen", () => {
    // Täckning 0,5 / 0,6 / 0,8
    const m = systemMetrics(races, sel({ 1: [1, 2], 2: [1], 3: [1] }));
    expect(m.p8).toBeCloseTo(0.24, 10);
    // 0,5·0,6·0,2 + 0,5·0,4·0,8 + 0,5·0,6·0,8
    expect(m.p7).toBeCloseTo(0.46, 10);
    expect(m.rows).toBe(2);
    expect(m.complete).toBe(true);
  });

  it("värdeindex = produkten av medel(chans/streck) per avdelning", () => {
    const m = systemMetrics(races, sel({ 1: [1, 2], 2: [1], 3: [1] }));
    // avd 1: (1,5 + 0,5)/2 = 1; avd 2: 1,2; avd 3: 0,8/0,6
    expect(m.valueIndex).toBeCloseTo(1 * 1.2 * (0.8 / 0.6), 10);
  });

  it("visar täckning per avdelning som chans och streck", () => {
    const m = systemMetrics(races, sel({ 1: [1, 2], 2: [1], 3: [1, 2] }));
    expect(m.coverage[0]).toMatchObject({ race_number: 1, horses: 2, spike: false, streckMissing: false });
    expect(m.coverage[0].chans).toBeCloseTo(0.5, 10);
    expect(m.coverage[0].streck).toBeCloseTo(0.6, 10);
    expect(m.coverage[1].spike).toBe(true);
  });

  it("chansen att alla spikar håller (67 %, 41 % och 38 % → cirka 10 %)", () => {
    const r = [race(1, [[0.67, 0.6], [0.33, 0.4]]), race(2, [[0.41, 0.55], [0.59, 0.45]]), race(3, [[0.38, 0.37], [0.62, 0.63]])];
    const m = systemMetrics(r, sel({ 1: [1], 2: [1], 3: [1] }));
    expect(m.pAllSpikesHold).toBeCloseTo(0.67 * 0.41 * 0.38, 10);
    expect(m.pAllSpikesHold).toBeCloseTo(0.104, 3);
    expect(systemMetrics(r, sel({ 1: [1, 2], 2: [1, 2], 3: [1, 2] })).pAllSpikesHold).toBe(1);
  });

  it("avvägning per spik mot att lägga till nästa häst (Shogun/Frank)", () => {
    const m = systemMetrics(v85(), sel({ 1: [1, 2], 2: [1], 3: [1, 2], 4: [1, 2], 5: [1, 2], 6: [1], 7: [1], 8: [1, 2] }));
    const shogun = m.spikeTradeoffs.find((t) => t.race_number === 7)!;
    expect(shogun.start_number).toBe(1);
    expect(shogun.nextStartNumber).toBe(2);
    // 38 av 75 % behålls: −49 % träffchans i avdelningen
    expect(shogun.chanceDelta).toBeCloseTo(0.38 / 0.75 - 1, 10);
    expect(Math.round(shogun.chanceDelta * 100)).toBe(-49);
    // r = 1,027 mot medel(1,027; 0,70): +19 % förväntad utdelning per krona
    expect(Math.round(shogun.valueDelta * 100)).toBe(19);
    expect(shogun.p8IfAdded).toBeCloseTo(m.p8 * (0.75 / 0.38), 10);
    // Spiken på favoriten i avd 2 behåller 67 av 79 %
    const fav = m.spikeTradeoffs.find((t) => t.race_number === 2)!;
    expect(fav.chanceDelta).toBeCloseTo(0.67 / 0.79 - 1, 10);
  });

  it("ofullständigt system: P(alla rätt) = 0, P(alla utom en) = övrigas produkt", () => {
    const m = systemMetrics(races, sel({ 1: [1, 2], 2: [1] }));
    expect(m.complete).toBe(false);
    expect(m.p8).toBe(0);
    expect(m.p7).toBeCloseTo(0.5 * 0.6, 10);
  });

  it("saknas streck i en avdelning används chansen som streck (värde 1)", () => {
    const r = [race(1, [[0.7, null], [0.3, null]]), race(2, [[0.6, 0.5], [0.4, 0.5]])];
    const m = systemMetrics(r, sel({ 1: [1], 2: [1] }));
    expect(m.coverage[0].streckMissing).toBe(true);
    expect(m.coverage[0].streck).toBeNull();
    expect(m.valueIndex).toBeCloseTo(1.2, 10);
  });
});

describe("applyOverrides", () => {
  it("ersätter chansen och skalar om övriga så att summan blir 1", () => {
    const [r] = applyOverrides([race(1, [[0.38, 0.37], [0.37, 0.5], [0.25, 0.13]])], [{ race_number: 1, start_number: 1, chance: 0.5 }]);
    expect(r.horses[0].chance).toBeCloseTo(0.5, 10);
    expect(r.horses[1].chance).toBeCloseTo(0.37 * (0.5 / 0.62), 10);
    expect(r.horses.reduce((a, h) => a + h.chance, 0)).toBeCloseTo(1, 10);
  });

  it("ignorerar egna bedömningar av strukna hästar", () => {
    const [r] = applyOverrides([race(1, [[0.6, 0.5], [0.4, 0.5], [0, 0]], [3])], [{ race_number: 1, start_number: 3, chance: 0.5 }]);
    expect(r.horses[2].chance).toBe(0);
    expect(r.horses[0].chance).toBeCloseTo(0.6, 10);
  });
});

describe("optimizeSystem", () => {
  it("hittar det handräknade optimumet i ett litet exempel", () => {
    // Två rader: (1,2) ger 0,6·0,75 = 0,45, (2,1) ger 0,9·0,4 = 0,36
    const res = optimizeSystem({
      races: [race(1, [[0.6, 0.5], [0.3, 0.3], [0.1, 0.2]]), race(2, [[0.4, 0.4], [0.35, 0.35], [0.25, 0.25]])],
      budgetKr: 2, rowPrice: 1, spikes: { min: 0, max: 2 }, lambda: 0,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(picks(res.system.selection)).toEqual({ 1: [1], 2: [1, 2] });
    expect(res.system.p8).toBeCloseTo(0.45, 10);
    expect(res.system.rows).toBe(2);
    expect(res.system.cost).toBe(2);
  });

  it.each([50, 100, 385, 1000])("håller budgeten %d kr", (budget) => {
    const res = optimizeSystem(base({ budgetKr: budget, spikes: { min: 0, max: 8 } }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.system.rows).toBe(rowsOf(res.system.selection));
    expect(res.system.cost).toBeLessThanOrEqual(budget);
    expect(res.system.cost).toBeCloseTo(res.system.rows * 0.5, 10);
  });

  it.each([1, 2, 3])("håller exakt %d spikar", (spikes) => {
    const res = optimizeSystem(base({ spikes, budgetKr: 1000 }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(spikesOf(res.system.selection)).toBe(spikes);
  });

  it("håller ett intervall av spikar", () => {
    const res = optimizeSystem(base({ spikes: { min: 1, max: 2 }, budgetKr: 100 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const s = spikesOf(res.system.selection);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(2);
  });

  it(`spikar bara hästar med minst ${MIN_SPIKE_CHANCE * 100} % chans`, () => {
    const races = v85();
    const res = optimizeSystem(base({ races, spikes: 3 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    for (const s of res.system.selection.filter((x) => x.horses.length === 1)) {
      const h = races.find((r) => r.race_number === s.race_number)!.horses.find((x) => x.start_number === s.horses[0].start_number)!;
      expect(h.chance).toBeGreaterThanOrEqual(MIN_SPIKE_CHANCE);
    }
    // Bara avd 2, 6 och 7 har en häst över 35 % — fyra spikar går inte
    const four = optimizeSystem(base({ spikes: 4 }));
    expect(four.ok).toBe(false);
    if (!four.ok) expect(four.reason).toMatch(/35 %/);
  });

  it("respekterar lås: in, ut och spik", () => {
    const res = optimizeSystem(base({
      locks: [
        { race_number: 1, start_number: 8, kind: "in" },
        { race_number: 2, start_number: 1, kind: "out" },
        { race_number: 3, start_number: 2, kind: "spike" }, // 20 % — låst spik räknas ändå
      ],
    }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = picks(res.system.selection);
    expect(p[1]).toContain(8);
    expect(p[2]).not.toContain(1);
    expect(p[3]).toEqual([2]);
    expect(spikesOf(res.system.selection)).toBe(3);
  });

  it("säger ifrån vid motstridiga lås", () => {
    const res = optimizeSystem(base({
      locks: [
        { race_number: 3, start_number: 2, kind: "spike" },
        { race_number: 3, start_number: 2, kind: "out" },
      ],
    }));
    expect(res.ok).toBe(false);
  });

  it("egen bedömning ersätter den kalibrerade chansen före optimeringen", () => {
    // Avd 5 har ingen häst över 35 %; med egen bedömning 50 % blir den spikbar
    const without = optimizeSystem(base({ spikes: 4 }));
    expect(without.ok).toBe(false);
    const res = optimizeSystem(base({ spikes: 4, overrides: [{ race_number: 5, start_number: 2, chance: 0.5 }] }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(picks(res.system.selection)[5]).toEqual([2]);
  });

  it("väljer aldrig strukna hästar, inte ens låsta", () => {
    const races = v85();
    races[0] = race(1, [[0.5, 0.5], [0.3, 0.3], [0.2, 0.2], [0, 0.1]], [4]);
    const res = optimizeSystem(base({
      races, budgetKr: 5000, spikes: { min: 0, max: 8 },
      locks: [{ race_number: 1, start_number: 4, kind: "in" }],
    }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(picks(res.system.selection)[1]).not.toContain(4);
    expect(res.system.notes.join(" ")).toMatch(/struken/);
  });

  it("är deterministisk och oberoende av ordningen på avdelningarna", () => {
    const a = optimizeSystem(base({ lambda: 0.3 }));
    const b = optimizeSystem(base({ lambda: 0.3 }));
    const c = optimizeSystem(base({ lambda: 0.3, races: [...v85()].reverse() }));
    expect(a).toEqual(b);
    expect(a).toEqual(c);
  });

  it("noterar avdelningar utan streck", () => {
    const races = v85();
    races[3] = { ...races[3], horses: races[3].horses.map((h) => ({ ...h, streck: null })) };
    const res = optimizeSystem(base({ races }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.system.notes.join(" ")).toMatch(/Avd 4 saknar streck/);
  });

  it("förklarar när budgeten är för låg för antalet spikar", () => {
    const res = optimizeSystem(base({ budgetKr: 20, spikes: 2 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Budgeten/);
  });

  it("förklarar när budgeten inte räcker till en rad", () => {
    const res = optimizeSystem(base({ budgetKr: 0.25 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/en enda rad/);
  });

  it("värdevikten väljer understreckade hästar före överstreckade", () => {
    // Två hästar med nästan samma chans; nr 2 är kraftigt understreckad
    const races = [race(1, [[0.3, 0.45], [0.28, 0.1], [0.42, 0.45]]), race(2, [[0.5, 0.5], [0.5, 0.5]])];
    const input = { races, budgetKr: 4, rowPrice: 1, spikes: { min: 0, max: 2 } };
    const r0 = optimizeSystem({ ...input, lambda: 0 });
    const r6 = optimizeSystem({ ...input, lambda: 0.6 });
    expect(r0.ok && r6.ok).toBe(true);
    if (!r0.ok || !r6.ok) return;
    expect(picks(r0.system.selection)[1]).toEqual([1, 3]);
    expect(picks(r6.system.selection)[1]).toEqual([2, 3]);
    expect(r6.system.valueIndex).toBeGreaterThan(r0.system.valueIndex);
  });
});

describe("proposeSystems", () => {
  it("ger tre förslag: Max chans, Balans och Värde", () => {
    const props = proposeSystems({ races: v85(), budgetKr: 385, rowPrice: 0.5, spikes: 3 });
    expect(props.map((p) => [p.label, p.lambda])).toEqual([["Max chans", 0], ["Balans", 0.3], ["Värde", 0.6]]);
    for (const p of props) {
      expect(p.system).not.toBeNull();
      expect(p.reason).toBeNull();
      expect(p.system!.cost).toBeLessThanOrEqual(385);
      expect(spikesOf(p.system!.selection)).toBe(3);
    }
    // Max chans har alltid högst P(8 rätt) inom samma villkor
    expect(props[0].system!.p8).toBeGreaterThanOrEqual(props[1].system!.p8 - 1e-12);
    expect(props[0].system!.p8).toBeGreaterThanOrEqual(props[2].system!.p8 - 1e-12);
  });

  it("ger null-förslag med förklaring när inget system ryms", () => {
    const props = proposeSystems({ races: v85(), budgetKr: 10, rowPrice: 0.5, spikes: 2 });
    for (const p of props) {
      expect(p.system).toBeNull();
      expect(p.reason).toMatch(/Budgeten/);
    }
  });
});

describe("optimizerRacesFromRaces", () => {
  function starter(n: number, o: Partial<Starter> = {}): Starter {
    return {
      id: `s${n}`, start_number: n, post_position: n, horse_id: `h${n}`, driver: "", driver_win_pct: null,
      trainer: "", trainer_win_pct: null, odds: 4, p_odds: null, bet_distribution: 25,
      shoes_reported: null, shoes_front: null, shoes_back: null, shoes_front_changed: null, shoes_back_changed: null,
      sulky_type: null, horse_age: 5, horse_sex: "gelding", horse_color: null, pedigree_father: null, home_track: null,
      starts_total: 10, wins_total: 1, places_2nd: 1, places_3rd: 1, earnings_total: 100000,
      starts_current_year: null, wins_current_year: null, places_2nd_current_year: null, places_3rd_current_year: null,
      starts_prev_year: null, wins_prev_year: null, places_2nd_prev_year: null, places_3rd_prev_year: null,
      best_time: null, last_5_results: [], life_records: null, formscore: 50, finish_position: null, finish_time: null,
      horses: { name: `Häst ${n}` }, ...o,
    } as Starter;
  }

  it("bygger avdelningar med kalibrerad chans, streck som andel och strukna hästar", () => {
    const r: Race = {
      id: "V85_x_1", race_number: 1, race_name: null, distance: 2140, start_method: "auto",
      start_time: "2026-10-10T14:00:00Z",
      starters: [starter(1, { odds: 2, bet_distribution: 50 }), starter(2, { odds: 4, bet_distribution: 30 }), starter(3, { odds: 0, bet_distribution: 20 })],
    };
    const [o] = optimizerRacesFromRaces([r]);
    expect(o.race_number).toBe(1);
    expect(o.horses.map((h) => h.scratched)).toEqual([false, false, true]);
    expect(o.horses[0].streck).toBeCloseTo(0.5, 10);
    expect(o.horses[0].horse_name).toBe("Häst 1");
    expect(o.horses[0].chance + o.horses[1].chance).toBeCloseTo(1, 10);
    expect(o.horses[2].chance).toBe(0);
  });
});

describe("kalibrering av täckning", () => {
  const cal = { alpha: -0.153, beta: 1.091 };
  it("utan kalibrering är täckningen oförändrad", () => {
    expect(adjustCoverage(0.4)).toBe(0.4);
    expect(adjustCoverage(0.4, null)).toBe(0.4);
  });
  it("sänker låg täckning, lämnar hög nästan orörd och håller 0 och 1", () => {
    expect(adjustCoverage(0.43, cal)).toBeCloseTo(0.389, 2);
    expect(Math.abs(adjustCoverage(0.85, cal) - 0.85)).toBeLessThan(0.01);
    expect(adjustCoverage(0, cal)).toBe(0);
    expect(adjustCoverage(1, cal)).toBe(1);
    expect(adjustCoverage(0.3, cal)).toBeLessThan(adjustCoverage(0.31, cal));
  });
  it("P(alla rätt) och spikarna räknas på justerad täckning", () => {
    const raw = systemMetrics(v85(), sel({ 1: [1, 2], 2: [1], 3: [1, 2], 4: [1, 2], 5: [1, 2], 6: [1], 7: [1], 8: [1, 2] }));
    const adj = systemMetrics(v85(), sel({ 1: [1, 2], 2: [1], 3: [1, 2], 4: [1, 2], 5: [1, 2], 6: [1], 7: [1], 8: [1, 2] }), { coverageCalibration: cal });
    const expected = raw.coverage.reduce((a, c) => a * adjustCoverage(c.chans, cal), 1);
    expect(adj.p8).toBeCloseTo(expected, 12);
    expect(adj.p8).toBeLessThan(raw.p8);
    expect(adj.pAllSpikesHold).toBeLessThan(raw.pAllSpikesHold);
    expect(adj.coverage[1].chans).toBeCloseTo(adjustCoverage(raw.coverage[1].chans, cal), 12);
    expect(adj.coverage[1].chansRaw).toBeCloseTo(raw.coverage[1].chans, 12);
  });
  it("optimeraren räknar med justerad täckning: förutsagd P(alla rätt) = produkten av justerade", () => {
    const res = optimizeSystem(base({ coverageCalibration: cal }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.system.p8).toBeCloseTo(res.system.metrics.coverage.reduce((a, c) => a * c.chans, 1), 12);
  });
});
