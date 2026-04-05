---
phase: 03-track-cs-adjustment-admin-ui
verified: 2026-04-05T22:45:00Z
status: human_needed
score: 5/6 must-haves verified
re_verification: false
human_verification:
  - test: "Bekräfta SC-1 formulering i ROADMAP.md"
    expected: "Antingen korrigera SC-1 till 'ett yttre spår (t.ex. spår 7)' eller bekräfta att avsikten var att open stretch-bonus gäller alla spår på en open stretch-bana inklusive spår 1"
    why_human: "ROADMAP.md SC-1 säger 'post position 1 on an open-stretch track receives a higher computeTrackFactor() value than the static fallback alone', men open_stretch_lanes för Solvalla är [7,8,9,10,11,12]. Spår 1 är inte i open_stretch_lanes och får INTE +0.12-bonusen. Koden implementerar rätt beteende (Plan 01 must_haves verifierade för spår 7), men ROADMAP-texten stämmer inte med implementationen. Kräver mänsklig bedömning om SC-1 var felformulerat eller om det representerar ett kvarvarande gap."
  - test: "Verifiera att ↑/↓-badge visas korrekt i webbläsaren"
    expected: "TrackAdjustmentBadge visas inline bredvid CS-badge för hästar på banor med konfigurerade open stretch-spår eller korta lopp. Grön ↑ för positiv justering, röd ↓ för negativ. Tooltip visar korrekt text."
    why_human: "Visuellt beteende i webbläsare kan inte verifieras programmatiskt. Kräver manuell genomgång med ett spel från en bana med konfigurerad TrackConfig."
  - test: "Verifiera /admin-sidan som admin-användare"
    expected: "Admin navigerar till /admin, ser alla track_configs som redigerbara rader, kan spara ett ändrat värde och verifiera att det kvarstår vid omladdning."
    why_human: "Kräver en konfigurerad ADMIN_USER_IDS-miljövariabel och inloggad admin-användare. Kan inte verifieras utan körande app och korrekt miljökonfiguration."
  - test: "Verifiera redirect för icke-admin till /admin"
    expected: "Icke-admin navigerar till /admin och redirectas omedelbart till / utan att se admininnehåll."
    why_human: "Kräver körande app och inloggad icke-admin-användare."
---

# Fas 3: Track CS Adjustment & Admin UI — Verifieringsrapport

**Fasmål:** CS-rankningar reflekterar spårspecifik postpositionsbias med konfigurerad data, admins kan granska och korrigera förseedad data, och hästkort visar när en spårfaktor ändrat hästens CS
**Verifierad:** 2026-04-05T22:45:00Z
**Status:** human_needed
**Återverifiering:** Nej — initial verifiering

## Måluppfyllelse

### Observerbara sanningar

| #  | Sanning                                                                                     | Status        | Bevis                                                                                                                           |
|----|---------------------------------------------------------------------------------------------|---------------|----------------------------------------------------------------------------------------------------------------------------------|
| 1  | Open stretch-spår på konfigurerad bana ger högre computeTrackFactor() än statisk fallback   | ? OKLAR       | Koden fungerar korrekt för spår 7 (0.58 → 0.70). Men ROADMAP SC-1 säger "post position 1" som INTE ingår i open_stretch_lanes. Se human verification #1. |
| 2  | Spår ≥5 på kort lopp (distance ≤ threshold) ger lägre faktor än statisk fallback            | ✓ VERIFIERAD  | `computeTrackFactor(5, "volte", [], solvalla, 1600)` → 0.64 (test bekräftat, 67/67 tester gröna)                               |
| 3  | Utan TrackConfig returnerar computeTrackFactor() identisk output som nuvarande statik        | ✓ VERIFIERAD  | Test 8 i `lib/__tests__/analysis.test.ts`: `computeTrackFactor(7, "volte", [])` ≈ 0.58 bekräftat                               |
| 4  | Hästkort visar grön ↑ / röd ↓ badge när spårfaktor ändrar CS ≥1 poäng                      | ✓ VERIFIERAD  | `TrackAdjustmentBadge` finns i `components/HorseCard.tsx` med rätt färger, renderas efter `ScoreBadge` med korrekt deltaberäkning |
| 5  | /admin-sidan visar redigerbart formulär per bana för admin, redirectar icke-admins           | ✓ VERIFIERAD  | `app/(authenticated)/admin/page.tsx` har ADMIN_USER_IDS-check + redirect("/") + `TrackConfigRow` per bana                     |
| 6  | Sparad banduppdatering kvarstår och reflekteras direkt vid nästa sidladdning                 | ✓ VERIFIERAD  | `upsertTrackConfig()` skriver till DB utan cache; `page.tsx` hämtar via `getTrackConfig()` per request utan cache-header       |

