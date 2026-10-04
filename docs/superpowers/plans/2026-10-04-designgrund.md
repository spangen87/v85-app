# Designgrund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge Travappen en renare och tydligare grund: nya tokens och tema, gemensamma komponenter, en ordlista som förklarar varje mått, ny loppvy (lista, detaljvy, tabell) och en systembyggare utan eget läge.

**Architecture:** Tokens från designsystemet läggs i `app/globals.css`, och de gamla `--tn-*` blir alias. Grundkomponenterna (`components/ui/`) är TSX-portar av designsystemets komponenter och använder klasser i `app/ui.css`. Loppvyns logik flyttas till rena funktioner i `lib/raceView.ts`, som både listan, tabellen och detaljvyn använder.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Jest + ts-jest (node-miljö, komponenter testas med `react-dom/server`), Supabase. Nya beroenden: `react-markdown`, `remark-gfm`, `rehype-slug`, `github-slugger` (dev).

**Spec:** `docs/superpowers/specs/2026-10-04-designgrund-design.md`. Designkällor: https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz (designsystem) och https://claude.ai/artifact/UVCKQANpMwDrUqfWhFFFXn (nyckelvyer).

## Global Constraints

- All UI-text på svenska; du-tilltal; inga emojis; inga versaler med spärrning som etikett.
- Siffror: decimalkomma och hårt mellanslag (` `) före `%` ("24,1 %"); odds "4,2" utan "x"; procentenheter "+4,2"/"−1,3" med äkta minustecken (`−`); km-tid "1.12,4".
- Minsta textstorlek 12 px. Siffror med `font-variant-numeric: tabular-nums`.
- Nya komponenter använder aldrig `--tn-*`, aldrig `title=`-tooltips och aldrig `tn-mono`/`tn-eyebrow`.
- Färg betyder något: `accent` = går att trycka på / vald i systemet; `value` = spelvärde; `skrall` = skrällmärke och saknad data; `danger` = fel; `place-1..3` = placering. Minus i värde är grått.
- Högst ett märke per häst; Skräll vinner över Signal; Struken vinner över båda.
- Värderegeln är oförändrad: CS > 55, streck > 0 och chans > streck.
- Inga beräkningar i `lib/formscore.ts`, `lib/probability.ts`, `lib/skrall.ts`, `lib/edge.ts`, `lib/fundamental/` ändras.
- Tokenvärden kopieras exakt från designsystemets `tokens.json` (värdena står i Task 1).
- `--radius-sm/md/lg` och `--font-sans` läggs i Tailwinds `@theme` så att `rounded-sm/md/lg` och `font-sans` följer designsystemet (6/10/14 px).
- `MANUAL.md` uppdateras i samma uppgift som ändrar det användaren ser (CLAUDE.md-konvention).
- Varje commit avslutas med `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push och PR görs först efter att användaren sagt ja (en PR per del: Grund = Task 1–7, Loppvy = Task 8–13, System = Task 14–16).

## Review Focus

1. Omgång innan poolerna öppnat (odds och streck saknas för alla) — Chans visas som "–", ingen värdemarkering, avdelningen visar raden "Streck och odds saknas än …". Testas i Task 8.
2. Struken häst som redan ligger i ett sparat utkast — startnumret visas i viloläge och går inte att trycka på, hästen hamnar sist. Testas i Task 8.
3. Trasig eller gammal länk med `?hast=` ("x", "3-", "9-99", "3-2-1") — ignoreras utan fel; giltig länk väljer avdelning och öppnar hästen. Testas i Task 8.
4. localStorage som kastar (Safari privat läge) eller innehåller skräp — appen faller tillbaka på standardvärden (Lista, Chans, systemtema). Testas i Task 1 och Task 8.
5. Förklaringslänk till en manualrubrik med å/ä/ö ("Värde", "Skräll", "Spår") — ankaret måste matcha rubrikens id. Testas i Task 3.

---

## Del 1 – Grund (PR 1)

### Task 1: Tokens, alias och tema

**Files:**
- Modify: `app/globals.css:1-60` (tokenblocken), `app/globals.css` (`.tn-eyebrow`)
- Create: `lib/theme.ts`
- Modify: `components/ThemeProvider.tsx`, `components/ThemeToggle.tsx`, `app/layout.tsx`
- Test: `lib/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `type ThemeChoice = "light" | "dark"`; `parseStoredTheme(v: string | null): ThemeChoice | null`; `effectiveTheme(stored: ThemeChoice | null, prefersDark: boolean): ThemeChoice`; `THEME_INIT_SCRIPT: string`; CSS-variablerna `--bg --surface --surface-sunken --line --line-strong --ink --ink-muted --accent --accent-soft --on-accent --focus --value --value-soft --skrall --skrall-soft --danger --danger-soft --place-1 --place-2 --place-3 --on-place --scrim --space-1..8 --radius-sm/md/lg --shadow-raised --shadow-sheet --font-sans --font-display`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/theme.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/theme.test.ts`
Expected: FAIL with "Cannot find module '../theme'"

- [ ] **Step 3: Write `lib/theme.ts`**

```ts
/** Tema: "light"/"dark" när användaren valt själv, annars följer appen systemet. */
export type ThemeChoice = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function parseStoredTheme(v: string | null): ThemeChoice | null {
  return v === "light" || v === "dark" ? v : null;
}

export function effectiveTheme(stored: ThemeChoice | null, prefersDark: boolean): ThemeChoice {
  return stored ?? (prefersDark ? "dark" : "light");
}

/**
 * Körs i <head> innan sidan ritas så att ett eget val inte blinkar i fel tema.
 * Utan eget val gör den inget — CSS:ens prefers-color-scheme sköter det.
 */
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.add(t);}}catch(e){}})();';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/theme.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Replace the token blocks in `app/globals.css`**

Replace everything from `/* ─── Design tokens ───` down to and including the closing `}` of the `[data-theme="light"], :root.light { … }` block with:

```css
/* ─── Design tokens (Travappen designsystem, tokens.json) ───── */
@theme {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --font-sans: var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-display: var(--font-instrument-serif), Georgia, serif;
}

:root {
  --bg: #f5f6f8;
  --surface: #ffffff;
  --surface-sunken: #eceff3;
  --line: #e1e5eb;
  --line-strong: #c9cfd8;
  --ink: #131823;
  --ink-muted: #586173;
  --accent: #2350c8;
  --accent-soft: #e7edfb;
  --on-accent: #ffffff;
  --focus: var(--accent);
  --value: #0d7149;
  --value-soft: #e2f3ea;
  --skrall: #8f5300;
  --skrall-soft: #fbefd9;
  --danger: #b42318;
  --danger-soft: #fcebe9;
  --place-1: #d4a22a;
  --place-2: #a3acba;
  --place-3: #c08453;
  --on-place: #131823;
  --scrim: rgba(13, 16, 22, 0.45);
  --shadow-raised: 0 1px 2px rgba(19, 24, 35, 0.08);
  --shadow-sheet: 0 -8px 24px rgba(19, 24, 35, 0.14);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  color-scheme: light;

  /* Alias för sidor som ännu inte gjorts om — tas bort när sista sidan är klar */
  --tn-bg: var(--bg);
  --tn-bg-raised: var(--surface);
  --tn-bg-card: var(--surface);
  --tn-bg-card-hover: var(--surface-sunken);
  --tn-bg-chip: var(--surface-sunken);
  --tn-border: var(--line);
  --tn-border-strong: var(--line-strong);
  --tn-text: var(--ink);
  --tn-text-dim: var(--ink-muted);
  --tn-text-faint: var(--ink-muted);
  --tn-accent: var(--accent);
  --tn-accent-soft: var(--accent-soft);
  --tn-accent-faint: var(--accent-soft);
  --tn-accent-glow: var(--accent-soft);
  --tn-value-high: var(--value);
  --tn-value-high-bg: var(--value-soft);
  --tn-value-low: var(--danger);
  --tn-value-low-bg: var(--danger-soft);
  --tn-warn: var(--skrall);
  --tn-warn-bg: var(--skrall-soft);
  --tn-p1: var(--place-1);
  --tn-p2: var(--place-2);
  --tn-p3: var(--place-3);
  --tn-heat-hot: #c2410c;
  --tn-heat-warm: #b45309;
  --tn-heat-cool: #94a3b8;
  --tn-label-red: #ef4444;
  --tn-label-orange: #f97316;
  --tn-label-yellow: #eab308;
  --tn-label-green: #10b981;
  --tn-label-blue: #3b82f6;
  --tn-label-purple: #a855f7;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1016;
    --surface: #151922;
    --surface-sunken: #1c212b;
    --line: #262c37;
    --line-strong: #39414e;
    --ink: #e9ecf2;
    --ink-muted: #9ba4b4;
    --accent: #86a6ff;
    --accent-soft: #1b2646;
    --on-accent: #0d1016;
    --value: #5cd6a0;
    --value-soft: #10291e;
    --skrall: #f0b44c;
    --skrall-soft: #2c2210;
    --danger: #ff8b7e;
    --danger-soft: #2f1614;
    --place-1: #d9ab3e;
    --place-2: #aeb6c4;
    --place-3: #c98e5f;
    --on-place: #0d1016;
    --scrim: rgba(0, 0, 0, 0.6);
    --shadow-raised: 0 1px 2px rgba(0, 0, 0, 0.5);
    --shadow-sheet: 0 -8px 24px rgba(0, 0, 0, 0.55);
    --tn-heat-hot: #f97316;
    --tn-heat-warm: #fbbf24;
    --tn-heat-cool: #475569;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg: #0d1016;
  --surface: #151922;
  --surface-sunken: #1c212b;
  --line: #262c37;
  --line-strong: #39414e;
  --ink: #e9ecf2;
  --ink-muted: #9ba4b4;
  --accent: #86a6ff;
  --accent-soft: #1b2646;
  --on-accent: #0d1016;
  --value: #5cd6a0;
  --value-soft: #10291e;
  --skrall: #f0b44c;
  --skrall-soft: #2c2210;
  --danger: #ff8b7e;
  --danger-soft: #2f1614;
  --place-1: #d9ab3e;
  --place-2: #aeb6c4;
  --place-3: #c98e5f;
  --on-place: #0d1016;
  --scrim: rgba(0, 0, 0, 0.6);
  --shadow-raised: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-sheet: 0 -8px 24px rgba(0, 0, 0, 0.55);
  --tn-heat-hot: #f97316;
  --tn-heat-warm: #fbbf24;
  --tn-heat-cool: #475569;
  color-scheme: dark;
}
```

Change `@custom-variant dark (&:where(.dark, .dark *));` to `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`.

In the `body` rule replace the `font-family` line with `font-family: var(--font-sans);`. Replace the `.tn-eyebrow` rule with:

```css
.tn-eyebrow {
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 16px;
  color: var(--ink-muted);
  font-weight: 500;
}
```

In `.tn-last5 .r1`, `.r2` replace `color: #0a0e14;` and in `.r3` replace `color: #fff;` with `color: var(--on-place);`.

- [ ] **Step 6: Rewrite `components/ThemeProvider.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { effectiveTheme, parseStoredTheme, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const ThemeContext = createContext<{ theme: ThemeChoice; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readStored(): ThemeChoice | null {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next = effectiveTheme(readStored(), media.matches);
      setTheme(next);
      applyTheme(next);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: ThemeChoice = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // privat läge: valet gäller bara den här sidvisningen
      }
      applyTheme(next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
```

- [ ] **Step 7: Update `components/ThemeToggle.tsx`**

Replace `title={…}` with `aria-label={theme === "dark" ? "Byt till ljust tema" : "Byt till mörkt tema"}` and the `style` object with:

```tsx
      className="w-10 h-10 rounded-md flex items-center justify-center"
      style={{ background: "var(--surface-sunken)", color: "var(--ink)", border: 0, cursor: "pointer" }}
```

- [ ] **Step 8: Update `app/layout.tsx`**

Add `import { THEME_INIT_SCRIPT } from "@/lib/theme";`. Replace `themeColor: "#0a0e14",` with:

```ts
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1016" },
  ],
```

Change `<html lang="sv">` to `<html lang="sv" suppressHydrationWarning>` and add as the first child of `<head>`:

```tsx
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
```

- [ ] **Step 9: Verify build and full suite**

Run: `npx jest > .superpowers/t1.log 2>&1; tail -5 .superpowers/t1.log && npx tsc --noEmit && npm run lint`
Expected: all suites pass; tsc and lint exit 0.

Run: `npm run dev`, open http://localhost:3000 in light and dark OS mode. Expected: light ground `#f5f6f8` / dark `#0d1016`; no flash when `localStorage.theme="dark"` and OS is light.

- [ ] **Step 10: Commit**

```bash
git add app/globals.css app/layout.tsx lib/theme.ts lib/__tests__/theme.test.ts components/ThemeProvider.tsx components/ThemeToggle.tsx
git commit -m "Tema: nya tokens från designsystemet, alias för --tn-*, systemtema som standard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Formatfunktioner

**Files:**
- Create: `lib/format.ts`
- Test: `lib/__tests__/format.test.ts`

**Interfaces:**
- Produces: `fmtPct(v: number | null | undefined, d?: number): string`; `fmtNum(v: number | null | undefined, d?: number): string`; `fmtDelta(v: number): string`; `fmtKmTime(t: string | null | undefined): string`; `fmtKr(n: number | null | undefined): string`; `fmtOrdinal(n: number): string`; `fmtStartMethod(m: string | null | undefined): string`; `fmtGameDate(isoDate: string): string`; `fmtClock(iso: string | null | undefined): string`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/format.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/format.test.ts`
Expected: FAIL with "Cannot find module '../format'"

- [ ] **Step 3: Write `lib/format.ts`**

```ts
/** Formatering enligt designsystemet: decimalkomma, hårt mellanslag före %, äkta minus. */
const NB = " ";
const MINUS = "−";

export function fmtPct(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? "–" : v.toFixed(d).replace(".", ",") + NB + "%";
}

export function fmtNum(v: number | null | undefined, d = 1): string {
  return v == null || !Number.isFinite(v) ? "–" : v.toFixed(d).replace(".", ",");
}

/** Procentenheter: "+4,2", "−1,3", "±0". */
export function fmtDelta(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (Math.abs(r) < 0.05) return "±0";
  return (r > 0 ? "+" : MINUS) + Math.abs(r).toFixed(1).replace(".", ",");
}

/** "1:12,4" / "1.12,4" / "1:12.4" → "1.12,4" (som hos ATG). */
export function fmtKmTime(t: string | null | undefined): string {
  const s = (t ?? "").trim();
  if (!s) return "–";
  const m = s.match(/^(\d+)[:.](\d{2})[,.](\d)$/);
  return m ? `${m[1]}.${m[2]},${m[3]}` : s;
}

export function fmtKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const digits = String(Math.round(Math.abs(n)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  return (n < 0 ? MINUS : "") + grouped + NB + "kr";
}

/** 1 → "1:a", 3 → "3:e", 21 → "21:a", 11 → "11:e". */
export function fmtOrdinal(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const a = (last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12;
  return `${n}:${a ? "a" : "e"}`;
}

export function fmtStartMethod(m: string | null | undefined): string {
  if (m === "auto") return "Autostart";
  if (m === "volte") return "Voltstart";
  return "";
}

/** "2026-10-10" → "Lördag 10 oktober". */
export function fmtGameDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const s = d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ISO-tid → "16:20" i svensk tid. */
export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/format.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/__tests__/format.test.ts
git commit -m "Format: decimalkomma, procentenheter, km-tid och kronor enligt designsystemet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Ordlistan och manualens ordlista

**Files:**
- Create: `lib/glossary.ts`
- Modify: `MANUAL.md` (avsnitt "## 10. Ordlista" och innehållsförteckningen), `package.json` (beroenden)
- Test: `lib/__tests__/glossary.test.ts`

**Interfaces:**
- Consumes: `SKRALL_THRESHOLDS` (`lib/skrall.ts`), `EDGE_THRESHOLDS` (`lib/edge.ts`).
- Produces: `type TermId = "chans" | "streck" | "odds" | "varde" | "grund" | "cs" | "skrall" | "signal" | "oense" | "form" | "spar"`; `interface GlossaryEntry { title: string; what: string; how?: string; note?: string; anchor: string }`; `GLOSSARY: Record<TermId, GlossaryEntry>`; `isTermId(v: string): v is TermId`; `manualHref(id: TermId): string`.

- [ ] **Step 1: Install dependencies**

Run: `npm install react-markdown remark-gfm rehype-slug && npm install -D github-slugger`
Expected: package.json gets the four entries; `npm ls github-slugger` shows it.

- [ ] **Step 2: Write the failing test**

```ts
// lib/__tests__/glossary.test.ts
import fs from "fs";
import path from "path";
import GithubSlugger from "github-slugger";
import { GLOSSARY, isTermId, manualHref, type TermId } from "../glossary";
import { SKRALL_THRESHOLDS } from "../skrall";
import { EDGE_THRESHOLDS } from "../edge";

const NB = " ";

/** Rubrik-id som rehype-slug ger dem (samma algoritm som GitHub). */
function manualSlugs(): Set<string> {
  const md = fs.readFileSync(path.join(__dirname, "../../MANUAL.md"), "utf8");
  const slugger = new GithubSlugger();
  const out = new Set<string>();
  let inFence = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (m) out.add(slugger.slug(m[1]));
  }
  return out;
}

const IDS: TermId[] = ["chans", "streck", "odds", "varde", "grund", "cs", "skrall", "signal", "oense", "form", "spar"];

