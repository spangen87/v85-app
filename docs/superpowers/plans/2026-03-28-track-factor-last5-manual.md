# Spårfaktor, Last 5-fix och Manualuppdatering – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fixa att `last_5_results` faktiskt hämtas vid inläsning av omgång, lägg till spårfaktor (post_position) i CS-beräkningen, och uppdatera MANUAL.md.

**Architecture:** `fetchHorseStarts` i `lib/atg.ts` utökas att returnera `post_position` och anropas från `app/api/games/fetch/route.ts`. En ny `computeTrackFactor`-funktion i `lib/analysis.ts` implementerar hybrid statisk/dynamisk spårfaktor. CS-vikterna justeras. MANUAL.md uppdateras sist.

**Tech Stack:** TypeScript, Next.js 16 App Router, Jest/ts-jest

---

## Filstruktur

| Fil | Förändring |
|-----|-----------|
| `lib/atg.ts` | Nytt interface `HorseStart`, utöka `fetchHorseStarts` att returnera `post_position` + fler starter, ny `horse_starts_history` på `AtgStarter` |
| `app/api/games/fetch/route.ts` | Anropa `fetchHorseStarts` per häst per avdelning, sätt `last_5_results` + `horse_starts_history` |
| `lib/analysis.ts` | Ny `computeTrackFactor`, utöka `AnalysisStarter` med `horse_starts_history` + `post_position`, justera `compositeScore` och `analyzeRaceEnhanced` |
| `lib/__tests__/analysis.test.ts` | Ny testfil för `computeTrackFactor` och uppdaterad `compositeScore` |
| `MANUAL.md` | Uppdatera sektioner 4.1, 5.2, 6.2 + ny avsnitt om systembyggare och UI-förändringar |

---

## Task 1: Utöka `HorseStart`-typ och `fetchHorseStarts` i `lib/atg.ts`

**Files:**
- Modify: `lib/atg.ts`

Idag returnerar `fetchHorseStarts` bara `{ place, date, track, time }` och hämtar bara 5 starter. Vi behöver `post_position` och 20 starter (för dynamisk spåranalys).

- [ ] **Steg 1: Ersätt den inbyggda returtypen med ett exporterat interface**

I `lib/atg.ts`, direkt efter `export interface LifeRecord { ... }` (rad 28–33), lägg till:

```ts
export interface HorseStart {
  place: string
  date: string
  track: string
  time: string
  post_position: number | null
}
```

- [ ] **Steg 2: Uppdatera `fetchHorseStarts` signaturen och implementationen**

Ersätt hela `fetchHorseStarts`-funktionen (rad 169–193 i nuvarande fil) med:

```ts
export async function fetchHorseStarts(
  horseId: string
): Promise<HorseStart[]> {
  try {
    const res = await fetch(`${ATG_BASE}/horses/${horseId}`, {
      headers: HEADERS,
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const startsRaw = (raw["starts"] as Record<string, unknown>[]) ?? [];
    return startsRaw.slice(0, 20).map((s) => {
      const race = (s["race"] as Record<string, unknown>) ?? {};
      const track = (race["track"] as Record<string, unknown>) ?? {};
      const postPos = s["postPosition"] ?? s["number"];
      return {
        date: String(race["date"] ?? s["date"] ?? ""),
        track: String(track["name"] ?? race["name"] ?? ""),
        place: String(s["place"] ?? "–"),
        time: formatTime(s["time"] as Record<string, number> | null | undefined),
        post_position: postPos != null ? Number(postPos) : null,
      };
    });
  } catch {
    return [];
  }
}
```

- [ ] **Steg 3: Lägg till `horse_starts_history` på `AtgStarter`**

I `AtgStarter`-interfacet (rad 35–79), lägg till sist precis innan `}`:

```ts
  horse_starts_history?: HorseStart[]
```

- [ ] **Steg 4: Uppdatera `last_5_results`-typen på `AtgStarter` att använda `HorseStart`**

