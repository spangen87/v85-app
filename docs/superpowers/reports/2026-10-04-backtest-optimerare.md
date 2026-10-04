# Backtest av systemoptimeraren (issue #98)

**Datum:** 2026-10-04
**Data:** ATG-cachen `.cache/atg`, 684 avgjorda omgångar 2025-09-01 – 2026-09-30.
**Körning:** `npm run fit-calibrated` och `npm run backtest-optimizer` (V65 kostar nu 1 kr per rad i `getRowPrice`). Siffrorna i bilagan kommer direkt från skriptet och gäller versionen med kalibrerad täckning (se Uppdatering).

## Uppdatering: kalibrering av täckningen (natten till 2026-10-05)

Första versionen överskattade P(alla rätt) på valideringen (56 träffar mot förutsagt 67,5) och spikarnas chans med 5–6 procentenheter. Felsökning:

- **Favoriterna överskattas lite i båda perioderna.** Loppets största favorit: träning 42,7 % förutsagt mot 41,7 % faktiskt, validering 41,8 % mot 39,0 %. Topp 2 och topp 3 stämmer bättre.
- **En temperatur på hela chansen (p^τ) räcker inte.** τ som maximerar likelihood blir 1,00 både på träningen och vid månatlig omskattning med växande fönster (som i drift). τ = 0,95 rättar valideringen men underskattar träningen tydligt (P(alla rätt) 71 mot 56,5, z = +2,1), så den kan inte motiveras med träningsdata. Temperaturen finns kvar som valbar parameter (`temperature` i modellfilen, `--temperature` i backtesten) men används inte.
- **Felet sitter i optimerarens urval, och det syns redan på träningen.** Avdelningar där optimeraren valt en smal täckning (spikar) överskattades i båda perioderna: under 50 % täckning förutsades 43,1 % mot 38,4 % faktiskt på träningen och 42,8 % mot 37,0 % på valideringen. Över 70 % täckning stämde allt. Optimeraren spikar där modellen är mest optimistisk, så felen samlas där (vinnarens förbannelse).

**Åtgärd:** täckningen per avdelning kalibreras med logit(c′) = α + β·logit(c), skattad med maximum likelihood på **träningsperiodens** egna system (pass 1, n = 3 509): α = −0,153, β = 1,091. Den används både i optimerarens mål (så att den inte överspikar) och i alla visade mått. Appen använder samma form skattad på alla omgångar med appens modell: α = −0,137, β = 1,127 (n = 7 377).

| Validering, λ = 0 | Utan kalibrering | Med kalibrering |
|---|---|---|
| Alla rätt, faktiskt / förutsagt (z) | 56 / 67,5 (−1,52) | 57 / 58,6 (−0,23) |
| Alla utom en | 165 / 174,0 (−0,83) | 163 / 163,3 (−0,03) |
| Spikar 35–45 % | 34,3 % / 40,1 % (−2,01) | 37,8 % / 39,8 % (−0,65) |
| Avdelningar under 50 % täckning | 37,0 % / 42,8 % (−2,51) | 39,0 % / 40,2 % (−0,61) |
| Avkastning per krona | 0,64 | 0,65 |

Med kalibreringen ligger alla rätt och alla utom en inom |z| < 2 i båda perioderna och för alla tre λ. På träningen blir förutsägelsen försiktig (alla rätt 69 mot 57,7, z = +1,6), vilket är det säkra hållet. Chansen att alla spikar håller är fortfarande något hög på valideringen (141 mot 161) men låg på träningen (168 mot 151). Sammantaget stämmer den (309 mot 313). Avkastningen ändras inte märkbart. Max chans slår fortfarande fördelning efter streck (Ref B) med +0,20 kr per krona på valideringen (90 %-intervall 0,04–0,39).

**Valfritt antal spikar:** när optimeraren själv väljer 0–4 spikar (sexloppsspel 0–3) blir det i snitt 1,4 spikar. På valideringen gav det 29 träffar med alla rätt och 0,67 kr per krona, mot 18 och 0,60 med exakt 2 spikar och 13 och 0,81 med exakt 3 (ungefär lika många omgångar). Det blir standard i appen.

**Status för acceptanskriterierna efter uppdateringen:** 1a lika (oförändrat), 1b inte uppfyllt (oförändrat; Balans och Värde ligger därför bakom "Visa fler förslag"), **2 uppfyllt**, 3 och 4 uppfyllda i appen (knappen håller budget och spikantal, texterna lovar ingen vinst).

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

## Bilaga – fullständiga tabeller från `npm run backtest-optimizer` (med kalibrerad täckning)

## Underlag

Kalibrerade vikter (träningsperioden, läge full): a = 0,117, b = 0,925, c = 0,093. Temperatur τ = 1,00.
Träningsperiod 2025-12-29 – 2026-05-12, valideringsperiod 2026-05-12 – 2026-09-30.
Kalibrering av täckningen (skattad på träningsperiodens system): logit(c′) = -0,153 + 1,091·logit(c), n = 3509. Optimeraren och alla förutsagda träffar nedan använder den.
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
| 2 | λ=0 | 33 | 2 / 1,2 | 3 / 5,1 | 21 % / 29 % | 12 389 kr | 9 262 kr | 0,75 | 0,75 | 0 |
| 2 | λ=0,3 | 33 | 2 / 1,2 | 2 / 5,0 | 21 % / 29 % | 12 474 kr | 7 837 kr | 0,63 | 0,63 | 0 |
| 2 | λ=0,6 | 33 | 2 / 1,1 | 2 / 4,7 | 24 % / 26 % | 12 390 kr | 8 172 kr | 0,66 | 0,66 | 0 |
| 2 | Ref A (λ=0) | 33 | 2 / 1,2 | 3 / 5,1 | 21 % / 29 % | 12 389 kr | 9 478 kr | 0,77 | 0,77 | 0 |
| 2 | Ref A (λ=0,3) | 33 | 2 / 1,2 | 4 / 4,9 | 21 % / 29 % | 12 474 kr | 14 107 kr | 1,13 | 1,13 | 0 |
| 2 | Ref A (λ=0,6) | 33 | 2 / 1,0 | 3 / 4,6 | 24 % / 26 % | 12 390 kr | 12 813 kr | 1,03 | 1,03 | 0 |
| 2 | Ref B | 33 | 1 / 1,2 | 4 / 4,9 | 18 % / 29 % | 12 486 kr | 5 080 kr | 0,41 | 0,41 | 0 |
| 3 | λ=0 | 33 | 1 / 1,2 | 3 / 5,2 | 6 % / 13 % | 12 390 kr | 6 692 kr | 0,54 | 0,54 | 0 |
| 3 | λ=0,3 | 33 | 1 / 1,1 | 1 / 5,0 | 6 % / 13 % | 12 480 kr | 3 344 kr | 0,27 | 0,27 | 0 |
| 3 | λ=0,6 | 33 | 0 / 1,0 | 4 / 4,7 | 0 % / 12 % | 12 423 kr | 3 635 kr | 0,29 | 0,29 | 0 |
| 3 | Ref A (λ=0) | 33 | 1 / 1,2 | 3 / 5,1 | 6 % / 13 % | 12 390 kr | 6 659 kr | 0,54 | 0,54 | 0 |
| 3 | Ref A (λ=0,3) | 33 | 1 / 1,1 | 1 / 4,9 | 6 % / 12 % | 12 480 kr | 3 516 kr | 0,28 | 0,28 | 0 |
| 3 | Ref A (λ=0,6) | 33 | 0 / 1,0 | 4 / 4,5 | 3 % / 11 % | 12 423 kr | 4 610 kr | 0,37 | 0,37 | 0 |
| 3 | Ref B | 33 | 1 / 1,1 | 2 / 5,0 | 6 % / 12 % | 12 348 kr | 3 828 kr | 0,31 | 0,31 | 0 |
| 4 | λ=0 | 28 | 0 / 0,9 | 3 / 4,2 | 0 % / 5 % | 10 490 kr | 2 864 kr | 0,27 | 0,27 | 5 |
| 4 | λ=0,3 | 28 | 0 / 0,8 | 2 / 4,1 | 0 % / 5 % | 10 519 kr | 1 401 kr | 0,13 | 0,13 | 5 |
| 4 | λ=0,6 | 28 | 0 / 0,8 | 2 / 3,9 | 0 % / 5 % | 10 584 kr | 654 kr | 0,06 | 0,06 | 5 |
| 4 | Ref A (λ=0) | 28 | 0 / 0,8 | 3 / 4,1 | 4 % / 5 % | 10 490 kr | 4 778 kr | 0,46 | 0,46 | 0 |
| 4 | Ref A (λ=0,3) | 28 | 0 / 0,8 | 2 / 4,0 | 4 % / 5 % | 10 519 kr | 3 466 kr | 0,33 | 0,33 | 0 |
| 4 | Ref A (λ=0,6) | 28 | 0 / 0,7 | 2 / 3,8 | 4 % / 5 % | 10 584 kr | 2 533 kr | 0,24 | 0,24 | 0 |
| 4 | Ref B | 33 | 0 / 0,8 | 3 / 4,4 | 0 % / 4 % | 12 366 kr | 3 329 kr | 0,27 | 0,27 | 0 |

