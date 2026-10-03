# Grundchans – odds-fri vinstsannolikhet

**Status:** Godkänd design, väntar på granskning av den här specen
**Bakgrund:** Forskning och empiriska resultat finns i issue #93. Datainsamlingen lagades i PR #94.

## 1. Mål och avgränsning

**Mål:** En egen beräkning, **Grundchans**, ska visas bredvid dagens "Chans". Den ger varje häst en kalibrerad vinstsannolikhet som **inte** använder odds eller streck, eftersom båda speglar vad andra spelare tror. Grundchans ska vara en oberoende och förklarbar bedömning som finns redan innan poolerna öppnar.

**Lyckat när:**

- Grundchans uppnår på en testperiod den träffsäkerhet som forskningen visade (pseudo-R² ≈ 0,20, toppvalet vinner ≈ 32 %). Hårt krav: pseudo-R² ≥ 0,19 på testdelen.
- Varje häst får en förklaring med de tre faktorer som påverkar mest.
- Utvärderingssidan visar hur ofta Grundchans toppval vinner över tid.

**Inte ett mål:** Att slå marknaden. Forskningen visade ingen statistiskt säkerställd fördel mot odds eller streck. UI-texterna ska därför inte påstå spelvärde.

**Utanför den här omgången:**

- Systembyggaren.
- Att ersätta de odds-fria delarna av CS.
- Travkommentarer (`trMediaInfo`).
- Spårtabellen i `lib/analysis.ts`.

Det är fas 4 i #93 och blir separata issues.

## 2. Data

### 2.1 Migration `supabase/migration_v14_fundamental.sql`

| Kolumn | Typ | Innehåll |
|---|---|---|
| `races.first_prize` | integer | Förstapris i kr, tolkat ur ATG:s `race.prize`-text (`"Pris: 80.000-…"` → 80000). Null om det inte går att tolka. |
| `races.breed` | text | `'K'` om `race.terms` (sammanslagen, gemener) innehåller `"kallblod"`, annars `'V'`. |
| `starters.start_distance` | integer | `start.distance`: hästens faktiska distans inklusive tillägg. |
| `starters.start_points` | integer | `horse.statistics.life.startPoints`. |
| `starters.fundamental_p` | double precision | Sparad Grundchans 0–1. Null om den inte är beräknad. |
| `starters.fundamental_version` | text | Modellversionen som räknade ut `fundamental_p`. |

`supabase/schema.sql` uppdateras med samma kolumner (kommenterade, enligt befintligt mönster).

### 2.2 Hämtning

- `AtgRace` får `first_prize` och `breed`. `AtgStarter` får `start_distance` och `start_points`. Fälten tolkas i `parseGame` i `lib/atg.ts`.
- `HorseStart` och `parseHistoryRecord` får fältet `driver` (för- och efternamn från `start.driver`). Det ligger i jsonb, så ingen migration behövs.
- `winPct` i `lib/atg.ts` exporteras, så att träningsadaptern tolkar kusk- och tränarprocent exakt som appen.
- Fetch-routen sparar de nya fälten. Den räknar också ut Grundchans per avdelning och sparar `fundamental_p` och `fundamental_version` tillsammans med `formscore`.

### 2.3 Backfill och omräkning

- `scripts/backfill-history.ts` fyller dessutom i `races.first_prize` och `races.breed` samt `starters.start_distance` och `starters.start_points`, hämtade ur spel-JSON:en. Historiken skrivs om så att kusknamnet kommer med. Odds och streck rörs inte, som tidigare.
- `scripts/recompute-formscore.ts` och `app/api/admin/recompute-formscore` (adminknappen "Räkna om alla CS-poäng") räknar även om `fundamental_p` och `fundamental_version`.

## 3. Modellen – `lib/fundamental.ts`

Modulen innehåller bara rena funktioner utan I/O. Samma kod används i appen, i fetch-routen, i omräkningen och i träningsskriptet.

### 3.1 Indatatyper och adaptrar

```ts
interface FundamentalRace {
  date: string;               // ISO-datum
  distance: number;
  start_method: "auto" | "volte" | string;
  breed: "V" | "K";
  first_prize: number | null;
}
interface FundamentalStarter {
  start_number: number;
  post_position: number;
  start_distance: number | null;
  horse_age: number | null;
  horse_sex: string | null;   // "mare" | "stallion" | "gelding"
  starts_total, wins_total, places_2nd, places_3rd: number;
  earnings_total: number;     // kr
  starts_current_year, wins_current_year,
  places_2nd_current_year, places_3rd_current_year: number;
  life_records: LifeRecord[];
  shoes_reported, shoes_front, shoes_back,
  shoes_front_changed, shoes_back_changed: boolean;
  american_sulky: boolean;
  driver: string | null;
  driver_win_pct: number | null;  // procent (som i DB)
  trainer_win_pct: number | null;
  start_points: number | null;
  history: HorseStart[];      // nyast först, bara före loppdatum
}
```

