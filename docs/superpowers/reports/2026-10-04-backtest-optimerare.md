# Backtest av systemoptimeraren (issue #98)

**Datum:** 2026-10-04
**Data:** ATG-cachen `.cache/atg`, 684 avgjorda omgångar 2025-09-01 – 2026-09-30.
**Körning:** `npm run fit-calibrated` och `npm run backtest-optimizer` (V65 kostar nu 1 kr per rad i `getRowPrice`). Siffrorna i bilagan kommer direkt från skriptet och gäller versionen med kalibrerad täckning (se Uppdatering).

## Uppdatering: kalibrering av täckningen (natten till 2026-10-05)

**Viktigt om ärligheten:** felsökningen startade för att den första versionen överskattade P(alla rätt) på **valideringen**. Åtgärdens form valdes alltså efter att valideringen hade setts, och valideringen är därför inte längre en helt ren kontroll av den. Parametrarna (α, β) är däremot skattade enbart på träningsperioden. En ren prövning kräver nya omgångar, till exempel från oktober 2026 och framåt, eller `odds_snapshots`.

### Vad felsökningen visade

- **Favoriterna överskattas lite i båda perioderna.** Loppets största favorit: träning 42,7 % förutsagt mot 41,7 % faktiskt, validering 41,8 % mot 39,0 %. Topp 2 och topp 3 stämmer bättre.
- **En temperatur på hela chansen (p^τ) räcker inte.** Det τ som maximerar likelihood blir 1,00, både på träningen och vid månatlig omskattning med växande fönster (som i drift). τ = 0,95 rättar valideringen men underskattar träningen (P(alla rätt) 71 mot 56,5, z = +2,1), så den går inte att motivera med träningsdata. Temperaturen finns kvar som parameter (`temperature`, `--temperature`) men används inte.
- **Felet sitter i optimerarens urval och syns redan på träningen.** Avdelningar där optimeraren valt en smal täckning (spikar) överskattades i båda perioderna: under 50 % täckning förutsades 43,1 % mot 38,4 % faktiskt på träningen och 42,8 % mot 37,0 % på valideringen. Från 70 % täckning stämde allt. Optimeraren spikar där modellen är mest optimistisk, så felen samlas där (vinnarens förbannelse).

### Åtgärd

Den förutsagda täckningen per avdelning kalibreras med logit(c′) = α + β·logit(c). Den skattas med maximum likelihood på **träningsperiodens** egna system (pass 1, n = 3 509): α = −0,153, β = 1,091. Kalibreringen används **bara i de visade måtten**: P(alla rätt), P(alla utom en), chansen att spikarna håller, spikens avvägning och "Går in". Optimeraren väljer samma system som förut. Appens version är skattad på alla omgångar med appens vikter: α = −0,137, β = 1,127 (n = 7 377). Den är knuten till vikterna via `weights_version`, och ett test larmar om de inte hör ihop.

Varför inte i målet också? Jag prövade det (`--coverage-objective`). På träningen blev det sämre: 69 i stället för 72 träffar med alla rätt, och 0,67 i stället för 0,75 kr per krona för Max chans. På valideringen blev det ungefär lika (57 mot 56, 0,65 mot 0,64). Det finns alltså inget stöd för att låta kalibreringen styra valet.

### Före och efter (λ = 0; samma system i båda kolumnerna)

| | Utan kalibrering | Med kalibrering |
|---|---|---|
| Träning, alla rätt, faktiskt / förutsagt (z) | 72 / 66,5 (+0,74) | 72 / 57,7 (+2,03) |
| Validering, alla rätt (z) | 56 / 67,5 (−1,52) | 56 / 58,6 (−0,36) |
| Båda perioderna, alla rätt | 128 / 134,0 | 128 / 116,3 |
| Validering, alla utom en (z) | 165 / 174,0 (−0,83) | 165 / 163,6 (+0,13) |
| Båda perioderna, alla spikar höll | 310 / 343,4 | 310 / 312,1 |
| Spikar med rå chans 35–45 %, träning: vann / förutsagt | 35,3 % / 40,1 % | 35,3 % / 35,6 % |
| Spikar med rå chans 35–45 %, validering | 34,3 % / 40,1 % | 34,3 % / 35,6 % |
| Spikar med rå chans 45–55 %, validering | 43,7 % / 49,4 % | 43,7 % / 45,5 % |

Spikfacken bygger på hästens **råa** kalibrerade chans, så samma hästar jämförs före och efter. Med kalibreringen ligger alla spikfack inom |z| < 1,3 i båda perioderna. Chansen att alla spikar håller, som issuen lyfter fram som systemets största risk, stämmer nu (310 mot 312) i stället för att vara 11 % för hög.

För P(alla rätt) är bilden blandad. Utan kalibrering var förutsägelsen 5 % för hög sammantaget, med kalibrering 9 % för låg (träningen z = +2,0, valideringen z = −0,4). Ingen av avvikelserna är säker, men den kalibrerade versionen felar åt det försiktiga hållet. Den troliga orsaken är att avdelningarna i samma omgång samvarierar ("favoritdagar" och "skrälldagar"), vilket produktformeln antar bort. Det står kvar som en känd begränsning. Kalibreringen är skattad på optimerarens egna system. För system som användaren bygger själv är den en extrapolering, så urvalseffekten kan vara en annan.

### Valfritt antal spikar

Om optimeraren själv får välja 0–4 spikar (sexloppsspel 0–3) blir det i snitt 1,5 spikar. **Parad** jämförelse på samma omgångar med 7–8 avdelningar, där valfritt jämförs med exakt antal (avkastning per krona, 90 %-intervall):

| | Mot exakt 2 | Mot exakt 3 |
|---|---|---|
| Träning | +0,07 [−0,16; 0,28] | +0,06 [−0,09; 0,20] |
| Validering | −0,13 [−0,24; −0,02] | −0,63 [−1,72; 0,15] |

Valfritt antal är alltså **inte bevisat bättre**. Det är ungefär likvärdigt med exakt 2 spikar: något bättre på träningen, något sämre på valideringen. Det är ändå standard i appen, eftersom det inte tvingar fram spikar i lopp utan tydlig favorit. Ett exakt antal går att välja.

### Acceptanskriterierna efter uppdateringen

- **1a:** lika, oförändrat.
- **1b:** inte uppfyllt, oförändrat. Balans och Värde ligger därför bakom "Visa fler förslag".
- **2:** uppfyllt för P(alla utom en) och för spikarna i båda perioderna. P(alla rätt) ligger inom felmarginalen på valideringen och är något försiktig på träningen (z = +2,0).
- **3 och 4:** uppfyllda i appen.

Max chans slår fortfarande fördelning efter streck (Ref B): +0,20 kr per krona på valideringen (90 %-intervall 0,04–0,39).

## Sammanfattning (första versionen)

- **Kalibrerad chans** (`lib/calibrated.ts`) är något bättre än både streck, odds och dagens 50/50-blandning på testperioden: pseudo-R² 0,283 mot 0,274 (streck), 0,280 (odds) och 0,281 (50/50). Vikterna blev a = 0,18, b = 0,85 och c = 0,09, nära de 0,17/0,81/0,07 som issuen angav. Oddsen dominerar.
- **Träff:** optimeraren (Max chans) träffar lika ofta som referenssystemet med samma struktur och hästar valda efter streck. Skillnaden i förutsagd träff är bara 2–3 %, och så små skillnader går inte att se på ett års omgångar.
- **Värdevikt:** den värdevägda varianten (λ = 0,3, vald på träningsperioden) gav **inte** högre avkastning per krona än Max chans eller referenssystemet på valideringsperioden. Utfallet varierar mellan spelen: sämre på V85, bättre på V86, och lika sammantaget.
- **Kalibrering:** förutsagd P(alla rätt) och P(alla utom en) stämmer på träningsperioden. På valideringsperioden förutsades 67,5 träffar med alla rätt men det blev 56, cirka 20 % för högt. Chansen att alla spikar håller var cirka 25 % för hög. Orsaken är att spikarnas chans överskattas med 5–6 procentenheter.
- **Märkena** Understreckad och Överstreckad säger det de ska om V-spelsvärde: understreckade hästar vann 1,5–1,8 gånger sitt streck och överstreckade 0,6–0,7 gånger. De är däremot inga vinnarspelstips.
- **Radpris:** V85, V86 och V75 stämmer med `getRowPrice`. **V65 är troligen 1 kr per rad, inte 0,50 kr** som i `getRowPrice`. V64 och GS75 stämmer med 1 kr. *(Uppdatering: `getRowPrice('V65')` är ändrat till 1,00 kr.)*

Den tydligaste positiva effekten är att optimeraren fördelar hästarna efter kalibrerad chans i stället för efter streck. Mot Ref B (samma optimerare med streck som chans) gav Max chans +0,19 kr per satsad krona på valideringen (90 %-intervall 0,04–0,38) för alla spel, och +0,42 (0,11–0,87) för V85+V86. På träningsperioden var bilden blandad: bättre för alla spel (0,75 mot 0,63), sämre för V85+V86 (0,47 mot 0,56).

## Metod

### Kronologi och läckage
- Grundchans tränas **framåtrullande**. Modellen tränas om vid 30, 40, …, 90 % av loppdatumen och används bara på senare lopp, så att Grundchans aldrig har sett facit. Lopp före 2025-12-29 används bara för att träna Grundchans.
- **Träningsperiod** 2025-12-29 – 2026-05-12. Här skattas vikterna a, b och c, och här väljs värdevikten.
- **Valideringsperiod** 2026-05-12 – 2026-09-30. Här utvärderas allt.
- Tröskelvärdena justerades inte: spikkravet 35 %, märkenas trösklar och λ ∈ {0; 0,3; 0,6} kommer från issuen. Den värdevägda varianten valdes på träningsperioden (λ = 0,3 hade högst avkastning bland λ > 0) och utvärderades sedan på valideringen.

### System
- Budget: 385 kr för V85, V86, V75 och GS75, och 200 kr för V64 och V65. Antal spikar: 2, 3 eller 4 för spel med 7–8 avdelningar och 1, 2 eller 3 för sexloppsspel. Spikantalet är exakt.
- **Optimeraren** (`lib/optimizer.ts`) körs med λ = 0 (Max chans), 0,3 (Balans) och 0,6 (Värde).
- **Ref A** har samma struktur som optimerarens system, alltså samma antal hästar per avdelning, men hästarna väljs efter streck. Det är referenssystemet som issuen beskriver.
- **Ref B** är optimeraren med normaliserat streck som chans (λ = 0). Det motsvarar att bygga systemet helt efter strecket.
- Omgångar med galopp- eller montélopp (`sport` ≠ trot) uteslöts, eftersom Grundchans bara gäller trav. V75 har inga omgångar efter 2025-12-29 i cachen och saknas därför.

### Utdelning
- `pools.<typ>.result.payouts[k].payout` är utdelningen i öre **per vinnande rad**. Kontroll: antal vinnande rader × utdelning ≈ potten för nivån (median 0,995–0,999 för alla spel).
- Antalet rader med k rätt räknas med en genererande funktion per avdelning: Π (träffar·x + missar). Det multipliceras med utdelningen för k rätt. Nivåer som inte betalades ut (`jackpot` eller `movedDividend`) ger 0. Hade systemet varit ensamt om en nivå som ingen annan träffade, skulle hela potten räknas. Det inträffade aldrig.
- Avkastning per satsad krona = utdelning / (rader × radpris).
- Förenklingar: våra egna rader späder inte ut utdelningen, boost ignoreras, och allt bygger på **slutodds och slutstreck**.