### V86 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 19 | 0 / 1,0 | 7 / 3,7 | 16 % / 25 % | 7 212 kr | 5 314 kr | 0,74 | 0,74 | 1 |
| 2 | λ=0,3 | 19 | 1 / 0,9 | 7 / 3,6 | 21 % / 24 % | 7 170 kr | 18 269 kr | 2,55 | 2,55 | 1 |
| 2 | λ=0,6 | 19 | 0 / 0,8 | 6 / 3,4 | 21 % / 23 % | 7 155 kr | 14 775 kr | 2,06 | 2,06 | 1 |
| 2 | Ref A (λ=0) | 19 | 0 / 0,9 | 7 / 3,6 | 16 % / 25 % | 7 212 kr | 3 974 kr | 0,55 | 0,55 | 0 |
| 2 | Ref A (λ=0,3) | 19 | 1 / 0,9 | 6 / 3,5 | 21 % / 24 % | 7 170 kr | 15 589 kr | 2,17 | 2,17 | 0 |
| 2 | Ref A (λ=0,6) | 19 | 0 / 0,7 | 5 / 3,2 | 21 % / 23 % | 7 155 kr | 3 203 kr | 0,45 | 0,45 | 0 |
| 2 | Ref B | 20 | 1 / 0,9 | 6 / 3,6 | 20 % / 24 % | 7 572 kr | 3 577 kr | 0,47 | 0,47 | 0 |
| 3 | λ=0 | 17 | 2 / 0,8 | 4 / 3,4 | 12 % / 11 % | 6 408 kr | 17 978 kr | 2,81 | 2,81 | 3 |
| 3 | λ=0,3 | 17 | 1 / 0,8 | 6 / 3,3 | 12 % / 11 % | 6 384 kr | 7 335 kr | 1,15 | 1,15 | 3 |
| 3 | λ=0,6 | 17 | 0 / 0,6 | 8 / 3,0 | 12 % / 10 % | 6 416 kr | 15 277 kr | 2,38 | 2,38 | 3 |
| 3 | Ref A (λ=0) | 17 | 2 / 0,8 | 3 / 3,3 | 12 % / 11 % | 6 408 kr | 16 121 kr | 2,52 | 2,52 | 0 |
| 3 | Ref A (λ=0,3) | 17 | 1 / 0,7 | 4 / 3,2 | 12 % / 11 % | 6 384 kr | 4 713 kr | 0,74 | 0,74 | 0 |
| 3 | Ref A (λ=0,6) | 17 | 0 / 0,6 | 4 / 2,9 | 12 % / 10 % | 6 416 kr | 1 812 kr | 0,28 | 0,28 | 0 |
| 3 | Ref B | 20 | 1 / 0,8 | 4 / 3,5 | 5 % / 9 % | 7 545 kr | 4 052 kr | 0,54 | 0,54 | 0 |
| 4 | λ=0 | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 295 kr | 563 kr | 0,11 | 0,11 | 6 |
| 4 | λ=0,3 | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 248 kr | 547 kr | 0,10 | 0,10 | 6 |
| 4 | λ=0,6 | 14 | 0 / 0,4 | 2 / 2,2 | 0 % / 4 % | 5 257 kr | 590 kr | 0,11 | 0,11 | 6 |
| 4 | Ref A (λ=0) | 14 | 0 / 0,5 | 2 / 2,4 | 0 % / 4 % | 5 295 kr | 528 kr | 0,10 | 0,10 | 0 |
| 4 | Ref A (λ=0,3) | 14 | 0 / 0,4 | 2 / 2,3 | 0 % / 4 % | 5 248 kr | 546 kr | 0,10 | 0,10 | 0 |
| 4 | Ref A (λ=0,6) | 14 | 0 / 0,4 | 2 / 2,1 | 0 % / 4 % | 5 257 kr | 496 kr | 0,09 | 0,09 | 0 |
| 4 | Ref B | 17 | 1 / 0,5 | 3 / 2,5 | 6 % / 4 % | 6 402 kr | 4 488 kr | 0,70 | 0,70 | 3 |

### GS75 (7 avd, 385 kr)