Adaptrarna:

- `fromDbStarter(row)` och `fromDbRace(race, gameDate)` används av appen och omräkningen.
- `fromAtgStart(start, race)` och `fromAtgRace(race)` används av träningsskriptet. De använder `parseHistoryRecords` och `winPct` från `lib/atg.ts`.

### 3.2 Faktorer (33 st)

Krympt andel är `shrink(w, n, p0, k) = (w + k·p0) / (n + k)`. Distanskategorin är `short` (≤ 1800 m), `medium` (≤ 2400 m) eller `long`.

| Faktor | Definition | Typ |
|---|---|---|
| `log_eps` | `log1p(earnings_total / max(starts_total, 1))` | kont. |
| `win_rate_life` | `shrink(wins, starts, 0.10, 6)` | kont. |
| `top3_rate_life` | `shrink(wins+2:or+3:or, starts, 0.30, 6)` | kont. |
| `win_rate_cy` | `shrink(wins_cy, starts_cy, 0.10, 6)` | kont. |
| `top3_rate_cy` | `shrink(top3_cy, starts_cy, 0.30, 6)` | kont. |
| `record_cat` | `−sekunder` för rekordet i `life_records` med samma startmetod och distanskategori som loppet | kont. (NaN om rekord saknas) |
| `record_missing` | 1 om `record_cat` saknas | binär |
| `age` | `horse_age ?? 5` | kont. |
| `age_sq` | `(age − 6)²` | kont. |
| `stallion` / `mare` | Könsflaggor | binär |
| `log_starts` | `log1p(starts_total)` | kont. |
| `post_inner` | Auto: `(9−pp)/8` om pp ≤ 8, annars 0. Volt: `max(0, (13−pp)/12)` | kont. |
| `post_2nd_row` | Auto: pp > 8. Volt: pp > 7 | binär |
| `barefoot_all` | `shoes_reported && !front && !back` | binär |
| `shoes_off_change` | `(front_changed && !front) \|\| (back_changed && !back)` | binär |
| `american_sulky` | Amerikansk sulky | binär |
| `driver_wr` / `trainer_wr` | `pct / 100` (NaN om null) | kont. |
| `fig_best` / `fig_mean` / `fig_last` | Hastighetssiffror (3.3) över historiken: max, snitt av de 3 senaste och senaste | kont. (NaN om ingen) |
| `fig_missing` | 1 om ingen användbar hastighetssiffra finns | binär |
| `form_pts` | `Σ w_i · pts(place_i)` med w = [0,35; 0,25; 0,18; 0,12; 0,10] och pts 1:a = 10, 2:a = 7, 3:a = 5, 4:a = 3, 5:a = 2, övrigt inklusive g/d = 0 | kont. (NaN utan historik) |
| `gallop_rate` | Andel av historiken med galopp eller diskning | kont. (NaN utan historik) |
| `days_since` | Dagar från senaste start till loppet, max 365 (365 utan historik) | kont. |
| `long_rest` | `days_since > 60` | binär |
| `class_drop` | `mean(log1p(first_prize_i))` över historik med pris > 0, minus `log1p(race.first_prize)` | kont. (NaN om pris saknas) |
| `handicap_m` | `(start_distance ?? race.distance) − race.distance` | kont. |
| `driver_changed` | Senaste startens kusk finns och skiljer sig från dagens | binär |
| `start_points` | ATG:s startpoäng | kont. (NaN om null) |
| `trend` | `fig_last − mean(äldre figurer)` när det finns minst 3 figurer | kont. (NaN annars) |
| `recent_money` | `log1p(Σ share(place)·first_prize)` över felfri historik, med share 1:a = 1, 2:a = 0,5, 3:a = 0,28, 4:a = 0,2, 5:a = 0,14, 6:a = 0,1, 7:a = 0,08, 8:a = 0,06 | kont. |

### 3.3 Hastighetssiffra

```
fig = −(km-tid − par[ras, bana, startmetod, distkat] − underlag[track_condition])
```

