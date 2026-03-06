# Användarmanual – V85 Analys

## Innehållsförteckning

1. [Introduktion](#1-introduktion)
2. [Komma igång](#2-komma-igång)
   - [Registrering och inloggning](#21-registrering-och-inloggning)
3. [Hämta V85-omgång](#3-hämta-v85-omgång)
4. [Navigera bland omgångar](#4-navigera-bland-omgångar)
5. [Hästarnas informationskort](#5-hästarnas-informationskort)
6. [Analysverktyget](#6-analysverktyget)
7. [Grupper och samarbete](#7-grupper-och-samarbete)
   - [Skapa en grupp](#71-skapa-en-grupp)
   - [Gå med i en grupp](#72-gå-med-i-en-grupp)
   - [Hantera din grupp (admin)](#73-hantera-din-grupp-admin)
8. [Anteckningar på hästar](#8-anteckningar-på-hästar)
9. [Ordlista](#9-ordlista)

---

## 1. Introduktion

**V85 Analys** är ett verktyg för dig som spelar V85 på ATG. Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på form, odds och statistik, och låter dig dela anteckningar med dina spelvänner i en gemensam grupp.

Appen är byggd för att ge dig ett bättre beslutsunderlag – den ersätter inte din egen bedömning, men hjälper dig hitta hästar vars oddsvärde kan vara bättre än marknadens.

---

## 2. Komma igång

### 2.1 Registrering och inloggning

1. Öppna appen i webbläsaren.
2. Du möts av inloggningssidan om du inte redan är inloggad.
3. **Ny användare?** Ange din e-postadress och ett lösenord och klicka på **Registrera**.
4. **Redan registrerad?** Ange dina uppgifter och klicka på **Logga in**.
5. Efter lyckad inloggning hamnar du på huvudsidan.

> **Tips:** Ditt visningsnamn kan ändras i profilinställningarna och syns för övriga medlemmar i dina grupper.

---

## 3. Hämta V85-omgång

Innan du kan analysera en omgång måste du hämta data från ATG.

1. Klicka på knappen **Hämta V85** högst upp på sidan.
2. En datumväljare visas. Du kan välja datum upp till **14 dagar bakåt eller framåt** från dagens datum.
3. Välj det datum då V85-omgången körs.
4. Klicka på **Hämta** för att ladda ner alla lopp och hästar.
5. Om hämtningen lyckas dyker omgången upp i listan omedelbart.

> **Obs!** Om ingen omgång finns för valt datum visas ett felmeddelande. Kontrollera att du valt rätt datum och att V85 körs den dagen.

---

## 4. Navigera bland omgångar

På huvudsidan ser du en lista med alla hämtade omgångar.

- Välj omgång via **rullgardinsmenyn** (GameSelector) längst upp.
- Omgångens **åtta lopp** visas under varandra.
- Klicka på ett lopp för att **expandera** det och se alla startande hästar.
- Klicka igen för att fälla ihop loppet.

---

## 5. Hästarnas informationskort

När ett lopp är expanderat visas ett kort per häst. Varje kort innehåller:

| Fält | Förklaring |
|------|-----------|
| **Namn** | Hästens namn |
| **Nr** | Startnummer |
| **Förare** | Kusk/ryttare |
| **Odds** | Aktuellt odds från ATG (uppdateras vid hämtning) |
| **Formscore** | Sammansatt poäng 0–100 baserat på form, odds och tider (se nedan) |
| **Ålder / Kön / Färg** | Grundfakta om hästen |
| **Ras / Hemmaplan** | Härstamning och hemmaträning |
| **Skosättning** | Ev. ändring av skor inför loppet |
| **Sulky** | Typ av vagn som används |
| **Karriärstatistik** | Totalt antal starter, vinster och bästa tid |
| **Vinst % per år** | Vinstprocent för innevarande och föregående år |
| **Senaste 5 lopp** | Placeringar visas med färgkoder: 🥇 guld = 1:a, 🥈 silver = 2:a, 🥉 brons = 3:a |

### Formscore – hur räknas det?

Formscoren är ett samlat mått (0–100) som väger ihop:

- **40 %** – Form från de senaste 5 loppen
- **20 %** – Vinstprocent innevarande år
- **20 %** – Oddsindex (hur hästen prissätts relativt fältet)
- **20 %** – Bästa tid relativt fältet

En häst med hög formscore är generellt i bra form och prissatt rimligt av marknaden.

---

## 6. Analysverktyget

Klicka på knappen **Visa analys** inuti ett lopp för att öppna analyspanelen.

Analysen visar en tabell med samtliga hästar och följande kolumner:

| Kolumn | Förklaring |
|--------|-----------|
| **Häst** | Hästens namn och startnummer |
| **Beräknad vinstchans** | Systemets estimerade sannolikhet att hästen vinner |
| **Odds-impliserad chans** | Marknadens implicita sannolikhet (100 / odds) |
| **Differens** | Skillnaden mellan beräknad och odds-impliserad chans |
| **Värde?** | Indikator om hästen verkar undervärderad av marknaden |

### Hur beräknas vinstchansen?

Systemet använder en viktad formel:

```
Vinstchans = 40% × karriärvinstprocent
           + 40% × senaste form-procent
           + 20% × odds-impliserad sannolikhet
```

Resultatet justeras sedan med en **distansfaktor** baserad på hästens historiska prestation på aktuell distans och startmetod (voltstart / autostart).

### Tolka resultatet

- **Positiv differens** (beräknad chans > marknadens chans) → hästen kan vara ett värdebet.
- **Negativ differens** → hästen verkar övervärderad av marknaden.
- Analysen är ett komplement till din egen bedömning – ta alltid hänsyn till faktorer som stallkänsla, tränarform och vädret.

---

## 7. Grupper och samarbete

Grupper låter dig och dina spelvänner dela anteckningar och analyser om enskilda hästar.

### 7.1 Skapa en grupp

1. Klicka på **Grupper** i navigeringen.
2. Välj **Skapa ny grupp**.
3. Ange ett namn på gruppen.
4. Klicka på **Skapa**.
5. Du blir automatiskt gruppens **admin** och ett unikt **inbjudningskod** genereras.
6. Dela inbjudningskoden med de du vill bjuda in.

### 7.2 Gå med i en grupp

1. Klicka på **Grupper** i navigeringen.
2. Välj **Gå med i grupp**.
3. Ange den **inbjudningskod** du fått av gruppens admin.
4. Klicka på **Gå med**.
5. Du är nu medlem och kan se och skriva anteckningar i gruppen.

### 7.3 Hantera din grupp (admin)

Som admin kan du:

- Se alla **medlemmar** i gruppen.
- **Ta bort medlemmar** om det behövs.
- Se den aktiva **inbjudningskoden** och dela den vidare.

---

## 8. Anteckningar på hästar

Anteckningar är kopplade till en specifik häst (inte ett lopp) och visas för alla i gruppen oavsett vilket lopp hästen startar i.

### Skriva en anteckning

1. Öppna ett lopp och hitta hästen du vill kommentera.
2. Klicka på **Lägg till anteckning** på hästkortet.
3. Välj en **etikett** (färgkod) för att kategorisera din notering, t.ex.:
   - 🟢 **Grön** – Favorit / stark chans
   - 🟡 **Gul** – Intressant / osäker
   - 🔴 **Röd** – Tveksam / stryk
   - ⚪ **Grå** – Neutral notering
4. Skriv din text och klicka på **Spara**.

### Svara på en anteckning

- Klicka på **Svara** under en befintlig anteckning för att skriva ett svar i tråden.
- Svar visas indragna under originalanteckningen.

### Viktigt att veta

- Anteckningar är synliga för **alla i din grupp**.
- En anteckning på en häst följer med om samma häst dyker upp i en annan omgång.
- Du kan bara redigera/ta bort dina **egna** anteckningar.

---

## 9. Ordlista

| Term | Förklaring |
|------|-----------|
| **V85** | Spelform på ATG där du ska pricka vinnaren i 8 lopp |
| **ATG** | AB Trav och Galopp – den svenska speloperatören för travsport |
| **Streckning / Odds** | ATG:s odds på hästen att vinna loppet |
| **Formscore** | Systemets samlade formpoäng (0–100) |
| **Värdebet** | En häst vars verkliga chanser bedöms vara högre än vad oddset indikerar |
| **Voltstart** | Loppet startas bakom en bil, alla hästar startar på samma gång |
| **Autostart** | Hästar startar från banden med individuella startnummer |
| **Distansfaktor** | Justering baserad på hur hästen historiskt presterat på aktuell distans |
| **Inbjudningskod** | Unik kod för att gå med i en grupp |
| **Admin** | Gruppens skapare med extra rättigheter att hantera medlemmar |

---

*Manual version 1.0 – V85 Analys*