**Poäng:** 5/6 sanningar verifierade (1 kräver mänsklig bekräftelse)

### Nödvändiga artefakter

| Artefakt                                      | Förväntat                                                        | Status          | Detaljer                                                                                     |
|-----------------------------------------------|------------------------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------|
| `lib/analysis.ts`                             | computeTrackFactor() med 5-param signatur                        | ✓ VERIFIERAD    | Signatur bekräftad: `computeTrackFactor(pos, method, history, trackConfig?, raceDistance?)` |
| `lib/__tests__/analysis.test.ts`              | 8 nya tester för open stretch och kort lopp                      | ✓ VERIFIERAD    | 8 nya `it()`-block bekräftade; 67 totalt — alla gröna                                       |
| `app/(authenticated)/page.tsx`                | Server-side TrackConfig-fetch + prop till MainPageClient         | ✓ VERIFIERAD    | `getTrackConfig(selectedGame.track)` hittad på rad 78; `trackConfig` skickas till `<MainPageClient>` |
| `components/RaceList.tsx`                     | trackConfig-prop genomtrådad till HorseCard och AnalysisPanel    | ✓ VERIFIERAD    | `trackConfig?: TrackConfig | null` i props; skickas till `<HorseCard>` och `<AnalysisPanel>` |
| `components/HorseCard.tsx`                    | TrackAdjustmentBadge renderat inline efter ScoreBadge            | ✓ VERIFIERAD    | `function TrackAdjustmentBadge(...)` definierad; renderas på rad 519–526                    |
| `components/AnalysisPanel.tsx`                | computeTrackFactor() anropas med trackConfig (per D-09)          | ✓ VERIFIERAD    | Anropas två gånger (rad 107, 108–110): base och adjusted                                    |
| `lib/actions/tracks.ts`                       | getAllTrackConfigs() och upsertTrackConfig() exporterade          | ✓ VERIFIERAD    | Båda funktioner hittade; `onConflict: "track_name"` bekräftat; `createServiceClient()` används |
| `app/(authenticated)/admin/page.tsx`          | Admin page med ADMIN_USER_IDS-gate och redirect                  | ✓ VERIFIERAD    | `redirect("/")` vid icke-admin; `getAllTrackConfigs()` anropad; "Bankonfiguration"-rubrik  |
| `components/admin/TrackConfigRow.tsx`         | Per-rads klientkomponent med formulärtillstånd och per-rad spara | ✓ VERIFIERAD    | `"use client"`, `upsertTrackConfig`, setTimeout(2000), "Sparad"/"Sparar…", validering finns |
| `app/(authenticated)/layout.tsx`              | Async serverkomponent som beräknar isAdmin + skickar till BottomNav | ✓ VERIFIERAD | `export default async function AuthenticatedLayout`; ADMIN_USER_IDS-beräkning; `isAdmin={isAdmin}` prop |
| `components/BottomNav.tsx`                    | BottomNav med valfri isAdmin-prop — visar 5:e Admin-flik vid true | ✓ VERIFIERAD   | `isAdmin?: boolean` i signatur; `{isAdmin && (` block; `href="/admin"`; "Admin"-etikett     |
| `components/TopNav.tsx`                       | TopNav med villkorlig Admin NavActiveLink                        | ✓ VERIFIERAD    | ADMIN_USER_IDS-beräkning; `{isAdmin && <NavActiveLink href="/admin" label="Admin" />}`      |

### Nyckelkopplingar

| Från                                    | Till                               | Via                          | Status       | Detaljer                                                                                   |
|-----------------------------------------|------------------------------------|------------------------------|--------------|--------------------------------------------------------------------------------------------|
| `app/(authenticated)/page.tsx`          | `getTrackConfig(selectedGame.track)` | await server-side          | ✓ KOPPLAD   | Rad 77–79; kallas efter selectedGame bestäms                                               |
| `components/HorseCard.tsx`             | `computeTrackFactor()`              | klientimport från lib/analysis | ✓ KOPPLAD | `import { computeTrackFactor } from "@/lib/analysis"` rad 5; anropas rad 429 + 430–435   |
| `components/AnalysisPanel.tsx`         | `computeTrackFactor()`              | klientimport från lib/analysis | ✓ KOPPLAD | `import { computeTrackFactor, ... }` rad 3; anropas rad 107 och 108–110                   |
| `app/(authenticated)/admin/page.tsx`   | `getAllTrackConfigs()`               | direkt await i serverkomponent | ✓ KOPPLAD | Rad 20; resultat skickas som prop till TrackConfigRow                                     |
| `components/admin/TrackConfigRow.tsx`  | `upsertTrackConfig()`               | formulärets submit-handler  | ✓ KOPPLAD   | `handleSave()` anropar `upsertTrackConfig(...)` rad 38; await-resultat hanteras korrekt   |
| `app/(authenticated)/layout.tsx`       | `components/BottomNav.tsx`          | isAdmin-prop                | ✓ KOPPLAD   | `<BottomNav isAdmin={isAdmin} />` rad 26                                                   |
| `components/TopNav.tsx`                | `ADMIN_USER_IDS`                    | process.env.ADMIN_USER_IDS  | ✓ KOPPLAD   | Rad 24–28; `isAdmin`-beräkning; `{isAdmin && <NavActiveLink href="/admin" label="Admin" />}` |

