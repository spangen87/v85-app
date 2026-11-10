import { defaultGameId, refreshDue, stockholmDate } from "../autoFetch";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("refreshDue", () => {
  it("hämtar aldrig om efter start", () => {
    expect(refreshDue(0, 5 * HOUR)).toBe(false);
    expect(refreshDue(-MIN, null)).toBe(false);
  });
  it("hämtar när omgången aldrig har hämtats", () => {
    expect(refreshDue(48 * HOUR, null)).toBe(true);
  });
  it("uppdaterar tätare ju närmare start", () => {
    // Två dygn kvar: två gånger per dygn
    expect(refreshDue(48 * HOUR, 11 * HOUR)).toBe(false);
    expect(refreshDue(48 * HOUR, 12 * HOUR)).toBe(true);
    // Samma dag: var tredje timme
    expect(refreshDue(10 * HOUR, 2 * HOUR)).toBe(false);
    expect(refreshDue(10 * HOUR, 3 * HOUR)).toBe(true);
    // Inom tre timmar: varje halvtimme
    expect(refreshDue(2 * HOUR, 20 * MIN)).toBe(false);
    expect(refreshDue(2 * HOUR, 30 * MIN)).toBe(true);
    // Sista timmen: var tionde minut
    expect(refreshDue(30 * MIN, 9 * MIN)).toBe(false);
    expect(refreshDue(30 * MIN, 10 * MIN)).toBe(true);
  });
  it("utan starttid gäller den glesaste takten", () => {
    expect(refreshDue(null, 11 * HOUR)).toBe(false);
    expect(refreshDue(null, 12 * HOUR)).toBe(true);
  });
});

describe("stockholmDate", () => {
  it("ger svenskt datum även nära midnatt UTC", () => {
    const now = new Date("2026-11-07T23:30:00Z"); // 00:30 svensk tid den 8:e
    expect(stockholmDate(0, now)).toBe("2026-11-08");
    expect(stockholmDate(-7, now)).toBe("2026-11-01");
  });
});

describe("defaultGameId", () => {
  const g = (id: string, date: string, game_type = "V85") => ({ id, date, game_type });
  it("väljer den närmast kommande omgången, inte den längst fram", () => {
    expect(defaultGameId([g("c", "2026-11-14"), g("b", "2026-11-11"), g("a", "2026-11-07")], "2026-11-10")).toBe("b");
  });
  it("tar dagens omgång och den viktigaste speltypen först", () => {
    expect(defaultGameId([g("v64", "2026-11-10", "V64"), g("v85", "2026-11-10", "V85")], "2026-11-10")).toBe("v85");
  });
  it("faller tillbaka på den senaste när inget är kommande", () => {
    expect(defaultGameId([g("a", "2026-11-01"), g("b", "2026-11-07")], "2026-11-10")).toBe("b");
    expect(defaultGameId([], "2026-11-10")).toBeNull();
  });
});
