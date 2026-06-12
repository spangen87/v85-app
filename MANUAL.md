# Användarmanual – V85 Analys

## Innehållsförteckning

1. [Introduktion](#1-introduktion)
2. [Komma igång](#2-komma-igång)
   - [Registrering och inloggning](#21-registrering-och-inloggning)
3. [Hämta omgång](#3-hämta-omgång)
4. [Navigera bland omgångar](#4-navigera-bland-omgångar)
   - [Top 5 – högst Composite Score](#41-top-5--högst-composite-score)
   - [Sortering, filtrering och sökning](#42-sortering-filtrering-och-sökning)
5. [Hästarnas informationskort](#5-hästarnas-informationskort)
   - [Expanderad detaljvy](#51-expanderad-detaljvy)
   - [Composite Score (CS)](#52-composite-score-cs)
6. [Analysverktyget](#6-analysverktyget)
   - [Analystabellen](#61-analystabellen)
   - [Spårfaktor och banjusteringar](#62-spårfaktor-och-banjusteringar)
   - [Systembyggaren](#63-systembyggaren)
7. [Sällskap och samarbete](#7-sällskap-och-samarbete)
   - [Skapa ett sällskap](#71-skapa-ett-sällskap)
   - [Gå med i ett sällskap](#72-gå-med-i-ett-sällskap)
   - [Flikar i sällskapet](#73-flikar-i-sällskapet)
   - [Hantera sällskapet (skaparen)](#74-hantera-sällskapet-skaparen)
8. [Anteckningar på hästar](#8-anteckningar-på-hästar)
9. [Utvärdering](#9-utvärdering)
10. [Ordlista](#10-ordlista)

---

## 1. Introduktion

**V85 Analys** är ett verktyg för dig som spelar V85 (och liknande ATG-spel). Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på form, odds, konsistens, tider och startspår, och låter dig dela anteckningar och diskutera med dina spelvänner i ett gemensamt sällskap.

Appen är byggd för att ge dig ett bättre beslutsunderlag – den ersätter inte din egen bedömning, men hjälper dig hitta hästar vars oddsvärde kan vara bättre än marknadens.

> **Tips:** Appen kan installeras som en app på din telefon eller dator via webbläsarens "Installera"-funktion (PWA).

---

## 2. Komma igång

### 2.1 Registrering och inloggning

1. Öppna appen i webbläsaren.
2. Du möts av inloggningssidan om du inte redan är inloggad.
3. **Ny användare?** Ange din e-postadress och ett lösenord och klicka på **Registrera**.
4. **Redan registrerad?** Ange dina uppgifter och klicka på **Logga in**.
5. Efter lyckad inloggning hamnar du på huvudsidan.

> **Tips:** Ditt visningsnamn kan ändras i profilinställningarna och syns för övriga medlemmar i dina sällskap.

---

## 3. Hämta omgång

Innan du kan analysera en omgång måste du hämta data från ATG.

> **Snabbväg:** Om nästa V86/V85/V75 är tillgänglig visas en **Hämta**-knapp direkt på startsidan – klicka på den för att hämta utan att välja datum manuellt.

1. Välj ett **datum** i datumväljaren högst upp på sidan.
2. Tillgängliga spel för det datumet laddas automatiskt och visas som knappar (t.ex. **Hämta V85**, **Hämta V75**).
3. Om inga spel finns för valt datum visas texten "Inga spel".
4. Klicka på knappen för det spel du vill hämta.
5. Om hämtningen lyckas läggs omgången till i listan och du navigeras dit automatiskt.

> **Obs!** Du kan välja datum upp till **14 dagar bakåt eller framåt** från dagens datum.

---

## 4. Navigera bland omgångar

På huvudsidan ser du en lista med alla hämtade omgångar.

- Välj omgång via **rullgardinsmenyn** (GameSelector) längst upp.
- Omgångens **avdelningar** visas som klickbara flikar. Klicka på en avdelning för att visa den – bytet sker direkt utan sidladdning.
- Hästar i aktiv avdelning visas som **en häst per rad** (ATG-stil).

### 4.1 Top 5 – högst Composite Score

Högst upp visas widgeten **Top 5 — Composite Score** med de 5 hästar som har högst CS i hela omgången. Varje häst visas med avdelning, startnummer, odds och eventuell slutplacering.

- Klicka på **▼ / ▲**-knappen för att minimera/expandera widgeten.
- Klicka på en häst i listan för att hoppa direkt till hästkortet i rätt avdelning.

### 4.2 Sortering, filtrering och sökning

Ovanför hästlistan finns en verktygsrad med kontroller:

**Sortering** – rullgardinsmeny som styr hur hästarna i avdelningen sorteras:

| Val | Beskrivning |
|-----|-------------|
| **CS — Composite Score** | Högst sammansatt poäng först (standardval) |
| **Startnummer** | Standard ATG-ordning |
| **Odds (lägst)** | Lägst vinnarodds först |
| **Streck% (högst)** | Högst streckprocent i poolen först |

**Filtrering:**

| Knapp | Beskrivning |
|-------|-------------|
| **Värde** | Visar bara hästar som systemet bedömer som undervärderade (CS > 55 och CS-andel över streckningen) |
| **Skräll** | Visar bara skrällkandidater — lågstreckade hästar med hög klass där vinnaroddsen säger mer än strecken (se 6.1) |
| **Dölj >50x** | Döljer hästar med odds över 50 |

**Sökning** – skriv namn på häst, kusk eller tränare för att filtrera.

Klicka på **Rensa ✕** för att återställa alla filter.

---

## 5. Hästarnas informationskort

När en avdelning är expanderad visas ett kort per häst. Den kompakta raden innehåller:

| Fält | Förklaring |
|------|-----------|
| **Sorteringsrank (#)** | Hästens placering i aktuell sortering (visas ej vid sortering på startnummer) |
| **Nr** | Startnummer |
| **Namn** | Hästens namn — en orange prick (●) intill namnet betyder skoändring inför loppet |
| **SKRÄLL-märke** | Visas om hästen är skrällkandidat (se 6.1); håll muspekaren över för förklaring |
| **Kusk** | Kuskens namn |
| **Streck%** | Hästens andel av spelpoolen (om tillgängligt) |
| **Odds** | Aktuellt vinnarodds |
| **CS-ring** | Composite Score 0–100 som färgad ring — klicka för förklaring av poängen |
| **Spårjustering (↑/↓)** | Visas vid banor med banspecifik konfiguration (se 6.2) |
| **Senaste starter** | Placeringar som färgade rutor: guldgul = 1:a, silver = 2:a, orange = 3:a, grå = övriga |

Hästar markerade som **Värde** får en grönaktig kantlinje på kortet.

### 5.1 Expanderad detaljvy

Klicka på **▼ Detaljer** på ett hästkort för att se mer information:

- **Slutplacering** – visas högst upp om loppresultat hämtats.
- **Grundfakta** – ålder/kön/färg, far (härstamning) och hemmaplan.
- **Skosättning** – sko fram/bak med ändringsstatus ("Ny" = ändrad inför loppet) samt vagnstyp.
- **Snabbstatistik** – LIVS (vinster-2:or-3:or och antal starter), ÅR (vinstprocent och starter i år) och REKORD (bästa tid och plats-%).
- **Bästa tider** – tabell med hästens rekord per distans (kort/medel/lång) och startmetod (auto/volt). Dagens kombination markeras.
- **Statistik** – starter livs/i år/föregående år, plats-%, kr/start och totalt intjänat.
- **Odds** – vinnarodds och platsodds.
- **Kusk & Tränare** – namn med årets vinstprocent.
- **Senaste starter** – klicka **Hämta från ATG** för att ladda en detaljerad starttabell med datum, bana, placering och tid.
- **Anteckningar** – se avsnitt 8.

### 5.2 Composite Score (CS)

**CS – Composite Score (0–100)** är systemets samlade bedömning av hästen och visas som en ring på hästkortet:

```
CS = 55% × streckning
   + 20% × distansrekord
   + 10% × odds
   + 10% × konsistens
   +  5% × form
```

Delkomponenterna normaliseras inom startfältet (bästa hästen i fältet får högst delpoäng). Vikterna är kalibrerade mot historiska loppresultat och omkalibreras löpande när mer data samlats in — vinstprocent, tidindex, spårfaktor, kuskform och galopprisk beräknas och visas i appen men har för närvarande vikt 0 i CS.

Färgkod för ringen: **grön** (≥70) = stark häst, **blå** (50–69) = medel, **grå** (<50) = svag.

---

## 6. Analysverktyget

Klicka på knappen **Visa analys** inuti en avdelning för att öppna analyspanelen — **Matematisk analys**. Panelen rankar hela fältet efter CS och visar spelvärde, distanssignal och eventuella skrällkandidater.

### 6.1 Analystabellen

| Kolumn | Förklaring |
|--------|-----------|
| **#** | Rank i loppet enligt CS |
| **Häst** | Startnummer och namn, med **VÄRDE**- och/eller **SKRÄLL**-märke |
| **CS** | Composite Score 0–100 (se 5.2) — tabellen rankas på denna |
| **Odds** | Aktuellt vinnarodds |
| **Chans** | Kalibrerad vinstsannolikhet (se nedan) |
| **Strk.** | Hästens faktiska andel av spelpoolen (marknadens röst) |
| **Distans** | Distanssignal baserat på hästens historik på aktuell distans och startmetod |
| **Spår** | Spårfaktor med banspecifik justering — visas bara för banor med konfiguration (se 6.2) |
| **Värde** | Spelvärde: chans minus streckning, i procentenheter |
| **Res.** | Slutplacering om loppet är avslutat |

#### Kalibrerad vinstchans

**Chans** är systemets bästa skattning av hur ofta hästen verkligen vinner. Den är en jämn blandning (50/50) av två oberoende marknadssignaler:

- **Streckningen** – spelarnas kollektiva insatsfördelning i poolen.
- **Oddsmarknaden** – vinnaroddsens implicita sannolikhet (1/odds, normaliserad över fältet).

Analys av historiska lopp visar att blandningen är bättre kalibrerad än någon av signalerna ensam — sanningen ligger mitt emellan poolen och oddsmarknaden. Innan poolen öppnat (ingen streckning) används enbart oddsen; saknas odds används enbart streckningen.

Eftersom **Värde = Chans − Streckning** lyfter tabellen fram hästar där den samlade marknaden (särskilt oddsen) tror mer på hästen än vad poolen streckar den för — alltså potentiellt undervärderade hästar.

#### Distansfaktor-symboler

| Symbol | Faktor | Innebär |
|--------|--------|---------|
| ↑↑ | ×1.35 | Vunnit på distansen med samma startmetod |
| ↑ | ×1.10–1.20 | Placerat med samma startmetod, eller vunnit med annan |
| → | ×0.95–1.05 | Placerat på distansen med annan startmetod |
| ↓ | ×0.85–0.90 | Sprungit på distansen utan placering |
| ↓↓ | ×0.60 | Aldrig sprungit på denna distans |

#### Tolka spelvärdet

- **Positiv** (chans > streckning) → hästen kan vara ett värdebet (fetstil = ≥5 pp).
- **Negativ** → hästen är hårt streckad relativt systemets bedömning.
- Rader med **VÄRDE**-märke (CS > 55 och positivt spelvärde) lyfts fram med grön markering.

> **Obs!** Streckningsdata saknas innan poolen öppnat — då bygger chansen enbart på oddsen tills du hämtar om spelet.

#### Skrällkandidater

Hästar som uppfyller alla tre villkor markeras med **SKRÄLL** (på hästkortet och i analystabellen) och listas överst i analyspanelen:

1. **Låg streckning** — under 15 % av spelpoolen.
2. **Understreckad mot oddsen** — vinnaroddsens implicita sannolikhet ligger minst 5 procentenheter över streckningen. Vinnaroddsmarknaden är skarpare än V85-poolen.
3. **Hög klass** — topp 3 i fältet på intjänade kronor per start.

Signalen bygger på historisk analys av appens egna data: lågstreckade hästar vinner ungefär dubbelt så ofta som streckningen antyder, och kombinationen låg streck + hög klass + understreckning mot oddsen har historiskt gett klart förhöjd vinstfrekvens. Ungefär vart fjärde lopp vinns av en häst utanför streck-topp-3 — skrällkandidaterna är tänkta som krydda i systemen, inte som spikar.

### 6.2 Spårfaktor och banjusteringar

**Spårfaktor** väger in hästens startspår. Inre spår (1–3) ger fördel i voltstart, yttre spår (8+) ger nackdel; vid autostart är effekten lägre. Om hästen har ≥5 historiska starter från samma eller angränsande spår (±1) används dessutom en dynamisk faktor baserad på hästens egna resultat från det läget.

För banor med **banspecifik konfiguration** (administreras på adminsidan) justeras spårfaktorn ytterligare:

- **Open stretch** (+0.12) — spår som gynnas av en extra innerfil på upploppet.
- **Kort lopp** (−0.08) — yttre spår (5+) missgynnas extra i sprinterlopp.

Justeringen syns som ↑/↓-märke på hästkortet och i analystabellens **Spår**-kolumn, och påverkar CS-beräkningen vid omgångshämtning.

---

### 6.3 Systembyggaren

Klicka på **Bygg system** på startsidan för att öppna systemläget. I systemläget markerar du hästar per avdelning och bygger ett spelkupong-system. Antal **rader** och **kostnad i kronor** (beroende på speltyp) visas löpande medan du bygger.

#### Skapa och spara system

1. Klicka på hästar du vill ha med – de markeras med en bock.
2. Dina val auto-sparas som ett **utkast** efter några sekunder; du kan namnge utkastet via namnfältet i sidopanelen (till höger på desktop, panel längst ner på mobil).
3. Klicka **Spara system →** när du är klar.
4. I dialogen ger du systemet ett namn och väljer om det ska tillhöra ett **sällskap** eller vara **privat**.
5. Klicka **Spara system** för att publicera det.

#### Ladda ett utkast

Om du har sparade utkast för den aktuella omgången visas de i sidopanelen under **Mina utkast**. Klicka på ett utkast för att ladda in dina tidigare val.

#### Se dina system

Klicka på **Se systemet →** direkt efter sparning, eller gå till **System** i menyn. Där visas dina sparade system, och när loppresultat hämtats rättas de automatiskt.

---

## 7. Sällskap och samarbete

Sällskap låter dig och dina spelvänner diskutera hästar, dela anteckningar och följa varandras synpunkter inför spelet.

### 7.1 Skapa ett sällskap

1. Gå till sällskapssidan via **Profil** i mobilnavigeringen, eller via **profilmenyn** uppe till höger på desktop.
2. Välj **Skapa nytt sällskap**.
3. Ange ett namn på sällskapet.
4. Klicka på **Skapa**.
5. Du blir automatiskt sällskapets **skapare** och ett unikt **inbjudningskod** genereras.
6. Dela inbjudningskoden eller inbjudningslänken med de du vill bjuda in.

### 7.2 Gå med i ett sällskap

1. Gå till sällskapssidan via **Profil** i mobilnavigeringen, eller via **profilmenyn** på desktop.
2. Välj **Gå med i sällskap**.
3. Ange den **inbjudningskod** du fått av sällskapets skapare (eller öppna inbjudningslänken direkt).
4. Klicka på **Gå med**.
5. Du är nu medlem och kan se och skriva i sällskapet.

### 7.3 Flikar i sällskapet

Inne i ett sällskap finns fyra flikar:

**Forum**
- Diskutera hästar och omgångar i ett chattliknande format.
- Välj vilken omgång forumet gäller via rullgardinsmenyn.
- Skriv inlägg och svara på andras inlägg.
- Du kan ta bort dina egna inlägg.

**Anteckningar**
- Visar alla hästanteckningar från sällskapets medlemmar, grupperade per omgång.
- Anteckningar skrivs direkt på hästkorten på huvudsidan (se avsnitt 8).

**Spel**
- Visar sällskapets sparade system och utkast för vald omgång.
- När resultat hämtats rättas systemen automatiskt — antal rätt visas som t.ex. **6/8** och vinnande hästar markeras gröna.
- Under **Insatser** registrerar du dina spel (speltyp, eventuell avdelning/häst och insats i kronor). När omgången är avgjord fyller du i utdelningen på dina egna insatser.
- **ROI per medlem** visar varje medlems totala insats, utdelning och avkastning över alla omgångar.

**Sällskap**
- Administrera sällskapets inställningar (se avsnitt 7.4).

### 7.4 Hantera sällskapet (skaparen)

Skaparen kan:

- **Ändra sällskapets namn** via namnformuläret.
- **Lägga till ATG-lag-URL** för att koppla sällskapet till ett ATG-lag.
- Se den aktiva **inbjudningskoden** och kopiera den eller länken.
- Se alla **medlemmar** med deras visningsnamn och när de gick med.

Alla medlemmar (inklusive skaparen) kan **lämna sällskapet** via knappen längst ner. Om skaparen lämnar kvarstår sällskapet för övriga.

---

## 8. Anteckningar på hästar

Anteckningar är kopplade till en specifik häst och visas för alla i de sällskap du tillhör.

### Skriva en anteckning

1. Öppna en avdelning och hitta hästen du vill kommentera.
2. Klicka på **▼ Anteckningar** längst ner på hästkortet.
3. Skriv din text i textfältet.
4. Välj en **etikett** (färgkod) för att kategorisera din notering:
   - 🔴 **Röd**
   - 🟠 **Orange**
   - 🟡 **Gul**
   - 🟢 **Grön**
   - 🔵 **Blå**
   - 🟣 **Lila**
5. Välj om anteckningen ska tillhöra ett **sällskap** eller vara **Personlig**.
6. Klicka på **Lägg till**.

### Svara på en anteckning

- Klicka på **Svara** under en befintlig anteckning för att skriva ett svar i tråden.
- Svar visas indragna under originalanteckningen och ärver sällskapstillhörigheten.

### Viktigt att veta

- Sällskapsanteckningar är synliga för **alla i det valda sällskapet**.
- Personliga anteckningar syns bara för dig.
- En anteckning på en häst visas oavsett vilket lopp hästen startar i.
- Du kan bara ta bort dina **egna** anteckningar.

---

## 9. Utvärdering

Navigera till **Utvärdering** i menyn (fliken heter **Analys** i mobilnavigeringen) för att se hur väl systemets toppval har presterat historiskt.

Sidan visar:

- **Topprankad (CS) vinner** – andel lopp där hästen med högst CS verkligen vann.
- **Vinnare i topp 3** – hur ofta vinnaren återfanns bland de tre högst rankade hästarna.
- **Per omgång** – detaljerad genomgång per sparad omgång: vinnare, toppval och träff per avdelning.

> Utvärderingen kräver att loppresultat har hämtats.

> **Tips:** Knappen **Hämta alla resultat** på utvärderingssidan hämtar resultat för alla omgångar som saknar dem i ett svep – praktiskt efter en speldag.

---

## 10. Ordlista

| Term | Förklaring |
|------|-----------|
| **V85** | Spelform på ATG där du ska pricka vinnaren i 8 lopp |
| **ATG** | AB Trav och Galopp – den svenska speloperatören för travsport |
| **Odds** | ATG:s vinnarodds på hästen |
| **Streckning / Streck%** | Hästens procentuella andel av V85-poolens insatser |
| **Composite Score (CS)** | Systemets samlade bedömning (0–100): streckning 55 %, distansrekord 20 %, odds 10 %, konsistens 10 %, form 5 % — kalibrerad mot historiska resultat |
| **Kalibrerad chans** | Systemets skattning av verklig vinstsannolikhet — 50 % streckning + 50 % oddsmarknad |
| **Spelvärde** | Kalibrerad chans minus streckprocent – positivt värde indikerar potentiellt värdebet |
| **Värdebet** | En häst vars verkliga chanser bedöms vara högre än vad marknaden prissätter |
| **Skrällkandidat** | Lågstreckad häst (<15 %) med hög klass (topp-3 på intjänat/start) som är understreckad mot vinnaroddsen |
| **Klass** | Intjänade kronor per start – ett mått på vilken nivå hästen tävlat på |
| **Distansfaktor** | Multiplikator (×0.6–×1.35) baserat på hästens historik på aktuell distans och startmetod |
| **Voltstart** | Loppet startas bakom ett rörligt startfordon, alla hästar startar på samma gång |
| **Autostart** | Hästar startar från startbanden med individuella startnummer |
| **Life records** | Hästens bästa tider per distanskategori och startmetod |
| **Sällskap** | En grupp spelare som delar anteckningar och diskuterar i ett gemensamt forum |
| **Inbjudningskod** | Unik kod för att gå med i ett sällskap |
| **Skapare** | Sällskapets grundare med rätt att ändra namn och ATG-lag-URL |
| **PWA** | Progressive Web App – appen kan installeras på din enhet som en vanlig app |

---

*Manual version 2.3 – V85 Analys*
