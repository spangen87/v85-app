import { computeFundamentalUpdates, writeFundamentalUpdates } from "../fundamental/recompute";
import type { FundamentalModel } from "../fundamental/model";
import { TABLES } from "../__fixtures__/fundamental";

const MODEL_T: FundamentalModel = {
  ...TABLES, version: "v2", trained_races: 1, test_metrics: null, temperature: 1, beta: { log_eps: 0.5 },
};
const races = [{ id: "G_1", game_id: "G", distance: 2140, start_method: "auto", breed: "V", first_prize: 50000 }];
const dates = new Map([["G", "2026-09-20"]]);
const base = { race_id: "G_1", starts_total: 10, odds: 5, bet_distribution: 10 };

describe("computeFundamentalUpdates", () => {
  it("returnerar bara ändrade rader", () => {
    const first = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1, earnings_total: 100000 },
      { ...base, id: "b", start_number: 2, earnings_total: 300000 },
    ], MODEL_T);
    expect(first).toHaveLength(2);
    expect(first[0].fundamental_version).toBe("v2");

    const again = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1, earnings_total: 100000, fundamental_p: first[0].fundamental_p, fundamental_version: "v2" },
      { ...base, id: "b", start_number: 2, earnings_total: 300000, fundamental_p: first[1].fundamental_p, fundamental_version: "v2" },
    ], MODEL_T);
    expect(again).toEqual([]);
  });
  it("nollställer strukna hästar som tidigare hade värde", () => {
    const res = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1 },
      { ...base, id: "b", start_number: 2 },
      { ...base, id: "c", start_number: 3, odds: null, bet_distribution: 0, fundamental_p: 0.2, fundamental_version: "v1" },
    ], MODEL_T);
    expect(res.find((u) => u.id === "c")).toEqual({ id: "c", fundamental_p: null, fundamental_version: null });
  });
  it("hoppar över lopp utan avdelningsdata", () => {
    expect(computeFundamentalUpdates([], dates, [{ ...base, id: "a", start_number: 1 }], MODEL_T)).toEqual([]);
  });
});

describe("writeFundamentalUpdates", () => {
  it("skriver i bulk (upsert på id) i bitar om 500", async () => {
    const calls: { rows: unknown[]; onConflict?: string }[] = [];
    const fakeDb = {
      from: (table: string) => {
        expect(table).toBe("starters");
        return {
          upsert: async (rows: unknown[], opts: { onConflict?: string }) => {
            calls.push({ rows, onConflict: opts.onConflict });
            return { error: null };
          },
        };
      },
    };
    const updates = Array.from({ length: 1200 }, (_, i) => ({
      id: `id${i}`, fundamental_p: 0.1, fundamental_version: "v2",
    }));
    const written = await writeFundamentalUpdates(fakeDb, updates);
    expect(written).toBe(1200);
    expect(calls.map((c) => c.rows.length)).toEqual([500, 500, 200]);
    expect(calls.every((c) => c.onConflict === "id")).toBe(true);
  });
  it("kastar vid fel så att adminrouten svarar med fel", async () => {
    const fakeDb = { from: () => ({ upsert: async () => ({ error: { message: "nej" } }) }) };
    await expect(
      writeFundamentalUpdates(fakeDb, [{ id: "a", fundamental_p: null, fundamental_version: null }])
    ).rejects.toThrow("nej");
  });
});
