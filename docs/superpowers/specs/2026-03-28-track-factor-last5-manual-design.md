# Design: Spårfaktor, Last 5-fix och Manualuppdatering

**Datum:** 2026-03-28

---

## Scope

Tre sammanhängande delar:

1. **Fixa `last_5_results`** – hämtas aldrig idag, alltid tom → analysformeln arbetar utan formscore-underlag
2. **Spårfaktor i CS** – hybrid statisk/dynamisk post_position-faktor integreras i Composite Score
3. **Uppdatera MANUAL.md** – reflektera alla förändringar från PR #41 + spårfaktorn

---

## Del 1 — Fixa last_5_results (inkl. spårdata per start)

### Problem

`fetchHorseStarts()` är definierad i `lib/atg.ts` men anropas aldrig från `app/api/games/fetch/route.ts`. Resultatet: `last_5_results: []` alltid, vilket gör att formscoreberäkningen faller tillbaka på karriärstatistik och saknar senaste form.

### Lösning

**`lib/atg.ts` – `fetchHorseStarts`:**

Utöka returtypen att inkludera `post_position`:

```ts
export interface HorseStart {
  place: string
  date: string
  track: string
  time: string
  post_position: number | null
}
```

Hämta `horse.starts[]` från `GET /horses/{horseId}`. Extrahera fälten:
- `s["postPosition"]` → `post_position`
- `s["place"]` → `place`
- `race["date"]` → `date`
- `race["track"]["name"]` → `track`
- `s["time"]` → `time` (via `formatTime`)

Returnera de 20 senaste starterna (inte bara 5 – behövs för dynamisk spårstatistik, se Del 2).

**`app/api/games/fetch/route.ts`:**

Efter att en avdelnings `uniqueStarters` är klar, hämta historik parallellt:

```ts
await Promise.all(
  uniqueStarters.map(async (starter) => {
    const starts = await fetchHorseStarts(starter.horse_id)
    if (starts.length > 0) {
      starter.last_5_results = starts.slice(0, 5)  // spara 5 senaste för FS
      starter.horse_starts_history = starts         // spara alla 20 för spåranalys
    }
  })
)
```

Hämtning sker per avdelning (inte globalt parallel) för att undvika rate-limiting mot ATG.

Befintlig fallback-logik (bevara från DB om tom) behålls som säkerhetsnät.

**`lib/types.ts` / `lib/atg.ts`:**

Lägg till `horse_starts_history?: HorseStart[]` på `AtgStarter`. Detta fält sparas **inte** i databasen – det används bara under hämtningsflödet för att beräkna `track_record` (se Del 2) som sedan sparas i `starters`.

**Databaskolumn:**

`last_5_results` är redan `jsonb` i `starters`-tabellen. Objekten i arrayen utökas med `post_position: number | null` – bakåtkompatibelt (gamla poster saknar fältet, behandlas som `null`).

---

## Del 2 — Spårfaktor i Composite Score

### Bakgrund

I travlopp (voltstart) ger inre spår statistisk fördel: kortare sträcka till ledaren, bättre position i upploppet. Yttre spår (8+) kräver längre svängradius och ger sämre startposition relativt fältet.

Källa: ATG:s egna statistikpublikationer + etablerad travanalys (STC, travforskning).

### Statisk spårfaktortabell

Normaliserade vikter per spårnummer (voltstart). Används när hästen har <5 historiska starter med spårdata, eller som basfall:

| Spår | Faktor |
|------|--------|
| 1    | 1.00   |
| 2    | 0.95   |
| 3    | 0.88   |
| 4    | 0.80   |
| 5    | 0.72   |
| 6    | 0.65   |
| 7    | 0.58   |
| 8    | 0.52   |
| 9    | 0.46   |
| 10   | 0.40   |
| 11   | 0.35   |
| 12   | 0.30   |
| 13+  | 0.25   |

**Autostart:** Spårfördelen är mindre påtaglig (alla startar rörande). Faktorerna halveras mot neutral (0.5 + (faktor − 0.5) × 0.4), vilket ger ett plattare intervall ca 0.70–1.00.

