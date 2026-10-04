import { buildOddsSnapshots, saveOddsSnapshots, type SnapshotClient } from "../oddsSnapshots";

const starters = [
  { start_number: 1, horse_id: "h1", odds: 2.5, bet_distribution: 45.2 },
  { start_number: 2, horse_id: "h2", odds: null, bet_distribution: 0 },
];

describe("buildOddsSnapshots", () => {
  it("ger en rad per start med samma tidsstämpel", () => {
    const rows = buildOddsSnapshots("V85_2026-10-04_1", "V85_2026-10-04_1_3", 3, starters, "2026-10-04T12:00:00.000Z");
    expect(rows).toEqual([
      { game_id: "V85_2026-10-04_1", race_id: "V85_2026-10-04_1_3", race_number: 3, start_number: 1, horse_id: "h1",
        odds: 2.5, bet_distribution: 45.2, captured_at: "2026-10-04T12:00:00.000Z" },
      { game_id: "V85_2026-10-04_1", race_id: "V85_2026-10-04_1_3", race_number: 3, start_number: 2, horse_id: "h2",
        odds: null, bet_distribution: 0, captured_at: "2026-10-04T12:00:00.000Z" },
    ]);
  });
});

function client(result: { error: { message: string; code?: string } | null } | Error): SnapshotClient & { inserted: unknown[] } {
  const inserted: unknown[] = [];
  return {
    inserted,
    from: () => ({
      insert: async (rows: unknown[]) => {
        if (result instanceof Error) throw result;
        inserted.push(...rows);
        return result;
      },
    }),
  };
}

describe("saveOddsSnapshots", () => {
  const rows = buildOddsSnapshots("g", "g_1", 1, starters, "2026-10-04T12:00:00.000Z");
  let warn: jest.SpyInstance;
  beforeEach(() => (warn = jest.spyOn(console, "warn").mockImplementation(() => {})));
  afterEach(() => warn.mockRestore());

  it("sparar raderna", async () => {
    const c = client({ error: null });
    await expect(saveOddsSnapshots(c, rows)).resolves.toBe(true);
    expect(c.inserted).toHaveLength(2);
  });

  it("loggar och fortsätter när tabellen saknas", async () => {
    const c = client({ error: { message: 'relation "odds_snapshots" does not exist', code: "42P01" } });
    await expect(saveOddsSnapshots(c, rows)).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("loggar och fortsätter när anropet kastar", async () => {
    await expect(saveOddsSnapshots(client(new Error("nätverksfel")), rows)).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("gör inget utan rader", async () => {
    const c = client({ error: null });
    await expect(saveOddsSnapshots(c, [])).resolves.toBe(true);
    expect(c.inserted).toHaveLength(0);
  });
});
