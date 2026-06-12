import {
  computeWinProbabilities,
  BLEND_ALPHA,
  type ProbabilityInput,
} from "../probability";

function field(...rows: ProbabilityInput[]): ProbabilityInput[] {
  return rows;
}

describe("computeWinProbabilities", () => {
  it("returnerar tom array för tomt fält", () => {
    expect(computeWinProbabilities([])).toEqual([]);
  });

  it("summerar alltid till 1 över fältet", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: 2, bet_distribution: 50 },
        { odds: 5, bet_distribution: 30 },
        { odds: 10, bet_distribution: 20 }
      )
    );
    const sum = probs.reduce((a, b) => a + b.p, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("blandar streck och odds 50/50 när båda finns", () => {
    // Häst A: streck 60 %, odds-implicit 1/2 normaliserat
    const probs = computeWinProbabilities(
      field(
        { odds: 2, bet_distribution: 60 },
        { odds: 2, bet_distribution: 40 }
      )
    );
    // odds lika → odds_norm = 0.5/0.5; streck_norm = 0.6/0.4
    // p_A = 0.5*0.6 + 0.5*0.5 = 0.55
    expect(probs[0].source).toBe("blend");
    expect(probs[0].p).toBeCloseTo(0.55);
    expect(probs[1].p).toBeCloseTo(0.45);
    expect(BLEND_ALPHA).toBe(0.5);
  });

  it("faller tillbaka på enbart streckning när odds saknas", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: null, bet_distribution: 70 },
        { odds: null, bet_distribution: 30 }
      )
    );
    expect(probs[0].source).toBe("streck");
    expect(probs[0].oddsProb).toBeNull();
    expect(probs[0].p).toBeCloseTo(0.7);
    expect(probs[1].p).toBeCloseTo(0.3);
  });

  it("faller tillbaka på enbart odds när streckning saknas (innan pool öppnat)", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: 2, bet_distribution: null },
        { odds: 6, bet_distribution: 0 }
      )
    );
    expect(probs[0].source).toBe("odds");
    expect(probs[0].streckProb).toBeNull();
    // odds-norm: (1/2)/(1/2+1/6) = 0.75
    expect(probs[0].p).toBeCloseTo(0.75);
    expect(probs[1].p).toBeCloseTo(0.25);
  });

  it("ger likformig fördelning utan någon data", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: null, bet_distribution: null },
        { odds: null, bet_distribution: 0 },
        { odds: 0, bet_distribution: 0 }
      )
    );
    expect(probs.every((p) => p.source === "uniform")).toBe(true);
    expect(probs[0].p).toBeCloseTo(1 / 3);
  });

  it("hanterar fält där en enstaka häst saknar odds", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: 2, bet_distribution: 50 },
        { odds: null, bet_distribution: 50 }
      )
    );
    const sum = probs.reduce((a, b) => a + b.p, 0);
    expect(sum).toBeCloseTo(1);
    // Hästen utan odds får bara sin streckhalva → lägre p än om den haft odds
    expect(probs[1].oddsProb).toBeNull();
    expect(probs[0].p).toBeGreaterThan(probs[1].p);
  });

  it("favoriten i blend hamnar mellan streck- och odds-skattningen", () => {
    const probs = computeWinProbabilities(
      field(
        { odds: 1.5, bet_distribution: 30 }, // odds säger mycket, streck lite
        { odds: 8, bet_distribution: 35 },
        { odds: 9, bet_distribution: 35 }
      )
    );
    const fav = probs[0];
    expect(fav.streckProb).not.toBeNull();
    expect(fav.oddsProb).not.toBeNull();
    expect(fav.p).toBeGreaterThan(fav.streckProb!);
    expect(fav.p).toBeLessThan(fav.oddsProb!);
  });
});