describe("GLOSSARY", () => {
  it("har titel och förklaring för varje term", () => {
    for (const id of IDS) {
      expect(GLOSSARY[id].title.length).toBeGreaterThan(0);
      expect(GLOSSARY[id].what.length).toBeGreaterThan(20);
    }
  });

  it("varje ankare finns som rubrik i MANUAL.md", () => {
    const slugs = manualSlugs();
    for (const id of IDS) expect({ id, ok: slugs.has(GLOSSARY[id].anchor) }).toEqual({ id, ok: true });
  });

  it("skrälltexten stämmer med trösklarna", () => {
    const how = GLOSSARY.skrall.how ?? "";
    expect(how).toContain(`${SKRALL_THRESHOLDS.maxStreck}${NB}%`);
    expect(how).toContain(`${SKRALL_THRESHOLDS.minEdge} procentenheter`);
    expect(how).toContain(`topp ${SKRALL_THRESHOLDS.maxClassRank}`);
  });

  it("signaltexten stämmer med trösklarna", () => {
    const text = `${GLOSSARY.signal.what} ${GLOSSARY.signal.how}`;
    expect(text).toContain(`+${EDGE_THRESHOLDS.minEdgeScore}`);
    expect(text).toContain(`${EDGE_THRESHOLDS.maxRestDays} dagar`);
  });

  it("isTermId och manualHref", () => {
    expect(isTermId("grund")).toBe(true);
    expect(isTermId("okänd")).toBe(false);
    expect(manualHref("varde")).toBe("/manual#värde");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest lib/__tests__/glossary.test.ts`
Expected: FAIL with "Cannot find module '../glossary'"

- [ ] **Step 4: Write `lib/glossary.ts`**

```ts
/**
 * Ordlistan — enda källan för förklaringar i appen. Samma texter står under
 * "## 10. Ordlista" i MANUAL.md; ändra båda samtidigt. `anchor` är rubrikens id.
 */
export type TermId = "chans" | "streck" | "odds" | "varde" | "grund" | "cs" | "skrall" | "signal" | "oense" | "form" | "spar";

export interface GlossaryEntry {
  title: string;
  what: string;
  how?: string;
  note?: string;
  anchor: string;
}

const NB = " ";

export const GLOSSARY: Record<TermId, GlossaryEntry> = {
  chans: {
    title: "Chans",
    what: `Hästens vinstchans enligt spelmarknaden. Alla hästar i loppet blir tillsammans 100${NB}%.`,
    how: "Hälften streck och hälften vinnarodds, omräknat till procent. Testat mot 221 lopp med facit: träffar bättre än streck eller odds var för sig.",
    anchor: "chans",
  },
  streck: {
    title: "Streck",
    what: `Hur stor del av V85-spelarnas insatser i avdelningen som ligger på hästen. 30${NB}% betyder att nästan var tredje krona är på den.`,
    anchor: "streck",
  },
  odds: {
    title: "Odds",
    what: "Vinnarodds från ATG:s vinnarspel. Odds 4,2 betyder att 1 kr blir 4,20 kr om hästen vinner. Lägre odds betyder större favorit.",
    anchor: "odds",
  },
  varde: {
    title: "Värde",
    what: "Chans minus streck, i procentenheter. Plus betyder att hästen vinner oftare än strecket säger, så en rätt rad delar potten med färre.",
    how: "Grön markering när värdet är plus och CS är över 55.",
    note: "Minus är inget fel, bara en häst som många andra också har spelat.",
    anchor: "värde",
  },
  grund: {
    title: "Grund",
    what: "Vinstchans räknad bara på hästens egna meriter: km-tider, form, spår, distans, skor, kusk och tränare. Odds och streck används inte.",
    how: "Statistisk modell tränad på ett år av svenska V-lopp, 33 faktorer.",
    note: "En andra åsikt, ingen spelsignal. När Grund och streck är oense har strecket oftast haft rätt.",
    anchor: "grund",
  },
  cs: {
    title: "CS",
    what: "Rankning av fältet från 0 till 100. Högst CS står överst när du sorterar på CS.",
    how: `Streck 55${NB}%, distansrekord 20${NB}%, odds 10${NB}%, jämnhet 10${NB}% och form 5${NB}%.`,
    anchor: "cs",
  },
  skrall: {
    title: "Skräll",
    what: "Lågt streckad häst där vinnaroddsen tror mer på hästen än V85-spelarna gör, och som har hög klass.",
    how: `Streck under 15${NB}%, oddschansen minst 5 procentenheter över strecket och topp 3 i loppet på pengar per start.`,
    note: `På ett års lopp har skrällkandidaterna vunnit 16${NB}% av gångerna, mot 9${NB}% som strecket sa.`,
    anchor: "skräll",
  },
  signal: {
    title: "Signal",
    what: "Tecken som inte syns i odds och streck: barfota-byte, toppkusk och stigande form ger plus. Skor på, sjunkande form och uppehåll över 60 dagar ger minus.",
    how: "Märket visas när summan är +2 eller mer.",
    anchor: "signal",
  },
  oense: {
    title: "Oense",
    what: "Grund och streck skiljer sig kraftigt åt för hästen.",
    note: "Historiskt har strecket oftast haft rätt i de fallen. Se det som en anledning att titta närmare, inte som ett tips.",
    anchor: "oense",
  },
  form: {
    title: "Senaste 5",
    what: "Placeringarna i hästens fem senaste starter, nyast till vänster.",
    how: "0 = oplacerad, g = galopp, d = diskvalificerad. Guld, silver och brons är 1:a, 2:a och 3:e plats.",
    anchor: "senaste-5",
  },
  spar: {
    title: "Spår",
    what: "Hästens startspår. På vissa banor ger vissa spår en fördel eller nackdel, och det räknas in i bedömningen.",
    anchor: "spår",
  },
};

export function isTermId(v: string): v is TermId {
  return Object.prototype.hasOwnProperty.call(GLOSSARY, v);
}

export function manualHref(id: TermId): string {
  return `/manual#${GLOSSARY[id].anchor}`;
}
```

- [ ] **Step 5: Rewrite the glossary section of `MANUAL.md`**

Replace everything from `## 10. Ordlista` down to (not including) the final `---` line with:

```markdown
## 10. Ordlista

Måtten i appen. Samma texter visas när du trycker på ett understruket ord i appen.

### Chans

Hästens vinstchans enligt spelmarknaden. Alla hästar i loppet blir tillsammans 100 %. Hälften streck och hälften vinnarodds, omräknat till procent. Testat mot 221 lopp med facit: träffar bättre än streck eller odds var för sig.

### Streck

Hur stor del av V85-spelarnas insatser i avdelningen som ligger på hästen. 30 % betyder att nästan var tredje krona är på den.

### Odds

Vinnarodds från ATG:s vinnarspel. Odds 4,2 betyder att 1 kr blir 4,20 kr om hästen vinner. Lägre odds betyder större favorit.

### Värde

Chans minus streck, i procentenheter. Plus betyder att hästen vinner oftare än strecket säger, så en rätt rad delar potten med färre. Grön markering när värdet är plus och CS är över 55. Minus är inget fel, bara en häst som många andra också har spelat.

### Grund

Vinstchans räknad bara på hästens egna meriter: km-tider, form, spår, distans, skor, kusk och tränare. Odds och streck används inte. Statistisk modell tränad på ett år av svenska V-lopp, 33 faktorer. En andra åsikt, ingen spelsignal. När Grund och streck är oense har strecket oftast haft rätt.

### CS

Rankning av fältet från 0 till 100: streck 55 %, distansrekord 20 %, odds 10 %, jämnhet 10 % och form 5 %.

### Skräll

Lågt streckad häst där vinnaroddsen tror mer på hästen än V85-spelarna gör, och som har hög klass: streck under 15 %, oddschansen minst 5 procentenheter över strecket och topp 3 i loppet på pengar per start. På ett års lopp har skrällkandidaterna vunnit 16 % av gångerna, mot 9 % som strecket sa.

### Signal

Tecken som inte syns i odds och streck: barfota-byte, toppkusk och stigande form ger plus. Skor på, sjunkande form och uppehåll över 60 dagar ger minus. Märket visas när summan är +2 eller mer.

### Oense

Grund och streck skiljer sig kraftigt åt för hästen. Historiskt har strecket oftast haft rätt i de fallen. Se det som en anledning att titta närmare, inte som ett tips.

### Senaste 5

Placeringarna i hästens fem senaste starter, nyast till vänster. 0 = oplacerad, g = galopp, d = diskvalificerad. Guld, silver och brons är 1:a, 2:a och 3:e plats.

### Spår

Hästens startspår. På vissa banor ger vissa spår en fördel eller nackdel, och det räknas in i bedömningen.

### Övriga ord

| Ord | Förklaring |
|-----|-----------|
| **V85** | Spelform på ATG där du ska pricka vinnaren i 8 lopp |
| **ATG** | AB Trav och Galopp – den svenska speloperatören för travsport |
| **Spik** | En avdelning där du bara har med en häst |
| **Autostart** | Hästarna startar bakom startbilen, som kör ifrån dem vid startlinjen |
| **Voltstart** | Hästarna startar från startbanden, och hästar med tillägg startar längre bak |
| **Barfota** | Hästen tävlar utan skor — att skorna dras inför loppet är en klassisk formsignal |
| **Klass** | Intjänade kronor per start – ett mått på vilken nivå hästen tävlat på |
| **Sällskap** | En grupp spelare som delar anteckningar, system och diskuterar i ett gemensamt forum |
| **Inbjudningskod** | Unik kod för att gå med i ett sällskap |
| **PWA** | Appen kan installeras på din telefon som en vanlig app |
```

In the table of contents at the top, keep `10. [Ordlista](#10-ordlista)`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest lib/__tests__/glossary.test.ts`
Expected: PASS (5 tests). If the anchor test fails, print `manualSlugs()` and fix the `anchor` value — never the heading text.

- [ ] **Step 7: Commit**

```bash
git add lib/glossary.ts lib/__tests__/glossary.test.ts MANUAL.md package.json package-lock.json
git commit -m "Ordlista: en källa för förklaringarna, samma texter i manualen

Rättar även Autostart/Voltstart som var omkastade i manualen.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Grundkomponenter och stilark

**Files:**
- Create: `app/ui.css`, `components/ui/cx.ts`, `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/StartNumber.tsx`, `components/ui/ValueDelta.tsx`, `components/ui/FormStrip.tsx`, `components/ui/Metric.tsx`, `components/ui/SegmentedControl.tsx`, `components/ui/index.ts`
- Modify: `app/globals.css` (import), `jest.config.js` (testMatch för `.tsx`)
- Test: `lib/__tests__/ui.basic.test.tsx`

**Interfaces:**
- Consumes: `fmtDelta` (Task 2).
- Produces (all from `@/components/ui`):
  - `Button(props: ButtonHTMLAttributes & { variant?: "primary" | "secondary" | "quiet"; size?: "md" | "sm" })`
  - `Badge({ tone?: "neutral" | "skrall" | "signal" | "value"; children })`
  - `type NumberState = "idle" | "selected" | "p1" | "p2" | "p3" | "finished"`; `StartNumber({ number: number; state?: NumberState; onClick?: (e) => void; label?: string })`
  - `ValueDelta({ delta: number; highlight?: boolean })`
  - `FormStrip({ results: string[] })`
  - `Metric({ label: ReactNode; value: ReactNode; sub?: ReactNode; size?: "md" | "lg"; align?: "start" | "end" })`
  - `SegmentedControl<T extends string>({ value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string })`
  - CSS-klasser i `app/ui.css`: `ta-btn*`, `ta-badge*`, `ta-num*`, `ta-delta*`, `ta-form*`, `ta-metric*`, `ta-seg*`, `ta-chip`, `ta-card`, `ta-banner`, `ta-error`, `ta-section-title`, `ta-field`, `ta-table`, `ta-sheet*`, `ta-backdrop`, `ta-term`, `ta-list*`, `ta-row*`, `ta-assess*`, `ta-tabs`, `ta-tab*`, `ta-nav*`, `ta-prose`.

- [ ] **Step 1: Make Jest pick up `.tsx` tests**

`jest.config.js` already uses `preset: "ts-jest"`, whose default `testMatch` includes `.tsx`, and `tsconfig.json` has `"jsx": "react-jsx"`. Verify:

Run: `npx jest --listTests | grep -c test`
Expected: the current number of test files (no change needed). If a `.tsx` test later reports "Cannot use JSX", add to `jest.config.js`: `transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] }`.

- [ ] **Step 2: Write the failing test**

```tsx
// lib/__tests__/ui.basic.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { Badge, Button, FormStrip, Metric, SegmentedControl, StartNumber, ValueDelta } from "@/components/ui";

describe("StartNumber", () => {
  it("är en knapp med aria-pressed när den går att trycka på", () => {
    const out = html(<StartNumber number={7} state="selected" onClick={() => {}} />);
    expect(out).toContain("<button");
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain("Ta bort nr 7 från systemet");
    expect(out).toContain("ta-num-selected");
  });
  it("är ett span utan onClick", () => {
    const out = html(<StartNumber number={3} state="p1" label="Nr 3, vann" />);
    expect(out).not.toContain("<button");
    expect(out).toContain("ta-num-p1");
    expect(out).toContain('aria-label="Nr 3, vann"');
  });
});

describe("ValueDelta", () => {
  it("grön bara med highlight", () => {
    expect(html(<ValueDelta delta={4.18} highlight />)).toContain("ta-delta-hl");
    expect(html(<ValueDelta delta={4.18} />)).toContain("ta-delta-plain");
    expect(html(<ValueDelta delta={-1.3} />)).toContain("−1,3");
  });
});

describe("FormStrip", () => {
  it("klassar placeringar och läser upp dem", () => {
    const out = html(<FormStrip results={["1", "2", "3", "5g", "d"]} />);
    expect(out).toContain("ta-form-p1");
    expect(out).toContain("ta-form-p2");
    expect(out).toContain("ta-form-p3");
    expect(out).toContain("ta-form-dq");
    expect(out).toContain("Senaste placeringar: 1, 2, 3, 5 galopp, diskad");
  });
  it("visar högst fem och tomt läge", () => {
    expect(html(<FormStrip results={["1", "2", "3", "4", "5", "6"]} />).match(/ta-form-cell/g)).toHaveLength(5);
    expect(html(<FormStrip results={[]} />)).toContain("Inga starter");
  });
});

describe("Badge, Button, Metric, SegmentedControl", () => {
  it("renderar rätt klasser", () => {
    expect(html(<Badge tone="skrall">Skräll</Badge>)).toContain("ta-badge-skrall");
    expect(html(<Button variant="primary">Spara system</Button>)).toContain("ta-btn-primary");
    expect(html(<Button>Spara</Button>)).toContain('type="button"');
    expect(html(<Metric label="Chans" value="24,1 %" size="lg" />)).toContain("ta-metric-lg");
  });
  it("SegmentedControl markerar valt alternativ", () => {
    const out = html(
      <SegmentedControl label="Visning" value="tabell" onChange={() => {}}
        options={[{ value: "lista", label: "Lista" }, { value: "tabell", label: "Tabell" }]} />
    );
    expect(out).toContain('aria-label="Visning"');
    expect(out).toMatch(/aria-pressed="true"[^>]*>Tabell/);
    expect(out).toMatch(/aria-pressed="false"[^>]*>Lista/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest lib/__tests__/ui.basic.test.tsx`
Expected: FAIL with "Cannot find module '@/components/ui'"

- [ ] **Step 4: Write `app/ui.css`**

```css
/* Travappen grundkomponenter — porterat från designsystemets bundle.css. */

.ta-btn:focus-visible, .ta-num:focus-visible, .ta-term:focus-visible, .ta-tab:focus-visible,
.ta-nav-item:focus-visible, .ta-row:focus-visible, .ta-link:focus-visible, .ta-chip:focus-visible,
.ta-seg button:focus-visible, .ta-sheet:focus-visible {
  outline: 2px solid var(--focus); outline-offset: 2px;
}

/* Button */
.ta-btn { font: 500 14px/20px var(--font-sans); height: 40px; padding: 0 var(--space-4); border-radius: var(--radius-md);
  border: 0; background: var(--surface-sunken); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center;
  justify-content: center; gap: var(--space-2); white-space: nowrap; }
.ta-btn-primary { background: var(--accent); color: var(--on-accent); }
.ta-btn-quiet { background: transparent; color: var(--accent); padding: 0 var(--space-2); }
.ta-btn-sm { height: 32px; padding: 0 var(--space-3); font-size: 13px; }
.ta-btn:disabled { opacity: .5; cursor: default; }

/* Chip — knapparna i verktygsraden */
.ta-chip { height: 32px; padding: 0 var(--space-3); border: 0; border-radius: var(--radius-md); background: var(--surface-sunken);
  color: var(--ink); font: 500 13px/18px var(--font-sans); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; cursor: pointer; }
.ta-chip[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }

/* SegmentedControl */
.ta-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: var(--radius-md); background: var(--surface-sunken); }
.ta-seg button { height: 28px; padding: 0 var(--space-3); border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  font: 500 13px/18px var(--font-sans); color: var(--ink-muted); }
.ta-seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-raised); }

/* Badge */
.ta-badge { display: inline-flex; align-items: center; height: 22px; padding: 0 var(--space-2); border-radius: var(--radius-sm);
  font: 600 12px/16px var(--font-sans); background: var(--surface-sunken); color: var(--ink-muted); white-space: nowrap; }
.ta-badge-skrall { background: var(--skrall-soft); color: var(--skrall); }
.ta-badge-value { background: var(--value-soft); color: var(--value); }
.ta-badge-signal { background: var(--surface-sunken); color: var(--ink); }

/* StartNumber */
.ta-num { width: 36px; height: 36px; flex: none; border-radius: var(--radius-md); display: grid; place-items: center; border: 0; padding: 0;
  font: 600 15px/1 var(--font-sans); font-variant-numeric: tabular-nums; background: var(--surface-sunken); color: var(--ink); }
button.ta-num { cursor: pointer; }
.ta-num-selected { background: var(--accent); color: var(--on-accent); }
.ta-num-p1 { background: var(--place-1); color: var(--on-place); }
.ta-num-p2 { background: var(--place-2); color: var(--on-place); }
.ta-num-p3 { background: var(--place-3); color: var(--on-place); }
.ta-num-finished { color: var(--ink-muted); }

/* ValueDelta */
.ta-delta { font: 600 13px/18px var(--font-sans); font-variant-numeric: tabular-nums; border-radius: var(--radius-sm); white-space: nowrap; }
.ta-delta-hl { background: var(--value-soft); color: var(--value); padding: 1px 6px; }
.ta-delta-plain { color: var(--ink-muted); font-weight: 500; }

/* Term */
.ta-term { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: help;
  text-decoration: underline dotted var(--ink-muted); text-decoration-thickness: 1px; text-underline-offset: 3px; }

/* Sheet / ExplainSheet */
.ta-backdrop { position: fixed; inset: 0; background: var(--scrim); display: flex; align-items: flex-end; justify-content: center; z-index: 70; }
.ta-sheet { background: var(--surface); color: var(--ink); width: min(100%, 480px); max-height: 88vh; overflow-y: auto;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0; box-shadow: var(--shadow-sheet);
  padding: var(--space-3) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px)); text-align: left; }
.ta-sheet-wide { width: min(100%, 640px); }
.ta-sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--line-strong); margin: 0 auto var(--space-4); }
.ta-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.ta-sheet-title { font: 600 18px/24px var(--font-sans); margin: 0; }
.ta-sheet-sub { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); margin: var(--space-4) 0 var(--space-1); }
.ta-sheet-text { font: 400 15px/22px var(--font-sans); margin: 0; max-width: 60ch; }
.ta-sheet-note { font: 400 14px/20px var(--font-sans); margin: var(--space-4) 0 0; padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-sunken); }
.ta-sheet-actions { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-top: var(--space-5); }
@media (min-width: 768px) {
  .ta-backdrop { align-items: center; padding: var(--space-6); }
  .ta-sheet { border-radius: var(--radius-lg); padding-bottom: var(--space-6); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2); }
  .ta-sheet-handle { display: none; }
}
.ta-link { color: var(--accent); font: 500 14px/20px var(--font-sans); text-decoration: none; }
.ta-link:hover { text-decoration: underline; }

/* Metric */
.ta-metric { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ta-metric-end { align-items: flex-end; text-align: right; }
.ta-metric-label { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); }
.ta-metric-value { font: 600 15px/20px var(--font-sans); font-variant-numeric: tabular-nums; color: var(--ink); }
.ta-metric-lg .ta-metric-value { font-size: 20px; line-height: 24px; }
.ta-metric-sub { font: 400 12px/16px var(--font-sans); color: var(--ink-muted); font-variant-numeric: tabular-nums; }

/* FormStrip */
.ta-form { display: inline-flex; gap: 3px; align-items: center; }
.ta-form-cell { min-width: 22px; height: 22px; padding: 0 3px; box-sizing: border-box; border-radius: 5px; display: grid; place-items: center;
  font: 600 12px/1 var(--font-sans); font-variant-numeric: tabular-nums; background: var(--surface-sunken); color: var(--ink-muted); }
.ta-form-p1 { background: var(--place-1); color: var(--on-place); }
.ta-form-p2 { background: var(--place-2); color: var(--on-place); }
.ta-form-p3 { background: var(--place-3); color: var(--on-place); }
.ta-form-dq { background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); }
.ta-form-empty { font: 400 12px/16px var(--font-sans); color: var(--ink-muted); }

/* Kort, rutor och fält */
.ta-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); }
.ta-section-title { margin: 0; font: 600 18px/24px var(--font-sans); color: var(--ink); }
.ta-banner { font: 400 13px/18px var(--font-sans); padding: var(--space-3); border-radius: var(--radius-md); background: var(--skrall-soft); color: var(--skrall); }
.ta-error { font: 400 13px/18px var(--font-sans); padding: var(--space-3); border-radius: var(--radius-md); background: var(--danger-soft); color: var(--danger); }
.ta-field { height: 44px; padding: 0 var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--line); background: var(--surface);
  color: var(--ink); font: 400 15px/22px var(--font-sans); width: 100%; box-sizing: border-box; }
.ta-field-label { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); }

/* HorseList / HorseRow */
.ta-list { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
.ta-list-head { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) var(--space-4);
  background: var(--surface-sunken); font: 500 12px/16px var(--font-sans); color: var(--ink-muted); }
.ta-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-3); align-items: start;
  padding: var(--space-3) var(--space-4); background: var(--surface); cursor: pointer; }
.ta-row + .ta-row { border-top: 1px solid var(--line); }
.ta-row-scratched { opacity: .55; }
.ta-row-main { min-width: 0; }
.ta-row-name { font: 600 16px/22px var(--font-sans); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ta-row-driver { font: 400 13px/18px var(--font-sans); color: var(--ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ta-row-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-top: 6px; }
.ta-row-notes { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); }
.ta-row-side { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.ta-row-chans { display: flex; align-items: center; gap: var(--space-2); }
.ta-row-chans .ta-delta-hl { font-size: 12px; }
.ta-row-chans-val { font: 600 20px/24px var(--font-sans); font-variant-numeric: tabular-nums; }
.ta-row-sub { display: flex; flex-direction: column; align-items: flex-end; font: 500 12px/16px var(--font-sans); color: var(--ink-muted);
  font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Assessment */
.ta-assess { margin: 0; }
.ta-assess-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: var(--space-3); row-gap: 2px; padding: var(--space-3) 0; }
.ta-assess-row + .ta-assess-row { border-top: 1px solid var(--line); }
.ta-assess-label { font: 500 14px/20px var(--font-sans); color: var(--ink); }
.ta-assess-value { margin: 0; font: 600 15px/20px var(--font-sans); font-variant-numeric: tabular-nums; text-align: right; }
.ta-assess-note { grid-column: 1 / -1; margin: 0; font: 400 13px/18px var(--font-sans); color: var(--ink-muted); }

/* RaceTabs */
.ta-tabs { display: flex; gap: var(--space-1); padding: var(--space-1); background: var(--surface-sunken); border-radius: var(--radius-md); overflow-x: auto; }
.ta-tab { flex: 1 0 40px; height: 44px; border: 0; border-radius: 8px; background: transparent; color: var(--ink-muted); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--font-sans); }
.ta-tab-n { font: 600 15px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.ta-tab-picks { font: 500 12px/14px var(--font-sans); color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.ta-tab[aria-selected="true"] { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-raised); }
.ta-tab[aria-selected="true"] .ta-tab-picks { color: var(--accent); }
.ta-tab-done .ta-tab-n { text-decoration: underline; text-decoration-color: var(--place-1); text-decoration-thickness: 2px; text-underline-offset: 3px; }

/* Tabell */
.ta-table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.ta-table th { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); background: var(--surface-sunken); padding: 8px 10px; text-align: right; white-space: nowrap; }
.ta-table td { padding: 8px 10px; text-align: right; white-space: nowrap; border-top: 1px solid var(--line); font: 500 14px/20px var(--font-sans); color: var(--ink); }
.ta-table .ta-left { text-align: left; }
.ta-table .ta-stick { position: sticky; left: 0; z-index: 1; text-align: left; }
.ta-table td.ta-stick { background: var(--surface); }
.ta-table .ta-strong { font-weight: 600; font-size: 15px; }
.ta-table .ta-muted { color: var(--ink-muted); }

/* BottomNav */
.ta-nav { display: flex; background: var(--surface); border-top: 1px solid var(--line); padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)); }
.ta-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) 0 6px;
  color: var(--ink-muted); font: 500 12px/16px var(--font-sans); text-decoration: none; }
.ta-nav-active { color: var(--accent); }
.ta-nav-icon { position: relative; display: grid; place-items: center; }
.ta-nav-count { position: absolute; top: -4px; right: -10px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--accent); color: var(--on-accent); font: 600 12px/18px var(--font-sans); text-align: center; }

/* Manualen */
.ta-prose { font: 400 16px/26px var(--font-sans); color: var(--ink); }
.ta-prose h1 { font: 400 32px/38px var(--font-display); margin: 0 0 var(--space-6); }
.ta-prose h2 { font: 600 22px/28px var(--font-sans); margin: var(--space-8) 0 var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--line); scroll-margin-top: 80px; }
.ta-prose h3 { font: 600 18px/24px var(--font-sans); margin: var(--space-6) 0 var(--space-2); scroll-margin-top: 80px; }
.ta-prose h4 { font: 600 16px/22px var(--font-sans); margin: var(--space-4) 0 var(--space-2); scroll-margin-top: 80px; }
.ta-prose p, .ta-prose ul, .ta-prose ol { margin: 0 0 var(--space-3); max-width: 68ch; }
.ta-prose ul, .ta-prose ol { padding-left: var(--space-6); }
.ta-prose a { color: var(--accent); }
.ta-prose code { font-size: 14px; background: var(--surface-sunken); padding: 1px 4px; border-radius: 4px; }
.ta-prose table { border-collapse: collapse; margin: 0 0 var(--space-4); font-size: 14px; line-height: 20px; display: block; overflow-x: auto; }
.ta-prose th, .ta-prose td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
.ta-prose th { background: var(--surface-sunken); font-weight: 600; }
.ta-prose blockquote { margin: 0 0 var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-sunken); }
.ta-prose hr { border: 0; border-top: 1px solid var(--line); margin: var(--space-6) 0; }
```

Add as the second line of `app/globals.css` (directly after `@import "tailwindcss";`):

```css
@import "./ui.css";
```

- [ ] **Step 5: Write the components**

```ts
// components/ui/cx.ts
export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");
```

```tsx
// components/ui/Button.tsx
import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: "md" | "sm";
}

/** Knappen för handlingar. Etiketten säger exakt vad som händer. Primary högst en per vy. */
export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} {...rest} className={cx("ta-btn", `ta-btn-${variant}`, size === "sm" && "ta-btn-sm", className)} />;
}
```

```tsx
// components/ui/Badge.tsx
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "skrall" | "signal" | "value";

/** Märke med ett eller två ord. Högst ett per häst på hästraden. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ta-badge ta-badge-${tone}`}>{children}</span>;
}
```

```tsx
// components/ui/StartNumber.tsx
import type { MouseEvent } from "react";

export type NumberState = "idle" | "selected" | "p1" | "p2" | "p3" | "finished";

/** Startnumret som block. Med onClick är det knappen som lägger hästen i systemet. */
export function StartNumber({ number, state = "idle", onClick, label }: {
  number: number;
  state?: NumberState;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  label?: string;
}) {
  const cls = `ta-num ta-num-${state}`;
  if (onClick) {
    const aria = label ?? (state === "selected" ? `Ta bort nr ${number} från systemet` : `Lägg nr ${number} i systemet`);
    return (
      <button type="button" className={cls} onClick={onClick} aria-pressed={state === "selected"} aria-label={aria}>
        {number}
      </button>
    );
  }
  return <span className={cls} aria-label={label}>{number}</span>;
}
```

```tsx
// components/ui/ValueDelta.tsx
import { fmtDelta } from "@/lib/format";

/** Chans minus streck i procentenheter. Grön bara när hästen uppfyller värderegeln. */
export function ValueDelta({ delta, highlight = false }: { delta: number; highlight?: boolean }) {
  return <span className={`ta-delta ${highlight ? "ta-delta-hl" : "ta-delta-plain"}`}>{fmtDelta(delta)}</span>;
}
```

```tsx
// components/ui/FormStrip.tsx
function cellClass(r: string): string {
  if (r === "1") return "ta-form-p1";
  if (r === "2") return "ta-form-p2";
  if (r === "3") return "ta-form-p3";
  if (r === "d") return "ta-form-dq";
  return "";
}

function spoken(r: string): string {
  if (r === "d") return "diskad";
  if (r.endsWith("g")) return `${r.slice(0, -1)} galopp`;
  return r || "okänd";
}

/** De fem senaste placeringarna i ATG-notation, nyast till vänster. */
export function FormStrip({ results }: { results: string[] }) {
  const items = results.slice(0, 5);
  return (
    <span className="ta-form" role="img" aria-label={`Senaste placeringar: ${items.map(spoken).join(", ") || "inga starter"}`}>
      {items.length === 0 && <span className="ta-form-empty">Inga starter</span>}
      {items.map((r, i) => (
        <span key={i} className={`ta-form-cell ${cellClass(r)}`}>{r || "–"}</span>
      ))}
    </span>
  );
}
```

```tsx
// components/ui/Metric.tsx
import type { ReactNode } from "react";
import { cx } from "./cx";

/** Ett mått: etikett, värde och undertext. Etiketten kan vara en <Term>. */
export function Metric({ label, value, sub, size = "md", align = "start" }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; size?: "md" | "lg"; align?: "start" | "end";
}) {
  return (
    <div className={cx("ta-metric", `ta-metric-${size}`, align === "end" && "ta-metric-end")}>
      <span className="ta-metric-label">{label}</span>
      <span className="ta-metric-value">{value}</span>
      {sub && <span className="ta-metric-sub">{sub}</span>}
    </div>
  );
}
```

```tsx
// components/ui/SegmentedControl.tsx
"use client";

/** Växel mellan två eller tre lägen, t.ex. Lista och Tabell. */
export function SegmentedControl<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="ta-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

```ts
// components/ui/index.ts
export { Button } from "./Button";
export { Badge, type BadgeTone } from "./Badge";
export { StartNumber, type NumberState } from "./StartNumber";
export { ValueDelta } from "./ValueDelta";
export { FormStrip } from "./FormStrip";
export { Metric } from "./Metric";
export { SegmentedControl } from "./SegmentedControl";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest lib/__tests__/ui.basic.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/ui.css app/globals.css components/ui lib/__tests__/ui.basic.test.tsx
git commit -m "UI: grundkomponenter (knapp, märke, startnummer, värde, form, mått, växel)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sheet, Term och förklaringsblad

**Files:**
- Create: `components/ui/Sheet.tsx`, `components/ui/Term.tsx`
- Modify: `components/ui/index.ts`
- Test: `lib/__tests__/ui.term.test.tsx`

**Interfaces:**
- Consumes: `GLOSSARY`, `TermId`, `isTermId`, `manualHref` (Task 3); `Button` (Task 4).
- Produces:
  - `Sheet({ open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean })` — portal till `document.body`, Esc och klick utanför stänger, fokus till bladet och tillbaka, låser sidans scroll.
  - `ExplainSheet({ term: TermId; open: boolean; onClose: () => void })`
  - `Term({ term: string; children?: ReactNode })` — okänt id ger bara texten (och `console.warn` i utvecklingsläge).
  - `ExplainBody({ term: TermId })` — bladets innehåll utan ram (testbart).

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/ui.term.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { ExplainBody, Sheet, Term } from "@/components/ui";

describe("Term", () => {
  it("är en knapp med prickad understrykning för känd term", () => {
    const out = html(<Term term="grund">Grund</Term>);
    expect(out).toContain('class="ta-term"');
    expect(out).toContain('aria-haspopup="dialog"');
    expect(out).toContain(">Grund<");
  });
  it("använder ordlistans titel utan children", () => {
    expect(html(<Term term="varde" />)).toContain(">Värde<");
  });
  it("okänd term blir bara text", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const out = html(<Term term="okänd">Okänd</Term>);
    expect(out).toBe("Okänd");
    warn.mockRestore();
  });
});

describe("ExplainBody", () => {
  it("visar vad, hur, not och manuallänk", () => {
    const out = html(<ExplainBody term="skrall" />);
    expect(out).toContain("Lågt streckad häst");
    expect(out).toContain("Så räknas det");
    expect(out).toContain("ta-sheet-note");
    expect(out).toContain('href="/manual#skräll"');
  });
});

describe("Sheet", () => {
  it("renderar inget när det är stängt", () => {
    expect(html(<Sheet open={false} onClose={() => {}} title="Filter"><p>x</p></Sheet>)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/ui.term.test.tsx`
Expected: FAIL with "ExplainBody is not exported" / import error

- [ ] **Step 3: Write `components/ui/Sheet.tsx`**

```tsx
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

/**
 * Blad nerifrån på mobil, dialog i mitten från md och uppåt. Renderas i en
 * portal så att sticky-huvuden med backdrop-filter inte klipper det.
 */
export function Sheet({ open, onClose, title, children, footer, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="ta-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("ta-sheet", wide && "ta-sheet-wide")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ta-sheet-handle" aria-hidden="true" />
        <div className="ta-sheet-head">
          <h2 className="ta-sheet-title" id={titleId}>{title}</h2>
        </div>
        {children}
        {footer && <div className="ta-sheet-actions">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Write `components/ui/Term.tsx`**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { GLOSSARY, isTermId, manualHref, type TermId } from "@/lib/glossary";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

/** Förklaringsbladets innehåll — texten kommer alltid från ordlistan. */
export function ExplainBody({ term }: { term: TermId }) {
  const g = GLOSSARY[term];
  return (
    <>
      <p className="ta-sheet-text">{g.what}</p>
      {g.how && (
        <>
          <h3 className="ta-sheet-sub">Så räknas det</h3>
          <p className="ta-sheet-text">{g.how}</p>
        </>
      )}
      {g.note && <p className="ta-sheet-note">{g.note}</p>}
      <p style={{ margin: "var(--space-4) 0 0" }}>
        <a className="ta-link" href={manualHref(term)}>Läs mer i manualen</a>
      </p>
    </>
  );
}

export function ExplainSheet({ term, open, onClose }: { term: TermId; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={GLOSSARY[term].title} footer={<span />}>
      <ExplainBody term={term} />
      <div className="ta-sheet-actions">
        <span />
        <Button onClick={onClose}>Stäng</Button>
      </div>
    </Sheet>
  );
}

/** Ett ord som går att trycka på för att få förklaringen från ordlistan. */
export function Term({ term, children }: { term: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!isTermId(term)) {
    if (process.env.NODE_ENV !== "production") console.warn(`Okänd term: ${term}`);
    return <>{children ?? term}</>;
  }
  return (
    <>
      <button
        type="button"
        className="ta-term"
        aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {children ?? GLOSSARY[term].title}
      </button>
      <ExplainSheet term={term} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Ruling-hint: `ExplainSheet` passes `footer={<span />}` only to keep the Sheet's layout; remove the `footer` prop if the extra empty actions row shows up visually — the "Stäng" row inside the children is the real footer.

- [ ] **Step 5: Export from `components/ui/index.ts`**

Append:

```ts
export { Sheet } from "./Sheet";
export { Term, ExplainSheet, ExplainBody } from "./Term";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest lib/__tests__/ui.term.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/ui lib/__tests__/ui.term.test.tsx
git commit -m "UI: blad och förklaringsord som läser från ordlistan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Navigering

**Files:**
- Modify: `components/BottomNav.tsx` (helt), `components/TopNav.tsx`, `components/NavActiveLink.tsx`, `components/groups/SallskapOverview.tsx`
- Create: `lib/nav.ts`
- Test: `lib/__tests__/nav.test.tsx`

**Interfaces:**
- Produces: `NAV_ITEMS: { id: "lopp" | "system" | "utvardering" | "sallskap"; label: string; href: string }[]`; `isActivePath(pathname: string, href: string): boolean`; `BottomNav({ isAdmin?: boolean; sallskapBadge?: number })` (samma props som i dag).

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/nav.test.tsx
jest.mock("next/navigation", () => ({ usePathname: () => "/evaluation" }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { renderToStaticMarkup as html } from "react-dom/server";
import { BottomNav } from "@/components/BottomNav";
import { NAV_ITEMS, isActivePath } from "../nav";

describe("NAV_ITEMS", () => {
  it("har fyra flikar med samma namn som i specen", () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.href])).toEqual([
      ["Lopp", "/"], ["System", "/system"], ["Utvärdering", "/evaluation"], ["Sällskap", "/sallskap"],
    ]);
  });
});