| Spikar | System | Omg | 7 rätt faktiskt / förutsagt | 6 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 15 | 0 / 1,5 | 3 / 4,1 | 0 % / 35 % | 5 640 kr | 1 909 kr | 0,34 | 0,34 | 0 |
| 2 | λ=0,3 | 15 | 0 / 1,4 | 3 / 4,1 | 0 % / 34 % | 5 652 kr | 919 kr | 0,16 | 0,16 | 0 |
| 2 | λ=0,6 | 15 | 0 / 1,3 | 5 / 3,9 | 0 % / 33 % | 5 598 kr | 876 kr | 0,16 | 0,16 | 0 |
| 2 | Ref A (λ=0) | 15 | 0 / 1,4 | 3 / 4,1 | 0 % / 35 % | 5 640 kr | 1 909 kr | 0,34 | 0,34 | 0 |
| 2 | Ref A (λ=0,3) | 15 | 0 / 1,4 | 3 / 4,0 | 0 % / 34 % | 5 652 kr | 847 kr | 0,15 | 0,15 | 0 |
| 2 | Ref A (λ=0,6) | 15 | 0 / 1,3 | 4 / 3,9 | 0 % / 33 % | 5 598 kr | 760 kr | 0,14 | 0,14 | 0 |
| 2 | Ref B | 15 | 0 / 1,4 | 3 / 4,1 | 0 % / 34 % | 5 706 kr | 1 825 kr | 0,32 | 0,32 | 0 |
| 3 | λ=0 | 14 | 0 / 1,2 | 3 / 3,9 | 0 % / 16 % | 5 307 kr | 3 185 kr | 0,60 | 0,60 | 1 |
| 3 | λ=0,3 | 14 | 0 / 1,2 | 2 / 3,9 | 0 % / 16 % | 5 292 kr | 339 kr | 0,06 | 0,06 | 1 |
| 3 | λ=0,6 | 14 | 0 / 1,1 | 2 / 3,7 | 0 % / 15 % | 5 271 kr | 211 kr | 0,04 | 0,04 | 1 |
| 3 | Ref A (λ=0) | 14 | 0 / 1,2 | 3 / 3,9 | 0 % / 16 % | 5 307 kr | 3 185 kr | 0,60 | 0,60 | 0 |
| 3 | Ref A (λ=0,3) | 14 | 0 / 1,2 | 2 / 3,9 | 0 % / 16 % | 5 292 kr | 339 kr | 0,06 | 0,06 | 0 |
| 3 | Ref A (λ=0,6) | 14 | 0 / 1,1 | 2 / 3,7 | 0 % / 15 % | 5 271 kr | 211 kr | 0,04 | 0,04 | 0 |
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
| 1 | λ=0 | 63 | 9 / 8,5 | 14 / 20,4 | 57 % / 56 % | 12 012 kr | 8 517 kr | 0,71 | 0,71 | 1 |
| 1 | λ=0,3 | 63 | 6 / 8,3 | 15 / 20,3 | 56 % / 55 % | 12 008 kr | 6 219 kr | 0,52 | 0,52 | 1 |
| 1 | λ=0,6 | 63 | 6 / 8,0 | 16 / 20,0 | 52 % / 55 % | 12 016 kr | 7 204 kr | 0,60 | 0,60 | 1 |
| 1 | Ref A (λ=0) | 63 | 9 / 8,3 | 16 / 20,2 | 59 % / 56 % | 12 012 kr | 7 651 kr | 0,64 | 0,64 | 0 |
| 1 | Ref A (λ=0,3) | 63 | 6 / 8,0 | 17 / 20,0 | 57 % / 55 % | 12 008 kr | 5 492 kr | 0,46 | 0,46 | 0 |
| 1 | Ref A (λ=0,6) | 63 | 6 / 7,6 | 16 / 19,5 | 54 % / 55 % | 12 016 kr | 5 015 kr | 0,42 | 0,42 | 0 |
| 1 | Ref B | 64 | 8 / 8,0 | 19 / 20,0 | 61 % / 55 % | 12 192 kr | 7 984 kr | 0,65 | 0,65 | 0 |
| 2 | λ=0 | 60 | 6 / 7,7 | 26 / 20,5 | 18 % / 27 % | 11 616 kr | 7 548 kr | 0,65 | 0,65 | 4 |
| 2 | λ=0,3 | 60 | 5 / 7,6 | 23 / 20,4 | 20 % / 26 % | 11 546 kr | 5 755 kr | 0,50 | 0,50 | 4 |
| 2 | λ=0,6 | 60 | 6 / 7,1 | 19 / 19,9 | 22 % / 25 % | 11 505 kr | 5 009 kr | 0,44 | 0,44 | 4 |
| 2 | Ref A (λ=0) | 60 | 7 / 7,6 | 25 / 20,3 | 20 % / 26 % | 11 616 kr | 8 749 kr | 0,75 | 0,75 | 0 |
| 2 | Ref A (λ=0,3) | 60 | 6 / 7,5 | 22 / 20,2 | 22 % / 26 % | 11 546 kr | 7 083 kr | 0,61 | 0,61 | 0 |
| 2 | Ref A (λ=0,6) | 60 | 7 / 7,0 | 17 / 19,6 | 23 % / 25 % | 11 505 kr | 5 452 kr | 0,47 | 0,47 | 0 |
| 2 | Ref B | 63 | 7 / 7,3 | 26 / 20,5 | 21 % / 25 % | 12 177 kr | 8 350 kr | 0,69 | 0,69 | 1 |
| 3 | λ=0 | 56 | 4 / 5,2 | 20 / 17,6 | 7 % / 11 % | 10 952 kr | 6 763 kr | 0,62 | 0,62 | 8 |
| 3 | λ=0,3 | 56 | 6 / 5,1 | 17 / 17,5 | 11 % / 11 % | 10 944 kr | 8 791 kr | 0,80 | 0,80 | 8 |
| 3 | λ=0,6 | 56 | 5 / 4,8 | 19 / 16,9 | 11 % / 11 % | 10 792 kr | 10 288 kr | 0,95 | 0,95 | 8 |
| 3 | Ref A (λ=0) | 56 | 4 / 5,1 | 21 / 17,4 | 7 % / 11 % | 10 952 kr | 7 530 kr | 0,69 | 0,69 | 0 |
| 3 | Ref A (λ=0,3) | 56 | 6 / 5,0 | 19 / 17,3 | 11 % / 11 % | 10 944 kr | 9 846 kr | 0,90 | 0,90 | 0 |
| 3 | Ref A (λ=0,6) | 56 | 5 / 4,6 | 20 / 16,6 | 11 % / 11 % | 10 792 kr | 10 576 kr | 0,98 | 0,98 | 0 |
| 3 | Ref B | 54 | 5 / 4,7 | 24 / 16,5 | 9 % / 11 % | 10 500 kr | 6 937 kr | 0,66 | 0,66 | 10 |

### V65 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 73 | 17 / 10,8 | 22 / 24,0 | 68 % / 59 % | 14 010 kr | 12 688 kr | 0,91 | 0,91 | 0 |
| 1 | λ=0,3 | 73 | 18 / 10,4 | 21 / 23,8 | 68 % / 59 % | 13 946 kr | 12 712 kr | 0,91 | 0,91 | 0 |
| 1 | λ=0,6 | 73 | 18 / 8,7 | 21 / 22,5 | 62 % / 54 % | 13 976 kr | 12 125 kr | 0,87 | 0,87 | 0 |
| 1 | Ref A (λ=0) | 73 | 16 / 10,2 | 26 / 23,4 | 68 % / 59 % | 14 010 kr | 16 640 kr | 1,19 | 1,19 | 0 |
| 1 | Ref A (λ=0,3) | 73 | 14 / 9,7 | 27 / 23,1 | 68 % / 59 % | 13 946 kr | 11 381 kr | 0,82 | 0,82 | 0 |
| 1 | Ref A (λ=0,6) | 73 | 16 / 8,2 | 21 / 21,9 | 62 % / 53 % | 13 976 kr | 14 483 kr | 1,04 | 1,04 | 0 |
| 1 | Ref B | 73 | 13 / 10,0 | 27 / 23,2 | 71 % / 59 % | 14 036 kr | 9 815 kr | 0,70 | 0,70 | 0 |
| 2 | λ=0 | 72 | 10 / 10,3 | 29 / 24,6 | 28 % / 30 % | 13 922 kr | 6 235 kr | 0,45 | 0,45 | 1 |
| 2 | λ=0,3 | 72 | 12 / 9,7 | 26 / 24,1 | 31 % / 29 % | 13 828 kr | 10 173 kr | 0,74 | 0,74 | 1 |
| 2 | λ=0,6 | 72 | 13 / 8,1 | 22 / 22,7 | 32 % / 26 % | 13 753 kr | 9 696 kr | 0,71 | 0,71 | 1 |
| 2 | Ref A (λ=0) | 72 | 11 / 10,0 | 26 / 24,3 | 28 % / 30 % | 13 922 kr | 5 411 kr | 0,39 | 0,39 | 0 |
| 2 | Ref A (λ=0,3) | 72 | 12 / 9,2 | 26 / 23,5 | 31 % / 29 % | 13 828 kr | 7 501 kr | 0,54 | 0,54 | 0 |
| 2 | Ref A (λ=0,6) | 72 | 12 / 7,7 | 19 / 22,1 | 31 % / 26 % | 13 753 kr | 6 005 kr | 0,44 | 0,44 | 0 |
| 2 | Ref B | 73 | 10 / 9,6 | 31 / 24,0 | 30 % / 29 % | 14 077 kr | 6 459 kr | 0,46 | 0,46 | 0 |
| 3 | λ=0 | 65 | 6 / 7,2 | 23 / 21,3 | 9 % / 13 % | 12 744 kr | 4 237 kr | 0,33 | 0,33 | 8 |
| 3 | λ=0,3 | 65 | 5 / 6,8 | 27 / 20,8 | 9 % / 13 % | 12 620 kr | 8 591 kr | 0,68 | 0,68 | 8 |
| 3 | λ=0,6 | 65 | 5 / 6,1 | 22 / 19,9 | 9 % / 12 % | 12 343 kr | 6 460 kr | 0,52 | 0,52 | 8 |
| 3 | Ref A (λ=0) | 65 | 6 / 7,1 | 23 / 21,1 | 9 % / 13 % | 12 744 kr | 4 177 kr | 0,33 | 0,33 | 0 |
| 3 | Ref A (λ=0,3) | 65 | 6 / 6,6 | 28 / 20,4 | 11 % / 13 % | 12 620 kr | 5 059 kr | 0,40 | 0,40 | 0 |
| 3 | Ref A (λ=0,6) | 65 | 5 / 5,9 | 25 / 19,7 | 11 % / 12 % | 12 343 kr | 1 973 kr | 0,16 | 0,16 | 0 |
| 3 | Ref B | 70 | 7 / 7,0 | 28 / 21,9 | 10 % / 12 % | 13 572 kr | 4 088 kr | 0,30 | 0,30 | 3 |

## Utfall – träningsperioden

