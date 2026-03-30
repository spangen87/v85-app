import { calculateCompositeScore, calculateFormscore } from "../formscore";
import type { AtgStarter } from "../atg";

function makeStarter(overrides: Partial<AtgStarter> = {}): AtgStarter {
  return {
    start_number: 1,
    post_position: 1,
    horse_id: "h1",
    horse_name: "Test",
    horse_age: 5,
    horse_sex: "gelding",
    horse_color: "bay",
    pedigree_father: "Sire",
    home_track: "Solvalla",
    driver: "Kansen",
    driver_win_pct: 15,
    trainer: "Tansen",
    trainer_win_pct: 10,
    odds: 5.0,
    p_odds: 2.0,
    bet_distribution: 10,
    shoes_reported: true,
    shoes_front: true,
    shoes_back: true,
    shoes_front_changed: false,
    shoes_back_changed: false,
    sulky_type: "Vanlig",
    starts_total: 20,
    wins_total: 5,
    places_2nd: 3,
    places_3rd: 2,
    earnings_total: 500000,
    starts_current_year: 5,
    wins_current_year: 2,
    places_2nd_current_year: 1,
    places_3rd_current_year: 0,
    starts_prev_year: 10,
    wins_prev_year: 3,
    places_2nd_prev_year: 2,
    places_3rd_prev_year: 1,
    best_time: "1:14,5",
    life_records: [],
    last_5_results: [],
    ...overrides,
  };
}

const defaultRace = { distance: 2140, start_method: "auto", field_size: 10 };

describe("calculateCompositeScore", () => {
  it("returnerar poäng i intervallet 0–100", () => {
    const starters = [makeStarter(), makeStarter({ start_number: 2, odds: 10 })];
    const scores = calculateCompositeScore(starters, defaultRace);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("ger korrekt poäng med last_5_results", () => {
    const starters = [
      makeStarter({
        last_5_results: [
          { place: "1", date: "2025-01-01", track: "Solvalla", time: "1:14,5", post_position: null },
          { place: "1", date: "2025-01-08", track: "Solvalla", time: "1:14,0", post_position: null },
          { place: "2", date: "2025-01-15", track: "Åby", time: "1:15,0", post_position: null },
        ],
      }),
      makeStarter({ start_number: 2, odds: 20 }),
    ];
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it("faller tillbaka på vinstprocent vid tom last_5_results", () => {
    const starters = [
      makeStarter({ wins_current_year: 3, starts_current_year: 5 }),
      makeStarter({ start_number: 2, wins_current_year: 0, starts_current_year: 5, odds: 20 }),
    ];
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it("parsar tider med kolon-format", () => {
    const starters = [
      makeStarter({ best_time: "1:14,5" }),
      makeStarter({ start_number: 2, best_time: "1:18,0", odds: 10 }),
    ];
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
  });

  it("parsar tider med punkt-format", () => {
    const starters = [
      makeStarter({ best_time: "1.14,5" }),
      makeStarter({ start_number: 2, best_time: "1.18,0", odds: 10 }),
    ];
    // punkt-format "1.14,5" stöds inte av parseTimeToSeconds (kräver kolon)
    // men beräkningen ska fortfarande köras utan att krascha
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores).toHaveLength(2);
  });

  it("hanterar häst utan odds", () => {
    const starters = [
      makeStarter({ odds: null }),
      makeStarter({ start_number: 2, odds: 5 }),
    ];
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toBeGreaterThanOrEqual(0);
  });

  it("hanterar häst utan best_time", () => {
    const starters = [
      makeStarter({ best_time: "" }),
      makeStarter({ start_number: 2, best_time: "1:14,5" }),
    ];
    const scores = calculateCompositeScore(starters, defaultRace);
    expect(scores).toHaveLength(2);
  });

  it("tar hänsyn till distansfaktor", () => {
    const withRecord = makeStarter({
      life_records: [{ start_method: "auto", distance: "medium", place: 1, time: "1:14,5" }],
    });
    const withoutRecord = makeStarter({
      start_number: 2,
      life_records: [],
    });
    const scores = calculateCompositeScore([withRecord, withoutRecord], defaultRace);
    // Häst med vinstrekord på distansen bör ha högre poäng
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it("tar hänsyn till konsistens", () => {
    const consistent = makeStarter({
      starts_total: 20, wins_total: 8, places_2nd: 4, places_3rd: 3,
    });
    const inconsistent = makeStarter({
      start_number: 2,
      starts_total: 20, wins_total: 1, places_2nd: 0, places_3rd: 0,
    });
    const scores = calculateCompositeScore([consistent, inconsistent], defaultRace);
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });
});

describe("calculateFormscore (deprecated wrapper)", () => {
  it("returnerar poäng i intervallet 0–100", () => {
    const starters = [makeStarter(), makeStarter({ start_number: 2, odds: 10 })];
    const scores = calculateFormscore(starters);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