describe("isActivePath", () => {
  it("startsidan bara exakt, övriga med prefix", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/system", "/")).toBe(false);
    expect(isActivePath("/sallskap/abc", "/sallskap")).toBe(true);
  });
});

describe("BottomNav", () => {
  it("markerar aktiv sida och visar räknare", () => {
    const out = html(<BottomNav sallskapBadge={3} />);
    expect(out).toMatch(/aria-current="page"[^>]*>[\s\S]*Utvärdering/);
    expect(out).toContain("3 nya händelser i dina sällskap");
    expect(out).not.toContain("Admin");
  });
  it("visar Admin för administratörer", () => {
    expect(html(<BottomNav isAdmin />)).toContain("Admin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/nav.test.tsx`
Expected: FAIL with "Cannot find module '../nav'"

- [ ] **Step 3: Write `lib/nav.ts`**

```ts
/** Huvudmenyn — samma fyra namn på mobil och dator. Manualen nås från "?". */
export const NAV_ITEMS = [
  { id: "lopp", label: "Lopp", href: "/" },
  { id: "system", label: "System", href: "/system" },
  { id: "utvardering", label: "Utvärdering", href: "/evaluation" },
  { id: "sallskap", label: "Sällskap", href: "/sallskap" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 4: Rewrite `components/BottomNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV_ITEMS, isActivePath, type NavId } from "@/lib/nav";

const ICONS: Record<NavId | "admin", ReactNode> = {
  lopp: <path d="M4 18c0-4 3.5-7 8-7s8 3 8 7M4 18h16M12 11V5m0 0 4 2-4 2" />,
  system: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  utvardering: <path d="M5 19V11M12 19V5M19 19v-6M3 19h18" />,
  sallskap: (
    <>
      <circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.5" />
      <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15 14.6c2.6-.3 4.8 1.1 5.4 4.4" />
    </>
  ),
  admin: <><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></>,
};

function Icon({ id }: { id: NavId | "admin" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}

export function BottomNav({ isAdmin = false, sallskapBadge = 0 }: {
  isAdmin?: boolean;
  /** Antal osedda händelser i användarens sällskap */
  sallskapBadge?: number;
}) {
  const pathname = usePathname() ?? "/";
  const items: { id: NavId | "admin"; label: string; href: string }[] = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ id: "admin" as const, label: "Admin", href: "/admin" }] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="ta-nav" aria-label="Huvudmeny">
        {items.map((it) => {
          const active = isActivePath(pathname, it.href);
          const count = it.id === "sallskap" ? sallskapBadge : 0;
          return (
            <Link key={it.href} href={it.href} className={`ta-nav-item${active ? " ta-nav-active" : ""}`}
              aria-current={active ? "page" : undefined}>
              <span className="ta-nav-icon">
                <Icon id={it.id} />
                {count > 0 && (
                  <span className="ta-nav-count" aria-label={`${count} nya händelser i dina sällskap`}>
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 5: Update `components/NavActiveLink.tsx` and `components/TopNav.tsx`**

`NavActiveLink.tsx` — replace the `Link` element with:

```tsx
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="h-9 px-3 rounded-md inline-flex items-center text-sm font-medium"
      style={isActive ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--ink-muted)" }}
    >
      {label}
    </Link>
```

and replace its `isActive` computation with `const isActive = isActivePath(pathname ?? "/", href);` (import from `@/lib/nav`).

`TopNav.tsx`:
- Replace the `tabs` constant with `import { NAV_ITEMS } from "@/lib/nav";` and map `NAV_ITEMS` instead of `tabs`.
- Replace the `<nav … style={…}>` opening attributes with `className="hidden md:flex items-center gap-6 sticky top-0 z-50 px-8 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }} aria-label="Huvudmeny"`.
- Replace the brand `<div>` with `<span style={{ font: "italic 400 26px/30px var(--font-display)", color: "var(--ink)" }}>Travappen</span>`.
- Wrap the nav links in `<div className="flex gap-1">…</div>`.
- Before `<ThemeToggle />` insert:

```tsx
        <Link href="/manual" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9" /><path d="M12 17.2v.1" />
          </svg>
          Manual
        </Link>
```

(add `import Link from "next/link";`).

- [ ] **Step 6: Add the theme switch to the Sällskap page**

In `components/groups/SallskapOverview.tsx`, before the `<section>` that holds `<NotificationToggle />`, insert:

```tsx
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Utseende</p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Ljust eller mörkt tema. Utan eget val följer appen telefonen.</p>
        </div>
        <ThemeToggle />
      </section>
```

and add `import { ThemeToggle } from "@/components/ThemeToggle";`.

- [ ] **Step 7: Run tests, lint and types**

Run: `npx jest lib/__tests__/nav.test.tsx && npx tsc --noEmit && npm run lint`
Expected: PASS; tsc and lint exit 0.

- [ ] **Step 8: Commit**

```bash
git add lib/nav.ts lib/__tests__/nav.test.tsx components/BottomNav.tsx components/TopNav.tsx components/NavActiveLink.tsx components/groups/SallskapOverview.tsx
git commit -m "Navigering: Lopp, System, Utvärdering, Sällskap — manualen via ?

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Manualsidan visar MANUAL.md

**Files:**
- Modify: `app/(authenticated)/manual/page.tsx` (ersätts helt)
- Modify: `MANUAL.md` (avsnitt 4–6 om menyn och temat), `CLAUDE.md`
- Test: `lib/__tests__/manual.test.tsx`

**Interfaces:**
- Consumes: `react-markdown`, `remark-gfm`, `rehype-slug` (Task 3).
- Produces: `ManualContent({ markdown: string })` i `components/ManualContent.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/manual.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { ManualContent } from "@/components/ManualContent";

describe("ManualContent", () => {
  it("ger rubriker id som ordlistans ankare och renderar tabeller", () => {
    const out = html(<ManualContent markdown={"## 10. Ordlista\n\n### Värde\n\nText.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n"} />);
    expect(out).toContain('id="värde"');
    expect(out).toContain('id="10-ordlista"');
    expect(out).toContain("<table>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/manual.test.tsx`
Expected: FAIL with "Cannot find module '@/components/ManualContent'". If Jest instead fails with "SyntaxError: Unexpected token 'export'" from `react-markdown` (ESM-only), add to `jest.config.js`:

```js
  transformIgnorePatterns: ["/node_modules/(?!(react-markdown|remark-.*|rehype-.*|unified|bail|is-plain-obj|trough|vfile.*|unist-.*|mdast-.*|micromark.*|decode-named-character-reference|character-entities.*|property-information|hast-.*|space-separated-tokens|comma-separated-tokens|zwitch|longest-streak|markdown-table|ccount|escape-string-regexp|html-url-attributes|devlop|estree-util-.*|github-slugger|trim-lines|stringify-entities|character-reference-invalid|is-.*|parse-entities)/)"],
  transform: { "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", allowJs: true } }] },
```

and re-run; record the change as a ruling.

- [ ] **Step 3: Write `components/ManualContent.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/** Renderar MANUAL.md. Rubrikerna får samma id som på GitHub (ordlistans ankare). */
export function ManualContent({ markdown }: { markdown: string }) {
  return (
    <div className="ta-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: Replace `app/(authenticated)/manual/page.tsx`**

```tsx
import fs from "fs";
import path from "path";
import { ManualContent } from "@/components/ManualContent";

// Byggs vid deploy — MANUAL.md läses en gång, inte vid varje besök
export const dynamic = "force-static";

export default function ManualPage() {
  const markdown = fs.readFileSync(path.join(process.cwd(), "MANUAL.md"), "utf8");
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ManualContent markdown={markdown} />
      </div>
    </main>
  );
}
```

MANUAL.md already has its own table of contents, so the page renders it as-is instead of generating one (ruling against spec §9 "innehållsförteckning från rubrikerna på nivå 2" — the file's TOC is the same list).

- [ ] **Step 5: Update `MANUAL.md` for menu and theme**

In the introduction (section 1) replace the product name "V85 Analys" with "Travappen" and add after the first paragraph:

```markdown
Menyn har fyra delar: **Lopp** (omgången och hästarna), **System** (dina sparade system), **Utvärdering** (hur träffsäkra måtten har varit) och **Sällskap** (dina sällskap, din profil och utseendet). Manualen når du från **?** högst upp, och varje understruket ord i appen går att trycka på för en kort förklaring.

Appen följer telefonens ljusa eller mörka läge. Under **Sällskap → Utseende** kan du välja själv.
```

Replace the footer line `*Manual version 3.0 – V85 Analys*` with `*Manual version 4.0 – Travappen*`.

- [ ] **Step 6: Update `CLAUDE.md`**

- In "Katalogstruktur" under `components/` add `ui/                      # Grundkomponenter från designsystemet (Button, Badge, StartNumber, Term, Sheet …)` and `ManualContent.tsx         # Renderar MANUAL.md på /manual`; under `lib/` add `format.ts`, `glossary.ts`, `theme.ts`, `nav.ts` with one-line descriptions.
- Change `BottomNav.tsx  # Mobil-nav: Analys | Utvärdering | Manual` to `BottomNav.tsx  # Mobil-nav: Lopp | System | Utvärdering | Sällskap (+ Admin)`.
- Under "Konventioner" add:
  - `- **Designsystem:** tokens och komponenter kommer från designsystemet i Claude Design (https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz). Nya komponenter använder tokens som \`--ink\`, \`--surface\`, \`--accent\` — aldrig \`--tn-*\` (alias för gamla sidor).`
  - `- **Förklaringar:** alla mått förklaras med \`<Term term="…">\` från \`lib/glossary.ts\`. Ändra texten där och under "Ordlista" i MANUAL.md samtidigt. Inga \`title=\`-tooltips.`
- Change "Teman: mörkt/ljust via ThemeProvider + ThemeToggle (localStorage)" to "Teman: följer systemet; eget val (ljust/mörkt) sparas i localStorage via ThemeToggle under Sällskap → Utseende och i TopNav."

- [ ] **Step 7: Run tests and build**

Run: `npx jest > .superpowers/t7.log 2>&1; tail -5 .superpowers/t7.log && npx tsc --noEmit && npm run lint && npm run build > .superpowers/t7-build.log 2>&1; tail -15 .superpowers/t7-build.log`
Expected: all suites pass; build lists `/manual` as static (○).

- [ ] **Step 8: Commit**

```bash
git add components/ManualContent.tsx "app/(authenticated)/manual/page.tsx" lib/__tests__/manual.test.tsx MANUAL.md CLAUDE.md jest.config.js
git commit -m "Manual: sidan visar MANUAL.md med ordlistans ankare

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: PR 1 checkpoint**

Stop and ask the user: "Del 1 (grund) är klar och testad. Ska jag pusha och öppna PR?" Push/PR only on yes:
`git push -u origin claude/designgrund-k4p9vx` and `gh pr create --title "Designgrund del 1: tokens, tema, komponenter, navigering och manual" --body "<sammanfattning + testplan>\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"`.

---

## Del 2 – Loppvyn (PR 2)

### Task 8: Loppvyns logik

**Files:**
- Create: `lib/raceTypes.ts`, `lib/raceView.ts`, `lib/prefs.ts`
- Test: `lib/__tests__/raceView.test.ts`, `lib/__tests__/prefs.test.ts`

**Interfaces:**
- Consumes: `computeWinProbabilities` (`lib/probability`), `computeSkrallMap` (`lib/skrall`), `computeEdgeMap` (`lib/edge`), `computeFundamentalMapForRows`, `scratchedMask`, `isDisagreement` (`lib/fundamental`), `SystemSelection` (`lib/types`).
- Produces:
  - `lib/raceTypes.ts`: `interface Starter` and `interface Race` (moved verbatim from `components/RaceList.tsx`, exported).
  - `lib/raceView.ts`:
    - `type SortKey = "chans" | "streck" | "odds" | "grund" | "cs" | "number"`; `SORT_LABELS: Record<SortKey, string>`; `SORT_KEYS: SortKey[]`
    - `interface Filters { value: boolean; skrall: boolean; signal: boolean; hideLongshots: boolean; search: string }`; `EMPTY_FILTERS: Filters`; `activeFilterCount(f: Filters): number`
    - `type RowBadge = "skrall" | "signal" | "scratched" | null`
    - `interface RowModel { starter: Starter; n: number; name: string; driver: string; chansPct: number | null; chansRank: number | null; streckPct: number | null; odds: number | null; valueDelta: number | null; isValue: boolean; grundPct: number | null; grundRank: number | null; cs: number | null; csRank: number | null; disagree: boolean; badge: RowBadge; edgeScore: number; isEdge: boolean; form: string[]; scratched: boolean; numberState: NumberState; selectable: boolean }`
    - `interface RaceMaps { prob: Record<number, WinProbability>; skrall: Record<number, SkrallSignal>; edge: Record<number, EdgeResult>; fundamental: Record<number, FundamentalResult>; scratched: Set<number> }`
    - `computeRaceMaps(race: Race): RaceMaps`
    - `buildRowModels(race: Race, maps: RaceMaps, selected: Set<number>): RowModel[]`
    - `sortRows(rows: RowModel[], key: SortKey): RowModel[]`; `filterRows(rows: RowModel[], f: Filters): RowModel[]`
    - `raceHasResults(race: Pick<Race, "starters">): boolean`; `raceLacksMarket(rows: RowModel[]): boolean`
    - `raceTabsInfo(races: Race[], selections: SystemSelection[]): { n: number; done: boolean; picks: number }[]`
    - `parseHastParam(v: string | null, races: Pick<Race, "race_number" | "starters">[]): { race: number; start: number } | null`
  - `lib/prefs.ts`: `readPref<T extends string>(key: string, allowed: readonly T[], fallback: T, storage?: Pick<Storage, "getItem">): T`; `writePref(key: string, value: string, storage?: Pick<Storage, "setItem">): void`.
  - `NumberState` is imported from `@/components/ui` (Task 4).

- [ ] **Step 1: Move the types**

Create `lib/raceTypes.ts` with the `LifeRecord`, `Starter` and `Race` interfaces copied from `components/RaceList.tsx:15-85`, each prefixed with `export`, and `import type { HorseStart } from "./atg";` at the top. In `components/RaceList.tsx` delete those interfaces and add `import type { Race, Starter } from "@/lib/raceTypes";`.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Write the failing tests**

```ts
// lib/__tests__/prefs.test.ts
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
```

```ts
// lib/__tests__/raceView.test.ts
import type { Race, Starter } from "../raceTypes";
import {
  activeFilterCount, buildRowModels, EMPTY_FILTERS, filterRows, parseHastParam, raceHasResults,
  raceLacksMarket, raceTabsInfo, sortRows, type RaceMaps,
} from "../raceView";

function starter(n: number, o: Partial<Starter> = {}): Starter {
  return {
    id: `s${n}`, start_number: n, post_position: n, horse_id: `h${n}`, driver: `Kusk ${n}`, driver_win_pct: null,
    trainer: `Tränare ${n}`, trainer_win_pct: null, odds: 10, p_odds: null, bet_distribution: 10,
    shoes_reported: null, shoes_front: null, shoes_back: null, shoes_front_changed: null, shoes_back_changed: null,
    sulky_type: null, horse_age: null, horse_sex: null, horse_color: null, pedigree_father: null, home_track: null,
    starts_total: 10, wins_total: 1, places_2nd: 1, places_3rd: 1, earnings_total: 100000,
    starts_current_year: null, wins_current_year: null, places_2nd_current_year: null, places_3rd_current_year: null,
    starts_prev_year: null, wins_prev_year: null, places_2nd_prev_year: null, places_3rd_prev_year: null,
    best_time: null, last_5_results: [], life_records: null, formscore: 50, finish_position: null, finish_time: null,
    horses: { name: `Häst ${n}` }, ...o,
  } as Starter;
}

function race(starters: Starter[], o: Partial<Race> = {}): Race {
  return { id: "V85_2026-10-10_1_3", race_number: 3, race_name: null, distance: 2140, start_method: "auto",
    start_time: "2026-10-10T14:45:00Z", starters, ...o } as Race;
}

/** Kartor för hand så att testerna inte beror på modellerna. */
function maps(o: Partial<RaceMaps> = {}): RaceMaps {
  return { prob: {}, skrall: {}, edge: {}, fundamental: {}, scratched: new Set(), ...o };
}
const prob = (p: number) => ({ p, streckProb: null, oddsProb: null, source: "blend" as const });

describe("buildRowModels", () => {
  it("räknar chans, värde och rang", () => {
    const r = race([starter(1, { bet_distribution: 20, formscore: 70 }), starter(2, { bet_distribution: 40, formscore: 60 })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(0.3), 2: prob(0.7) } }), new Set());
    expect(rows[0].chansPct).toBeCloseTo(30);
    expect(rows[0].valueDelta).toBeCloseTo(10);
    expect(rows[0].isValue).toBe(true);
    expect(rows[0].chansRank).toBe(2);
    expect(rows[1].chansRank).toBe(1);
    expect(rows[1].isValue).toBe(true);
  });

  it("värde kräver CS över 55", () => {
    const r = race([starter(1, { bet_distribution: 20, formscore: 55 })]);
    expect(buildRowModels(r, maps({ prob: { 1: prob(0.3) } }), new Set())[0].isValue).toBe(false);
  });

  it("skräll vinner över signal, struken över båda", () => {
    const r = race([starter(1), starter(2), starter(3)]);
    const rows = buildRowModels(r, maps({
      prob: { 1: prob(0.5), 2: prob(0.5) },
      skrall: { 1: { isCandidate: true, oddsProbPct: 20, edge: 10, classRank: 1 }, 2: { isCandidate: false, oddsProbPct: 10, edge: 0, classRank: 2 } },
      edge: { 1: { signals: [], score: 3, isEdge: true }, 2: { signals: [], score: 2, isEdge: true } },
      scratched: new Set([3]),
    }), new Set());
    expect(rows.map((x) => x.badge)).toEqual(["skrall", "signal", "scratched"]);
  });

  it("före pooler: ingen chans, inget värde, saknad marknad", () => {
    const r = race([starter(1, { odds: null, bet_distribution: null }), starter(2, { odds: null, bet_distribution: null })]);
    const rows = buildRowModels(r, maps({ prob: { 1: { ...prob(0.5), source: "uniform" }, 2: { ...prob(0.5), source: "uniform" } } }), new Set());
    expect(rows.every((x) => x.chansPct === null && !x.isValue)).toBe(true);
    expect(raceLacksMarket(rows)).toBe(true);
  });

  it("struken häst i utkast: viloläge och går inte att välja", () => {
    const r = race([starter(1), starter(2, { odds: 0 })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(1) }, scratched: new Set([2]) }), new Set([1, 2]));
    expect(rows[0].numberState).toBe("selected");
    expect(rows[1]).toMatchObject({ numberState: "idle", selectable: false, chansPct: null, scratched: true });
  });

  it("efter resultat visar numret placeringen och går inte att välja", () => {
    const r = race([starter(1, { finish_position: 1 }), starter(2, { finish_position: 3 }), starter(3, { finish_position: null })]);
    const rows = buildRowModels(r, maps({ prob: { 1: prob(0.4), 2: prob(0.3), 3: prob(0.3) } }), new Set([3]));
    expect(rows.map((x) => x.numberState)).toEqual(["p1", "p3", "finished"]);
    expect(rows.every((x) => !x.selectable)).toBe(true);
    expect(raceHasResults(r)).toBe(true);
  });

  it("formen är placeringarna", () => {
    const r = race([starter(1, { last_5_results: [{ place: "1", date: "", track: "", time: "", post_position: null }, { place: "5g", date: "", track: "", time: "", post_position: null }] })]);
    expect(buildRowModels(r, maps({ prob: { 1: prob(1) } }), new Set())[0].form).toEqual(["1", "5g"]);
  });
});

describe("sortRows och filterRows", () => {
  const r = race([
    starter(1, { odds: 2, bet_distribution: 40, formscore: 80 }),
    starter(2, { odds: 8, bet_distribution: 10, formscore: 40 }),
    starter(3, { odds: null, bet_distribution: 5, formscore: 60, driver: "Ella Lindqvist" }),
    starter(4, { odds: 0 }),
  ]);
  const rows = buildRowModels(r, maps({
    prob: { 1: prob(0.5), 2: prob(0.3), 3: prob(0.2) },
    scratched: new Set([4]),
    fundamental: { 1: { start_number: 1, p: 0.2, contributions: [] }, 2: { start_number: 2, p: 0.5, contributions: [] }, 3: { start_number: 3, p: 0.3, contributions: [] } },
    edge: { 2: { signals: [], score: 2, isEdge: true } },
  }), new Set());

  it("varje nyckel, saknade värden och strukna sist", () => {
    expect(sortRows(rows, "chans").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "streck").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "odds").map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(sortRows(rows, "grund").map((x) => x.n)).toEqual([2, 3, 1, 4]);
    expect(sortRows(rows, "cs").map((x) => x.n)).toEqual([1, 3, 2, 4]);
    expect(sortRows(rows, "number").map((x) => x.n)).toEqual([1, 2, 3, 4]);
  });

  it("filter var för sig och tillsammans", () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, signal: true }).map((x) => x.n)).toEqual([2]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, hideLongshots: true }).map((x) => x.n)).toEqual([1, 2, 3, 4]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: "lindq" }).map((x) => x.n)).toEqual([3]);
    expect(filterRows(rows, { ...EMPTY_FILTERS, search: "häst 2", signal: true }).map((x) => x.n)).toEqual([2]);
    expect(activeFilterCount({ ...EMPTY_FILTERS, value: true, search: "  " })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_FILTERS, skrall: true, search: "x" })).toBe(2);
  });

  it("dölj långskott tar bort odds över 50", () => {
    const r2 = race([starter(1, { odds: 51 }), starter(2, { odds: 50 })]);
    const rows2 = buildRowModels(r2, maps({ prob: { 1: prob(0.5), 2: prob(0.5) } }), new Set());
    expect(filterRows(rows2, { ...EMPTY_FILTERS, hideLongshots: true }).map((x) => x.n)).toEqual([2]);
  });
});

