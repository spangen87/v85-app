# Grundchans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygga "Grundchans", en odds-fri kalibrerad vinstsannolikhet (conditional logit) som visas i analysverktyget, på hästkortet och på utvärderingssidan.

**Architecture:**
- Allt räknas i rena funktioner i `lib/fundamental/`, med samma kod i appen, fetch-routen, omräkningen och träningsskriptet.
- Indata går via två adaptrar till neutrala typer: en från databasraderna (appen) och en från ATG:s JSON (träningen).
- Vikter och banpar ligger i `lib/data/fundamental-model.json`. Filen genereras av `scripts/fit-fundamental.ts`, som tränar på ett års ATG-data.
- Loppvyn räknar live i webbläsaren. En kopia (`starters.fundamental_p`) sparas vid hämtning och omräkning, och utvärderingssidan läser den.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Supabase, Jest + ts-jest, tsx för skript. Inga nya beroenden.

**Spec:** `docs/superpowers/specs/2026-10-03-grundchans-design.md` (läs den först, den är normativ). Bakgrund i issue #93.

## Global Constraints

- All UI-text är på svenska.
- Inga nya npm-beroenden. Optimeringen (L-BFGS) skrivs i ren TypeScript.
- Grundchans får aldrig använda `odds`, `p_odds` eller `bet_distribution` som indata. De används bara för att avgöra om en häst är struken: en häst är struken när fältet har marknadsdata men hästen saknar både odds > 0 och streck > 0.
- Faktorlistan, definitionerna och reservvärdena följer specens avsnitt 3.2–3.4 exakt.
- Träningsskriptet vägrar skriva modellfilen om testdelens pseudo-R² < 0,19, om inte `--force` anges.
- UI-texter får inte påstå spelvärde. Tooltipen för "Oense" ska vara exakt: "Grundchans (utan odds/streck) och spelarna bedömer hästen olika — inte ett bevisat spelvärde."
- `.cache/` checkas aldrig in.
- MANUAL.md och CLAUDE.md uppdateras enligt projektets konventioner (CLAUDE.md, avsnittet "Konventioner").
- Branch: `claude/grundchans-r8m3tx`. Commit-meddelanden slutar med `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Kör tester med `npx jest lib/__tests__/<fil>`, typkontroll med `npx tsc --noEmit -p .` och lint med `npx eslint <filer>`.

## Review Focus

1. **Innan poolen öppnat:** alla hästar saknar odds och streck. Ingen ska då behandlas som struken, och Grundchans ska visas för alla (test i Task 6).
2. **Häst helt utan historik eller statistik (debutant):** ska få ett ändligt p med reservvärden, inte NaN (test i Task 3).
3. **Historik som innehåller själva loppet:** äldre rader från hästkortets route kan ha starter på loppdatumet. Sådana poster ska ignoreras i faktorberäkningen (test i Task 2).
4. **Modellfilen är fortfarande `untrained`:** fetch-routen och UI ska då visa "–" eller null, inte en likformig fördelning som ser ut som en prognos (test i Task 6).
5. **Lopp med 1 startande eller tom avdelning:** p är null, ingen division med noll och ingen krasch (test i Task 3).

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `supabase/migration_v14_fundamental.sql` (ny) | Nya kolumner |
| `lib/atg.ts` (ändras) | Tolkar nya fält, kusk i historiken, exporterar hjälpfunktioner |
| `lib/fundamental/features.ts` (ny) | Indatatyper, faktorlista, hastighetssiffra, råa faktorer |
| `lib/fundamental/model.ts` (ny) | Standardisering, softmax, `computeFundamental`, etiketter, "Oense" |
| `lib/fundamental/fit.ts` (ny) | Conditional logit: målfunktion, L-BFGS, mått, banpar-skattning |
| `lib/fundamental/atgAdapter.ts` (ny) | ATG-JSON → indatatyper (för träningen) |
| `lib/fundamental/dbAdapter.ts` (ny) | DB-rader → indatatyper, strukna hästar, `computeFundamentalForRows` |
| `lib/fundamental/recompute.ts` (ny) | Beräknar vilka rader som behöver nytt `fundamental_p` (skript + adminroute) |
| `lib/fundamental/index.ts` (ny) | Återexporter (`@/lib/fundamental`) |
| `lib/data/fundamental-model.json` (ny, genereras) | Modellen |
| `lib/evaluation.ts` (ny) | `computeEvaluation`, utflyttad från utvärderingssidan och utökad |
| `scripts/fit-fundamental.ts` (ny) | Hämtar ATG-år till cache, tränar, rapporterar och skriver modellen |
| `scripts/backfill-history.ts`, `scripts/recompute-formscore.ts`, `app/api/admin/recompute-formscore/route.ts`, `app/api/games/fetch/route.ts` (ändras) | Nya fält och `fundamental_p` |
| `app/(authenticated)/page.tsx`, `components/RaceList.tsx`, `components/AnalysisPanel.tsx`, `components/HorseCard.tsx` (ändras) | UI |
| `app/(authenticated)/evaluation/page.tsx`, `components/EvaluationPanel.tsx` (ändras) | Utvärdering |
| `MANUAL.md`, `CLAUDE.md`, `.gitignore`, `package.json`, `supabase/schema.sql` (ändras) | Dokumentation och konfiguration |

---

### Task 1: Migration och nya fält från ATG

**Files:**
- Create: `supabase/migration_v14_fundamental.sql`
- Modify: `supabase/schema.sql` (sist i filen)
- Modify: `lib/atg.ts` (`HorseStart`, `AtgStarter`, `AtgRace`, `parseHistoryRecord`, `parseGame`, `winPct`)
- Modify: `app/api/games/fetch/route.ts` (races-upsert och `starterRows`)
- Test: `lib/__tests__/atg.test.ts`

**Interfaces:**
- Produces:
  - `parseFirstPrize(prizeText: unknown): number | null`
  - `detectBreed(terms: unknown): "V" | "K"`
  - `normalizeLifeRecords(records: Record<string, unknown>[]): LifeRecord[]`
  - `winPct(personStats: Record<string, unknown>, year: string): number | null` (exporteras nu)
  - `HorseStart.driver?: string | null`
  - `AtgStarter.start_distance?: number | null`, `AtgStarter.start_points?: number | null`
  - `AtgRace.first_prize: number | null`, `AtgRace.breed: "V" | "K"`

- [ ] **Step 1: Skriv de fallerande testerna.** Lägg till i `lib/__tests__/atg.test.ts`. Utöka importen och lägg till blocken:

```ts
import {
  detectBreed,
  normalizeLifeRecords,
  parseFirstPrize,
  parseGameResults,
  parseHistoryRecord,
  parseHistoryRecords,
  splitInternalRaceId,
} from "../atg";

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
```

Uppdatera dessutom det befintliga `toEqual`-testet "översätter en vanlig start" så att det förväntade objektet innehåller `driver: null`.

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/atg.test.ts` ska ge FAIL med "parseFirstPrize is not a function" och "driver" saknas i objektet.

- [ ] **Step 3: Implementera i `lib/atg.ts`.**

1. I `HorseStart`, efter `first_prize`:
```ts
  /** Kuskens namn i starten (för "kuskbyte") */
  driver?: string | null;
```
2. I `AtgStarter`, efter `bet_distribution`:
```ts
  /** Hästens faktiska distans inkl. tillägg (m) */
  start_distance?: number | null;
  /** ATG:s startpoäng (form senaste starterna) */
  start_points?: number | null;
```
3. I `AtgRace`, efter `start_method`:
```ts
  /** Förstapris i kr, tolkat ur pristexten — mått på klass */
  first_prize: number | null;
  /** "K" = kallblod, "V" = varmblod */
  breed: "V" | "K";
```
4. Lägg till direkt efter `formatTime`:
```ts
/** "Pris: 80.000-40.000-…" → 80000 (kr). Null om texten saknar pris. */
export function parseFirstPrize(prizeText: unknown): number | null {
  const m = /Pris:\s*([\d.]+)/.exec(String(prizeText ?? ""));
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Kallblod om loppvillkoren nämner det, annars varmblod */
export function detectBreed(terms: unknown): "V" | "K" {
  const text = Array.isArray(terms) ? terms.join(" ") : String(terms ?? "");
  return text.toLowerCase().includes("kallblod") ? "K" : "V";
}

/** ATG:s statistics.life.records → LifeRecord[] (poster utan startmetod/distans hoppas över) */
export function normalizeLifeRecords(records: Record<string, unknown>[]): LifeRecord[] {
  return (records ?? [])
    .filter((r) => r["startMethod"] && r["distance"])
    .map((r) => ({
      start_method: String(r["startMethod"]),
      distance: String(r["distance"]),
      place: Number(r["place"] ?? 99),
      time: formatTime(r["time"] as Record<string, number>),
    }));
}
```
5. I `parseHistoryRecord`: läs kusken och lägg till fältet i retur-objektet efter `first_prize`:
```ts
  const driverRaw = (start["driver"] as Record<string, unknown>) ?? {};
  const driverName = `${driverRaw["firstName"] ?? ""} ${driverRaw["lastName"] ?? ""}`.trim();
```
```ts
    driver: driverName || null,
```
6. Ändra `function winPct(` till `export function winPct(`.
7. I `parseGame`:
   - Ersätt hela uttrycket `const normalizedRecords: LifeRecord[] = lifeRecords.filter(...).map(...)` med `const normalizedRecords = normalizeLifeRecords(lifeRecords);`.
   - I starter-objektet, efter `bet_distribution: betDistribution,`:
```ts
        start_distance: s["distance"] != null ? Number(s["distance"]) : null,
        start_points: life["startPoints"] != null ? Number(life["startPoints"]) : null,
```
   - I race-objektet, efter `start_method: startMethod,`:
```ts
      first_prize: parseFirstPrize(race["prize"]),
      breed: detectBreed(race["terms"]),
```

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/atg.test.ts` ska ge PASS.

- [ ] **Step 5: Skapa migrationen** `supabase/migration_v14_fundamental.sql`:
```sql
-- Migration v14: Grundchans (odds-fri vinstsannolikhet), se issue #93.
-- Nya rådata från ATG som modellen behöver + sparad Grundchans för utvärderingen.

alter table races add column if not exists first_prize integer;      -- förstapris i kr (klass)
alter table races add column if not exists breed text;               -- 'V' varmblod, 'K' kallblod

alter table starters add column if not exists start_distance integer;      -- distans inkl. tillägg
alter table starters add column if not exists start_points integer;        -- ATG:s startpoäng
alter table starters add column if not exists fundamental_p double precision;   -- Grundchans 0–1
alter table starters add column if not exists fundamental_version text;         -- modellversion
```
Lägg samma rader sist i `supabase/schema.sql` som kommentarer under rubriken `-- Migration v14 (Grundchans)`, enligt filens befintliga mönster.

- [ ] **Step 6: Spara fälten i fetch-routen** (`app/api/games/fetch/route.ts`).
   - I `supabase.from("races").upsert({...})`, efter `start_method: race.start_method,`:
```ts
        first_prize: race.first_prize,
        breed: race.breed,
```
   - I `starterRows`, efter `bet_distribution: s.bet_distribution,`:
```ts
          start_distance: s.start_distance ?? null,
          start_points: s.start_points ?? null,
```

- [ ] **Step 7: Kör migrationen mot Supabase.** Det kräver användarens uttryckliga ok, eftersom det är produktionsdatabasen. Fråga först, kör sedan via Supabase-kopplingen (`apply_migration`, namn `v14_fundamental`, SQL enligt Step 5). Verifiera:
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name in ('races','starters')
  and column_name in ('first_prize','breed','start_distance','start_points','fundamental_p','fundamental_version');
```
Förväntat: 6 rader. Utan migrationen misslyckas skrivningarna i fetch-routen efter deploy.

- [ ] **Step 8: Typkontroll och commit.**
```bash
npx tsc --noEmit -p . && npx eslint lib/atg.ts app/api/games/fetch/route.ts lib/__tests__/atg.test.ts
git add supabase/migration_v14_fundamental.sql supabase/schema.sql lib/atg.ts app/api/games/fetch/route.ts lib/__tests__/atg.test.ts
git commit -m "Grundchans: migration v14 och nya ATG-fält (förstapris, ras, startdistans, startpoäng, kusk i historik)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Faktorer – `lib/fundamental/features.ts`

**Files:**
- Create: `lib/fundamental/features.ts`, `lib/__fixtures__/fundamental.ts` (delade testfixturer; ligger utanför `__tests__` eftersom Jest kör varje fil där som en testsvit)
- Test: `lib/__tests__/fundamental.features.test.ts`

**Interfaces:**
- Consumes: `HorseStart`, `LifeRecord` från `@/lib/atg`; `parseTimeToSeconds` från `@/lib/analysis`.
- Produces:
  - Typer: `FundamentalRace`, `FundamentalStarter`, `SpeedTables { par; par_fallback; condition_adj: Record<string, number> }`, `FactorName`, `FactorVector = Record<FactorName, number>`.
  - Konstanter: `FACTORS` (readonly array, 33 st i specens ordning), `BINARY_FACTORS: ReadonlySet<FactorName>`, `WORST_FILL_FACTORS: ReadonlySet<FactorName>`.
  - Funktioner: `distCategory(m): "short"|"medium"|"long"`, `shrink(w, n, p0, k)`, `isFaulty(h: HorseStart): boolean`, `isAmericanSulky(text: string | null | undefined): boolean`, `parKey(breed, track, startMethod, cat)`, `parFallbackKey(breed, startMethod, cat)`, `speedFigure(h, breed, tables): number | null`, `computeRawFeatures(race, starter, tables): FactorVector` (NaN = saknas).

- [ ] **Step 1: Skapa fixturerna** `lib/__fixtures__/fundamental.ts`:
```ts
/** Delade testfixturer för Grundchans (importeras av lib/__tests__/fundamental.*.test.ts) */
import type { HorseStart } from "../atg";
import type { FundamentalRace, FundamentalStarter, SpeedTables } from "../fundamental/features";

export const RACE: FundamentalRace = {
  date: "2026-09-20", distance: 2140, start_method: "auto", breed: "V", first_prize: 50000,
};

export function hist(o: Partial<HorseStart> = {}): HorseStart {
  return {
    date: "2026-09-01", track: "Solvalla", place: "1", time: "1:13,0", post_position: 3,
    galloped: false, disqualified: false, distance: 2140, start_method: "auto",
    track_condition: "light", first_prize: 50000, driver: "Kalle Kusk", ...o,
  };
}

export function starter(o: Partial<FundamentalStarter> = {}): FundamentalStarter {
  return {
    start_number: 1, post_position: 1, start_distance: 2140, horse_age: 6, horse_sex: "gelding",
    starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
    starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
    life_records: [{ start_method: "auto", distance: "medium", place: 1, time: "1:12,0" }],
    shoes_reported: true, shoes_front: true, shoes_back: true, shoes_front_changed: false, shoes_back_changed: false,
    american_sulky: false, driver: "Kalle Kusk", driver_win_pct: 15, trainer_win_pct: 10, start_points: 900,
    history: [], ...o,
  };
}

export const TABLES: SpeedTables = {
  par: { "V|Solvalla|auto|medium": 73.5 },
  par_fallback: { "V|auto|medium": 74.0, "V|volte|medium": 75.0 },
  condition_adj: { light: 0, heavy: 0.7 },
};
```

Skriv sedan de fallerande testerna i `lib/__tests__/fundamental.features.test.ts`:
```ts
import {
  computeRawFeatures,
  distCategory,
  FACTORS,
  isAmericanSulky,
  isFaulty,
  shrink,
  speedFigure,
} from "../fundamental/features";
import { RACE, TABLES, hist, starter } from "../__fixtures__/fundamental";

describe("hjälpfunktioner", () => {
  it("distCategory", () => {
    expect(distCategory(1640)).toBe("short");
    expect(distCategory(1800)).toBe("short");
    expect(distCategory(2140)).toBe("medium");
    expect(distCategory(2640)).toBe("long");
  });
  it("shrink drar mot p0 när n är litet", () => {
    expect(shrink(0, 0, 0.1, 6)).toBeCloseTo(0.1);
    expect(shrink(10, 10, 0.1, 6)).toBeCloseTo(10.6 / 16);
  });
  it("isFaulty känner igen galopp och diskning", () => {
    expect(isFaulty(hist({ place: "5g" }))).toBe(true);
    expect(isFaulty(hist({ place: "d" }))).toBe(true);
    expect(isFaulty(hist({ galloped: true, place: "3" }))).toBe(true);
    expect(isFaulty(hist({ place: "3" }))).toBe(false);
  });
  it("isAmericanSulky", () => {
    expect(isAmericanSulky("Amerikansk")).toBe(true);
    expect(isAmericanSulky("Vanlig")).toBe(false);
    expect(isAmericanSulky(null)).toBe(false);
  });
});