Ersätt:
```ts
  last_5_results: { place: string; date: string; track: string; time: string }[];
```
Med:
```ts
  last_5_results: HorseStart[];
```

- [ ] **Steg 5: Commit**

```bash
git add lib/atg.ts
git commit -m "feat: utöka HorseStart med post_position, hämta 20 starter i fetchHorseStarts"
```

---

## Task 2: Anropa `fetchHorseStarts` från `fetch/route.ts`

**Files:**
- Modify: `app/api/games/fetch/route.ts`

Idag är `last_5_results: []` alltid tomt. Vi ska hämta data per häst per avdelning.

- [ ] **Steg 1: Importera `fetchHorseStarts` och `HorseStart`**

Lägg till i importerna längst upp i `app/api/games/fetch/route.ts`:

```ts
import { fetchGame, fetchHorseStarts } from "@/lib/atg";
```

(Ersätter `import { fetchGame } from "@/lib/atg"`)

- [ ] **Steg 2: Lägg till hämtning av starterhistorik per avdelning**

I `fetch/route.ts`, i loopen `for (const race of game.races) {`, direkt efter att `uniqueStarters` är definierad (efter rad ~98), lägg till:

```ts
      // Hämta starterhistorik (last_5_results + spårdata) per häst
      await Promise.all(
        uniqueStarters.map(async (starter) => {
          const starts = await fetchHorseStarts(starter.horse_id);
          if (starts.length > 0) {
            starter.last_5_results = starts.slice(0, 5);
            starter.horse_starts_history = starts;
          }
        })
      );
```

Detta ska placeras INNAN `calculateFormscore(uniqueStarters)` anropas (rad ~112), så att formscore beräknas med korrekt `last_5_results`.

- [ ] **Steg 3: Verifiera att fallback-logiken för DB fortfarande fungerar**

Den befintliga koden (rad ~57–67) som fyller i `last_5_results` från DB om ATG returnerar tomt behålls orörd – den fungerar som säkerhetsnät vid rate-limiting.

- [ ] **Steg 4: Commit**

```bash
git add "app/api/games/fetch/route.ts"
git commit -m "feat: anropa fetchHorseStarts per häst vid omgångshämtning"
```

---

## Task 3: Implementera `computeTrackFactor` i `lib/analysis.ts`

**Files:**
- Modify: `lib/analysis.ts`
- Create: `lib/__tests__/analysis.test.ts`

- [ ] **Steg 1: Skriv testfilen först (TDD)**

Skapa `lib/__tests__/analysis.test.ts`:

```ts
import { computeTrackFactor } from "../analysis";
import type { HorseStart } from "../atg";

describe("computeTrackFactor", () => {
  it("returnerar högre faktor för inre spår i voltstart", () => {
    const spår1 = computeTrackFactor(1, "volte", []);
    const spår8 = computeTrackFactor(8, "volte", []);
    expect(spår1).toBeGreaterThan(spår8);
  });

  it("returnerar högre faktor för spår 1 än spår 12", () => {
    const inner = computeTrackFactor(1, "volte", []);
    const outer = computeTrackFactor(12, "volte", []);
    expect(inner).toBeGreaterThan(outer);
  });

  it("planar ut faktorn mer för autostart", () => {
    const volteDiff = computeTrackFactor(1, "volte", []) - computeTrackFactor(10, "volte", []);
    const autoDiff = computeTrackFactor(1, "auto", []) - computeTrackFactor(10, "auto", []);
    expect(autoDiff).toBeLessThan(volteDiff);
  });

  it("returnerar värde i intervallet 0–1", () => {
    for (const spår of [1, 4, 8, 12, 16]) {
      const f = computeTrackFactor(spår, "volte", []);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("använder dynamisk faktor vid ≥5 starter med spårdata", () => {
    // Häst som alltid vunnit från spår 1-3
    const goodHistory: HorseStart[] = Array.from({ length: 6 }, (_, i) => ({
      place: "1",
      date: `2025-01-0${i + 1}`,
      track: "Solvalla",
      time: "1:14,5",
      post_position: 2,
    }));
    // Häst utan historia
    const noHistory: HorseStart[] = [];
    const withHistory = computeTrackFactor(2, "volte", goodHistory);
    const withoutHistory = computeTrackFactor(2, "volte", noHistory);
    // Häst med stark historik på inre spår bör få minst lika bra faktor
    expect(withHistory).toBeGreaterThanOrEqual(withoutHistory);
  });

  it("faller tillbaka på statisk faktor vid <5 starter med spårdata", () => {
    const fewStarts: HorseStart[] = [
      { place: "1", date: "2025-01-01", track: "Solvalla", time: "1:14,5", post_position: 3 },
      { place: "2", date: "2025-01-08", track: "Solvalla", time: "1:15,0", post_position: 3 },
    ];
    const staticOnly = computeTrackFactor(3, "volte", []);
    const fewData = computeTrackFactor(3, "volte", fewStarts);
    // Med <5 starter ska dynamisk ej påverka – resultatet ska vara statisk faktor
    expect(fewData).toBeCloseTo(staticOnly, 5);
  });
});
```

