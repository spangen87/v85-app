# Systemgranskning – juni 2026

Granskning av v85-appen med fokus på fyra frågor: säkerhetsrisker, formelns precision,
UI/UX-störningar och saknade funktioner. Inga ändringar är gjorda – detta är ett
beslutsunderlag. Fynd markerade **[verifierad]** är kontrollerade direkt mot koden;
övriga kommer från bredare genomgång och bör dubbelkollas innan åtgärd.

---

## 1. Säkerhet

RLS-policyerna i databasen är i grunden bra (medlemskapskontroll på `bets`, `horse_notes`,
`group_posts`, `game_systems`, `groups`). Problemet är att flera server actions använder
**service-klienten som går förbi RLS** utan att själva göra motsvarande kontroll.

### Kritiskt

| # | Fynd | Plats |
|---|------|-------|
| S1 | **[verifierad]** `getGroupBets()` och `getGroupBetStats()` gör **ingen auth-kontroll alls** – inte ens inloggning krävs. Vem som helst som kan anropa servern kan läsa alla spelförslag, insatser och ROI för vilket sällskap som helst (inkl. medlemmarnas visningsnamn). | `lib/actions/bets.ts:90-179` |
| S2 | **[verifierad]** `getGroupMembers()` använder service-klienten utan auth- eller medlemskapskontroll – vem som helst kan lista medlemmarna i valfri grupp via grupp-ID. | `lib/actions/sallskap.ts:6-31` |

**Åtgärd:** Hämta användaren med `createClient()` + `auth.getUser()`, verifiera medlemskap
i `group_members` innan service-klienten används. Alternativt: släpp service-klienten här
och låt RLS göra jobbet (policyerna finns redan).

### Högt

| # | Fynd | Plats |
|---|------|-------|
| S3 | **[verifierad]** `deleteGame()` låter **vilken inloggad användare som helst** radera en hel omgång (med kaskad till races/starters) – data som delas av alla användare. | `lib/actions/games.ts:6-19` |
| S4 | **[verifierad]** `addBet()` verifierar inte att användaren är medlem i `groupId` – en inloggad användare kan skriva spelförslag in i andras sällskap (RLS:ens INSERT-policy kringgås av service-klienten). | `lib/actions/bets.ts:28-53` |

**Åtgärd S3:** begränsa till admin (samma `ADMIN_USER_IDS`-kontroll som adminsidan använder).
**Åtgärd S4:** medlemskapskontroll som i S1/S2.

### Medel

| # | Fynd | Plats |
|---|------|-------|
| S5 | **[verifierad]** Inbjudningskoder genereras med `Math.random()` (inte kryptografiskt säker) och är bara 6 tecken. I kombination med att `/join/[code]` saknar rate limiting går det att gissa koder. | `lib/actions/groups.ts:8-10` |
| S6 | Admin avgörs enbart av miljövariabeln `ADMIN_USER_IDS` – fungerar, men är skört (felkonfiguration ⇒ ingen/ fel admin) och syns inte i databasen. | `app/(authenticated)/admin/page.tsx` |

**Åtgärd S5:** generera koder med `crypto.randomBytes` och öka längden till 10–12 tecken,
gärna med enkel rate limiting på join-flödet.

### Kontrollerat och OK

- `updateBetPayout()`/`deleteBet()` filtrerar på `user_id` – användare kan bara röra egna bets. **[verifierad]**
- `groups` har SELECT-policy för medlemmar (`migration_v3_groups_notes.sql:76`). **[verifierad]**
- Middleware skyddar allt utom `/login` och `/join`; inga hemligheter i repot; användargenererat innehåll renderas som text (ingen XSS-yta hittad).

---

## 2. Formeln – precision

### Strukturella problem i nuvarande CS

1. **Spårfaktorns "dynamiska" del tittar inte på spåret.** **[verifierad]**
   `computeTrackFactor()` (`lib/analysis.ts:132-146`) filtrerar historiken på
   `post_position != null` men jämför aldrig med hästens *aktuella* spår. Den dynamiska
   halvan blir därför bara generell vinst-/platsprocent – vilket redan finns i
   konsistenskomponenten. Spårinformation späds ut i stället för att förstärkas.
   *Fix:* filtrera på samma/närliggande spår (t.ex. ±1), annars fall tillbaka på statiska tabellen.

