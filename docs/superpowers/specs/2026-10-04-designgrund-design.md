# Designgrund – renare och tydligare Travappen

Datum: 2026-10-04 · Branch: `claude/designgrund-k4p9vx`

Designkällor (Claude Design):
- Designsystem: https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz – tokens, varumärkesbok, ordlista, komponenter.
- Nyckelvyer: https://claude.ai/artifact/UVCKQANpMwDrUqfWhFFFXn – loppvy, hästens detaljvy, tabellvy, systembyggare (mobil) och dator.

Vid konflikt gäller den här specen. Därefter gäller designsystemets README och sist ritytorna.

## 1. Mål och avgränsning

Appen ska kännas som ett lugnt verktyg. Varje siffra ska gå att förstå utan att fråga någon. Det som gör appen rörig i dag:

- Hästkortet visar upp till nio mått och märken på första raden: Grund, streck, odds, CS-ring, spårpil, skoprick, form, SKRÄLL och SIGNAL.
- Analystabellen har 12 kolumner och ett långt förklaringsstycke.
- Ett trettiotal förklaringar ligger i `title=`-tooltips, som inte syns på mobilen.
- Menyn säger "Analys" men leder till utvärderingen, och "Profil" leder till sällskapen.
- Etiketterna är 9–10 px, i versaler och med monospace-typsnitt.
- `/manual` är handskriven kod som inte har uppdaterats sedan förra omdesignen. Den visar inte `MANUAL.md`, trots att `CLAUDE.md` säger det.

**I omgången ingår:**
- tokens och tema för hela appen
- gemensamma grundkomponenter
- en ordlista som är enda källan för förklaringar
- navigeringen
- loppvyn med hästrad, detaljvy, tabellvy (dagens analysverktyg) och systembyggaren
- manualsidan.

**Ingår inte:** egen omdesign av Utvärdering, Sällskap, Systemsidan (`/system`), Admin och inloggning. De får nya färger och typsnitt automatiskt via aliasen i 3.2, men behåller sin layout. De görs om med samma byggblock i senare omgångar. Inga beräkningar ändras (Chans, CS, Grund, Skräll, Signal, Värde).

**Klart när:**
1. Hästraden visar bara det som står i 6.4.
2. Varje mått i loppvyn, detaljvyn och tabellen har en etikett man kan trycka på, och den öppnar en förklaring från ordlistan.
3. Det finns inga `title=`-tooltips kvar i de komponenter som ingår.
4. Manualen visar `MANUAL.md`.
5. Ljust och mörkt tema klarar kontrastkraven i designsystemet.

## 2. Beslut från genomgången

| Fråga | Beslut |
| --- | --- |
| Omfattning | Designsystem och nyckelvyer (loppvy, detaljvy, tabell, systembyggare). |
| Måtten | Tydlig hierarki. Hästraden visar Chans stort och streck och odds under. Allt annat ligger i detaljvyn. |
| Känsla | Lugnt verktyg. Ljust och mörkt tema är lika genomarbetade. Färg används bara när den betyder något. |
| Meny | Lopp, System, Utvärdering, Sällskap. Manualen nås från "?" och från förklaringarna. |
| Analysverktyget | Blir vyn **Tabell** i loppvyn, som man växlar till från **Lista**. Knappen "Visa analys" försvinner. |
| Filter | Värde, Skräll, Signal, Dölj långskott och Sök samlas bakom knappen **Filter**. Sorteringen ligger i **Sortera**. |
| Topp 5 | Tas bort från startsidan. Den överlappar med sortering på Chans. |
| Km-tider | Skrivs som hos ATG: "1.12,4". |
| Siffror | Decimalkomma och hårt mellanslag före %: "24,1 %". Odds "4,2" utan "x". Procentenheter "+4,2". |
| Systemläge | Knappen "Bygg system" försvinner. Ett tryck på ett startnummer lägger hästen i systemet, och systemfältet visas så fort minst en häst är vald. |

## 3. Tokens och tema

### 3.1 Tokens (`app/globals.css`)

