import { computeEvaluation, type EvalStarterRow } from "../evaluation";

function r(race: string, nr: number, cs: number, grund: number | null, pos: number | null): EvalStarterRow {
  return {
    race_id: race, start_number: nr, formscore: cs, fundamental_p: grund, finish_position: pos,
    races: { race_number: Number(race.slice(-1)), game_id: "G", games: { id: "G", date: "2026-09-20", game_type: "V85", track: "S" } },
    horses: { name: `H${nr}` },
  };
}

describe("computeEvaluation", () => {
  const rows = [
    // Lopp 1: CS-favorit galopperar (ingen placering) — ska ändå räknas som toppval och miss
    r("G_1", 1, 90, 0.5, null), r("G_1", 2, 50, 0.3, 1), r("G_1", 3, 40, 0.2, 2),
    // Lopp 2: båda träffar
    r("G_2", 1, 80, 0.6, 1), r("G_2", 2, 20, 0.4, 2),
    // Lopp 3: Grundchans saknas för en häst → räknas bara för CS
    r("G_3", 1, 70, null, 1), r("G_3", 2, 30, 0.5, 2),
  ];
  const { overall } = computeEvaluation(rows);

  it("CS räknas på alla startande, inte bara de som fullföljt", () => {
    expect(overall.races_evaluated).toBe(3);
    expect(overall.top_pick_win_rate).toBeCloseTo((2 / 3) * 100);
  });
  it("Grundchans räknas bara där alla har värde", () => {
    expect(overall.fundamental_races_evaluated).toBe(2);
    expect(overall.fundamental_top_pick_win_rate).toBeCloseTo(50);
    expect(overall.fundamental_top_3_coverage_rate).toBeCloseTo(100);
  });
});
