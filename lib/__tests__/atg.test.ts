import {
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