Tokens kopieras exakt från designsystemets `tokens.json`, med samma namn utan prefix:
- färger: `--bg`, `--surface`, `--surface-sunken`, `--line`, `--line-strong`, `--ink`, `--ink-muted`, `--accent`, `--accent-soft`, `--on-accent`, `--focus`, `--value`, `--value-soft`, `--skrall`, `--skrall-soft`, `--danger`, `--danger-soft`, `--place-1..3`, `--on-place`, `--scrim`
- avstånd: `--space-1..8`
- hörn: `--radius-sm/md/lg`
- skuggor: `--shadow-raised`, `--shadow-sheet`
- typsnitt: `--font-sans`, `--font-display`.

Struktur:
- **Ljusa värden** på `:root`.
- **Mörka värden** under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` och igen under `:root[data-theme="dark"]`.
- `color-scheme` följer temat.
- `body` får `background: var(--bg)`.

### 3.2 Alias för gamla variabler

`--tn-*` blir alias till de nya, så att sidor utanför omgången får det nya utseendet direkt:

| Gammal | Ny |
| --- | --- |
| `--tn-bg` | `--bg` |
| `--tn-bg-raised`, `--tn-bg-card` | `--surface` |
| `--tn-bg-card-hover`, `--tn-bg-chip` | `--surface-sunken` |
| `--tn-border` / `--tn-border-strong` | `--line` / `--line-strong` |
| `--tn-text` | `--ink` |
| `--tn-text-dim`, `--tn-text-faint` | `--ink-muted` (faint klarade inte 4,5:1) |
| `--tn-accent` | `--accent` |
| `--tn-accent-soft`, `--tn-accent-faint`, `--tn-accent-glow` | `--accent-soft` |
| `--tn-value-high` / `-bg` | `--value` / `--value-soft` |
| `--tn-value-low` / `-bg` | `--danger` / `--danger-soft` |
| `--tn-warn` / `-bg` | `--skrall` / `--skrall-soft` |
| `--tn-p1..3` | `--place-1..3` |

Tre klasser behålls med bättre värden:
- `--tn-heat-*` och `--tn-label-*` (färger för anteckningsetiketter) står kvar som egna värden.
- `.tn-eyebrow` blir 12 px, Geist och vanlig skiftläge, utan `text-transform`.
- `.tn-mono` behålls för de sidor som ingår i senare omgångar.

Nya komponenter använder aldrig `--tn-*`. Aliasen tas bort när den sista sidan är omgjord.

### 3.3 Tema

- `ThemeProvider` läser `localStorage.theme`, som kan vara `"light"`, `"dark"` eller saknas. Saknas värdet följer appen systemets inställning, och då sätts inget `data-theme`.
- Ett litet inlineskript i `app/layout.tsx` sätter `data-theme` från localStorage innan sidan ritas, så att det inte blinkar i fel tema.
- `ThemeToggle` växlar mellan ljust och mörkt och sparar valet.
- Klasserna `.dark` och `.light` hålls i synk för Tailwinds `dark:`-varianter.
- `viewport.themeColor` får två värden, ett för ljust och ett för mörkt, via `media`.

### 3.4 Typsnitt

- **Geist (`--font-sans`)** för all text. Siffror skrivs med `tabular-nums`.
- **Instrument Serif (`--font-display`)** bara för ordmärket och sidrubriker.
- **Geist Mono** laddas så länge `.tn-mono` används, men nya komponenter använder det inte.
- Minsta textstorlek är 12 px.

## 4. Grund: format, ordlista och komponenter

### 4.1 `lib/format.ts`

- `fmtPct(v, d=1)` → "24,1 %"; `null` → "–"
- `fmtNum(v, d=1)` → "4,2"
- `fmtDelta(v)` → "+4,2" / "−1,3" / "±0" (äkta minustecken)
- `fmtKmTime("1:12,4")` → "1.12,4" (tar emot appens lagrade format och ATG:s)
- `fmtKr(n)` → "41 200 kr"

### 4.2 `lib/glossary.ts`

`GLOSSARY: Record<TermId, { title, what, how?, note?, anchor }>` med texterna från designsystemets `ordlista.md`.
- `TermId` är något av `chans | streck | odds | varde | grund | cs | skrall | signal | oense | form | spar`.
- `anchor` är rubrikens slug i `MANUAL.md` (se 9).

Ordlistan är den enda källan till förklaringstexterna. Komponenterna och manualen läser därifrån, och siffrorna i texterna ska stämma med `lib/skrall.ts`, `lib/edge.ts` och `lib/formscore.ts`.

### 4.3 `components/ui/`

Komponenterna portas från designsystemets `components/src/index.tsx` till TSX med riktiga typer, med samma namn, props och klassnamn (`ta-*`). Stilen ligger i `app/ui.css`, som importeras från `globals.css`, och kopieras från designsystemets `bundle.css` utom dess `@import` och `body`-regel.

| Komponent | Ansvar |
| --- | --- |
| `Button` | `primary`, `secondary` eller `quiet`, i storlek `md` (40 px) eller `sm`. |
| `Badge` | Toner: `neutral`, `skrall`, `signal`, `value`. |
| `StartNumber` | Tillstånd: `idle`, `selected`, `p1`, `p2`, `p3`, `finished`. Blir en knapp med `aria-pressed` när den har `onClick`. |
| `ValueDelta` | Grön bara med `highlight`. Minus visas grått. |
| `Term` och `ExplainSheet` | Ett ord man kan trycka på öppnar en förklaring. På mobil är förklaringen ett blad nerifrån; från `md` och uppåt en dialog i mitten (max 480 px). Den stängs med Esc, med ett tryck utanför eller med "Stäng". Länken "Läs mer i manualen" går till `/manual#<anchor>`. Fokus flyttas till bladet när det öppnas och tillbaka när det stängs. |
| `Metric` | Etikett, värde och undertext. |
| `FormStrip` | Fem rutor i ATG-notation. Skärmläsare får en text. |
| `HorseList` och `HorseRow` | Se 6.4. |
| `Assessment` | Bedömningslistan i detaljvyn. |
| `RaceTabs` | Flikarna 1–8 med antal valda hästar och markering för att resultatet är klart. |
| `SegmentedControl` | Växeln Lista/Tabell. Ny jämfört med designsystemet, och läggs till där också. |
| `Sheet` | Generellt blad nerifrån, för Filter och systemkupongen på mobil. Bygger på samma stil som ExplainSheet. Läggs till i designsystemet. |
| `BottomNav` | Se 5. |

