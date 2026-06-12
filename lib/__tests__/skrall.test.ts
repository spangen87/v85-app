import {
  computeSkrallSignals,
  computeSkrallMap,
  SKRALL_THRESHOLDS,
  type SkrallInput,
} from "../skrall";

function makeStarter(overrides: Partial<SkrallInput> = {}): SkrallInput {
  return {
    start_number: 1,
    bet_distribution: 10,
    odds: 10,
    earnings_total: 100000,
    starts_total: 10,
    ...overrides,
  };
}

describe("computeSkrallSignals", () => {
  it("normaliserar odds-sannolikheten till 100 % inom fältet", () => {
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, odds: 2 }),
      makeStarter({ start_number: 2, odds: 2 }),
      makeStarter({ start_number: 3, odds: 2 }),
      makeStarter({ start_number: 4, odds: 2 }),
    ]);
    const total = signals.reduce((sum, s) => sum + (s.oddsProbPct ?? 0), 0);
    expect(total).toBeCloseTo(100);
    expect(signals[0].oddsProbPct).toBeCloseTo(25);
  });

  it("ger null odds-sannolikhet och edge för häst utan odds", () => {
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, odds: null }),
      makeStarter({ start_number: 2, odds: 5 }),
    ]);
    expect(signals[0].oddsProbPct).toBeNull();
    expect(signals[0].edge).toBeNull();
    expect(signals[0].isCandidate).toBe(false);
  });

  it("rankar klass efter intjänat per start (1 = högst)", () => {
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, earnings_total: 50000, starts_total: 10 }), // 5000/start
      makeStarter({ start_number: 2, earnings_total: 200000, starts_total: 10 }), // 20000/start
      makeStarter({ start_number: 3, earnings_total: 0, starts_total: 0 }), // 0
    ]);
    expect(signals[0].classRank).toBe(2);
    expect(signals[1].classRank).toBe(1);
    expect(signals[2].classRank).toBe(3);
  });

  it("ger samma rank vid lika intjänat per start", () => {
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, earnings_total: 100000, starts_total: 10 }),
      makeStarter({ start_number: 2, earnings_total: 100000, starts_total: 10 }),
      makeStarter({ start_number: 3, earnings_total: 10000, starts_total: 10 }),
    ]);
    expect(signals[0].classRank).toBe(1);
    expect(signals[1].classRank).toBe(1);
    expect(signals[2].classRank).toBe(3);
  });

  it("flaggar kandidat när alla tre villkor uppfylls", () => {
    // Häst 2: låg streck (5 %), starka odds relativt streck och bäst klass
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, bet_distribution: 70, odds: 1.5, earnings_total: 50000 }),
      makeStarter({ start_number: 2, bet_distribution: 5, odds: 6, earnings_total: 300000 }),
      makeStarter({ start_number: 3, bet_distribution: 25, odds: 20, earnings_total: 20000 }),
    ]);
    // oddsProb för häst 2: (1/6)/(1/1.5+1/6+1/20) ≈ 18,9 % → edge ≈ +13,9
    expect(signals[1].edge).toBeGreaterThan(SKRALL_THRESHOLDS.minEdge);
    expect(signals[1].classRank).toBe(1);
    expect(signals[1].isCandidate).toBe(true);
    // Favoriten är överstreckad — inte kandidat
    expect(signals[0].isCandidate).toBe(false);
  });

  it("flaggar inte häst med för hög streckning", () => {
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, bet_distribution: 20, odds: 10, earnings_total: 300000 }),
      makeStarter({ start_number: 2, bet_distribution: 80, odds: 1.2, earnings_total: 50000 }),
    ]);
    expect(signals[0].isCandidate).toBe(false);
  });

  it("flaggar inte häst med dålig klass trots understreckning", () => {
    const starters = [
      makeStarter({ start_number: 1, bet_distribution: 5, odds: 6, earnings_total: 1000, starts_total: 10 }),
      makeStarter({ start_number: 2, bet_distribution: 40, odds: 2, earnings_total: 200000, starts_total: 10 }),
      makeStarter({ start_number: 3, bet_distribution: 20, odds: 4, earnings_total: 150000, starts_total: 10 }),
      makeStarter({ start_number: 4, bet_distribution: 15, odds: 5, earnings_total: 100000, starts_total: 10 }),
      makeStarter({ start_number: 5, bet_distribution: 10, odds: 8, earnings_total: 90000, starts_total: 10 }),
    ];
    const signals = computeSkrallSignals(starters);
    expect(signals[0].edge).toBeGreaterThan(SKRALL_THRESHOLDS.minEdge);
    expect(signals[0].classRank).toBeGreaterThan(SKRALL_THRESHOLDS.maxClassRank);
    expect(signals[0].isCandidate).toBe(false);
  });

  it("hanterar tomt fält och fält utan odds", () => {
    expect(computeSkrallSignals([])).toEqual([]);
    const signals = computeSkrallSignals([
      makeStarter({ start_number: 1, odds: null }),
      makeStarter({ start_number: 2, odds: null }),
    ]);
    expect(signals.every((s) => s.oddsProbPct === null && !s.isCandidate)).toBe(true);
  });
});

describe("computeSkrallMap", () => {
  it("nycklar signalerna på startnummer", () => {
    const map = computeSkrallMap([
      makeStarter({ start_number: 4, odds: 2 }),
      makeStarter({ start_number: 7, odds: 4 }),
    ]);
    expect(Object.keys(map).sort()).toEqual(["4", "7"]);
    expect(map[4].oddsProbPct).toBeGreaterThan(map[7].oddsProbPct!);
  });
});
