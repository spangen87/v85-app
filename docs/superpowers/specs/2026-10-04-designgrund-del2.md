# Designgrund del 2 – Utvärdering, Sällskap och Mina system

Datum: 2026-10-04 · Bygger på [designgrund-design.md](2026-10-04-designgrund-design.md), vars regler gäller.

Designkällor (Claude Design):
- Designsystem: https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz (oförändrat).
- Ritytor för den här omgången: https://claude.ai/artifact/UsTtteTSw4VWXyWjo2W53i. Ritades på ett annat konto än den första duken, eftersom den första inte gick att nå härifrån.

Användaren var inte tillgänglig. Besluten nedan togs utifrån designsystemets README och specen för del 1, och ska granskas i efterhand.

## 1. Gemensamt

- **Sidhuvud (`PageHeader`)**: h1 (600 20/26) med en rad undertext i `ink-muted`. En valfri tillbakalänk till vänster och en valfri handling till höger. Bakgrund `surface`, linje `line`. På mobil sitter det fast upptill, precis som på loppsidan. Temaknappen försvinner från sidhuvudena: temat väljs under Sällskap → Utseende och i toppmenyn på dator.
- **Omgångsväljare (`GameSelect`)**: en vanlig `<select>` med klassen `ta-field` och etiketten "Omgång". Alternativen skrivs "V85 · Solvalla · lör 10 okt", med `fmtGameDate`. Används på Mina system och i sällskapets flikar.
- **Tomt läge (`EmptyState`)**: ett kort med rubrik, en mening och högst en knapp, som på startsidan.
- **Sektioner**: h2 med `ta-section-title`. Versaler med spärrning (`tn-eyebrow`) försvinner från de här sidorna.
- **Färg**: inga trafikljus för "bra" och "dåligt". Träffar visas med text ("3 av 8") och med placeringsfärger där det betyder placering: vinnande häst är `place-1`, och ligans topp tre är `place-1..3`. Inga emojis (👑, 🎯, ✓). Det som kan förstöras (Ta bort, Lämna) bekräftas i `ConfirmDialog`.
- Alla sidor läser bara de nya tokens (`--ink`, `--surface` …), aldrig `--tn-*`.

## 2. Utvärdering (`/evaluation`)

- Sidhuvud "Utvärdering" med undertexten "Hur ofta modellernas toppval vinner".
- Kortet **Träffsäkerhet** är en jämförelsetabell med kolumnerna `<Term term="cs">CS</Term>` och `<Term term="grund">Grund</Term>`, och raderna "Toppval vinner" och "Vinnaren bland topp 3". Under tabellen står "Underlag: 12 omgångar · 94 avdelningar". Hela kortet ersätter fem statistikkort.
- **Per omgång**: en lista med rader som "V85 · Solvalla · lör 10 okt". Till höger står "Toppval vann 3 av 8". Ett tryck fäller ut en tabell med kolumnerna Avd, Vinnare, Toppval (CS) och Utfall. Utfall är märket "Vann" (place-1), "Topp 3" (neutral) eller ett tankstreck.
- **Omgångar** (underhåll, längst ner): knappen "Hämta saknade resultat" (BulkResultsButton) och raden "Visa alla omgångar (N)". Listan visar status med text: "Rättad" eller "Väntar på resultat". Administratörer har en knapp "Ta bort" med bekräftelse.

## 3. Mina system (`/system`)

- Sidhuvud "Mina system" med undertexten "Dina utkast och sparade system per omgång". Under det GameSelect.
- Sektionerna "Utkast" och "Sparade system" med det nya systemkortet.
- **Systemkort (`SystemCard`)**:
  - Rad 1 visar namnet och ett märke ("Utkast", sällskapets namn eller "Privat"). Till höger står resultatet "6 av 8 rätt", eller "Pågår" innan systemet är rättat.
  - Rad 2: "Rikard · 144 rader · 72 kr" i `ink-muted`.
  - Avdelningarna listas som "Avd 3" följt av startnummer (`ta-num`, små). När ett lopp är rättat är vinnaren `p1` och övriga `finished`. Annars visas numren i vila.
  - Handlingar är små knappar: "Fortsätt bygga" (utkast), "Kopiera", "Jag spelade detta" (sällskapssystem) och "Ta bort" (quiet), med bekräftelse.
  - Länken "Fortsätt bygga" går till `/?game=<id>`. Det gamla `systemMode=1` finns inte längre.
- Tomt läge: "Inga system för omgången" med knappen "Bygg ett system", som går till loppvyn.

## 4. Sällskap (`/sallskap`)

- Sidhuvudet visar initialer i en cirkel (`accent-soft`/`accent`), namnet och e-postadressen.
- **Mina sällskap**: en lista i kortet med en rad per sällskap. Raden har namnet, antalet nya händelser som märke och en pil. Inbjudningskoden och "Lämna" flyttas in i sällskapets flik "Sällskapet".
- **Skapa eller gå med**: ett kort med två fält, "Nytt sällskap" och "Inbjudningskod", som har var sin knapp.
- **Inställningar**: ett kort med Visningsnamn, Utseende (Som enheten / Ljust / Mörkt) och Notiser.
- Längst ner länken "Manual" och knappen "Logga ut" (quiet).

## 5. Ett sällskap (`/sallskap/[id]`)

- Sidhuvudet har tillbakalänk, sällskapets namn och undertexten "5 medlemmar".
- Flikarna **Forum · Anteckningar · Spel · Sällskapet** ligger i ett flikfält som `ta-tabs` (infällt). De har `role=tablist` och roving tabindex.
- En gemensam GameSelect sitter under flikarna för Forum, Anteckningar och Spel. Valet följer med mellan flikarna. Fliken Sällskapet har ingen.
- **Forum**: fältet "Dela din analys om omgången" med knappen "Publicera". Inläggen ligger i kort med initialer, namn och tid. Svaren är indragna med en linje.
- **Anteckningar**: anteckningarna grupperas per avdelning (h2 "Avdelning 3"). Häst visas som startnummer och namn, och därunder kommer anteckningskorten med etikettfärgen.
- **Spel**:
  - Knappen "Bygg system" (primary), sedan Utkast och Sparade system med systemkortet.
  - **Sällskapsligan** visas i `ta-table`, med placeringen i en `ta-num` med p1–p3 för de tre första. Ledaren i senaste omgången får märket "Vann senast" i stället för 👑.
  - **Insatser**: ett formulär med etiketter (Spel, Avd, Häst, Insats) och knappen "Lägg till insats", och därefter listan. "Avkastning per medlem" fälls ut.
- **Sällskapet**: korten Namn, ATG-lag, Inbjudan, Medlemmar och "Lämna sällskapet", med bekräftelse.

## 6. Tester

- Rendering med `renderToStaticMarkup` för PageHeader, GameSelect, EmptyState, SystemCard (vinnare som p1, länken utan systemMode, märken) och utvärderingens jämförelsetabell.
- Grep-test: inga `--tn-` och inga emojis i de omgjorda filerna.