## 5. Navigering

**`BottomNav` (mobil):**
- Flikarna är Lopp `/`, System `/system`, Utvärdering `/evaluation` och Sällskap `/sallskap`, med räknare för nya sällskapshändelser.
- Admin får en femte flik bara för administratörer, som i dag.

**`TopNav` (dator):**
- Ordmärket "Travappen" i `wordmark`, sedan samma fyra namn, och Admin för administratörer.
- Till höger ligger "Manual" och temaväxeln.

**Toppfältet på mobil** visar omgångsväljaren (`GamePickerBar`, se 6.1) och en "?"-knapp som leder till `/manual`.

## 6. Loppvyn

### 6.1 Sidhuvud

`GamePickerBar` görs om till sidhuvudet från ritytan:
- Raden "V85 · Solvalla" med en pil.
- Under den "Lördag 10 oktober · första start 16:20".
- Ett tryck öppnar dagens väljare som ett `Sheet`, med samma innehåll och funktion som i dag.

På dator visas omgångsnamnet som `page-title` med knappen "Byt omgång".

`SystemOutcomeBanner`, `GroupActivitySection`, `ResultsButton`, `AutoLoadUpcoming` och `UsefulLinks` behåller sina platser och funktioner. De får bara nya stilar via aliasen. `CollapsibleControls` tas bort från startsidan.

### 6.2 Avdelningsflikar och avdelningens rubrik

- `RaceTabs` ersätter `RaceTabBar` och läser fortfarande från `RaceTabContext`.
  - Antal valda hästar per avdelning kommer från `systemSelections`.
  - Resultatet räknas som klart när någon häst i avdelningen har `finish_position`.
- Under flikarna står "Avdelning N" som `title` och på raden under "2140 m · Autostart · 12 hästar" och starttiden. `StartCountdown` står kvar till höger.

### 6.3 Verktygsrad

Raden innehåller `SegmentedControl` (Lista | Tabell), en knapp "Sortera: <val>" och en knapp "Filter (n)".

**Sortera** öppnar ett `Sheet` med alternativen:
- Chans (standard, högst först)
- Streck
- Odds (lägst först)
- Grund
- CS
- Startnummer.