- [ ] **Steg 2: Kör testet – verifiera att det misslyckas**

```bash
npx jest lib/__tests__/analysis.test.ts --no-coverage
```

Förväntat: FAIL med "computeTrackFactor is not a function"

- [ ] **Steg 3: Lägg till den statiska tabellen och `computeTrackFactor`**

I `lib/analysis.ts`, direkt efter `computeDistanceSignal`-funktionen (efter rad ~83), lägg till:

```ts
import type { HorseStart } from "./atg";

/** Statisk spårfaktor för voltstart (spår 1 = bäst). */
const TRACK_BIAS_VOLTE: Record<number, number> = {
  1: 1.00, 2: 0.95, 3: 0.88, 4: 0.80, 5: 0.72,
  6: 0.65, 7: 0.58, 8: 0.52, 9: 0.46, 10: 0.40,
  11: 0.35, 12: 0.30,
};

function staticTrackFactor(postPosition: number, startMethod: string): number {
  const pos = Math.max(1, postPosition);
  const baseVolte = pos <= 12 ? (TRACK_BIAS_VOLTE[pos] ?? 0.25) : 0.25;
  if (startMethod === "auto") {
    // Planar ut: halvera skillnaden mot neutral (0.5)
    return 0.5 + (baseVolte - 0.5) * 0.4;
  }
  return baseVolte;
}

/**
 * Beräknar spårfaktor (0–1) för en häst baserat på post_position.
 * Hybrid: statisk tabell + dynamisk om ≥5 starter med spårdata finns.
 */
export function computeTrackFactor(
  postPosition: number,
  startMethod: string,
  horseHistory: HorseStart[]
): number {
  const staticF = staticTrackFactor(postPosition, startMethod);

  const startsWithPos = horseHistory.filter((s) => s.post_position != null);
  if (startsWithPos.length < 5) {
    return staticF;
  }

  const wins = startsWithPos.filter((s) => s.place === "1").length;
  const top3 = startsWithPos.filter((s) => {
    const p = parseInt(s.place);
    return !isNaN(p) && p <= 3;
  }).length;
  const total = startsWithPos.length;
  const dynamicRaw = 0.6 * (wins / total) + 0.4 * (top3 / total);
  // Normalisera dynamicRaw (0–1) till rimligt intervall
  const dynamicF = Math.min(Math.max(dynamicRaw * 2.5, 0), 1);

  return 0.5 * staticF + 0.5 * dynamicF;
}
```

**Viktigt:** `import type { HorseStart }` ska läggas längst upp i filen bland övriga imports.

- [ ] **Steg 4: Kör testet – verifiera att det passerar**

```bash
npx jest lib/__tests__/analysis.test.ts --no-coverage
```

Förväntat: PASS (6 tests)

- [ ] **Steg 5: Commit**

```bash
git add lib/analysis.ts lib/__tests__/analysis.test.ts
git commit -m "feat: lägg till computeTrackFactor med hybrid statisk/dynamisk spårfaktor"
```