describe("speedFigure", () => {
  it("använder banpar och underlag", () => {
    // 73,0 s/km mot par 73,5 på lätt bana → +0,5
    expect(speedFigure(hist(), "V", TABLES)).toBeCloseTo(0.5);
    // tungt underlag: 74,0 − 73,5 − 0,7 = −0,2 → +0,2
    expect(speedFigure(hist({ time: "1:14,0", track_condition: "heavy" }), "V", TABLES)).toBeCloseTo(0.2);
  });
  it("faller tillbaka på ras+metod+distans när banan saknas", () => {
    expect(speedFigure(hist({ track: "Okänd", start_method: "volte", time: "1:14,0" }), "V", TABLES)).toBeCloseTo(1.0);
  });
  it("ger null för galopp, saknad tid eller saknat par", () => {
    expect(speedFigure(hist({ place: "0g" }), "V", TABLES)).toBeNull();
    expect(speedFigure(hist({ time: "" }), "V", TABLES)).toBeNull();
    expect(speedFigure(hist(), "K", TABLES)).toBeNull();
  });
});

describe("computeRawFeatures", () => {
  it("returnerar alla 33 faktorer", () => {
    const f = computeRawFeatures(RACE, starter(), TABLES);
    expect(Object.keys(f).sort()).toEqual([...FACTORS].sort());
  });

  it("karriär och år", () => {
    const f = computeRawFeatures(RACE, starter(), TABLES);
    expect(f.log_eps).toBeCloseTo(Math.log1p(400000 / 20));
    expect(f.win_rate_life).toBeCloseTo((4 + 0.6) / 26);
    expect(f.top3_rate_life).toBeCloseTo((9 + 1.8) / 26);
    expect(f.win_rate_cy).toBeCloseTo((2 + 0.6) / 14);
    expect(f.log_starts).toBeCloseTo(Math.log1p(20));
  });

  it("rekord i rätt kategori eller NaN", () => {
    expect(computeRawFeatures(RACE, starter(), TABLES).record_cat).toBeCloseTo(-72);
    const volte = computeRawFeatures({ ...RACE, start_method: "volte" }, starter(), TABLES);
    expect(volte.record_cat).toBeNaN();
    expect(volte.record_missing).toBe(1);
  });

  it("spår: auto och volt", () => {
    expect(computeRawFeatures(RACE, starter({ post_position: 1 }), TABLES).post_inner).toBeCloseTo(1);
    expect(computeRawFeatures(RACE, starter({ post_position: 9 }), TABLES).post_2nd_row).toBe(1);
    const v = computeRawFeatures({ ...RACE, start_method: "volte" }, starter({ post_position: 8 }), TABLES);
    expect(v.post_inner).toBeCloseTo(5 / 12);
    expect(v.post_2nd_row).toBe(1);
  });

  it("skor, sulky, kön, ålder", () => {
    const f = computeRawFeatures(
      RACE,
      starter({ shoes_front: false, shoes_back: false, shoes_front_changed: true, american_sulky: true, horse_sex: "mare", horse_age: 4 }),
      TABLES
    );
    expect(f.barefoot_all).toBe(1);
    expect(f.shoes_off_change).toBe(1);
    expect(f.american_sulky).toBe(1);
    expect(f.mare).toBe(1);
    expect(f.stallion).toBe(0);
    expect(f.age_sq).toBe(4);
  });

  it("kusk- och tränarprocent blir andelar, null blir NaN", () => {
    const f = computeRawFeatures(RACE, starter({ trainer_win_pct: null }), TABLES);
    expect(f.driver_wr).toBeCloseTo(0.15);
    expect(f.trainer_wr).toBeNaN();
  });

  it("historikfaktorer", () => {
    const s = starter({
      history: [
        hist({ date: "2026-09-10", place: "2", first_prize: 100000, driver: "Annan Kusk" }),
        hist({ date: "2026-08-20", place: "5g" }),
        hist({ date: "2026-08-01", place: "1", time: "1:12,5" }),
      ],
    });
    const f = computeRawFeatures(RACE, s, TABLES);
    expect(f.form_pts).toBeCloseTo(0.35 * 7 + 0.25 * 0 + 0.18 * 10);
    expect(f.gallop_rate).toBeCloseTo(1 / 3);
    expect(f.days_since).toBe(10);
    expect(f.long_rest).toBe(0);
    expect(f.driver_changed).toBe(1);
    // figurer (nyast först): 0,5 (2:a) och 1,0 (1:a); galoppen saknar figur
    expect(f.fig_last).toBeCloseTo(0.5);
    expect(f.fig_best).toBeCloseTo(1.0);
    expect(f.fig_mean).toBeCloseTo(0.75);
    expect(f.trend).toBeNaN(); // < 3 figurer
    const meanLogPrize = (Math.log1p(100000) + 2 * Math.log1p(50000)) / 3;
    expect(f.class_drop).toBeCloseTo(meanLogPrize - Math.log1p(50000));
    expect(f.recent_money).toBeCloseTo(Math.log1p(0.5 * 100000 + 1.0 * 50000));
  });

  it("ignorerar historik från och med loppdatumet", () => {
    const f = computeRawFeatures(RACE, starter({ history: [hist({ date: "2026-09-20", place: "1" })] }), TABLES);
    expect(f.form_pts).toBeNaN();
    expect(f.fig_missing).toBe(1);
    expect(f.days_since).toBe(365);
  });

  it("utan historik: NaN-faktorer och 365 dagars vila", () => {
    const f = computeRawFeatures(RACE, starter({ history: [] }), TABLES);
    expect(f.form_pts).toBeNaN();
    expect(f.gallop_rate).toBeNaN();
    expect(f.class_drop).toBeNaN();
    expect(f.days_since).toBe(365);
    expect(f.long_rest).toBe(1);
    expect(f.recent_money).toBe(0);
  });

  it("tillägg", () => {
    expect(computeRawFeatures(RACE, starter({ start_distance: 2160 }), TABLES).handicap_m).toBe(20);
    expect(computeRawFeatures(RACE, starter({ start_distance: null }), TABLES).handicap_m).toBe(0);
  });
});
```

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.features.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Implementera `lib/fundamental/features.ts`:**
```ts
/**
 * Grundchans — faktorberäkning (se docs/superpowers/specs/2026-10-03-grundchans-design.md §3).
 *
 * Rena funktioner utan I/O: samma kod används i appen, fetch-routen,
 * omräkningen och träningsskriptet så att faktorerna räknas identiskt.
 * Odds och streck används ALDRIG här.
 */
import type { HorseStart, LifeRecord } from "@/lib/atg";
import { parseTimeToSeconds } from "@/lib/analysis";

export interface FundamentalRace {
  /** ISO-datum för loppet (YYYY-MM-DD) */
  date: string;
  distance: number;
  start_method: string;
  breed: "V" | "K";
  /** Förstapris i kr, null om okänt */
  first_prize: number | null;
}

export interface FundamentalStarter {
  start_number: number;
  post_position: number;
  start_distance: number | null;
  horse_age: number | null;
  horse_sex: string | null;
  starts_total: number;
  wins_total: number;
  places_2nd: number;
  places_3rd: number;
  /** Intjänat i kr */
  earnings_total: number;
  starts_current_year: number;
  wins_current_year: number;
  places_2nd_current_year: number;
  places_3rd_current_year: number;
  life_records: LifeRecord[];
  shoes_reported: boolean;
  shoes_front: boolean;
  shoes_back: boolean;
  shoes_front_changed: boolean;
  shoes_back_changed: boolean;
  american_sulky: boolean;
  driver: string | null;
  /** Procent (t.ex. 15 = 15 %) */
  driver_win_pct: number | null;
  trainer_win_pct: number | null;
  start_points: number | null;
  /** Senaste starterna, nyast först */
  history: HorseStart[];
}

export const FACTORS = [
  "log_eps", "win_rate_life", "top3_rate_life", "win_rate_cy", "top3_rate_cy",
  "record_cat", "record_missing", "age", "age_sq", "stallion", "mare", "log_starts",
  "post_inner", "post_2nd_row", "barefoot_all", "shoes_off_change", "american_sulky",
  "driver_wr", "trainer_wr", "fig_best", "fig_mean", "fig_last", "fig_missing",
  "form_pts", "gallop_rate", "days_since", "long_rest", "class_drop", "handicap_m",
  "driver_changed", "start_points", "trend", "recent_money",
] as const;

export type FactorName = (typeof FACTORS)[number];
export type FactorVector = Record<FactorName, number>;

/** Binära faktorer centreras inom fältet i stället för att z-poängsättas */
export const BINARY_FACTORS: ReadonlySet<FactorName> = new Set<FactorName>([
  "record_missing", "stallion", "mare", "post_2nd_row", "barefoot_all", "shoes_off_change",
  "american_sulky", "fig_missing", "long_rest", "driver_changed",
]);

/** Saknade värden fylls med fältets sämsta (min) i stället för medelvärdet */
export const WORST_FILL_FACTORS: ReadonlySet<FactorName> = new Set<FactorName>([
  "fig_best", "fig_mean", "fig_last", "record_cat",
]);

/** Banpar (s/km) och underlagsjusteringar — skattas av träningsskriptet */
export interface SpeedTables {
  par: Record<string, number>;
  par_fallback: Record<string, number>;
  condition_adj: Record<string, number>;
}

const FORM_WEIGHTS = [0.35, 0.25, 0.18, 0.12, 0.1];
const PLACE_POINTS: Record<string, number> = { "1": 10, "2": 7, "3": 5, "4": 3, "5": 2 };
/** Ungefärlig andel av förstapriset per placering (svensk prisskala) */
const PRIZE_SHARE: Record<string, number> = {
  "1": 1.0, "2": 0.5, "3": 0.28, "4": 0.2, "5": 0.14, "6": 0.1, "7": 0.08, "8": 0.06,
};

export function distCategory(meters: number): "short" | "medium" | "long" {
  if (meters <= 1800) return "short";
  if (meters <= 2400) return "medium";
  return "long";
}

/** Krympt andel: drar mot p0 när antalet försök är litet */
export function shrink(w: number, n: number, p0: number, k: number): number {
  return (w + k * p0) / (n + k);
}

/** Galopp eller diskning (flaggor från ATG eller travsportnotation "5g"/"d") */
export function isFaulty(h: HorseStart): boolean {
  return h.galloped === true || h.disqualified === true || /[gd]/i.test(h.place);
}

export function isAmericanSulky(text: string | null | undefined): boolean {
  return (text ?? "").toLowerCase().startsWith("amerik");
}

export function parKey(breed: string, track: string, startMethod: string, cat: string): string {
  return `${breed}|${track}|${startMethod}|${cat}`;
}

export function parFallbackKey(breed: string, startMethod: string, cat: string): string {
  return `${breed}|${startMethod}|${cat}`;
}

/** Hastighetssiffra: sekunder/km snabbare än banpar (högre = bättre); null om ej användbar */
export function speedFigure(h: HorseStart, breed: string, tables: SpeedTables): number | null {
  if (isFaulty(h) || !h.start_method) return null;
  const t = parseTimeToSeconds(h.time);
  if (t == null) return null;
  const cat = distCategory(h.distance ?? 2140);
  const par =
    tables.par[parKey(breed, h.track, h.start_method, cat)] ??
    tables.par_fallback[parFallbackKey(breed, h.start_method, cat)];
  if (par == null) return null;
  const adj = tables.condition_adj[h.track_condition ?? ""] ?? 0;
  return -(t - par - adj);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso.slice(0, 10));
  const to = Date.parse(toIso.slice(0, 10));
  return Math.round((to - from) / 86_400_000);
}