### V85 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 24 | 0 / 0,7 | 2 / 3,2 | 42 % / 31 % | 9 053 kr | 2 460 kr | 0,27 | 0,27 | 1 |
| 2 | λ=0,3 | 24 | 0 / 0,7 | 4 / 3,1 | 46 % / 31 % | 9 143 kr | 6 117 kr | 0,67 | 0,67 | 1 |
| 2 | λ=0,6 | 23 | 0 / 0,6 | 3 / 2,9 | 43 % / 30 % | 8 742 kr | 5 028 kr | 0,58 | 0,58 | 2 |
| 2 | Ref A (λ=0) | 24 | 0 / 0,6 | 3 / 3,1 | 42 % / 31 % | 9 053 kr | 3 532 kr | 0,39 | 0,39 | 0 |
| 2 | Ref A (λ=0,3) | 24 | 0 / 0,6 | 4 / 3,0 | 46 % / 31 % | 9 143 kr | 7 057 kr | 0,77 | 0,77 | 0 |
| 2 | Ref A (λ=0,6) | 23 | 0 / 0,6 | 3 / 2,8 | 43 % / 29 % | 8 742 kr | 5 342 kr | 0,61 | 0,61 | 0 |
| 2 | Ref B | 25 | 0 / 0,6 | 1 / 3,1 | 28 % / 30 % | 9 456 kr | 1 550 kr | 0,16 | 0,16 | 0 |
| 3 | λ=0 | 21 | 0 / 0,6 | 5 / 3,0 | 14 % / 13 % | 7 875 kr | 4 294 kr | 0,55 | 0,55 | 4 |
| 3 | λ=0,3 | 21 | 0 / 0,6 | 5 / 2,9 | 19 % / 12 % | 7 917 kr | 6 963 kr | 0,88 | 0,88 | 4 |
| 3 | λ=0,6 | 20 | 1 / 0,5 | 3 / 2,6 | 20 % / 13 % | 7 566 kr | 8 017 kr | 1,06 | 1,06 | 5 |
| 3 | Ref A (λ=0) | 21 | 0 / 0,6 | 5 / 3,0 | 14 % / 13 % | 7 875 kr | 4 206 kr | 0,53 | 0,53 | 0 |
| 3 | Ref A (λ=0,3) | 21 | 1 / 0,6 | 5 / 2,8 | 19 % / 12 % | 7 917 kr | 11 201 kr | 1,41 | 1,41 | 0 |
| 3 | Ref A (λ=0,6) | 20 | 1 / 0,5 | 4 / 2,6 | 20 % / 13 % | 7 566 kr | 9 051 kr | 1,20 | 1,20 | 0 |
| 3 | Ref B | 25 | 0 / 0,6 | 2 / 3,1 | 4 % / 11 % | 9 429 kr | 1 544 kr | 0,16 | 0,16 | 0 |
| 4 | λ=0 | 16 | 1 / 0,4 | 1 / 2,1 | 6 % / 4 % | 6 021 kr | 4 046 kr | 0,67 | 0,67 | 9 |
| 4 | λ=0,3 | 16 | 1 / 0,4 | 1 / 2,1 | 6 % / 4 % | 6 069 kr | 4 022 kr | 0,66 | 0,66 | 9 |
| 4 | λ=0,6 | 16 | 0 / 0,3 | 3 / 1,9 | 13 % / 4 % | 6 050 kr | 4 607 kr | 0,76 | 0,76 | 9 |
| 4 | Ref A (λ=0) | 16 | 1 / 0,4 | 1 / 2,1 | 6 % / 4 % | 6 021 kr | 3 647 kr | 0,61 | 0,61 | 0 |
| 4 | Ref A (λ=0,3) | 16 | 1 / 0,4 | 1 / 2,0 | 6 % / 4 % | 6 069 kr | 3 259 kr | 0,54 | 0,54 | 0 |
| 4 | Ref A (λ=0,6) | 16 | 1 / 0,3 | 3 / 1,8 | 19 % / 4 % | 6 050 kr | 7 403 kr | 1,22 | 1,22 | 0 |
| 4 | Ref B | 22 | 0 / 0,4 | 2 / 2,5 | 0 % / 4 % | 8 166 kr | 2 380 kr | 0,29 | 0,29 | 3 |

### V86 (8 avd, 385 kr)

| Spikar | System | Omg | 8 rätt faktiskt / förutsagt | 7 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 18 | 2 / 1,6 | 6 / 4,7 | 39 % / 33 % | 6 770 kr | 2 160 kr | 0,32 | 0,32 | 0 |
| 2 | λ=0,3 | 18 | 2 / 1,5 | 3 / 4,7 | 28 % / 32 % | 6 737 kr | 1 655 kr | 0,25 | 0,25 | 0 |
| 2 | λ=0,6 | 18 | 2 / 1,3 | 2 / 4,4 | 28 % / 31 % | 6 732 kr | 1 649 kr | 0,24 | 0,24 | 0 |
| 2 | Ref A (λ=0) | 18 | 2 / 1,5 | 7 / 4,6 | 39 % / 33 % | 6 770 kr | 2 320 kr | 0,34 | 0,34 | 0 |
| 2 | Ref A (λ=0,3) | 18 | 2 / 1,5 | 3 / 4,6 | 28 % / 32 % | 6 737 kr | 1 421 kr | 0,21 | 0,21 | 0 |
| 2 | Ref A (λ=0,6) | 18 | 2 / 1,3 | 2 / 4,3 | 28 % / 31 % | 6 732 kr | 1 269 kr | 0,19 | 0,19 | 0 |
| 2 | Ref B | 18 | 4 / 1,5 | 5 / 4,6 | 44 % / 32 % | 6 816 kr | 7 826 kr | 1,15 | 1,15 | 0 |
| 3 | λ=0 | 17 | 2 / 1,3 | 6 / 4,5 | 24 % / 16 % | 6 392 kr | 2 001 kr | 0,31 | 0,31 | 1 |
| 3 | λ=0,3 | 17 | 2 / 1,3 | 4 / 4,4 | 18 % / 15 % | 6 334 kr | 1 903 kr | 0,30 | 0,30 | 1 |
| 3 | λ=0,6 | 17 | 1 / 1,1 | 4 / 4,0 | 12 % / 15 % | 6 337 kr | 1 297 kr | 0,20 | 0,20 | 1 |
| 3 | Ref A (λ=0) | 17 | 3 / 1,3 | 6 / 4,5 | 24 % / 16 % | 6 392 kr | 10 226 kr | 1,60 | 1,60 | 0 |
| 3 | Ref A (λ=0,3) | 17 | 2 / 1,2 | 4 / 4,3 | 18 % / 15 % | 6 334 kr | 1 815 kr | 0,29 | 0,29 | 0 |
| 3 | Ref A (λ=0,6) | 17 | 2 / 1,0 | 2 / 3,9 | 18 % / 14 % | 6 337 kr | 1 793 kr | 0,28 | 0,28 | 0 |
| 3 | Ref B | 18 | 3 / 1,3 | 5 / 4,5 | 22 % / 15 % | 6 722 kr | 10 102 kr | 1,50 | 1,50 | 0 |
| 4 | λ=0 | 17 | 3 / 0,9 | 5 / 3,7 | 24 % / 7 % | 6 389 kr | 4 267 kr | 0,67 | 0,67 | 1 |
| 4 | λ=0,3 | 17 | 1 / 0,8 | 7 / 3,6 | 18 % / 6 % | 6 431 kr | 1 439 kr | 0,22 | 0,22 | 1 |
| 4 | λ=0,6 | 17 | 1 / 0,8 | 5 / 3,4 | 12 % / 6 % | 6 322 kr | 1 279 kr | 0,20 | 0,20 | 1 |
| 4 | Ref A (λ=0) | 17 | 4 / 0,9 | 4 / 3,7 | 24 % / 7 % | 6 389 kr | 5 111 kr | 0,80 | 0,80 | 0 |
| 4 | Ref A (λ=0,3) | 17 | 2 / 0,8 | 5 / 3,5 | 24 % / 6 % | 6 431 kr | 1 935 kr | 0,30 | 0,30 | 0 |
| 4 | Ref A (λ=0,6) | 17 | 2 / 0,7 | 3 / 3,4 | 18 % / 6 % | 6 322 kr | 1 775 kr | 0,28 | 0,28 | 0 |
| 4 | Ref B | 16 | 3 / 0,8 | 6 / 3,4 | 19 % / 6 % | 6 023 kr | 2 787 kr | 0,46 | 0,46 | 2 |

