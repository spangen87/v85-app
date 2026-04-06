# Användarmanual – V85 Analys

## Innehållsförteckning

1. [Introduktion](#1-introduktion)
2. [Komma igång](#2-komma-igång)
   - [Registrering och inloggning](#21-registrering-och-inloggning)
3. [Hämta omgång](#3-hämta-omgång)
4. [Navigera bland omgångar](#4-navigera-bland-omgångar)
   - [Top 5 spelvärda hästar](#41-top-5-spelvärda-hästar)
   - [Sortering, filtrering och sökning](#42-sortering-filtrering-och-sökning)
5. [Hästarnas informationskort](#5-hästarnas-informationskort)
   - [Expanderad detaljvy](#51-expanderad-detaljvy)
   - [Formscore (FS) och Composite Score (CS)](#52-formscore-fs-och-composite-score-cs)
6. [Analysverktyget](#6-analysverktyget)
   - [Matematisk analys – beräknad vinstchans](#61-matematisk-analys--beräknad-vinstchans)
   - [Utökad analys – sammansatt poäng](#62-utökad-analys--sammansatt-poäng)
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

### 4.1 Top 5 spelvärda hästar

Högst upp visas en widget med de **5 hästar** som har högst sammansatt poäng (CS) i hela omgången. Varje häst visas med avdelning, startnummer, odds och eventuell slutplacering.

- Klicka på **▼ / ▲**-knappen för att minimera/expandera widgeten.
- Klicka på en häst i listan för att hoppa direkt till hästkortet i rätt avdelning.

### 4.2 Sortering, filtrering och sökning

Ovanför härtlistan finns tre rader med kontroller:

**Sortering** – välj hur hästar inom varje avdelning sorteras:

| Knapp | Beskrivning |
|-------|-------------|
| **Nr** | Startnummer (standard ATG-ordning) |
| **CS – sammansatt poäng** | Kombinerar form, vinstprocent, odds, tid, konsistens, distans och spårfaktor (standardval) |
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

---

## 5. Hästarnas informationskort

När en avdelning är expanderad visas ett kort per häst. Varje kort innehåller:

| Fält | Förklaring |
|------|-----------|
| **Sorteringsrank (#)** | Hästens placering i aktuell sortering (visas ej vid sortering på Nr) |
| **Slutplacering** | Visas om loppresultat hämtats (guldgul = 1:a, silver = 2:a, brons = 3:a) |
| **Nr** | Startnummer |
| **Namn** | Hästens namn |
| **Kusk** | Kuskens namn |
| **Streck%** | Hästens andel av V85-poolen (om tillgängligt) |
| **Odds** | Aktuellt vinnarodds |
| **Värdeindex (VI)** | Skillnad i % mellan beräknad chans och odds-implicit sannolikhet (grönt = undervärderad) |
| **FS** | Formscore 0–100 (klickbar förklaring) |
| **CS** | Composite Score 0–100 (klickbar förklaring) |
| **Ålder / Kön / Färg** | Grundfakta om hästen |
| **Far** | Härstamning (fadershäst) |
| **Hemmaplan** | Hästens hemmaträningsbana |
| **Skosättning** | Sko fram/bak med ändringsstatus (amber = ändrad inför loppet) |
| **Sulky** | Typ av vagn som används |
| **Livs** | Karriärstatistik: vinster-platser (2:a)-platser (3:a) / antal starter |
| **År** | Vinstprocent innevarande år / antal starter |
| **Rekord** | Bästa tid och plats-% totalt |
| **Senaste starter** | Placeringar visas som färgade rutor: guldgul = 1:a, silver = 2:a, orange = 3:a, grå = övriga |

### 5.1 Expanderad detaljvy

Klicka på **▼ Visa detaljer** på ett hästkort för att se mer information:

- **Bästa tider** – tabell med hästens rekord per distans (kort/medel/lång) och startmetod (auto/volt). Aktuellt lopps kombination markeras.
- **Statistik** – detaljerad karriärstatistik: livs, innevarande år, föregående år, plats%, kr/start, total intjänat.
- **Odds** – vinnarodds och platsodds.
- **Kusk & Tränare** – namn med årets vinstprocent.
- **Senaste starter** – klicka **Hämta från ATG** för att ladda en detaljerad starttabell med datum, bana, placering och tid.

### 5.2 Formscore (FS) och Composite Score (CS)

**FS – Formscore (0–100):** viktat index baserat på senaste form (40%), vinstprocent år (20%), odds (20%) och bästa tid (20%). Innevarande år prioriteras; föregående år kompletterar vid få starter.

**CS – Composite Score (0–100):** bredare helhetsbedömning som kombinerar form (30%), vinstprocent (20%), odds (15%), tid (15%), konsistens (10%), distans (5%) och spårfaktor (5%). Se sektion 6.2 för detaljer.

Färgkoder för båda poäng:
- **Grön** (≥70) – stark häst
- **Gul** (40–69) – medel
- **Grå** (<40) – svag

---

## 6. Analysverktyget

Klicka på knappen **Visa analys** inuti en avdelning för att öppna analyspanelen. Panelen innehåller två delar.

### 6.1 Matematisk analys – beräknad vinstchans

En tabell med samtliga hästar och följande kolumner:

| Kolumn | Förklaring |
|--------|-----------|
| **Nr** | Startnummer |
| **Häst** | Hästens namn |
| **Beräknad** | Systemets estimerade sannolikhet att hästen vinner |
| **Streckning** | Hästens faktiska andel i V85-poolen (marknadens röst) |
| **Odds** | Aktuellt vinnarodds |
| **Distans** | Distanssignal baserat på hästens historik på aktuell distans och startmetod |
| **Spelvärde** | Beräknad chans minus streckning (positiv = potentiellt värde) |
| **Resultat** | Slutplacering om loppet är avslutat |

#### Hur beräknas vinstchansen?

Baspoäng viktas samman:

```
Baspoäng = 40% × karriärvinstprocent
         + 40% × senaste form-procent (innevar. + föreg. år)
         + 20% × odds-implicit sannolikhet
```

Baspoängen multipliceras sedan med en **distansfaktor** (×0.6–×1.35) baserat på hästens historik på aktuell distans och startmetod. Alla hästers råpoäng normaliseras slutligen till 100%.

#### Distansfaktor-symboler

| Symbol | Faktor | Innebär |
|--------|--------|---------|
| ↑↑ | ×1.35 | Vunnit på distansen med samma startmetod |
| ↑ | ×1.10 | Placerat (topp 3) med samma startmetod |
| → | ×0.90 | Sprungit utan placering, samma startmetod |
| ↓ | ×0.85–1.05 | Annan startmetod |
| ↓↓ | ×0.60 | Aldrig sprungit på denna distans |

#### Tolka spelvärdet

- **Positiv** (beräknad chans > streckning) → hästen kan vara ett värdebet (★ = ≥5 pp).
- **Negativ** → hästen är hårt streckad relativt systemets bedömning.

> **Obs!** Streckningsdata saknas innan V85-poolen öppnat. Hämta om spelet senare för att se spelvärden.

### 6.2 Utökad analys – sammansatt poäng

En andra tabell med mer detaljerade komponenter:

| Kolumn | Förklaring |
|--------|-----------|
| **Rank** | Plats i loppet enligt sammansatt poäng (🥇 = #1) |
| **Häst** | Namn, med "Värde"-märke om CS>55 och positivt värdeindex |
| **Form** | Formscore 0–100 |
| **Konsistens** | Andel topp-3 placeringar av totala starter (progressionsbar) |
| **Tid** | Tidsjustering i sekunder relativt fältets median (negativt = snabbare) |
| **Värde** | Värdeindex: beräknad chans minus odds-implicit sannolikhet |
| **Poäng** | Sammansatt poäng (CS) |
| **Resultat** | Slutplacering om loppet är avslutat |

#### Formel för sammansatt poäng (CS)

```
CS = 30% × form
   + 20% × vinstprocent
   + 15% × odds
   + 15% × tid
   + 10% × konsistens
   +  5% × distans
   +  5% × spårfaktor
```

**Spårfaktor** väger in hästens startspår. Inre spår (1–3) ger fördel i voltstart, yttre spår (8+) ger nackdel. Vid autostart är effekten lägre. Om hästen har ≥5 historiska starter med spårdata används en dynamisk faktor baserad på hästens egna resultat.

---

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

---

## 7. Sällskap och samarbete

Sällskap låter dig och dina spelvänner diskutera hästar, dela anteckningar och följa varandras synpunkter inför spelet.

### 7.1 Skapa ett sällskap

1. Klicka på **Sällskap** i menyn.
2. Välj **Skapa nytt sällskap**.
3. Ange ett namn på sällskapet.
4. Klicka på **Skapa**.
5. Du blir automatiskt sällskapets **skapare** och ett unikt **inbjudningskod** genereras.
6. Dela inbjudningskoden eller inbjudningslänken med de du vill bjuda in.

### 7.2 Gå med i ett sällskap

1. Klicka på **Sällskap** i menyn.
2. Välj **Gå med i sällskap**.
3. Ange den **inbjudningskod** du fått av sällskapets skapare (eller öppna inbjudningslänken direkt).
4. Klicka på **Gå med**.
5. Du är nu medlem och kan se och skriva i sällskapet.

### 7.3 Flikar i sällskapet

Inne i ett sällskap finns tre flikar:

**Forum**
- Diskutera hästar och omgångar i ett chattliknande format.
- Välj vilken omgång forumet gäller via rullgardinsmenyn.
- Skriv inlägg och svara på andras inlägg.
- Du kan ta bort dina egna inlägg.

**Anteckningar**
- Visar alla hästanteckningar från sällskapets medlemmar, grupperade per omgång.
- Anteckningar skrivs direkt på hästkorten på huvudsidan (se avsnitt 8).

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

Navigera till **Utvärdering** (i BottomNav på mobil, eller via menyn) för att se hur väl systemets toppval har presterat historiskt.

Sidan visar:

- **Övergripande träffsäkerhet** – andel omgångar och lopp där systemets toppval (högst CS) verkligen vann.
- **Topp-3-täckning** – hur ofta vinnaren återfanns bland de tre bäst rankade hästarna.
- **Per omgång** – detaljerad genomgång för varje sparad omgång med resultat per lopp.

> Utvärderingen kräver att loppresultat har hämtats. Hämta om en omgång efter att loppen körts för att uppdatera resultaten.

> **Tips:** Knappen **Hämta alla resultat** på startsidan hämtar resultat för alla omgångar som saknar dem i ett svep – praktiskt efter en speldag.

---

## 10. Ordlista

| Term | Förklaring |
|------|-----------|
| **V85** | Spelform på ATG där du ska pricka vinnaren i 8 lopp |
| **ATG** | AB Trav och Galopp – den svenska speloperatören för travsport |
| **Odds** | ATG:s vinnarodds på hästen |
| **Streckning / Streck%** | Hästens procentuella andel av V85-poolens insatser |
| **Formscore (FS)** | Systemets samlade formpoäng (0–100) baserat på senaste form, vinstprocent, odds och tid |
| **Composite Score (CS)** | Bredare helhetsbedömning (0–100) som väger in form, vinstprocent, odds, tid, konsistens, distans och spårfaktor |
| **Värdeindex (VI)** | Skillnad i procentenheter mellan systemets beräknade vinstchans och odds-implicit sannolikhet |
| **Spelvärde** | Beräknad chans minus streckprocent – positivt värde indikerar potentiellt värdebet |
| **Värdebet** | En häst vars verkliga chanser bedöms vara högre än vad marknaden prissätter |
| **Distansfaktor** | Multiplikator (×0.6–×1.35) baserat på hästens historik på aktuell distans och startmetod |
| **Voltstart** | Loppet startas bakom ett rörligt startfordon, alla hästar startar på samma gång |
| **Autostart** | Hästar startar från startbanden med individuella startnummer |
| **Life records** | Hästens bästa tider per distanskategori och startmetod |
| **Sällskap** | En grupp spelare som delar anteckningar och diskuterar i ett gemensamt forum |
| **Inbjudningskod** | Unik kod för att gå med i ett sällskap |
| **Skapare** | Sällskapets grundare med rätt att ändra namn och ATG-lag-URL |
| **PWA** | Progressive Web App – appen kan installeras på din enhet som en vanlig app |

---

*Manual version 2.1 – V85 Analys*