---

## Task 4: Integrera spårfaktor i `compositeScore` och `analyzeRaceEnhanced`

**Files:**
- Modify: `lib/analysis.ts`

- [ ] **Steg 1: Utöka `AnalysisStarter` med `post_position` och `horse_starts_history`**

I `lib/analysis.ts`, i `AnalysisStarter`-interfacet (rad ~85–104), lägg till efter `finish_time?`:

```ts
  post_position?: number | null;
  horse_starts_history?: HorseStart[];
```

- [ ] **Steg 2: Utöka `compositeScore` med `trackFactor`-parameter**

Ersätt hela `compositeScore`-funktionen (rad ~241–255):

```ts
export function compositeScore(params: {
  formScore: number;
  valueIndex: number;
  consistencyScore: number;
  timeAdj: number;
  trackFactor?: number; // normaliserat 0–1, default 0.5 (neutral)
}): number {
  const { formScore, valueIndex: vi, consistencyScore: cs, timeAdj, trackFactor = 0.5 } = params;
  const formNorm = formScore / 100;
  const valueNorm = Math.min(Math.max(vi / 20 + 0.5, 0), 1);
  const consistNorm = cs / 100;
  const timeNorm = Math.min(Math.max((-timeAdj + 3) / 6, 0), 1);
  return Math.round(
    (formNorm * 0.35 + valueNorm * 0.25 + consistNorm * 0.25 + timeNorm * 0.10 + trackFactor * 0.05) * 100
  );
}
```

- [ ] **Steg 3: Lägg till spårfaktor-beräkning i `analyzeRaceEnhanced`**

I `analyzeRaceEnhanced` (rad ~284), i `intermediate`-mappningen, lägg till spårfaktorberäkning per häst och normalisering relativt fältet.

Hitta platsen precis EFTER `const vi = valueIndex(...)` och INNAN `return { s, form, ... }`:

```ts
    const rawTrackFactor = computeTrackFactor(
      s.post_position ?? 1,
      "volte", // startmetod per häst finns ej – fältet sätts nedan efter normalisering
      s.horse_starts_history ?? []
    );
```

Spara `rawTrackFactor` i `return`-objektet:

```ts
    return { s, form, consistency, estimated, impliedProb, timeAdj, vi, rawTrackFactor };
```

- [ ] **Steg 4: Normalisera `trackFactor` relativt fältet**

I `analyzeRaceEnhanced`, direkt EFTER `intermediate`-mappningen och INNAN `results`-mappningen, lägg till:

```ts
  // Normalisera trackFactor min-max relativt fältet
  const trackValues = intermediate.map((d) => d.rawTrackFactor);
  const trackMin = Math.min(...trackValues);
  const trackMax = Math.max(...trackValues);
  const trackRange = trackMax - trackMin;
```

- [ ] **Steg 5: Använd normaliserad `trackFactor` i `compositeScore`-anropet**

Ersätt det befintliga `compositeScore`-anropet i `results`-mappningen:

```ts
    const trackNorm = trackRange > 0
      ? (d.rawTrackFactor - trackMin) / trackRange
      : 0.5;
    const cs = compositeScore({
      formScore: d.form,
      valueIndex: d.vi,
      consistencyScore: d.consistency,
      timeAdj: d.timeAdj ?? 0,
      trackFactor: trackNorm,
    });
```

- [ ] **Steg 6: Kör alla tester**

```bash
npx jest --no-coverage
```

Förväntat: PASS (alla befintliga + de nya)

- [ ] **Steg 7: Commit**

```bash
git add lib/analysis.ts
git commit -m "feat: integrera spårfaktor (5%) i CS, tid-vikt minskar från 15% till 10%"
```

---

## Task 5: Uppdatera `startMethod` i `computeTrackFactor`-anropet

**Files:**
- Modify: `lib/analysis.ts`

`AnalysisStarter` har inte `start_method` – det skickas inte in i `analyzeRaceEnhanced`. Vi behöver lägga till det.