### Dataflödesspårning (Nivå 4)

| Artefakt                           | Datavariabel  | Källa                                   | Producerar riktig data | Status        |
|------------------------------------|---------------|-----------------------------------------|------------------------|---------------|
| `components/HorseCard.tsx` (badge) | trackDelta    | computeTrackFactor() med live trackConfig från page.tsx | Ja — trackConfig från track_configs-tabell | ✓ FLÖDAR |
| `components/AnalysisPanel.tsx`     | trackFactorDelta | computeTrackFactor() × 2 per häst    | Ja — trackConfig skickas från RaceList | ✓ FLÖDAR    |
| `app/(authenticated)/admin/page.tsx` | configs    | getAllTrackConfigs() → Supabase track_configs | Ja — DB-fråga bekräftad i tracks.ts | ✓ FLÖDAR |
| `components/admin/TrackConfigRow.tsx` | initialConfig | prop från admin/page.tsx           | Ja — från live DB via getAllTrackConfigs() | ✓ FLÖDAR |

**Anmärkning:** HorseCard använder `history: never[] = []` (tom array) för delta-beräkning, eftersom `horse_starts_history` inte ingår i HorseCard:s `Starter`-typ. Detta är ett medvetet designval — deltan baseras enbart på statiska spårfaktorer, inte dynamisk historik. Acceptabelt för badge-visning (threshold ≥1 CS-poäng uppfylls av statiska deltan).

### Beteendekontroller (Spot-checks)

| Beteende                        | Kommando                                                               | Resultat                   | Status    |
|---------------------------------|------------------------------------------------------------------------|----------------------------|-----------|
| Alla 67 tester gröna            | `npx jest --no-coverage`                                               | 67/67 pass, 6 suites       | ✓ GODKÄND |
| TypeScript kompilerar rent      | `npx tsc --noEmit`                                                     | Exit 0, ingen output       | ✓ GODKÄND |
| Exporttester för server actions | `npx jest lib/__tests__/admin_tracks.test.ts`                          | 2/2 pass                   | ✓ GODKÄND |

### Kravtäckning

| Krav         | Plan         | Beskrivning                                                              | Status        | Bevis                                                                                  |
|--------------|--------------|--------------------------------------------------------------------------|---------------|----------------------------------------------------------------------------------------|
| TRACK-CS-01  | 03-01        | computeTrackFactor accepterar optional TrackConfig-parameter             | ✓ UPPFYLLT    | 5-param signatur bekräftad i lib/analysis.ts                                           |
| TRACK-CS-02  | 03-01        | Open stretch +0.12 delta för konfigurerade yttre spår                    | ✓ UPPFYLLT    | Testad och bekräftad; 0.58 → 0.70 för spår 7                                          |
| TRACK-CS-03  | 03-01        | Utan TrackConfig: identisk output som nuvarande statik                   | ✓ UPPFYLLT    | Test 8 bekräftar non-breaking fallback                                                 |
| TRACK-CS-04  | 03-01        | Kort lopp -0.08 delta för postPosition ≥ 5 vid distance ≤ threshold     | ✓ UPPFYLLT    | Testat; 0.72 → 0.64 för spår 5 vid 1600m                                              |
| TRACK-CS-05  | 03-02        | Spårfaktorn påverkar CS synligt i AnalysisPanel                          | ✓ UPPFYLLT    | computeTrackFactor() anropas i rankStarters(); Spårfaktor-kolumn visas när trackConfig |
| TRACK-CS-06  | 03-01        | Non-breaking: befintliga anropsplatser (3-arg) fungerar oförändrat       | ✓ UPPFYLLT    | lib/formscore.ts ej modifierad; 3-arg anrop bakåtkompatibla                            |
| TRACK-UI-01  | 03-03        | Admin kan se alla track_configs i redigerbar vy                          | ✓ UPPFYLLT    | getAllTrackConfigs() hämtar alla rader; TrackConfigRow renderas per bana               |
| TRACK-UI-02  | 03-03        | Icke-admins redirectas från /admin                                       | ✓ UPPFYLLT    | `redirect("/")` om user.id inte i ADMIN_USER_IDS                                      |
| TRACK-UI-03  | 03-03        | Varje rad har toggle, spårinput och distansgränsinput                    | ✓ UPPFYLLT    | TrackConfigRow innehåller alla tre fält med korrekt typ                                |
| TRACK-UI-04  | 03-03        | Per-rad Spara upserterar och visar Sparad 2 sek                          | ✓ UPPFYLLT    | handleSave(), setTimeout 2000ms, status-maskin bekräftad                               |
| TRACK-UI-05  | 03-02        | HorseCard visar ↑/↓ badge bredvid CS vid icke-trivial spårjustering     | ✓ UPPFYLLT    | TrackAdjustmentBadge renderas efter ScoreBadge med korrekt logik                      |
| TRACK-UI-06  | 03-04        | Admin-tab i BottomNav och Admin-länk i TopNav, enbart för admins         | ✓ UPPFYLLT    | Båda komponenter har isAdmin-gating; Admin-länk och cog-ikon bekräftad                 |