### Radpris
| Spel | getRowPrice | Implicit, alla rätt | Implicit, alla−1 | Slutsats |
|---|---|---|---|---|
| V85 | 0,50 kr | 0,51 kr | 0,50 kr | stämmer |
| V86 | 0,25 kr | 0,25 kr | 0,25 kr | stämmer |
| V75 | 0,50 kr | 0,53 kr | 0,52 kr | stämmer |
| GS75 | 1,00 kr | 0,87 kr | 1,14 kr | stämmer (skattningarna omger 1 kr) |
| V64 | 1,00 kr | 0,69 kr | 1,43 kr | stämmer (geometriskt medel 0,99 kr) |
| V65 | **0,50 kr** | 0,82 kr | 1,26 kr | **troligen 1 kr** (geometriskt medel 1,02 kr) |

Implicit radpris = omsättning / skattat antal spelade rader. Antalet rader skattas som vinnande rader / andelen rader med vinnarna, där andelen räknas fram ur slutstrecket. Skattningen förutsätter att raderna fördelas som strecket, så den är grov. För sexloppsspelen hamnar de två nivåerna på var sin sida om 1 kr. Med 0,50 kr för V65 blev avkastningen 1,6–3,2 kr per krona även för referenssystemen. Det är orimligt och stöder att V65 kostar 1 kr per rad. Backtesten körs därför med `--row-price V65=1`. **`getRowPrice('V65')` bör kontrolleras mot ATG och troligen ändras till 1,00.** Det påverkar kostnaden som visas i systembyggaren för V65. Ändringen ingår inte här.

## Kalibrerad chans (`npm run fit-calibrated`)

Vikterna skattades på 1 340 lopp under träningsperioden och testades på 1 450 lopp under testperioden (samma perioder som ovan).

| Modell | Log-loss (test) | Pseudo-R² (test) |
|---|---|---|
| Likformig | 2,3347 | 0 |
| Streck | 1,6959 | 0,2736 |
| Vinnarodds | 1,6815 | 0,2798 |
| 50/50 streck + odds (Chans i appen i dag) | 1,6786 | 0,2810 |
| Grundchans (framåtrullande) | 1,8812 | 0,1943 |
| **Kalibrerad, full** (streck + odds + grund) | **1,6743** | **0,2829** |
| Kalibrerad, noOdds (streck + grund) | 1,6897 | 0,2763 |
| Kalibrerad, grundOnly | 1,8826 | 0,1936 |
| Kalibrerad, noGrund (streck + odds) | 1,6752 | 0,2825 |

- Vikterna i modellfilen skattades på tränings- och testperioden tillsammans: full a = 0,179, b = 0,846, c = 0,087; noOdds a = 0,842, c = 0,127; grundOnly c = 1,008. På bara träningsperioden blev full a = 0,117, b = 0,925, c = 0,093.
- Per spel (pseudo-R² på testperioden, full mot 50/50): V85 0,265 mot 0,261, V86 0,254 mot 0,253, V64 0,285 mot 0,283, V65 0,319 mot 0,316 och GS75 0,208 mot 0,211.
- Kalibreringen är bra upp till 40 %. Över 40 % överskattar modellen: förutsagt 48,0 % gav 44,3 % faktiskt utfall, och förutsagt 67,7 % gav 64,2 %. Det påverkar spikarna, se nedan.
- Före vinnarpoolen (noOdds) är träffsäkerheten bara något bättre än rent streck. Notera att slutstreck användes. Tidigt på dagen är strecket sämre, och det går inte att mäta förrän `odds_snapshots` samlats in.

## Acceptanskriterier

### 1a. Optimerarens system når minst samma träff som referenssystemet för 8 och 7 rätt — **osäkert (i praktiken lika)**

Valideringsperioden, Max chans (λ = 0) mot Ref A, samma omgångar och samma kostnad:

| | Alla rätt, faktiskt (förutsagt) | Alla utom en, faktiskt (förutsagt) |
|---|---|---|
| V85+V86, optimeraren | 5 (7,0) | 23 (27,4) |
| V85+V86, Ref A | 5 (6,8) | 21 (26,9) |
| Alla spel, optimeraren | 56 (67,5) | 165 (174,0) |
| Alla spel, Ref A | 56 (65,9) | 166 (172,0) |

På träningsperioden: V85+V86 9 mot 10 och 24 mot 25, och alla spel 72 mot 73 och 167 mot 168.

Kriteriet uppfylls bokstavligen för V85+V86 i valideringen, men inte för alla spel sammantaget, där alla utom en blev 165 mot 166. Den förväntade fördelen är bara 2–3 % fler träffar. Det beror på att den kalibrerade chansen och strecket nästan alltid rangordnar hästarna lika, så samma struktur ger nästan samma hästar. Ett år med omgångar räcker inte för att avgöra en så liten skillnad åt något håll.

### 1b. Den värdevägda varianten ger högre genomsnittlig utdelning per satsad krona i valideringsperioden — **inte uppfyllt**

λ = 0,3 valdes på träningsperioden. Där var avkastningen för alla spel 0,81 kr per krona, mot 0,75 för λ = 0 och 0,68 för λ = 0,6. Utfall på valideringen:

| Valideringsperiod | Max chans (λ = 0) | **Balans (λ = 0,3)** | Värde (λ = 0,6) | Ref A (λ = 0,3) | Ref B |
|---|---|---|---|---|---|
| V85+V86, avk./kr | 0,79 | **0,69** | 0,81 | 0,75 | 0,41 |
| Alla spel, avk./kr | 0,64 | **0,62** | 0,69 | 0,60 | 0,47 |

Parad bootstrap över omgångar på valideringen, med 90 %-intervall för skillnaden i avkastning per krona:

| | V85 | V86 | V85+V86 | Alla |
|---|---|---|---|---|
| λ = 0,3 − Ref A (λ = 0,3) | −0,25 [−0,53; −0,05] | +0,29 [0,08; 0,55] | −0,06 [−0,26; 0,10] | +0,02 [−0,06; 0,11] |
| λ = 0,3 − λ = 0 | −0,15 [−0,30; −0,02] | +0,01 [−1,39; 1,41] | −0,10 [−0,63; 0,41] | −0,02 [−0,25; 0,22] |
| λ = 0 − Ref B | +0,17 [0,03; 0,32] | +0,89 [0,09; 2,17] | +0,42 [0,11; 0,87] | +0,19 [0,04; 0,38] |

Den värdevägda varianten slår varken Max chans eller referenssystemet, och resultatet går åt olika håll för V85 och V86. λ = 0,6 hade högst avkastning på valideringen (0,69). Den valdes ändå inte, eftersom den var sämst på träningen. Att peka ut den i efterhand vore att välja på valideringsdata. Avkastningen styrs till stor del av enstaka stora utdelningar. Utan den enskilt största utdelningen sjunker V85+V86 från 0,79 till 0,56 för Max chans och från 0,69 till 0,46 för Balans. Värdeindexet gav alltså ingen mätbar fördel under det här året.

### 2. Förutsagd P(8 rätt) och P(7 rätt) är kalibrerade inom felmarginalen — **första versionen: inte uppfyllt på valideringen. Uppfyllt efter kalibreringen av täckningen (se Uppdatering).**

| Period, λ | Alla rätt, faktiskt / förutsagt (z) | Alla utom en, faktiskt / förutsagt (z) | Alla spikar höll, faktiskt / förutsagt |
|---|---|---|---|
| Träning, λ = 0 | 72 / 66,5 (+0,74) | 167 / 169,5 (−0,24) | 169 / 166,1 |
| Träning, λ = 0,3 | 65 / 63,7 (+0,18) | 165 / 167,1 (−0,20) | 157 / 160,9 |
| Validering, λ = 0 | 56 / 67,5 (−1,52) | 165 / 174,0 (−0,83) | **141 / 177,3** |
| Validering, λ = 0,3 | 58 / 64,6 (−0,90) | 147 / 171,7 (**−2,29**) | **145 / 174,3** |
| Validering, λ = 0,6 | 56 / 57,5 (−0,21) | 148 / 164,2 (−1,52) | 143 / 163,4 |

Raderna slår ihop alla spikantal, så samma omgång ingår flera gånger. z räknas som om systemen vore oberoende, vilket ger ungefärliga värden. Per spikantal ligger z för alla rätt mellan −1,9 och +1,5.

- På träningsperioden stämmer förutsägelserna väl.
- På valideringen är avvikelserna åt samma håll. För λ = 0 förutsades 67,5 träffar med alla rätt men det blev 56, cirka 20 % för högt. P(alla spikar håller) överskattas kraftigt: med 2 spikar höll båda i 41 av 199 fall, mot förutsagt 63.
- Orsaken syns per spik. Hästar med förutsagt 35–45 % vann 34,3 % (z −2,0), med 45–55 % vann 43,7 % och med 55–70 % vann 56,7 %. Optimeraren väljer spikarna där den kalibrerade chansen är högst, så skattningsfel i favoriternas chans förstärks (vinnarens förbannelse). Täckningen i avdelningar med flera hästar är väl kalibrerad: vid 60–100 % täckning avviker utfallet högst 3 procentenheter, och |z| är under 1,4.

Slutsatsen är att P(alla rätt) inte kan visas som kalibrerad. Den bör presenteras som en grov skattning tills spikarnas chans krymps mot strecket eller spikkravet höjs. En sådan ändring måste prövas på ny data, eftersom den annars skulle väljas på valideringen.

### 3. Knappen "Föreslå system" fyller i ett system som håller budget och spikantal och går att redigera — **uppfyllt (#103, för administratörer)**

`optimizeSystem` och `proposeSystems` håller budget och spikantal. Det visas av enhetstesterna i `lib/__tests__/optimizer.test.ts` och av backtesten, där alla 7 776 byggda system höll budgeten (optimerare och referenser; skriptet kontrollerar det). Urvalet returneras som `SystemSelection[]`, alltså samma form som systembyggaren redan redigerar. Själva knappen ingår inte i den här leveransen.

### 4. UI-texterna lovar ingen vinst — **uppfyllt**

Backtesten ger stöd för att texterna inte ska lova något. Inget sammanslaget utfall gav tillbaka insatsen: alla låg under 1 kr per krona. Enstaka celler per spel ligger över 1, men det beror på enskilda storvinster.

## 2, 3 eller 4 spikar vid samma budget

Med samma budget sjunker den förutsagda chansen för alla rätt när spikarna blir fler. Exempel för V85 på valideringen (summa P8 för Max chans): 1,6 med 2 spikar, 1,5 med 3 och 1,1 med 4. Med 4 spikar saknades dessutom ett system i 5 av 33 omgångar, eftersom för få hästar hade minst 35 %. Utfallet pekar åt samma håll. Avkastningen för V85 var 0,70, 0,54 och 0,27 med 2, 3 och 4 spikar, och spikarna höll mer sällan än förutsagt. För V86 var 3 spikar bäst (2,82), men det beror på två träffar med alla rätt. Spikantalet bör därför vara ett intervall, till exempel 0–4, som optimeraren väljer inom. Ett exakt antal bör inte vara standard.

## Märkena Understreckad och Överstreckad