describe("raceTabsInfo", () => {
  it("antal valda och resultat klart", () => {
    const races = [race([starter(1, { finish_position: 1 })], { race_number: 1 }), race([starter(1)], { race_number: 2 })];
    expect(raceTabsInfo(races, [{ race_number: 2, horses: [{ horse_id: "a", start_number: 1, horse_name: "A" }, { horse_id: "b", start_number: 2, horse_name: "B" }] }]))
      .toEqual([{ n: 1, done: true, picks: 0 }, { n: 2, done: false, picks: 2 }]);
  });
});

describe("parseHastParam", () => {
  const races = [race([starter(1), starter(2)], { race_number: 3 })];
  it("giltig länk", () => {
    expect(parseHastParam("3-2", races)).toEqual({ race: 3, start: 2 });
  });
  it("trasiga länkar ignoreras", () => {
    for (const v of [null, "", "x", "3-", "-2", "9-2", "3-99", "3-2-1", "3.5-2"]) expect(parseHastParam(v, races)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest lib/__tests__/raceView.test.ts lib/__tests__/prefs.test.ts`
Expected: FAIL with "Cannot find module '../raceView'" and "'../prefs'"

- [ ] **Step 4: Write `lib/prefs.ts`**

```ts
/** Små inställningar per enhet (vy, sortering). Tål att localStorage saknas eller kastar. */
export function readPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage: Pick<Storage, "getItem"> | undefined = typeof window !== "undefined" ? window.localStorage : undefined
): T {
  try {
    const v = storage?.getItem(key);
    return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(
  key: string,
  value: string,
  storage: Pick<Storage, "setItem"> | undefined = typeof window !== "undefined" ? window.localStorage : undefined
): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // privat läge eller full lagring — inställningen gäller bara nu
  }
}
```

- [ ] **Step 5: Write `lib/raceView.ts`**

```ts
import { computeWinProbabilities, type WinProbability } from "./probability";
import { computeSkrallMap, type SkrallSignal } from "./skrall";
import { computeEdgeMap, type EdgeResult } from "./edge";
import { computeFundamentalMapForRows, isDisagreement, scratchedMask, type FundamentalResult } from "./fundamental";
import type { Race, Starter } from "./raceTypes";
import type { SystemSelection } from "./types";
import type { NumberState } from "@/components/ui/StartNumber";

export type SortKey = "chans" | "streck" | "odds" | "grund" | "cs" | "number";
export const SORT_KEYS: SortKey[] = ["chans", "streck", "odds", "grund", "cs", "number"];
export const SORT_LABELS: Record<SortKey, string> = {
  chans: "Chans", streck: "Streck", odds: "Odds", grund: "Grund", cs: "CS", number: "Startnummer",
};

export interface Filters { value: boolean; skrall: boolean; signal: boolean; hideLongshots: boolean; search: string }
export const EMPTY_FILTERS: Filters = { value: false, skrall: false, signal: false, hideLongshots: false, search: "" };

export function activeFilterCount(f: Filters): number {
  return [f.value, f.skrall, f.signal, f.hideLongshots, f.search.trim().length > 0].filter(Boolean).length;
}

export type RowBadge = "skrall" | "signal" | "scratched" | null;

export interface RowModel {
  starter: Starter;
  n: number;
  name: string;
  driver: string;
  chansPct: number | null;
  chansRank: number | null;
  streckPct: number | null;
  odds: number | null;
  valueDelta: number | null;
  isValue: boolean;
  grundPct: number | null;
  grundRank: number | null;
  cs: number | null;
  csRank: number | null;
  disagree: boolean;
  badge: RowBadge;
  edgeScore: number;
  isEdge: boolean;
  form: string[];
  scratched: boolean;
  numberState: NumberState;
  selectable: boolean;
}

export interface RaceMaps {
  prob: Record<number, WinProbability>;
  skrall: Record<number, SkrallSignal>;
  edge: Record<number, EdgeResult>;
  fundamental: Record<number, FundamentalResult>;
  scratched: Set<number>;
}

/** Alla fältrelativa mått för en avdelning. Strukna hästar får ingen chans. */
export function computeRaceMaps(race: Race): RaceMaps {
  const mask = scratchedMask(race.starters);
  const scratched = new Set(race.starters.filter((_, i) => mask[i]).map((s) => s.start_number));
  const active = race.starters.filter((s) => !scratched.has(s.start_number));
  const probs = computeWinProbabilities(active);
  const raceDate = race.start_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return {
    prob: Object.fromEntries(active.map((s, i) => [s.start_number, probs[i]])),
    skrall: computeSkrallMap(race.starters),
    edge: computeEdgeMap(race.starters, race.start_time),
    fundamental: computeFundamentalMapForRows(race, raceDate, race.starters),
    scratched,
  };
}

export function raceHasResults(race: Pick<Race, "starters">): boolean {
  return race.starters.some((s) => s.finish_position != null);
}

/** Rang 1 = högst. null-värden får ingen rang. */
function ranks(values: Map<number, number | null>): Map<number, number> {
  const sorted = [...values.entries()].filter((e): e is [number, number] => e[1] != null).sort((a, b) => b[1] - a[1]);
  return new Map(sorted.map(([n], i) => [n, i + 1]));
}

function finishState(pos: number | null): NumberState {
  if (pos === 1) return "p1";
  if (pos === 2) return "p2";
  if (pos === 3) return "p3";
  return "finished";
}

export function buildRowModels(race: Race, maps: RaceMaps, selected: Set<number>): RowModel[] {
  const results = raceHasResults(race);
  const chans = new Map<number, number | null>();
  const grund = new Map<number, number | null>();
  const cs = new Map<number, number | null>();
  for (const s of race.starters) {
    const p = maps.prob[s.start_number];
    const scratched = maps.scratched.has(s.start_number);
    chans.set(s.start_number, !scratched && p && p.source !== "uniform" ? p.p * 100 : null);
    const g = maps.fundamental[s.start_number]?.p;
    grund.set(s.start_number, !scratched && g != null ? g * 100 : null);
    cs.set(s.start_number, scratched ? null : s.formscore);
  }
  const chansRanks = ranks(chans);
  const grundRanks = ranks(grund);
  const csRanks = ranks(cs);

  return race.starters.map((s) => {
    const n = s.start_number;
    const scratched = maps.scratched.has(n);
    const chansPct = chans.get(n) ?? null;
    const streckPct = s.bet_distribution != null && s.bet_distribution > 0 ? s.bet_distribution : null;
    const valueDelta = chansPct != null && streckPct != null ? chansPct - streckPct : null;
    const isValue = !scratched && (s.formscore ?? 0) > 55 && streckPct != null && chansPct != null && chansPct > streckPct;
    const edge = maps.edge[n];
    const isEdge = !scratched && (edge?.isEdge ?? false);
    const badge: RowBadge = scratched ? "scratched" : maps.skrall[n]?.isCandidate ? "skrall" : isEdge ? "signal" : null;
    const grundPct = grund.get(n) ?? null;
    const numberState: NumberState = results
      ? finishState(s.finish_position)
      : !scratched && selected.has(n) ? "selected" : "idle";
    return {
      starter: s,
      n,
      name: s.horses?.name ?? "–",
      driver: s.driver,
      chansPct,
      chansRank: chansRanks.get(n) ?? null,
      streckPct,
      odds: s.odds != null && s.odds > 0 ? s.odds : null,
      valueDelta,
      isValue,
      grundPct,
      grundRank: grundRanks.get(n) ?? null,
      cs: cs.get(n) ?? null,
      csRank: csRanks.get(n) ?? null,
      disagree: !scratched && isDisagreement(grundPct != null ? grundPct / 100 : null, streckPct),
      badge,
      edgeScore: edge?.score ?? 0,
      isEdge,
      form: (s.last_5_results ?? []).map((r) => r.place),
      scratched,
      numberState,
      selectable: !results && !scratched,
    };
  });
}

export function raceLacksMarket(rows: RowModel[]): boolean {
  return rows.length > 0 && rows.every((r) => r.scratched || r.chansPct == null);
}

const desc = (a: number | null, b: number | null) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : b - a);
const asc = (a: number | null, b: number | null) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a - b);

export function sortRows(rows: RowModel[], key: SortKey): RowModel[] {
  const cmp: Record<SortKey, (a: RowModel, b: RowModel) => number> = {
    chans: (a, b) => desc(a.chansPct, b.chansPct),
    streck: (a, b) => desc(a.streckPct, b.streckPct),
    odds: (a, b) => asc(a.odds, b.odds),
    grund: (a, b) => desc(a.grundPct, b.grundPct),
    cs: (a, b) => desc(a.cs, b.cs),
    number: (a, b) => a.n - b.n,
  };
  return [...rows].sort((a, b) => Number(a.scratched) - Number(b.scratched) || cmp[key](a, b) || a.n - b.n);
}

export function filterRows(rows: RowModel[], f: Filters): RowModel[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) =>
    (!f.value || r.isValue) &&
    (!f.skrall || r.badge === "skrall") &&
    (!f.signal || r.isEdge) &&
    (!f.hideLongshots || r.odds == null || r.odds <= 50) &&
    (!q || r.name.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || r.starter.trainer.toLowerCase().includes(q))
  );
}

