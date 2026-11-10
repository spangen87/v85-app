import { computeBadgeStats, type BadgeStarterRow } from "../badgeStats";

function row(race: number, n: number, o: Partial<BadgeStarterRow> = {}): BadgeStarterRow {
  return {
    race_id: `g_${race}`, start_number: n, odds: 10, bet_distribution: 10, formscore: 40, finish_position: null,
    earnings_total: 100_000, starts_total: 10,
    shoes_reported: true, shoes_front: true, shoes_back: true, shoes_front_changed: false, shoes_back_changed: false,
    last_5_results: [], races: { race_number: race, game_id: "g" },
    ...o,
  };
}

describe("computeBadgeStats", () => {
  // Avd 1: nr 1 är överspelad favorit (streck 60, odds säger 1/3) och förlorar; nr 2 vinner med skor på
  const race1 = [
    row(1, 1, { bet_distribution: 60, odds: 3, finish_position: 2 }),
    row(1, 2, { bet_distribution: 30, odds: 3, finish_position: 1, shoes_front_changed: true }),
    row(1, 3, { bet_distribution: 10, odds: 3, finish_position: 3 }),
  ];
  // Avd 2: favoriten vinner; nr 3 är struken (saknar odds) och räknas inte
  const race2 = [
    row(2, 1, { bet_distribution: 70, odds: 1.5, finish_position: 1 }),
    row(2, 2, { bet_distribution: 30, odds: 4, finish_position: 2 }),
    row(2, 3, { bet_distribution: 0, odds: null }),
  ];
  // Avd 3 saknar vinnare och räknas inte alls
  const race3 = [row(3, 1, { bet_distribution: 80, odds: 1.2 }), row(3, 2, { bet_distribution: 20, odds: 5 })];
  const { races, stats } = computeBadgeStats([...race1, ...race2, ...race3]);
  const get = (key: string) => stats.find((s) => s.key === key)!;

  it("räknar bara avgjorda lopp", () => {
    expect(races).toBe(2);
  });

  it("favoriten: en per lopp, med streck, väntat och utfall", () => {
    const fav = get("favorit");
    expect(fav.n).toBe(2);
    expect(fav.streckPct).toBeCloseTo(65);
    expect(fav.winPct).toBeCloseTo(50);
    // Avd 1: (60 % + 33,3 %) / 2; avd 2: (70 % + 72,7 %) / 2
    expect(fav.expectedPct).toBeCloseTo((46.67 + 71.36) / 2, 1);
  });

  it("överspelad och skor på", () => {
    expect(get("overplayed")).toMatchObject({ n: 1, winPct: 0 });
    expect(get("overplayed").streckPct).toBeCloseTo(60);
    expect(get("shoes")).toMatchObject({ n: 1, winPct: 100 });
  });

  it("tomma grupper ger noll utan att dela med noll", () => {
    expect(get("value")).toMatchObject({ n: 0, winPct: 0, expectedPct: 0 });
    // Avd 1 nr 3: streck 10 %, oddsen säger 33 %, topp 3 på klass
    expect(get("skrall").n).toBe(1);
  });
});