### GS75 (7 avd, 385 kr)

| Spikar | System | Omg | 7 rätt faktiskt / förutsagt | 6 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | λ=0 | 15 | 4 / 1,5 | 4 / 4,3 | 40 % / 28 % | 5 640 kr | 6 905 kr | 1,22 | 1,22 | 0 |
| 2 | λ=0,3 | 15 | 2 / 1,4 | 5 / 4,2 | 33 % / 27 % | 5 610 kr | 5 414 kr | 0,97 | 0,97 | 0 |
| 2 | λ=0,6 | 15 | 1 / 1,4 | 6 / 4,2 | 27 % / 26 % | 5 604 kr | 4 057 kr | 0,72 | 0,72 | 0 |
| 2 | Ref A (λ=0) | 15 | 4 / 1,5 | 4 / 4,2 | 40 % / 28 % | 5 640 kr | 6 860 kr | 1,22 | 1,22 | 0 |
| 2 | Ref A (λ=0,3) | 15 | 2 / 1,4 | 4 / 4,1 | 33 % / 27 % | 5 610 kr | 4 966 kr | 0,89 | 0,89 | 0 |
| 2 | Ref A (λ=0,6) | 15 | 1 / 1,3 | 5 / 4,0 | 27 % / 26 % | 5 604 kr | 3 609 kr | 0,64 | 0,64 | 0 |
| 2 | Ref B | 15 | 4 / 1,4 | 5 / 4,2 | 40 % / 27 % | 5 664 kr | 7 409 kr | 1,31 | 1,31 | 0 |
| 3 | λ=0 | 15 | 2 / 1,2 | 5 / 4,1 | 20 % / 13 % | 5 622 kr | 5 168 kr | 0,92 | 0,92 | 0 |
| 3 | λ=0,3 | 15 | 1 / 1,2 | 7 / 4,0 | 7 % / 13 % | 5 634 kr | 3 972 kr | 0,71 | 0,71 | 0 |
| 3 | λ=0,6 | 15 | 2 / 1,1 | 6 / 3,8 | 20 % / 12 % | 5 688 kr | 6 590 kr | 1,16 | 1,16 | 0 |
| 3 | Ref A (λ=0) | 15 | 2 / 1,2 | 5 / 4,0 | 20 % / 13 % | 5 622 kr | 5 138 kr | 0,91 | 0,91 | 0 |
| 3 | Ref A (λ=0,3) | 15 | 1 / 1,1 | 6 / 4,0 | 7 % / 13 % | 5 634 kr | 3 416 kr | 0,61 | 0,61 | 0 |
| 3 | Ref A (λ=0,6) | 15 | 1 / 1,0 | 6 / 3,8 | 13 % / 12 % | 5 688 kr | 3 635 kr | 0,64 | 0,64 | 0 |
| 3 | Ref B | 15 | 3 / 1,1 | 4 / 3,9 | 27 % / 12 % | 5 679 kr | 4 968 kr | 0,87 | 0,87 | 0 |
| 4 | λ=0 | 15 | 0 / 0,7 | 6 / 3,2 | 0 % / 5 % | 5 760 kr | 2 141 kr | 0,37 | 0,37 | 0 |
| 4 | λ=0,3 | 15 | 0 / 0,7 | 7 / 3,1 | 0 % / 5 % | 5 607 kr | 2 187 kr | 0,39 | 0,39 | 0 |
| 4 | λ=0,6 | 15 | 0 / 0,7 | 6 / 3,0 | 0 % / 5 % | 5 573 kr | 1 117 kr | 0,20 | 0,20 | 0 |
| 4 | Ref A (λ=0) | 15 | 0 / 0,7 | 6 / 3,2 | 0 % / 5 % | 5 760 kr | 2 141 kr | 0,37 | 0,37 | 0 |
| 4 | Ref A (λ=0,3) | 15 | 0 / 0,7 | 6 / 3,1 | 0 % / 5 % | 5 607 kr | 2 113 kr | 0,38 | 0,38 | 0 |
| 4 | Ref A (λ=0,6) | 15 | 0 / 0,7 | 5 / 3,0 | 0 % / 5 % | 5 573 kr | 1 071 kr | 0,19 | 0,19 | 0 |
| 4 | Ref B | 15 | 1 / 0,7 | 5 / 3,1 | 7 % / 5 % | 5 678 kr | 2 424 kr | 0,43 | 0,43 | 0 |

### V64 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 63 | 13 / 9,4 | 25 / 21,6 | 59 % / 56 % | 12 036 kr | 14 828 kr | 1,23 | 1,23 | 0 |
| 1 | λ=0,3 | 63 | 11 / 9,3 | 24 / 21,5 | 52 % / 55 % | 12 092 kr | 8 813 kr | 0,73 | 0,73 | 0 |
| 1 | λ=0,6 | 63 | 12 / 9,0 | 19 / 21,3 | 52 % / 55 % | 12 006 kr | 9 370 kr | 0,78 | 0,78 | 0 |
| 1 | Ref A (λ=0) | 63 | 13 / 9,3 | 21 / 21,4 | 59 % / 56 % | 12 036 kr | 12 828 kr | 1,07 | 1,07 | 0 |
| 1 | Ref A (λ=0,3) | 63 | 10 / 9,0 | 21 / 21,3 | 52 % / 55 % | 12 092 kr | 5 904 kr | 0,49 | 0,49 | 0 |
| 1 | Ref A (λ=0,6) | 63 | 11 / 8,8 | 17 / 21,1 | 52 % / 55 % | 12 006 kr | 7 390 kr | 0,62 | 0,62 | 0 |
| 1 | Ref B | 63 | 10 / 9,0 | 22 / 21,0 | 52 % / 56 % | 12 120 kr | 10 382 kr | 0,86 | 0,86 | 0 |
| 2 | λ=0 | 62 | 11 / 8,9 | 23 / 21,9 | 29 % / 29 % | 11 898 kr | 7 846 kr | 0,66 | 0,66 | 1 |
| 2 | λ=0,3 | 62 | 12 / 8,7 | 23 / 21,9 | 27 % / 28 % | 11 933 kr | 9 696 kr | 0,81 | 0,81 | 1 |
| 2 | λ=0,6 | 62 | 11 / 8,3 | 21 / 21,5 | 26 % / 28 % | 11 925 kr | 6 951 kr | 0,58 | 0,58 | 1 |
| 2 | Ref A (λ=0) | 62 | 12 / 8,8 | 24 / 21,8 | 29 % / 29 % | 11 898 kr | 8 355 kr | 0,70 | 0,70 | 0 |
| 2 | Ref A (λ=0,3) | 62 | 12 / 8,5 | 23 / 21,8 | 27 % / 28 % | 11 933 kr | 9 479 kr | 0,79 | 0,79 | 0 |
| 2 | Ref A (λ=0,6) | 62 | 11 / 8,1 | 22 / 21,4 | 26 % / 27 % | 11 925 kr | 6 940 kr | 0,58 | 0,58 | 0 |
| 2 | Ref B | 63 | 10 / 8,5 | 25 / 21,6 | 33 % / 28 % | 12 078 kr | 6 418 kr | 0,53 | 0,53 | 0 |
| 3 | λ=0 | 61 | 6 / 6,5 | 19 / 20,1 | 15 % / 13 % | 11 896 kr | 5 615 kr | 0,47 | 0,47 | 2 |
| 3 | λ=0,3 | 61 | 8 / 6,3 | 18 / 19,9 | 16 % / 13 % | 11 816 kr | 8 655 kr | 0,73 | 0,73 | 2 |
| 3 | λ=0,6 | 61 | 7 / 6,0 | 19 / 19,5 | 15 % / 12 % | 11 723 kr | 8 446 kr | 0,72 | 0,72 | 2 |
| 3 | Ref A (λ=0) | 61 | 6 / 6,3 | 19 / 19,9 | 15 % / 12 % | 11 896 kr | 5 309 kr | 0,45 | 0,45 | 0 |
| 3 | Ref A (λ=0,3) | 61 | 9 / 6,2 | 17 / 19,7 | 18 % / 12 % | 11 816 kr | 8 747 kr | 0,74 | 0,74 | 0 |
| 3 | Ref A (λ=0,6) | 61 | 7 / 5,9 | 20 / 19,3 | 15 % / 12 % | 11 723 kr | 8 149 kr | 0,70 | 0,70 | 0 |
| 3 | Ref B | 57 | 5 / 5,8 | 19 / 18,4 | 14 % / 12 % | 11 044 kr | 3 965 kr | 0,36 | 0,36 | 6 |

