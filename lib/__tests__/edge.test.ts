import { computeEdgeSignals, computeEdgeMap, EDGE_THRESHOLDS, type EdgeInput } from "../edge";

function makeStarter(overrides: Partial<EdgeInput> = {}): EdgeInput {
  return {
    start_number: 1,
    shoes_reported: true,
    shoes_front: true,
    shoes_back: true,
    shoes_front_changed: false,
    shoes_back_changed: false,
    driver_win_pct: 8,
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

  it("ger -1 när hästen får skor på", () => {
    const [res] = computeEdgeSignals([
      makeStarter({ shoes_front: true, shoes_front_changed: true }),
    ]);
    const sig = res.signals.find((s) => s.key === "skor_pa");
    expect(sig?.points).toBe(-1);
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

describe("computeEdgeSignals — toppkusk", () => {
  const field = [
    makeStarter({ start_number: 1, driver_win_pct: 22 }),
    makeStarter({ start_number: 2, driver_win_pct: 18 }),
    makeStarter({ start_number: 3, driver_win_pct: 9 }),
    makeStarter({ start_number: 4, driver_win_pct: 5 }),
  ];

  it("flaggar fältets två bästa kuskar över tröskeln", () => {
    const results = computeEdgeSignals(field);
    expect(results[0].signals.some((s) => s.key === "toppkusk")).toBe(true);
    expect(results[1].signals.some((s) => s.key === "toppkusk")).toBe(true);
    expect(results[2].signals.some((s) => s.key === "toppkusk")).toBe(false);
  });

  it("kräver minst driverMinWinPct även för fältets bästa kusk", () => {
    const weakField = [
      makeStarter({ start_number: 1, driver_win_pct: 12 }),
      makeStarter({ start_number: 2, driver_win_pct: 8 }),
      makeStarter({ start_number: 3, driver_win_pct: 6 }),
    ];
    const results = computeEdgeSignals(weakField);
    expect(results.every((r) => !r.signals.some((s) => s.key === "toppkusk"))).toBe(true);
  });

  it("hoppar över signalen när färre än 3 kuskar har data", () => {
    const results = computeEdgeSignals([
      makeStarter({ start_number: 1, driver_win_pct: 25 }),
      makeStarter({ start_number: 2, driver_win_pct: null }),
    ]);
    expect(results[0].signals.some((s) => s.key === "toppkusk")).toBe(false);
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

describe("computeEdgeSignals — uppehåll", () => {
  it("flaggar mer än 60 dagars uppehåll", () => {
    const [res] = computeEdgeSignals(
      [makeStarter({ last_5_results: [{ place: "1", date: "2026-03-01" }] })],
      "2026-06-13"
    );
    const sig = res.signals.find((s) => s.key === "uppehall");
    expect(sig?.points).toBe(-1);
  });

  it("flaggar inte normal vila", () => {
    const [res] = computeEdgeSignals(
      [makeStarter({ last_5_results: [{ place: "1", date: "2026-05-30" }] })],
      "2026-06-13"
    );
    expect(res.signals.some((s) => s.key === "uppehall")).toBe(false);
  });

  it("hoppar över signalen utan loppdatum eller med oparsbart datum", () => {
    const noDate = computeEdgeSignals([
      makeStarter({ last_5_results: [{ place: "1", date: "2026-01-01" }] }),
    ])[0];
    expect(noDate.signals.some((s) => s.key === "uppehall")).toBe(false);

    const badDate = computeEdgeSignals(
      [makeStarter({ last_5_results: [{ place: "1", date: "okänt" }] })],
      "2026-06-13"
    )[0];
    expect(badDate.signals.some((s) => s.key === "uppehall")).toBe(false);
  });
});

describe("computeEdgeSignals — kantpoäng och flaggning", () => {
  it("summerar poäng och flaggar vid minEdgeScore", () => {
    const field = [
      // Barfota runt om (+2) + toppkusk (+1) = +3 ⇒ kant
      makeStarter({
        start_number: 1,
        shoes_front: false,
        shoes_back: false,
        shoes_front_changed: true,
        shoes_back_changed: true,
        driver_win_pct: 20,
      }),
      makeStarter({ start_number: 2, driver_win_pct: 10 }),
      makeStarter({ start_number: 3, driver_win_pct: 7 }),
    ];
    const results = computeEdgeSignals(field);
    expect(results[0].score).toBe(3);
    expect(results[0].isEdge).toBe(true);
    expect(results[1].score).toBe(0);
    expect(results[1].isEdge).toBe(false);
  });

  it("negativa signaler drar ner poängen under flaggningsgränsen", () => {
    const [res] = computeEdgeSignals(
      [
        makeStarter({
          shoes_front: false,
          shoes_back: false,
          shoes_front_changed: true,
          shoes_back_changed: true,
          last_5_results: [
            { place: "8", date: "2026-03-01" },
            { place: "d", date: "2026-02-10" },
            { place: "1", date: "2026-01-20" },
            { place: "2", date: "2026-01-02" },
          ],
        }),
        makeStarter({ start_number: 2 }),
        makeStarter({ start_number: 3 }),
      ],
      "2026-06-13"
    );
    // +2 barfota, -1 form ner, -1 uppehåll = 0
    expect(res.score).toBe(0);
    expect(res.isEdge).toBe(false);
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
        driver_win_pct: null,
        last_5_results: null,
      }),
    ]);
    expect(map[1].score).toBe(0);
  });
});
