import { defaultBudget, defaultSpikes, fmtOneIn, hitLabels, locksFromSelections, spikeTradeoffText } from "@/lib/optimizerView";

describe("fmtOneIn", () => {
  it("chans som 1 på N", () => {
    expect(fmtOneIn(1 / 89)).toBe("1 på 89");
    expect(fmtOneIn(0.0004)).toBe("1 på 2 500");
    expect(fmtOneIn(0.6)).toBe("1 på 2");
  });
  it("noll eller saknas blir tankstreck", () => {
    expect(fmtOneIn(0)).toBe("–");
    expect(fmtOneIn(NaN)).toBe("–");
  });
});

describe("hitLabels", () => {
  it("alla rätt och alla utom en efter antal avdelningar", () => {
    expect(hitLabels(8)).toEqual({ all: "8 rätt", allButOne: "7 rätt" });
    expect(hitLabels(6)).toEqual({ all: "6 rätt", allButOne: "5 rätt" });
  });
});

describe("standardvärden", () => {
  it("budget efter spelform", () => {
    expect(defaultBudget("V85")).toBe(385);
    expect(defaultBudget("V64")).toBe(200);
    expect(defaultBudget(null)).toBe(385);
  });
  it("spikar efter antal avdelningar", () => {
    expect(defaultSpikes(8)).toBe(3);
    expect(defaultSpikes(6)).toBe(2);
  });
});

describe("locksFromSelections", () => {
  it("valda hästar blir lås in", () => {
    expect(locksFromSelections([{ race_number: 2, horses: [{ horse_id: "a", start_number: 4, horse_name: "A" }] }]))
      .toEqual([{ race_number: 2, start_number: 4, kind: "in" }]);
  });
});

describe("spikeTradeoffText", () => {
  it("som i issuen: träffchans och utdelning per krona", () => {
    const t = { race_number: 7, start_number: 5, chance: 0.38, nextStartNumber: 3, chanceDelta: -0.49, valueDelta: 0.19, p8IfAdded: 0, valueIndexIfAdded: 0 };
    expect(spikeTradeoffText(t, "Shogun R.R.")).toBe("Spik på 5 Shogun R.R. i avd 7: −49 % träffchans i avdelningen, +19 % utdelning per krona jämfört med att också ta nr 3.");
  });
});