### Dynamisk spårfaktor (per häst)

**Krav:** ≥5 starter med `post_position` i `horse_starts_history`.

**Beräkning:**

```
trackWinRate = antal vinster (place="1") / totala starter med spårdata
trackPlaceRate = antal top-3 / totala starter med spårdata
dynamicRaw = 0.6 × trackWinRate + 0.4 × trackPlaceRate
```

Normaliseras relativt fältets genomsnitt (som övriga CS-komponenter).

**Hybrid:**

```
if dynamicStartsCount >= 5:
  trackSignal = 0.5 × staticFactor + 0.5 × dynamicFactor
else:
  trackSignal = staticFactor
```

### Ny funktion i `lib/analysis.ts`

```ts
export function computeTrackFactor(
  postPosition: number,
  startMethod: string,
  horseHistory?: HorseStart[]
): number  // returnerar 0–1, normaliseras sedan relativt fältet
```

### Uppdaterad CS-viktning

**Gammal:** `35%×form + 25%×valueNorm + 25%×consistNorm + 15%×timeNorm`

**Ny:** `35%×form + 25%×valueNorm + 25%×consistNorm + 10%×timeNorm + 5%×trackNorm`

Tid-vikten minskar från 15% till 10% för att ge plats åt spårfaktorn. Formscore-vikten behålls på 35% som den dominerande faktorn.

### Normalisering

`trackNorm` normaliseras precis som övriga komponenter: min-max-normalisering relativt alla hästar i avdelningen. Extremvärden klipps inte – hela fördelningen används.

### Dataflöde

```
fetchHorseStarts(horseId) → HorseStart[] (inkl. post_position)
  ↓
starter.horse_starts_history = starts  (in-memory på AtgStarter, ej sparad i DB)
  ↓
AnalysisStarter utökas med: horse_starts_history?: HorseStart[]
  ↓
analyzeRaceEnhanced(starters) → computeTrackFactor(post_position, start_method, horse_starts_history)
  ↓
trackNorm (min-max per avdelning, relativt alla hästar i loppet)
  ↓
CS = 35%×form + 25%×value + 25%×consist + 10%×time + 5%×track
```

`AnalysisStarter` (i `lib/analysis.ts`) utökas med `horse_starts_history?: HorseStart[]` som optional fält. `analyzeRaceEnhanced` passerar det vidare till `computeTrackFactor` per häst. Fältet kastas efter analys – ingen ny DB-kolumn krävs.

---

## Del 3 — Uppdatera MANUAL.md

Manualen (version 2.0) beskriver inte följande som nu finns i appen:

1. **Ny listlayout** – en häst per rad (ATG-stil), inte grid
2. **Top 5-widget** – kan minimeras, klick scrollar till häst, fungerar i ljust tema
3. **Systembyggare + utkast** – namnge utkast, spara automatiskt, ladda utkast vid återkomst
4. **Klientside-tabbyte** – avdelningsbyte utan sidladdning
5. **ThemeToggle + UserMenu i TopNav** – synliga i desktop-navigationen
6. **Spårfaktor** – ny komponent i CS, förklaras i algoritmsektion

Manualen uppdateras i befintliga sektioner + ny undersection under "Algoritmerna".

---

## Inga nya databastabeller

Allt ryms i befintlig struktur:
- `starters.last_5_results` (jsonb) – utökas med `post_position` per objekt
- `horse_starts_history` hanteras in-memory under hämtning
- Ingen migration behövs

---

## Verifiering

1. **last_5_results:** Hämta en omgång → kontrollera att `last_5_results` i DB innehåller data med `post_position`
2. **Spårfaktor:** Hästar på spår 1–2 ska ha högre `trackNorm` än hästar på spår 10+ i voltstart
3. **Dynamisk faktor:** Häst med ≥5 historiska starter ska visa hybrid-faktor (logga i dev)
4. **CS summerar till 100%:** Verifiera att vikterna 35+25+25+10+5 = 100
5. **Manual:** Alla omnämnda sektioner ska vara korrekta och uppdaterade