### V65 (6 avd, 200 kr)

| Spikar | System | Omg | 6 rätt faktiskt / förutsagt | 5 rätt faktiskt / förutsagt | Spikar höll faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Utan system |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | λ=0 | 64 | 9 / 9,2 | 19 / 21,5 | 58 % / 58 % | 12 172 kr | 7 238 kr | 0,59 | 0,59 | 0 |
| 1 | λ=0,3 | 64 | 9 / 8,8 | 21 / 21,3 | 61 % / 57 % | 12 156 kr | 11 690 kr | 0,96 | 0,96 | 0 |
| 1 | λ=0,6 | 64 | 9 / 7,6 | 21 / 20,2 | 56 % / 52 % | 12 232 kr | 23 237 kr | 1,90 | 1,90 | 0 |
| 1 | Ref A (λ=0) | 64 | 9 / 8,7 | 21 / 21,1 | 58 % / 58 % | 12 172 kr | 8 304 kr | 0,68 | 0,68 | 0 |
| 1 | Ref A (λ=0,3) | 64 | 10 / 8,2 | 19 / 20,6 | 59 % / 56 % | 12 156 kr | 10 614 kr | 0,87 | 0,87 | 0 |
| 1 | Ref A (λ=0,6) | 64 | 8 / 7,0 | 24 / 19,6 | 61 % / 51 % | 12 232 kr | 9 962 kr | 0,81 | 0,81 | 0 |
| 1 | Ref B | 64 | 8 / 8,4 | 22 / 20,7 | 61 % / 58 % | 12 226 kr | 7 157 kr | 0,59 | 0,59 | 0 |
| 2 | λ=0 | 63 | 10 / 8,6 | 21 / 22,0 | 32 % / 28 % | 12 162 kr | 11 181 kr | 0,92 | 0,92 | 1 |
| 2 | λ=0,3 | 63 | 10 / 8,1 | 18 / 21,6 | 32 % / 27 % | 12 078 kr | 25 134 kr | 2,08 | 2,08 | 1 |
| 2 | λ=0,6 | 63 | 8 / 7,0 | 17 / 20,3 | 30 % / 25 % | 12 094 kr | 11 425 kr | 0,94 | 0,94 | 1 |
| 2 | Ref A (λ=0) | 63 | 9 / 8,2 | 20 / 21,6 | 32 % / 28 % | 12 162 kr | 10 317 kr | 0,85 | 0,85 | 0 |
| 2 | Ref A (λ=0,3) | 63 | 9 / 7,5 | 16 / 20,9 | 30 % / 26 % | 12 078 kr | 10 330 kr | 0,86 | 0,86 | 0 |
| 2 | Ref A (λ=0,6) | 63 | 9 / 6,5 | 13 / 19,6 | 27 % / 24 % | 12 094 kr | 10 176 kr | 0,84 | 0,84 | 0 |
| 2 | Ref B | 64 | 7 / 7,9 | 21 / 21,3 | 25 % / 27 % | 12 350 kr | 5 703 kr | 0,46 | 0,46 | 0 |
| 3 | λ=0 | 62 | 6 / 6,2 | 24 / 20,1 | 15 % / 12 % | 12 100 kr | 8 110 kr | 0,67 | 0,67 | 2 |
| 3 | λ=0,3 | 62 | 6 / 5,9 | 20 / 19,6 | 15 % / 12 % | 12 047 kr | 8 316 kr | 0,69 | 0,69 | 2 |
| 3 | λ=0,6 | 62 | 3 / 5,3 | 22 / 18,7 | 11 % / 11 % | 11 862 kr | 6 421 kr | 0,54 | 0,54 | 2 |
| 3 | Ref A (λ=0) | 62 | 6 / 5,9 | 22 / 19,6 | 11 % / 12 % | 12 100 kr | 8 834 kr | 0,73 | 0,73 | 0 |
| 3 | Ref A (λ=0,3) | 62 | 4 / 5,5 | 24 / 18,9 | 11 % / 11 % | 12 047 kr | 6 296 kr | 0,52 | 0,52 | 0 |
| 3 | Ref A (λ=0,6) | 62 | 4 / 5,0 | 21 / 18,2 | 10 % / 10 % | 11 862 kr | 6 510 kr | 0,55 | 0,55 | 0 |
| 3 | Ref B | 63 | 7 / 5,6 | 23 / 19,4 | 13 % / 11 % | 12 364 kr | 10 499 kr | 0,85 | 0,85 | 1 |

## Sammanslaget – träningsperioden

| Spel | System | System×omg | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Avk./kr utan största utdelningen |
|---|---|---|---|---|---|---|---|---|---|
| V85+V86 | λ=0 | 113 | 8 / 5,5 | 25 / 21,4 | 42 499 kr | 19 228 kr | 0,45 | 0,45 | 0,40 |
| V85+V86 | λ=0,3 | 113 | 6 / 5,2 | 24 / 20,9 | 42 630 kr | 22 099 kr | 0,52 | 0,52 | 0,47 |
| V85+V86 | λ=0,6 | 111 | 5 / 4,6 | 20 / 19,4 | 41 748 kr | 21 877 kr | 0,52 | 0,52 | 0,48 |
| V85+V86 | Ref A (λ=0) | 113 | 10 / 5,3 | 26 / 21,0 | 42 499 kr | 29 042 kr | 0,68 | 0,68 | 0,49 |
| V85+V86 | Ref A (λ=0,3) | 113 | 8 / 5,0 | 22 / 20,4 | 42 630 kr | 26 688 kr | 0,63 | 0,63 | 0,56 |
| V85+V86 | Ref A (λ=0,6) | 111 | 8 / 4,4 | 17 / 18,8 | 41 748 kr | 26 633 kr | 0,64 | 0,64 | 0,58 |
| V85+V86 | Ref B | 124 | 10 / 5,2 | 21 / 21,2 | 46 611 kr | 26 189 kr | 0,56 | 0,56 | 0,39 |
| Alla | λ=0 | 533 | 69 / 57,7 | 171 / 160,1 | 131 785 kr | 88 260 kr | 0,67 | 0,67 | 0,64 |
| Alla | λ=0,3 | 533 | 65 / 55,6 | 167 / 158,1 | 131 603 kr | 105 976 kr | 0,81 | 0,81 | 0,71 |
| Alla | λ=0,6 | 531 | 58 / 50,9 | 157 / 151,9 | 130 455 kr | 99 491 kr | 0,76 | 0,76 | 0,73 |
| Alla | Ref A (λ=0) | 533 | 71 / 56,0 | 168 / 157,8 | 131 785 kr | 97 128 kr | 0,74 | 0,74 | 0,68 |
| Alla | Ref A (λ=0,3) | 533 | 65 / 53,2 | 158 / 154,8 | 131 603 kr | 88 553 kr | 0,67 | 0,67 | 0,65 |
| Alla | Ref A (λ=0,6) | 531 | 60 / 48,7 | 150 / 148,8 | 130 455 kr | 84 075 kr | 0,64 | 0,64 | 0,62 |
| Alla | Ref B | 543 | 65 / 53,5 | 167 / 154,9 | 135 814 kr | 85 114 kr | 0,63 | 0,63 | 0,57 |

## Sammanslaget – valideringsperioden