**Filter** öppnar ett `Sheet` med:
- Bara värde
- Bara skräll
- Bara signal
- Dölj långskott (odds över 50)
- Sök häst, kusk eller tränare
- Rensa filter.

Siffran på knappen är antalet aktiva filter.

Valt läge (Lista eller Tabell) och vald sortering sparas i localStorage. Filter och sökning sparas inte.

Sorteringen och filtren flyttas ut ur `RaceList` till rena funktioner i `lib/raceView.ts`:
- `sortStarters(starters, key, maps)`
- `filterStarters(starters, filters, maps)`
- `buildRowModels(race, …)`

`buildRowModels` returnerar per häst: chans, streck, odds, värde, isValue, märke, form, grund, cs, oense och tillstånd för startnumret.

**Märke:** Skräll vinner över Signal, och en häst visar högst ett. Värderegeln är oförändrad: CS över 55, streck över 0 och chansen större än strecket.

### 6.4 Lista: hästraden

`HorseRow` visar:
- **vänster:** `StartNumber`
- **mitten:** namn, kusk, `FormStrip`, högst ett märke och antal anteckningar
- **höger:** Chans i `number-lg`. Under den "Streck 18,0 %" och "Odds 4,2". `ValueDelta` (grön) visas bredvid Chans när hästen är markerad som värde.

En kolumnrubrik (`HorseList`) med `Term` för Chans, Streck och Odds står överst.

Om ett värde saknas gäller följande:
- Saknas streck visas Chans från odds.
- Saknas odds visas "–".
- Saknas båda visas "–", och avdelningen får en rad i `skrall-soft`: "Streck och odds saknas än. Hämta om omgången när spelet har öppnat."

Strukna hästar (regeln från `scratchedMask`) visas sist, nedtonade, med märket "Struken". De får ingen Chans och går inte att lägga i systemet.

**Startnumret:**
- Före resultat läggs hästen i eller tas ur systemet med ett tryck.
- Efter resultat visar numret placeringen (`p1`, `p2`, `p3` eller `finished`) och går inte att trycka på.

**Raden** öppnar detaljvyn när man trycker på den. Den nås också med tangentbordet: Enter eller mellanslag.

Det här tas bort från raden:
- CS-ringen
- Grund
- spårpilen
- skopricken
- `#rank`
- texten "▼ DETALJER"
- signalchipsen (de flyttar till detaljvyn).

### 6.5 Detaljvy (`components/HorseDetail.tsx`, ersätter det utfällda `HorseCard`)

- **Hur den öppnas:** på mobil som ett lager över hela skärmen, med tillbakalänken "‹ Avdelning N". Från `md` och uppåt som en dialog med max 640 px bredd.
- **Webbläsarens bakåtknapp:** när detaljvyn öppnas läggs `?hast=<avdelning>-<startnummer>` (t.ex. `?hast=3-2`) till med `history.pushState`, så bakåtknappen stänger vyn.
- **Om sidan laddas med `?hast=`:** då väljs avdelningen och detaljvyn öppnas för hästen. Okänt värde ignoreras.

Ordning:
1. **Huvud:** startnummer, namn, "5 år · valack · Spår 2", kusk och tränare, `FormStrip`, märke och knappen "Lägg i systemet" eller "Ta bort ur systemet". Knappen visas bara före resultat. Efter resultat visas i stället placering och tid.
2. **Bedömning** (`Assessment`):
   - Chans: placering i fältet i noten.
   - Streck.
   - Värde.
   - Odds: platsodds i noten.
   - Grund: "Varför: …" från `topReasons`. Om hästen är `isDisagreement` läggs till: "Grund och streck är oense. Då har strecket oftast haft rätt."
   - CS: placering i fältet.
   - Spår: banjusteringen i ord, om den finns, till exempel "Bra spår på Solvalla från autostart".
