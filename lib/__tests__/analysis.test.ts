import {
  consistencyScore,
  parseTimeToSeconds,
  computeTrackFactor,
  computeDistanceSignal,
} from "../analysis";
import type { HorseStart } from "../atg";

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

describe("consistencyScore", () => {
  it("ger 0 för häst utan starter", () => {
    expect(consistencyScore(0, 0, 0)).toBe(0);
  });

  it("ger högt poäng för häst med många vinster och placeringar", () => {
    const score = consistencyScore(10, 5, 8);
    expect(score).toBeGreaterThan(50);
  });

  it("viktar vinster (60%) tyngre än placeringar (40%)", () => {
    const onlyWins = consistencyScore(10, 10, 10);
    const onlyPlaces = consistencyScore(10, 0, 10);
    expect(onlyWins).toBeGreaterThan(onlyPlaces);
  });
});

describe("computeDistanceSignal", () => {
  it("ger faktor 0.6 om hästen aldrig sprungit på distansen", () => {
    const signal = computeDistanceSignal([], 2140, "auto");
    expect(signal.factor).toBe(0.6);
  });

  it("ger faktor 1.35 om hästen vunnit på exakt distans+metod", () => {
    const records = [{ start_method: "auto", distance: "medium", place: 1, time: "1:14,5" }];
    const signal = computeDistanceSignal(records, 2140, "auto");
    expect(signal.factor).toBe(1.35);
  });

  it("ger faktor 1.1 om hästen placerat på exakt distans+metod", () => {
    const records = [{ start_method: "auto", distance: "medium", place: 2, time: "1:14,5" }];
    const signal = computeDistanceSignal(records, 2140, "auto");
    expect(signal.factor).toBe(1.1);
  });

  it("ger faktor 1.2 om hästen vunnit med annan startmetod", () => {
    const records = [{ start_method: "volte", distance: "medium", place: 1, time: "1:14,5" }];
    const signal = computeDistanceSignal(records, 2140, "auto");
    expect(signal.factor).toBe(1.2);
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

  it("använder dynamisk faktor vid exakt 5 starter (gränsfall)", () => {
    const boundary5: HorseStart[] = [
      { place: "1", date: "2025-01-01", track: "Test", time: "1:12,0", post_position: 5 },
      { place: "1", date: "2025-01-02", track: "Test", time: "1:12,0", post_position: 5 },
      { place: "2", date: "2025-01-03", track: "Test", time: "1:12,0", post_position: 5 },
      { place: "2", date: "2025-01-04", track: "Test", time: "1:12,0", post_position: 5 },
      { place: "5", date: "2025-01-05", track: "Test", time: "1:12,0", post_position: 5 },
    ];
    const factor = computeTrackFactor(5, "volte", boundary5);
    expect(factor).toBeGreaterThanOrEqual(0);
    expect(factor).toBeLessThanOrEqual(1.0);
  });

  it("klipper dynamisk faktor till max 1.0 vid perfekt vinstrate", () => {
    const perfect: HorseStart[] = Array.from({ length: 6 }, () => ({
      place: "1", date: "2025-01-01", track: "Test", time: "1:12,0", post_position: 1
    }));
    const factor = computeTrackFactor(1, "volte", perfect);
    expect(factor).toBeLessThanOrEqual(1.0);
    expect(factor).toBeGreaterThanOrEqual(0);
  });

  it("exkluderar starter med null post_position från dynamisk beräkning", () => {
    const mixed: HorseStart[] = [
      { place: "1", date: "2025-01-01", track: "Test", time: "1:12,0", post_position: 3 },
      { place: "2", date: "2025-01-02", track: "Test", time: "1:12,0", post_position: null },
      { place: "1", date: "2025-01-03", track: "Test", time: "1:12,0", post_position: 3 },
      { place: "3", date: "2025-01-04", track: "Test", time: "1:12,0", post_position: null },
      { place: "1", date: "2025-01-05", track: "Test", time: "1:12,0", post_position: 3 },
    ];
    const factor = computeTrackFactor(3, "volte", mixed);
    const staticOnly = computeTrackFactor(3, "volte", []);
    expect(factor).toBeCloseTo(staticOnly, 5);
  });
});