2. **`track_configs` påverkar aldrig CS.** **[verifierad]**
   CS beräknas vid hämtning i `app/api/games/fetch/route.ts:126` utan `trackConfig`
   (parametern skickas aldrig in i `calculateCompositeScore` → `computeTrackFactor`,
   `lib/formscore.ts:111-117`). Open stretch/kortloppsjusteringarna syns bara i
   analyspanelens visning – inte i poängen som Top 5 och sortering bygger på.

3. **Odds-komponenten är outlier-känslig.** Min–max-normalisering över fältet
   (`lib/formscore.ts:74-81`) gör att en enda 100-oddsare komprimerar skillnaden mellan
   favoriterna. Bättre: implicit sannolikhet `1/odds` normaliserad till att summera 1 över
   fältet. Marknadsodds är dessutom typiskt den enskilt starkaste prediktorn – 15 % vikt
   är sannolikt för lågt (kan verifieras med backtesten nedan).

4. **Galopp/diskning behandlas som vanlig oplacering.** `placeScore()`
   (`lib/formscore.ts:8-14`) ger 0 poäng för både "6:a" och "diskad efter galopp".
   Galoppfrekvens i senaste starterna är en känd riskfaktor i trav och borde dra ner mer
   (eller bli en egen liten komponent).

5. **Tidsindex jämför rå `best_time` rakt av** utan hänsyn till distanskategori eller
   startmetod, trots att `life_records` (rekord per distans/metod) redan finns sparade.

### Data som redan sparas men inte används i formeln **[verifierad i fetch-routen]**

`starters`-tabellen innehåller redan: `driver_win_pct`, `trainer_win_pct`,
`bet_distribution` (streckning), `shoes_front_changed`/`shoes_back_changed`, `sulky_type`,
`p_odds`. Inget av detta går in i CS i dag.

- **Kuskens vinstprocent** är lågt hängande frukt – lägg in som komponent (~5–10 %).
- **Streckning vs odds-diskrepans** är en färdig "spelvärde"-signal som bara visas, inte poängsätts.
- **Skobyte** (barfota fram/bak för första gången) är en klassisk formsignal som redan finns som boolean.

### Viktigast: kalibrera vikterna mot facit

Nu finns `finish_position` för historiska omgångar och en utvärderingssida som mäter
toppval-träff och topp-3-täckning. Vikterna (30/20/15/15/10/5/5) är dock handsatta och
har aldrig testats mot utfallet. Förslag på enkelt nästa steg:

1. Skriv ett fristående backtest-skript (Node) som läser alla starters med
   `finish_position`, räknar om CS med olika viktuppsättningar (grid search räcker) och
   maximerar topp-3-täckning eller log-loss.
2. Kör om backtesten när nya komponenter (kusk-%, galopprisk, streckdiskrepans) läggs till
   så att varje ändring bevisas mot data i stället för att gissas.

**Obs:** `horse_starts_history` (full starthistorik per häst) hämtas från ATG men sparas
aldrig i databasen (`app/api/games/fetch/route.ts:99-113`) – den kastas efter beräkningen.
Att spara den (t.ex. som JSONB) gör spårfaktorn backtestbar i efterhand.

---

## 3. UI/UX

Prioriterat efter hur störande det är för användaren (från UI-genomgången):

1. **Tysta fel.** Flera flöden sväljer fel utan att visa något:
   utkast-sparning (`components/MainPageClient.tsx:74-76`, tom `catch`),
   spellistan (`components/GamePickerBar.tsx:41-44`, fel ⇒ tom lista utan förklaring),
   anteckningar (`components/notes/HorseNotes.tsx:20-25`, varken loading- eller error-state).
   Användaren kan inte skilja "inget finns" från "något gick sönder".
2. **`confirm()` för destruktiva åtgärder** (`components/sallskap/admin/AdminTab.tsx:26`,
   `components/sallskap/spel/SystemCard.tsx:38`) – klumpigt på mobil och bryter mot
   appens design. En enkel bekräftelsemodal räcker.
3. **Ingen feedback vid "kopiera system"** (`SystemCard.tsx`) – clipboard-skrivningen
   lyckas men användaren ser inget. En kort "Kopierat!"-toast.
4. **Tillgänglighet:** ~40 ikon-knappar saknar `aria-label` (bl.a. systemvals-knappen i
   `HorseCard.tsx:397-407`), dialoger/drawers saknar fokushantering och ESC-stängning
   (`SaveSystemDialog.tsx`, `SystemDrawer.tsx`, `GamePickerBar.tsx`).
