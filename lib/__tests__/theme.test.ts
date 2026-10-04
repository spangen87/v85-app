import { effectiveTheme, parseStoredTheme, THEME_INIT_SCRIPT } from "../theme";

describe("parseStoredTheme", () => {
  it("godtar bara light och dark", () => {
    expect(parseStoredTheme("light")).toBe("light");
    expect(parseStoredTheme("dark")).toBe("dark");
    expect(parseStoredTheme(null)).toBeNull();
    expect(parseStoredTheme("blue")).toBeNull();
    expect(parseStoredTheme("")).toBeNull();
  });
});

describe("effectiveTheme", () => {
  it("följer systemet när inget är valt", () => {
    expect(effectiveTheme(null, true)).toBe("dark");
    expect(effectiveTheme(null, false)).toBe("light");
  });
  it("eget val vinner över systemet", () => {
    expect(effectiveTheme("light", true)).toBe("light");
    expect(effectiveTheme("dark", false)).toBe("dark");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("sätter data-theme bara för giltiga värden och tål att localStorage kastar", () => {
    expect(THEME_INIT_SCRIPT).toContain('t==="light"||t==="dark"');
    expect(THEME_INIT_SCRIPT).toContain("try");
    expect(THEME_INIT_SCRIPT).toContain("catch");
  });
});
