import type { Race, Starter } from "../raceTypes";
import {
  activeFilterCount, buildRowModels, EMPTY_FILTERS, filterRows, parseHastParam, raceHasResults,
  raceLacksMarket, raceTabsInfo, sortRows, type RaceMaps,
} from "../raceView";

function starter(n: number, o: Partial<Starter> = {}): Starter {
  return {
    id: `s${n}`, start_number: n, post_position: n, horse_id: `h${n}`, driver: `Kusk ${n}`, driver_win_pct: null,
    trainer: `Tränare ${n}`, trainer_win_pct: null, odds: 10, p_odds: null, bet_distribution: 10,
    shoes_reported: null, shoes_front: null, shoes_back: null, shoes_front_changed: null, shoes_back_changed: null,
    sulky_type: null, horse_age: null, horse_sex: null, horse_color: null, pedigree_father: null, home_track: null,
    starts_total: 10, wins_total: 1, places_2nd: 1, places_3rd: 1, earnings_total: 100000,
    starts_current_year: null, wins_current_year: null, places_2nd_current_year: null, places_3rd_current_year: null,
    starts_prev_year: null, wins_prev_year: null, places_2nd_prev_year: null, places_3rd_prev_year: null,
    best_time: null, last_5_results: [], life_records: null, formscore: 50, finish_position: null, finish_time: null,
    horses: { name: `Häst ${n}` }, ...o,
  } as Starter;
}

function race(starters: Starter[], o: Partial<Race> = {}): Race {
  return { id: "V85_2026-10-10_1_3", race_number: 3, race_name: null, distance: 2140, start_method: "auto",
    start_time: "2026-10-10T14:45:00Z", starters, ...o } as Race;
}

/** Kartor för hand så att testerna inte beror på modellerna. */
function maps(o: Partial<RaceMaps> = {}): RaceMaps {
  return { prob: {}, skrall: {}, edge: {}, fundamental: {}, scratched: new Set(), ...o };
}
const prob = (p: number) => ({ p, streckProb: null, oddsProb: null, source: "blend" as const });

describe("buildRowModels", () => {
  it("räknar chans, värde och rang", () => {
    const r = race([starter(1, { bet_distribution: 20, formscore: 70 }), starter(2, { bet_distribution: 40, formscore: 60 })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(0.3), 2: prob(0.7) } }), new Set());
    expect(rows[0].chansPct).toBeCloseTo(30);
    expect(rows[0].valueDelta).toBeCloseTo(10);
    expect(rows[0].isValue).toBe(true);
    expect(rows[0].chansRank).toBe(2);
    expect(rows[1].chansRank).toBe(1);
    expect(rows[1].isValue).toBe(true);
  });

  it("värde kräver CS över 55", () => {
    const r = race([starter(1, { bet_distribution: 20, formscore: 55 })]);
    expect(buildRowModels(r, maps({ prob: { 1: prob(0.3) } }), new Set())[0].isValue).toBe(false);
  });

  it("skräll vinner över signal, struken över båda", () => {
    const r = race([starter(1), starter(2), starter(3)]);
    const rows = buildRowModels(r, maps({
      prob: { 1: prob(0.5), 2: prob(0.5) },
      skrall: { 1: { isCandidate: true, oddsProbPct: 20, edge: 10, classRank: 1 }, 2: { isCandidate: false, oddsProbPct: 10, edge: 0, classRank: 2 } },
      edge: { 1: { signals: [], score: 3, isEdge: true }, 2: { signals: [], score: 2, isEdge: true } },
      scratched: new Set([3]),
    }), new Set());
    expect(rows.map((x) => x.badge)).toEqual(["skrall", "signal", "scratched"]);
  });

  it("före pooler: ingen chans, inget värde, saknad marknad", () => {
    const r = race([starter(1, { odds: null, bet_distribution: null }), starter(2, { odds: null, bet_distribution: null })]);
    const rows = buildRowModels(r, maps({ prob: { 1: { ...prob(0.5), source: "uniform" }, 2: { ...prob(0.5), source: "uniform" } } }), new Set());
    expect(rows.every((x) => x.chansPct === null && !x.isValue)).toBe(true);
    expect(raceLacksMarket(rows)).toBe(true);
  });

  it("struken häst i utkast: syns som vald och går att ta bort, men inte att lägga till", () => {
    const r = race([starter(1), starter(2, { odds: 0 }), starter(3, { odds: 0 })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(1) }, scratched: new Set([2, 3]) }), new Set([1, 2]));
    expect(rows[0].numberState).toBe("selected");
    expect(rows[1]).toMatchObject({ numberState: "selected", selectable: true, chansPct: null, scratched: true });
    expect(rows[2]).toMatchObject({ numberState: "idle", selectable: false, scratched: true });
  });

  it("efter resultat visar numret placeringen och går inte att välja", () => {
    const r = race([starter(1, { finish_position: 1 }), starter(2, { finish_position: 3 }), starter(3, { finish_position: null })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(0.4), 2: prob(0.3), 3: prob(0.3) } }), new Set([3]));
    expect(rows.map((x) => x.numberState)).toEqual(["p1", "p3", "finished"]);
    expect(rows.every((x) => !x.selectable)).toBe(true);
    expect(raceHasResults(r)).toBe(true);
  });

  it("formen är placeringarna", () => {
    const r = race([starter(1, { last_5_results: [{ place: "1", date: "", track: "", time: "", post_position: null }, { place: "5g", date: "", track: "", time: "", post_position: null }] })]);
    expect(buildRowModels(r, maps({ prob: { 1: prob(1) } }), new Set())[0].form).toEqual(["1", "5g"]);
  });
});