5. **Mobil-överlapp:** `SystemDrawer` (`bottom-0 z-50`) och `BottomNav` (`bottom-0 z-50`)
   konkurrerar om samma yta på små skärmar.
6. **Inkonsekvenser:** olika datum-/tidsformat per komponent (centralisera i en
   `formatDate()`-utility), olika formuleringar för tomma tillstånd, `disabled:opacity-50`
   ger svag kontrast.
7. **Systemläget tappas vid navigering** – inte persistat (t.ex. localStorage), så ett
   påbörjat system känns "borttappat" om man råkar lämna sidan (utkast-sparningen
   mildrar detta, men läget i UI återställs inte).

---

## 4. Saknade funktioner (störst nytta först)

1. **Kostnadskalkyl för system.** `total_rows` sparas redan och `getRowPrice()` finns i
   `lib/atg.ts` – men ingenstans visas "243 rader × 1,50 kr = 364,50 kr" medan man bygger.
   Mycket liten insats, stor nytta.
2. **Backtest av sparade system.** `game_systems` + `finish_position` finns båda – en vy
   "ditt system hade 6 rätt av 8" är nästan bara en join. Detta är den naturliga
   fortsättningen på utvärderingssidan.
3. **Bets-statistiken visas aldrig.** `getGroupBetStats()` beräknar ROI per medlem men
   används inte i något UI (`lib/actions/bets.ts:134-179`). Antingen bygg vyn (Sällskap →
   ny flik) eller ta bort koden. *(Fixa säkerhetsfynd S1 först.)*
4. **Export/delning av system** – utskriftsvänlig vy, CSV eller text att klistra in;
   i dag är sparade system inlåsta i appen.
5. **Kusk-/tränarstatistik över tid** – data per start sparas redan; en enkel
   aggregeringsvy ("kuskar med flest vinster i sparade omgångar") kräver ingen ny datainsamling.
6. **Notiser inför start** är medvetet out of scope (`.planning/PROJECT.md`), men en enkel
   variant – `StartCountdown` finns redan – vore en lokal PWA-notis X minuter före spelstopp.

---

## 5. Övrigt / dokumentationsdrift

- **CLAUDE.md beskriver kod som inte finns:** `analyzeRace()` och `analyzeRaceEnhanced()`
  i `lib/analysis.ts` är borta; formeln bor i `lib/formscore.ts → calculateCompositeScore`.
  Avsnitten "Matematisk analys" och "Utökad analys" bör skrivas om så att framtida
  AI-/utvecklarsessioner inte letar efter fel funktioner.
- `app/(authenticated)/groups.ts` är markerad "under avveckling" – stäm av och ta bort.
- `getRecentGroupActivity()` är en tom stub (`lib/actions/sallskap.ts:33-37`).

---

## Rekommenderad ordning

Åtgärderna spåras som GitHub-issues:

| Steg | Vad | Issue | Insats |
|------|-----|-------|--------|
| 1 | Säkerhet S1–S4 (auth/medlemskap i server actions, admin-spärr på deleteGame) | [#54](https://github.com/spangen87/v85-app/issues/54) | Liten |
| 2 | Säkerhet S5 (crypto-genererade, längre invite-koder) | [#55](https://github.com/spangen87/v85-app/issues/55) | Liten |
| 3 | Spårfaktor-buggen + skicka in trackConfig i CS-beräkningen | [#56](https://github.com/spangen87/v85-app/issues/56) | Liten |
| 4 | Spara `horse_starts_history` + backtest-skript för viktkalibrering | [#57](https://github.com/spangen87/v85-app/issues/57) | Medel |
| 5 | Nya formelkomponenter (kusk-%, galopprisk, streckdiskrepans) – validerade via backtest | [#58](https://github.com/spangen87/v85-app/issues/58) | Medel |
| 6 | Kostnadskalkyl för system | [#59](https://github.com/spangen87/v85-app/issues/59) | Liten |
| 7 | Backtest av sparade system + bets-ROI-vyn | [#60](https://github.com/spangen87/v85-app/issues/60) | Medel |
| 8 | UX-städning (tysta fel, confirm(), toasts, aria-labels) | [#61](https://github.com/spangen87/v85-app/issues/61) | Liten–medel |
| 9 | Uppdatera CLAUDE.md + städa död kod | [#62](https://github.com/spangen87/v85-app/issues/62) | Liten |
