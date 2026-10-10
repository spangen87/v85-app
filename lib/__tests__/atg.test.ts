import {
  detectBreed,
  normalizeLifeRecords,
  parseFirstPrize,
  atgLocalTimeToIso,
  parseGameResults,
  parseHistoryRecord,
  parseHistoryRecords,
  splitInternalRaceId,
} from "../atg";

// Format enligt ATG /races/{id}/extended → starts[].horse.results.records[]
function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    date: "2026-09-21",
    kmTime: { minutes: 1, seconds: 14, tenths: 9 },
    place: "2",
    race: { id: "2026-09-21_12_7", startMethod: "volte", firstPrize: 5000000 },
    track: { id: 12, name: "Bollnäs", condition: "light" },
    start: { distance: 2140, postPosition: 4 },
    ...overrides,
  };
}

describe("parseHistoryRecord", () => {
  it("översätter en vanlig start", () => {
    expect(parseHistoryRecord(record())).toEqual({
      date: "2026-09-21",
      track: "Bollnäs",
      place: "2",
      time: "1:14,9",
      post_position: 4,
      galloped: false,
      disqualified: false,
      distance: 2140,
      start_method: "volte",
      track_condition: "light",
      first_prize: 50000,
      driver: null,
    });
  });

  it("kodar galopp som placering + g och diskning som d", () => {
    expect(parseHistoryRecord(record({ place: "5", galloped: true }))?.place).toBe("5g");
    expect(parseHistoryRecord(record({ place: undefined, galloped: true }))?.place).toBe("0g");
    expect(
      parseHistoryRecord(record({ place: undefined, galloped: true, disqualified: true }))?.place
    ).toBe("d");
  });

  it("ger tom tid när ATG skickar en kod i stället för km-tid", () => {
    expect(parseHistoryRecord(record({ kmTime: { code: "u" } }))?.time).toBe("");
    expect(parseHistoryRecord(record({ kmTime: undefined }))?.time).toBe("");
  });

  it("hoppar över strykningar", () => {
    expect(parseHistoryRecord(record({ scratched: true, place: undefined }))).toBeNull();
  });
});

describe("parseHistoryRecords", () => {
  it("sorterar nyast först och utesluter starter från och med loppdatumet", () => {
    const parsed = parseHistoryRecords(
      [
        record({ date: "2026-08-01" }),
        record({ date: "2026-09-28" }), // loppet självt — får inte läcka in
        record({ date: "2026-09-10" }),
        record({ date: "2026-09-01", scratched: true }),
      ],
      "2026-09-28"
    );
    expect(parsed.map((h) => h.date)).toEqual(["2026-09-10", "2026-08-01"]);
  });
});

describe("parseGameResults", () => {
  it("läser km-tid från result.kmTime och ignorerar koder för diskade", () => {
    const res = parseGameResults({
      id: "V85_2026-03-28_5_5",
      races: [
        {
          starts: [
            {
              number: 1,
              horse: { id: 111 },
              result: { place: 1, finishOrder: 1, kmTime: { minutes: 1, seconds: 12, tenths: 9 } },
            },
            {
              number: 2,
              horse: { id: 222 },
              result: { finishOrder: 41, kmTime: { code: "11" }, galloped: true, disqualified: true },
            },
          ],
        },
      ],
    });
    expect(res.is_complete).toBe(true);
    expect(res.results[0]).toMatchObject({ finish_position: 1, finish_time: "1:12,9" });
    expect(res.results[1]).toMatchObject({ finish_position: null, finish_time: null });
  });
});

describe("splitInternalRaceId", () => {
  it("delar upp spel-id och avdelning", () => {
    expect(splitInternalRaceId("V86_2026-09-16_40_1_3")).toEqual({
      gameId: "V86_2026-09-16_40_1",
      raceNumber: 3,
    });
  });

  it("returnerar null för ogiltiga id", () => {
    expect(splitInternalRaceId("V86")).toBeNull();
    expect(splitInternalRaceId("V86_x")).toBeNull();
  });
});

describe("parseFirstPrize", () => {
  it("tolkar förstapriset ur ATG:s pristext", () => {
    expect(parseFirstPrize("Pris: 80.000-40.000-22.500 kr (7 prisplacerade).")).toBe(80000);
    expect(parseFirstPrize("Pris: 1.000.000-500.000 kr")).toBe(1000000);
  });
  it("ger null när pris saknas", () => {
    expect(parseFirstPrize(undefined)).toBeNull();
    expect(parseFirstPrize("Inga pengar")).toBeNull();
  });
});

describe("detectBreed", () => {
  it("känner igen kallblod i loppvillkoren", () => {
    expect(detectBreed(["3-åriga och äldre svenska och norska kallblodiga ston", "1640 m."])).toBe("K");
  });
  it("är varmblod annars", () => {
    expect(detectBreed(["3-åriga och äldre 85.001 - 225.000 kr."])).toBe("V");
    expect(detectBreed(undefined)).toBe("V");
  });
});

describe("normalizeLifeRecords", () => {
  it("översätter ATG:s rekordposter", () => {
    expect(
      normalizeLifeRecords([
        { startMethod: "auto", distance: "short", place: 1, time: { minutes: 1, seconds: 12, tenths: 5 } },
        { distance: "medium" }, // saknar startmetod → bort
      ])
    ).toEqual([{ start_method: "auto", distance: "short", place: 1, time: "1:12,5" }]);
  });
});

describe("parseHistoryRecord – kusk", () => {
  it("tar med kuskens namn", () => {
    const h = parseHistoryRecord(
      record({ start: { distance: 2140, postPosition: 4, driver: { firstName: "Ulf", lastName: "Ohlsson" } } })
    );
    expect(h?.driver).toBe("Ulf Ohlsson");
  });
});

describe("atgLocalTimeToIso", () => {
  it("tolkar ATG:s tid utan tidszon som svensk tid (sommartid och vintertid)", () => {
    expect(atgLocalTimeToIso("2026-10-10T15:00:00")).toBe("2026-10-10T13:00:00.000Z");
    expect(atgLocalTimeToIso("2026-12-05T16:20:00")).toBe("2026-12-05T15:20:00.000Z");
  });
  it("klarar sommartidsbytet och lämnar tider med tidszon orörda", () => {
    expect(atgLocalTimeToIso("2026-03-29T03:30:00")).toBe("2026-03-29T01:30:00.000Z");
    expect(atgLocalTimeToIso("2026-10-25T01:30:00")).toBe("2026-10-24T23:30:00.000Z");
    expect(atgLocalTimeToIso("2026-10-10T15:00:00+02:00")).toBe("2026-10-10T15:00:00+02:00");
    expect(atgLocalTimeToIso("2026-10-10T13:00:00Z")).toBe("2026-10-10T13:00:00Z");
    expect(atgLocalTimeToIso("")).toBe("");
  });
});
