import {
  weightedFormScore,
  valueIndex,
  consistencyScore,
  parseTimeToSeconds,
  timeAdjustment,
  compositeScore,
  computeTrackFactor,
} from "../analysis";
import type { HorseStart } from "../atg";

describe("weightedFormScore", () => {
  it("ger 100 för häst som vunnit alla senaste 5 i fält om 10", () => {
    const starts = Array(5).fill({ place: 1, fieldSize: 10 });
    expect(weightedFormScore(starts)).toBe(100);
  });

  it("ger 0 för häst som alltid kommit sist", () => {
    const starts = Array(5).fill({ place: 10, fieldSize: 10 });
    expect(weightedFormScore(starts)).toBe(0);
  });

  it("ger 0 för tom array", () => {
    expect(weightedFormScore([])).toBe(0);
  });

  it("viktar nyare starter tyngre", () => {
    const recentWin = [
      { place: 1, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
    ];
    const oldWin = [
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 10, fieldSize: 10 },
      { place: 1, fieldSize: 10 },
    ];
    expect(weightedFormScore(recentWin)).toBeGreaterThan(weightedFormScore(oldWin));
  });
});

describe("parseTimeToSeconds", () => {
  it("parsar 1:12,4 korrekt", () => {
    expect(parseTimeToSeconds("1:12,4")).toBe(72.4);
  });

  it("parsar 1:12.4 med punkt korrekt", () => {
    expect(parseTimeToSeconds("1:12.4")).toBe(72.4);
  });

  it("returnerar null för ogiltigt format", () => {
    expect(parseTimeToSeconds("ogiltigt")).toBeNull();
  });

  it("returnerar null för null/undefined", () => {
    expect(parseTimeToSeconds(null)).toBeNull();
    expect(parseTimeToSeconds(undefined)).toBeNull();
  });
});

describe("valueIndex", () => {
  it("ger positiv edge för undervärderad häst", () => {
    // Häst med 30% vinstchans men odds 5x (20% implicit)
    expect(valueIndex(0.30, 5)).toBeCloseTo(10, 0);
  });

  it("ger negativ edge för övervärderad häst", () => {
    // Häst med 10% vinstchans men odds 2x (50% implicit)
    expect(valueIndex(0.10, 2)).toBeLessThan(0);
  });

  it("ger ~0 för korrekt prissatt häst", () => {
    // Odds 4x → 25% implicit, estimerad också 25%
    expect(valueIndex(0.25, 4)).toBeCloseTo(0, 0);
  });
});

describe("consistencyScore", () => {
  it("ger 0 för häst utan starter", () => {
    expect(consistencyScore(0, 0, 0)).toBe(0);
  });

  it("ger högt poäng för häst med många vinster och placeringar", () => {
    // 50% vinstrate, 80% platsrate
    const score = consistencyScore(10, 5, 8);
    expect(score).toBeGreaterThan(50);
  });

  it("viktar vinster (60%) tyngre än placeringar (40%)", () => {
    const onlyWins = consistencyScore(10, 10, 10);     // 100% vinst, 100% plats
    const onlyPlaces = consistencyScore(10, 0, 10);    // 0% vinst, 100% plats
    expect(onlyWins).toBeGreaterThan(onlyPlaces);
  });
});

describe("timeAdjustment", () => {
  it("ger negativt värde för snabbare häst", () => {
    expect(timeAdjustment(70.0, 72.0)).toBe(-2.0);
  });

  it("ger positivt värde för långsammare häst", () => {
    expect(timeAdjustment(74.5, 72.0)).toBe(2.5);
  });

  it("ger 0 för häst på medianen", () => {
    expect(timeAdjustment(72.0, 72.0)).toBe(0);
  });
});

describe("compositeScore", () => {
  it("ger högt poäng för häst med alla bra faktorer", () => {
    const score = compositeScore({
      formScore: 90,
      valueIndex: 10,
      consistencyScore: 80,
      timeAdj: -1,
    });
    expect(score).toBeGreaterThan(70);
  });

  it("ger lågt poäng för häst med alla dåliga faktorer", () => {
    const score = compositeScore({
      formScore: 10,
      valueIndex: -10,
      consistencyScore: 5,
      timeAdj: 3,
    });
    expect(score).toBeLessThan(40);
  });

  it("returnerar värde i intervallet 0–100", () => {
    const score = compositeScore({
      formScore: 50,
      valueIndex: 0,
      consistencyScore: 50,
      timeAdj: 0,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeTrackFactor", () => {
  it("returnerar högre faktor för inre spår i voltstart", () => {
    const spår1 = computeTrackFactor(1, "volte", []);
    const spår8 = computeTrackFactor(8, "volte", []);
    expect(spår1).toBeGreaterThan(spår8);
  });

  it("returnerar högre faktor för spår 1 än spår 12", () => {
    const inner = computeTrackFactor(1, "volte", []);
    const outer = computeTrackFactor(12, "volte", []);
    expect(inner).toBeGreaterThan(outer);
  });

  it("planar ut faktorn mer för autostart", () => {
    const volteDiff = computeTrackFactor(1, "volte", []) - computeTrackFactor(10, "volte", []);
    const autoDiff = computeTrackFactor(1, "auto", []) - computeTrackFactor(10, "auto", []);
    expect(autoDiff).toBeLessThan(volteDiff);
  });

  it("returnerar värde i intervallet 0–1", () => {
    for (const spår of [1, 4, 8, 12, 16]) {
      const f = computeTrackFactor(spår, "volte", []);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("använder dynamisk faktor vid ≥5 starter med spårdata", () => {
    const goodHistory: HorseStart[] = Array.from({ length: 6 }, (_, i) => ({
      place: "1",
      date: `2025-01-0${i + 1}`,
      track: "Solvalla",
      time: "1:14,5",
      post_position: 2,
    }));
    const noHistory: HorseStart[] = [];
    const withHistory = computeTrackFactor(2, "volte", goodHistory);
    const withoutHistory = computeTrackFactor(2, "volte", noHistory);
    expect(withHistory).toBeGreaterThanOrEqual(withoutHistory);
  });

  it("faller tillbaka på statisk faktor vid <5 starter med spårdata", () => {
    const fewStarts: HorseStart[] = [
      { place: "1", date: "2025-01-01", track: "Solvalla", time: "1:14,5", post_position: 3 },
      { place: "2", date: "2025-01-08", track: "Solvalla", time: "1:15,0", post_position: 3 },
    ];
    const staticOnly = computeTrackFactor(3, "volte", []);
    const fewData = computeTrackFactor(3, "volte", fewStarts);
    expect(fewData).toBeCloseTo(staticOnly, 5);
  });
});