- Starter med galopp, diskning eller utan km-tid ger ingen siffra.
- Paret slås upp i första hand på `(ras, bannamn, startmetod, distkat)`. Saknas det används `(ras, startmetod, distkat)`. Saknas båda ger starten ingen siffra.
- Saknas underlagsjustering för ett underlag används 0.
- Par och underlagsjusteringar skattas av träningsskriptet: par är medianen per nyckel när det finns minst 15 starter, underlagsjusteringen är medianresidualen per underlag när det finns minst 30. Båda lagras i modellfilen.

### 3.4 Standardisering och sannolikhet

1. Fyll NaN per faktor inom fältet. `fig_*` och `record_cat` får fältets sämsta värde (min), övriga faktorer fältets medelvärde. Är alla hästar NaN blir faktorn 0.
2. Kontinuerliga faktorer z-poängsätts med populationsstandardavvikelse: `z = (x − mean) / sd`, och `sd < 1e−9` ger `z = 0`. Binära faktorer centreras: `z = x − mean`.
3. `U_i = Σ_k β_k · z_ik` och `p_i = exp(U_i − max U) / Σ_j exp(U_j − max U)`.
4. Bidraget `contributions_i = [{ factor, value: β_k · z_ik }]` sorteras efter |value|.

API:

```ts
computeFundamental(race: FundamentalRace, starters: FundamentalStarter[], model = MODEL)
  → { start_number: number; p: number; contributions: Contribution[] }[]
computeFundamentalMap(...) → Record<number, FundamentalResult>   // för UI
FACTOR_LABELS: Record<FactorName, string>   // svenska etiketter till "Varför"
```

- Strukna hästar, alltså de där både odds och streck saknas eller är 0, tas bort i adaptern i UI och omräkning före anropet. När inget fält har marknadsdata ännu (innan poolen öppnat) behålls alla hästar.
- Fält med färre än 2 hästar ger `p = null` och visas som "–".

### 3.5 Modellfil `lib/data/fundamental-model.json`

```json
{
  "version": "2026-10-03",
  "trained_races": 3685,
  "test_metrics": { "logloss": 0, "pseudo_r2": 0, "top1": 0, "top3": 0 },
  "temperature": 0.0,
  "beta": { "<faktor>": 0.0 },
  "par": { "<ras>|<bana>|<startmetod>|<distkat>": 0.0 },
  "par_fallback": { "<ras>|<startmetod>|<distkat>": 0.0 },
  "condition_adj": { "<underlag>": 0.0 }
}
```

Filen genereras av träningsskriptet. Värdena ovan är bara exempel på formatet. `beta` lagras redan multiplicerad med temperaturen.

## 4. Träningsskript – `scripts/fit-fundamental.ts`

Körs med `npm run fit-fundamental`. Skriptet läser inte från Supabase och skriver inte dit.

1. **Hämtning:**
   - Hämtar avgjorda omgångar av typerna V85, V86, V75, V64, V65 och GS75 de senaste 13 månaderna via `calendar/day`, `/games/{id}` och `/races/{id}/extended`.
   - Svaren gzippas till `.cache/atg/`, som läggs till i `.gitignore`.
   - Hämtningen går inkrementellt: redan cachade filer hoppas över.
   - Fyra parallella datumintervall, retry vid 429 och 5xx.
   - `--months <n>` styr hur långt tillbaka hämtningen går.
2. **Urval:**
   - Bara travlopp (`sport === "trot"`), inte monté.
   - Strukna hästar (`result.scratchings`) tas bort.
   - Loppet måste ha minst 5 startande och exakt 1 vinnare (`finishOrder === 1`).
3. **Uppdelning:** kronologiskt i 60 % träning, 20 % validering och 20 % test. Par och underlagsjusteringar skattas bara på historikposter daterade före testperiodens start.
4. **Skattning:**
   - Conditional logit med vinnaren som utfall och L2-regularisering (λ = 3).
   - Optimeringen är L-BFGS i ren TypeScript med analytisk gradient. Inga nya beroenden.
   - Temperaturen T skattas på valideringsdelen som en enparameterslogit på `log p`.
5. **Rapport:** logloss, pseudo-R², topp 1 och topp 3 på testdelen, jämfört med likformig fördelning, vinnarodds (`finalOdds`) och streck. Dessutom kalibrering per sannolikhetsintervall och vikterna sorterade efter storlek.
6. **Skrivning:**
   - Med `--write` tränas modellen om på all data med samma λ, β multipliceras med T och `lib/data/fundamental-model.json` skrivs med `version` = dagens datum.
   - **Skriptet vägrar skriva** om testdelens pseudo-R² < 0,19, om inte `--force` anges.