export function raceTabsInfo(races: Race[], selections: SystemSelection[]): { n: number; done: boolean; picks: number }[] {
  return races.map((r) => ({
    n: r.race_number,
    done: raceHasResults(r),
    picks: selections.find((s) => s.race_number === r.race_number)?.horses.length ?? 0,
  }));
}

/** "?hast=3-2" → avdelning 3, startnummer 2. Allt annat → null. */
export function parseHastParam(
  v: string | null,
  races: Pick<Race, "race_number" | "starters">[]
): { race: number; start: number } | null {
  const m = (v ?? "").match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const race = Number(m[1]);
  const start = Number(m[2]);
  const r = races.find((x) => x.race_number === race);
  return r && r.starters.some((s) => s.start_number === start) ? { race, start } : null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest lib/__tests__/raceView.test.ts lib/__tests__/prefs.test.ts`
Expected: PASS. In the "sortRows" test the scratched starter 4 has `odds: 0` → `odds: null` in the row; it sorts last in every key because `scratched` is compared first.

- [ ] **Step 7: Commit**

```bash
git add lib/raceTypes.ts lib/raceView.ts lib/prefs.ts lib/__tests__/raceView.test.ts lib/__tests__/prefs.test.ts components/RaceList.tsx
git commit -m "Loppvy: rena funktioner för rader, sortering, filter och länkar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Hästrad, flikar och bedömning

**Files:**
- Create: `components/ui/HorseRow.tsx`, `components/ui/RaceTabs.tsx`, `components/ui/Assessment.tsx`
- Modify: `components/ui/index.ts`
- Test: `lib/__tests__/ui.race.test.tsx`

**Interfaces:**
- Consumes: `StartNumber`, `FormStrip`, `Badge`, `ValueDelta`, `Term` (Task 4–5); `fmtPct`, `fmtNum` (Task 2); `RowBadge` (Task 8).
- Produces:
  - `HorseList({ children: ReactNode; sortLabel?: string })`
  - `HorseRow({ number: number; name: string; driver: string; chans: number | null; streck: number | null; odds: number | null; form: string[]; badge?: RowBadge; signalScore?: number; valueDelta?: number | null; isValue?: boolean; state?: NumberState; onToggleSystem?: () => void; onOpen?: () => void; noteCount?: number; dimmed?: boolean })`
  - `RaceTabs({ races: { n: number; done?: boolean; picks?: number }[]; active: number; onSelect: (n: number) => void })`
  - `Assessment({ rows: { key: string; label: ReactNode; value: ReactNode; note?: ReactNode }[] })`

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/ui.race.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { Assessment, HorseList, HorseRow, RaceTabs } from "@/components/ui";

const base = { number: 2, name: "Hail Ruler", driver: "Ella Lindqvist", chans: 18.6, streck: 12.1, odds: 5.1, form: ["2", "4"] };

describe("HorseRow", () => {
  it("visar chans, streck och odds", () => {
    const out = html(<HorseRow {...base} />);
    expect(out).toContain("18,6 %");
    expect(out).toContain("Streck 12,1 %");
    expect(out).toContain("Odds 5,1");
    expect(out).not.toContain("ta-delta");
  });
  it("grönt värde bara när hästen är värde", () => {
    expect(html(<HorseRow {...base} isValue valueDelta={6.5} />)).toContain("ta-delta-hl");
    expect(html(<HorseRow {...base} valueDelta={6.5} />)).not.toContain("ta-delta");
  });
  it("högst ett märke", () => {
    expect(html(<HorseRow {...base} badge="skrall" />).match(/ta-badge/g)).toHaveLength(1);
    expect(html(<HorseRow {...base} badge="signal" signalScore={3} />)).toContain("Signal +3");
    expect(html(<HorseRow {...base} badge="scratched" dimmed />)).toContain("Struken");
    expect(html(<HorseRow {...base} badge="scratched" dimmed />)).toContain("ta-row-scratched");
  });
  it("saknade värden blir tankstreck", () => {
    const out = html(<HorseRow {...base} chans={null} streck={null} odds={null} />);
    expect(out).toContain(">–<");
    expect(out).not.toContain("Streck ");
  });
  it("raden går att öppna med tangentbordet när onOpen finns", () => {
    const out = html(<HorseRow {...base} onOpen={() => {}} />);
    expect(out).toContain('role="button"');
    expect(out).toContain('tabindex="0"');
    expect(out).toContain('aria-label="Öppna Hail Ruler"');
  });
});

describe("HorseList", () => {
  it("har förklarbara kolumnrubriker", () => {
    const out = html(<HorseList><span /></HorseList>);
    expect(out.match(/ta-term/g)).toHaveLength(3);
  });
});

describe("RaceTabs", () => {
  it("valda och resultat klart", () => {
    const out = html(<RaceTabs active={2} onSelect={() => {}} races={[{ n: 1, done: true, picks: 3 }, { n: 2 }]} />);
    expect(out).toContain("Avdelning 1, resultat klart, 3 valda");
    expect(out).toMatch(/aria-selected="true"[^>]*aria-label="Avdelning 2"/);
  });
});

describe("Assessment", () => {
  it("rader med not", () => {
    const out = html(<Assessment rows={[{ key: "chans", label: "Chans", value: "18,6 %", note: "Näst störst chans." }]} />);
    expect(out).toContain("ta-assess-note");
    expect(out).toContain("<dl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/ui.race.test.tsx`
Expected: FAIL with "HorseRow is not exported"

- [ ] **Step 3: Write the components**

```tsx
// components/ui/HorseRow.tsx
"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { fmtNum, fmtPct } from "@/lib/format";
import type { RowBadge } from "@/lib/raceView";
import { Badge } from "./Badge";
import { FormStrip } from "./FormStrip";
import { StartNumber, type NumberState } from "./StartNumber";
import { Term } from "./Term";
import { ValueDelta } from "./ValueDelta";
import { cx } from "./cx";

export function HorseList({ children, sortLabel = "Chans" }: { children: ReactNode; sortLabel?: string }) {
  return (
    <div className="ta-list">
      <div className="ta-list-head">
        <span>Häst</span>
        <span>
          <Term term="chans">{sortLabel === "Chans" ? "Chans" : `Chans (sorterat på ${sortLabel.toLowerCase()})`}</Term>
          {" · "}<Term term="streck">Streck</Term>{" · "}<Term term="odds">Odds</Term>
        </span>
      </div>
      {children}
    </div>
  );
}

export function HorseRow({
  number, name, driver, chans, streck, odds, form, badge = null, signalScore = 0, valueDelta = null, isValue = false,
  state = "idle", onToggleSystem, onOpen, noteCount = 0, dimmed = false,
}: {
  number: number; name: string; driver: string;
  chans: number | null; streck: number | null; odds: number | null; form: string[];
  badge?: RowBadge; signalScore?: number; valueDelta?: number | null; isValue?: boolean;
  state?: NumberState; onToggleSystem?: () => void; onOpen?: () => void; noteCount?: number; dimmed?: boolean;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
  };
  return (
    <div
      className={cx("ta-row", dimmed && "ta-row-scratched")}
      onClick={onOpen}
      onKeyDown={onKey}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Öppna ${name}` : undefined}
      data-start={number}
    >
      <StartNumber
        number={number}
        state={state}
        onClick={onToggleSystem ? (e) => { e.stopPropagation(); onToggleSystem(); } : undefined}
      />
      <div className="ta-row-main">
        <div className="ta-row-name">{name}</div>
        <div className="ta-row-driver">{driver}</div>
        <div className="ta-row-meta">
          <FormStrip results={form} />
          {badge === "skrall" && <Badge tone="skrall">Skräll</Badge>}
          {badge === "signal" && <Badge tone="signal">{`Signal +${signalScore}`}</Badge>}
          {badge === "scratched" && <Badge>Struken</Badge>}
          {noteCount > 0 && <span className="ta-row-notes">{noteCount} ant.</span>}
        </div>
      </div>
      <div className="ta-row-side">
        <div className="ta-row-chans">
          {isValue && valueDelta != null && <ValueDelta delta={valueDelta} highlight />}
          <span className="ta-row-chans-val">{fmtPct(chans)}</span>
        </div>
        <div className="ta-row-sub">
          {streck != null && <span>Streck {fmtPct(streck)}</span>}
          {odds != null && <span>Odds {fmtNum(odds)}</span>}
        </div>
      </div>
    </div>
  );
}
```

```tsx
// components/ui/RaceTabs.tsx
"use client";

import { useEffect, useRef } from "react";
import { cx } from "./cx";

/** Avdelningsflikar. Siffran under = antal valda hästar, guldstreck = resultat klart. */
export function RaceTabs({ races, active, onSelect }: {
  races: { n: number; done?: boolean; picks?: number }[];
  active: number;
  onSelect: (n: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left) });
  }, [active]);
  return (
    <div ref={scroller} className="ta-tabs" role="tablist" aria-label="Avdelningar">
      {races.map((r) => (
        <button
          key={r.n}
          type="button"
          role="tab"
          aria-selected={r.n === active}
          aria-label={`Avdelning ${r.n}${r.done ? ", resultat klart" : ""}${r.picks ? `, ${r.picks} valda` : ""}`}
          className={cx("ta-tab", r.done && "ta-tab-done")}
          onClick={() => onSelect(r.n)}
        >
          <span className="ta-tab-n">{r.n}</span>
          <span className="ta-tab-picks">{r.picks ? r.picks : " "}</span>
        </button>
      ))}
    </div>
  );
}
```

```tsx
// components/ui/Assessment.tsx
import type { ReactNode } from "react";