/** Råa faktorer för en häst (NaN = saknas; fylls i vid standardiseringen) */
export function computeRawFeatures(
  race: FundamentalRace,
  s: FundamentalStarter,
  tables: SpeedTables
): FactorVector {
  const nan = Number.NaN;
  const cat = distCategory(race.distance);
  const auto = race.start_method === "auto";
  const pp = s.post_position;
  const age = s.horse_age ?? 5;

  const rec = s.life_records.find((r) => r.start_method === race.start_method && r.distance === cat);
  const recSec = rec ? parseTimeToSeconds(rec.time) : null;

  // Bara starter före loppet — äldre rader kan innehålla loppet självt
  const hist = s.history.filter((h) => h.date.slice(0, 10) < race.date).slice(0, 5);
  const figs = hist
    .map((h) => speedFigure(h, race.breed, tables))
    .filter((f): f is number => f != null);
  const clean = hist.filter((h) => !isFaulty(h));
  const days = hist.length > 0 ? Math.min(daysBetween(hist[0].date, race.date), 365) : 365;
  const prizes = hist.map((h) => h.first_prize ?? 0).filter((p) => p > 0);
  const lastDriver = hist[0]?.driver ?? null;

  return {
    log_eps: Math.log1p(s.earnings_total / Math.max(s.starts_total, 1)),
    win_rate_life: shrink(s.wins_total, s.starts_total, 0.1, 6),
    top3_rate_life: shrink(s.wins_total + s.places_2nd + s.places_3rd, s.starts_total, 0.3, 6),
    win_rate_cy: shrink(s.wins_current_year, s.starts_current_year, 0.1, 6),
    top3_rate_cy: shrink(
      s.wins_current_year + s.places_2nd_current_year + s.places_3rd_current_year,
      s.starts_current_year, 0.3, 6
    ),
    record_cat: recSec != null ? -recSec : nan,
    record_missing: recSec != null ? 0 : 1,
    age,
    age_sq: (age - 6) ** 2,
    stallion: s.horse_sex === "stallion" ? 1 : 0,
    mare: s.horse_sex === "mare" ? 1 : 0,
    log_starts: Math.log1p(s.starts_total),
    post_inner: auto ? (pp <= 8 ? (9 - pp) / 8 : 0) : Math.max(0, (13 - pp) / 12),
    post_2nd_row: (auto ? pp > 8 : pp > 7) ? 1 : 0,
    barefoot_all: s.shoes_reported && !s.shoes_front && !s.shoes_back ? 1 : 0,
    shoes_off_change:
      (s.shoes_front_changed && !s.shoes_front) || (s.shoes_back_changed && !s.shoes_back) ? 1 : 0,
    american_sulky: s.american_sulky ? 1 : 0,
    driver_wr: s.driver_win_pct != null ? s.driver_win_pct / 100 : nan,
    trainer_wr: s.trainer_win_pct != null ? s.trainer_win_pct / 100 : nan,
    fig_best: figs.length > 0 ? Math.max(...figs) : nan,
    fig_mean: figs.length > 0 ? mean(figs.slice(0, 3)) : nan,
    fig_last: figs.length > 0 ? figs[0] : nan,
    fig_missing: figs.length > 0 ? 0 : 1,
    form_pts:
      hist.length > 0
        ? hist.reduce((sum, h, i) => sum + FORM_WEIGHTS[i] * (isFaulty(h) ? 0 : PLACE_POINTS[h.place] ?? 0), 0)
        : nan,
    gallop_rate: hist.length > 0 ? hist.filter(isFaulty).length / hist.length : nan,
    days_since: days,
    long_rest: days > 60 ? 1 : 0,
    class_drop:
      prizes.length > 0 && race.first_prize
        ? mean(prizes.map((p) => Math.log1p(p))) - Math.log1p(race.first_prize)
        : nan,
    handicap_m: (s.start_distance ?? race.distance) - race.distance,
    driver_changed: lastDriver && s.driver && lastDriver !== s.driver ? 1 : 0,
    start_points: s.start_points ?? nan,
    trend: figs.length >= 3 ? figs[0] - mean(figs.slice(1)) : nan,
    recent_money: Math.log1p(
      clean.reduce((sum, h) => sum + (PRIZE_SHARE[h.place] ?? 0) * (h.first_prize ?? 0), 0)
    ),
  };
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental.features.test.ts` ska ge PASS. Fixturerna i `lib/__fixtures__/fundamental.ts` återanvänds i Task 3, 5 och 6.

- [ ] **Step 5: Commit.**
```bash
npx eslint lib/fundamental/features.ts lib/__tests__/fundamental.features.test.ts
git add lib/fundamental/features.ts lib/__fixtures__/fundamental.ts lib/__tests__/fundamental.features.test.ts
git commit -m "Grundchans: faktorberäkning (33 faktorer, hastighetssiffra med banpar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Modell – standardisering, sannolikhet, förklaringar

**Files:**
- Create: `lib/fundamental/model.ts`, `lib/fundamental/index.ts`, `lib/data/fundamental-model.json`
- Test: `lib/__tests__/fundamental.model.test.ts`

**Interfaces:**
- Consumes: allt från Task 2.
- Produces:
  - Typer: `FundamentalModel` (= `SpeedTables` & `{ version; trained_races; test_metrics: {logloss,pseudo_r2,top1,top3} | null; temperature; beta: Partial<Record<FactorName, number>> }`), `Contribution { factor: FactorName; value: number }`, `FundamentalResult { start_number: number; p: number | null; contributions: Contribution[] }`.
  - Värden: `MODEL: FundamentalModel`, `FACTOR_LABELS: Record<FactorName, string>`.
  - Funktioner: `isModelTrained(m)`, `standardizeField(raw: FactorVector[]): FactorVector[]`, `softmax(u: number[]): number[]`, `computeFundamental(race, starters, model?): FundamentalResult[]`, `computeFundamentalMap(race, starters, model?): Record<number, FundamentalResult>`, `topReasons(result: FundamentalResult, n?: number): string[]`, `isDisagreement(p: number | null, streckPct: number | null): boolean`.
  - `@/lib/fundamental` återexporterar `features` och `model`. `dbAdapter` och `recompute` läggs till i Task 6–7.

- [ ] **Step 1: Skapa platshållarmodellen** `lib/data/fundamental-model.json`. Den ersätts i Task 5.
```json
{
  "version": "untrained",
  "trained_races": 0,
  "test_metrics": null,
  "temperature": 1,
  "beta": {},
  "par": {},
  "par_fallback": {},
  "condition_adj": {}
}
```

- [ ] **Step 2: Skriv fallerande tester** i `lib/__tests__/fundamental.model.test.ts`:
```ts
import {
  computeFundamental,
  FACTOR_LABELS,
  isDisagreement,
  softmax,
  standardizeField,
  topReasons,
  type FundamentalModel,
} from "../fundamental/model";
import { FACTORS, computeRawFeatures, type FactorVector } from "../fundamental/features";
import { RACE, TABLES, hist, starter } from "../__fixtures__/fundamental";

const TEST_MODEL: FundamentalModel = {
  ...TABLES,
  version: "test",
  trained_races: 0,
  test_metrics: null,
  temperature: 1,
  beta: { log_eps: 0.3, barefoot_all: 0.35, handicap_m: -0.3, form_pts: 0.25, fig_last: 0.15 },
};

function vec(o: Partial<FactorVector>): FactorVector {
  const v = {} as FactorVector;
  for (const f of FACTORS) v[f] = o[f] ?? 0;
  return v;
}

describe("standardizeField", () => {
  it("z-poängsätter kontinuerliga och centrerar binära", () => {
    const z = standardizeField([vec({ log_eps: 1, mare: 1 }), vec({ log_eps: 3, mare: 0 })]);
    expect(z[0].log_eps).toBeCloseTo(-1);
    expect(z[1].log_eps).toBeCloseTo(1);
    expect(z[0].mare).toBeCloseTo(0.5);
    expect(z[1].mare).toBeCloseTo(-0.5);
  });
  it("påverkas inte av att alla förskjuts lika mycket", () => {
    const a = standardizeField([vec({ log_eps: 1 }), vec({ log_eps: 2 }), vec({ log_eps: 4 })]);
    const b = standardizeField([vec({ log_eps: 11 }), vec({ log_eps: 12 }), vec({ log_eps: 14 })]);
    a.forEach((row, i) => expect(row.log_eps).toBeCloseTo(b[i].log_eps));
  });
  it("fyller NaN: fig/record med fältets min, övriga med medel, allt-NaN blir 0", () => {
    const z = standardizeField([
      vec({ fig_last: 1, form_pts: 2, trend: Number.NaN }),
      vec({ fig_last: 3, form_pts: 4, trend: Number.NaN }),
      vec({ fig_last: Number.NaN, form_pts: Number.NaN, trend: Number.NaN }),
    ]);
    // fig_last fylls med 1 → värdena [1,3,1]
    expect(z[2].fig_last).toBeCloseTo(z[0].fig_last);
    // form_pts fylls med medel 3 → mittvärde → z = 0
    expect(z[2].form_pts).toBeCloseTo(0);
    expect(z.map((r) => r.trend)).toEqual([0, 0, 0]);
  });
  it("konstant faktor ger 0", () => {
    const z = standardizeField([vec({ age: 5 }), vec({ age: 5 })]);
    expect(z[0].age).toBe(0);
  });
});

describe("softmax", () => {
  it("summerar till 1 och tål stora värden", () => {
    const p = softmax([1000, 1001, 999]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[1]).toBeGreaterThan(p[0]);
  });
});

describe("computeFundamental", () => {
  const field = [
    starter({ start_number: 1, earnings_total: 800000 }),
    starter({ start_number: 2 }),
    starter({ start_number: 3, earnings_total: 100000 }),
  ];

  it("summerar till 1 och alla p i (0,1)", () => {
    const res = computeFundamental(RACE, field, TEST_MODEL);
    const sum = res.reduce((a, r) => a + (r.p ?? 0), 0);
    expect(sum).toBeCloseTo(1);
    res.forEach((r) => {
      expect(r.p).toBeGreaterThan(0);
      expect(r.p).toBeLessThan(1);
    });
    expect(res[0].p!).toBeGreaterThan(res[2].p!);
  });

  it("tillägg sänker och barfota höjer, allt annat lika", () => {
    const base = [starter({ start_number: 1 }), starter({ start_number: 2 })];
    const handicap = computeFundamental(RACE, [base[0], { ...base[1], start_distance: 2160 }], TEST_MODEL);
    expect(handicap[1].p!).toBeLessThan(0.5);
    const barefoot = computeFundamental(RACE, [base[0], { ...base[1], shoes_front: false, shoes_back: false }], TEST_MODEL);
    expect(barefoot[1].p!).toBeGreaterThan(0.5);
  });

  it("bidragen förklarar skillnaden i log-odds", () => {
    const res = computeFundamental(RACE, field, TEST_MODEL);
    const u = res.map((r) => r.contributions.reduce((a, c) => a + c.value, 0));
    expect(Math.log(res[0].p! / res[1].p!)).toBeCloseTo(u[0] - u[1]);
  });

  it("färre än två hästar ger p = null", () => {
    expect(computeFundamental(RACE, [starter()], TEST_MODEL)).toEqual([
      { start_number: 1, p: null, contributions: [] },
    ]);
    expect(computeFundamental(RACE, [], TEST_MODEL)).toEqual([]);
  });

  it("debutant utan historik och statistik får ett ändligt p", () => {
    const debutant = starter({
      start_number: 2, starts_total: 0, wins_total: 0, places_2nd: 0, places_3rd: 0, earnings_total: 0,
      starts_current_year: 0, wins_current_year: 0, places_2nd_current_year: 0, places_3rd_current_year: 0,
      life_records: [], driver_win_pct: null, trainer_win_pct: null, start_points: null, history: [],
      horse_age: null, horse_sex: null,
    });
    const res = computeFundamental(RACE, [starter({ history: [hist()] }), debutant], TEST_MODEL);
    res.forEach((r) => expect(Number.isFinite(r.p!)).toBe(true));
  });

  it("råa faktorer är oberoende av modellens vikter", () => {
    expect(computeRawFeatures(RACE, field[0], TEST_MODEL).log_eps).toBeCloseTo(Math.log1p(40000));
  });
});

describe("topReasons", () => {
  it("ger de största bidragen med tecken och svensk etikett, utan dubbletter", () => {
    const reasons = topReasons({
      start_number: 1,
      p: 0.2,
      contributions: [
        { factor: "log_eps", value: 0.6 },
        { factor: "handicap_m", value: -0.4 },
        { factor: "age", value: 0.2 },
        { factor: "age_sq", value: 0.1 },
        { factor: "barefoot_all", value: 0.05 },
      ],
    });
    expect(reasons).toEqual([
      `+ ${FACTOR_LABELS.log_eps}`,
      `− ${FACTOR_LABELS.handicap_m}`,
      `+ ${FACTOR_LABELS.age}`,
    ]);
  });
  it("alla faktorer har en etikett", () => {
    for (const f of FACTORS) expect(FACTOR_LABELS[f].length).toBeGreaterThan(0);
  });
});

describe("isDisagreement", () => {
  it("kräver kvot ≥ 1,5 eller ≤ 0,5 och minst 3 procentenheter", () => {
    expect(isDisagreement(0.3, 15)).toBe(true);   // 30 % mot 15 %
    expect(isDisagreement(0.05, 12)).toBe(true);  // 5 % mot 12 %
    expect(isDisagreement(0.06, 3)).toBe(true);   // 6 % mot 3 %: kvot 2, diff 3
    expect(isDisagreement(0.04, 2)).toBe(false);  // kvot 2 men bara 2 pe
    expect(isDisagreement(0.2, 18)).toBe(false);  // för lik
    expect(isDisagreement(null, 18)).toBe(false);
    expect(isDisagreement(0.2, 0)).toBe(false);   // streck saknas
  });
});
```

- [ ] **Step 3: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.model.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 4: Implementera `lib/fundamental/model.ts`:**
```ts
/**
 * Grundchans — standardisering inom fältet, conditional logit (softmax) och
 * förklaringar. Se docs/superpowers/specs/2026-10-03-grundchans-design.md §3.4.
 */
import modelJson from "@/lib/data/fundamental-model.json";
import {
  BINARY_FACTORS,
  computeRawFeatures,
  FACTORS,
  WORST_FILL_FACTORS,
  type FactorName,
  type FactorVector,
  type FundamentalRace,
  type FundamentalStarter,
  type SpeedTables,
} from "./features";

export interface FundamentalModel extends SpeedTables {
  /** "untrained" tills träningsskriptet skrivit en riktig modell */
  version: string;
  trained_races: number;
  test_metrics: { logloss: number; pseudo_r2: number; top1: number; top3: number } | null;
  temperature: number;
  /** Vikter (redan multiplicerade med temperaturen) */
  beta: Partial<Record<FactorName, number>>;
}

// JSON-filen typas av TypeScript utifrån innehållet — omvandla via unknown
export const MODEL = modelJson as unknown as FundamentalModel;

export function isModelTrained(model: FundamentalModel = MODEL): boolean {
  return model.version !== "untrained";
}

export interface Contribution {
  factor: FactorName;
  /** β · z — hur mycket faktorn lyfter (+) eller sänker (−) hästens styrka */
  value: number;
}

export interface FundamentalResult {
  start_number: number;
  /** Grundchans 0–1, null när fältet är för litet */
  p: number | null;
  /** Bidrag sorterade efter storlek (nollbidrag utelämnas) */
  contributions: Contribution[];
}

export const FACTOR_LABELS: Record<FactorName, string> = {
  log_eps: "pengar/start",
  win_rate_life: "vinst% karriär",
  top3_rate_life: "plats% karriär",
  win_rate_cy: "vinst% i år",
  top3_rate_cy: "plats% i år",
  record_cat: "rekordtid på distansen",
  record_missing: "saknar rekord på distansen",
  age: "ålder",
  age_sq: "ålder",
  stallion: "hingst",
  mare: "sto",
  log_starts: "antal starter",
  post_inner: "innerspår",
  post_2nd_row: "andra startled",
  barefoot_all: "barfota",
  shoes_off_change: "skor av",
  american_sulky: "jänkarvagn",
  driver_wr: "kuskform",
  trainer_wr: "tränarform",
  fig_best: "bästa km-tid (justerad)",
  fig_mean: "km-tider senaste",
  fig_last: "senaste km-tid",
  fig_missing: "saknar km-tider",
  form_pts: "form",
  gallop_rate: "galopprisk",
  days_since: "vila",
  long_rest: "långt uppehåll",
  class_drop: "klassbyte",
  handicap_m: "tillägg",
  driver_changed: "kuskbyte",
  start_points: "startpoäng",
  trend: "formtrend",
  recent_money: "pengar senaste starterna",
};

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Fyll saknade värden och z-poängsätt varje faktor inom fältet */
export function standardizeField(raw: FactorVector[]): FactorVector[] {
  const out = raw.map(() => ({}) as FactorVector);
  for (const f of FACTORS) {
    const values = raw.map((r) => r[f]);
    const finite = values.filter((v) => Number.isFinite(v));
    if (finite.length === 0) {
      out.forEach((o) => (o[f] = 0));
      continue;
    }
    const fill = WORST_FILL_FACTORS.has(f) ? Math.min(...finite) : mean(finite);
    const filled = values.map((v) => (Number.isFinite(v) ? v : fill));
    const m = mean(filled);
    if (BINARY_FACTORS.has(f)) {
      filled.forEach((v, i) => (out[i][f] = v - m));
      continue;
    }
    const sd = Math.sqrt(mean(filled.map((v) => (v - m) ** 2)));
    filled.forEach((v, i) => (out[i][f] = sd < 1e-9 ? 0 : (v - m) / sd));
  }
  return out;
}

export function softmax(u: number[]): number[] {
  const max = Math.max(...u);
  const e = u.map((v) => Math.exp(v - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/** Grundchans för ett helt fält (strukna hästar ska redan vara borttagna) */
export function computeFundamental(
  race: FundamentalRace,
  starters: FundamentalStarter[],
  model: FundamentalModel = MODEL
): FundamentalResult[] {
  if (starters.length < 2) {
    return starters.map((s) => ({ start_number: s.start_number, p: null, contributions: [] }));
  }
  const z = standardizeField(starters.map((s) => computeRawFeatures(race, s, model)));
  const contributions = z.map((row) =>
    FACTORS.map((f) => ({ factor: f, value: (model.beta[f] ?? 0) * row[f] }))
  );
  const p = softmax(contributions.map((cs) => cs.reduce((a, c) => a + c.value, 0)));
  return starters.map((s, i) => ({
    start_number: s.start_number,
    p: p[i],
    contributions: contributions[i]
      .filter((c) => c.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  }));
}

export function computeFundamentalMap(
  race: FundamentalRace,
  starters: FundamentalStarter[],
  model: FundamentalModel = MODEL
): Record<number, FundamentalResult> {
  return Object.fromEntries(computeFundamental(race, starters, model).map((r) => [r.start_number, r]));
}

/** De n största bidragen som text, t.ex. "+ pengar/start" (en etikett visas en gång) */
export function topReasons(result: FundamentalResult, n = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of result.contributions) {
    const label = FACTOR_LABELS[c.factor];
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(`${c.value > 0 ? "+" : "−"} ${label}`);
    if (out.length === n) break;
  }
  return out;
}

/** "Oense": Grundchans och streck skiljer sig kraftigt (kvot och minst 3 procentenheter) */
export function isDisagreement(p: number | null, streckPct: number | null): boolean {
  if (p == null || streckPct == null || streckPct <= 0) return false;
  const pPct = p * 100;
  const ratioOff = pPct >= 1.5 * streckPct || pPct <= 0.5 * streckPct;
  return ratioOff && Math.abs(pPct - streckPct) >= 3;
}
```

- [ ] **Step 5: Skapa `lib/fundamental/index.ts`:**
```ts
export * from "./features";
export * from "./model";
```

- [ ] **Step 6: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental` ska ge PASS i båda filerna.

- [ ] **Step 7: Commit.**
```bash
npx tsc --noEmit -p . && npx eslint lib/fundamental lib/__tests__/fundamental.model.test.ts
git add lib/fundamental/model.ts lib/fundamental/index.ts lib/data/fundamental-model.json lib/__tests__/fundamental.model.test.ts
git commit -m "Grundchans: standardisering, softmax, förklaringar och Oense-regel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Skattning – `lib/fundamental/fit.ts`

**Files:**
- Create: `lib/fundamental/fit.ts`
- Test: `lib/__tests__/fundamental.fit.test.ts`

**Interfaces:**
- Consumes: `parKey`, `parFallbackKey`, `distCategory`, `SpeedTables` från Task 2; `softmax` från Task 3.
- Produces:
  - Typer: `TrainingRace { z: number[][]; winner: number }`, `Metrics { logloss: number; pseudo_r2: number; top1: number; top3: number; n: number }`, `SpeedRecord { breed: string; track: string; start_method: string; distance: number; condition: string | null; seconds: number }`.
  - `raceProbs(z: number[][], beta: number[]): number[]`
  - `objective(beta: number[], races: TrainingRace[], lambda: number): { f: number; grad: number[] }`
  - `lbfgs(fg: (x: number[]) => { f: number; grad: number[] }, x0: number[], opts?: { m?: number; maxIter?: number; tol?: number }): number[]`
  - `fitConditionalLogit(races: TrainingRace[], k: number, lambda: number): number[]`
  - `evaluate(probs: number[][], winners: number[]): Metrics`
  - `median(values: number[]): number`
  - `estimateSpeedTables(records: SpeedRecord[]): SpeedTables`

- [ ] **Step 1: Skriv fallerande tester** i `lib/__tests__/fundamental.fit.test.ts`:
```ts
import {
  estimateSpeedTables,
  evaluate,
  fitConditionalLogit,
  lbfgs,
  median,
  objective,
  raceProbs,
  type SpeedRecord,
  type TrainingRace,
} from "../fundamental/fit";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthetic(n: number, beta: number[], seed = 1): TrainingRace[] {
  const r = rng(seed);
  const races: TrainingRace[] = [];
  for (let i = 0; i < n; i++) {
    const z = Array.from({ length: 10 }, () => beta.map(() => r() * 2 - 1));
    const p = raceProbs(z, beta);
    let u = r(), winner = 0;
    while (winner < p.length - 1 && u > p[winner]) { u -= p[winner]; winner++; }
    races.push({ z, winner });
  }
  return races;
}

describe("objective", () => {
  it("analytisk gradient stämmer med finita differenser", () => {
    const races = synthetic(50, [0.8, -0.4, 0.2]);
    const beta = [0.3, 0.1, -0.2];
    const { grad } = objective(beta, races, 0.5);
    const h = 1e-6;
    beta.forEach((_, k) => {
      const up = [...beta]; up[k] += h;
      const dn = [...beta]; dn[k] -= h;
      const num = (objective(up, races, 0.5).f - objective(dn, races, 0.5).f) / (2 * h);
      expect(grad[k]).toBeCloseTo(num, 4);
    });
  });
});

describe("lbfgs", () => {
  it("minimerar en kvadratisk funktion", () => {
    const x = lbfgs((v) => ({
      f: (v[0] - 3) ** 2 + 10 * (v[1] + 1) ** 2,
      grad: [2 * (v[0] - 3), 20 * (v[1] + 1)],
    }), [0, 0]);
    expect(x[0]).toBeCloseTo(3, 4);
    expect(x[1]).toBeCloseTo(-1, 4);
  });
});

describe("fitConditionalLogit", () => {
  it("återfinner sanna vikter på syntetisk data", () => {
    const truth = [1.0, -0.5];
    const beta = fitConditionalLogit(synthetic(3000, truth, 7), 2, 0.01);
    expect(Math.abs(beta[0] - truth[0])).toBeLessThan(0.15);
    expect(Math.abs(beta[1] - truth[1])).toBeLessThan(0.15);
  });
});

describe("evaluate", () => {
  it("räknar logloss, pseudo-R², topp 1 och topp 3", () => {
    const m = evaluate([[0.5, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25]], [0, 3]);
    expect(m.logloss).toBeCloseTo((-Math.log(0.5) - Math.log(0.25)) / 2);
    expect(m.pseudo_r2).toBeCloseTo(1 - m.logloss / ((Math.log(3) + Math.log(4)) / 2));
    expect(m.top1).toBeCloseTo(0.5); // lopp 2: lika — argmax väljer index 0
    expect(m.top3).toBeCloseTo(0.5);
    expect(m.n).toBe(2);
  });
});

describe("estimateSpeedTables", () => {
  const rec = (o: Partial<SpeedRecord>): SpeedRecord => ({
    breed: "V", track: "Solvalla", start_method: "auto", distance: 2140, condition: "light", seconds: 73, ...o,
  });

  it("median kräver ≥15 för par och ≥30 för underlag", () => {
    const records = [
      ...Array.from({ length: 15 }, (_, i) => rec({ seconds: 72 + i * 0.1 })),
      ...Array.from({ length: 14 }, () => rec({ track: "Liten bana" })),
      ...Array.from({ length: 30 }, () => rec({ track: "Liten bana", condition: "heavy", seconds: 74 })),
    ];
    const t = estimateSpeedTables(records);
    expect(t.par["V|Solvalla|auto|medium"]).toBeCloseTo(72.7);
    expect(t.par["V|Liten bana|auto|medium"]).toBeCloseTo(74); // 44 poster
    expect(t.par_fallback["V|auto|medium"]).toBeDefined();
    expect(t.condition_adj.heavy).toBeDefined();
    expect(t.condition_adj.light).toBeDefined();
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
```
- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.fit.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Implementera `lib/fundamental/fit.ts`:**
```ts
/**
 * Grundchans — skattning av conditional logit (Bolton & Chapman 1986) med
 * L2-regularisering och L-BFGS, mått och banpar. Används av
 * scripts/fit-fundamental.ts. Rena funktioner, inga beroenden.
 */
import { distCategory, parFallbackKey, parKey, type SpeedTables } from "./features";
import { softmax } from "./model";

export interface TrainingRace {
  /** Standardiserade faktorer: en rad per häst, en kolumn per faktor */
  z: number[][];
  /** Index för vinnaren i z */
  winner: number;
}

export interface Metrics {
  logloss: number;
  pseudo_r2: number;
  top1: number;
  top3: number;
  n: number;
}

export interface SpeedRecord {
  breed: string;
  track: string;
  start_method: string;
  distance: number;
  condition: string | null;
  seconds: number;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function raceProbs(z: number[][], beta: number[]): number[] {
  return softmax(z.map((row) => dot(row, beta)));
}

/** Negativ log-likelihood för vinnarna + λ‖β‖², med analytisk gradient */
export function objective(
  beta: number[],
  races: TrainingRace[],
  lambda: number
): { f: number; grad: number[] } {
  const k = beta.length;
  let f = 0;
  const grad = new Array<number>(k).fill(0);
  for (const r of races) {
    const p = raceProbs(r.z, beta);
    f -= Math.log(Math.max(p[r.winner], 1e-300));
    for (let j = 0; j < k; j++) {
      let expected = 0;
      for (let i = 0; i < p.length; i++) expected += p[i] * r.z[i][j];
      grad[j] -= r.z[r.winner][j] - expected;
    }
  }
  for (let j = 0; j < k; j++) {
    f += lambda * beta[j] * beta[j];
    grad[j] += 2 * lambda * beta[j];
  }
  return { f, grad };
}

/** L-BFGS med backtracking (Armijo) */
export function lbfgs(
  fg: (x: number[]) => { f: number; grad: number[] },
  x0: number[],
  opts: { m?: number; maxIter?: number; tol?: number } = {}
): number[] {
  const m = opts.m ?? 10;
  const maxIter = opts.maxIter ?? 500;
  const tol = opts.tol ?? 1e-9;
  let x = [...x0];
  let { f, grad: g } = fg(x);
  const S: number[][] = [];
  const Y: number[][] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.sqrt(dot(g, g)) < 1e-8) break;
    // Tvåloopsrekursionen ger riktningen −H·g
    const q = [...g];
    const alphas: number[] = new Array(S.length);
    for (let i = S.length - 1; i >= 0; i--) {
      const a = dot(S[i], q) / dot(Y[i], S[i]);
      alphas[i] = a;
      for (let j = 0; j < q.length; j++) q[j] -= a * Y[i][j];
    }
    const gamma = S.length > 0
      ? dot(S[S.length - 1], Y[Y.length - 1]) / dot(Y[Y.length - 1], Y[Y.length - 1])
      : 1 / Math.max(Math.sqrt(dot(g, g)), 1);
    const r = q.map((v) => v * gamma);
    for (let i = 0; i < S.length; i++) {
      const b = dot(Y[i], r) / dot(Y[i], S[i]);
      for (let j = 0; j < r.length; j++) r[j] += S[i][j] * (alphas[i] - b);
    }
    let d = r.map((v) => -v);
    let dg = dot(d, g);
    if (dg >= 0) {
      d = g.map((v) => -v);
      dg = dot(d, g);
      S.length = 0;
      Y.length = 0;
    }

    let step = 1;
    let xn = x;
    let fn = f;
    let gn = g;
    for (let ls = 0; ls < 50; ls++) {
      xn = x.map((v, i) => v + step * d[i]);
      ({ f: fn, grad: gn } = fg(xn));
      if (fn <= f + 1e-4 * step * dg) break;
      step *= 0.5;
    }

    const s = xn.map((v, i) => v - x[i]);
    const y = gn.map((v, i) => v - g[i]);
    if (dot(s, y) > 1e-12) {
      S.push(s);
      Y.push(y);
      if (S.length > m) {
        S.shift();
        Y.shift();
      }
    }
    const converged = Math.abs(f - fn) <= tol * Math.max(1, Math.abs(f));
    x = xn;
    f = fn;
    g = gn;
    if (converged) break;
  }
  return x;
}

export function fitConditionalLogit(races: TrainingRace[], k: number, lambda: number): number[] {
  return lbfgs((b) => objective(b, races, lambda), new Array<number>(k).fill(0));
}

export function evaluate(probs: number[][], winners: number[]): Metrics {
  const n = probs.length;
  let ll = 0, uniform = 0, top1 = 0, top3 = 0;
  probs.forEach((p, idx) => {
    const w = winners[idx];
    ll += -Math.log(Math.max(p[w], 1e-12));
    uniform += Math.log(p.length);
    const order = p.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i);
    if (order[0] === w) top1++;
    if (order.slice(0, 3).includes(w)) top3++;
  });
  return {
    logloss: ll / n,
    pseudo_r2: 1 - ll / uniform,
    top1: top1 / n,
    top3: top3 / n,
    n,
  };
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Banpar (median ≥ 15 poster) och underlagsjusteringar (median residual ≥ 30 poster) */
export function estimateSpeedTables(records: SpeedRecord[]): SpeedTables {
  const byKey = new Map<string, number[]>();
  const byFallback = new Map<string, number[]>();
  for (const r of records) {
    const cat = distCategory(r.distance);
    const k = parKey(r.breed, r.track, r.start_method, cat);
    const fk = parFallbackKey(r.breed, r.start_method, cat);
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(r.seconds);
    (byFallback.get(fk) ?? byFallback.set(fk, []).get(fk)!).push(r.seconds);
  }
  const par: Record<string, number> = {};
  for (const [k, v] of byKey) if (v.length >= 15) par[k] = median(v);
  const par_fallback: Record<string, number> = {};
  for (const [k, v] of byFallback) if (v.length >= 15) par_fallback[k] = median(v);

  const residuals = new Map<string, number[]>();
  for (const r of records) {
    const cat = distCategory(r.distance);
    const p = par[parKey(r.breed, r.track, r.start_method, cat)] ?? par_fallback[parFallbackKey(r.breed, r.start_method, cat)];
    if (p == null) continue;
    const c = r.condition ?? "";
    (residuals.get(c) ?? residuals.set(c, []).get(c)!).push(r.seconds - p);
  }
  const condition_adj: Record<string, number> = {};
  for (const [c, v] of residuals) if (v.length >= 30) condition_adj[c] = median(v);
  return { par, par_fallback, condition_adj };
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental.fit.test.ts` ska ge PASS. Gradienttestet bekräftar att `objective` är korrekt, och det syntetiska testet att skattningen konvergerar.

- [ ] **Step 5: Commit.**
```bash
npx eslint lib/fundamental/fit.ts lib/__tests__/fundamental.fit.test.ts
git add lib/fundamental/fit.ts lib/__tests__/fundamental.fit.test.ts
git commit -m "Grundchans: conditional logit-skattning (L-BFGS), mått och banpar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: ATG-adapter och träningsskript, generera modellen

**Files:**
- Create: `lib/fundamental/atgAdapter.ts`, `scripts/fit-fundamental.ts`
- Modify: `package.json` (`scripts`), `.gitignore`, `lib/data/fundamental-model.json` (genereras)
- Test: `lib/__tests__/fundamental.atgAdapter.test.ts`

**Interfaces:**
- Consumes:
  - `detectBreed`, `normalizeLifeRecords`, `parseFirstPrize`, `parseHistoryRecords`, `winPct` (Task 1)
  - `computeRawFeatures`, `FACTORS`, `isAmericanSulky`, `isFaulty` (Task 2)
  - `standardizeField` (Task 3)
  - `fitConditionalLogit`, `raceProbs`, `evaluate`, `estimateSpeedTables` (Task 4)
  - `parseTimeToSeconds` från `@/lib/analysis`
- Produces:
  - `fromAtgRace(race: Record<string, unknown>): FundamentalRace`
  - `fromAtgStart(start: Record<string, unknown>, race: FundamentalRace): FundamentalStarter`
  - En tränad `lib/data/fundamental-model.json`
  - `npm run fit-fundamental`

- [ ] **Step 1: Lägg ATG-fixturer sist i `lib/__fixtures__/fundamental.ts`.** De är förkortade men har ATG:s riktiga format.
```ts
export const ATG_RACE = {
  id: "2026-09-21_12_7",
  date: "2026-09-21",
  distance: 2140,
  startMethod: "volte",
  prize: "Pris: 50.000-25.000-12.500 kr (5 prisplacerade).",
  terms: ["3-åriga och äldre 85.001 - 225.000 kr.", "2140 m. Voltstart."],
};

export const ATG_START = {
  number: 4,
  postPosition: 4,
  distance: 2160,
  driver: {
    firstName: "Ulf", lastName: "Ohlsson",
    statistics: { years: { "2026": { starts: 100, placement: { "1": 15 } } } },
  },
  horse: {
    age: 6, sex: "gelding",
    shoes: { reported: true, front: { hasShoe: false, changed: true }, back: { hasShoe: false, changed: false } },
    sulky: { type: { code: "AM", text: "Amerikansk" } },
    trainer: { statistics: { years: { "2026": { starts: 50, placement: { "1": 5 } } } } },
    statistics: {
      life: {
        starts: 20, earnings: 40000000, placement: { "1": 4, "2": 3, "3": 2 }, startPoints: 900,
        records: [{ startMethod: "volte", distance: "medium", place: 1, time: { minutes: 1, seconds: 13, tenths: 0 } }],
      },
      years: { "2026": { starts: 8, placement: { "1": 2, "2": 1, "3": 1 } } },
    },
    results: {
      records: [
        {
          date: "2026-09-21", place: "1", kmTime: { minutes: 1, seconds: 12, tenths: 0 }, // loppet självt
          race: { startMethod: "volte", firstPrize: 5000000 }, track: { name: "Bollnäs", condition: "light" },
          start: { distance: 2140, postPosition: 4 },
        },
        {
          date: "2026-09-01", place: "2", kmTime: { minutes: 1, seconds: 14, tenths: 0 },
          race: { startMethod: "volte", firstPrize: 5000000 }, track: { name: "Bollnäs", condition: "light" },
          start: { distance: 2140, postPosition: 2, driver: { firstName: "Ulf", lastName: "Ohlsson" } },
        },
      ],
    },
  },
};
```

Skriv sedan de fallerande testerna i `lib/__tests__/fundamental.atgAdapter.test.ts`:
```ts
import { fromAtgRace, fromAtgStart } from "../fundamental/atgAdapter";
import { ATG_RACE, ATG_START } from "../__fixtures__/fundamental";

describe("fromAtgRace", () => {
  it("tolkar lopp", () => {
    expect(fromAtgRace(ATG_RACE)).toEqual({
      date: "2026-09-21", distance: 2140, start_method: "volte", breed: "V", first_prize: 50000,
    });
  });
});

describe("fromAtgStart", () => {
  const s = fromAtgStart(ATG_START, fromAtgRace(ATG_RACE));
  it("karriär, år och pengar i kr", () => {
    expect(s).toMatchObject({
      start_number: 4, post_position: 4, start_distance: 2160, horse_age: 6, horse_sex: "gelding",
      starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
      starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
      start_points: 900,
    });
  });
  it("skor, sulky, kusk och tränare", () => {
    expect(s.shoes_front).toBe(false);
    expect(s.shoes_front_changed).toBe(true);
    expect(s.american_sulky).toBe(true);
    expect(s.driver).toBe("Ulf Ohlsson");
    expect(s.driver_win_pct).toBeCloseTo(15);
    expect(s.trainer_win_pct).toBeCloseTo(10);
    expect(s.life_records).toEqual([{ start_method: "volte", distance: "medium", place: 1, time: "1:13,0" }]);
  });
  it("historik utan loppet självt", () => {
    expect(s.history.map((h) => h.date)).toEqual(["2026-09-01"]);
    expect(s.history[0].first_prize).toBe(50000);
  });
});
```

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.atgAdapter.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Implementera `lib/fundamental/atgAdapter.ts`:**
```ts
/**
 * ATG-JSON (/races/{id}/extended) → Grundchans-indata. Används av
 * träningsskriptet; tolkningen följer lib/atg.ts parseGame så att träning
 * och app ser samma värden.
 */
import { detectBreed, normalizeLifeRecords, parseFirstPrize, parseHistoryRecords, winPct } from "@/lib/atg";
import { isAmericanSulky, type FundamentalRace, type FundamentalStarter } from "./features";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? fallback : n;
};

