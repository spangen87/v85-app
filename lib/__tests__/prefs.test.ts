import { readPref, writePref } from "../prefs";

const ALLOWED = ["lista", "tabell"] as const;

describe("readPref", () => {
  it("returnerar sparat värde om det är tillåtet", () => {
    expect(readPref("v", ALLOWED, "lista", { getItem: () => "tabell" })).toBe("tabell");
  });
  it("skräp och saknat värde ger standard", () => {
    expect(readPref("v", ALLOWED, "lista", { getItem: () => "x" })).toBe("lista");
    expect(readPref("v", ALLOWED, "lista", { getItem: () => null })).toBe("lista");
  });
  it("lagring som kastar ger standard", () => {
    expect(readPref("v", ALLOWED, "lista", { getItem: () => { throw new Error("privat läge"); } })).toBe("lista");
  });
});

describe("writePref", () => {
  it("sväljer fel från lagringen", () => {
    expect(() => writePref("v", "tabell", { setItem: () => { throw new Error("full"); } })).not.toThrow();
  });
});