| Period | Märke | Hästar | Medel streck | Medel chans | Vann | Vann / streck | Avk./kr vinnarspel |
|---|---|---|---|---|---|---|---|
| Träning | Understreckad | 327 | 7,6 % | 13,4 % | 13,5 % | **1,76** | 0,77 |
| Träning | Överstreckad | 515 | 17,9 % | 11,7 % | 11,1 % | **0,62** | 0,79 |
| Träning | Alla | 13 875 | 9,6 % | 9,7 % | 9,7 % | 1,01 | 0,70 |
| Validering | Understreckad | 362 | 6,7 % | 11,8 % | 10,2 % | **1,54** | 0,56 |
| Validering | Överstreckad | 575 | 18,1 % | 12,1 % | 13,0 % | **0,72** | 0,90 |
| Validering | Alla | 15 393 | 9,4 % | 9,5 % | 9,5 % | 1,01 | 0,70 |

- **Validerade för V-spelsvärde.** Understreckade hästar vinner 1,5–1,8 gånger så ofta som strecket säger, och överstreckade 0,6–0,7 gånger. Mönstret håller i båda perioderna. Eftersom utdelningen på V-spel styrs av strecket är det just det märkena ska fånga.
- **Inte ett vinnarspelstips.** Understreckade hästar gav 0,56–0,77 kr per krona på vinnarspel, alltså inte bättre än genomsnittet på 0,70. Den kalibrerade chansen bygger till största delen på vinnaroddsen, så märket säger i praktiken att vinnarpoolen och V-poolen värderar hästen olika. Hjälptexten bör säga att märkena gäller utdelningsvärde i V-spel och inte vinstchans eller vinnarspel, som issuen redan föreslår.
- Även den kalibrerade chansen för understreckade hästar var något för hög på valideringen: 11,8 % förutsagt mot 10,2 % faktiskt.

## Rekommendationer

Punkterna 1–4 är genomförda: Max chans är huvudförslaget, P(alla rätt) visas som "1 på N" och är kalibrerad, spikantalet är valfritt som standard och V65 kostar 1 kr per rad.

1. Visa optimeraren som ett verktyg för **chans** (Max chans) och presentera Balans och Värde som ett val av spelstil. Påstå inte att värdevikten ökar den förväntade avkastningen, eftersom det inte har kunnat visas.
2. Visa P(alla rätt) som "ungefär 1 på N", inte som en exakt siffra. Visa tydligt chansen att alla spikar håller. Överväg att krympa favoriternas kalibrerade chans, till exempel med en temperatur under 1 för p > 0,35, eller att höja spikkravet. Pröva det på ny data, inte på den här valideringen.
3. Låt spikantalet vara ett intervall som standard.
4. Kontrollera radpriset för V65 mot ATG. Data talar för 1 kr.
5. Kör om backtesten när `odds_snapshots` har samlats in, så att det går att mäta hur förslagen beter sig på odds och streck från tidigare under dagen.

## Bilaga – fullständiga tabeller från `npm run backtest-optimizer` (kalibrering i måtten, som i appen)

## Underlag

Kalibrerade vikter (träningsperioden, läge full): a = 0,117, b = 0,925, c = 0,093. Temperatur τ = 1,00.
Träningsperiod 2025-12-29 – 2026-05-12, valideringsperiod 2026-05-12 – 2026-09-30.
Kalibrering av täckningen (skattad på träningsperiodens system): logit(c′) = -0,153 + 1,091·logit(c), n = 3509. Används i alla förutsagda träffar nedan men inte i optimerarens mål (som i appen).
8166 system byggda (optimerare och referenser); alla höll budgeten.

| Spel | Radpris | Budget | Spikar | Omgångar träning | Omgångar validering | Uteslutna (galopp/monté saknas) | Uteslutna (före Grundchans) |
|---|---|---|---|---|---|---|---|
| V85 | 0,50 kr | 385 kr | 2/3/4 | 25 | 33 | 1 | 15 |
| V86 | 0,25 kr | 385 kr | 2/3/4 | 18 | 20 | 0 | 20 |
| V75 | 0,50 kr | 385 kr | 2/3/4 | 0 | 0 | 0 | 10 |
| GS75 | 1,00 kr | 385 kr | 2/3/4 | 15 | 15 | 8 | 13 |
| V64 | 1,00 kr | 200 kr | 1/2/3 | 63 | 64 | 39 | 74 |
| V65 | 1,00 kr | 200 kr | 1/2/3 | 64 | 73 | 33 | 81 |

## Radpriskontroll

Antal spelade rader skattas som (vinnande rader för alla rätt) / Π streck(vinnare), vilket förutsätter att raderna fördelas som strecket. Implicit radpris = omsättning / skattade rader (median över omgångar med minst 20 vinnande rader). Samma skattning görs med nivån alla utom en. Sista kolumnen kontrollerar att utdelningen anges per vinnande rad: antal vinnande rader × utdelning ≈ potten för nivån.

| Spel | getRowPrice | Implicit radpris, alla rätt (median) | n | Kvartiler | Implicit radpris, alla−1 (median) | rader × utdelning / pott (median) |
|---|---|---|---|---|---|---|
| V85 | 0,50 kr | 0,51 kr | 52 | 0,38–0,60 kr | 0,50 kr | 0,995 |
| V86 | 0,25 kr | 0,25 kr | 43 | 0,21–0,29 kr | 0,25 kr | 0,998 |
| V75 | 0,50 kr | 0,53 kr | 8 | 0,50–0,55 kr | 0,52 kr | 0,999 |
| GS75 | 1,00 kr | 0,87 kr | 40 | 0,70–1,08 kr | 1,14 kr | 0,997 |
| V64 | 1,00 kr | 0,69 kr | 200 | 0,54–0,82 kr | 1,43 kr | 0,995 |
| V65 | 1,00 kr | 0,82 kr | 187 | 0,67–1,00 kr | 1,26 kr | 0,997 |

## Utfall – valideringsperioden

### V85 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 33 | 2 / 1,2 | 3 / 5,1 | 21 % / 29 % | 12 389 kr | 8 668 kr | 0,70 | 0,70 | 0 |
| 2 | λ=0,3 | 33 | 2 / 1,2 | 2 / 5,0 | 21 % / 28 % | 12 444 kr | 7 951 kr | 0,64 | 0,64 | 0 |
| 2 | λ=0,6 | 33 | 2 / 1,0 | 3 / 4,6 | 27 % / 26 % | 12 342 kr | 9 365 kr | 0,76 | 0,76 | 0 |
| 2 | Ref A (λ=0) | 33 | 2 / 1,2 | 3 / 5,1 | 21 % / 29 % | 12 389 kr | 8 884 kr | 0,72 | 0,72 | 0 |
| 2 | Ref A (λ=0,3) | 33 | 2 / 1,1 | 4 / 4,9 | 21 % / 28 % | 12 444 kr | 14 519 kr | 1,17 | 1,17 | 0 |
| 2 | Ref A (λ=0,6) | 33 | 1 / 1,0 | 4 / 4,4 | 27 % / 26 % | 12 342 kr | 13 128 kr | 1,06 | 1,06 | 0 |
| 2 | Ref B | 33 | 1 / 1,2 | 4 / 4,9 | 18 % / 29 % | 12 486 kr | 5 080 kr | 0,41 | 0,41 | 0 |
| 3 | λ=0 | 33 | 1 / 1,2 | 3 / 5,2 | 6 % / 13 % | 12 420 kr | 6 758 kr | 0,54 | 0,54 | 0 |
| 3 | λ=0,3 | 33 | 1 / 1,1 | 1 / 5,0 | 6 % / 12 % | 12 510 kr | 3 468 kr | 0,28 | 0,28 | 0 |
| 3 | λ=0,6 | 33 | 0 / 0,9 | 3 / 4,5 | 0 % / 11 % | 12 405 kr | 3 447 kr | 0,28 | 0,28 | 0 |
| 3 | Ref A (λ=0) | 33 | 1 / 1,2 | 3 / 5,1 | 6 % / 13 % | 12 420 kr | 6 725 kr | 0,54 | 0,54 | 0 |
| 3 | Ref A (λ=0,3) | 33 | 1 / 1,1 | 1 / 4,9 | 6 % / 12 % | 12 510 kr | 3 563 kr | 0,28 | 0,28 | 0 |
| 3 | Ref A (λ=0,6) | 33 | 0 / 0,9 | 3 / 4,4 | 3 % / 11 % | 12 405 kr | 4 326 kr | 0,35 | 0,35 | 0 |
| 3 | Ref B | 33 | 1 / 1,1 | 2 / 5,0 | 6 % / 12 % | 12 348 kr | 3 828 kr | 0,31 | 0,31 | 0 |
| 4 | λ=0 | 28 | 0 / 0,9 | 3 / 4,2 | 0 % / 5 % | 10 515 kr | 2 805 kr | 0,27 | 0,27 | 5 |
| 4 | λ=0,3 | 28 | 0 / 0,8 | 2 / 4,1 | 0 % / 5 % | 10 530 kr | 1 485 kr | 0,14 | 0,14 | 5 |
| 4 | λ=0,6 | 28 | 0 / 0,7 | 1 / 3,8 | 0 % / 5 % | 10 537 kr | 1 093 kr | 0,10 | 0,10 | 5 |
| 4 | Ref A (λ=0) | 28 | 0 / 0,8 | 3 / 4,1 | 4 % / 5 % | 10 515 kr | 4 719 kr | 0,45 | 0,45 | 0 |
| 4 | Ref A (λ=0,3) | 28 | 0 / 0,8 | 2 / 4,0 | 4 % / 5 % | 10 530 kr | 3 550 kr | 0,34 | 0,34 | 0 |
| 4 | Ref A (λ=0,6) | 28 | 0 / 0,7 | 1 / 3,7 | 4 % / 5 % | 10 537 kr | 1 372 kr | 0,13 | 0,13 | 0 |
| 4 | Ref B | 33 | 0 / 0,8 | 3 / 4,4 | 0 % / 4 % | 12 366 kr | 3 329 kr | 0,27 | 0,27 | 0 |