export function fromAtgRace(race: Json): FundamentalRace {
  return {
    date: String(race["date"] ?? ""),
    distance: num(race["distance"], 2140),
    start_method: String(race["startMethod"] ?? "auto"),
    breed: detectBreed(race["terms"]),
    first_prize: parseFirstPrize(race["prize"]),
  };
}

export function fromAtgStart(start: Json, race: FundamentalRace): FundamentalStarter {
  const horse = obj(start["horse"]);
  const stats = obj(horse["statistics"]);
  const life = obj(stats["life"]);
  const lp = obj(life["placement"]);
  const year = race.date.slice(0, 4);
  const prevYear = String(Number(year) - 1);
  const cy = obj(obj(stats["years"])[year]);
  const cyp = obj(cy["placement"]);
  const shoes = obj(horse["shoes"]);
  const front = obj(shoes["front"]);
  const back = obj(shoes["back"]);
  const sulkyText = String(obj(obj(horse["sulky"])["type"])["text"] ?? "");
  const driver = obj(start["driver"]);
  const trainer = obj(horse["trainer"]);
  const driverName = `${driver["firstName"] ?? ""} ${driver["lastName"] ?? ""}`.trim();
  const records = (obj(horse["results"])["records"] as Json[] | undefined) ?? [];

  return {
    start_number: num(start["number"]),
    post_position: num(start["postPosition"], num(start["number"])),
    start_distance: start["distance"] != null ? num(start["distance"]) : null,
    horse_age: horse["age"] != null ? num(horse["age"]) : null,
    horse_sex: horse["sex"] != null ? String(horse["sex"]) : null,
    starts_total: num(life["starts"]),
    wins_total: num(lp["1"]),
    places_2nd: num(lp["2"]),
    places_3rd: num(lp["3"]),
    // ATG anger pengar i ören — samma omräkning som parseGame
    earnings_total: Math.round(num(life["earnings"]) / 100),
    starts_current_year: num(cy["starts"]),
    wins_current_year: num(cyp["1"]),
    places_2nd_current_year: num(cyp["2"]),
    places_3rd_current_year: num(cyp["3"]),
    life_records: normalizeLifeRecords((life["records"] as Json[] | undefined) ?? []),
    shoes_reported: Boolean(shoes["reported"]),
    shoes_front: Boolean(front["hasShoe"]),
    shoes_back: Boolean(back["hasShoe"]),
    shoes_front_changed: Boolean(front["changed"]),
    shoes_back_changed: Boolean(back["changed"]),
    american_sulky: isAmericanSulky(sulkyText),
    driver: driverName || null,
    driver_win_pct: winPct(driver, year) ?? winPct(driver, prevYear),
    trainer_win_pct: winPct(trainer, year) ?? winPct(trainer, prevYear),
    start_points: life["startPoints"] != null ? num(life["startPoints"]) : null,
    history: parseHistoryRecords(records, race.date).slice(0, 5),
  };
}
```

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental.atgAdapter.test.ts` ska ge PASS.