describe("sortRows och filterRows", () => {
  const r = race([
    starter(1, { odds: 2, bet_distribution: 40, formscore: 80 }),
    starter(2, { odds: 8, bet_distribution: 10, formscore: 40 }),
    starter(3, { odds: null, bet_distribution: 5, formscore: 60, driver: "Ella Lindqvist" }),
    starter(4, { odds: 0 }),
  ]);
  const rows = buildRowModels(r, maps({
    prob: { 1: prob(0.5), 2: prob(0.3), 3: prob(0.2) },
    scratched: new Set([4]),
    fundamental: { 1: { start_number: 1, p: 0.2, contributions: [] }, 2: { start_number: 2, p: 0.5, contributions: [] }, 3: { start_number: 3, p: 0.3, contributions: [] } },
    edge: { 2: { signals: [], score: 2, isEdge: true } },
  }), new Set());

  it("varje nyckel, saknade värden och strukna sist", () => {
    expect(sortRows(rows, "chans").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "streck").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "odds").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "grund").map((x) => x.n)).toEqual([2, 3, 1, 4]);
    expect(sortRows(rows, "cs").map((x) => x.n)).toEqual([1, 3, 2, 4]);
    expect(sortRows(rows, "number").map((x) => x.n)).toEqual([1, 2, 3, 4]);
  });

  it("filter var för sig och tillsammans", () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, signal: true }).map((x) => x.n)).toEqual([2]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, hideLongshots: true }).map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: "lindq" }).map((x) => x.n)).toEqual([3]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: "häst 2", signal: true }).map((x) => x.n)).toEqual([2]);
    expect(activeFilterCount({ ...EMPTY_FILTERS, value: true, search: "  " })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_FILTERS, skrall: true, search: "x" })).toBe(2);
  });

  it("dölj långskott tar bort odds över 50", () => {
    const r2 = race([starter(1, { odds: 51 }), starter(2, { odds: 50 })]);
    const rows2 = buildRowModels(r2, maps({ prob: { 1: prob(0.5), 2: prob(0.5) } }), new Set());
    expect(filterRows(rows2, { ...EMPTY_FILTERS, hideLongshots: true }).map((x) => x.n)).toEqual([2]);
  });
});

describe("raceTabsInfo", () => {
  it("antal valda och resultat klart", () => {
    const races = [race([starter(1, { finish_position: 1 })], { race_number: 1 }), race([starter(1)], { race_number: 2 })];
    expect(raceTabsInfo(races, [{ race_number: 2, horses: [{ horse_id: "a", start_number: 1, horse_name: "A" }, { horse_id: "b", start_number: 2, horse_name: "B" }] }]))
      .toEqual([{ n: 1, done: true, picks: 0 }, { n: 2, done: false, picks: 2 }]);
  });
});

describe("parseHastParam", () => {
  const races = [race([starter(1), starter(2)], { race_number: 3 })];
  it("giltig länk", () => {
    expect(parseHastParam("3-2", races)).toEqual({ race: 3, start: 2 });
  });
  it("trasiga länkar ignoreras", () => {
    for (const v of [null, "", "x", "3-", "-2", "9-2", "3-99", "3-2-1", "3.5-2"]) expect(parseHastParam(v, races)).toBeNull();
  });
});
