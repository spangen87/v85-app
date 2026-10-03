import {
  estimateSpeedTables,
  evaluate,
  fitConditionalLogit,
  lbfgs,
  median,
  objective,
  raceProbs,
  type SpeedRecord,
  type TrainingRace,
} from "../fundamental/fit";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthetic(n: number, beta: number[], seed = 1): TrainingRace[] {
  const r = rng(seed);
  const races: TrainingRace[] = [];
  for (let i = 0; i < n; i++) {
    const z = Array.from({ length: 10 }, () => beta.map(() => r() * 2 - 1));
    const p = raceProbs(z, beta);
    let u = r(), winner = 0;
    while (winner < p.length - 1 && u > p[winner]) { u -= p[winner]; winner++; }
    races.push({ z, winner });
  }
  return races;
}

describe("objective", () => {
  it("analytisk gradient stämmer med finita differenser", () => {
    const races = synthetic(50, [0.8, -0.4, 0.2]);
    const beta = [0.3, 0.1, -0.2];
    const { grad } = objective(beta, races, 0.5);
    const h = 1e-6;
    beta.forEach((_, k) => {
      const up = [...beta]; up[k] += h;
      const dn = [...beta]; dn[k] -= h;
      const num = (objective(up, races, 0.5).f - objective(dn, races, 0.5).f) / (2 * h);
      expect(grad[k]).toBeCloseTo(num, 4);
    });
  });
});

describe("lbfgs", () => {
  it("minimerar en kvadratisk funktion", () => {
    const x = lbfgs((v) => ({
      f: (v[0] - 3) ** 2 + 10 * (v[1] + 1) ** 2,
      grad: [2 * (v[0] - 3), 20 * (v[1] + 1)],
    }), [0, 0]);
    expect(x[0]).toBeCloseTo(3, 4);
    expect(x[1]).toBeCloseTo(-1, 4);
  });
});

describe("fitConditionalLogit", () => {
  it("återfinner sanna vikter på syntetisk data", () => {
    const truth = [1.0, -0.5];
    const beta = fitConditionalLogit(synthetic(3000, truth, 7), 2, 0.01);
    expect(Math.abs(beta[0] - truth[0])).toBeLessThan(0.15);
    expect(Math.abs(beta[1] - truth[1])).toBeLessThan(0.15);
  });
});

describe("evaluate", () => {
  it("räknar logloss, pseudo-R², topp 1 och topp 3", () => {
    const m = evaluate([[0.5, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25]], [0, 3]);
    expect(m.logloss).toBeCloseTo((-Math.log(0.5) - Math.log(0.25)) / 2);
    expect(m.pseudo_r2).toBeCloseTo(1 - m.logloss / ((Math.log(3) + Math.log(4)) / 2));
    expect(m.top1).toBeCloseTo(0.5); // lopp 2: lika — argmax väljer index 0
    expect(m.top3).toBeCloseTo(0.5);
    expect(m.n).toBe(2);
  });
});

describe("estimateSpeedTables", () => {
  const rec = (o: Partial<SpeedRecord>): SpeedRecord => ({
    breed: "V", track: "Solvalla", start_method: "auto", distance: 2140, condition: "light", seconds: 73, ...o,
  });

  it("median kräver ≥15 för par och ≥30 för underlag", () => {
    const records = [
      ...Array.from({ length: 15 }, (_, i) => rec({ seconds: 72 + i * 0.1 })),
      ...Array.from({ length: 14 }, () => rec({ track: "Liten bana" })),
      ...Array.from({ length: 30 }, () => rec({ track: "Liten bana", condition: "heavy", seconds: 74 })),
    ];
    const t = estimateSpeedTables(records);
    expect(t.par["V|Solvalla|auto|medium"]).toBeCloseTo(72.7);
    expect(t.par["V|Liten bana|auto|medium"]).toBeCloseTo(74); // 44 poster
    expect(t.par_fallback["V|auto|medium"]).toBeDefined();
    expect(t.condition_adj.heavy).toBeDefined();
    expect(t.condition_adj.light).toBeUndefined(); // 15 + 14 = 29 poster < 30
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