- [ ] **Step 5: Lägg till skript och ignorering.**
   - `package.json` → `scripts`: `"fit-fundamental": "tsx scripts/fit-fundamental.ts"`.
   - `.gitignore`: lägg till sist:
```
# ATG-cache för träning av Grundchans
.cache/
```

- [ ] **Step 6: Skriv `scripts/fit-fundamental.ts`:**
```ts
/**
 * Tränar Grundchans (odds-fri conditional logit) på ett års ATG-data.
 *
 * Körning:  npm run fit-fundamental                 (hämtar/uppdaterar cache, tränar, rapporterar)
 *           npm run fit-fundamental -- --write      (skriver lib/data/fundamental-model.json)
 *           npm run fit-fundamental -- --skip-fetch (bara cachen)
 *           npm run fit-fundamental -- --months 13 --force
 *
 * Cache: .cache/atg/{games,races}/<id>.json.gz (checkas inte in).
 * Läser/skriver inget i Supabase. Spec: docs/superpowers/specs/2026-10-03-grundchans-design.md §4.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseTimeToSeconds } from "../lib/analysis";
import { fromAtgRace, fromAtgStart } from "../lib/fundamental/atgAdapter";
import {
  computeRawFeatures, FACTORS, isFaulty,
  type FundamentalRace, type FundamentalStarter, type SpeedTables,
} from "../lib/fundamental/features";
import { standardizeField, type FundamentalModel } from "../lib/fundamental/model";
import {
  estimateSpeedTables, evaluate, fitConditionalLogit, raceProbs,
  type SpeedRecord, type TrainingRace,
} from "../lib/fundamental/fit";

const ATG_BASE = "https://www.atg.se/services/racinginfo/v1/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
};
const GAME_TYPES = ["V85", "V86", "V75", "V64", "V65", "GS75"];
const CACHE = path.join(".cache", "atg");
const LAMBDA = 3;
const MIN_PSEUDO_R2 = 0.19;
const MODEL_PATH = path.join("lib", "data", "fundamental-model.json");

type Json = Record<string, unknown>;

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag: string) => process.argv.includes(flag);

function readGz(file: string): Json {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
}
function writeGz(file: string, data: unknown) {
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(data)));
}

async function getJson(url: string): Promise<Json | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return (await res.json()) as Json;
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // nätverksfel — försök igen
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

/** Hämtar avgjorda omgångar + /extended per lopp för en lista dagar (inkrementellt) */
async function fetchDays(days: string[], label: string) {
  for (const day of days) {
    const cal = await getJson(`${ATG_BASE}/calendar/day/${day}`);
    const games = obj(cal?.["games"]);
    for (const type of GAME_TYPES) {
      for (const g of (games[type] as Json[] | undefined) ?? []) {
        const gid = String(g["id"]);
        const gameFile = path.join(CACHE, "games", `${gid}.json.gz`);
        let game: Json | null = fs.existsSync(gameFile) ? readGz(gameFile) : null;
        if (!game) {
          game = await getJson(`${ATG_BASE}/games/${gid}`);
          if (!game || game["status"] !== "results") continue;
          writeGz(gameFile, game);
        }
        for (const r of (game["races"] as Json[] | undefined) ?? []) {
          const raceFile = path.join(CACHE, "races", `${r["id"]}.json.gz`);
          if (fs.existsSync(raceFile)) continue;
          const ext = await getJson(`${ATG_BASE}/races/${r["id"]}/extended`);
          if (ext) writeGz(raceFile, ext);
        }
      }
    }
    process.stdout.write(`\r  [${label}] ${day}`);
  }
}

function obj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}

interface Example {
  id: string;
  race: FundamentalRace;
  starters: FundamentalStarter[];
  horseIds: string[];
  winner: number;
  odds: number[];
  streck: number[];
}

function loadExamples(): Example[] {
  // Streck per (lopp-id, startnummer) från spelfilerna
  const streck = new Map<string, number>();
  for (const f of fs.readdirSync(path.join(CACHE, "games"))) {
    const game = readGz(path.join(CACHE, "games", f));
    const gameType = String(game["id"]).split("_")[0];
    for (const r of (game["races"] as Json[] | undefined) ?? []) {
      for (const s of (r["starts"] as Json[] | undefined) ?? []) {
        const bd = obj(obj(s["pools"])[gameType])["betDistribution"];
        if (bd != null) streck.set(`${r["id"]}#${s["number"]}`, Number(bd) / 100);
      }
    }
  }

  const out: Example[] = [];
  for (const f of fs.readdirSync(path.join(CACHE, "races"))) {
    const raw = readGz(path.join(CACHE, "races", f));
    if (raw["sport"] !== "trot") continue;
    const terms = ((raw["terms"] as string[] | undefined) ?? []).join(" ").toLowerCase();
    if (String(raw["name"] ?? "").toLowerCase().includes("monté") || terms.includes("monté")) continue;
    const scratched = new Set(((obj(raw["result"])["scratchings"] as number[] | undefined) ?? []).map(Number));
    const starts = ((raw["starts"] as Json[] | undefined) ?? []).filter(
      (s) => !scratched.has(Number(s["number"])) && s["result"]
    );
    if (starts.length < 5) continue;
    const finish = starts.map((s) => Number(obj(s["result"])["finishOrder"] ?? 99));
    if (finish.filter((x) => x === 1).length !== 1) continue;
    const race = fromAtgRace(raw);
    out.push({
      id: String(raw["id"]),
      race,
      starters: starts.map((s) => fromAtgStart(s, race)),
      horseIds: starts.map((s) => String(obj(s["horse"])["id"] ?? obj(s["horse"])["name"] ?? "")),
      winner: finish.indexOf(1),
      odds: starts.map((s) => Number(obj(s["result"])["finalOdds"] ?? 0)),
      streck: starts.map((s) => streck.get(`${raw["id"]}#${s["number"]}`) ?? 0),
    });
  }
  return out.sort((a, b) => a.race.date.localeCompare(b.race.date));
}

