import { formatRowCost, getRowPrice } from "@/lib/atg";

// Radpriser kontrollerade mot ATG:s utdelningar och omsättning (backtest 2026-10-04)
describe("getRowPrice", () => {
  it.each([["V86", 0.25], ["V85", 0.5], ["V75", 0.5], ["V65", 1], ["V64", 1], ["GS75", 1]])("%s kostar %s kr per rad", (type, price) => {
    expect(getRowPrice(type as string)).toBe(price);
  });
  it("V65-system med 48 rader kostar 48 kr", () => {
    expect(formatRowCost(48, "V65")).toBe("48 kr");
  });
});