3. **Signaler:** varje signal från `edge.signals` på en egen rad med poäng och detaljtext, och summan i rubriken. Saknas signaler: "Inga signaler för den här hästen."
4. **Senaste starter:** hämtas automatiskt från `/api/horses/[id]/starts` när detaljvyn öppnas. Medan de hämtas visas "Hämtar senaste starter från ATG …". Vid fel visas en felruta med texten "Kunde inte hämta starter från ATG. Försök igen." och knappen "Försök igen". Varje rad visar datum, bana, distans och startmetod, tid och placering. Kusk och skor finns i en utfällbar rad.
5. **Bästa tider:** tabellen Auto/Volt × Kort/Medel/Lång, där dagens kombination är markerad.
6. **Utrustning:** skor fram och bak, med "Ny" vid ändring, och vagn. Visas bara om `shoes_reported`.
7. **Statistik:** livs, i år, föregående år, plats-%, pengar per start och totalt.
8. **Kusk och tränare:** vinstprocent i år.
9. **Anteckningar:** `HorseNotes` som i dag.

`HorseCard.tsx` tas bort när `HorseRow` och `HorseDetail` har ersatt den.

### 6.6 Tabell (ersätter `AnalysisPanel` och `TopFiveRanking`)

`components/RaceTable.tsx` använder samma `buildRowModels`, sortering och filter som listan.

**Standardkolumner:**
- Häst: startnummer och namn. Kolumnen står fast vid horisontell rullning.
- Senaste 5: bara från `md` och uppåt.
- Chans, Streck, Odds, Värde, Grund.
- Märke.

**"Visa alla kolumner"** lägger till:
- CS
- Distans: distanssignalen i ord, till exempel "Vunnit på distansen".
- Spår: spårfaktorn med banjustering.
- Resultat: placering och tid.

Kolumnrubrikerna är `Term`. Ett tryck på namnet öppnar detaljvyn, och ett tryck på numret lägger hästen i systemet. Förklaringsstycket, versalmärkena (VÄRDE, SKRÄLL, OENSE) och skräll- och signalrutorna ovanför tabellen tas bort. Den informationen finns nu i Märke, Filter och detaljvyn.

## 7. Systembyggaren

- **Implicit läge.** `systemMode` och knappen "Bygg system" tas bort. Systemet är det som finns i `systemSelections`. Utkastet sparas automatiskt som i dag.
- **Systemfältet på mobil** visas ovanför `BottomNav` när minst en häst är vald. Det visar "Ditt system · 144 rader · 72 kr", eller "6 av 8 avd" när inte alla avdelningar har en häst. Under står "Välj minst en häst i varje avdelning", och till höger finns knappen "Visa". Fältet använder `ink` som bakgrund och `bg` som text, så att det syns i båda teman.
- **Kupongen** (`SystemDrawer` på mobil, som `Sheet`) innehåller:
  - Namnfältet.
  - En rad per avdelning med alla startnummer att trycka på, märket "Spik" när exakt en häst är vald och antal valda.
  - "Mina utkast".
  - En fot med rader och kostnad, statustext och knapparna "Rensa" och "Spara system". "Spara system" går inte att trycka på förrän alla avdelningar är klara.
- **`SystemSidebar` (från `md` och uppåt)** visas alltid när en omgång är laddad.
  - Varje avdelning visar sina valda nummer.
  - Foten visar rader, kostnad och "Spara system".
  - Utan val står "Tryck på ett nummer för att lägga hästen i systemet".
  - Innehållet trycks inte åt sidan med `md:pr-[320px]`. I stället används ett tvåkolumnslayout med `flex-wrap`, som i ritytan för dator.
- **"Rensa"** frågar först med `ConfirmDialog` och den text som finns i dag.
- **`SaveSystemDialog`** behåller sin funktion och får bara nya stilar.
- **Radpris:** raderna och priset räknas med `computeTotalRows` och `formatRowCost`, som inte ändras.

## 8. Felhantering och tomma tillstånd

- **Ingen omgång laddad:** "Ingen omgång inladdad ännu", texten från i dag och en primärknapp "Hämta en omgång".
- **Filter som döljer alla hästar:** "Inga hästar matchar filtret." och knappen "Rensa filter".
- **Fel vid hämtning:** visas i `danger-soft` med vad som hände och vad man kan göra.
- **Okänd term:** `Term` renderar bara texten, utan knapp, och skriver en varning i konsolen i utvecklingsläge.
- **Utkast som inte gick att spara:** systemfältet och kupongen visar "Kunde inte spara utkastet" i `danger`.