function speedRecords(examples: Example[], beforeDate: string | null): SpeedRecord[] {
  const seen = new Set<string>();
  const records: SpeedRecord[] = [];
  for (const ex of examples) {
    ex.starters.forEach((s, i) => {
      for (const h of s.history) {
        const key = `${ex.horseIds[i]}#${h.date}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (beforeDate && h.date >= beforeDate) continue;
        if (isFaulty(h) || !h.start_method) continue;
        const seconds = parseTimeToSeconds(h.time);
        if (seconds == null) continue;
        records.push({
          breed: ex.race.breed, track: h.track, start_method: h.start_method,
          distance: h.distance ?? 2140, condition: h.track_condition ?? null, seconds,
        });
      }
    });
  }
  return records;
}

function toTraining(examples: Example[], tables: SpeedTables): TrainingRace[] {
  return examples.map((ex) => {
    const z = standardizeField(ex.starters.map((s) => computeRawFeatures(ex.race, s, tables)));
    return { z: z.map((row) => FACTORS.map((f) => row[f])), winner: ex.winner };
  });
}

const normalize = (v: number[]) => {
  const s = v.reduce((a, b) => a + b, 0);
  return s > 0 ? v.map((x) => x / s) : v.map(() => 1 / v.length);
};
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
function line(name: string, m: ReturnType<typeof evaluate>) {
  console.log(
    `  ${name.padEnd(28)} logloss=${m.logloss.toFixed(4)}  pseudoR²=${m.pseudo_r2.toFixed(3)}  top1=${pct(m.top1)}  top3=${pct(m.top3)}  n=${m.n}`
  );
}

async function main() {
  const months = Number(arg("--months") ?? 13);
  fs.mkdirSync(path.join(CACHE, "games"), { recursive: true });
  fs.mkdirSync(path.join(CACHE, "races"), { recursive: true });

  if (!has("--skip-fetch")) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - months);
    const days: string[] = [];
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    const chunk = Math.ceil(days.length / 4);
    console.log(`Hämtar ATG ${days[0]} → ${days[days.length - 1]} (4 parallella intervall) …`);
    await Promise.all(
      [0, 1, 2, 3].map((i) => fetchDays(days.slice(i * chunk, (i + 1) * chunk), `${i + 1}/4`))
    );
    console.log("\n");
  }

  const examples = loadExamples();
  if (examples.length < 500) {
    console.error(`Bara ${examples.length} lopp i cachen — för lite för att träna (minst 500).`);
    process.exit(1);
  }
  const iTr = Math.floor(examples.length * 0.6);
  const iVa = Math.floor(examples.length * 0.8);
  const train = examples.slice(0, iTr);
  const val = examples.slice(iTr, iVa);
  const test = examples.slice(iVa);
  const testStart = test[0].race.date;
  console.log(`${examples.length} travlopp (${examples[0].race.date} → ${examples[examples.length - 1].race.date}).`);
  console.log(`Split: train ${train.length}, val ${val.length}, test ${test.length} (från ${testStart}).\n`);

  // Banpar enbart från historik före testperioden — ingen läckage
  const evalTables = estimateSpeedTables(speedRecords(examples, testStart));
  const trZ = toTraining(train, evalTables);
  const vaZ = toTraining(val, evalTables);
  const teZ = toTraining(test, evalTables);
  const k = FACTORS.length;

  const betaTrain = fitConditionalLogit(trZ, k, LAMBDA);
  // Temperatur: enparameterslogit på log p för valideringsdelen
  const tempRaces: TrainingRace[] = vaZ.map((r) => ({
    z: raceProbs(r.z, betaTrain).map((p) => [Math.log(Math.max(p, 1e-12))]),
    winner: r.winner,
  }));
  const temperature = fitConditionalLogit(tempRaces, 1, 1e-6)[0];
  const betaTrVa = fitConditionalLogit([...trZ, ...vaZ], k, LAMBDA);

  const testMetrics = evaluate(teZ.map((r) => raceProbs(r.z, betaTrVa)), teZ.map((r) => r.winner));
  console.log("=== Testperiod ===");
  line("Likformig", evaluate(test.map((e) => e.starters.map(() => 1 / e.starters.length)), test.map((e) => e.winner)));
  line("Grundchans", testMetrics);
  line("Vinnarodds (jämförelse)", evaluate(test.map((e) => normalize(e.odds.map((o) => (o > 0 ? 1 / o : 0)))), test.map((e) => e.winner)));
  const withStreck = test.filter((e) => e.streck.some((x) => x > 0));
  if (withStreck.length) {
    line("Streck (jämförelse)", evaluate(withStreck.map((e) => normalize(e.streck)), withStreck.map((e) => e.winner)));
  }
  console.log(`\nTemperatur (val): ${temperature.toFixed(3)}`);

  console.log("\n=== Kalibrering (test) ===");
  const pairs: [number, number][] = [];
  teZ.forEach((r) => raceProbs(r.z, betaTrVa).forEach((p, i) => pairs.push([p, i === r.winner ? 1 : 0])));
  for (const [lo, hi] of [[0, 0.03], [0.03, 0.06], [0.06, 0.1], [0.1, 0.15], [0.15, 0.25], [0.25, 0.4], [0.4, 1.01]]) {
    const bin = pairs.filter(([p]) => p >= lo && p < hi);
    if (!bin.length) continue;
    const pred = bin.reduce((a, [p]) => a + p, 0) / bin.length;
    const act = bin.reduce((a, [, w]) => a + w, 0) / bin.length;
    console.log(`  [${lo.toFixed(2)}, ${hi.toFixed(2)})  n=${String(bin.length).padStart(5)}  förutsagt=${pct(pred)}  faktiskt=${pct(act)}`);
  }

  console.log("\n=== Vikter (train+val) ===");
  FACTORS.map((f, i) => [f, betaTrVa[i]] as const)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([f, b]) => console.log(`  ${f.padEnd(18)} ${b >= 0 ? "+" : ""}${b.toFixed(3)}`));

  if (!has("--write")) {
    console.log("\n(Kör med --write för att skriva modellfilen.)");
    return;
  }
  if (testMetrics.pseudo_r2 < MIN_PSEUDO_R2 && !has("--force")) {
    console.error(
      `\nVägrar skriva: pseudo-R² ${testMetrics.pseudo_r2.toFixed(3)} < ${MIN_PSEUDO_R2}. ` +
        "Troligen fel i faktorberäkningen — undersök, eller kör med --force."
    );
    process.exit(1);
  }

  // Slutlig modell: banpar och vikter på all data
  const finalTables = estimateSpeedTables(speedRecords(examples, null));
  const betaAll = fitConditionalLogit(toTraining(examples, finalTables), k, LAMBDA);
  const model: FundamentalModel = {
    version: new Date().toISOString().slice(0, 10),
    trained_races: examples.length,
    test_metrics: {
      logloss: Number(testMetrics.logloss.toFixed(4)),
      pseudo_r2: Number(testMetrics.pseudo_r2.toFixed(4)),
      top1: Number(testMetrics.top1.toFixed(4)),
      top3: Number(testMetrics.top3.toFixed(4)),
    },
    temperature: Number(temperature.toFixed(4)),
    beta: Object.fromEntries(FACTORS.map((f, i) => [f, Number((betaAll[i] * temperature).toFixed(5))])),
    par: roundValues(finalTables.par),
    par_fallback: roundValues(finalTables.par_fallback),
    condition_adj: roundValues(finalTables.condition_adj),
  };
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2) + "\n");
  console.log(`\nSkrev ${MODEL_PATH} (version ${model.version}, ${examples.length} lopp).`);
}

function roundValues(rec: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(rec).sort().map(([k, v]) => [k, Number(v.toFixed(3))]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 7: Kör träningen utan att skriva.**
```bash
npm run fit-fundamental
```
Första körningen hämtar ett år från ATG, vilket tar cirka 45 minuter. Kör i bakgrunden. Cachen från forskningen i #93 har samma format (`games/*.json.gz` och `races/*.json.gz`) och kan kopieras till `.cache/atg/` för att hoppa över hämtningen. Kör då med `--skip-fetch`.

Förväntat: "Grundchans" har pseudo-R² ≥ 0,19 och toppval runt 30–33 %, i linje med forskningens 0,205 och 32,4 %. Vinnarodds ligger runt 0,29. Ligger Grundchans under 0,19: felsök faktorberäkningen genom att jämföra med Python-analysen i #93 innan du går vidare.

- [ ] **Step 8: Skriv modellen.**
```bash
npm run fit-fundamental -- --skip-fetch --write
```
Förväntat: "Skrev lib/data/fundamental-model.json (version 2026-…)". Kontrollera att `beta.barefoot_all > 0`, `beta.handicap_m < 0` och `beta.log_eps > 0`, som i forskningen.

- [ ] **Step 9: Commit.**
```bash
npx tsc --noEmit -p . && npx eslint lib/fundamental/atgAdapter.ts scripts/fit-fundamental.ts lib/__tests__/fundamental.atgAdapter.test.ts
git add lib/fundamental/atgAdapter.ts scripts/fit-fundamental.ts lib/__fixtures__/fundamental.ts lib/__tests__/fundamental.atgAdapter.test.ts package.json .gitignore lib/data/fundamental-model.json
git commit -m "Grundchans: träningsskript (ATG-år, conditional logit) och tränad modell

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: DB-adapter, strukna hästar och beräkning vid hämtning

**Files:**
- Create: `lib/fundamental/dbAdapter.ts`
- Modify: `lib/fundamental/index.ts`, `app/api/games/fetch/route.ts`
- Test: `lib/__tests__/fundamental.dbAdapter.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3 och, i paritetstestet, Task 5:s `fromAtgStart`/`fromAtgRace` med fixturer.
- Produces:
  - `DbRaceLike { distance: number | null; start_method: string | null; breed?: string | null; first_prize?: number | null }`
  - `DbStarterLike`: delmängd av starters-kolumnerna, alla valfria utom `start_number`. `AtgStarter` uppfyller typen strukturellt.
  - `fromDbRace(race: DbRaceLike, date: string): FundamentalRace`
  - `fromDbStarter(row: DbStarterLike): FundamentalStarter`
  - `scratchedMask(rows: DbStarterLike[]): boolean[]`
  - `computeFundamentalForRows(race: DbRaceLike, date: string, rows: DbStarterLike[], model?: FundamentalModel): (FundamentalResult | null)[]`, i samma ordning som `rows`. Struken häst ger null, och otränad modell ger enbart null.
  - `computeFundamentalMapForRows(race, date, rows, model?): Record<number, FundamentalResult>`

- [ ] **Step 1: Skriv fallerande tester** i `lib/__tests__/fundamental.dbAdapter.test.ts`:
```ts
import {
  computeFundamentalForRows,
  fromDbRace,
  fromDbStarter,
  scratchedMask,
  type DbStarterLike,
} from "../fundamental/dbAdapter";
import { computeRawFeatures } from "../fundamental/features";
import type { FundamentalModel } from "../fundamental/model";
import { fromAtgRace, fromAtgStart } from "../fundamental/atgAdapter";
import { ATG_RACE, ATG_START, TABLES } from "../__fixtures__/fundamental";

const TRAINED: FundamentalModel = {
  ...TABLES, version: "test", trained_races: 1, test_metrics: null, temperature: 1,
  beta: { log_eps: 0.3, handicap_m: -0.3 },
};
const UNTRAINED: FundamentalModel = { ...TRAINED, version: "untrained" };

function row(o: Partial<DbStarterLike> = {}): DbStarterLike {
  return {
    start_number: 1, post_position: 1, start_distance: 2140, horse_age: 6, horse_sex: "gelding",
    starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
    starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
    life_records: [], shoes_reported: true, shoes_front: true, shoes_back: true,
    shoes_front_changed: false, shoes_back_changed: false, sulky_type: "Vanlig",
    driver: "K", driver_win_pct: 10, trainer_win_pct: 10, start_points: 500,
    last_5_results: [], horse_starts_history: null, odds: 5, bet_distribution: 10, ...o,
  };
}
const RACE = { distance: 2140, start_method: "auto", breed: "V", first_prize: 50000 };

describe("fromDbRace", () => {
  it("fyller i reservvärden", () => {
    expect(fromDbRace({ distance: null, start_method: null }, "2026-09-20")).toEqual({
      date: "2026-09-20", distance: 2140, start_method: "auto", breed: "V", first_prize: null,
    });
  });
});

describe("fromDbStarter", () => {
  it("föredrar horse_starts_history men faller tillbaka på last_5_results", () => {
    const h = { date: "2026-09-01", track: "S", place: "1", time: "1:13,0", post_position: 1 };
    expect(fromDbStarter(row({ last_5_results: [h] })).history).toHaveLength(1);
    expect(fromDbStarter(row({ last_5_results: [h], horse_starts_history: [h, h] })).history).toHaveLength(2);
  });
  it("sulky och null-värden", () => {
    const s = fromDbStarter(row({ sulky_type: "Amerikansk", starts_total: null, post_position: null, start_number: 7 }));
    expect(s.american_sulky).toBe(true);
    expect(s.starts_total).toBe(0);
    expect(s.post_position).toBe(7);
  });
});

describe("paritet ATG ↔ DB", () => {
  it("samma häst ger samma faktorer oavsett källa", () => {
    const race = fromAtgRace(ATG_RACE);
    const fromAtg = fromAtgStart(ATG_START, race);
    // Samma värden som de skulle ha lagrats i DB via lib/atg.ts parseGame
    const fromDb = fromDbStarter(row({
      start_number: 4, post_position: 4, start_distance: 2160, horse_age: 6, horse_sex: "gelding",
      starts_total: 20, wins_total: 4, places_2nd: 3, places_3rd: 2, earnings_total: 400000,
      starts_current_year: 8, wins_current_year: 2, places_2nd_current_year: 1, places_3rd_current_year: 1,
      life_records: fromAtg.life_records, shoes_reported: true, shoes_front: false, shoes_back: false,
      shoes_front_changed: true, shoes_back_changed: false, sulky_type: "Amerikansk",
      driver: "Ulf Ohlsson", driver_win_pct: 15, trainer_win_pct: 10, start_points: 900,
      horse_starts_history: fromAtg.history, last_5_results: fromAtg.history,
    }));
    const dbRace = fromDbRace({ distance: 2140, start_method: "volte", breed: "V", first_prize: 50000 }, "2026-09-21");
    expect(computeRawFeatures(dbRace, fromDb, TABLES)).toEqual(computeRawFeatures(race, fromAtg, TABLES));
  });
});

describe("scratchedMask", () => {
  it("struken = fältet har marknadsdata men hästen saknar odds och streck", () => {
    expect(scratchedMask([row(), row({ odds: null, bet_distribution: 0 })])).toEqual([false, true]);
  });
  it("innan poolen öppnat är ingen struken", () => {
    expect(scratchedMask([row({ odds: null, bet_distribution: 0 }), row({ odds: 0, bet_distribution: null })]))
      .toEqual([false, false]);
  });
});

describe("computeFundamentalForRows", () => {
  it("ger null för strukna och summerar till 1 för övriga", () => {
    const res = computeFundamentalForRows(RACE, "2026-09-20", [
      row({ start_number: 1 }), row({ start_number: 2, earnings_total: 100000 }),
      row({ start_number: 3, odds: null, bet_distribution: 0 }),
    ], TRAINED);
    expect(res[2]).toBeNull();
    expect((res[0]!.p ?? 0) + (res[1]!.p ?? 0)).toBeCloseTo(1);
  });
  it("fungerar innan poolen öppnat", () => {
    const res = computeFundamentalForRows(RACE, "2026-09-20", [
      row({ start_number: 1, odds: null, bet_distribution: 0 }),
      row({ start_number: 2, odds: null, bet_distribution: 0 }),
    ], TRAINED);
    expect(res.every((r) => r?.p != null)).toBe(true);
  });
  it("otränad modell ger bara null", () => {
    expect(computeFundamentalForRows(RACE, "2026-09-20", [row(), row({ start_number: 2 })], UNTRAINED))
      .toEqual([null, null]);
  });
});
```

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.dbAdapter.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Implementera `lib/fundamental/dbAdapter.ts`:**
```ts
/**
 * Databasrader (starters/races) → Grundchans. Används av loppvyn, fetch-routen
 * och omräkningen. Odds/streck används bara för att känna igen strukna hästar.
 */
import type { HorseStart, LifeRecord } from "@/lib/atg";
import { isAmericanSulky, type FundamentalRace, type FundamentalStarter } from "./features";
import {
  computeFundamental,
  isModelTrained,
  MODEL,
  type FundamentalModel,
  type FundamentalResult,
} from "./model";

export interface DbRaceLike {
  distance: number | null;
  start_method: string | null;
  breed?: string | null;
  first_prize?: number | null;
}

export interface DbStarterLike {
  start_number: number;
  post_position?: number | null;
  start_distance?: number | null;
  horse_age?: number | null;
  horse_sex?: string | null;
  starts_total?: number | null;
  wins_total?: number | null;
  places_2nd?: number | null;
  places_3rd?: number | null;
  earnings_total?: number | null;
  starts_current_year?: number | null;
  wins_current_year?: number | null;
  places_2nd_current_year?: number | null;
  places_3rd_current_year?: number | null;
  life_records?: LifeRecord[] | null;
  shoes_reported?: boolean | null;
  shoes_front?: boolean | null;
  shoes_back?: boolean | null;
  shoes_front_changed?: boolean | null;
  shoes_back_changed?: boolean | null;
  sulky_type?: string | null;
  driver?: string | null;
  driver_win_pct?: number | null;
  trainer_win_pct?: number | null;
  start_points?: number | null;
  last_5_results?: HorseStart[] | null;
  horse_starts_history?: HorseStart[] | null;
  odds?: number | null;
  bet_distribution?: number | null;
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function fromDbRace(race: DbRaceLike, date: string): FundamentalRace {
  return {
    date: date.slice(0, 10),
    distance: race.distance ?? 2140,
    start_method: race.start_method ?? "auto",
    breed: race.breed === "K" ? "K" : "V",
    first_prize: race.first_prize ?? null,
  };
}

export function fromDbStarter(row: DbStarterLike): FundamentalStarter {
  const history =
    row.horse_starts_history && row.horse_starts_history.length > 0
      ? row.horse_starts_history
      : row.last_5_results ?? [];
  return {
    start_number: row.start_number,
    post_position: row.post_position ?? row.start_number,
    start_distance: row.start_distance ?? null,
    horse_age: row.horse_age ?? null,
    horse_sex: row.horse_sex ?? null,
    starts_total: n(row.starts_total),
    wins_total: n(row.wins_total),
    places_2nd: n(row.places_2nd),
    places_3rd: n(row.places_3rd),
    earnings_total: n(row.earnings_total),
    starts_current_year: n(row.starts_current_year),
    wins_current_year: n(row.wins_current_year),
    places_2nd_current_year: n(row.places_2nd_current_year),
    places_3rd_current_year: n(row.places_3rd_current_year),
    life_records: Array.isArray(row.life_records) ? row.life_records : [],
    shoes_reported: !!row.shoes_reported,
    shoes_front: !!row.shoes_front,
    shoes_back: !!row.shoes_back,
    shoes_front_changed: !!row.shoes_front_changed,
    shoes_back_changed: !!row.shoes_back_changed,
    american_sulky: isAmericanSulky(row.sulky_type),
    driver: row.driver || null,
    driver_win_pct: row.driver_win_pct ?? null,
    trainer_win_pct: row.trainer_win_pct ?? null,
    start_points: row.start_points ?? null,
    history: Array.isArray(history) ? history : [],
  };
}

const hasMarket = (r: DbStarterLike) => (r.odds ?? 0) > 0 || (r.bet_distribution ?? 0) > 0;

/** Struken = fältet har marknadsdata men hästen saknar både odds och streck */
export function scratchedMask(rows: DbStarterLike[]): boolean[] {
  const marketOpen = rows.some(hasMarket);
  return rows.map((r) => marketOpen && !hasMarket(r));
}

export function computeFundamentalForRows(
  race: DbRaceLike,
  date: string,
  rows: DbStarterLike[],
  model: FundamentalModel = MODEL
): (FundamentalResult | null)[] {
  if (!isModelTrained(model)) return rows.map(() => null);
  const scratched = scratchedMask(rows);
  const active = rows.filter((_, i) => !scratched[i]);
  const results = computeFundamental(fromDbRace(race, date), active.map(fromDbStarter), model);
  const byNumber = new Map(results.map((r) => [r.start_number, r]));
  return rows.map((r, i) => (scratched[i] ? null : byNumber.get(r.start_number) ?? null));
}

export function computeFundamentalMapForRows(
  race: DbRaceLike,
  date: string,
  rows: DbStarterLike[],
  model: FundamentalModel = MODEL
): Record<number, FundamentalResult> {
  const out: Record<number, FundamentalResult> = {};
  computeFundamentalForRows(race, date, rows, model).forEach((r) => {
    if (r) out[r.start_number] = r;
  });
  return out;
}
```
Lägg till i `lib/fundamental/index.ts`: `export * from "./dbAdapter";`

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental` ska ge PASS. Paritetstestet säkerställer att träning och app räknar likadant.

- [ ] **Step 5: Beräkna och spara i fetch-routen** (`app/api/games/fetch/route.ts`).
   - Import: `import { computeFundamentalForRows, MODEL, type FundamentalResult } from "@/lib/fundamental";`
   - Direkt efter blocket `const scores = calculateCompositeScore(...)` och dess längdkontroll:
```ts
      // Grundchans (odds-fri) — fel här får inte stoppa hämtningen
      let fundamental: (FundamentalResult | null)[] = uniqueStarters.map(() => null);
      try {
        fundamental = computeFundamentalForRows(
          { distance: race.distance, start_method: race.start_method, breed: race.breed, first_prize: race.first_prize },
          game.date || new Date().toISOString().slice(0, 10),
          uniqueStarters
        );
      } catch (err) {
        console.error(`[fetch] Grundchans fel avd ${race.race_number}:`, err instanceof Error ? err.message : String(err));
      }
```
   - I `starterRows`, efter `formscore: scores[i],`:
```ts
          fundamental_p: fundamental[i]?.p ?? null,
          fundamental_version: fundamental[i]?.p != null ? MODEL.version : null,
```

- [ ] **Step 6: Typkontroll och commit.**
```bash
npx tsc --noEmit -p . && npx eslint lib/fundamental app/api/games/fetch/route.ts lib/__tests__/fundamental.dbAdapter.test.ts
git add lib/fundamental/dbAdapter.ts lib/fundamental/index.ts app/api/games/fetch/route.ts lib/__tests__/fundamental.dbAdapter.test.ts
git commit -m "Grundchans: DB-adapter, strukna hästar och sparad Grundchans vid hämtning

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Backfill av nya fält och omräkning av Grundchans

**Files:**
- Create: `lib/fundamental/recompute.ts`
- Modify: `lib/fundamental/index.ts`, `scripts/backfill-history.ts`, `scripts/recompute-formscore.ts`, `app/api/admin/recompute-formscore/route.ts`
- Test: `lib/__tests__/fundamental.recompute.test.ts`

**Interfaces:**
- Consumes: `computeFundamentalForRows`, `MODEL` (Task 6); `parseFirstPrize`, `detectBreed` (Task 1).
- Produces:
  - `RecomputeRace { id: string; game_id: string; distance: number | null; start_method: string | null; breed: string | null; first_prize: number | null }`
  - `FundamentalUpdate { id: string; fundamental_p: number | null; fundamental_version: string | null }`
  - `computeFundamentalUpdates(races: RecomputeRace[], gameDates: Map<string, string>, starters: (DbStarterLike & { id: string; race_id: string; fundamental_p?: number | null; fundamental_version?: string | null })[], model?: FundamentalModel): FundamentalUpdate[]`. Returnerar bara rader vars värde eller version ändras.

- [ ] **Step 1: Skriv fallerande tester** i `lib/__tests__/fundamental.recompute.test.ts`:
```ts
import { computeFundamentalUpdates } from "../fundamental/recompute";
import type { FundamentalModel } from "../fundamental/model";
import { TABLES } from "../__fixtures__/fundamental";

const MODEL_T: FundamentalModel = {
  ...TABLES, version: "v2", trained_races: 1, test_metrics: null, temperature: 1, beta: { log_eps: 0.5 },
};
const races = [{ id: "G_1", game_id: "G", distance: 2140, start_method: "auto", breed: "V", first_prize: 50000 }];
const dates = new Map([["G", "2026-09-20"]]);
const base = { race_id: "G_1", starts_total: 10, odds: 5, bet_distribution: 10 };

describe("computeFundamentalUpdates", () => {
  it("returnerar bara ändrade rader", () => {
    const first = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1, earnings_total: 100000 },
      { ...base, id: "b", start_number: 2, earnings_total: 300000 },
    ], MODEL_T);
    expect(first).toHaveLength(2);
    expect(first[0].fundamental_version).toBe("v2");

    const again = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1, earnings_total: 100000, fundamental_p: first[0].fundamental_p, fundamental_version: "v2" },
      { ...base, id: "b", start_number: 2, earnings_total: 300000, fundamental_p: first[1].fundamental_p, fundamental_version: "v2" },
    ], MODEL_T);
    expect(again).toEqual([]);
  });
  it("nollställer strukna hästar som tidigare hade värde", () => {
    const res = computeFundamentalUpdates(races, dates, [
      { ...base, id: "a", start_number: 1 },
      { ...base, id: "b", start_number: 2 },
      { ...base, id: "c", start_number: 3, odds: null, bet_distribution: 0, fundamental_p: 0.2, fundamental_version: "v1" },
    ], MODEL_T);
    expect(res.find((u) => u.id === "c")).toEqual({ id: "c", fundamental_p: null, fundamental_version: null });
  });
  it("hoppar över lopp utan avdelningsdata", () => {
    expect(computeFundamentalUpdates([], dates, [{ ...base, id: "a", start_number: 1 }], MODEL_T)).toEqual([]);
  });
});
```

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/fundamental.recompute.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Implementera `lib/fundamental/recompute.ts`:**
```ts
/** Vilka starters behöver nytt fundamental_p? Delas av omräkningsskriptet och adminroute. */
import { computeFundamentalForRows, type DbStarterLike } from "./dbAdapter";
import { MODEL, type FundamentalModel } from "./model";