### V86 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 19 | 0 / 1,0 | 8 / 3,7 | 16 % / 25 % | 7 203 kr | 5 998 kr | 0,83 | 0,83 | 1 |
| 2 | λ=0,3 | 19 | 1 / 0,9 | 6 / 3,6 | 21 % / 24 % | 7 149 kr | 17 294 kr | 2,42 | 2,42 | 1 |
| 2 | λ=0,6 | 19 | 0 / 0,7 | 5 / 3,2 | 21 % / 23 % | 7 164 kr | 14 706 kr | 2,05 | 2,05 | 1 |
| 2 | Ref A (λ=0) | 19 | 0 / 0,9 | 7 / 3,6 | 16 % / 25 % | 7 203 kr | 3 939 kr | 0,55 | 0,55 | 0 |
| 2 | Ref A (λ=0,3) | 19 | 1 / 0,9 | 5 / 3,5 | 21 % / 24 % | 7 149 kr | 14 614 kr | 2,04 | 2,04 | 0 |
| 2 | Ref A (λ=0,6) | 19 | 0 / 0,7 | 5 / 3,1 | 21 % / 23 % | 7 164 kr | 3 203 kr | 0,45 | 0,45 | 0 |
| 2 | Ref B | 20 | 1 / 0,9 | 6 / 3,6 | 20 % / 24 % | 7 572 kr | 3 577 kr | 0,47 | 0,47 | 0 |
| 3 | λ=0 | 17 | 2 / 0,8 | 4 / 3,4 | 12 % / 11 % | 6 381 kr | 17 978 kr | 2,82 | 2,82 | 3 |
| 3 | λ=0,3 | 17 | 1 / 0,7 | 6 / 3,3 | 6 % / 11 % | 6 405 kr | 6 768 kr | 1,06 | 1,06 | 3 |
| 3 | λ=0,6 | 17 | 0 / 0,6 | 7 / 2,9 | 12 % / 9 % | 6 441 kr | 14 383 kr | 2,23 | 2,23 | 3 |
| 3 | Ref A (λ=0) | 17 | 2 / 0,8 | 3 / 3,3 | 12 % / 11 % | 6 381 kr | 16 121 kr | 2,53 | 2,53 | 0 |
| 3 | Ref A (λ=0,3) | 17 | 1 / 0,7 | 4 / 3,1 | 6 % / 10 % | 6 405 kr | 3 993 kr | 0,62 | 0,62 | 0 |
| 3 | Ref A (λ=0,6) | 17 | 0 / 0,6 | 5 / 2,8 | 12 % / 9 % | 6 441 kr | 2 123 kr | 0,33 | 0,33 | 0 |
| 3 | Ref B | 20 | 1 / 0,8 | 4 / 3,5 | 5 % / 9 % | 7 545 kr | 4 052 kr | 0,54 | 0,54 | 0 |
| 4 | λ=0 | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 295 kr | 563 kr | 0,11 | 0,11 | 6 |
| 4 | λ=0,3 | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 254 kr | 547 kr | 0,10 | 0,10 | 6 |
| 4 | λ=0,6 | 14 | 0 / 0,4 | 2 / 2,2 | 0 % / 4 % | 5 273 kr | 918 kr | 0,17 | 0,17 | 6 |
| 4 | Ref A (λ=0) | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 295 kr | 528 kr | 0,10 | 0,10 | 0 |
| 4 | Ref A (λ=0,3) | 14 | 0 / 0,4 | 2 / 2,3 | 0 % / 4 % | 5 254 kr | 546 kr | 0,10 | 0,10 | 0 |
| 4 | Ref A (λ=0,6) | 14 | 0 / 0,4 | 2 / 2,1 | 0 % / 4 % | 5 273 kr | 824 kr | 0,16 | 0,16 | 0 |
| 4 | Ref B | 17 | 1 / 0,5 | 3 / 2,5 | 6 % / 4 % | 6 402 kr | 4 488 kr | 0,70 | 0,70 | 3 |

### GS75 (7 avd, 385 kr)

| Spikar | System | Omg | 7 rätt faktiskt / förutsagt | 6 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 15 | 0 / 1,5 | 3 / 4,1 | 0 % / 35 % | 5 640 kr | 1 909 kr | 0,34 | 0,34 | 0 |
| 2 | λ=0,3 | 15 | 0 / 1,4 | 4 / 4,1 | 0 % / 34 % | 5 676 kr | 968 kr | 0,17 | 0,17 | 0 |
| 2 | λ=0,6 | 15 | 0 / 1,2 | 5 / 3,9 | 0 % / 32 % | 5 652 kr | 876 kr | 0,15 | 0,15 | 0 |
| 2 | Ref A (λ=0) | 15 | 0 / 1,4 | 3 / 4,1 | 0 % / 35 % | 5 640 kr | 1 909 kr | 0,34 | 0,34 | 0 |
| 2 | Ref A (λ=0,3) | 15 | 0 / 1,4 | 4 / 4,0 | 0 % / 34 % | 5 676 kr | 896 kr | 0,16 | 0,16 | 0 |
| 2 | Ref A (λ=0,6) | 15 | 0 / 1,2 | 4 / 3,9 | 0 % / 32 % | 5 652 kr | 760 kr | 0,13 | 0,13 | 0 |
| 2 | Ref B | 15 | 0 / 1,4 | 3 / 4,1 | 0 % / 34 % | 5 706 kr | 1 825 kr | 0,32 | 0,32 | 0 |
| 3 | λ=0 | 14 | 0 / 1,2 | 3 / 3,9 | 0 % / 16 % | 5 307 kr | 3 185 kr | 0,60 | 0,60 | 1 |
| 3 | λ=0,3 | 14 | 0 / 1,2 | 2 / 3,9 | 0 % / 16 % | 5 316 kr | 339 kr | 0,06 | 0,06 | 1 |
| 3 | λ=0,6 | 14 | 0 / 1,1 | 2 / 3,7 | 0 % / 15 % | 5 313 kr | 211 kr | 0,04 | 0,04 | 1 |
| 3 | Ref A (λ=0) | 14 | 0 / 1,2 | 3 / 3,9 | 0 % / 16 % | 5 307 kr | 3 185 kr | 0,60 | 0,60 | 0 |
| 3 | Ref A (λ=0,3) | 14 | 0 / 1,2 | 2 / 3,9 | 0 % / 16 % | 5 316 kr | 339 kr | 0,06 | 0,06 | 0 |
| 3 | Ref A (λ=0,6) | 14 | 0 / 1,1 | 2 / 3,7 | 0 % / 15 % | 5 313 kr | 211 kr | 0,04 | 0,04 | 0 |
| 3 | Ref B | 14 | 0 / 1,2 | 2 / 3,8 | 0 % / 16 % | 5 247 kr | 83 kr | 0,02 | 0,02 | 1 |
| 4 | λ=0 | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 7 % | 4 608 kr | 485 kr | 0,11 | 0,11 | 3 |
| 4 | λ=0,3 | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 6 % | 4 608 kr | 485 kr | 0,11 | 0,11 | 3 |
| 4 | λ=0,6 | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 6 % | 4 416 kr | 485 kr | 0,11 | 0,11 | 3 |
| 4 | Ref A (λ=0) | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 7 % | 4 608 kr | 485 kr | 0,11 | 0,11 | 0 |
| 4 | Ref A (λ=0,3) | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 6 % | 4 608 kr | 485 kr | 0,11 | 0,11 | 0 |
| 4 | Ref A (λ=0,6) | 12 | 0 / 0,7 | 1 / 2,8 | 0 % / 6 % | 4 416 kr | 485 kr | 0,11 | 0,11 | 0 |
| 4 | Ref B | 13 | 0 / 0,7 | 2 / 3,0 | 0 % / 6 % | 4 992 kr | 529 kr | 0,11 | 0,11 | 2 |

### V64 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 63 | 10 / 8,5 | 14 / 20,5 | 57 % / 56 % | 12 028 kr | 8 997 kr | 0,75 | 0,75 | 1 |
| 1 | λ=0,3 | 63 | 8 / 8,3 | 12 / 20,3 | 56 % / 55 % | 12 044 kr | 7 260 kr | 0,60 | 0,60 | 1 |
| 1 | λ=0,6 | 63 | 7 / 7,8 | 18 / 20,0 | 54 % / 54 % | 12 040 kr | 9 488 kr | 0,79 | 0,79 | 1 |
| 1 | Ref A (λ=0) | 63 | 8 / 8,3 | 16 / 20,2 | 59 % / 56 % | 12 028 kr | 6 637 kr | 0,55 | 0,55 | 0 |
| 1 | Ref A (λ=0,3) | 63 | 6 / 7,9 | 17 / 19,9 | 57 % / 55 % | 12 044 kr | 5 206 kr | 0,43 | 0,43 | 0 |
| 1 | Ref A (λ=0,6) | 63 | 7 / 7,4 | 18 / 19,5 | 56 % / 54 % | 12 040 kr | 7 151 kr | 0,59 | 0,59 | 0 |
| 1 | Ref B | 64 | 8 / 8,0 | 19 / 20,0 | 61 % / 55 % | 12 192 kr | 7 984 kr | 0,65 | 0,65 | 0 |
| 2 | λ=0 | 60 | 4 / 7,7 | 27 / 20,6 | 17 % / 26 % | 11 656 kr | 6 218 kr | 0,53 | 0,53 | 4 |
| 2 | λ=0,3 | 60 | 5 / 7,6 | 21 / 20,4 | 22 % / 26 % | 11 585 kr | 5 490 kr | 0,47 | 0,47 | 4 |
| 2 | λ=0,6 | 60 | 6 / 6,8 | 19 / 19,7 | 22 % / 24 % | 11 511 kr | 4 979 kr | 0,43 | 0,43 | 4 |
| 2 | Ref A (λ=0) | 60 | 6 / 7,6 | 26 / 20,4 | 18 % / 26 % | 11 656 kr | 8 635 kr | 0,74 | 0,74 | 0 |
| 2 | Ref A (λ=0,3) | 60 | 6 / 7,4 | 20 / 20,2 | 23 % / 26 % | 11 585 kr | 6 766 kr | 0,58 | 0,58 | 0 |
| 2 | Ref A (λ=0,6) | 60 | 7 / 6,6 | 17 / 19,3 | 23 % / 24 % | 11 511 kr | 5 471 kr | 0,48 | 0,48 | 0 |
| 2 | Ref B | 63 | 7 / 7,3 | 26 / 20,5 | 21 % / 25 % | 12 177 kr | 8 350 kr | 0,69 | 0,69 | 1 |
| 3 | λ=0 | 56 | 4 / 5,2 | 20 / 17,6 | 7 % / 11 % | 10 972 kr | 6 770 kr | 0,62 | 0,62 | 8 |
| 3 | λ=0,3 | 56 | 6 / 5,0 | 15 / 17,4 | 11 % / 11 % | 10 984 kr | 8 727 kr | 0,79 | 0,79 | 8 |
| 3 | λ=0,6 | 56 | 5 / 4,7 | 20 / 16,8 | 11 % / 11 % | 10 860 kr | 10 309 kr | 0,95 | 0,95 | 8 |
| 3 | Ref A (λ=0) | 56 | 4 / 5,1 | 21 / 17,4 | 7 % / 11 % | 10 972 kr | 7 537 kr | 0,69 | 0,69 | 0 |
| 3 | Ref A (λ=0,3) | 56 | 6 / 4,9 | 16 / 17,2 | 11 % / 11 % | 10 984 kr | 9 501 kr | 0,86 | 0,86 | 0 |
| 3 | Ref A (λ=0,6) | 56 | 5 / 4,6 | 19 / 16,7 | 11 % / 10 % | 10 860 kr | 9 882 kr | 0,91 | 0,91 | 0 |
| 3 | Ref B | 54 | 5 / 4,7 | 24 / 16,5 | 9 % / 11 % | 10 500 kr | 6 937 kr | 0,66 | 0,66 | 10 |