| Spel | System | System×omg | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Insats | Utdelning | Avk./kr | Avk./kr utan ensam pott | Avk./kr utan största utdelningen |
|---|---|---|---|---|---|---|---|---|---|
| V85+V86 | λ=0 | 144 | 5 / 5,5 | 22 / 24,0 | 54 184 kr | 42 673 kr | 0,79 | 0,79 | 0,56 |
| V85+V86 | λ=0,3 | 144 | 5 / 5,3 | 20 / 23,5 | 54 275 kr | 38 733 kr | 0,71 | 0,71 | 0,48 |
| V85+V86 | λ=0,6 | 144 | 2 / 4,7 | 24 / 21,8 | 54 224 kr | 43 103 kr | 0,79 | 0,79 | 0,59 |
| V85+V86 | Ref A (λ=0) | 144 | 5 / 5,4 | 21 / 23,5 | 54 184 kr | 41 538 kr | 0,77 | 0,77 | 0,54 |
| V85+V86 | Ref A (λ=0,3) | 144 | 5 / 5,1 | 19 / 22,8 | 54 275 kr | 41 937 kr | 0,77 | 0,77 | 0,54 |
| V85+V86 | Ref A (λ=0,6) | 144 | 2 / 4,5 | 20 / 21,1 | 54 224 kr | 25 467 kr | 0,47 | 0,47 | 0,35 |
| V85+V86 | Ref B | 156 | 5 / 5,2 | 22 / 23,8 | 58 719 kr | 24 354 kr | 0,41 | 0,41 | 0,36 |
| Alla | λ=0 | 574 | 57 / 58,6 | 163 / 163,3 | 144 995 kr | 94 240 kr | 0,65 | 0,65 | 0,56 |
| Alla | λ=0,3 | 574 | 57 / 56,6 | 155 / 161,2 | 144 719 kr | 92 717 kr | 0,64 | 0,64 | 0,55 |
| Alla | λ=0,6 | 574 | 55 / 50,6 | 151 / 154,2 | 143 894 kr | 95 457 kr | 0,66 | 0,66 | 0,58 |
| Alla | Ref A (λ=0) | 574 | 58 / 57,0 | 165 / 161,1 | 144 995 kr | 97 275 kr | 0,67 | 0,67 | 0,59 |
| Alla | Ref A (λ=0,3) | 574 | 55 / 54,3 | 164 / 157,9 | 144 719 kr | 89 970 kr | 0,62 | 0,62 | 0,53 |
| Alla | Ref A (λ=0,6) | 574 | 53 / 48,4 | 145 / 150,9 | 143 894 kr | 70 427 kr | 0,49 | 0,49 | 0,45 |
| Alla | Ref B | 595 | 55 / 55,0 | 184 / 161,0 | 151 218 kr | 70 424 kr | 0,47 | 0,47 | 0,44 |

## Val av värdevikt (träningsperioden)

| λ | Avk./kr träning | Avk./kr utan ensam pott |
|---|---|---|
| λ=0 | 0,67 | 0,67 |
| λ=0,3 | 0,81 | 0,81 |
| λ=0,6 | 0,76 | 0,76 |

Vald värdevikt (högst avkastning utan ensam pott bland λ > 0 på träningen): **λ=0,3**.

## Avkastningsskillnad på valideringen (parad bootstrap, 90 %-intervall)

| Spel | Jämförelse | System×omg | Skillnad avk./kr [90 %] | Andel > 0 | Utan ensam pott [90 %] |
|---|---|---|---|---|---|
| V85 | λ=0,3 − Ref A (λ=0,3) | 94 | -0,24 [-0,53; -0,04] | 0 % | -0,24 [-0,53; -0,04] |
| V85 | λ=0,3 − λ=0 | 94 | -0,18 [-0,33; -0,05] | 1 % | -0,18 [-0,33; -0,05] |
| V85 | λ=0,3 − Ref B | 94 | 0,01 [-0,17; 0,19] | 55 % | 0,01 [-0,17; 0,19] |
| V85 | λ=0 − Ref A (λ=0) | 94 | -0,06 [-0,16; -0,00] | 4 % | -0,06 [-0,16; -0,00] |
| V85 | λ=0 − Ref B | 94 | 0,19 [0,06; 0,33] | 99 % | 0,19 [0,06; 0,33] |
| V86 | λ=0,3 − Ref A (λ=0,3) | 50 | 0,28 [0,08; 0,53] | 100 % | 0,28 [0,08; 0,53] |
| V86 | λ=0,3 − λ=0 | 50 | 0,13 [-1,19; 1,47] | 65 % | 0,13 [-1,19; 1,47] |
| V86 | λ=0,3 − Ref B | 50 | 0,98 [0,16; 2,31] | 100 % | 0,98 [0,16; 2,31] |
| V86 | λ=0 − Ref A (λ=0) | 50 | 0,17 [0,01; 0,37] | 98 % | 0,17 [0,01; 0,37] |
| V86 | λ=0 − Ref B | 50 | 0,85 [0,05; 2,12] | 98 % | 0,85 [0,05; 2,12] |
| V85+V86 | λ=0,3 − Ref A (λ=0,3) | 144 | -0,06 [-0,26; 0,10] | 33 % | -0,06 [-0,26; 0,10] |
| V85+V86 | λ=0,3 − λ=0 | 144 | -0,07 [-0,58; 0,42] | 36 % | -0,07 [-0,58; 0,42] |
| V85+V86 | λ=0,3 − Ref B | 144 | 0,34 [0,02; 0,81] | 97 % | 0,34 [0,02; 0,81] |
| V85+V86 | λ=0 − Ref A (λ=0) | 144 | 0,02 [-0,07; 0,11] | 64 % | 0,02 [-0,07; 0,11] |
| V85+V86 | λ=0 − Ref B | 144 | 0,42 [0,11; 0,87] | 100 % | 0,42 [0,11; 0,87] |
| Alla | λ=0,3 − Ref A (λ=0,3) | 574 | 0,02 [-0,07; 0,11] | 64 % | 0,02 [-0,07; 0,11] |
| Alla | λ=0,3 − λ=0 | 574 | -0,01 [-0,22; 0,22] | 46 % | -0,01 [-0,22; 0,22] |
| Alla | λ=0,3 − Ref B | 574 | 0,19 [0,02; 0,39] | 98 % | 0,19 [0,02; 0,39] |
| Alla | λ=0 − Ref A (λ=0) | 574 | -0,02 [-0,13; 0,06] | 38 % | -0,02 [-0,13; 0,06] |
| Alla | λ=0 − Ref B | 574 | 0,20 [0,04; 0,39] | 99 % | 0,20 [0,04; 0,39] |

## Kalibrering av förutsagd träff