export interface RecomputeRace {
  id: string;
  game_id: string;
  distance: number | null;
  start_method: string | null;
  breed: string | null;
  first_prize: number | null;
}

export interface FundamentalUpdate {
  id: string;
  fundamental_p: number | null;
  fundamental_version: string | null;
}

type Row = DbStarterLike & {
  id: string;
  race_id: string;
  fundamental_p?: number | null;
  fundamental_version?: string | null;
};

export function computeFundamentalUpdates(
  races: RecomputeRace[],
  gameDates: Map<string, string>,
  starters: Row[],
  model: FundamentalModel = MODEL
): FundamentalUpdate[] {
  const raceById = new Map(races.map((r) => [r.id, r]));
  const byRace = new Map<string, Row[]>();
  for (const s of starters) {
    if (!byRace.has(s.race_id)) byRace.set(s.race_id, []);
    byRace.get(s.race_id)!.push(s);
  }

  const updates: FundamentalUpdate[] = [];
  for (const [raceId, rows] of byRace) {
    const race = raceById.get(raceId);
    const date = race ? gameDates.get(race.game_id) : undefined;
    if (!race || !date) continue;
    const results = computeFundamentalForRows(race, date, rows, model);
    rows.forEach((row, i) => {
      const p = results[i]?.p ?? null;
      const version = p != null ? model.version : null;
      const old = row.fundamental_p ?? null;
      const same =
        (old == null && p == null) || (old != null && p != null && Math.abs(old - p) < 1e-9);
      if (!same || (row.fundamental_version ?? null) !== version) {
        updates.push({ id: row.id, fundamental_p: p, fundamental_version: version });
      }
    });
  }
  return updates;
}
```
Lägg till i `lib/fundamental/index.ts`: `export * from "./recompute";`

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/fundamental.recompute.test.ts` ska ge PASS.

- [ ] **Step 5: Utöka `scripts/recompute-formscore.ts`.**
   - Importer:
```ts
import { computeFundamentalUpdates, MODEL, type RecomputeRace } from "../lib/fundamental";
```
   - Ändra games-läsningen till `db.from("games").select("id, track, date")` och races-läsningen till `db.from("races").select("id, game_id, distance, start_method, breed, first_prize")`.
   - Sist i `main()`, efter `console.log(\`\nKlart — ${written} rader uppdaterade.\`);`, och även i grenen `if (changed === 0)`. Ersätt därför `return;` i den grenen med en fortsättning genom att lyfta formscore-skrivningen in i ett `if (changed > 0) { … }`-block. Lägg till:
```ts
  // --- Grundchans ---
  const gameDates = new Map((games ?? []).map((g) => [g.id as string, String(g.date)]));
  const fUpdates = computeFundamentalUpdates(
    (races ?? []) as unknown as RecomputeRace[],
    gameDates,
    allStarters as unknown as Parameters<typeof computeFundamentalUpdates>[2]
  );
  console.log(`\nGrundchans (modell ${MODEL.version}): ${fUpdates.length} rader får nytt värde.`);
  if (!dry && fUpdates.length > 0) {
    for (let i = 0; i < fUpdates.length; i += 20) {
      const batch = fUpdates.slice(i, i + 20);
      const res = await Promise.all(
        batch.map((u) =>
          db.from("starters").update({ fundamental_p: u.fundamental_p, fundamental_version: u.fundamental_version }).eq("id", u.id)
        )
      );
      res.forEach((r) => r.error && console.error(`  fel: ${r.error.message}`));
      process.stdout.write(`\r  ${Math.min(i + 20, fUpdates.length)}/${fUpdates.length}`);
    }
    console.log("\nGrundchans uppdaterad.");
  }
```
   - Uppdatera filhuvudets kommentar: "Räknar om lagrad Composite Score **och Grundchans** …".

- [ ] **Step 6: Utöka adminrouten** (`app/api/admin/recompute-formscore/route.ts`).
   - Import: `import { computeFundamentalUpdates, type RecomputeRace } from "@/lib/fundamental";`
   - Ändra selecten för games till `"id, track, date"` och för races till `"id, game_id, distance, start_method, breed, first_prize"`.
   - Före `return NextResponse.json({ updated: changed, races: racesProcessed });`:
```ts
    // Grundchans — float-värden, uppdateras per rad i batchar om 20
    const gameDates = new Map((games ?? []).map((g) => [g.id as string, String(g.date)]));
    const fUpdates = computeFundamentalUpdates(
      (races ?? []) as unknown as RecomputeRace[],
      gameDates,
      allStarters as unknown as Parameters<typeof computeFundamentalUpdates>[2]
    );
    for (let i = 0; i < fUpdates.length; i += 20) {
      const res = await Promise.all(
        fUpdates.slice(i, i + 20).map((u) =>
          db.from("starters").update({ fundamental_p: u.fundamental_p, fundamental_version: u.fundamental_version }).eq("id", u.id)
        )
      );
      const failed = res.find((r) => r.error);
      if (failed?.error) throw new Error(`update fundamental: ${failed.error.message}`);
    }
```
   - Ändra svaret till `{ updated: changed, races: racesProcessed, fundamental_updated: fUpdates.length }`.

- [ ] **Step 7: Utöka `scripts/backfill-history.ts`.** Den ska skriva nya fält och kusk i historiken.
   - Import: `import { detectBreed, fetchRaceHistories, parseFirstPrize, parseGameResults } from "../lib/atg";`
   - I loopen `for (const race of races ?? [])`, efter `const atgRaceId = …; if (!atgRaceId) continue;`:
```ts
      const atgRace = atgRaces[race.race_number - 1] ?? {};
      const atgStarts = (atgRace["starts"] as Record<string, unknown>[] | undefined) ?? [];
      const startByNumber = new Map(atgStarts.map((s) => [Number(s["number"]), s]));
      if (!dry) {
        await db
          .from("races")
          .update({ first_prize: parseFirstPrize(atgRace["prize"]), breed: detectBreed(atgRace["terms"]) })
          .eq("id", race.id);
      }
```
   - Ersätt starter-updaten (`.update({ last_5_results: …, horse_starts_history: history })`) med en uppdatering som även tar nya fält. Rader som saknar historik ska också få fälten. Flytta därför `if (!history …) continue;` så att den bara styr historikdelen:
```ts
        const atgStart = startByNumber.get(s.start_number) ?? {};
        const life = ((atgStart["horse"] as Record<string, unknown> | undefined)?.["statistics"] as Record<string, unknown> | undefined)?.["life"] as Record<string, unknown> | undefined;
        const patch: Record<string, unknown> = {
          start_distance: atgStart["distance"] != null ? Number(atgStart["distance"]) : null,
          start_points: life?.["startPoints"] != null ? Number(life["startPoints"]) : null,
        };
        const history = histories.get(s.start_number);
        if (history && history.length > 0) {
          historyRows++;
          patch.last_5_results = history.slice(0, 5);
          patch.horse_starts_history = history;
        }
        if (!dry) {
          const { error: upErr } = await db.from("starters").update(patch).eq("id", s.id);
          if (upErr) console.warn(`  ${race.id} nr ${s.start_number}: ${upErr.message}`);
        }
```
   - Uppdatera filhuvudet: skriptet fyller även `races.first_prize/breed` och `starters.start_distance/start_points`.

- [ ] **Step 8: Typkontroll, alla tester och commit.**
```bash
npx tsc --noEmit -p . && npx jest lib/__tests__ && npx eslint lib/fundamental scripts app/api/admin/recompute-formscore/route.ts
git add lib/fundamental/recompute.ts lib/fundamental/index.ts lib/__tests__/fundamental.recompute.test.ts scripts/backfill-history.ts scripts/recompute-formscore.ts app/api/admin/recompute-formscore/route.ts
git commit -m "Grundchans: omräkning (skript + adminknapp) och backfill av nya fält

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Loppvyn och analysverktyget

**Files:**
- Modify: `app/(authenticated)/page.tsx` (`getRaces`), `components/RaceList.tsx`, `components/AnalysisPanel.tsx`

**Interfaces:**
- Consumes: `computeFundamentalMapForRows`, `isDisagreement`, `FundamentalResult` från `@/lib/fundamental` (Task 3, 6).
- Produces:
  - `AnalysisPanel`-propen `fundamentalMap?: Record<number, FundamentalResult>`
  - `RaceList` skickar `fundamental={fundamentalMap[s.start_number]}` till `HorseCard` (propen införs i Task 9)
  - `RaceList` får `SortKey` med `"grund"`

Den här tasken är UI utan enhetstester. Logiken (`isDisagreement`, `computeFundamentalMapForRows`) testas redan i Task 3 och 6. Verifieringen görs med typkontroll och en manuell kontroll i dev-servern.

- [ ] **Step 1: Hämta fälten** i `app/(authenticated)/page.tsx` → `getRaces`:
   - races-listan: `id, race_number, race_name, distance, start_method, start_time, breed, first_prize,`
   - starters-listan: lägg till `start_distance, start_points, horse_starts_history,` efter `last_5_results,`.

- [ ] **Step 2: Typer och beräkning i `components/RaceList.tsx`.**
   - Import:
```ts
import { computeFundamentalMapForRows, type FundamentalResult } from "@/lib/fundamental";
import type { HorseStart } from "@/lib/atg";
```
   - I `interface Starter`: ersätt `last_5_results: { place: string; date: string; track: string; time: string }[];` med:
```ts
  last_5_results: HorseStart[];
  horse_starts_history?: HorseStart[] | null;
  start_distance?: number | null;
  start_points?: number | null;
```
   - I `interface Race`, efter `start_time`:
```ts
  breed?: string | null;
  first_prize?: number | null;
```
   - `type SortKey = "number" | "odds" | "bet" | "composite" | "grund";` och i `SORT_OPTIONS` efter composite: `{ key: "grund", label: "Grundchans (högst)" },`
   - Direkt efter `const edgeMap = computeEdgeMap(...)`:
```ts
  // Grundchans (odds-fri) — relativ fältet, beräknas före filtrering
  const raceDate = activeRace.start_time?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const fundamentalMap: Record<number, FundamentalResult> = computeFundamentalMapForRows(
    activeRace, raceDate, activeRace.starters
  );
```
   - `sortStarters` får en parameter till: `function sortStarters(starters: Starter[], compositeMap: Record<number, number>, grundMap: Record<number, FundamentalResult>): Starter[]` och ett nytt case:
```ts
        case "grund":
          return (grundMap[b.start_number]?.p ?? -1) - (grundMap[a.start_number]?.p ?? -1);
```
   - Anropet blir `const sorted = sortStarters(filtered, compositeMap, fundamentalMap);`.
   - `<AnalysisPanel … edgeMap={edgeMap} fundamentalMap={fundamentalMap} />`
   - `HorseCard` får `fundamental`-propen i Task 9, inte här, så att varje commit typkontrolleras.

- [ ] **Step 3: Kolumnen "Grund" och "Oense" i `components/AnalysisPanel.tsx`.**
   - Import: `import { isDisagreement, type FundamentalResult } from "@/lib/fundamental";` och `import { useState } from "react";`
   - Props:
```ts
  /** Grundchans (odds-fri), nycklad på startnummer */
  fundamentalMap?: Record<number, FundamentalResult>;
```
   - `RankedStarter` får `grundPct: number | null; disagree: boolean;`. I `rankStarters`, med ny parameter `fundamentalMap?: Record<number, FundamentalResult>`:
```ts
    const grundP = fundamentalMap?.[s.start_number]?.p ?? null;
    const grundPct = grundP != null ? Math.round(grundP * 1000) / 10 : null;
    const disagree = isDisagreement(grundP, streckPct > 0 ? streckPct : null);
```
     Lägg till dem i retur-objektet.
   - Sortering i komponenten:
```ts
  const [sortBy, setSortBy] = useState<"cs" | "grund">("cs");
  const ranked = rankStarters(starters, raceMeters, raceStartMethod, trackConfig, probMap, fundamentalMap);
  const rows = sortBy === "grund"
    ? [...ranked].sort((a, b) => (b.grundPct ?? -1) - (a.grundPct ?? -1))
    : ranked;
  const hasGrund = ranked.some((r) => r.grundPct != null);
```
     Rendera `rows` i stället för `ranked` i `<tbody>`.
   - Rubrikraden: lägg `"Grund"` direkt efter `"Chans"` när `hasGrund`, och gör "CS" och "Grund" klickbara:
```tsx
{["#", "Häst", "CS", "Odds", "Chans", ...(hasGrund ? ["Grund"] : []), "Strk.", "Distans", ...(trackConfig ? ["Spår"] : []), "Värde", "Signaler", "Res."].map((h) => {
  const sortable = h === "CS" || h === "Grund";
  const active = (h === "CS" && sortBy === "cs") || (h === "Grund" && sortBy === "grund");
  return (
    <th
      key={h}
      className="tn-eyebrow py-2.5 px-2 first:pl-4 last:pr-4 font-normal"
      style={{ textAlign: h === "Häst" || h === "Distans" || h === "#" ? "left" : "right" }}
      title={h === "Grund" ? "Grundchans: vinstchans utan odds och streck — bygger på hästens meriter, form, km-tider, spår, tillägg, skor och kusk/tränare" : undefined}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => setSortBy(h === "CS" ? "cs" : "grund")}
          style={{ background: "none", border: "none", cursor: "pointer", color: active ? "var(--tn-accent)" : "inherit", font: "inherit", letterSpacing: "inherit" }}
        >
          {h}{active ? " ↓" : ""}
        </button>
      ) : h}
    </th>
  );
})}
```
   - Cellen efter "Chans":
```tsx
{hasGrund && (
  <td className="py-2.5 pr-2 text-right tn-mono text-xs font-semibold" style={{ color: "var(--tn-text)" }}>
    {r.grundPct != null ? `${r.grundPct}%` : "–"}
  </td>
)}
```
   - "Oense"-märket i namncellen, efter SKRÄLL-märket:
```tsx
{r.disagree && (
  <span
    className="ml-2 tn-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
    style={{ background: "var(--tn-accent-faint)", color: "var(--tn-accent)", letterSpacing: "0.08em" }}
    title="Grundchans (utan odds/streck) och spelarna bedömer hästen olika — inte ett bevisat spelvärde."
  >
    OENSE
  </span>
)}
```
   - Rubriktexten: lägg till efter meningen om **Chans**:
     `{" "}<strong>Grund</strong> = Grundchans: vinstchans enbart från hästens egna meriter, form och förutsättningar (utan odds och streck).`

- [ ] **Step 4: Typkontroll och lint.** `npx tsc --noEmit -p . && npx eslint components/RaceList.tsx components/AnalysisPanel.tsx "app/(authenticated)/page.tsx"` ska vara rena.

- [ ] **Step 5: Manuell kontroll.** Kör `npm run dev`, logga in och öppna en omgång. Kontrollera:
   - Under "Visa analys" finns kolumnen "Grund".
   - Klick på "Grund" sorterar efter Grundchans, och klick på "CS" sorterar tillbaka.
   - Värdena i "Grund" summerar till cirka 100 % i en avdelning.
   - Minst en häst bör ha OENSE i en typisk avdelning, men det är inget krav.
   - Sorteringsmenyn har "Grundchans (högst)".

- [ ] **Step 6: Commit.**
```bash
git add "app/(authenticated)/page.tsx" components/RaceList.tsx components/AnalysisPanel.tsx
git commit -m "Grundchans: kolumn och Oense-markering i analysverktyget, sortering i loppvyn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Hästkortet

**Files:**
- Modify: `components/HorseCard.tsx`, `components/RaceList.tsx` (propen skickas)

**Interfaces:**
- Consumes: `topReasons`, `FundamentalResult` (Task 3).
- Produces: `HorseCard`-propen `fundamental?: FundamentalResult`.

- [ ] **Step 1: Prop och import** i `components/HorseCard.tsx`.
   - `import { topReasons, type FundamentalResult } from "@/lib/fundamental";`
   - Lägg till `fundamental,` i destruktureringen och `fundamental?: FundamentalResult;` i props-typen, efter `edge`.

- [ ] **Step 2: Grundchans i sifferraden.** I raden "Right: streck% · odds · badges", först i `<div className="flex items-center gap-2">`:
```tsx
{fundamental?.p != null && (
  <span
    className="tn-mono text-xs"
    style={{ color: "var(--tn-text)" }}
    title="Grundchans: vinstchans utan odds och streck"
  >
    Grund {(fundamental.p * 100).toFixed(1)}%
  </span>
)}
```

- [ ] **Step 3: "Varför"-raden i den expanderade vyn.** Placera den direkt efter blocket `{/* Horse info */}`:
```tsx
{fundamental?.p != null && fundamental.contributions.length > 0 && (
  <div className="text-xs" style={{ color: "var(--tn-text-dim)" }}>
    <span className="tn-eyebrow mr-2">Grundchans {(fundamental.p * 100).toFixed(1)}%</span>
    <span>Varför: {topReasons(fundamental).join(" · ")}</span>
  </div>
)}
```