### V65 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 73 | 17 / 10,8 | 22 / 24,0 | 68 % / 59 % | 14 026 kr | 12 688 kr | 0,90 | 0,90 | 0 |
| 1 | λ=0,3 | 73 | 18 / 10,2 | 21 / 23,7 | 67 % / 59 % | 13 986 kr | 12 563 kr | 0,90 | 0,90 | 0 |
| 1 | λ=0,6 | 73 | 16 / 8,5 | 23 / 22,3 | 60 % / 53 % | 13 956 kr | 11 623 kr | 0,83 | 0,83 | 0 |
| 1 | Ref A (λ=0) | 73 | 16 / 10,3 | 26 / 23,6 | 68 % / 59 % | 14 026 kr | 16 640 kr | 1,19 | 1,19 | 0 |
| 1 | Ref A (λ=0,3) | 73 | 14 / 9,5 | 26 / 23,0 | 67 % / 59 % | 13 986 kr | 10 632 kr | 0,76 | 0,76 | 0 |
| 1 | Ref A (λ=0,6) | 73 | 16 / 8,0 | 19 / 21,6 | 60 % / 52 % | 13 956 kr | 14 300 kr | 1,02 | 1,02 | 0 |
| 1 | Ref B | 73 | 13 / 10,0 | 27 / 23,2 | 71 % / 59 % | 14 036 kr | 9 815 kr | 0,70 | 0,70 | 0 |
| 2 | λ=0 | 72 | 10 / 10,3 | 29 / 24,7 | 29 % / 29 % | 13 910 kr | 6 235 kr | 0,45 | 0,45 | 1 |
| 2 | λ=0,3 | 72 | 11 / 9,5 | 26 / 24,0 | 31 % / 29 % | 13 820 kr | 8 377 kr | 0,61 | 0,61 | 1 |
| 2 | λ=0,6 | 72 | 14 / 7,7 | 19 / 22,3 | 33 % / 26 % | 13 760 kr | 9 986 kr | 0,73 | 0,73 | 1 |
| 2 | Ref A (λ=0) | 72 | 11 / 10,0 | 26 / 24,3 | 29 % / 29 % | 13 910 kr | 5 411 kr | 0,39 | 0,39 | 0 |
| 2 | Ref A (λ=0,3) | 72 | 12 / 9,0 | 24 / 23,5 | 31 % / 28 % | 13 820 kr | 7 122 kr | 0,52 | 0,52 | 0 |
| 2 | Ref A (λ=0,6) | 72 | 12 / 7,3 | 17 / 21,7 | 31 % / 25 % | 13 760 kr | 6 097 kr | 0,44 | 0,44 | 0 |
| 2 | Ref B | 73 | 10 / 9,6 | 31 / 24,0 | 30 % / 29 % | 14 077 kr | 6 459 kr | 0,46 | 0,46 | 0 |
| 3 | λ=0 | 65 | 6 / 7,2 | 23 / 21,3 | 9 % / 13 % | 12 708 kr | 4 237 kr | 0,33 | 0,33 | 8 |
| 3 | λ=0,3 | 65 | 5 / 6,6 | 26 / 20,7 | 9 % / 13 % | 12 560 kr | 8 119 kr | 0,65 | 0,65 | 8 |
| 3 | λ=0,6 | 65 | 6 / 5,6 | 20 / 19,5 | 11 % / 11 % | 12 282 kr | 7 327 kr | 0,60 | 0,60 | 8 |
| 3 | Ref A (λ=0) | 65 | 6 / 7,1 | 23 / 21,1 | 9 % / 13 % | 12 708 kr | 4 177 kr | 0,33 | 0,33 | 0 |
| 3 | Ref A (λ=0,3) | 65 | 6 / 6,4 | 27 / 20,3 | 11 % / 12 % | 12 560 kr | 4 587 kr | 0,37 | 0,37 | 0 |
| 3 | Ref A (λ=0,6) | 65 | 7 / 5,4 | 21 / 19,2 | 14 % / 11 % | 12 282 kr | 5 185 kr | 0,42 | 0,42 | 0 |
| 3 | Ref B | 70 | 7 / 7,0 | 28 / 21,9 | 10 % / 12 % | 13 572 kr | 4 088 kr | 0,30 | 0,30 | 3 |

## Utfall – träningsperioden

### V85 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 24 | 0 / 0,7 | 2 / 3,2 | 42 % / 31 % | 9 023 kr | 2 374 kr | 0,26 | 0,26 | 1 |
| 2 | λ=0,3 | 24 | 0 / 0,6 | 4 / 3,1 | 42 % / 30 % | 9 186 kr | 6 177 kr | 0,67 | 0,67 | 1 |
| 2 | λ=0,6 | 23 | 0 / 0,5 | 2 / 2,8 | 43 % / 28 % | 8 736 kr | 2 650 kr | 0,30 | 0,30 | 2 |
| 2 | Ref A (λ=0) | 24 | 0 / 0,6 | 3 / 3,1 | 42 % / 31 % | 9 023 kr | 3 446 kr | 0,38 | 0,38 | 0 |
| 2 | Ref A (λ=0,3) | 24 | 1 / 0,6 | 3 / 3,0 | 42 % / 30 % | 9 186 kr | 17 144 kr | 1,87 | 1,87 | 0 |
| 2 | Ref A (λ=0,6) | 23 | 0 / 0,5 | 3 / 2,7 | 43 % / 28 % | 8 736 kr | 3 578 kr | 0,41 | 0,41 | 0 |
| 2 | Ref B | 25 | 0 / 0,6 | 1 / 3,1 | 28 % / 30 % | 9 456 kr | 1 550 kr | 0,16 | 0,16 | 0 |
| 3 | λ=0 | 21 | 0 / 0,6 | 5 / 3,0 | 14 % / 13 % | 7 899 kr | 4 294 kr | 0,54 | 0,54 | 4 |
| 3 | λ=0,3 | 21 | 0 / 0,6 | 5 / 2,9 | 19 % / 12 % | 7 926 kr | 7 245 kr | 0,91 | 0,91 | 4 |
| 3 | λ=0,6 | 20 | 0 / 0,5 | 3 / 2,6 | 20 % / 13 % | 7 569 kr | 5 342 kr | 0,71 | 0,71 | 5 |
| 3 | Ref A (λ=0) | 21 | 0 / 0,6 | 5 / 3,0 | 14 % / 13 % | 7 899 kr | 4 206 kr | 0,53 | 0,53 | 0 |
| 3 | Ref A (λ=0,3) | 21 | 1 / 0,6 | 5 / 2,8 | 19 % / 12 % | 7 926 kr | 11 051 kr | 1,39 | 1,39 | 0 |
| 3 | Ref A (λ=0,6) | 20 | 1 / 0,5 | 2 / 2,5 | 20 % / 13 % | 7 569 kr | 7 026 kr | 0,93 | 0,93 | 0 |
| 3 | Ref B | 25 | 0 / 0,6 | 2 / 3,1 | 4 % / 11 % | 9 429 kr | 1 544 kr | 0,16 | 0,16 | 0 |
| 4 | λ=0 | 16 | 1 / 0,4 | 1 / 2,1 | 6 % / 4 % | 6 027 kr | 3 842 kr | 0,64 | 0,64 | 9 |
| 4 | λ=0,3 | 16 | 1 / 0,4 | 2 / 2,1 | 13 % / 4 % | 6 063 kr | 6 389 kr | 1,05 | 1,05 | 9 |
| 4 | λ=0,6 | 16 | 0 / 0,3 | 2 / 1,9 | 13 % / 4 % | 6 050 kr | 3 507 kr | 0,58 | 0,58 | 9 |
| 4 | Ref A (λ=0) | 16 | 1 / 0,4 | 1 / 2,1 | 6 % / 4 % | 6 027 kr | 3 713 kr | 0,62 | 0,62 | 0 |
| 4 | Ref A (λ=0,3) | 16 | 1 / 0,3 | 2 / 2,0 | 13 % / 4 % | 6 063 kr | 5 970 kr | 0,98 | 0,98 | 0 |
| 4 | Ref A (λ=0,6) | 16 | 1 / 0,3 | 3 / 1,8 | 19 % / 4 % | 6 050 kr | 7 329 kr | 1,21 | 1,21 | 0 |
| 4 | Ref B | 22 | 0 / 0,4 | 2 / 2,5 | 0 % / 4 % | 8 166 kr | 2 380 kr | 0,29 | 0,29 | 3 |

### V86 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 18 | 2 / 1,6 | 6 / 4,8 | 39 % / 33 % | 6 770 kr | 2 160 kr | 0,32 | 0,32 | 0 |
| 2 | λ=0,3 | 18 | 2 / 1,5 | 3 / 4,7 | 28 % / 32 % | 6 728 kr | 1 655 kr | 0,25 | 0,25 | 0 |
| 2 | λ=0,6 | 18 | 2 / 1,3 | 2 / 4,3 | 28 % / 31 % | 6 708 kr | 1 591 kr | 0,24 | 0,24 | 0 |
| 2 | Ref A (λ=0) | 18 | 2 / 1,5 | 6 / 4,7 | 39 % / 33 % | 6 770 kr | 2 160 kr | 0,32 | 0,32 | 0 |
| 2 | Ref A (λ=0,3) | 18 | 2 / 1,4 | 3 / 4,6 | 28 % / 32 % | 6 728 kr | 1 421 kr | 0,21 | 0,21 | 0 |
| 2 | Ref A (λ=0,6) | 18 | 2 / 1,3 | 2 / 4,3 | 28 % / 31 % | 6 708 kr | 1 269 kr | 0,19 | 0,19 | 0 |
| 2 | Ref B | 18 | 4 / 1,5 | 5 / 4,6 | 44 % / 32 % | 6 816 kr | 7 826 kr | 1,15 | 1,15 | 0 |
| 3 | λ=0 | 17 | 2 / 1,3 | 6 / 4,5 | 24 % / 16 % | 6 392 kr | 2 001 kr | 0,31 | 0,31 | 1 |
| 3 | λ=0,3 | 17 | 2 / 1,2 | 4 / 4,4 | 18 % / 15 % | 6 341 kr | 1 903 kr | 0,30 | 0,30 | 1 |
| 3 | λ=0,6 | 17 | 1 / 1,0 | 4 / 3,9 | 12 % / 15 % | 6 333 kr | 1 349 kr | 0,21 | 0,21 | 1 |
| 3 | Ref A (λ=0) | 17 | 3 / 1,3 | 6 / 4,5 | 24 % / 16 % | 6 392 kr | 10 226 kr | 1,60 | 1,60 | 0 |
| 3 | Ref A (λ=0,3) | 17 | 2 / 1,2 | 4 / 4,3 | 18 % / 15 % | 6 341 kr | 1 815 kr | 0,29 | 0,29 | 0 |
| 3 | Ref A (λ=0,6) | 17 | 2 / 1,0 | 2 / 3,8 | 18 % / 14 % | 6 333 kr | 1 899 kr | 0,30 | 0,30 | 0 |
| 3 | Ref B | 18 | 3 / 1,3 | 5 / 4,5 | 22 % / 15 % | 6 722 kr | 10 102 kr | 1,50 | 1,50 | 0 |
| 4 | λ=0 | 17 | 4 / 0,9 | 4 / 3,7 | 24 % / 7 % | 6 424 kr | 5 111 kr | 0,80 | 0,80 | 1 |
| 4 | λ=0,3 | 17 | 1 / 0,8 | 7 / 3,6 | 18 % / 6 % | 6 431 kr | 1 439 kr | 0,22 | 0,22 | 1 |
| 4 | λ=0,6 | 17 | 1 / 0,8 | 5 / 3,4 | 12 % / 6 % | 6 332 kr | 1 279 kr | 0,20 | 0,20 | 1 |
| 4 | Ref A (λ=0) | 17 | 4 / 0,9 | 4 / 3,7 | 24 % / 7 % | 6 424 kr | 5 111 kr | 0,80 | 0,80 | 0 |
| 4 | Ref A (λ=0,3) | 17 | 2 / 0,8 | 5 / 3,5 | 24 % / 6 % | 6 431 kr | 1 935 kr | 0,30 | 0,30 | 0 |
| 4 | Ref A (λ=0,6) | 17 | 2 / 0,7 | 3 / 3,3 | 18 % / 6 % | 6 332 kr | 1 775 kr | 0,28 | 0,28 | 0 |
| 4 | Ref B | 16 | 3 / 0,8 | 6 / 3,4 | 19 % / 6 % | 6 023 kr | 2 787 kr | 0,46 | 0,46 | 2 |

### GS75 (7 avd, 385 kr)

