import { fmtClock, fmtDelta, fmtGameDate, fmtKmTime, fmtKr, fmtNum, fmtOrdinal, fmtPct, fmtStartMethod } from "../format";

const NB = " ";

describe("fmtPct", () => {
  it("decimalkomma och hårt mellanslag", () => {
    expect(fmtPct(24.13)).toBe(`24,1${NB}%`);
    expect(fmtPct(5, 0)).toBe(`5${NB}%`);
  });
  it("saknat värde blir tankstreck", () => {
    expect(fmtPct(null)).toBe("–");
    expect(fmtPct(undefined)).toBe("–");
  });
});

describe("fmtNum", () => {
  it("odds med en decimal", () => {
    expect(fmtNum(4.23)).toBe("4,2");
    expect(fmtNum(12.38, 2)).toBe("12,38");
    expect(fmtNum(null)).toBe("–");
  });
});

describe("fmtDelta", () => {
  it("plus, äkta minus och ±0", () => {
    expect(fmtDelta(4.18)).toBe("+4,2");
    expect(fmtDelta(-1.34)).toBe("−1,3");
    expect(fmtDelta(0.04)).toBe("±0");
    expect(fmtDelta(-0.04)).toBe("±0");
  });
});

describe("fmtKmTime", () => {
  it("tar appens och ATG:s format", () => {
    expect(fmtKmTime("1:12,4")).toBe("1.12,4");
    expect(fmtKmTime("1.12,4")).toBe("1.12,4");
    expect(fmtKmTime("1:12.4")).toBe("1.12,4");
  });
  it("tomt blir tankstreck, okänt lämnas orört", () => {
    expect(fmtKmTime("")).toBe("–");
    expect(fmtKmTime(null)).toBe("–");
    expect(fmtKmTime("u")).toBe("u");
  });
});

describe("fmtKr", () => {
  it("tusentalsavgränsare och kr", () => {
    expect(fmtKr(41200)).toBe(`41${NB}200${NB}kr`);
    expect(fmtKr(1318400)).toBe(`1${NB}318${NB}400${NB}kr`);
    expect(fmtKr(950)).toBe(`950${NB}kr`);
    expect(fmtKr(null)).toBe("–");
  });
});

describe("fmtOrdinal", () => {
  it("svenska ordningstal", () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22, 101].map(fmtOrdinal)).toEqual(
      ["1:a", "2:a", "3:e", "4:e", "11:e", "12:e", "21:a", "22:a", "101:a"]
    );
  });
});

describe("fmtStartMethod", () => {
  it("auto och volte", () => {
    expect(fmtStartMethod("auto")).toBe("Autostart");
    expect(fmtStartMethod("volte")).toBe("Voltstart");
    expect(fmtStartMethod(null)).toBe("");
  });
});

describe("fmtGameDate och fmtClock", () => {
  it("veckodag med stor bokstav", () => {
    expect(fmtGameDate("2026-10-10")).toBe("Lördag 10 oktober");
  });
  it("klockslag i svensk tid", () => {
    expect(fmtClock("2026-10-10T14:20:00Z")).toBe("16:20");
    expect(fmtClock(null)).toBe("");
  });
});
