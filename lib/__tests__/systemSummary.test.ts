import { computeTotalRows, summarizeSystem } from "../systemSummary";
import type { SystemSelection } from "../types";

const sel = (race: number, n: number): SystemSelection => ({
  race_number: race, horses: Array.from({ length: n }, (_, i) => ({ horse_id: `${race}-${i}`, start_number: i + 1, horse_name: "" })),
});

describe("summarizeSystem", () => {
  it("komplett system: rader och kostnad", () => {
    const s = summarizeSystem([sel(1, 3), sel(2, 1), sel(3, 2), sel(4, 2), sel(5, 3), sel(6, 1), sel(7, 1), sel(8, 4)], 8, "V85");
    expect(s).toMatchObject({ rows: 144, done: 8, total: 8, complete: true, costText: "72 kr" });
    expect(s.headline).toBe("144 rader · 72 kr");
    expect(s.hint).toBe("Alla avdelningar klara");
  });
  it("ofullständigt system", () => {
    const s = summarizeSystem([sel(1, 2), sel(3, 1)], 8, "V85");
    expect(s).toMatchObject({ complete: false, costText: null, headline: "2 av 8 avd" });
    expect(s.hint).toBe("Välj minst en häst i varje avdelning");
  });
  it("en rad i singular och tomt system", () => {
    expect(summarizeSystem([sel(1, 1)], 1, "V85").headline).toBe("1 rad · 0,50 kr");
    expect(summarizeSystem([], 8, "V85")).toMatchObject({ rows: 0, done: 0, headline: "0 av 8 avd" });
  });
  it("computeTotalRows som förut", () => {
    expect(computeTotalRows([])).toBe(0);
    expect(computeTotalRows([sel(1, 2), sel(2, 3)])).toBe(6);
  });
});
