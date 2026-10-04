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

import { prefSnapshot, rememberPref } from "../prefs";

describe("minne när lagringen inte fungerar", () => {
  it("rememberPref vinner över lagringen och valideras", () => {
    const broken = { getItem: () => { throw new Error("privat läge"); } };
    expect(prefSnapshot("vy", ALLOWED, "lista", broken)).toBe("lista");
    rememberPref("vy", "tabell");
    expect(prefSnapshot("vy", ALLOWED, "lista", broken)).toBe("tabell");
    rememberPref("vy", "skräp");
    expect(prefSnapshot("vy", ALLOWED, "lista", broken)).toBe("lista");
  });
});