| Period | λ | Spikar | Omg | Alla rätt faktiskt / förutsagt | z | Alla−1 faktiskt / förutsagt | z | Alla spikar höll faktiskt / förutsagt |
|---|---|---|---|---|---|---|---|---|
| träning | λ=0 | 1 | 127 | 22 / 18,7 | 0,85 | 44 / 43,1 | 0,17 | 74 / 72,5 |
| träning | λ=0 | 2 | 182 | 27 / 21,3 | 1,34 | 56 / 56,1 | -0,02 | 61 / 53,5 |
| träning | λ=0 | 3 | 176 | 16 / 15,8 | 0,05 | 59 / 51,8 | 1,21 | 28 / 22,6 |
| träning | λ=0 | 4 | 48 | 4 / 2,0 | 1,47 | 12 / 9,0 | 1,10 | 5 / 2,6 |
| träning | λ=0 | alla (beroende) | 533 | 69 / 57,7 | 1,60 | 171 / 160,1 | 1,05 | 168 / 151,2 |
| träning | λ=0,3 | 1 | 127 | 20 / 18,1 | 0,50 | 45 / 42,8 | 0,42 | 72 / 71,0 |
| träning | λ=0,3 | 2 | 182 | 26 / 20,5 | 1,32 | 53 / 55,6 | -0,43 | 58 / 51,9 |
| träning | λ=0,3 | 3 | 176 | 17 / 15,2 | 0,50 | 54 / 50,8 | 0,53 | 27 / 22,0 |
| träning | λ=0,3 | 4 | 48 | 2 / 1,9 | 0,07 | 15 / 8,8 | 2,33 | 4 / 2,6 |
| träning | λ=0,3 | alla (beroende) | 533 | 65 / 55,6 | 1,35 | 167 / 158,1 | 0,86 | 161 / 147,4 |
| träning | λ=0,6 | 1 | 127 | 21 / 16,6 | 1,19 | 40 / 41,5 | -0,29 | 69 / 67,9 |
| träning | λ=0,6 | 2 | 181 | 22 / 18,6 | 0,84 | 49 / 53,4 | -0,72 | 54 / 49,3 |
| träning | λ=0,6 | 3 | 175 | 14 / 14,0 | 0,01 | 54 / 48,7 | 0,91 | 25 / 21,1 |
| träning | λ=0,6 | 4 | 48 | 1 / 1,7 | -0,58 | 14 / 8,4 | 2,16 | 4 / 2,4 |
| träning | λ=0,6 | alla (beroende) | 531 | 58 / 50,9 | 1,06 | 157 / 151,9 | 0,49 | 152 / 140,7 |
| validering | λ=0 | 1 | 136 | 26 / 19,3 | 1,69 | 36 / 44,4 | -1,54 | 86 / 78,3 |
| validering | λ=0 | 2 | 199 | 18 / 21,7 | -0,86 | 68 / 58,1 | 1,57 | 41 / 56,9 |
| validering | λ=0 | 3 | 185 | 13 / 15,6 | -0,71 | 53 / 51,4 | 0,27 | 14 / 23,4 |
| validering | λ=0 | 4 | 54 | 0 / 2,0 | -1,46 | 6 / 9,4 | -1,25 | 0 / 2,9 |
| validering | λ=0 | alla (beroende) | 574 | 57 / 58,6 | -0,23 | 163 / 163,3 | -0,03 | 141 / 161,4 |
| validering | λ=0,3 | 1 | 136 | 24 / 18,7 | 1,34 | 36 / 44,1 | -1,49 | 85 / 77,7 |
| validering | λ=0,3 | 2 | 199 | 20 / 20,9 | -0,21 | 61 / 57,3 | 0,58 | 45 / 56,0 |
| validering | λ=0,3 | 3 | 185 | 13 / 15,0 | -0,55 | 53 / 50,5 | 0,42 | 16 / 22,9 |
| validering | λ=0,3 | 4 | 54 | 0 / 2,0 | -1,44 | 5 / 9,3 | -1,56 | 0 / 2,8 |
| validering | λ=0,3 | alla (beroende) | 574 | 57 / 56,6 | 0,06 | 155 / 161,2 | -0,59 | 146 / 159,4 |
| validering | λ=0,6 | 1 | 136 | 24 / 16,8 | 1,92 | 37 / 42,6 | -1,04 | 78 / 74,0 |
| validering | λ=0,6 | 2 | 199 | 21 / 18,3 | 0,67 | 54 / 54,6 | -0,10 | 48 / 52,3 |
| validering | λ=0,6 | 3 | 185 | 10 / 13,6 | -1,03 | 55 / 48,2 | 1,17 | 14 / 21,5 |
| validering | λ=0,6 | 4 | 54 | 0 / 1,9 | -1,40 | 5 / 8,9 | -1,45 | 0 / 2,8 |
| validering | λ=0,6 | alla (beroende) | 574 | 55 / 50,6 | 0,67 | 151 / 154,2 | -0,31 | 140 / 150,5 |

Täckning per avdelning (unika avdelning + urval i optimerarens system):

| Period | Förutsagd | n | Förutsagt | Faktiskt | z |
|---|---|---|---|---|---|
| träning | 0 %–50 % | 456 | 41,3 % | 42,1 % | 0,37 |
| träning | 50 %–60 % | 264 | 54,9 % | 51,9 % | -0,98 |
| träning | 60 %–70 % | 385 | 65,2 % | 63,1 % | -0,87 |
| träning | 70 %–80 % | 567 | 75,3 % | 76,0 % | 0,39 |
| träning | 80 %–90 % | 777 | 85,3 % | 87,0 % | 1,34 |
| träning | 90 %–100 % | 1004 | 95,1 % | 94,5 % | -0,90 |
| validering | 0 %–50 % | 534 | 40,2 % | 39,0 % | -0,61 |
| validering | 50 %–60 % | 302 | 55,5 % | 57,6 % | 0,75 |
| validering | 60 %–70 % | 446 | 65,3 % | 65,2 % | -0,04 |
| validering | 70 %–80 % | 665 | 75,2 % | 77,7 % | 1,54 |
| validering | 80 %–90 % | 904 | 85,0 % | 84,8 % | -0,16 |
| validering | 90 %–100 % | 1015 | 94,8 % | 95,2 % | 0,50 |

Samma system före kalibreringen av täckningen (summa kalibrerad chans för urvalet):

| Period | Förutsagd | n | Förutsagt | Faktiskt | z |
|---|---|---|---|---|---|
| träning | 0 %–50 % | 341 | 43,2 % | 38,7 % | -1,69 |
| träning | 50 %–60 % | 311 | 54,9 % | 50,2 % | -1,67 |
| träning | 60 %–70 % | 387 | 65,6 % | 62,3 % | -1,38 |
| träning | 70 %–80 % | 604 | 75,4 % | 74,8 % | -0,32 |
| träning | 80 %–90 % | 836 | 85,2 % | 86,6 % | 1,12 |
| träning | 90 %–100 % | 974 | 94,8 % | 94,8 % | -0,11 |
| validering | 0 %–50 % | 440 | 42,9 % | 36,6 % | -2,66 |
| validering | 50 %–60 % | 301 | 55,5 % | 54,8 % | -0,23 |
| validering | 60 %–70 % | 464 | 65,5 % | 62,3 % | -1,45 |
| validering | 70 %–80 % | 715 | 75,3 % | 77,8 % | 1,52 |
| validering | 80 %–90 % | 968 | 85,0 % | 84,7 % | -0,29 |
| validering | 90 %–100 % | 978 | 94,6 % | 95,3 % | 1,03 |

Spikar (unika spikhästar i optimerarens system) — kontroll av kravet på 35 % chans:

| Period | Förutsagd | n | Förutsagt | Faktiskt | z |
|---|---|---|---|---|---|
| träning | 35 %–45 % | 203 | 40,1 % | 40,9 % | 0,24 |
| träning | 45 %–55 % | 204 | 49,5 % | 53,9 % | 1,27 |
| träning | 55 %–70 % | 128 | 61,3 % | 69,5 % | 1,91 |
| träning | 70 %–100 % | 37 | 74,8 % | 67,6 % | -1,01 |
| validering | 35 %–45 % | 262 | 39,8 % | 37,8 % | -0,65 |
| validering | 45 %–55 % | 165 | 49,3 % | 46,1 % | -0,84 |
| validering | 55 %–70 % | 143 | 61,0 % | 58,7 % | -0,56 |
| validering | 70 %–100 % | 45 | 75,0 % | 77,8 % | 0,44 |

## Valfritt antal spikar (Max chans)

Optimeraren väljer själv mellan 0 och 4 spikar (sexloppsspel 0–3) inom samma budget, jämfört med ett fast antal. Spikar = genomsnittligt antal i de byggda systemen.

| Period | Spikar (inställning) | Omg | Spikar i snitt | Alla rätt faktiskt / förutsagt | Alla−1 faktiskt / förutsagt | Avk./kr |
|---|---|---|---|---|---|---|
| träning | valfritt | 185 | 1,4 | 28 / 23,2 | 59 / 56,2 | 0,84 |
| träning | 1 | 127 | 1,0 | 22 / 18,7 | 44 / 43,1 | 0,91 |
| träning | 2 | 182 | 2,0 | 27 / 21,3 | 56 / 56,1 | 0,67 |
| träning | 3 | 176 | 3,0 | 16 / 15,8 | 59 / 51,8 | 0,57 |
| träning | 4 | 48 | 4,0 | 4 / 2,0 | 12 / 9,0 | 0,58 |
| validering | valfritt | 205 | 1,4 | 29 / 23,8 | 50 / 58,7 | 0,67 |
| validering | 1 | 136 | 1,0 | 26 / 19,3 | 36 / 44,4 | 0,81 |
| validering | 2 | 199 | 2,0 | 18 / 21,7 | 68 / 58,1 | 0,60 |
| validering | 3 | 185 | 3,0 | 13 / 15,6 | 53 / 51,4 | 0,81 |
| validering | 4 | 54 | 4,0 | 0 / 2,0 | 6 / 9,4 | 0,19 |

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