| Spikar | System | Omg | 7 rätt faktiskt / förutsagt | 6 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 15 | 4 / 1,5 | 4 / 4,3 | 40 % / 28 % | 5 640 kr | 6 977 kr | 1,24 | 1,24 | 0 |
| 2 | λ=0,3 | 15 | 1 / 1,4 | 6 / 4,2 | 27 % / 27 % | 5 580 kr | 4 057 kr | 0,73 | 0,73 | 0 |
| 2 | λ=0,6 | 15 | 1 / 1,3 | 7 / 4,1 | 33 % / 26 % | 5 604 kr | 5 497 kr | 0,98 | 0,98 | 0 |
| 2 | Ref A (λ=0) | 15 | 4 / 1,4 | 4 / 4,2 | 40 % / 28 % | 5 640 kr | 6 932 kr | 1,23 | 1,23 | 0 |
| 2 | Ref A (λ=0,3) | 15 | 1 / 1,4 | 5 / 4,1 | 27 % / 27 % | 5 580 kr | 3 609 kr | 0,65 | 0,65 | 0 |
| 2 | Ref A (λ=0,6) | 15 | 1 / 1,3 | 7 / 4,0 | 33 % / 26 % | 5 604 kr | 5 228 kr | 0,93 | 0,93 | 0 |
| 2 | Ref B | 15 | 4 / 1,4 | 5 / 4,2 | 40 % / 27 % | 5 664 kr | 7 409 kr | 1,31 | 1,31 | 0 |
| 3 | λ=0 | 15 | 2 / 1,2 | 5 / 4,1 | 20 % / 13 % | 5 640 kr | 5 096 kr | 0,90 | 0,90 | 0 |
| 3 | λ=0,3 | 15 | 1 / 1,1 | 7 / 4,0 | 7 % / 13 % | 5 634 kr | 3 972 kr | 0,71 | 0,71 | 0 |
| 3 | λ=0,6 | 15 | 1 / 1,1 | 7 / 3,8 | 20 % / 12 % | 5 670 kr | 5 236 kr | 0,92 | 0,92 | 0 |
| 3 | Ref A (λ=0) | 15 | 2 / 1,2 | 6 / 4,0 | 20 % / 13 % | 5 640 kr | 5 832 kr | 1,03 | 1,03 | 0 |
| 3 | Ref A (λ=0,3) | 15 | 1 / 1,1 | 6 / 3,9 | 7 % / 13 % | 5 634 kr | 3 401 kr | 0,60 | 0,60 | 0 |
| 3 | Ref A (λ=0,6) | 15 | 0 / 1,0 | 7 / 3,7 | 13 % / 12 % | 5 670 kr | 2 281 kr | 0,40 | 0,40 | 0 |
| 3 | Ref B | 15 | 3 / 1,1 | 4 / 3,9 | 27 % / 12 % | 5 679 kr | 4 968 kr | 0,87 | 0,87 | 0 |
| 4 | λ=0 | 15 | 0 / 0,7 | 6 / 3,2 | 0 % / 5 % | 5 760 kr | 2 141 kr | 0,37 | 0,37 | 0 |
| 4 | λ=0,3 | 15 | 0 / 0,7 | 7 / 3,1 | 0 % / 5 % | 5 607 kr | 2 187 kr | 0,39 | 0,39 | 0 |
| 4 | λ=0,6 | 15 | 0 / 0,7 | 6 / 3,0 | 0 % / 5 % | 5 671 kr | 1 117 kr | 0,20 | 0,20 | 0 |
| 4 | Ref A (λ=0) | 15 | 0 / 0,7 | 6 / 3,2 | 0 % / 5 % | 5 760 kr | 2 141 kr | 0,37 | 0,37 | 0 |
| 4 | Ref A (λ=0,3) | 15 | 0 / 0,7 | 6 / 3,1 | 0 % / 5 % | 5 607 kr | 2 113 kr | 0,38 | 0,38 | 0 |
| 4 | Ref A (λ=0,6) | 15 | 0 / 0,7 | 5 / 3,0 | 0 % / 5 % | 5 671 kr | 1 071 kr | 0,19 | 0,19 | 0 |
| 4 | Ref B | 15 | 1 / 0,7 | 5 / 3,1 | 7 % / 5 % | 5 678 kr | 2 424 kr | 0,43 | 0,43 | 0 |

### V64 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 63 | 13 / 9,4 | 25 / 21,6 | 60 % / 56 % | 12 036 kr | 14 850 kr | 1,23 | 1,23 | 0 |
| 1 | λ=0,3 | 63 | 12 / 9,2 | 23 / 21,5 | 54 % / 55 % | 12 100 kr | 9 966 kr | 0,82 | 0,82 | 0 |
| 1 | λ=0,6 | 63 | 11 / 8,7 | 19 / 21,1 | 51 % / 55 % | 12 066 kr | 8 970 kr | 0,74 | 0,74 | 0 |
| 1 | Ref A (λ=0) | 63 | 13 / 9,3 | 23 / 21,5 | 60 % / 56 % | 12 036 kr | 13 400 kr | 1,11 | 1,11 | 0 |
| 1 | Ref A (λ=0,3) | 63 | 11 / 9,0 | 20 / 21,3 | 54 % / 55 % | 12 100 kr | 6 441 kr | 0,53 | 0,53 | 0 |
| 1 | Ref A (λ=0,6) | 63 | 11 / 8,5 | 15 / 20,9 | 51 % / 54 % | 12 066 kr | 7 336 kr | 0,61 | 0,61 | 0 |
| 1 | Ref B | 63 | 10 / 9,0 | 22 / 21,0 | 52 % / 56 % | 12 120 kr | 10 382 kr | 0,86 | 0,86 | 0 |
| 2 | λ=0 | 62 | 12 / 8,9 | 21 / 21,9 | 29 % / 29 % | 11 918 kr | 8 306 kr | 0,70 | 0,70 | 1 |
| 2 | λ=0,3 | 62 | 12 / 8,6 | 21 / 21,9 | 24 % / 28 % | 11 945 kr | 9 105 kr | 0,76 | 0,76 | 1 |
| 2 | λ=0,6 | 62 | 11 / 7,9 | 20 / 21,1 | 26 % / 27 % | 12 001 kr | 7 588 kr | 0,63 | 0,63 | 1 |
| 2 | Ref A (λ=0) | 62 | 12 / 8,7 | 24 / 21,8 | 29 % / 29 % | 11 918 kr | 8 379 kr | 0,70 | 0,70 | 0 |
| 2 | Ref A (λ=0,3) | 62 | 12 / 8,4 | 22 / 21,7 | 24 % / 27 % | 11 945 kr | 9 112 kr | 0,76 | 0,76 | 0 |
| 2 | Ref A (λ=0,6) | 62 | 11 / 7,8 | 21 / 21,0 | 26 % / 27 % | 12 001 kr | 6 470 kr | 0,54 | 0,54 | 0 |
| 2 | Ref B | 63 | 10 / 8,5 | 25 / 21,6 | 33 % / 28 % | 12 078 kr | 6 418 kr | 0,53 | 0,53 | 0 |
| 3 | λ=0 | 61 | 6 / 6,5 | 18 / 20,1 | 15 % / 13 % | 11 908 kr | 5 540 kr | 0,47 | 0,47 | 2 |
| 3 | λ=0,3 | 61 | 8 / 6,3 | 18 / 19,8 | 16 % / 13 % | 11 856 kr | 8 655 kr | 0,73 | 0,73 | 2 |
| 3 | λ=0,6 | 61 | 7 / 6,0 | 18 / 19,5 | 15 % / 12 % | 11 764 kr | 8 434 kr | 0,72 | 0,72 | 2 |
| 3 | Ref A (λ=0) | 61 | 6 / 6,3 | 19 / 19,9 | 15 % / 12 % | 11 908 kr | 5 471 kr | 0,46 | 0,46 | 0 |
| 3 | Ref A (λ=0,3) | 61 | 9 / 6,1 | 17 / 19,6 | 18 % / 12 % | 11 856 kr | 8 747 kr | 0,74 | 0,74 | 0 |
| 3 | Ref A (λ=0,6) | 61 | 7 / 5,9 | 19 / 19,3 | 15 % / 12 % | 11 764 kr | 8 137 kr | 0,69 | 0,69 | 0 |
| 3 | Ref B | 57 | 5 / 5,8 | 19 / 18,4 | 14 % / 12 % | 11 044 kr | 3 965 kr | 0,36 | 0,36 | 6 |

### V65 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 64 | 9 / 9,2 | 20 / 21,6 | 58 % / 58 % | 12 176 kr | 7 066 kr | 0,58 | 0,58 | 0 |
| 1 | λ=0,3 | 64 | 9 / 8,6 | 21 / 21,2 | 59 % / 55 % | 12 164 kr | 11 507 kr | 0,95 | 0,95 | 0 |
| 1 | λ=0,6 | 64 | 9 / 7,2 | 18 / 19,8 | 58 % / 51 % | 12 236 kr | 21 958 kr | 1,79 | 1,79 | 0 |
| 1 | Ref A (λ=0) | 64 | 9 / 8,7 | 21 / 21,2 | 58 % / 58 % | 12 176 kr | 8 034 kr | 0,66 | 0,66 | 0 |
| 1 | Ref A (λ=0,3) | 64 | 10 / 8,0 | 18 / 20,5 | 58 % / 55 % | 12 164 kr | 10 290 kr | 0,85 | 0,85 | 0 |
| 1 | Ref A (λ=0,6) | 64 | 8 / 6,5 | 21 / 19,1 | 63 % / 50 % | 12 236 kr | 9 526 kr | 0,78 | 0,78 | 0 |
| 1 | Ref B | 64 | 8 / 8,4 | 22 / 20,7 | 61 % / 58 % | 12 226 kr | 7 157 kr | 0,59 | 0,59 | 0 |
| 2 | λ=0 | 63 | 10 / 8,6 | 21 / 22,0 | 32 % / 28 % | 12 166 kr | 11 181 kr | 0,92 | 0,92 | 1 |
| 2 | λ=0,3 | 63 | 9 / 8,0 | 18 / 21,5 | 29 % / 27 % | 12 093 kr | 23 057 kr | 1,91 | 1,91 | 1 |
| 2 | λ=0,6 | 63 | 6 / 6,6 | 18 / 20,0 | 24 % / 24 % | 12 119 kr | 8 165 kr | 0,67 | 0,67 | 1 |
| 2 | Ref A (λ=0) | 63 | 10 / 8,2 | 19 / 21,6 | 32 % / 28 % | 12 166 kr | 10 561 kr | 0,87 | 0,87 | 0 |
| 2 | Ref A (λ=0,3) | 63 | 8 / 7,3 | 16 / 20,6 | 27 % / 26 % | 12 093 kr | 8 719 kr | 0,72 | 0,72 | 0 |
| 2 | Ref A (λ=0,6) | 63 | 7 / 6,2 | 14 / 19,2 | 22 % / 23 % | 12 119 kr | 7 078 kr | 0,58 | 0,58 | 0 |
| 2 | Ref B | 64 | 7 / 7,9 | 21 / 21,3 | 25 % / 27 % | 12 350 kr | 5 703 kr | 0,46 | 0,46 | 0 |
| 3 | λ=0 | 62 | 7 / 6,2 | 23 / 20,1 | 15 % / 12 % | 12 112 kr | 17 656 kr | 1,46 | 1,46 | 2 |
| 3 | λ=0,3 | 62 | 7 / 5,8 | 19 / 19,5 | 16 % / 12 % | 12 071 kr | 9 532 kr | 0,79 | 0,79 | 2 |
| 3 | λ=0,6 | 62 | 4 / 5,1 | 19 / 18,5 | 11 % / 10 % | 11 892 kr | 6 030 kr | 0,51 | 0,51 | 2 |
| 3 | Ref A (λ=0) | 62 | 7 / 5,9 | 21 / 19,7 | 11 % / 12 % | 12 112 kr | 18 380 kr | 1,52 | 1,52 | 0 |
| 3 | Ref A (λ=0,3) | 62 | 5 / 5,4 | 22 / 18,8 | 13 % / 11 % | 12 071 kr | 7 183 kr | 0,60 | 0,60 | 0 |
| 3 | Ref A (λ=0,6) | 62 | 3 / 4,7 | 22 / 17,8 | 8 % / 10 % | 11 892 kr | 4 574 kr | 0,38 | 0,38 | 0 |
| 3 | Ref B | 63 | 7 / 5,6 | 23 / 19,4 | 13 % / 11 % | 12 364 kr | 10 499 kr | 0,85 | 0,85 | 1 |

