# Användarmanual – Travappen

## Innehållsförteckning

1. [Introduktion](#1-introduktion)
2. [Komma igång](#2-komma-igång)
   - [Registrering och inloggning](#21-registrering-och-inloggning)
3. [Hämta omgång](#3-hämta-omgång)
4. [Navigera bland omgångar](#4-navigera-bland-omgångar)
   - [Lista och tabell](#41-lista-och-tabell)
   - [Sortera och filtrera](#42-sortera-och-filtrera)
5. [Hästraden och detaljvyn](#5-hästraden-och-detaljvyn)
   - [Detaljvyn](#51-detaljvyn)
   - [Composite Score (CS)](#52-composite-score-cs)
6. [Tabellen](#6-tabellen)
   - [Kolumnerna](#61-kolumnerna)
   - [Grundchans](#62-grundchans)
   - [Spårfaktor och banjusteringar](#63-spårfaktor-och-banjusteringar)
   - [Systembyggaren](#64-systembyggaren)
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

**Travappen** är ett verktyg för dig som spelar V85 (och liknande ATG-spel). Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på form, odds, konsistens, tider och startspår, och låter dig dela anteckningar och diskutera med dina spelvänner i ett gemensamt sällskap.

Menyn har fyra delar: **Lopp** (omgången och hästarna), **System** (dina sparade system), **Utvärdering** (hur träffsäkra måtten har varit) och **Sällskap** (dina sällskap, din profil och utseendet). Manualen når du från **?** högst upp, och varje understruket ord i appen går att trycka på för en kort förklaring.

Appen följer telefonens ljusa eller mörka läge. Under **Sällskap → Utseende** kan du välja själv.

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

1. Tryck på omgångens namn högst upp (t.ex. **V85 · Solvalla**, eller **Välj omgång** om ingen är inladdad). Ett blad öppnas med datumväljare, tillgängliga spel och sparade omgångar. Har du ingen omgång inladdad öppnar startsidans knapp **Hämta en omgång** bladet åt dig.
2. Välj ett **datum** i datumväljaren.
3. Tillgängliga spel för det datumet laddas automatiskt och visas som knappar med **Hämta**.
4. Om inga spel finns för valt datum visas texten "Inga spel".
5. Klicka på knappen för det spel du vill hämta.
6. Om hämtningen lyckas läggs omgången till i listan och du navigeras dit automatiskt.

> **Obs!** Du kan välja datum upp till **14 dagar bakåt eller framåt** från dagens datum.

---

## 4. Navigera bland omgångar

Högst upp står omgången, till exempel **V85 · Solvalla** och datumet. Tryck på den för att byta omgång, hämta en ny från ATG eller hämta resultat.

Under den ligger avdelningarna **1–8**. Siffran under ett nummer är hur många hästar du har valt i avdelningen, och ett guldstreck betyder att resultatet är klart.

### 4.1 Lista och tabell

Varje avdelning kan visas som **Lista** (en rad per häst) eller **Tabell** (alla mått i kolumner). Appen kommer ihåg vad du valde.

### 4.2 Sortera och filtrera

- **Sortera** – Chans (standard), Streck, Odds, Grund, CS eller Startnummer.
- **Filter** – bara värde, bara skräll, bara signal, dölj långskott (odds över 50) och sök på häst, kusk eller tränare. Siffran på knappen visar hur många filter som är på.

Strukna hästar hamnar alltid sist, nedtonade, med märket **Struken**.

## 5. Hästraden och detaljvyn

Varje häst visas på en rad:

- **Startnumret** till vänster. Tryck på det för att lägga hästen i systemet. Efter loppet visar det placeringen (guld, silver, brons).
- **Namn, kusk och senaste 5** i mitten, och högst ett märke: **Skräll** eller **Signal +2**.
- **Chans** stort till höger, och under det **streck** och **odds**, som hos ATG. En grön siffra bredvid Chans, till exempel **+4,2**, betyder att hästen har spelvärde.

Alla understrukna ord går att trycka på för en förklaring.

### 5.1 Detaljvyn

Tryck på raden för att öppna hästen. Telefonens bakåtknapp stänger den. Detaljvyn visar i ordning:

1. **Bedömning** – Chans, Streck, Värde, Odds, Grund (med varför), CS och Spår, med en rad förklaring var.
2. **Signaler** – varje signal med poäng.
3. **Senaste starter** – hämtas automatiskt från ATG.
4. **Bästa tider** – per startmetod och distans, dagens lopp markerat.
5. **Utrustning**, **Statistik**, **Kusk och tränare** och **Anteckningar**.

### 5.2 Composite Score (CS)

CS rankar fältet från 0 till 100: streck 55 %, distansrekord 20 %, odds 10 %, jämnhet 10 % och form 5 %. Du hittar CS i detaljvyn och i tabellen under **Visa alla kolumner**.

## 6. Tabellen

### 6.1 Kolumnerna

Tabellen visar **Häst, Chans, Streck, Odds, Värde, Grund** och **Märke** (på dator även **Senaste 5**). **Visa alla kolumner** lägger till **CS, Distans, Spår** och **Resultat**. Tryck på en rubrik för att se vad den betyder, på namnet för att öppna hästen och på numret för att lägga den i systemet.

Värde räknas som Chans minus streck. Grönt betyder att värdet är plus och att CS är över 55. Skräll och Signal förklaras i [Ordlistan](#10-ordlista).

### 6.2 Grundchans

**Grundchans** är en egen vinstchans som räknas fram **helt utan odds och streck** — alltså utan att titta på vad andra spelare tror. Den bygger bara på hästens egna förutsättningar:

- **Meriter:** pengar per start, vinst- och platsprocent (karriär och i år), rekordtid på distansen
- **Form:** placeringar och km-tider de senaste starterna (justerade för bana och underlag), formtrend, galopprisk, vila sedan senaste start
- **Dagens lopp:** spår och startled, tillägg, klassbyte (om hästen möter lättare eller svårare motstånd än senast)
- **Utrustning och folk:** barfota/skobyte, sulky, kuskens och tränarens form i år, kuskbyte
- **Ålder och kön**

Vikterna är kalibrerade mot ett års avgjorda travlopp (cirka 3 700). Grundchans för hela fältet summerar till 100 %.

**Var syns den?**
- **Tabellen:** kolumnen **Grund**.
- **Detaljvyn:** raden **Grund** i bedömningen, med en **Varför**-rad om de tre faktorer som påverkar mest (t.ex. "+ pengar/start · + barfota · − tillägg").
- **Sortera:** välj **Grund**.
- **Utvärderingssidan:** hur ofta Grundchans toppval vinner.

**Oense:** när Grundchans och strecket skiljer sig kraftigt (minst 1,5 gånger eller högst hälften, och minst 3 procentenheter) står det i detaljvyn under Grund: "Grund och streck är oense. Då har strecket oftast haft rätt." Det är **ingen spelsignal**: i tester på lopp modellen inte sett vann sådana hästar ungefär så ofta som *strecket* sa, inte som Grundchans sa. Exempel: hästar där Grundchans låg minst 10 procentenheter över strecket hade i snitt 14 % streck och 30 % Grundchans — och vann 13 %. Grundchans är totalt sett ungefär 70 % så träffsäker som marknaden.

Grundchans finns även **innan spelet öppnat**, när odds och streck saknas.

### 6.3 Spårfaktor och banjusteringar

**Spårfaktor** väger in hästens startspår. Inre spår (1–3) ger fördel i voltstart, yttre spår (8+) ger nackdel; vid autostart är effekten lägre. Om hästen har ≥5 historiska starter från samma eller angränsande spår (±1) används dessutom en dynamisk faktor baserad på hästens egna resultat från det läget.

För banor med **banspecifik konfiguration** (administreras på adminsidan) justeras spårfaktorn ytterligare:

- **Open stretch** (+0.12) — spår som gynnas av en extra innerfil på upploppet.
- **Kort lopp** (−0.08) — yttre spår (5+) missgynnas extra i sprinterlopp.

Justeringen beskrivs i detaljvyn under **Spår** och syns i tabellens **Spår**-kolumn (under **Visa alla kolumner**), och påverkar CS-beräkningen vid omgångshämtning.

---

### 6.4 Systembyggaren

Klicka på **Bygg system** på startsidan för att öppna systemläget. I systemläget markerar du hästar per avdelning och bygger ett spelkupong-system. Antal **rader** och **kostnad i kronor** (beroende på speltyp) visas löpande medan du bygger.

#### Skapa och spara system

1. Klicka på hästar du vill ha med – de markeras med en bock.
2. Dina val auto-sparas som ett **utkast** efter några sekunder; du kan namnge utkastet via namnfältet i sidopanelen (till höger på desktop, panel längst ner på mobil).
3. Klicka **Spara system →** när du är klar.
4. I dialogen ger du systemet ett namn och väljer om det ska tillhöra ett **sällskap** eller vara **privat**.
5. Klicka **Spara system** för att publicera det.

#### Ladda ett utkast

Om du har sparade utkast för den aktuella omgången visas de i sidopanelen under **Mina utkast**. Klicka på ett utkast för att ladda in dina tidigare val.

#### Avbryta systemläget

**Avbryt systemläge** tömmer dina markeringar. Har du redan markerat hästar frågar appen först om du är säker – välj **Fortsätt bygga** för att gå tillbaka till kupongen. Har utkastet hunnit sparas finns det kvar under **Mina utkast** även om du avbryter.

#### Se dina system

Klicka på **Se systemet →** direkt efter sparning, eller gå till **System** i menyn. Där visas dina sparade system, och när loppresultat hämtats rättas de automatiskt.

---

## 7. Sällskap och samarbete

Sällskap låter dig och dina spelvänner diskutera hästar, dela anteckningar och följa varandras synpunkter inför spelet.

**Profil-fliken** i mobilnavigeringen (eller **profilmenyn** uppe till höger på desktop) öppnar sällskapsöversikten. Där ser du dina sällskap (klicka på namnet för att öppna), skapar nya, går med via inbjudningskod, byter visningsnamn och loggar ut.

### Nytt sedan sist

När andra medlemmar skrivit foruminlägg, antecknat på hästar eller sparat system sedan du senast besökte sällskapet visas det som:

- En **siffer-badge** på Profil-fliken (mobil) och en prick på din avatar (desktop).
- Sektionen **"Nytt i dina sällskap"** högst upp på startsidan med de senaste händelserna — klicka för att gå direkt till sällskapet.
- Antal nya händelser bredvid sällskapets namn i listor och menyer.

Badgen nollställs för ett sällskap när du öppnar det. Endast andras aktivitet räknas — dina egna inlägg skapar inga notiser.

### Resultatbanner

När en omgång rättats där du eller någon i dina sällskap hade sparade system visas en banner högst upp på startsidan: **"🏆 Resultaten är rättade"** med varje systems antal rätt (bästa resultatet guldmarkeras). Klicka på ett system för att gå till sällskapets Spel-flik (eller Systemsidan för privata system). Bannern kan döljas med ✕ och visas i upp till en vecka efter speldagen.

### Notiser

På sällskapsöversikten (via **Profil**) kan du slå på **notiser**. Då får du en pushnotis till mobilen eller datorn när en omgång rättats och systemen fått sina poäng — så du inte missar resultatkvällen. Notiser kräver att du tillåter dem i webbläsaren. På iPhone måste appen först vara **installerad** på hemskärmen (PWA). Du kan stänga av notiserna när som helst samma väg.

### 7.1 Skapa ett sällskap

1. Gå till sällskapsöversikten via **Profil**-fliken (mobil) eller **profilmenyn → Hantera sällskap** (desktop).
2. Ange ett namn under **Skapa nytt sällskap**.
3. Klicka på **Skapa**.
4. Du blir automatiskt sällskapets **skapare** och en unik **inbjudningskod** genereras.
5. Dela inbjudningskoden eller inbjudningslänken med de du vill bjuda in.

### 7.2 Gå med i ett sällskap

1. Gå till sällskapsöversikten via **Profil**-fliken (mobil) eller **profilmenyn → Hantera sällskap** (desktop).
2. Ange den **inbjudningskod** du fått av sällskapets skapare under **Gå med via inbjudningskod** (eller öppna inbjudningslänken direkt).
3. Klicka på **Gå med**.
4. Du är nu medlem och kan se och skriva i sällskapet.

### 7.3 Flikar i sällskapet

Inne i ett sällskap finns fyra flikar:

**Forum**
- Diskutera hästar och omgångar i ett chattliknande format.
- Välj vilken omgång forumet gäller via rullgardinsmenyn.
- Skriv inlägg och svara på andras inlägg.
- Du kan ta bort dina egna inlägg.

**Anteckningar**
- Visar alla hästanteckningar från sällskapets medlemmar, grupperade per omgång.
- Anteckningar skrivs i hästens detaljvy på startsidan (se avsnitt 8).

**Spel**
- Visar sällskapets sparade system och utkast för vald omgång.
- När resultat hämtats rättas systemen automatiskt — antal rätt visas som t.ex. **6/8** och vinnande hästar markeras gröna.
- **Sällskapsligan** — topplista över medlemmarnas systemträffar i alla rättade omgångar: antal omgångar, totala rätt, snitt och bästa omgång. Har du flera system i samma omgång räknas det bästa. 👑 markerar vem som vann den senast rättade omgången.
- Under **Insatser** registrerar du dina spel. Enklast: klicka **Jag spelade detta** på ett systemkort — insatsen (rader × radpris) fylls i automatiskt och kopplas till systemet, så att insatsraden visar systemets träff (t.ex. 6/8). Du kan även lägga till spel manuellt (speltyp, eventuell avdelning/häst och insats i kronor). När omgången är avgjord fyller du i utdelningen på dina egna insatser. Du kan ta bort dina egna insatser med **×** – appen frågar först om du är säker, eftersom insatsen då försvinner ur ROI-beräkningen.
- **ROI per medlem** visar varje medlems totala insats, utdelning och avkastning över alla omgångar.

**Sällskap**
- Administrera sällskapets inställningar (se avsnitt 7.4).

### 7.4 Hantera sällskapet (skaparen)

Skaparen kan:

- **Ändra sällskapets namn** via namnformuläret.
- **Lägga till ATG-lag-URL** för att koppla sällskapet till ett ATG-lag.
- Se den aktiva **inbjudningskoden** och kopiera den eller länken.
- Se alla **medlemmar** med deras visningsnamn och när de gick med.

Alla medlemmar (inklusive skaparen) kan **lämna sällskapet** via knappen längst ner. Appen frågar först om du är säker – lämnar du sällskapet förlorar du åtkomst till dess forum, anteckningar och system, och behöver en ny inbjudningskod för att komma tillbaka. Om skaparen lämnar kvarstår sällskapet för övriga.

---

## 8. Anteckningar på hästar

Anteckningar är kopplade till en specifik häst och visas för alla i de sällskap du tillhör.

### Skriva en anteckning

1. Öppna en avdelning och hitta hästen du vill kommentera.
2. Tryck på hästens rad för att öppna detaljvyn och gå ner till **Anteckningar**.
3. Skriv din text i textfältet.
4. Välj en **etikett** (färgkod) för att kategorisera din notering. Färgerna har en gemensam betydelse så att alla i sällskapet läser dem likadant:
   - 🟢 **Grön = Spik** — hästen ska med, gärna ensam.
   - 🟡 **Gul = Skrällbud** — lågt streckad häst du tror på.
   - 🔴 **Röd = Undvik** — stryk hästen trots streckningen.
   - 🟠 **Orange = Risk/galopp** — osäker häst, galopprisk eller tveksam form.
   - 🔵 **Blå = Info** — neutral fakta (skoändring, kuskbyte, etc.).
   - 🟣 **Lila = Bevaka** — intressant till kommande starter.
5. Välj om anteckningen ska tillhöra ett **sällskap** eller vara **Personlig**.
6. Klicka på **Lägg till**.

### Svara på en anteckning

- Klicka på **Svara** under en befintlig anteckning för att skriva ett svar i tråden.
- Svar visas indragna under originalanteckningen och ärver sällskapstillhörigheten.

### Viktigt att veta

- Sällskapsanteckningar är synliga för **alla i det valda sällskapet**.
- Personliga anteckningar syns bara för dig.
- En anteckning på en häst visas oavsett vilket lopp hästen startar i.
- Du kan bara ta bort dina **egna** anteckningar. Appen frågar först om du är säker, eftersom borttagningen inte går att ångra – en anteckning som tas bort tar även med sig svaren på den.

---

## 9. Utvärdering

Navigera till **Utvärdering** i menyn för att se hur väl systemets toppval har presterat historiskt.

Sidan visar:

- **Topprankad (CS) vinner** – andel lopp där hästen med högst CS verkligen vann.
- **Vinnare bland topp 3 (CS)** – hur ofta vinnaren återfanns bland de tre hästarna med högst CS.
- **Grundchans toppval vinner** och **Vinnare bland topp 3 (Grundchans)** – samma mått för Grundchans (räknas på avdelningar där Grundchans finns; strukna hästar räknas inte).
- **Per omgång** – detaljerad genomgång per sparad omgång: vinnare, toppval och träff per avdelning.

Alla startande räknas, även hästar som galopperat eller diskvalificerats — en favorit som galopperar räknas alltså som en miss.

> Utvärderingen kräver att loppresultat har hämtats. Resultaten hämtas **automatiskt varje kväll** (runt midnatt) för sparade omgångar från den senaste veckan – systemen rättas och notiser skickas utan att någon behöver trycka på något.

> **Tips:** Vill du se resultaten direkt efter sista loppet hämtar knappen **Hämta alla resultat** på utvärderingssidan resultat för alla omgångar som saknar dem i ett svep.

---

## 10. Ordlista

Måtten i appen. Samma texter visas när du trycker på ett understruket ord i appen.

### Chans

Hästens vinstchans enligt spelmarknaden. Alla hästar i loppet blir tillsammans 100 %. Hälften streck och hälften vinnarodds, omräknat till procent. Testat mot 221 lopp med facit: träffar bättre än streck eller odds var för sig.

### Streck

Hur stor del av V85-spelarnas insatser i avdelningen som ligger på hästen. 30 % betyder att nästan var tredje krona är på den.

### Odds

Vinnarodds från ATG:s vinnarspel. Odds 4,2 betyder att 1 kr blir 4,20 kr om hästen vinner. Lägre odds betyder större favorit.

### Värde

Chans minus streck, i procentenheter. Plus betyder att hästen vinner oftare än strecket säger, så en rätt rad delar potten med färre. Grön markering när värdet är plus och CS är över 55. Minus är inget fel, bara en häst som många andra också har spelat.

### Grund

Vinstchans räknad bara på hästens egna meriter: km-tider, form, spår, distans, skor, kusk och tränare. Odds och streck används inte. Statistisk modell tränad på ett år av svenska V-lopp, 33 faktorer. En andra åsikt, ingen spelsignal. När Grund och streck är oense har strecket oftast haft rätt.

### CS

Rankning av fältet från 0 till 100: streck 55 %, distansrekord 20 %, odds 10 %, jämnhet 10 % och form 5 %.

### Skräll

Lågt streckad häst där vinnaroddsen tror mer på hästen än V85-spelarna gör, och som har hög klass: streck under 15 %, oddschansen minst 5 procentenheter över strecket och topp 3 i loppet på pengar per start. På ett års lopp har skrällkandidaterna vunnit 16 % av gångerna, mot 9 % som strecket sa.

### Signal

Tecken som inte syns i odds och streck: barfota-byte, toppkusk och stigande form ger plus. Skor på, sjunkande form och uppehåll över 60 dagar ger minus. Märket visas när summan är +2 eller mer.

### Oense

Grund och streck skiljer sig kraftigt åt för hästen. Historiskt har strecket oftast haft rätt i de fallen. Se det som en anledning att titta närmare, inte som ett tips.

### Senaste 5

Placeringarna i hästens fem senaste starter, nyast till vänster. 0 = oplacerad, g = galopp, d = diskvalificerad. Guld, silver och brons är 1:a, 2:a och 3:e plats.

### Spår

Hästens startspår. På vissa banor ger vissa spår en fördel eller nackdel, och det räknas in i bedömningen.

### Övriga ord

| Ord | Förklaring |
|-----|-----------|
| **V85** | Spelform på ATG där du ska pricka vinnaren i 8 lopp |
| **ATG** | AB Trav och Galopp – den svenska speloperatören för travsport |
| **Spik** | En avdelning där du bara har med en häst |
| **Autostart** | Hästarna startar bakom startbilen, som kör ifrån dem vid startlinjen |
| **Voltstart** | Hästarna startar från startbanden, och hästar med tillägg startar längre bak |
| **Barfota** | Hästen tävlar utan skor — att skorna dras inför loppet är en klassisk formsignal |
| **Klass** | Intjänade kronor per start – ett mått på vilken nivå hästen tävlat på |
| **Sällskap** | En grupp spelare som delar anteckningar, system och diskuterar i ett gemensamt forum |
| **Inbjudningskod** | Unik kod för att gå med i ett sällskap |
| **PWA** | Appen kan installeras på din telefon som en vanlig app |

---

*Manual version 4.0 – Travappen*
