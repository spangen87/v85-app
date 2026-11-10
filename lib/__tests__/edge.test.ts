import { computeEdgeSignals, computeEdgeMap, EDGE_THRESHOLDS, type EdgeInput } from "../edge";

function makeStarter(overrides: Partial<EdgeInput> = {}): EdgeInput {
  return {
    start_number: 1,
    shoes_reported: true,
    shoes_front: true,
    shoes_back: true,
    shoes_front_changed: false,
    shoes_back_changed: false,
    last_5_results: [],
    ...overrides,
  };
}

describe("computeEdgeSignals — skosignaler", () => {
  it("ger +2 för barfota-byte runt om", () => {
    const [res] = computeEdgeSignals([
      makeStarter({
        shoes_front: false,
        shoes_back: false,
        shoes_front_changed: true,
        shoes_back_changed: true,
      }),
    ]);
    const sig = res.signals.find((s) => s.key === "barfota");
    expect(sig?.points).toBe(2);
    expect(res.isEdge).toBe(true);
  });

  it("ger +1 för barfota-byte endast fram", () => {
    const [res] = computeEdgeSignals([
      makeStarter({ shoes_front: false, shoes_front_changed: true }),
    ]);
    const sig = res.signals.find((s) => s.key === "barfota");
    expect(sig?.points).toBe(1);
    expect(sig?.label).toBe("Barfota fram");
  });

  it("ger -2 när hästen får skor på, och markerar shoesOn", () => {
    const [res] = computeEdgeSignals([
      makeStarter({ shoes_front: true, shoes_front_changed: true }),
    ]);
    const sig = res.signals.find((s) => s.key === "skor_pa");
    expect(sig?.points).toBe(EDGE_THRESHOLDS.shoesOnPoints);
    expect(sig?.points).toBe(-2);
    expect(res.shoesOn).toBe(true);
    expect(computeEdgeSignals([makeStarter()])[0].shoesOn).toBe(false);
  });

  it("ignorerar skosignaler när skoinfo inte rapporterats", () => {
    const [res] = computeEdgeSignals([
      makeStarter({
        shoes_reported: false,
        shoes_front: false,
        shoes_front_changed: true,
      }),
    ]);
    expect(res.signals.filter((s) => s.key === "barfota" || s.key === "skor_pa")).toHaveLength(0);
  });

  it("ger ingen barfotasignal utan byte (redan barfota senast)", () => {
    const [res] = computeEdgeSignals([
      makeStarter({ shoes_front: false, shoes_back: false }),
    ]);
    expect(res.signals).toHaveLength(0);
  });
});

describe("computeEdgeSignals — formtrend", () => {
  it("flaggar stigande form (nyast först: 1, 2 efter sämre starter)", () => {
    const [res] = computeEdgeSignals([
      makeStarter({
        last_5_results: [
          { place: "1", date: "2026-06-10" },
          { place: "2", date: "2026-05-20" },
          { place: "6", date: "2026-05-01" },
          { place: "0", date: "2026-04-12" },
          { place: "7", date: "2026-03-25" },
        ],
      }),
    ]);
    expect(res.signals.some((s) => s.key === "form_upp")).toBe(true);
  });

  it("flaggar fallande form", () => {
    const [res] = computeEdgeSignals([
      makeStarter({
        last_5_results: [
          { place: "8", date: "2026-06-10" },
          { place: "d", date: "2026-05-20" },
          { place: "1", date: "2026-05-01" },
          { place: "2", date: "2026-04-12" },
          { place: "1", date: "2026-03-25" },
        ],
      }),
    ]);
    expect(res.signals.some((s) => s.key === "form_ner")).toBe(true);
  });

  it("ger ingen trendsignal vid jämn form eller för få starter", () => {
    const even = computeEdgeSignals([
      makeStarter({
        last_5_results: [
          { place: "3", date: "2026-06-10" },
          { place: "2", date: "2026-05-20" },
          { place: "3", date: "2026-05-01" },
          { place: "2", date: "2026-04-12" },
        ],
      }),
    ])[0];
    expect(even.signals.some((s) => s.key === "form_upp" || s.key === "form_ner")).toBe(false);

    const few = computeEdgeSignals([
      makeStarter({
        last_5_results: [
          { place: "1", date: "2026-06-10" },
          { place: "8", date: "2026-05-20" },
        ],
      }),
    ])[0];
    expect(few.signals.some((s) => s.key === "form_upp" || s.key === "form_ner")).toBe(false);
  });
});

describe("computeEdgeSignals — kantpoäng och flaggning", () => {
  const rising = [
    { place: "1", date: "2026-06-10" },
    { place: "2", date: "2026-05-20" },
    { place: "6", date: "2026-05-01" },
    { place: "0", date: "2026-04-12" },
  ];
  const falling = [
    { place: "8", date: "2026-03-01" },
    { place: "d", date: "2026-02-10" },
    { place: "1", date: "2026-01-20" },
    { place: "2", date: "2026-01-02" },
  ];

  it("summerar poäng och flaggar vid minEdgeScore", () => {
    const results = computeEdgeSignals([
      // Barfota runt om (+2) + stigande form (+1) = +3
      makeStarter({ start_number: 1, shoes_front: false, shoes_back: false, shoes_front_changed: true, shoes_back_changed: true, last_5_results: rising }),
      makeStarter({ start_number: 2 }),
    ]);
    expect(results[0].score).toBe(3);
    expect(results[0].isEdge).toBe(true);
    expect(results[1].score).toBe(0);
    expect(results[1].isEdge).toBe(false);
  });

  it("negativa signaler drar ner poängen under flaggningsgränsen", () => {
    const [res] = computeEdgeSignals([
      makeStarter({ shoes_front: false, shoes_back: false, shoes_front_changed: true, shoes_back_changed: true, last_5_results: falling }),
    ]);
    // +2 barfota, −1 form ner
    expect(res.score).toBe(1);
    expect(res.isEdge).toBe(false);
  });

  it("toppkusk och uppehåll ger inga signaler längre", () => {
    const [res] = computeEdgeSignals([makeStarter({ last_5_results: [{ place: "1", date: "2025-01-01" }] })]);
    expect(res.signals).toHaveLength(0);
  });

  it("minEdgeScore-tröskeln är den dokumenterade", () => {
    expect(EDGE_THRESHOLDS.minEdgeScore).toBe(2);
  });
});

describe("computeEdgeMap", () => {
  it("nycklar resultaten på startnummer", () => {
    const map = computeEdgeMap([
      makeStarter({ start_number: 4 }),
      makeStarter({ start_number: 7, shoes_front: false, shoes_front_changed: true }),
    ]);
    expect(map[4].signals).toHaveLength(0);
    expect(map[7].signals.some((s) => s.key === "barfota")).toBe(true);
  });

  it("hanterar null-data utan att kasta", () => {
    const map = computeEdgeMap([
      makeStarter({
        start_number: 1,
        shoes_reported: null,
        shoes_front: null,
        shoes_back: null,
        shoes_front_changed: null,
        shoes_back_changed: null,
        last_5_results: null,
      }),
    ]);
    expect(map[1].score).toBe(0);
  });
});