## Sammanslaget – träningsperioden

| Spel | System | System×omg | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Avk./kr utan största utdelningen |
|---|---|---|---|---|---|---|---|---|---|
| V85+V86 | λ=0 | 113 | 9 / 5,5 | 24 / 21,4 | 42 533 kr | 19 782 kr | 0,47 | 0,47 | 0,41 |
| V85+V86 | λ=0,3 | 113 | 6 / 5,2 | 25 / 20,8 | 42 674 kr | 24 808 kr | 0,58 | 0,58 | 0,53 |
| V85+V86 | λ=0,6 | 111 | 4 / 4,4 | 18 / 18,9 | 41 728 kr | 15 718 kr | 0,38 | 0,38 | 0,33 |
| V85+V86 | Ref A (λ=0) | 113 | 10 / 5,3 | 25 / 21,1 | 42 533 kr | 28 862 kr | 0,68 | 0,68 | 0,49 |
| V85+V86 | Ref A (λ=0,3) | 113 | 9 / 5,0 | 22 / 20,2 | 42 674 kr | 39 336 kr | 0,92 | 0,92 | 0,68 |
| V85+V86 | Ref A (λ=0,6) | 111 | 8 / 4,2 | 15 / 18,3 | 41 728 kr | 22 876 kr | 0,55 | 0,55 | 0,49 |
| V85+V86 | Ref B | 124 | 10 / 5,2 | 21 / 21,2 | 46 611 kr | 26 189 kr | 0,56 | 0,56 | 0,39 |
| Alla | λ=0 | 533 | 72 / 57,7 | 167 / 160,3 | 131 889 kr | 98 595 kr | 0,75 | 0,75 | 0,67 |
| Alla | λ=0,3 | 533 | 65 / 54,9 | 165 / 157,5 | 131 724 kr | 106 846 kr | 0,81 | 0,81 | 0,72 |
| Alla | λ=0,6 | 531 | 54 / 49,0 | 150 / 149,7 | 130 751 kr | 88 713 kr | 0,68 | 0,68 | 0,64 |
| Alla | Ref A (λ=0) | 533 | 73 / 55,9 | 168 / 158,1 | 131 889 kr | 107 992 kr | 0,82 | 0,82 | 0,74 |
| Alla | Ref A (λ=0,3) | 533 | 66 / 52,4 | 154 / 153,9 | 131 724 kr | 98 951 kr | 0,75 | 0,75 | 0,67 |
| Alla | Ref A (λ=0,6) | 531 | 56 / 46,7 | 146 / 146,3 | 130 751 kr | 74 577 kr | 0,57 | 0,57 | 0,55 |
| Alla | Ref B | 543 | 65 / 53,5 | 167 / 154,9 | 135 814 kr | 85 114 kr | 0,63 | 0,63 | 0,57 |

## Sammanslaget – valideringsperioden

| Spel | System | System×omg | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Avk./kr utan största utdelningen |
|---|---|---|---|---|---|---|---|---|---|
| V85+V86 | λ=0 | 144 | 5 / 5,5 | 23 / 24,0 | 54 203 kr | 42 770 kr | 0,79 | 0,79 | 0,56 |
| V85+V86 | λ=0,3 | 144 | 5 / 5,3 | 19 / 23,4 | 54 292 kr | 37 513 kr | 0,69 | 0,69 | 0,46 |
| V85+V86 | λ=0,6 | 144 | 2 / 4,5 | 21 / 21,2 | 54 162 kr | 43 912 kr | 0,81 | 0,81 | 0,60 |
| V85+V86 | Ref A (λ=0) | 144 | 5 / 5,4 | 21 / 23,5 | 54 203 kr | 40 916 kr | 0,75 | 0,75 | 0,53 |
| V85+V86 | Ref A (λ=0,3) | 144 | 5 / 5,0 | 18 / 22,6 | 54 292 kr | 40 785 kr | 0,75 | 0,75 | 0,52 |
| V85+V86 | Ref A (λ=0,6) | 144 | 1 / 4,3 | 20 / 20,6 | 54 162 kr | 24 976 kr | 0,46 | 0,46 | 0,34 |
| V85+V86 | Ref B | 156 | 5 / 5,2 | 22 / 23,8 | 58 719 kr | 24 354 kr | 0,41 | 0,41 | 0,36 |
| Alla | λ=0 | 574 | 56 / 58,6 | 165 / 163,6 | 145 058 kr | 93 494 kr | 0,64 | 0,64 | 0,56 |
| Alla | λ=0,3 | 574 | 58 / 55,7 | 147 / 160,8 | 144 871 kr | 89 841 kr | 0,62 | 0,62 | 0,53 |
| Alla | λ=0,6 | 574 | 56 / 48,6 | 148 / 152,2 | 143 952 kr | 99 196 kr | 0,69 | 0,69 | 0,61 |
| Alla | Ref A (λ=0) | 574 | 56 / 57,0 | 166 / 161,5 | 145 058 kr | 95 532 kr | 0,66 | 0,66 | 0,57 |
| Alla | Ref A (λ=0,3) | 574 | 55 / 53,4 | 155 / 157,5 | 144 871 kr | 86 319 kr | 0,60 | 0,60 | 0,51 |
| Alla | Ref A (λ=0,6) | 574 | 55 / 46,5 | 138 / 148,7 | 143 952 kr | 74 518 kr | 0,52 | 0,52 | 0,47 |
| Alla | Ref B | 595 | 55 / 55,0 | 184 / 161,0 | 151 218 kr | 70 424 kr | 0,47 | 0,47 | 0,44 |

## Val av värdevikt (träningsperioden)

| λ | Avk./kr träning | Avk./kr utan ensam pott |
|---|---|---|
| λ=0 | 0,75 | 0,75 |
| λ=0,3 | 0,81 | 0,81 |
| λ=0,6 | 0,68 | 0,68 |

Vald värdevikt (högst avkastning utan ensam pott bland λ > 0 på träningen): **λ=0,3**.

## Avkastningsskillnad på valideringen (parad bootstrap, 90 %-intervall)

| Spel | Jämförelse | System×omg | Skillnad avk./kr [90 %] | Andel > 0 | Utan ensam pott [90 %] |
|---|---|---|---|---|---|
| V85 | λ=0,3 − Ref A (λ=0,3) | 94 | -0,25 [-0,53; -0,05] | 0 % | -0,25 [-0,53; -0,05] |
| V85 | λ=0,3 − λ=0 | 94 | -0,15 [-0,30; -0,02] | 2 % | -0,15 [-0,30; -0,02] |
| V85 | λ=0,3 − Ref B | 94 | 0,02 [-0,16; 0,19] | 58 % | 0,02 [-0,16; 0,19] |
| V85 | λ=0 − Ref A (λ=0) | 94 | -0,06 [-0,16; -0,00] | 4 % | -0,06 [-0,16; -0,00] |
| V85 | λ=0 − Ref B | 94 | 0,17 [0,03; 0,32] | 98 % | 0,17 [0,03; 0,32] |
| V86 | λ=0,3 − Ref A (λ=0,3) | 50 | 0,29 [0,08; 0,55] | 100 % | 0,29 [0,08; 0,55] |
| V86 | λ=0,3 − λ=0 | 50 | 0,01 [-1,39; 1,41] | 52 % | 0,01 [-1,39; 1,41] |
| V86 | λ=0,3 − Ref B | 50 | 0,90 [0,05; 2,24] | 97 % | 0,90 [0,05; 2,24] |
| V86 | λ=0 − Ref A (λ=0) | 50 | 0,21 [0,04; 0,42] | 100 % | 0,21 [0,04; 0,42] |
| V86 | λ=0 − Ref B | 50 | 0,89 [0,09; 2,17] | 99 % | 0,89 [0,09; 2,17] |
| V85+V86 | λ=0,3 − Ref A (λ=0,3) | 144 | -0,06 [-0,26; 0,10] | 33 % | -0,06 [-0,26; 0,10] |
| V85+V86 | λ=0,3 − λ=0 | 144 | -0,10 [-0,63; 0,41] | 35 % | -0,10 [-0,63; 0,41] |
| V85+V86 | λ=0,3 − Ref B | 144 | 0,32 [-0,01; 0,79] | 94 % | 0,32 [-0,01; 0,79] |
| V85+V86 | λ=0 − Ref A (λ=0) | 144 | 0,03 [-0,05; 0,12] | 74 % | 0,03 [-0,05; 0,12] |
| V85+V86 | λ=0 − Ref B | 144 | 0,42 [0,11; 0,87] | 100 % | 0,42 [0,11; 0,87] |
| Alla | λ=0,3 − Ref A (λ=0,3) | 574 | 0,02 [-0,06; 0,11] | 68 % | 0,02 [-0,06; 0,11] |
| Alla | λ=0,3 − λ=0 | 574 | -0,02 [-0,25; 0,22] | 41 % | -0,02 [-0,25; 0,22] |
| Alla | λ=0,3 − Ref B | 574 | 0,17 [-0,00; 0,37] | 95 % | 0,17 [-0,00; 0,37] |
| Alla | λ=0 − Ref A (λ=0) | 574 | -0,01 [-0,12; 0,07] | 43 % | -0,01 [-0,12; 0,07] |
| Alla | λ=0 − Ref B | 574 | 0,19 [0,04; 0,38] | 99 % | 0,19 [0,04; 0,38] |

## Kalibrering av förutsagd träff