### Funna anti-mönster

Inga blockerande anti-mönster hittades. Kontrollerade filer: lib/analysis.ts, components/HorseCard.tsx, components/AnalysisPanel.tsx, components/admin/TrackConfigRow.tsx, app/(authenticated)/admin/page.tsx, components/BottomNav.tsx, components/TopNav.tsx.

`placeholder`-attribut i TrackConfigRow.tsx (rader 99, 120) är HTML-formulärattribut, inte stub-kod.

### Mänsklig verifiering krävs

#### 1. Bekräfta ROADMAP SC-1 formulering

**Test:** Läs ROADMAP.md SC-1 ("A horse in post position 1 on an open-stretch track receives a higher computeTrackFactor() value than the static fallback alone") och verifiera avsikten mot implementationen.

**Förväntat:** Antingen (a) SC-1 är ett formuleringfel — avsikten var "ett yttre spår (t.ex. spår 7) på en open stretch-bana" och implementationen är korrekt, eller (b) SC-1 var avsedd som skriven och det krävs ett gap-fix.

**Varför mänsklig:** Kod-grep bekräftar att `open_stretch_lanes` för Solvalla är `[7,8,9,10,11,12]`. Spår 1 ingår inte och skulle INTE få +0.12-bonusen. Plan 01 must_haves (verifierade) använder spår 7, vilket är korrekt. ROADMAP:ens SC-1 verkar vara ett formuleringfel men kan inte avgöras automatiskt.

#### 2. Verifiera ↑/↓-badge visuellt i webbläsaren

**Test:** Starta `npm run dev`, logga in, välj ett spel på en bana med konfigurerade open stretch-spår (t.ex. Solvalla), öppna avdelningar med hästar på spår 7-12.

**Förväntat:** Grön ↑ badge syns bredvid CS-badge för hästar på konfigurerade outer lanes. Hover-tooltip visar "Open stretch: +0.12 (spår N, Solvalla)". Ingen badge för hästar på inre spår.

**Varför mänsklig:** Visuell komponent — kan inte verifieras utan körande webbläsare.

#### 3. Verifiera /admin som admin-användare

**Test:** Logga in med ett konto vars user.id finns i ADMIN_USER_IDS miljövariabel. Navigera till `/admin`. Ändra ett värde (t.ex. short_race_threshold). Klicka Spara. Ladda om sidan.

**Förväntat:** Alla banor visas i redigerbar form. Knappen visar "Sparar…" spinner → "Sparad" (grön, 2 sek) → återgår till "Spara". Vid omladdning kvarstår det ändrade värdet.

**Varför mänsklig:** Kräver körande app, konfigurerad ADMIN_USER_IDS och live Supabase-databas.

#### 4. Verifiera redirect för icke-admin

**Test:** Logga in med ett konto vars user.id INTE finns i ADMIN_USER_IDS. Navigera direkt till `/admin`.

**Förväntat:** Omedelbar redirect till `/` — inget admininnehåll visas ens kortvarigt.

**Varför mänsklig:** Kräver körande app och inloggad icke-admin-användare.

### Sammanfattning av gap

Inga blockerande kodgap hittades. Alla 12 requirements är uppfyllda med substantiell, kopplad kod. Alla 67 tester är gröna. TypeScript kompilerar rent.

Enda öppna punkt är ROADMAP SC-1:s formulering "post position 1" som inte matchar implementationen (open stretch-bonusen gäller yttre spår som är konfigurerade i `open_stretch_lanes`, inte spår 1). Plan 01:s must_haves (som är den faktiska implementationskontraktet) är korrekt formulerade och verifierade. Detta bedöms sannolikt vara ett formuleringfel i ROADMAP:en snarare än ett implementationsgap.

Fas 3 levererar det som utlovades: spårfaktorjusteringar i CS-beräkningarna, visuell indikator på hästkort, och ett fungerande admin-gränssnitt för bandkonfiguration.

---

_Verifierad: 2026-04-05T22:45:00Z_
_Verifierare: Claude (gsd-verifier)_