- [ ] **Steg 1: Lägg till `start_method` i `AnalysisStarter`**

I `AnalysisStarter`-interfacet, lägg till:

```ts
  start_method?: string | null;
```

- [ ] **Steg 2: Uppdatera `computeTrackFactor`-anropet att använda `start_method`**

Ersätt i `intermediate`-mappningen:

```ts
    const rawTrackFactor = computeTrackFactor(
      s.post_position ?? 1,
      "volte",
      s.horse_starts_history ?? []
    );
```

Med:

```ts
    const rawTrackFactor = computeTrackFactor(
      s.post_position ?? 1,
      s.start_method ?? "volte",
      s.horse_starts_history ?? []
    );
```

- [ ] **Steg 3: Kontrollera att `RaceList.tsx` (konsument av `analyzeRaceEnhanced`) skickar `start_method`**

Sök i kodebasen:

```bash
grep -r "analyzeRaceEnhanced\|AnalysisStarter" components/ app/ --include="*.tsx" -l
```

Öppna relevanta filer och säkerställ att `start_method` skickas med i `AnalysisStarter`-objektet. Typiskt hittas detta i `components/AnalysisPanel.tsx` eller liknande. Lägg till `start_method: starter.start_method` i mappningen om det saknas.

- [ ] **Steg 4: Kör alla tester**

```bash
npx jest --no-coverage
```

Förväntat: PASS

- [ ] **Steg 5: Commit**

```bash
git add lib/analysis.ts
git commit -m "fix: skicka start_method till computeTrackFactor för korrekt voltstart/autostart-justering"
```

---

## Task 6: Uppdatera MANUAL.md

**Files:**
- Modify: `MANUAL.md`

- [ ] **Steg 1: Uppdatera sektion 4 – Navigera bland omgångar**

Ersätt hela sektion 4 (rad ~67–104 i MANUAL.md) med:

```markdown
## 4. Navigera bland omgångar

På huvudsidan ser du en lista med alla hämtade omgångar.

- Välj omgång via **rullgardinsmenyn** (GameSelector) längst upp.
- Omgångens **avdelningar** visas som flikar (tab-bar) under varandra. Klicka på en avdelning för att visa den – bytet sker direkt utan sidladdning.
- Hästar i aktiv avdelning visas som **en häst per rad** (ATG-stil).

### 4.1 Top 5 spelvärda hästar

Högst upp visas en widget med de **5 hästar** som har högst sammansatt poäng (CS) i hela omgången. Varje häst visas med avdelning, startnummer, odds och eventuell slutplacering.

- Klicka på **▼ / ▲**-knappen för att minimera/expandera widgeten.
- Klicka på en häst i listan för att hoppa direkt till hästkortet i rätt avdelning.

### 4.2 Sortering, filtrering och sökning

Ovanför hästlistan finns kontroller för sortering, filter och sökning:

**Sortering** – välj hur hästar sorteras:

| Knapp | Beskrivning |
|-------|-------------|
| **Nr** | Startnummer (standard ATG-ordning) |
| **CS – sammansatt poäng** | Kombinerar form, värde, konsistens, tid och spårfaktor (standardval) |
| **FS – formscore** | Formpoäng baserat på vinstprocent, odds och tid |
| **Odds** | Lägst odds först |
| **Streck%** | Högst streckprocent i V85-poolen först |

**Filtrering:**

| Knapp | Beskrivning |
|-------|-------------|
| **Värde** | Visar bara hästar som systemet bedömer som undervärderade |
| **Dölj >50x** | Döljer hästar med odds över 50 |

**Sökning** – skriv namn på häst, kusk eller tränare för att filtrera.

Klicka på **Rensa filter ✕** för att återställa alla filter.
```

- [ ] **Steg 2: Uppdatera sektion 5.2 – Formscore och CS**

Ersätt sektion 5.2:

```markdown
### 5.2 Formscore (FS) och Composite Score (CS)

**FS – Formscore (0–100):** viktat index baserat på senaste form (40%), vinstprocent år (20%), odds (20%) och bästa tid (20%). Innevarande år prioriteras; föregående år kompletterar vid få starter.

**CS – Composite Score (0–100):** bredare helhetsbedömning som kombinerar form, värdeindex, konsistens, tid och spårfaktor. Se sektion 6.2 för viktning.

Färgkoder för båda poäng:
- **Grön** (≥70) – stark häst
- **Gul** (40–69) – medel
- **Grå** (<40) – svag
```

- [ ] **Steg 3: Uppdatera sektion 6.2 – Utökad analys**

Ersätt CS-formel-avsnittet i sektion 6.2:

```markdown
#### Formel för sammansatt poäng (CS)

```
CS = 35% × form
   + 25% × värdeindex
   + 25% × konsistens
   + 10% × tidsjustering
   +  5% × spårfaktor
```

**Spårfaktor** väger in hästens startspår. Inre spår (1–3) ger fördel i voltstart, yttre spår (8+) ger nackdel. Vid autostart är effekten lägre. Om hästen har ≥5 historiska starter med spårdata används en dynamisk faktor baserad på hästens egna resultat från olika spår.
```

- [ ] **Steg 4: Lägg till ny sektion 6.3 – Systembyggaren**

Direkt efter sektion 6.2 (och innan sektion 7), lägg till:

```markdown
## 6.3 Systembyggaren

Klicka på **Bygg system** (kugghjuls-knappen) för att öppna systemläget. I systemläget kan du markera hästar per avdelning och bygga ett spelkupong-system.

### Skapa och spara system

1. Klicka på hästar du vill ha med – de markeras med en bock.
2. Systemet auto-sparas som ett **utkast** var tredje sekund.
3. Ge utkastet ett namn via namnfältet i sidopanelen (höger på desktop, panel längst ner på mobil).
4. Välj om systemet ska tillhöra ett **sällskap** eller vara **privat**.
5. Klicka **Spara system** för att publicera det färdigt.

### Ladda ett utkast

Om du redan har sparade utkast för den aktuella omgången visas de i sidopanelen under **Sparade utkast**. Klicka på ett utkast för att ladda in dina tidigare val.

### Se dina system

Klicka på **Se systemet →** direkt efter sparning, eller gå till **Mina system** i menyn.
```

- [ ] **Steg 5: Uppdatera introduktionen (sektion 1)**

Ersätt nuvarande inledningstext:

```markdown
**V85 Analys** är ett verktyg för dig som spelar V85 (och liknande ATG-spel). Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på form, odds, konsistens, tider och startspår, och låter dig dela anteckningar och diskutera med dina spelvänner i ett gemensamt sällskap.
```

- [ ] **Steg 6: Uppdatera innehållsförteckningen**

Lägg till `6.3 Systembyggaren` i innehållsförteckningen och uppdatera avsnittslänk för 6.2-temat (spårfaktor nämns).

- [ ] **Steg 7: Commit**

```bash
git add MANUAL.md
git commit -m "docs: uppdatera manual med spårfaktor, ny listlayout, Top 5, systembyggare"
```

---

## Verifiering (alla tasks klara)

- [ ] **Kör alla tester**

```bash
npx jest --no-coverage
```

Förväntat: PASS (befintliga + nya `analysis.test.ts`)

- [ ] **Kontrollera last_5_results i DB**

Hämta en omgång via UI, öppna Supabase dashboard → `starters`-tabellen, verifiera att `last_5_results`-kolumnen innehåller data med `post_position`-fält.

- [ ] **Kontrollera spårfaktor-ranking**

I en voltstart-avdelning ska hästen på spår 1 ha högre CS än en identisk häst på spår 12 (allt annat lika). Verifiera i Utökad analys-tabellen.

- [ ] **Kontrollera att CS summerar korrekt**

Vikterna 35 + 25 + 25 + 10 + 5 = 100 ✓ (kontrolleras i `compositeScore`-implementationen ovan)