- [ ] **Step 4: Skicka propen från `components/RaceList.tsx`:** `fundamental={fundamentalMap[s.start_number]}` i `<HorseCard …>`.

- [ ] **Step 5: Typkontroll, lint och manuell kontroll.**
```bash
npx tsc --noEmit -p . && npx eslint components/HorseCard.tsx components/RaceList.tsx
```
I dev-servern ska hästkortet visa "Grund X %". Under "▼ DETALJER" ska det stå till exempel "Varför: + pengar/start · + barfota · − tillägg".

- [ ] **Step 6: Commit.**
```bash
git add components/HorseCard.tsx components/RaceList.tsx
git commit -m "Grundchans: värde och Varför-förklaring på hästkortet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Utvärderingssidan

**Files:**
- Create: `lib/evaluation.ts`
- Modify: `app/(authenticated)/evaluation/page.tsx`, `components/EvaluationPanel.tsx`
- Test: `lib/__tests__/evaluation.test.ts`

Två befintliga brister rättas här, eftersom de annars gör Grundchans-måtten missvisande:

1. Starters-frågan hämtar bara rader med `finish_position`. Hästar som galopperat eller diskats försvinner då, och toppvalet väljs bara bland de som fullföljt.
2. Frågan saknar paginering. Supabase returnerar högst 1 000 rader, men det finns cirka 2 800.

CS-siffrorna på sidan kommer därför att ändras och bli korrekta. Nämn det i PR:en.

**Interfaces:**
- Produces:
  - `EvalStarterRow { race_id; start_number; formscore: number | null; fundamental_p: number | null; finish_position: number | null; races: {...} | null; horses: {...} | null }`
  - `computeEvaluation(rows: EvalStarterRow[]): { overall: Overall; games: GameEval[] }`
  - `Overall` utökas med `fundamental_races_evaluated`, `fundamental_top_pick_win_rate` och `fundamental_top_3_coverage_rate`.

- [ ] **Step 1: Skriv fallerande tester** i `lib/__tests__/evaluation.test.ts`:
```ts
import { computeEvaluation, type EvalStarterRow } from "../evaluation";

function r(race: string, nr: number, cs: number, grund: number | null, pos: number | null): EvalStarterRow {
  return {
    race_id: race, start_number: nr, formscore: cs, fundamental_p: grund, finish_position: pos,
    races: { race_number: Number(race.slice(-1)), game_id: "G", games: { id: "G", date: "2026-09-20", game_type: "V85", track: "S" } },
    horses: { name: `H${nr}` },
  };
}

describe("computeEvaluation", () => {
  const rows = [
    // Lopp 1: CS-favorit galopperar (ingen placering) — ska ändå räknas som toppval och miss
    r("G_1", 1, 90, 0.5, null), r("G_1", 2, 50, 0.3, 1), r("G_1", 3, 40, 0.2, 2),
    // Lopp 2: båda träffar
    r("G_2", 1, 80, 0.6, 1), r("G_2", 2, 20, 0.4, 2),
    // Lopp 3: Grundchans saknas för en häst → räknas bara för CS
    r("G_3", 1, 70, null, 1), r("G_3", 2, 30, 0.5, 2),
  ];
  const { overall } = computeEvaluation(rows);

  it("CS räknas på alla startande, inte bara de som fullföljt", () => {
    expect(overall.races_evaluated).toBe(3);
    expect(overall.top_pick_win_rate).toBeCloseTo((2 / 3) * 100);
  });
  it("Grundchans räknas bara där alla har värde", () => {
    expect(overall.fundamental_races_evaluated).toBe(2);
    expect(overall.fundamental_top_pick_win_rate).toBeCloseTo(50);
    expect(overall.fundamental_top_3_coverage_rate).toBeCloseTo(100);
  });
});
```

- [ ] **Step 2: Kör testerna och se dem falla.** `npx jest lib/__tests__/evaluation.test.ts` ska ge FAIL eftersom modulen saknas.

- [ ] **Step 3: Skapa `lib/evaluation.ts`.**
   1. Flytta `interface StarterRow`, `RaceEval`, `GameEval` och `function computeEvaluation` från `app/(authenticated)/evaluation/page.tsx` hit.
   2. Döp om `StarterRow` till `EvalStarterRow` och exportera den, tillsammans med `RaceEval`, `GameEval`, `Overall` och `computeEvaluation`.
   3. Lägg till `fundamental_p: number | null;` i `EvalStarterRow`.
   4. I loopen per lopp, efter att `top_3_covered_winner` räknats ut, lägg till:
```ts
      // Grundchans: bara lopp där alla startande har ett sparat värde
      if (starters.every((s) => s.fundamental_p != null)) {
        const byGrund = [...starters].sort((a, b) => (b.fundamental_p ?? 0) - (a.fundamental_p ?? 0));
        fundamentalRaces++;
        if (byGrund[0].start_number === winner.start_number) fundamentalTopWins++;
        if (byGrund.slice(0, 3).some((s) => s.start_number === winner.start_number)) fundamentalTop3++;
      }
```
      Deklarera `let fundamentalRaces = 0, fundamentalTopWins = 0, fundamentalTop3 = 0;` bredvid `totalRaces`.
   5. Utöka `overall`:
```ts
      fundamental_races_evaluated: fundamentalRaces,
      fundamental_top_pick_win_rate: fundamentalRaces > 0 ? (fundamentalTopWins / fundamentalRaces) * 100 : 0,
      fundamental_top_3_coverage_rate: fundamentalRaces > 0 ? (fundamentalTop3 / fundamentalRaces) * 100 : 0,
```
   6. Lägg exporterad `interface Overall` här med de sju fälten och importera den i `EvaluationPanel` i stället för den lokala.

- [ ] **Step 4: Kör testerna och se dem gå igenom.** `npx jest lib/__tests__/evaluation.test.ts` ska ge PASS.

- [ ] **Step 5: Paginerad fråga över alla startande** i `app/(authenticated)/evaluation/page.tsx`.
   - Importera `computeEvaluation` och `type EvalStarterRow` från `@/lib/evaluation` och ta bort de flyttade definitionerna.
   - Ersätt starters-frågan (`const { data } = await supabase.from("starters")…`) med:
```ts
  // Alla startande i lopp med formscore (även de som galopperat) — sidvis,
  // Supabase returnerar högst 1 000 rader per anrop
  const rows: EvalStarterRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("starters")
      .select(`
        race_id, start_number, formscore, fundamental_p, finish_position,
        races ( race_number, game_id, games ( id, date, game_type, track ) ),
        horses ( name )
      `)
      .not("formscore", "is", null)
      .order("race_id")
      .order("start_number")
      .range(from, from + 999);
    rows.push(...((page ?? []) as unknown as EvalStarterRow[]));
    if (!page || page.length < 1000) break;
  }
```
   - Ersätt `const rows = (data ?? []) as unknown as StarterRow[];` med ingenting, eftersom `rows` redan finns.
   - Gör samma paginering för `resultedRacesData`-frågan med samma mönster, eftersom den också kan ha fler än 1 000 rader.

- [ ] **Step 6: Visa måtten** i `components/EvaluationPanel.tsx`.
   - Ändra `grid-cols-1 sm:grid-cols-3` till `grid-cols-1 sm:grid-cols-3 lg:grid-cols-5`.
   - Efter kortet "Vinnare bland topp 3 (CS)":
```tsx
{overall.fundamental_races_evaluated > 0 && (
  <>
    <StatCard
      label="Grundchans toppval vinner"
      value={`${overall.fundamental_top_pick_win_rate.toFixed(0)}%`}
      sub={`av ${overall.fundamental_races_evaluated} avdelningar`}
    />
    <StatCard
      label="Vinnare bland topp 3 (Grundchans)"
      value={`${overall.fundamental_top_3_coverage_rate.toFixed(0)}%`}
      sub="utan odds och streck"
    />
  </>
)}
```
   - Ändra ingressen "Utvärderar hur ofta hästarna med högst Composite Score (CS) vinner loppet." till: "Utvärderar hur ofta hästarna med högst Composite Score (CS) — och högst Grundchans — vinner loppet. Alla startande räknas, även hästar som galopperat."

- [ ] **Step 7: Typkontroll, lint och manuell kontroll.**
```bash
npx tsc --noEmit -p . && npx eslint lib/evaluation.ts "app/(authenticated)/evaluation/page.tsx" components/EvaluationPanel.tsx
```
I dev-servern ska `/evaluation` visa de två Grundchans-korten när `fundamental_p` finns, alltså efter Task 12 Step 3. Antalet avdelningar ska vara cirka 380, inte begränsat av 1 000 rader.

- [ ] **Step 8: Commit.**
```bash
git add lib/evaluation.ts lib/__tests__/evaluation.test.ts "app/(authenticated)/evaluation/page.tsx" components/EvaluationPanel.tsx
git commit -m "Grundchans på utvärderingssidan; räkna alla startande och paginera förbi 1 000 rader

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Dokumentation

**Files:**
- Modify: `MANUAL.md`, `CLAUDE.md`

- [ ] **Step 1: MANUAL.md, nytt avsnitt "Grundchans".** Lägg det efter avsnittet om tysta signaler (6.1) och numrera som underavsnitt i samma kapitel:
```markdown
### Grundchans

**Grundchans** är en egen vinstchans som räknas fram **helt utan odds och streck**, alltså utan att titta på vad andra spelare tror. Den bygger bara på hästens egna förutsättningar:

- **Meriter:** pengar per start, vinst- och platsprocent (karriär och i år), rekordtid på distansen
- **Form:** placeringar och km-tider de senaste starterna (justerade för bana och underlag), formtrend, galopprisk, vila sedan senaste start
- **Dagens lopp:** spår och startled, tillägg, klassbyte (om hästen möter lättare eller svårare motstånd än senast)
- **Utrustning och folk:** barfota/skobyte, sulky, kuskens och tränarens form i år, kuskbyte
- **Ålder och kön**

Vikterna är kalibrerade mot ett års avgjorda travlopp (cirka 3 700). Grundchans för hela fältet summerar till 100 %.

**Var syns den?**
- **Analysverktyget:** kolumnen **Grund** bredvid Chans. Klicka på rubriken för att sortera.
- **Hästkortet:** "Grund X %", och under **Detaljer** en **Varför**-rad med de tre faktorer som påverkar mest (t.ex. "+ pengar/start · + barfota · − tillägg").
- **Sorteringen** i loppvyn: "Grundchans (högst)".
- **Utvärderingssidan:** hur ofta Grundchans toppval vinner.

**OENSE** markeras när Grundchans och strecket skiljer sig kraftigt (minst 1,5 gånger eller högst hälften, och minst 3 procentenheter). Det betyder bara att modellen och spelarna bedömer hästen olika. **Det är inget bevisat spelvärde.** I tester var Grundchans ungefär 70 % så träffsäker som marknaden och gav ingen säker fördel mot den.

Grundchans finns även **innan spelet öppnat**, när odds och streck saknas.
```
   - Lägg till i ordlistan: `| **Grundchans** | Vinstchans enbart från hästens egna meriter, form och förutsättningar — utan odds och streck |`
   - I avsnittet om utvärderingssidan, lägg till punkten: `- **Grundchans toppval vinner** – samma mått för Grundchans (räknas på avdelningar där Grundchans finns).`

- [ ] **Step 2: CLAUDE.md.**
   - Kommandon:
```
npm run fit-fundamental      # Tränar Grundchans på ett års ATG-data (cache i .cache/atg/). --write skriver lib/data/fundamental-model.json
```
     och ändra kommentaren för `recompute-formscore` till "Räkna om lagrad CS **och Grundchans** …".
   - Katalogstrukturen under `lib/`:
```
  fundamental/              # Grundchans (odds-fri conditional logit)
    features.ts             # 33 faktorer, hastighetssiffra (banpar)
    model.ts                # standardisering, softmax, förklaringar, Oense
    fit.ts                  # skattning (L-BFGS), mått, banpar-skattning
    atgAdapter.ts / dbAdapter.ts  # ATG-JSON resp. DB-rader → indata
    recompute.ts            # vilka rader behöver nytt fundamental_p
  data/fundamental-model.json  # tränad modell (genereras av fit-fundamental)
  evaluation.ts             # utvärderingsmått (CS + Grundchans)
```
     och `fit-fundamental.ts` under `scripts/`.
   - Datamodellen: lägg till `first_prize, breed` på races samt `start_distance, start_points, fundamental_p, fundamental_version` på starters.
   - "Nyckelalgoritmer", nytt avsnitt:
```markdown
### Grundchans (odds-fri) – `lib/fundamental/`
Conditional logit (Bolton & Chapman 1986, Benter 1994) på 33 faktorer som
z-poängsätts inom fältet: `p_i = softmax(Σ β_k·z_ik)`. Använder **aldrig**
odds/streck (bara för att känna igen strukna hästar). Hastighetssiffra =
−(km-tid − banpar[ras, bana, startmetod, distans] − underlag). Vikter och banpar i
`lib/data/fundamental-model.json`, tränas med `npm run fit-fundamental` (vägrar
skriva om test-pseudo-R² < 0,19). Loppvyn räknar live; `starters.fundamental_p`
sparas vid hämtning/omräkning för utvärderingssidan. Bakgrund: issue #93.
```

- [ ] **Step 3: Commit.**
```bash
git add MANUAL.md CLAUDE.md
git commit -m "Grundchans: manual och CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Utrullning och slutverifiering

Flera steg här skriver till produktionsdatabasen. Fråga användaren innan steg 2 och 3 körs skarpt; torrkörningarna går bra utan att fråga.

- [ ] **Step 1: Fullständig verifiering.**
```bash
npx jest lib/__tests__ && npx tsc --noEmit -p . && npx eslint lib scripts app components proxy.ts && npm run build
```
Förväntat: alla tester PASS, typkontrollen är ren, och bygget lyckas. De befintliga lintfelen i orörda filer (t.ex. `ThemeProvider.tsx`) är kända och ska inte räknas som nya.

- [ ] **Step 2: Backfill av nya fält.** Kontrollera först att migrationen är körd (Task 1 Step 7).
```bash
npm run backfill-history -- --dry --game V86_2026-09-16_40_1
npm run backfill-history            # efter användarens ok
```
Verifiera:
```sql
select count(*) filter (where first_prize is not null) fp, count(*) filter (where breed is not null) br from races;
select count(*) filter (where start_distance is not null) sd, count(*) filter (where start_points is not null) sp from starters;
```

- [ ] **Step 3: Räkna ut Grundchans för befintliga omgångar.**
```bash
npm run recompute-formscore -- --dry   # visar "Grundchans (modell …): N rader får nytt värde."
npm run recompute-formscore            # efter användarens ok
```
Verifiera:
```sql
select count(*) filter (where fundamental_p is not null) p, count(distinct fundamental_version) v from starters;
```
Förväntat: tusentals rader med p och exakt en version.

Kontrollera också att träffsäkerheten i databasen ligger i linje med testerna:
```sql
with ranked as (
  select race_id, start_number, finish_position,
         rank() over (partition by race_id order by fundamental_p desc) rk
  from starters where fundamental_p is not null)
select round(100.0 * avg(case when finish_position = 1 then 1 else 0 end), 1) as grund_top1_pct
from ranked where rk = 1
  and race_id in (select race_id from starters where finish_position = 1);
```
Förväntat: cirka 28–35 %.

- [ ] **Step 4: Push och PR.**
```bash
git push -u origin claude/grundchans-r8m3tx
gh pr create --base main --title "Grundchans: odds-fri vinstsannolikhet (#93)" --body-file pr-body.md
```
Skriv `pr-body.md` (checkas inte in) med följande rubriker och innehåll:
1. **Vad:** Grundchans, länk till #93 och specen, samt var det syns (analysverktyget, hästkortet, utvärderingssidan).
2. **Träffsäkerhet:** tabellen "Testperiod" från `npm run fit-fundamental` (Likformig, Grundchans, Vinnarodds, Streck med logloss, pseudo-R², topp 1 och topp 3), plus antal lopp och modellversion.
3. **Ändrat beteende:** utvärderingssidan räknar nu alla startande och paginerar förbi 1 000 rader, så CS-siffrorna ändras och blir korrekta.
4. **Redan kört mot produktion:** migration v14, `backfill-history`, `recompute-formscore` (med antal rader från körningarna).
5. **Träna om:** `npm run fit-fundamental -- --write` följt av `npm run recompute-formscore`.
6. Sist: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: Efter merge och deploy.** Kontrollera i produktion:
   - Analysverktyget visar kolumnen "Grund".
   - Hästkortet visar "Varför".
   - Utvärderingssidan visar Grundchans-korten.
   - Nästa omgångshämtning sparar `fundamental_p`. Verifiera med SQL på den senaste omgången.