## 9. Manualen

- **`/manual` renderar `MANUAL.md`** med `react-markdown`, `remark-gfm` för tabeller och `rehype-slug` för rubrik-id. Det är tre nya beroenden. Stilen ligger i `.ta-prose` i `ui.css`. Sidhuvudet är "Manual" med en innehållsförteckning från rubrikerna på nivå 2. Den gamla handskrivna `page.tsx` ersätts.
- **`MANUAL.md` får ett avsnitt "Ordlista"** med en rubrik på nivå 3 per term. Texterna kommer från `lib/glossary.ts`, och `anchor` i ordlistan är rubrikens slug.
- **Avsnitt som uppdateras efter den nya layouten:**
  - 4 Navigera
  - 4.1 Topp 5 tas bort
  - 4.2 Sortera och filter
  - 5 Hästraden och detaljvyn
  - 6 Tabellen
  - 6.4 Systembyggaren
  - Meny och tema
- **`CLAUDE.md`:**
  - Raden om att manualen renderar `MANUAL.md` blir sann.
  - Katalogstrukturen får `components/ui/`, `lib/format.ts`, `lib/glossary.ts` och `lib/raceView.ts`.
  - Borttagna komponenter stryks.
  - En regel läggs till: förklaringstexter ändras i `lib/glossary.ts` och `MANUAL.md` samtidigt.

## 10. Tester

Jest körs i node-miljö. Komponenter testas med `renderToStaticMarkup` från `react-dom/server`, så det behövs ingen jsdom.

- **`lib/__tests__/format.test.ts`:**
  - decimalkomma och hårt mellanslag
  - `null` blir "–"
  - äkta minustecken
  - "±0" under 0,05
  - km-tid från båda formaten
  - tusentalsavgränsare i kr.
- **`lib/__tests__/glossary.test.ts`:**
  - Varje `TermId` har `title` och `what`.
  - Varje `anchor` finns som rubrikslug i `MANUAL.md` (beräknas med `github-slugger`).
  - Siffrorna i texterna för skräll och signal stämmer med `SKRALL_THRESHOLDS` och `EDGE_THRESHOLDS`.
- **`lib/__tests__/raceView.test.ts`:**
  - sortering för varje nyckel, där saknade värden hamnar sist
  - varje filter för sig och flera tillsammans
  - sökning på häst, kusk och tränare
  - Skräll vinner över Signal i märket
  - värderegeln
  - strukna hästar sist och inte valbara
  - startnummer efter resultat
  - antal valda och resultat klart per avdelning.
- **`lib/__tests__/ui.test.tsx`:**
  - `StartNumber` med och utan `onClick`, inklusive `aria-pressed`
  - `ValueDelta` med highlight
  - `FormStrip` för 1, 2, 3, "5g", "0" och "d", med uppläst text
  - `HorseRow` visar Chans, streck och odds och högst ett märke
  - `Term` med okänt id renderar bara texten
  - `BottomNav` har fyra flikar plus Admin för administratörer.
- Hela sviten (`npx jest`), `npm run lint` och `npm run build` ska gå igenom.
- **Manuell kontroll mot ritytorna** med `npm run dev`:
  - mobil 390 px och dator 1440 px
  - ljust och mörkt tema
  - tangentbordsfokus på startnummer, rad, flikar och förklaringar
  - ett lopp före resultat och ett efter.

## 11. Utrullning

Tre PR:er som var och en går att merga för sig:

1. **Grund:**
   - tokens, alias och tema (3)
   - format och ordlista (4.1–4.2)
   - `components/ui/` (4.3)
   - navigering (5)
   - manualen (9).

   Efter den här har hela appen nya färger och typsnitt.
2. **Loppvyn:** sidhuvud, flikar, verktygsrad, lista, detaljvy och tabell (6). `HorseCard`, `AnalysisPanel`, `TopFiveRanking`, `RaceTabBar` och `CollapsibleControls` tas bort.
3. **Systembyggaren:** implicit läge, systemfält, kupong och sidopanel (7).

Varje PR uppdaterar de delar av `MANUAL.md` som den påverkar. De nya komponenterna `SegmentedControl` och `Sheet` läggs också till i designsystemet i Claude Design, så att det förblir källan.