## 5. UI

### 5.1 Loppvyn (`components/RaceList.tsx`)

- Räknar `fundamentalMap` per aktiv avdelning, på samma sätt som `probMap`, och skickar den till `AnalysisPanel` och `HorseCard`.
- `app/(authenticated)/page.tsx` utökar urvalet med `horse_starts_history`, `start_distance` och `start_points` för starters, samt `first_prize` och `breed` för races. Speldatumet skickas också med.

### 5.2 Analysverktyget (`components/AnalysisPanel.tsx`)

- Ny sorterbar kolumn **"Grund"** bredvid "Chans", i procent med en decimal och "–" när värde saknas.
- Märket **"Oense"** visas när `p_grund ≥ 1,5 · streck` eller `p_grund ≤ 0,5 · streck`, och samtidigt `|p_grund − streck| ≥ 3` procentenheter. Strecket måste vara större än 0.
- Tooltip: "Grundchans (utan odds/streck) och spelarna bedömer hästen olika — inte ett bevisat spelvärde."

### 5.3 Hästkortet (`components/HorseCard.tsx`)

- **"Grund X %"** visas i sifferraden.
- I den expanderade vyn finns raden **"Varför:"** med de tre största bidragen, med tecken och svensk etikett, till exempel `+ pengar/start · + barfota · − 20 m tillägg`.

### 5.4 Utvärderingssidan

- `app/(authenticated)/evaluation/page.tsx` hämtar även `fundamental_p`.
- `EvaluationPanel` visar **"Grundchans toppval vinner"** och **"Vinnare i Grundchans topp 3"** bredvid CS-nyckeltalen, med antalet utvärderade lopp.
- Lopp där någon startande saknar `fundamental_p` räknas inte med.

## 6. Felhantering

- Saknade fält ger reservvärden enligt 3.2 och 3.4. Beräkningen kastar aldrig fel för en enskild häst.
- Om beräkningen i fetch-routen ändå kastar sparas `fundamental_p = null`, och felet loggas med avdelningsnummer. Hämtningen fortsätter.
- Saknas modellfilen, eller har den ett okänt format, blir det fel vid build. Filen importeras statiskt och är typad.

## 7. Tester

**`lib/__tests__/fundamental.test.ts`:**

- Chanserna summerar till 1 per fält och alla p ligger i (0, 1).
- z-poängen påverkas inte om alla hästar förskjuts lika mycket.
- NaN-ifyllnaden: `fig_*` och `record_cat` får fältets min, övriga faktorer medel, och en faktor där alla saknar värde blir 0.
- När allt annat är lika sjunker en häst med 20 m tillägg, och en barfotahäst stiger.
- Varje faktorfunktion har minst ett fall med känt svar, till exempel `form_pts`, `class_drop`, `recent_money`, `days_since`, `post_*` och `fig` med par-reserv.
- Adaptrarna ger samma faktorvektor för samma häst från en DB-rad och från en ATG-fixtur.
- Fält med en häst ger `p = null`.
- Bidragen i `contributions` summerar till `U_i`.

**Integrationstest:** träningsskriptets acceptanskriterium (pseudo-R² ≥ 0,19 på testdelen).

Befintliga tester ska fortsätta gå igenom, och `tsc` och ESLint ska vara rena för ändrade filer.

## 8. Dokumentation

- `MANUAL.md` får ett nytt avsnitt, "Grundchans": vad det är och att det inte använder odds eller streck, hur "Oense" och "Varför" ska läsas, de viktigaste faktorerna och var det syns. Utvärderingssidans nyckeltal läggs till.
- `CLAUDE.md` uppdateras under "Nyckelalgoritmer" (Grundchans), kommandon (`fit-fundamental`), katalogstruktur (`lib/fundamental.ts`, `lib/data/`, `scripts/fit-fundamental.ts`) och datamodellen (nya kolumner).

## 9. Utrullning

1. Migration v14 körs mot Supabase.
2. Koden mergas och deployas.
3. `npm run fit-fundamental -- --write` körs, och modellfilen committas i samma PR.
4. `npm run backfill-history` fyller i nya fält och kusknamn för befintliga omgångar.
5. `npm run recompute-formscore` räknar ut `fundamental_p` för befintliga omgångar.

Steg 4–5 kan köras före merge, eftersom de skriver till de nya kolumnerna som migrationen skapar.