/** Bedömningen i detaljvyn: etikett (oftast en Term), värde och en rad förklaring. */
export function Assessment({ rows }: { rows: { key: string; label: ReactNode; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className="ta-assess">
      {rows.map((r) => (
        <div key={r.key} className="ta-assess-row">
          <dt className="ta-assess-label">{r.label}</dt>
          <dd className="ta-assess-value">{r.value}</dd>
          {r.note && <dd className="ta-assess-note">{r.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
```

Append to `components/ui/index.ts`:

```ts
export { HorseList, HorseRow } from "./HorseRow";
export { RaceTabs } from "./RaceTabs";
export { Assessment } from "./Assessment";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/ui.race.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui lib/__tests__/ui.race.test.tsx
git commit -m "UI: hästrad, avdelningsflikar och bedömningslista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Loppvyn – sidhuvud, flikar, verktygsrad och lista

**Files:**
- Modify: `app/(authenticated)/page.tsx` (sidhuvudet), `components/GamePickerBar.tsx` (utseende och blad), `components/RaceList.tsx` (helt), `components/MainPageClient.tsx` (props till RaceList)
- Create: `components/RaceToolbar.tsx`
- Delete: `components/RaceTabBar.tsx`, `components/TopFiveRanking.tsx`, `components/CollapsibleControls.tsx`
- Test: `lib/__tests__/raceToolbar.test.tsx`

**Interfaces:**
- Consumes: everything from Task 8–9; `Sheet`, `SegmentedControl`, `Button` (Task 4–5); `fmtGameDate`, `fmtClock`, `fmtStartMethod` (Task 2); `readPref`, `writePref` (Task 8).
- Produces:
  - `RaceToolbar({ view: "lista" | "tabell"; onView: (v) => void; sort: SortKey; onSort: (k: SortKey) => void; filters: Filters; onFilters: (f: Filters) => void })`
  - `RaceList` props: `{ races: Race[]; activeRaceNumber: number; onSelectRace: (n: number) => void; userGroups: Group[]; currentUserId: string; systemSelections: SystemSelection[]; canSelect: boolean; onToggleHorse: (raceNumber: number, horse: SystemHorse) => void; trackConfig?: TrackConfig | null; noteCounts?: Record<string, number> }`
  - `GamePickerBar` props gain `firstStartTime?: string | null`.

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/raceToolbar.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { RaceToolbar } from "@/components/RaceToolbar";
import { EMPTY_FILTERS } from "@/lib/raceView";

describe("RaceToolbar", () => {
  it("visar vy, sortering och antal aktiva filter", () => {
    const out = html(
      <RaceToolbar view="lista" onView={() => {}} sort="grund" onSort={() => {}}
        filters={{ ...EMPTY_FILTERS, value: true, search: "x" }} onFilters={() => {}} />
    );
    expect(out).toMatch(/aria-pressed="true"[^>]*>Lista/);
    expect(out).toContain("Sortera: Grund");
    expect(out).toContain("Filter (2)");
  });
  it("utan filter står bara Filter", () => {
    const out = html(<RaceToolbar view="tabell" onView={() => {}} sort="chans" onSort={() => {}} filters={EMPTY_FILTERS} onFilters={() => {}} />);
    expect(out).toContain(">Filter<");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/raceToolbar.test.tsx`
Expected: FAIL with "Cannot find module '@/components/RaceToolbar'"

- [ ] **Step 3: Write `components/RaceToolbar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button, SegmentedControl, Sheet } from "@/components/ui";
import { activeFilterCount, EMPTY_FILTERS, SORT_KEYS, SORT_LABELS, type Filters, type SortKey } from "@/lib/raceView";

export type RaceView = "lista" | "tabell";

const CHECKS: { key: Exclude<keyof Filters, "search">; label: string }[] = [
  { key: "value", label: "Bara värde" },
  { key: "skrall", label: "Bara skräll" },
  { key: "signal", label: "Bara signal" },
  { key: "hideLongshots", label: "Dölj långskott (odds över 50)" },
];

export function RaceToolbar({ view, onView, sort, onSort, filters, onFilters }: {
  view: RaceView; onView: (v: RaceView) => void;
  sort: SortKey; onSort: (k: SortKey) => void;
  filters: Filters; onFilters: (f: Filters) => void;
}) {
  const [sheet, setSheet] = useState<"sort" | "filter" | null>(null);
  const count = activeFilterCount(filters);
  const close = () => setSheet(null);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SegmentedControl label="Visning" value={view} onChange={onView}
        options={[{ value: "lista", label: "Lista" }, { value: "tabell", label: "Tabell" }]} />
      <button type="button" className="ta-chip" onClick={() => setSheet("sort")}>{`Sortera: ${SORT_LABELS[sort]}`}</button>
      <button type="button" className="ta-chip" aria-pressed={count > 0} onClick={() => setSheet("filter")}>
        {count > 0 ? `Filter (${count})` : "Filter"}
      </button>

      <Sheet open={sheet === "sort"} onClose={close} title="Sortera">
        <div role="radiogroup" aria-label="Sortera" className="flex flex-col">
          {SORT_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid var(--line)", font: "400 15px/22px var(--font-sans)" }}>
              <input type="radio" name="sort" checked={k === sort} onChange={() => { onSort(k); close(); }} />
              {SORT_LABELS[k]}
            </label>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "filter"} onClose={close} title="Filter"
        footer={<>
          <Button onClick={() => onFilters(EMPTY_FILTERS)}>Rensa filter</Button>
          <Button variant="primary" onClick={close}>Visa hästar</Button>
        </>}>
        <div className="flex flex-col">
          {CHECKS.map((c) => (
            <label key={c.key} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid var(--line)", font: "400 15px/22px var(--font-sans)" }}>
              <input type="checkbox" checked={filters[c.key]} onChange={(e) => onFilters({ ...filters, [c.key]: e.target.checked })} />
              {c.label}
            </label>
          ))}
          <label htmlFor="race-search" className="ta-field-label" style={{ marginTop: "var(--space-3)" }}>Sök häst, kusk eller tränare</label>
          <input id="race-search" className="ta-field" type="search" value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })} />
        </div>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/raceToolbar.test.tsx`
Expected: PASS

- [ ] **Step 5: Rewrite `components/RaceList.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, HorseList, HorseRow, RaceTabs } from "@/components/ui";
import { RaceToolbar, type RaceView } from "./RaceToolbar";
import { StartCountdown } from "./StartCountdown";
import { fmtClock, fmtStartMethod } from "@/lib/format";
import { readPref, writePref } from "@/lib/prefs";
import {
  buildRowModels, computeRaceMaps, EMPTY_FILTERS, filterRows, raceLacksMarket, raceTabsInfo, SORT_KEYS, SORT_LABELS,
  sortRows, type Filters, type RowModel, type SortKey,
} from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { Group, SystemHorse, SystemSelection, TrackConfig } from "@/lib/types";

const VIEWS = ["lista", "tabell"] as const;

export function RaceList({
  races, activeRaceNumber, onSelectRace, userGroups, currentUserId, systemSelections, canSelect, onToggleHorse,
  trackConfig = null, noteCounts = {},
}: {
  races: Race[];
  activeRaceNumber: number;
  onSelectRace: (n: number) => void;
  userGroups: Group[];
  currentUserId: string;
  systemSelections: SystemSelection[];
  canSelect: boolean;
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void;
  trackConfig?: TrackConfig | null;
  noteCounts?: Record<string, number>;
}) {
  const [view, setView] = useState<RaceView>("lista");
  const [sort, setSort] = useState<SortKey>("chans");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<number | null>(null);

  useEffect(() => {
    setView(readPref("travappen.view", VIEWS, "lista"));
    setSort(readPref("travappen.sort", SORT_KEYS, "chans"));
  }, []);
  const changeView = (v: RaceView) => { setView(v); writePref("travappen.view", v); };
  const changeSort = (k: SortKey) => { setSort(k); writePref("travappen.sort", k); };

  const race = races.find((r) => r.race_number === activeRaceNumber) ?? races[0];
  const selected = useMemo(() => new Set(
    (systemSelections.find((s) => s.race_number === race?.race_number)?.horses ?? []).map((h) => h.start_number)
  ), [systemSelections, race?.race_number]);
  const maps = useMemo(() => (race ? computeRaceMaps(race) : null), [race]);
  const allRows = useMemo(() => (race && maps ? buildRowModels(race, maps, selected) : []), [race, maps, selected]);
  const rows = sortRows(filterRows(allRows, filters), sort);

  if (!race || !maps) return null;

  const toggle = (r: RowModel) =>
    onToggleHorse(race.race_number, { horse_id: r.starter.horse_id, start_number: r.n, horse_name: r.name });
  const onToggle = (r: RowModel) => (canSelect && r.selectable ? () => toggle(r) : undefined);

  return (
    <div className="flex flex-col gap-3">
      <RaceTabs races={raceTabsInfo(races, systemSelections)} active={race.race_number} onSelect={onSelectRace} />

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ta-section-title">{`Avdelning ${race.race_number}`}</h2>
          <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
            {[`${race.distance} m`, fmtStartMethod(race.start_method), `${race.starters.length} hästar`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end" style={{ font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>
          {race.start_time && <span>{`Start ${fmtClock(race.start_time)}`}</span>}
          <StartCountdown startTime={race.start_time} />
        </div>
      </div>

      <RaceToolbar view={view} onView={changeView} sort={sort} onSort={changeSort} filters={filters} onFilters={setFilters} />

      {raceLacksMarket(allRows) && (
        <p className="ta-banner" style={{ margin: 0 }}>Streck och odds saknas än. Hämta om omgången när spelet har öppnat.</p>
      )}

      {rows.length === 0 ? (
        <div className="ta-card flex flex-col items-center gap-3 py-8">
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>Inga hästar matchar filtret.</p>
          <Button onClick={() => setFilters(EMPTY_FILTERS)}>Rensa filter</Button>
        </div>
      ) : view === "lista" ? (
        <HorseList sortLabel={SORT_LABELS[sort]}>
          {rows.map((r) => (
            <HorseRow
              key={r.n}
              number={r.n}
              name={r.name}
              driver={r.driver}
              chans={r.chansPct}
              streck={r.streckPct}
              odds={r.odds}
              form={r.form}
              badge={r.badge}
              signalScore={r.edgeScore}
              valueDelta={r.valueDelta}
              isValue={r.isValue}
              state={r.numberState}
              dimmed={r.scratched}
              onToggleSystem={onToggle(r)}
              onOpen={() => setDetail(r.n)}
              noteCount={noteCounts[r.starter.horse_id] ?? 0}
            />
          ))}
        </HorseList>
      ) : (
        <p className="ta-banner" style={{ margin: 0 }}>Tabellen kommer i nästa steg.</p>
      )}
    </div>
  );
}
```

The table placeholder and the unused `detail`, `userGroups`, `currentUserId`, `trackConfig` are completed in Tasks 11–12 (the branch is not merged between tasks; PR 2 opens after Task 13). Lint may warn about unused variables until then — prefix them with `_` only if lint fails the build, and remove the prefix in Task 11.

- [ ] **Step 6: Wire `MainPageClient.tsx`**

- Delete `handleHorseClick`.
- Replace the `<RaceList … />` element with:

```tsx
          <RaceList
            races={races}
            activeRaceNumber={activeRace}
            onSelectRace={setActiveRace}
            userGroups={userGroups}
            currentUserId={currentUserId}
            systemSelections={systemSelections}
            canSelect={systemMode}
            onToggleHorse={handleToggleHorse}
            trackConfig={trackConfig}
            noteCounts={noteCounts}
          />
```

- Change `type RaceListRaces = ComponentProps<typeof RaceList>['races']` to `import type { Race } from '@/lib/raceTypes'` and use `Race[]` for the `races` prop.

- [ ] **Step 7: Restyle `components/GamePickerBar.tsx`**

- Add prop `firstStartTime?: string | null` and imports `import { Button, Sheet } from "@/components/ui"; import { fmtClock, fmtGameDate } from "@/lib/format"; import { ResultsButton } from "./ResultsButton";`.
- Replace the whole returned JSX with:

```tsx
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Byt omgång"
        className="flex flex-col items-start min-w-0 text-left" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)" }}>
        <span className="flex items-center gap-1.5" style={{ font: "600 17px/22px var(--font-sans)" }}>
          {selectedGame ? `${selectedGame.game_type} · ${selectedGame.track ?? ""}` : "Välj omgång"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </span>
        {selectedGame && (
          <span style={{ font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
            {fmtGameDate(selectedGame.date)}{firstStartTime ? ` · första start ${fmtClock(firstStartTime)}` : ""}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Omgång">
        {selectedGame && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button size="sm" disabled={!prevGame} onClick={() => prevGame && router.push(`/?game=${prevGame.id}`)}>Föregående</Button>
            <ResultsButton gameId={selectedId} />
            <Button size="sm" disabled={!nextGame} onClick={() => nextGame && router.push(`/?game=${nextGame.id}`)}>Nästa</Button>
          </div>
        )}

        <h3 className="ta-sheet-sub">Hämta nytt spel</h3>
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" aria-label="Föregående dag" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); const s = d.toLocaleDateString("sv-SE"); if (s >= minDate()) setDate(s); }}>‹</Button>
          <input type="date" className="ta-field" style={{ height: 36 }} value={date} min={minDate()} max={maxDate()} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
          <Button size="sm" aria-label="Nästa dag" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); const s = d.toLocaleDateString("sv-SE"); if (s <= maxDate()) setDate(s); }}>›</Button>
        </div>

        {loadingGames ? (
          <p className="ta-sheet-text" style={{ color: "var(--ink-muted)" }}>Letar spel …</p>
        ) : listError ? (
          <p className="ta-error">{listError}</p>
        ) : availableGames.length === 0 ? (
          <p className="ta-sheet-text" style={{ color: "var(--ink-muted)" }}>
            Inga spel {date === todayLocal() ? "i dag" : date === tomorrowLocal() ? "i morgon" : date}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {availableGames.map((game) => (
              <Button key={game.id} variant="secondary" onClick={() => handleFetch(game)} disabled={fetchingId !== null}
                style={{ justifyContent: "space-between", width: "100%" }}>
                <span>{game.label}</span>
                <span style={{ color: "var(--ink-muted)" }}>{fetchingId === game.id ? "Hämtar …" : "Hämta"}</span>
              </Button>
            ))}
          </div>
        )}
        {message && <p className="ta-error" style={{ marginTop: "var(--space-2)" }}>{message}</p>}

        {savedGames.length > 0 && (
          <>
            <h3 className="ta-sheet-sub">Sparade omgångar</h3>
            <div className="flex flex-col" style={{ maxHeight: 240, overflowY: "auto" }}>
              {savedGames.map((g) => (
                <button key={g.id} type="button" onClick={() => { setOpen(false); router.push(`/?game=${encodeURIComponent(g.id)}`); }}
                  aria-current={g.id === selectedId ? "true" : undefined}
                  className="text-left py-2" style={{ background: "none", border: 0, borderTop: "1px solid var(--line)", cursor: "pointer",
                    font: "400 15px/22px var(--font-sans)", color: g.id === selectedId ? "var(--accent)" : "var(--ink)" }}>
                  {`${g.game_type} · ${g.track ?? ""} · ${fmtGameDate(g.date)}`}
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>
    </>
  );
```

Delete the `iconBtn` constant and the Escape `useEffect` (Sheet handles Escape).

- [ ] **Step 8: Rewrite the header in `app/(authenticated)/page.tsx`**

- Remove imports of `ThemeToggle`, `UserMenu`, `CollapsibleControls`, `RaceTabBar`, `ResultsButton`, `Suspense`.
- Replace everything from `<main …>` through the closing `</header>` with:

```tsx
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <header className="sticky top-0 z-30 md:static" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-5">
          <div className="flex-1 min-w-0">
            <GamePickerBar savedGames={games} selectedId={selectedId} firstStartTime={races[0]?.start_time ?? null} />
          </div>
          <Link href="/manual" aria-label="Hjälp och manual" className="md:hidden w-10 h-10 rounded-md grid place-items-center"
            style={{ background: "var(--surface-sunken)", color: "var(--ink)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9" /><path d="M12 17.2v.1" />
            </svg>
          </Link>
        </div>
        {postSummary && selectedId && (
          <div className="px-4 pb-3 md:px-8">
            <Link href={`/sallskap/${postSummary.group_id}?game=${selectedId}`} className="ta-link">
              {`${postSummary.count} inlägg om omgången i sällskapet`}
            </Link>
          </div>
        )}
      </header>
```

- Change the content wrapper `<div className="px-4 lg:px-[5%] xl:px-[8%] py-6">` to `<div className="px-4 md:px-8 py-4 max-w-[1440px] mx-auto">`.
- Keep `getProfile()` in the `Promise.all` only if still used; remove `profile` from the destructuring if lint reports it unused.

- [ ] **Step 9: Delete replaced components**

Run: `git rm components/RaceTabBar.tsx components/TopFiveRanking.tsx components/CollapsibleControls.tsx && grep -rn "RaceTabBar\|TopFiveRanking\|CollapsibleControls" app components lib`
Expected: no matches.

- [ ] **Step 10: Verify**

Run: `npx jest > .superpowers/t10.log 2>&1; tail -5 .superpowers/t10.log && npx tsc --noEmit && npm run lint`
Expected: all pass. Then `npm run dev`, open http://localhost:3000 at 390 px width: header shows "V85 · <bana>" and date; tabs show 1–8; rows show Chans large with streck and odds; tapping the header opens the Omgång sheet; Sortera and Filter sheets work; "?" opens the manual.

- [ ] **Step 11: Commit**

```bash
git add -A app components lib
git commit -m "Loppvy: nytt sidhuvud, avdelningsflikar, verktygsrad och hästrader

Topp 5, spelkontrollerna och den gamla flikraden tas bort.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Hästens detaljvy

**Files:**
- Create: `components/HorseDetail.tsx`, `lib/horseDetail.ts`
- Modify: `components/RaceList.tsx` (öppna/stänga, `?hast=`)
- Delete: `components/HorseCard.tsx`
- Test: `lib/__tests__/horseDetail.test.ts`

**Interfaces:**
- Consumes: `RowModel`, `parseHastParam` (Task 8); `Assessment`, `Term`, `ValueDelta`, `FormStrip`, `Badge`, `Button`, `StartNumber` (Task 4–9); `fmtPct`, `fmtNum`, `fmtOrdinal`, `fmtKmTime`, `fmtKr` (Task 2); `topReasons` (`lib/fundamental`); `computeTrackFactor` (`lib/analysis`); `HorseNotes`.
- Produces:
  - `lib/horseDetail.ts`: `chansNote(rank: number | null): string | null`; `rankNote(rank: number | null, what: string): string | null`; `grundNote(reasons: string[], disagree: boolean): string | null`; `trackNote(post: number | null, cfg: TrackConfig | null, distance: number): string | null`; `placementLine(starts: number | null, wins: number | null, p2: number | null, p3: number | null): string`; `distanceCategory(m: number): "short" | "medium" | "long"`.
  - `HorseDetail({ race: Race; row: RowModel; reasons: string[]; signals: { key: string; detail: string; points: number }[]; trackConfig: TrackConfig | null; userGroups: Group[]; currentUserId: string; canSelect: boolean; onToggle: () => void; onClose: () => void })`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/horseDetail.test.ts
import { chansNote, distanceCategory, grundNote, placementLine, rankNote, trackNote } from "../horseDetail";
import type { TrackConfig } from "../types";

const cfg: TrackConfig = { track_name: "Solvalla", open_stretch: true, open_stretch_lanes: [1, 2], short_race_threshold: 1640, active: true, updated_at: "" };

describe("horseDetail", () => {
  it("chans och rang", () => {
    expect(chansNote(1)).toBe("Störst chans i loppet.");
    expect(chansNote(2)).toBe("2:a störst chans i loppet.");
    expect(chansNote(null)).toBeNull();
    expect(rankNote(3, "i fältet")).toBe("3:e i fältet.");
  });
  it("grund med oense", () => {
    expect(grundNote(["+ km-tid", "+ kusk"], false)).toBe("Varför: + km-tid · + kusk.");
    expect(grundNote([], true)).toBe("Grund och streck är oense. Då har strecket oftast haft rätt.");
    expect(grundNote(["+ km-tid"], true)).toBe("Varför: + km-tid. Grund och streck är oense. Då har strecket oftast haft rätt.");
    expect(grundNote([], false)).toBeNull();
  });
  it("spår med banjustering", () => {
    expect(trackNote(2, cfg, 2140)).toBe("Open stretch på Solvalla: spåret räknas som bättre.");
    expect(trackNote(6, cfg, 1640)).toBe("Kort lopp: ytterspår räknas som sämre.");
    expect(trackNote(4, cfg, 2140)).toBeNull();
    expect(trackNote(2, null, 2140)).toBeNull();
  });
  it("placeringsrad och distans", () => {
    expect(placementLine(32, 9, 6, 4)).toBe("32 starter · 9-6-4");
    expect(placementLine(0, 0, 0, 0)).toBe("–");
    expect([1640, 2140, 2640].map(distanceCategory)).toEqual(["short", "medium", "long"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/horseDetail.test.ts`
Expected: FAIL with "Cannot find module '../horseDetail'"

- [ ] **Step 3: Write `lib/horseDetail.ts`**

```ts
import { fmtOrdinal } from "./format";
import type { TrackConfig } from "./types";

export function chansNote(rank: number | null): string | null {
  if (rank == null) return null;
  return rank === 1 ? "Störst chans i loppet." : `${fmtOrdinal(rank)} störst chans i loppet.`;
}

export function rankNote(rank: number | null, what: string): string | null {
  return rank == null ? null : `${fmtOrdinal(rank)} ${what}.`;
}

const OENSE = "Grund och streck är oense. Då har strecket oftast haft rätt.";

export function grundNote(reasons: string[], disagree: boolean): string | null {
  const parts = [reasons.length ? `Varför: ${reasons.join(" · ")}.` : null, disagree ? OENSE : null].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/** Samma villkor som computeTrackFactor använder för banjusteringen. */
export function trackNote(post: number | null, cfg: TrackConfig | null, distance: number): string | null {
  if (post == null || !cfg) return null;
  if (cfg.open_stretch && cfg.open_stretch_lanes.includes(post)) return `Open stretch på ${cfg.track_name}: spåret räknas som bättre.`;
  if (cfg.short_race_threshold > 0 && distance <= cfg.short_race_threshold && post >= 5) return "Kort lopp: ytterspår räknas som sämre.";
  return null;
}

export function placementLine(starts: number | null, wins: number | null, p2: number | null, p3: number | null): string {
  if (!starts) return "–";
  return `${starts} starter · ${wins ?? 0}-${p2 ?? 0}-${p3 ?? 0}`;
}

export function distanceCategory(m: number): "short" | "medium" | "long" {
  return m <= 1800 ? "short" : m <= 2400 ? "medium" : "long";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/horseDetail.test.ts`
Expected: PASS

- [ ] **Step 5: Write `components/HorseDetail.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Assessment, Badge, Button, FormStrip, StartNumber, Term, ValueDelta } from "@/components/ui";
import { HorseNotes } from "./notes/HorseNotes";
import { fmtKmTime, fmtKr, fmtNum, fmtOrdinal, fmtPct } from "@/lib/format";
import { chansNote, distanceCategory, grundNote, placementLine, rankNote, trackNote } from "@/lib/horseDetail";
import type { RowModel } from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { Group, TrackConfig } from "@/lib/types";

interface FetchedStart {
  place: string; date: string; track: string; time: string; driver: string | null;
  post_position: number | null; distance: number | null; start_method: string | null;
}

const SEX: Record<string, string> = { mare: "sto", gelding: "valack", stallion: "hingst", horse: "häst" };
const DIST: Record<string, string> = { short: "Kort", medium: "Medel", long: "Lång" };
const PLACE_CLS: Record<string, string> = { "1": "ta-form-p1", "2": "ta-form-p2", "3": "ta-form-p3" };

function Section({ title, extra, children }: { title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ta-section-title">{title}</h3>
        {extra}
      </div>
      <div className="ta-card" style={{ padding: "2px 16px 4px" }}>{children}</div>
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
      <span style={{ font: "400 14px/20px var(--font-sans)", color: "var(--ink-muted)" }}>{label}</span>
      <span style={{ font: "600 14px/20px var(--font-sans)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function HorseDetail({ race, row, reasons, signals, trackConfig, userGroups, currentUserId, canSelect, onToggle, onClose }: {
  race: Race; row: RowModel; reasons: string[]; signals: { key: string; detail: string; points: number }[]; trackConfig: TrackConfig | null;
  userGroups: Group[]; currentUserId: string; canSelect: boolean; onToggle: () => void; onClose: () => void;
}) {
  const s = row.starter;
  const [starts, setStarts] = useState<FetchedStart[] | null>(null);
  const [startsError, setStartsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStarts(null);
    setStartsError(null);
    const params = new URLSearchParams({ raceId: race.id, startNumber: String(row.n) });
    fetch(`/api/horses/${s.horse_id}/starts?${params}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "fel");
        if (!cancelled) setStarts(data.starts ?? []);
      })
      .catch(() => { if (!cancelled) setStartsError("Kunde inte hämta starter från ATG. Försök igen."); });
    return () => { cancelled = true; };
  }, [race.id, row.n, s.horse_id, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = row.numberState !== "idle" && row.numberState !== "selected";
  const inSystem = row.numberState === "selected";
  const sex = SEX[s.horse_sex ?? ""] ?? s.horse_sex ?? "";
  const info = [s.horse_age ? `${s.horse_age} år` : null, sex || null, s.post_position != null ? `Spår ${s.post_position}` : null].filter(Boolean).join(" · ");
  const cat = distanceCategory(race.distance);
  const method = race.start_method ?? "auto";
  const methods = Array.from(new Set((s.life_records ?? []).map((r) => r.start_method)));
  const platsPct = s.starts_total ? Math.round((((s.wins_total ?? 0) + (s.places_2nd ?? 0) + (s.places_3rd ?? 0)) / s.starts_total) * 100) : null;
  const perStart = s.earnings_total && s.starts_total ? s.earnings_total / s.starts_total : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={row.name} className="fixed inset-0 z-[60] flex justify-center md:items-center md:p-6"
      style={{ background: "var(--scrim)" }} onClick={onClose}>
      <div className="w-full md:max-w-[640px] h-full md:h-auto md:max-h-[90vh] overflow-y-auto md:rounded-[14px]"
        style={{ background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <button type="button" onClick={onClose} className="ta-link inline-flex items-center gap-1" style={{ background: "none", border: 0, cursor: "pointer", minHeight: 40 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            {`Avdelning ${race.race_number}`}
          </button>
        </header>

        <div className="flex flex-col gap-6 px-4 pt-5 pb-10">
          <section className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <StartNumber number={row.n} state={row.numberState} />
              <div className="min-w-0 flex-1">
                <h2 style={{ margin: 0, font: "600 22px/28px var(--font-sans)", letterSpacing: "-0.01em" }}>{row.name}</h2>
                {info && <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>{info}</p>}
                <p style={{ margin: "2px 0 0", font: "400 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
                  {[s.driver ? `Kusk ${s.driver}` : null, s.trainer ? `Tränare ${s.trainer}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FormStrip results={row.form} />
              {row.badge === "skrall" && <Badge tone="skrall">Skräll</Badge>}
              {row.badge === "signal" && <Badge tone="signal">{`Signal +${row.edgeScore}`}</Badge>}
              {row.badge === "scratched" && <Badge>Struken</Badge>}
            </div>
            {results ? (
              <p style={{ margin: 0, font: "600 15px/20px var(--font-sans)" }}>
                {s.finish_position ? `${fmtOrdinal(s.finish_position)} plats · ${fmtKmTime(s.finish_time)}` : "Oplacerad"}
              </p>
            ) : canSelect && row.selectable ? (
              <Button variant={inSystem ? "secondary" : "primary"} onClick={onToggle} style={{ width: "100%" }}>
                {inSystem ? "Ta bort ur systemet" : "Lägg i systemet"}
              </Button>
            ) : null}
          </section>

          <Section title="Bedömning">
            <Assessment rows={[
              { key: "chans", label: <Term term="chans" />, value: fmtPct(row.chansPct), note: chansNote(row.chansRank) },
              { key: "streck", label: <Term term="streck" />, value: fmtPct(row.streckPct) },
              { key: "varde", label: <Term term="varde" />, value: row.valueDelta != null ? <ValueDelta delta={row.valueDelta} highlight={row.isValue} /> : "–",
                note: row.isValue ? "Vinner oftare än strecket säger." : null },
              { key: "odds", label: <Term term="odds" />, value: fmtNum(row.odds), note: s.p_odds != null ? `Platsodds ${fmtNum(s.p_odds, 2)}` : null },
              { key: "grund", label: <Term term="grund" />, value: fmtPct(row.grundPct), note: grundNote(reasons, row.disagree) },
              { key: "cs", label: <Term term="cs" />, value: row.cs != null ? String(row.cs) : "–", note: rankNote(row.csRank, "i fältet") },
              { key: "spar", label: <Term term="spar" />, value: s.post_position != null ? String(s.post_position) : "–", note: trackNote(s.post_position, trackConfig, race.distance) },
            ]} />
          </Section>

          <SignalsSection signals={signals} total={row.edgeScore} />

          <Section title="Senaste starter" extra={<span style={{ font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Från ATG</span>}>
            {startsError ? (
              <div className="flex flex-col gap-2 py-3">
                <p className="ta-error" style={{ margin: 0 }}>{startsError}</p>
                <Button size="sm" onClick={() => setAttempt((a) => a + 1)}>Försök igen</Button>
              </div>
            ) : starts === null ? (
              <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Hämtar senaste starter från ATG …</p>
            ) : starts.length === 0 ? (
              <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Inga tidigare starter.</p>
            ) : (
              starts.map((r, i) => (
                <div key={i} className="grid items-center gap-2.5 py-2.5" style={{ gridTemplateColumns: "84px minmax(0,1fr) auto auto", borderTop: "1px solid var(--line)", font: "400 14px/20px var(--font-sans)" }}>
                  <span style={{ color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>{r.date}</span>
                  <span className="truncate">
                    {r.track}
                    <span style={{ color: "var(--ink-muted)" }}>{` · ${r.distance ?? "–"} ${r.start_method === "volte" ? "v" : r.start_method === "auto" ? "a" : ""}${r.driver ? ` · ${r.driver}` : ""}`}</span>
                  </span>
                  <span style={{ color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtKmTime(r.time)}</span>
                  <span className={`ta-form-cell ${PLACE_CLS[r.place] ?? (r.place === "d" ? "ta-form-dq" : "")}`}>{r.place || "–"}</span>
                </div>
              ))
            )}
          </Section>

          {methods.length > 0 && (
            <Section title="Bästa tider">
              <table className="w-full" style={{ borderCollapse: "collapse", font: "500 14px/20px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th scope="col" className="text-left" style={{ padding: "10px 0 6px", font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Start</th>
                    {(["short", "medium", "long"] as const).map((d) => (
                      <th key={d} scope="col" style={{ padding: "10px 0 6px", font: "500 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>{DIST[d]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m}>
                      <th scope="row" className="text-left" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>{m === "auto" ? "Auto" : "Volt"}</th>
                      {(["short", "medium", "long"] as const).map((d) => {
                        const rec = (s.life_records ?? []).find((r) => r.start_method === m && r.distance === d);
                        const current = m === method && d === cat;
                        return (
                          <td key={d} className="text-center" style={{ borderTop: "1px solid var(--line)", color: rec ? "var(--ink)" : "var(--ink-muted)" }}>
                            <span style={current ? { padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)", fontWeight: 600 } : undefined}>
                              {rec ? fmtKmTime(rec.time) : "–"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "6px 0 10px", font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>
                {`Markerad: dagens lopp, ${method === "auto" ? "autostart" : "voltstart"} ${DIST[cat].toLowerCase()}distans.`}
              </p>
            </Section>
          )}

          {s.shoes_reported && (
            <Section title="Utrustning">
              <StatRow label="Skor fram" value={`${s.shoes_front ? "Skor" : "Barfota"}${s.shoes_front_changed ? " (ny)" : ""}`} />
              <StatRow label="Skor bak" value={`${s.shoes_back ? "Skor" : "Barfota"}${s.shoes_back_changed ? " (ny)" : ""}`} />
              {s.sulky_type && <StatRow label="Vagn" value={s.sulky_type} />}
            </Section>
          )}

          <Section title="Statistik">
            <StatRow label="Livs" value={placementLine(s.starts_total, s.wins_total, s.places_2nd, s.places_3rd)} />
            <StatRow label="I år" value={placementLine(s.starts_current_year, s.wins_current_year, s.places_2nd_current_year, s.places_3rd_current_year)} />
            <StatRow label="Förra året" value={placementLine(s.starts_prev_year, s.wins_prev_year, s.places_2nd_prev_year, s.places_3rd_prev_year)} />
            {platsPct != null && <StatRow label="Plats" value={fmtPct(platsPct, 0)} />}
            {perStart != null && <StatRow label="Pengar per start" value={fmtKr(perStart)} />}
            {s.earnings_total ? <StatRow label="Totalt" value={fmtKr(s.earnings_total)} /> : null}
          </Section>

          {(s.driver || s.trainer) && (
            <Section title="Kusk och tränare">
              {s.driver && <StatRow label={`${s.driver}, kusk`} value={s.driver_win_pct != null ? `${fmtPct(s.driver_win_pct, 0)} segrar i år` : "–"} />}
              {s.trainer && <StatRow label={`${s.trainer}, tränare`} value={s.trainer_win_pct != null ? `${fmtPct(s.trainer_win_pct, 0)} segrar i år` : "–"} />}
            </Section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="ta-section-title">Anteckningar</h3>
            <HorseNotes horseId={s.horse_id} userGroups={userGroups} currentUserId={currentUserId} />
          </section>
        </div>
      </div>
    </div>
  );
}
```

Add `SignalsSection` in the same file, above `HorseDetail`. The signals come from `computeRaceMaps(...).edge[row.n].signals` and are passed in as the `signals` prop:

```tsx
function SignalsSection({ signals, total }: { signals: { key: string; detail: string; points: number }[]; total: number }) {
  return (
    <Section title={<Term term="signal">Signaler</Term>}
      extra={signals.length ? <span style={{ font: "600 14px/20px var(--font-sans)" }}>{`Summa ${total > 0 ? "+" : ""}${total}`}</span> : undefined}>
      {signals.length === 0 ? (
        <p style={{ margin: 0, padding: "12px 0", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>Inga signaler för den här hästen.</p>
      ) : signals.map((sig) => (
        <div key={sig.key} className="flex gap-3 py-2.5" style={{ borderTop: "1px solid var(--line)", font: "400 14px/20px var(--font-sans)", color: sig.points > 0 ? "var(--ink)" : "var(--ink-muted)" }}>
          <span style={{ width: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{sig.points > 0 ? `+${sig.points}` : `−${Math.abs(sig.points)}`}</span>
          <span>{sig.detail}</span>
        </div>
      ))}
    </Section>
  );
}
```


- [ ] **Step 6: Open and close the detail view from `RaceList.tsx`**

Add imports `import { HorseDetail } from "./HorseDetail"; import { topReasons } from "@/lib/fundamental"; import { parseHastParam } from "@/lib/raceView";`. Replace `const [detail, setDetail] = useState<number | null>(null);` usage with:

```tsx
  // ?hast=<avd>-<nr> öppnar en häst direkt; bakåtknappen stänger
  useEffect(() => {
    const hit = parseHastParam(new URLSearchParams(window.location.search).get("hast"), races);
    if (hit) { onSelectRace(hit.race); setDetail(hit.start); }
    const onPop = () => {
      const h = parseHastParam(new URLSearchParams(window.location.search).get("hast"), races);
      setDetail(h ? h.start : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (n: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("hast", `${race.race_number}-${n}`);
    window.history.pushState({ hast: true }, "", url);
    setDetail(n);
  };
  const closeDetail = () => {
    if (window.history.state?.hast) { window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete("hast");
    window.history.replaceState(null, "", url);
    setDetail(null);
  };
  const detailRow = detail != null ? allRows.find((r) => r.n === detail) ?? null : null;
```

(these must sit after `race`, `maps` and `allRows` are computed and before the early `return null`; move the early return below them and guard with `race &&`). Change `onOpen={() => setDetail(r.n)}` to `onOpen={() => openDetail(r.n)}` and add before the closing `</div>` of the component:

```tsx
      {detailRow && (
        <HorseDetail
          race={race}
          row={detailRow}
          reasons={maps.fundamental[detailRow.n] ? topReasons(maps.fundamental[detailRow.n]) : []}
          signals={maps.edge[detailRow.n]?.signals ?? []}
          trackConfig={trackConfig}
          userGroups={userGroups}
          currentUserId={currentUserId}
          canSelect={canSelect}
          onToggle={() => toggle(detailRow)}
          onClose={closeDetail}
        />
      )}
```

- [ ] **Step 7: Delete `HorseCard.tsx`**

Run: `git rm components/HorseCard.tsx && grep -rn "HorseCard" app components lib`
Expected: no matches (CLAUDE.md is updated in Task 13).

- [ ] **Step 8: Verify**

Run: `npx jest > .superpowers/t11.log 2>&1; tail -5 .superpowers/t11.log && npx tsc --noEmit && npm run lint`
Expected: all pass. In `npm run dev`: tap a horse row → detail opens, URL gets `?hast=3-2`; browser back closes it; reload with `?hast=3-2` opens it; Escape closes it; "Senaste starter" loads by itself.

- [ ] **Step 9: Commit**

```bash
git add -A components lib
git commit -m "Detaljvy: bedömning, signaler, senaste starter och statistik i ett lager

Hästkortet ersätts; ?hast=<avd>-<nr> öppnar en häst direkt.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Tabellvyn (ersätter analysverktyget)

**Files:**
- Create: `components/RaceTable.tsx`
- Modify: `components/RaceList.tsx` (tabellgrenen)
- Delete: `components/AnalysisPanel.tsx`
- Test: `lib/__tests__/raceTable.test.tsx`

**Interfaces:**
- Consumes: `RowModel` (Task 8); `Term`, `StartNumber`, `ValueDelta`, `Badge`, `FormStrip`, `Button` (Task 4–9); `computeDistanceSignal`, `computeTrackFactor` (`lib/analysis`); `fmtPct`, `fmtNum`, `fmtOrdinal`, `fmtKmTime` (Task 2).
- Produces: `RaceTable({ race: Race; rows: RowModel[]; trackConfig: TrackConfig | null; canSelect: boolean; onToggle: (r: RowModel) => void; onOpen: (n: number) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/raceTable.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { RaceTable } from "@/components/RaceTable";
import type { RowModel } from "@/lib/raceView";
import type { Race, Starter } from "@/lib/raceTypes";

const starter = { start_number: 2, horse_id: "h2", trainer: "T", post_position: 2, life_records: [], horse_starts_history: [], finish_position: null, finish_time: null } as unknown as Starter;
const row: RowModel = {
  starter, n: 2, name: "Hail Ruler", driver: "Ella Lindqvist", chansPct: 18.6, chansRank: 2, streckPct: 12.1, odds: 5.1,
  valueDelta: 6.5, isValue: true, grundPct: 15.3, grundRank: 2, cs: 68, csRank: 2, disagree: false, badge: "signal",
  edgeScore: 2, isEdge: true, form: ["2"], scratched: false, numberState: "idle", selectable: true,
};
const race = { id: "r", race_number: 3, distance: 2140, start_method: "auto", start_time: null, race_name: null, starters: [starter] } as unknown as Race;

describe("RaceTable", () => {
  it("sju standardkolumner med förklarbara rubriker", () => {
    const out = html(<RaceTable race={race} rows={[row]} trackConfig={null} canSelect onToggle={() => {}} onOpen={() => {}} />);
    for (const h of ["Häst", "Chans", "Streck", "Odds", "Värde", "Grund", "Märke"]) expect(out).toContain(`>${h}<`);
    expect(out).not.toContain(">CS<");
    expect(out).toContain("ta-delta-hl");
    expect(out).toContain("Signal +2");
    expect(out).toContain("Visa alla kolumner");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/raceTable.test.tsx`
Expected: FAIL with "Cannot find module '@/components/RaceTable'"

- [ ] **Step 3: Write `components/RaceTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Badge, Button, FormStrip, StartNumber, Term, ValueDelta } from "@/components/ui";
import { computeDistanceSignal, computeTrackFactor } from "@/lib/analysis";
import { fmtKmTime, fmtNum, fmtOrdinal, fmtPct } from "@/lib/format";
import type { RowModel } from "@/lib/raceView";
import type { Race } from "@/lib/raceTypes";
import type { TrackConfig } from "@/lib/types";

function badge(r: RowModel) {
  if (r.badge === "skrall") return <Badge tone="skrall">Skräll</Badge>;
  if (r.badge === "signal") return <Badge tone="signal">{`Signal +${r.edgeScore}`}</Badge>;
  if (r.badge === "scratched") return <Badge>Struken</Badge>;
  return null;
}

export function RaceTable({ race, rows, trackConfig, canSelect, onToggle, onOpen }: {
  race: Race; rows: RowModel[]; trackConfig: TrackConfig | null; canSelect: boolean;
  onToggle: (r: RowModel) => void; onOpen: (n: number) => void;
}) {
  const [all, setAll] = useState(false);
  const method = race.start_method ?? "auto";

  return (
    <div className="flex flex-col gap-2">
      <div className="ta-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ta-table">
            <thead>
              <tr>
                <th scope="col" className="ta-stick">Häst</th>
                <th scope="col" className="ta-left hidden md:table-cell"><Term term="form">Senaste 5</Term></th>
                <th scope="col"><Term term="chans">Chans</Term></th>
                <th scope="col"><Term term="streck">Streck</Term></th>
                <th scope="col"><Term term="odds">Odds</Term></th>
                <th scope="col"><Term term="varde">Värde</Term></th>
                <th scope="col"><Term term="grund">Grund</Term></th>
                <th scope="col" className="ta-left">Märke</th>
                {all && <th scope="col"><Term term="cs">CS</Term></th>}
                {all && <th scope="col" className="ta-left">Distans</th>}
                {all && <th scope="col"><Term term="spar">Spår</Term></th>}
                {all && <th scope="col">Resultat</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = r.starter;
                const dist = all ? computeDistanceSignal(s.life_records ?? [], race.distance, method) : null;
                const trackF = all && s.post_position != null
                  ? computeTrackFactor(s.post_position, method, s.horse_starts_history ?? [], trackConfig ?? undefined, race.distance)
                  : null;
                return (
                  <tr key={r.n} style={r.scratched ? { opacity: 0.55 } : undefined}>
                    <td className="ta-stick">
                      <div className="flex items-center gap-2.5">
                        <StartNumber number={r.n} state={r.numberState} onClick={canSelect && r.selectable ? () => onToggle(r) : undefined} />
                        <button type="button" onClick={() => onOpen(r.n)} className="text-left truncate"
                          style={{ maxWidth: 160, background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--ink)", font: "600 14px/20px var(--font-sans)" }}>
                          {r.name}
                        </button>
                      </div>
                    </td>
                    <td className="ta-left hidden md:table-cell"><FormStrip results={r.form} /></td>
                    <td className="ta-strong">{fmtPct(r.chansPct)}</td>
                    <td className="ta-muted">{fmtPct(r.streckPct)}</td>
                    <td className="ta-muted">{fmtNum(r.odds)}</td>
                    <td>{r.valueDelta != null ? <ValueDelta delta={r.valueDelta} highlight={r.isValue} /> : "–"}</td>
                    <td className="ta-muted">{fmtPct(r.grundPct)}</td>
                    <td className="ta-left">{badge(r)}</td>
                    {all && <td className="ta-muted">{r.cs ?? "–"}</td>}
                    {all && <td className="ta-left ta-muted">{dist?.label ?? "–"}</td>}
                    {all && <td className="ta-muted">{trackF != null ? `${s.post_position} (${fmtNum(trackF, 2)})` : "–"}</td>}
                    {all && <td className="ta-muted">{s.finish_position ? `${fmtOrdinal(s.finish_position)} · ${fmtKmTime(s.finish_time)}` : "–"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span style={{ font: "400 12px/16px var(--font-sans)", color: "var(--ink-muted)" }}>Tryck på en rubrik för att se vad den betyder.</span>
        <Button variant="quiet" size="sm" onClick={() => setAll((v) => !v)}>{all ? "Visa färre kolumner" : "Visa alla kolumner"}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/raceTable.test.tsx`
Expected: PASS

- [ ] **Step 5: Use the table in `RaceList.tsx`**

Replace `<p className="ta-banner" …>Tabellen kommer i nästa steg.</p>` with:

```tsx
        <RaceTable race={race} rows={rows} trackConfig={trackConfig} canSelect={canSelect} onToggle={toggle} onOpen={openDetail} />
```

and add `import { RaceTable } from "./RaceTable";`.

- [ ] **Step 6: Delete `AnalysisPanel.tsx`**

Run: `git rm components/AnalysisPanel.tsx && grep -rn "AnalysisPanel" app components lib`
Expected: no matches.

- [ ] **Step 7: Verify and commit**

Run: `npx jest > .superpowers/t12.log 2>&1; tail -5 .superpowers/t12.log && npx tsc --noEmit && npm run lint`
Expected: all pass. In `npm run dev`: Tabell shows 7 columns (8 with Senaste 5 on desktop); the first column stays put when scrolling sideways on 390 px; "Visa alla kolumner" adds CS, Distans, Spår, Resultat.

```bash
git add -A components lib
git commit -m "Tabell: analysverktyget blir en tabellvy av samma lopp

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Manual och CLAUDE.md för loppvyn

**Files:**
- Modify: `MANUAL.md` (avsnitt 4, 4.1, 4.2, 5, 5.1, 5.2, 6, 6.1 och innehållsförteckningen), `CLAUDE.md`

**Interfaces:**
- Consumes: the UI built in Task 10–12.

- [ ] **Step 1: Rewrite MANUAL.md sections 4–6.1**

Replace section `## 4. Navigera bland omgångar` through the end of `#### Tysta signaler` (just before `### 6.2 Grundchans`) with:

```markdown
## 4. Navigera bland omgångar

Högst upp står omgången, till exempel **V85 · Solvalla** och datumet. Tryck på den för att byta omgång, hämta en ny från ATG eller hämta resultat.

Under den ligger avdelningarna **1–8**. Siffran under ett nummer är hur många hästar du har valt i avdelningen, och ett guldstreck betyder att resultatet är klart.

### 4.1 Lista och tabell

Varje avdelning kan visas som **Lista** (en rad per häst) eller **Tabell** (alla mått i kolumner). Appen kommer ihåg vad du valde.

### 4.2 Sortera och filtrera

- **Sortera** – Chans (standard), Streck, Odds, Grund, CS eller Startnummer.
- **Filter** – bara värde, bara skräll, bara signal, dölj långskott (odds över 50) och sök på häst, kusk eller tränare. Siffran på knappen visar hur många filter som är på.

Strukna hästar hamnar alltid sist, nedtonade, med märket **Struken**.

## 5. Hästraden och detaljvyn

Varje häst visas på en rad:

- **Startnumret** till vänster. Tryck på det för att lägga hästen i systemet. Efter loppet visar det placeringen (guld, silver, brons).
- **Namn, kusk och senaste 5** i mitten, och högst ett märke: **Skräll** eller **Signal +2**.
- **Chans** stort till höger, och under det **streck** och **odds**, som hos ATG. En grön siffra bredvid Chans, till exempel **+4,2**, betyder att hästen har spelvärde.

Alla understrukna ord går att trycka på för en förklaring.

### 5.1 Detaljvyn

Tryck på raden för att öppna hästen. Telefonens bakåtknapp stänger den. Detaljvyn visar i ordning:

1. **Bedömning** – Chans, Streck, Värde, Odds, Grund (med varför), CS och Spår, med en rad förklaring var.
2. **Signaler** – varje signal med poäng.
3. **Senaste starter** – hämtas automatiskt från ATG.
4. **Bästa tider** – per startmetod och distans, dagens lopp markerat.
5. **Utrustning**, **Statistik**, **Kusk och tränare** och **Anteckningar**.

### 5.2 Composite Score (CS)

CS rankar fältet från 0 till 100: streck 55 %, distansrekord 20 %, odds 10 %, jämnhet 10 % och form 5 %. Du hittar CS i detaljvyn och i tabellen under **Visa alla kolumner**.

## 6. Tabellen

### 6.1 Kolumnerna

Tabellen visar **Häst, Chans, Streck, Odds, Värde, Grund** och **Märke** (på dator även **Senaste 5**). **Visa alla kolumner** lägger till **CS, Distans, Spår** och **Resultat**. Tryck på en rubrik för att se vad den betyder, på namnet för att öppna hästen och på numret för att lägga den i systemet.

Värde räknas som Chans minus streck. Grönt betyder att värdet är plus och att CS är över 55. Skräll och Signal förklaras i [Ordlistan](#10-ordlista).
```

Update the table of contents entries for sections 4–6 to match the new headings (`4.1 Lista och tabell`, `4.2 Sortera och filtrera`, `5. Hästraden och detaljvyn`, `5.1 Detaljvyn`, `5.2 Composite Score (CS)`, `6. Tabellen`, `6.1 Kolumnerna`; keep 6.2–6.4). Search the file for "Top 5", "Visa analys", "Hämta från ATG", "SKRÄLL", "OENSE", "Composite Score – " and rewrite any remaining mention to match the new UI.

- [ ] **Step 2: Update CLAUDE.md**

- In "Katalogstruktur": remove `HorseCard.tsx`, `AnalysisPanel.tsx`, `TopFiveRanking.tsx`, `CollapsibleControls.tsx`, `RaceTabBar.tsx`; add `HorseDetail.tsx  # Hästens detaljvy (bedömning, signaler, starter, statistik)`, `RaceTable.tsx  # Tabellvyn (f.d. analysverktyget)`, `RaceToolbar.tsx  # Lista/Tabell, Sortera, Filter`; under `lib/` add `raceView.ts  # Rader, sortering, filter, ?hast= för loppvyn`, `raceTypes.ts`, `horseDetail.ts`, `prefs.ts`.
- Under "Nyckelalgorithmer → Analysverktyget" rename the heading to "Tabellvyn – `components/RaceTable.tsx`" and describe the 7 standard columns.
- In the "Filer att känna till vid ändringar" table change "Nytt fält på hästkort | `components/HorseCard.tsx`" to "Nytt fält i detaljvyn | `components/HorseDetail.tsx`, `lib/raceView.ts`".

- [ ] **Step 3: Verify glossary anchors still match and commit**

Run: `npx jest lib/__tests__/glossary.test.ts`
Expected: PASS

```bash
git add MANUAL.md CLAUDE.md
git commit -m "Manual: loppvyn med lista, tabell och detaljvy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: PR 2 checkpoint**

Stop and ask the user whether to push and open PR 2 ("Designgrund del 2: loppvyn"). Push/PR only on yes.

---

## Del 3 – Systembyggaren (PR 3)

### Task 14: Systemet utan eget läge

**Files:**
- Create: `lib/systemSummary.ts`
- Modify: `components/MainPageClient.tsx`, `app/(authenticated)/page.tsx` (ta bort `systemMode`-param)
- Test: `lib/__tests__/systemSummary.test.ts`

**Interfaces:**
- Consumes: `formatRowCost` (`lib/atg`), `SystemSelection` (`lib/types`).
- Produces: `computeTotalRows(selections: SystemSelection[]): number`; `interface SystemSummary { rows: number; done: number; total: number; complete: boolean; costText: string | null; headline: string; hint: string }`; `summarizeSystem(selections: SystemSelection[], raceCount: number, gameType: string | null): SystemSummary`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/systemSummary.test.ts
import { computeTotalRows, summarizeSystem } from "../systemSummary";
import type { SystemSelection } from "../types";

const sel = (race: number, n: number): SystemSelection => ({
  race_number: race, horses: Array.from({ length: n }, (_, i) => ({ horse_id: `${race}-${i}`, start_number: i + 1, horse_name: "" })),
});

describe("summarizeSystem", () => {
  it("komplett system: rader och kostnad", () => {
    const s = summarizeSystem([sel(1, 3), sel(2, 1), sel(3, 2), sel(4, 2), sel(5, 3), sel(6, 1), sel(7, 1), sel(8, 4)], 8, "V85");
    expect(s).toMatchObject({ rows: 144, done: 8, total: 8, complete: true, costText: "72 kr" });
    expect(s.headline).toBe("144 rader · 72 kr");
    expect(s.hint).toBe("Alla avdelningar klara");
  });
  it("ofullständigt system", () => {
    const s = summarizeSystem([sel(1, 2), sel(3, 1)], 8, "V85");
    expect(s).toMatchObject({ complete: false, costText: null, headline: "2 av 8 avd" });
    expect(s.hint).toBe("Välj minst en häst i varje avdelning");
  });
  it("en rad i singular och tomt system", () => {
    expect(summarizeSystem([sel(1, 1)], 1, "V85").headline).toBe("1 rad · 0,50 kr");
    expect(summarizeSystem([], 8, "V85")).toMatchObject({ rows: 0, done: 0, headline: "0 av 8 avd" });
  });
  it("computeTotalRows som förut", () => {
    expect(computeTotalRows([])).toBe(0);
    expect(computeTotalRows([sel(1, 2), sel(2, 3)])).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/systemSummary.test.ts`
Expected: FAIL with "Cannot find module '../systemSummary'"

- [ ] **Step 3: Write `lib/systemSummary.ts`**

```ts
import { formatRowCost } from "./atg";
import type { SystemSelection } from "./types";

export function computeTotalRows(selections: SystemSelection[]): number {
  if (selections.length === 0) return 0;
  return selections.reduce((acc, s) => acc * Math.max(s.horses.length, 1), 1);
}

export interface SystemSummary {
  rows: number;
  done: number;
  total: number;
  complete: boolean;
  costText: string | null;
  headline: string;
  hint: string;
}

export function summarizeSystem(selections: SystemSelection[], raceCount: number, gameType: string | null): SystemSummary {
  const done = selections.filter((s) => s.horses.length > 0).length;
  const rows = computeTotalRows(selections);
  const complete = raceCount > 0 && done === raceCount;
  const costText = complete ? formatRowCost(rows, gameType ?? "") : null;
  return {
    rows,
    done,
    total: raceCount,
    complete,
    costText,
    headline: complete ? `${rows} ${rows === 1 ? "rad" : "rader"} · ${costText}` : `${done} av ${raceCount} avd`,
    hint: complete ? "Alla avdelningar klara" : "Välj minst en häst i varje avdelning",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/systemSummary.test.ts`
Expected: PASS. If `formatRowCost(1, "V85")` returns `"0,50 kr"` the singular test passes; if it returns `"0,5 kr"`, keep `formatRowCost` unchanged and fix the test expectation (ruling: cost format is owned by `lib/atg.ts`).

- [ ] **Step 5: Remove system mode from `MainPageClient.tsx`**

- Delete `systemMode`/`setSystemMode` state, `initialSystemMode` prop, `handleActivateSystemMode`, the "Bygg system" button block and the local `computeTotalRows` (import it from `@/lib/systemSummary`).
- Draft autosave effect: replace `if (!systemMode || !gameId) return` with `if (!gameId || systemSelections.length === 0) return` and the dependency array `[systemSelections, systemMode]` with `[systemSelections]`.
- Load drafts on mount instead of on activation:

```tsx
  useEffect(() => {
    if (!gameId) return
    getUserDraftsForGame(gameId).then(setSavedDrafts).catch(() => {})
  }, [gameId])
```

- Rename `exitSystemMode` to `clearSystem` (body: `setSystemSelections([]); setActiveDraftId(null); setShowDrawer(false); setConfirmCancel(false); setDraftSaveStatus('idle')`), `handleCancelSystemMode` to `handleClear`, and in `SaveSystemDialog`'s `onSaved` drop `setSystemMode(false)`.
- Pass `canSelect` as `true` to `RaceList`.
- Replace `{systemMode && (…)}` guards around `SystemSidebar`, the mobile bar and `SystemDrawer` with `{gameId && races.length > 0 && (…)}` for the sidebar and drawer, and `{systemSelections.length > 0 && (…)}` for the mobile bar (the bar itself is replaced in Task 15).
- Change `<div className={systemMode ? "md:pr-[320px]" : ""}>` to `<div className="flex flex-wrap gap-6 items-start"><div style={{ flex: "999 1 560px", minWidth: 0 }}>` … close it after `RaceList`/empty state, render `SystemSidebar` as the second flex child (Task 15 restyles it), then close the outer `</div>`.

In `app/(authenticated)/page.tsx` remove `initialSystemMode` (the `systemMode` search param and the prop). Keep `groupId` (`initialGroupId`).

- [ ] **Step 6: Verify and commit**

Run: `npx jest > .superpowers/t14.log 2>&1; tail -5 .superpowers/t14.log && npx tsc --noEmit && npm run lint`
Expected: all pass.

```bash
git add lib/systemSummary.ts lib/__tests__/systemSummary.test.ts components/MainPageClient.tsx "app/(authenticated)/page.tsx"
git commit -m "System: inget eget läge — ett tryck på numret lägger hästen i systemet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Systemfält, kupong och sidopanel

**Files:**
- Create: `components/SystemBar.tsx`
- Modify: `components/SystemDrawer.tsx` (helt), `components/SystemSidebar.tsx` (helt), `components/MainPageClient.tsx`, `MANUAL.md` (6.4)
- Test: `lib/__tests__/systemUi.test.tsx`

**Interfaces:**
- Consumes: `summarizeSystem`, `SystemSummary` (Task 14); `Sheet`, `Button`, `StartNumber`, `Badge` (Task 4–5).
- Produces:
  - `SystemBar({ summary: SystemSummary; draftStatus: "idle" | "saving" | "saved" | "error"; onOpen: () => void })`
  - `SystemDrawer({ open; onClose; races: RaceInfo[]; selections; onToggleHorse; onSave; onClear; summary: SystemSummary; draftName: string; onDraftNameChange: (s: string) => void; draftStatus; savedDrafts: GameSystem[]; onLoadDraft: (d: GameSystem) => void })`
  - `SystemSidebar({ races: RaceInfo[]; selections; onSave; onClear; summary: SystemSummary; draftName: string; draftStatus })`
  - `RaceInfo` stays `{ id; race_number; distance; start_method; starters: { horse_id; start_number; horses: { name } | null }[] }`.

- [ ] **Step 1: Write the failing test**

```tsx
// lib/__tests__/systemUi.test.tsx
import { renderToStaticMarkup as html } from "react-dom/server";
import { SystemBar } from "@/components/SystemBar";
import { SystemSidebar } from "@/components/SystemSidebar";
import { summarizeSystem } from "@/lib/systemSummary";

const races = [1, 2].map((n) => ({ id: `r${n}`, race_number: n, distance: 2140, start_method: "auto",
  starters: [1, 2, 3].map((s) => ({ horse_id: `${n}-${s}`, start_number: s, horses: { name: `H${s}` } })) }));
const selections = [{ race_number: 1, horses: [{ horse_id: "1-2", start_number: 2, horse_name: "H2" }] }];

describe("SystemBar", () => {
  it("visar rubrik, ledtext och Visa", () => {
    const out = html(<SystemBar summary={summarizeSystem(selections, 2, "V85")} draftStatus="idle" onOpen={() => {}} />);
    expect(out).toContain("Ditt system · 1 av 2 avd");
    expect(out).toContain("Välj minst en häst i varje avdelning");
    expect(out).toContain(">Visa<");
  });
  it("visar fel när utkastet inte gick att spara", () => {
    expect(html(<SystemBar summary={summarizeSystem(selections, 2, "V85")} draftStatus="error" onOpen={() => {}} />))
      .toContain("Kunde inte spara utkastet");
  });
});

describe("SystemSidebar", () => {
  it("tomt läge och valda nummer", () => {
    expect(html(<SystemSidebar races={races} selections={[]} onSave={() => {}} onClear={() => {}} summary={summarizeSystem([], 2, "V85")} draftName="Utkast" draftStatus="idle" />))
      .toContain("Tryck på ett nummer för att lägga hästen i systemet");
    const out = html(<SystemSidebar races={races} selections={selections} onSave={() => {}} onClear={() => {}} summary={summarizeSystem(selections, 2, "V85")} draftName="Utkast" draftStatus="saved" />);
    expect(out).toContain("Avd 1");
    expect(out).toMatch(/Spara system<\/button>/);
    expect(out).toContain("disabled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/systemUi.test.tsx`
Expected: FAIL with "Cannot find module '@/components/SystemBar'"

- [ ] **Step 3: Write `components/SystemBar.tsx`**

```tsx
"use client";

import type { SystemSummary } from "@/lib/systemSummary";

/** Fältet ovanför menyn på mobil. Inverterade färger så att det syns i båda teman. */
export function SystemBar({ summary, draftStatus, onOpen }: {
  summary: SystemSummary;
  draftStatus: "idle" | "saving" | "saved" | "error";
  onOpen: () => void;
}) {
  return (
    <div className="fixed left-3 right-3 z-50 md:hidden flex items-center gap-3"
      style={{ bottom: "calc(66px + max(16px, env(safe-area-inset-bottom)))", padding: "10px 10px 10px 16px",
        background: "var(--ink)", color: "var(--bg)", borderRadius: "var(--radius-lg)" }}>
      <div className="flex-1 min-w-0 flex flex-col">
        <span style={{ font: "600 15px/20px var(--font-sans)" }}>{`Ditt system · ${summary.headline}`}</span>
        <span style={{ font: "400 12px/16px var(--font-sans)", opacity: 0.85 }}>
          {draftStatus === "error" ? "Kunde inte spara utkastet" : summary.hint}
        </span>
      </div>
      <button type="button" onClick={onOpen}
        style={{ height: 36, padding: "0 14px", borderRadius: "var(--radius-md)", background: "var(--bg)", color: "var(--ink)",
          border: 0, font: "500 14px/20px var(--font-sans)", cursor: "pointer" }}>
        Visa
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `components/SystemSidebar.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui";
import type { SystemSelection } from "@/lib/types";
import type { SystemSummary } from "@/lib/systemSummary";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: { horse_id: string; start_number: number; horses: { name: string } | null }[];
}

const STATUS = { idle: "", saving: "Sparar utkast …", saved: "Utkastet är sparat", error: "Kunde inte spara utkastet" } as const;

/** Systemet på dator: alltid synligt bredvid loppet. */
export function SystemSidebar({ races, selections, onSave, onClear, summary, draftName, draftStatus }: {
  races: RaceInfo[];
  selections: SystemSelection[];
  onSave: () => void;
  onClear: () => void;
  summary: SystemSummary;
  draftName: string;
  draftStatus: keyof typeof STATUS;
}) {
  const empty = selections.length === 0;
  return (
    <aside aria-label="Ditt system" className="ta-card hidden md:flex flex-col" style={{ flex: "1 1 300px", maxWidth: 360, minWidth: 0, position: "sticky", top: 80 }}>
      <div className="flex flex-col gap-0.5" style={{ padding: "16px 16px 8px" }}>
        <h2 className="ta-section-title">Ditt system</h2>
        <span style={{ font: "400 13px/18px var(--font-sans)", color: draftStatus === "error" ? "var(--danger)" : "var(--ink-muted)" }}>
          {[draftName, STATUS[draftStatus]].filter(Boolean).join(" · ")}
        </span>
      </div>
      {empty ? (
        <p style={{ margin: 0, padding: "12px 16px 16px", color: "var(--ink-muted)", font: "400 14px/20px var(--font-sans)" }}>
          Tryck på ett nummer för att lägga hästen i systemet.
        </p>
      ) : (
        races.map((r) => {
          const nums = (selections.find((s) => s.race_number === r.race_number)?.horses ?? []).map((h) => h.start_number).sort((a, b) => a - b);
          return (
            <div key={r.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "52px minmax(0,1fr)", padding: "8px 16px", borderTop: "1px solid var(--line)" }}>
              <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>{`Avd ${r.race_number}`}</span>
              <span className="flex flex-wrap gap-1">
                {nums.length === 0 ? <span style={{ color: "var(--ink-muted)", font: "400 13px/18px var(--font-sans)" }}>Ingen vald</span> : nums.map((n) => (
                  <span key={n} style={{ minWidth: 28, height: 28, padding: "0 4px", boxSizing: "border-box", borderRadius: "var(--radius-sm)", display: "inline-grid",
                    placeItems: "center", background: "var(--accent)", color: "var(--on-accent)", font: "600 13px/1 var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                ))}
              </span>
            </div>
          );
        })
      )}
      <div className="flex flex-col gap-3" style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
        <div className="flex justify-between items-baseline">
          <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.complete ? `${summary.rows} ${summary.rows === 1 ? "rad" : "rader"}` : summary.headline}</span>
          <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.costText ?? "–"}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClear} disabled={empty}>Rensa</Button>
          <Button variant="primary" onClick={onSave} disabled={!summary.complete} style={{ flex: 1 }}>Spara system</Button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Rewrite `components/SystemDrawer.tsx`**

```tsx
"use client";

import { Badge, Button, Sheet, StartNumber } from "@/components/ui";
import type { GameSystem, SystemHorse, SystemSelection } from "@/lib/types";
import type { SystemSummary } from "@/lib/systemSummary";

interface RaceInfo {
  id: string;
  race_number: number;
  distance: number;
  start_method: string | null;
  starters: { horse_id: string; start_number: number; horses: { name: string } | null }[];
}

const STATUS = { idle: "", saving: "Sparar utkast …", saved: "Utkastet sparas automatiskt", error: "Kunde inte spara utkastet" } as const;

/** Kupongen på mobil: alla avdelningar med nummer att trycka på. */
export function SystemDrawer({
  open, onClose, races, selections, onToggleHorse, onSave, onClear, summary, draftName, onDraftNameChange, draftStatus, savedDrafts, onLoadDraft,
}: {
  open: boolean; onClose: () => void; races: RaceInfo[]; selections: SystemSelection[];
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void; onSave: () => void; onClear: () => void;
  summary: SystemSummary; draftName: string; onDraftNameChange: (s: string) => void; draftStatus: keyof typeof STATUS;
  savedDrafts: GameSystem[]; onLoadDraft: (d: GameSystem) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Ditt system" wide
      footer={
        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-between items-baseline">
            <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.complete ? `${summary.rows} ${summary.rows === 1 ? "rad" : "rader"}` : summary.headline}</span>
            <span style={{ font: "600 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{summary.costText ?? "–"}</span>
          </div>
          <span style={{ font: "400 13px/18px var(--font-sans)", color: draftStatus === "error" ? "var(--danger)" : "var(--ink-muted)" }}>
            {[summary.hint, STATUS[draftStatus]].filter(Boolean).join(" · ")}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClear} disabled={selections.length === 0} style={{ flex: 1 }}>Rensa</Button>
            <Button variant="primary" onClick={onSave} disabled={!summary.complete} style={{ flex: 2 }}>Spara system</Button>
          </div>
        </div>
      }>
      <div className="flex flex-col gap-1.5 mb-4">
        <label htmlFor="system-name" className="ta-field-label">Namn</label>
        <input id="system-name" className="ta-field" value={draftName} maxLength={80} onChange={(e) => onDraftNameChange(e.target.value)} />
      </div>
      <div className="ta-card" style={{ overflow: "hidden" }}>
        {races.map((r, i) => {
          const picked = selections.find((s) => s.race_number === r.race_number)?.horses ?? [];
          const isPicked = (id: string) => picked.some((h) => h.horse_id === id);
          return (
            <div key={r.id} className="flex flex-col gap-2.5" style={{ padding: "12px 16px", borderTop: i === 0 ? 0 : "1px solid var(--line)" }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ font: "600 15px/20px var(--font-sans)" }}>{`Avdelning ${r.race_number}`}</span>
                <span className="flex items-center gap-2">
                  {picked.length === 1 && <Badge>Spik</Badge>}
                  <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--ink-muted)" }}>
                    {picked.length === 0 ? "Ingen vald" : `${picked.length} ${picked.length === 1 ? "häst" : "hästar"}`}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...r.starters].sort((a, b) => a.start_number - b.start_number).map((s) => (
                  <StartNumber key={s.horse_id} number={s.start_number} state={isPicked(s.horse_id) ? "selected" : "idle"}
                    label={`${isPicked(s.horse_id) ? "Ta bort" : "Lägg till"} nr ${s.start_number} ${s.horses?.name ?? ""} i avdelning ${r.race_number}`}
                    onClick={() => onToggleHorse(r.race_number, { horse_id: s.horse_id, start_number: s.start_number, horse_name: s.horses?.name ?? "" })} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {savedDrafts.length > 0 && (
        <>
          <h3 className="ta-sheet-sub">Mina utkast</h3>
          {savedDrafts.map((d) => (
            <button key={d.id} type="button" onClick={() => onLoadDraft(d)} className="w-full text-left py-2"
              style={{ background: "none", border: 0, borderTop: "1px solid var(--line)", cursor: "pointer", font: "400 15px/22px var(--font-sans)", color: "var(--ink)" }}>
              {d.name}
              <span style={{ color: "var(--ink-muted)" }}>{` · ${d.total_rows} rader · ${new Date(d.created_at).toLocaleDateString("sv-SE")}`}</span>
            </button>
          ))}
        </>
      )}
    </Sheet>
  );
}
```

- [ ] **Step 6: Wire everything in `MainPageClient.tsx`**

Add imports `import { SystemBar } from '@/components/SystemBar'` and `import { summarizeSystem } from '@/lib/systemSummary'`; compute `const summary = summarizeSystem(systemSelections, races.length, gameType)` (replace `totalRows`/`completedRaces` uses: `summary.rows`, `summary.done`). Replace the old fixed mobile bar block with:

```tsx
      {systemSelections.length > 0 && (
        <SystemBar summary={summary} draftStatus={draftSaveStatus} onOpen={() => setShowDrawer(true)} />
      )}
```

Replace the `SystemSidebar` and `SystemDrawer` elements with:

```tsx
        <SystemSidebar races={races} selections={systemSelections} onSave={handleOpenSaveDialog} onClear={handleClear}
          summary={summary} draftName={draftName} draftStatus={draftSaveStatus} />
```

```tsx
      <SystemDrawer open={showDrawer} onClose={() => setShowDrawer(false)} races={races} selections={systemSelections}
        onToggleHorse={handleToggleHorse} onSave={handleOpenSaveDialog} onClear={handleClear} summary={summary}
        draftName={draftName} onDraftNameChange={setDraftName} draftStatus={draftSaveStatus}
        savedDrafts={savedDrafts} onLoadDraft={handleLoadDraft} />
```

Pass `totalRows={summary.rows}` to `SaveSystemDialog` and keep the `ConfirmDialog` text, replacing `completedRaces` with `summary.done` and `totalRows` with `summary.rows`. Give the content wrapper bottom padding on mobile when the bar shows: `style={{ paddingBottom: systemSelections.length > 0 ? 88 : 0 }}` on the outer flex `div` (md and up has no bar).

- [ ] **Step 7: Update MANUAL.md section 6.4**

Replace `### 6.4 Systembyggaren` through the end of `#### Se dina system` with:

```markdown
### 6.4 Systembyggaren

Du behöver inte starta något läge. Tryck på ett **startnummer** i listan, tabellen eller detaljvyn så hamnar hästen i ditt system.

- **På telefonen** visas ett fält ovanför menyn: **Ditt system · 144 rader · 72 kr**, eller hur många avdelningar som är klara. Tryck på **Visa** för kupongen, där du ser alla avdelningar, kan trycka på nummer, namnge systemet och öppna tidigare utkast. En avdelning med bara en häst får märket **Spik**.
- **På datorn** ligger systemet alltid i en panel till höger.

Systemet sparas automatiskt som utkast medan du bygger. **Spara system** går att trycka på när alla avdelningar har minst en häst. **Rensa** tömmer systemet efter att du bekräftat.

#### Se dina system

Sparade system finns under **System** i menyn och, om du valt ett sällskap, under sällskapets flik **Spel**.
```

Update the table-of-contents entry for 6.4 if its text changed.

- [ ] **Step 8: Verify and commit**

Run: `npx jest > .superpowers/t15.log 2>&1; tail -5 .superpowers/t15.log && npx tsc --noEmit && npm run lint && npm run build > .superpowers/t15-build.log 2>&1; tail -15 .superpowers/t15-build.log`
Expected: all pass, build succeeds. In `npm run dev` at 390 px: tapping a number shows the bar; "Visa" opens the kupong; "Spara system" is disabled until all races have a horse; "Rensa" asks first. At 1440 px the sidebar sits to the right of the race.

```bash
git add -A components lib MANUAL.md
git commit -m "System: systemfält, kupong och sidopanel enligt designgrunden

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Designsystemet i Claude Design följer med

**Files:**
- Modify (artifact, not repo): https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz — `project/components/src/index.tsx`, `project/components/bundle.js`, `project/components/bundle.css`, `project/components/index.d.ts`, `project/components/SegmentedControl/{README.md,preview.html}`, `project/components/Sheet/{README.md,preview.html}`, `project/design-system.json`

**Interfaces:**
- Consumes: `components/ui/SegmentedControl.tsx`, `components/ui/Sheet.tsx` (Task 4–5) as the source.

- [ ] **Step 1: Read the live files**

Artifact `read` with `paths` for the files above (and `project/design-system.json`). Build on the returned versions, never older copies.

- [ ] **Step 2: Add the two components**

Add `SegmentedControl` and `Sheet` (without `createPortal` — the preview frame renders inline) to `src/index.tsx` with the same props as the app; add `.ta-seg*`, `.ta-chip`, `.ta-sheet-head`, `.ta-sheet-wide` and the `@media (min-width: 768px)` sheet rules to `bundle.css`; add their types to `index.d.ts`; add both names to the bundle header; rebuild `bundle.js` with esbuild exactly as before (`--format=iife --global-name=__Travappen --jsx-factory=React.createElement --jsx-fragment=React.Fragment --minify`, then append `window.Travappen=Object.assign(window.Travappen||{},__Travappen);`). Write a README and preview per component (preview line 1: `<!-- @dsCard group="Navigering" height=80 -->` for SegmentedControl, `<!-- @dsCard group="Förklaringar" height=320 -->` for Sheet with `inline` content).

- [ ] **Step 3: Publish**

One Artifact publish to the system's url with only the changed `project/` files (`.tsx`/`.d.ts` as `text/plain`), and `project/design-system.json` last with `lastChange` `{ by: "Rikard", via: "Claude Code", note: "SegmentedControl och Sheet från appen" }`.

- [ ] **Step 4: Final whole-branch review and finish**

Run the executing-plans final review over `git merge-base main HEAD..HEAD`, fix Critical/Important findings with RED→GREEN tests, then ask the user about pushing PR 3 ("Designgrund del 3: systembyggaren").