| Period | λ | Spikar | Omg | Alla rätt faktiskt / förutsagt | z | Alla−1 faktiskt / förutsagt | z | Alla spikar höll faktiskt / förutsagt |
|---|---|---|---|---|---|---|---|---|
| träning | λ=0 | 1 | 127 | 22 / 18,6 | 0,85 | 45 / 43,2 | 0,34 | 75 / 72,4 |
| träning | λ=0 | 2 | 182 | 28 / 21,3 | 1,58 | 54 / 56,3 | -0,37 | 61 / 53,4 |
| träning | λ=0 | 3 | 176 | 17 / 15,8 | 0,32 | 57 / 51,8 | 0,87 | 28 / 22,5 |
| träning | λ=0 | 4 | 48 | 5 / 2,0 | 2,20 | 11 / 9,0 | 0,73 | 5 / 2,6 |
| träning | λ=0 | alla (beroende) | 533 | 72 / 57,7 | 2,03 | 167 / 160,3 | 0,64 | 169 / 150,9 |
| träning | λ=0,3 | 1 | 127 | 21 / 17,8 | 0,83 | 44 / 42,7 | 0,25 | 72 / 70,1 |
| träning | λ=0,3 | 2 | 182 | 24 / 20,2 | 0,92 | 52 / 55,4 | -0,56 | 52 / 50,9 |
| träning | λ=0,3 | 3 | 176 | 18 / 15,0 | 0,81 | 53 / 50,6 | 0,41 | 28 / 21,9 |
| träning | λ=0,3 | 4 | 48 | 2 / 1,9 | 0,08 | 16 / 8,8 | 2,72 | 5 / 2,5 |
| träning | λ=0,3 | alla (beroende) | 533 | 65 / 54,9 | 1,47 | 165 / 157,5 | 0,73 | 157 / 145,5 |
| träning | λ=0,6 | 1 | 127 | 20 / 15,9 | 1,12 | 37 / 40,9 | -0,74 | 69 / 67,1 |
| träning | λ=0,6 | 2 | 181 | 20 / 17,7 | 0,58 | 49 / 52,3 | -0,55 | 51 / 48,4 |
| träning | λ=0,6 | 3 | 175 | 13 / 13,7 | -0,20 | 51 / 48,2 | 0,48 | 25 / 20,9 |
| träning | λ=0,6 | 4 | 48 | 1 / 1,7 | -0,57 | 13 / 8,3 | 1,79 | 4 / 2,4 |
| träning | λ=0,6 | alla (beroende) | 531 | 54 / 49,0 | 0,76 | 150 / 149,7 | 0,03 | 149 / 138,7 |
| validering | λ=0 | 1 | 136 | 27 / 19,3 | 1,94 | 36 / 44,5 | -1,56 | 86 / 78,3 |
| validering | λ=0 | 2 | 199 | 16 / 21,7 | -1,32 | 70 / 58,3 | 1,87 | 41 / 56,7 |
| validering | λ=0 | 3 | 185 | 13 / 15,6 | -0,70 | 53 / 51,4 | 0,27 | 14 / 23,3 |
| validering | λ=0 | 4 | 54 | 0 / 2,0 | -1,46 | 6 / 9,4 | -1,25 | 0 / 2,9 |
| validering | λ=0 | alla (beroende) | 574 | 56 / 58,6 | -0,36 | 165 / 163,6 | 0,13 | 141 / 161,2 |
| validering | λ=0,3 | 1 | 136 | 26 / 18,5 | 1,92 | 33 / 44,0 | -2,04 | 84 / 77,6 |
| validering | λ=0,3 | 2 | 199 | 19 / 20,5 | -0,36 | 59 / 57,2 | 0,29 | 46 / 55,1 |
| validering | λ=0,3 | 3 | 185 | 13 / 14,7 | -0,48 | 50 / 50,3 | -0,05 | 15 / 22,6 |
| validering | λ=0,3 | 4 | 54 | 0 / 2,0 | -1,44 | 5 / 9,3 | -1,57 | 0 / 2,8 |
| validering | λ=0,3 | alla (beroende) | 574 | 58 / 55,7 | 0,33 | 147 / 160,8 | -1,31 | 145 / 158,1 |
| validering | λ=0,6 | 1 | 136 | 23 / 16,3 | 1,80 | 41 / 42,3 | -0,23 | 78 / 72,4 |
| validering | λ=0,6 | 2 | 199 | 22 / 17,6 | 1,13 | 51 / 53,7 | -0,44 | 50 / 50,8 |
| validering | λ=0,6 | 3 | 185 | 11 / 12,9 | -0,57 | 52 / 47,5 | 0,77 | 15 / 20,7 |
| validering | λ=0,6 | 4 | 54 | 0 / 1,8 | -1,38 | 4 / 8,7 | -1,78 | 0 / 2,7 |
| validering | λ=0,6 | alla (beroende) | 574 | 56 / 48,6 | 1,13 | 148 / 152,2 | -0,41 | 143 / 146,7 |

Täckning per avdelning (unika avdelning + urval i optimerarens system):

| Period | Förutsagd | n | Förutsagt | Faktiskt | z |
|---|---|---|---|---|---|
| träning | 0 %–50 % | 485 | 41,3 % | 42,1 % | 0,36 |
| träning | 50 %–60 % | 284 | 54,9 % | 52,5 % | -0,81 |
| träning | 60 %–70 % | 387 | 65,2 % | 63,3 % | -0,77 |
| träning | 70 %–80 % | 551 | 75,2 % | 76,0 % | 0,43 |
| träning | 80 %–90 % | 758 | 85,3 % | 86,9 % | 1,25 |
| träning | 90 %–100 % | 1044 | 95,2 % | 94,6 % | -0,94 |
| validering | 0 %–50 % | 556 | 40,2 % | 38,8 % | -0,65 |
| validering | 50 %–60 % | 319 | 55,5 % | 58,0 % | 0,90 |
| validering | 60 %–70 % | 456 | 65,2 % | 66,2 % | 0,45 |
| validering | 70 %–80 % | 657 | 75,2 % | 77,5 % | 1,35 |
| validering | 80 %–90 % | 904 | 85,1 % | 84,5 % | -0,48 |
| validering | 90 %–100 % | 1053 | 95,0 % | 95,4 % | 0,72 |

Samma system före kalibreringen av täckningen (summa kalibrerad chans för urvalet):

| Period | Förutsagd | n | Förutsagt | Faktiskt | z |
|---|---|---|---|---|---|
| träning | 0 %–50 % | 359 | 43,1 % | 38,4 % | -1,81 |
| träning | 50 %–60 % | 336 | 54,8 % | 50,6 % | -1,55 |
| träning | 60 %–70 % | 395 | 65,5 % | 62,5 % | -1,24 |
| träning | 70 %–80 % | 592 | 75,4 % | 74,8 % | -0,29 |
| träning | 80 %–90 % | 812 | 85,3 % | 86,6 % | 1,05 |
| träning | 90 %–100 % | 1015 | 95,0 % | 94,9 % | -0,12 |
| validering | 0 %–50 % | 457 | 42,8 % | 37,0 % | -2,51 |
| validering | 50 %–60 % | 317 | 55,5 % | 54,6 % | -0,33 |
| validering | 60 %–70 % | 481 | 65,4 % | 63,4 % | -0,92 |
| validering | 70 %–80 % | 706 | 75,3 % | 77,5 % | 1,32 |
| validering | 80 %–90 % | 969 | 85,1 % | 84,2 % | -0,76 |
| validering | 90 %–100 % | 1015 | 94,7 % | 95,7 % | 1,38 |

Spikar (unika spikhästar i optimerarens system), fack efter hästens råa kalibrerade chans (kravet är minst 35 %):

| Period | Rå chans | n | Förutsagt rå | Förutsagt kalibrerad | Faktiskt | z (kalibrerad) |
|---|---|---|---|---|---|---|
| träning | 35 %–45 % | 207 | 40,1 % | 35,6 % | 35,3 % | -0,11 |
| träning | 45 %–55 % | 240 | 49,9 % | 46,1 % | 50,0 % | 1,22 |
| träning | 55 %–70 % | 172 | 60,9 % | 58,2 % | 62,8 % | 1,22 |
| träning | 70 %–100 % | 48 | 74,5 % | 73,4 % | 72,9 % | -0,08 |
| validering | 35 %–45 % | 286 | 40,1 % | 35,6 % | 34,3 % | -0,49 |
| validering | 45 %–55 % | 222 | 49,4 % | 45,5 % | 43,7 % | -0,54 |
| validering | 55 %–70 % | 180 | 61,4 % | 58,8 % | 56,7 % | -0,58 |
| validering | 70 %–100 % | 52 | 75,1 % | 74,1 % | 78,8 % | 0,78 |

## Valfritt antal spikar (Max chans)

Optimeraren väljer själv mellan 0 och 4 spikar (sexloppsspel 0–3) inom samma budget, jämfört med ett fast antal. Spikar = genomsnittligt antal i de byggda systemen.

| Period | Spikar (inställning) | Omg | Spikar i snitt | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Avk./kr |
|---|---|---|---|---|---|---|
| träning | valfritt | 185 | 1,5 | 29 / 23,2 | 59 / 56,3 | 0,84 |
| träning | 1 | 127 | 1,0 | 22 / 18,6 | 45 / 43,2 | 0,91 |
| träning | 2 | 182 | 2,0 | 28 / 21,3 | 54 / 56,3 | 0,68 |
| träning | 3 | 176 | 3,0 | 17 / 15,8 | 57 / 51,8 | 0,79 |
| träning | 4 | 48 | 4,0 | 5 / 2,0 | 11 / 9,0 | 0,61 |
| validering | valfritt | 205 | 1,5 | 29 / 23,8 | 53 / 58,9 | 0,67 |
| validering | 1 | 136 | 1,0 | 27 / 19,3 | 36 / 44,5 | 0,83 |
| validering | 2 | 199 | 2,0 | 16 / 21,7 | 70 / 58,3 | 0,57 |
| validering | 3 | 185 | 3,0 | 13 / 15,6 | 53 / 51,4 | 0,81 |
| validering | 4 | 54 | 4,0 | 0 / 2,0 | 6 / 9,4 | 0,19 |

Parad jämförelse på samma omgångar (spel med 7–8 avdelningar), valfritt minus exakt antal:

| Period | Jämförelse | Omg | Alla rätt valfritt / exakt | Alla−1 valfritt / exakt | Skillnad avk./kr [90 %] |
|---|---|---|---|---|---|
| träning | valfritt − 2 | 57 | 5 / 6 | 16 / 12 | 0,07 [-0,16; 0,28] |
| träning | valfritt − 3 | 53 | 5 / 4 | 16 / 16 | 0,06 [-0,09; 0,20] |
| träning | valfritt − 4 | 48 | 5 / 5 | 15 / 11 | 0,05 [-0,33; 0,42] |
| validering | valfritt − 2 | 67 | 2 / 2 | 13 / 14 | -0,13 [-0,24; -0,02] |
| validering | valfritt − 3 | 64 | 2 / 3 | 12 / 10 | -0,63 [-1,72; 0,15] |
| validering | valfritt − 4 | 54 | 2 / 0 | 8 / 6 | 0,23 [-0,01; 0,48] |

## Märkena Understreckad och Överstreckad

Understreckad: r = chans/streck > 1,5 och chans ≥ 5 %. Överstreckad: r < 0,75 och streck ≥ 10 %. Alla travlopp med Grundchans (även omgångar som inte backtestades). Avkastning = vinnarspel 1 kr på slutoddset.

| Period | Märke | Hästar | Medel streck | Medel chans | Vann | Vann / streck | Avk./kr vinnarspel |
|---|---|---|---|---|---|---|---|
| träning | Understreckad | 327 | 7,6 % | 13,4 % | 13,5 % | 1,76 | 0,77 |
| träning | Överstreckad | 515 | 17,9 % | 11,7 % | 11,1 % | 0,62 | 0,79 |
| träning | Övriga | 13033 | 9,3 % | 9,5 % | 9,5 % | 1,02 | 0,69 |
| träning | Alla | 13875 | 9,6 % | 9,7 % | 9,7 % | 1,01 | 0,70 |
| validering | Understreckad | 362 | 6,7 % | 11,8 % | 10,2 % | 1,54 | 0,56 |
| validering | Överstreckad | 575 | 18,1 % | 12,1 % | 13,0 % | 0,72 | 0,90 |
| validering | Övriga | 14456 | 9,2 % | 9,3 % | 9,4 % | 1,02 | 0,69 |
| validering | Alla | 15393 | 9,4 % | 9,5 % | 9,5 % | 1,01 | 0,70 |

