import fs from "fs";
import path from "path";
import { lockedStarts, planDraftSync } from "../systemSummary";

describe("C1: omgångsbyte nollställer klientläget", () => {
  it("RaceTabProvider har key per omgång så att system och flikar inte följer med", () => {
    const page = fs.readFileSync(path.join(__dirname, "../../app/(authenticated)/page.tsx"), "utf8");
    expect(page).toMatch(/<RaceTabProvider\s+key=\{selectedId/);
  });
});

describe("I1: localStorage-gettern kastar", () => {
  const g = globalThis as unknown as { window?: unknown };
  afterEach(() => { delete g.window; });
  it("readPref och writePref faller tillbaka i stället för att krascha", async () => {
    g.window = { get localStorage(): Storage { throw new Error("SecurityError"); } };
    const { readPref, writePref, prefSnapshot } = await import("../prefs");
    expect(readPref("v", ["lista", "tabell"] as const, "lista")).toBe("lista");
    expect(prefSnapshot("v2", ["lista", "tabell"] as const, "lista")).toBe("lista");
    expect(() => writePref("v", "tabell")).not.toThrow();
  });
});

describe("I4/I5: utkastet följer det som syns", () => {
  const sel = [{ race_number: 1, horses: [{ horse_id: "a", start_number: 1, horse_name: "A" }] }];
  it("tom kupong med utkast tar bort utkastet, annars skapas eller uppdateras det", () => {
    expect(planDraftSync([], null)).toBe("none");
    expect(planDraftSync([], "d1")).toBe("delete");
    expect(planDraftSync(sel, null)).toBe("create");
    expect(planDraftSync(sel, "d1")).toBe("update");
  });
});

describe("I6: låsta startnummer i kupongen", () => {
  it("strukna hästar och avgjorda lopp går inte att lägga till", () => {
    const starters = [
      { start_number: 1, odds: 3, finish_position: null },
      { start_number: 2, odds: 0, finish_position: null },
      { start_number: 3, odds: 5, finish_position: null },
    ];
    expect([...lockedStarts({ starters })]).toEqual([2]);
    const done = starters.map((s, i) => ({ ...s, finish_position: i === 0 ? 1 : null }));
    expect([...lockedStarts({ starters: done })].sort()).toEqual([1, 2, 3]);
  });
});
