# Omkalibrering av CS (issue #69)

**Datum:** 2026-11-07
**Data:** Supabase, 484 avgjorda lopp (2026-02-28 – 2026-11-01) med exakt en vinnare bland de hästar som startade.
**Metod:** samma mål som `npm run backtest` (vinnarens andel av fältets CS-summa, log-loss), men körd som SQL direkt i databasen eftersom nyckeln för skriptet inte fanns till hands. Frågan finns i `2026-11-07-cs-omkalibrering.sql` och läser bara.

## Kontroll av SQL-versionen

- Med de gamla vikterna gav SQL-komponenterna **samma CS som lagrad `formscore`** för 3 545 av 3 546 hästar i lopp utan strukna hästar (en skilde en poäng på avrundning).
- Kuskform, galopprisk, klass, tid och vinstprocent stämde på fyra decimaler mot `computeComponents` i ett lopp (V85 Bjerke 2026-10-31, avd 4).
- Spårfaktorn är inte med: den kräver hästens hela starthistorik och har vikt 0 (se nedan).

## Uppdelning

Kronologisk, hela omgångar på var sin sida:

| | Lopp | Period |
|---|---|---|
| Träning | 339 | 2026-02-28 – 2026-08-22 |
| Test | 145 | 2026-08-26 – 2026-11-01 |

Strukna hästar (utan odds när loppet har odds) är borttagna ur fältet före normaliseringen.

## Sökning

Lokal sökning i steg om 0,05 (flytta 0,05 mellan två komponenter så länge träningsförlusten minskar) från tre startpunkter: de gamla vikterna, lika vikter och bara streck. **Alla tre landade i samma vikter:**

| Komponent | Gammal | Ny |
|---|---|---|
| Streck | 55 % | **85 %** |
| Form (senaste 5) | 5 % | 5 % |
| Jämnhet | 10 % | 5 % |
| Klass (intjänat per start, log) | – | **5 %** |
| Distansrekord | 20 % | 0 |
| Odds | 10 % | 0 |
| Kuskform, galopprisk, vinstprocent, tid | 0 | 0 |

## Resultat

| | Träning log-loss | Test log-loss | Test toppval | Test topp 3 |
|---|---|---|---|---|
| Gamla vikter | 1,999 | 1,990 | 33,8 % | 67,6 % |
| **Nya vikter** | **1,866** | **1,904** | 33,8 % | 69,7 % |
| Bara streck | 2,135 | 2,244 | 33,1 % | 69,0 % |

Parad skillnad på testdelen (nya − gamla, samma lopp): **−0,086 ± 0,079** (95 %). Förbättringen syns i båda perioderna och är signifikant på testdelen, men marginalen är liten med 145 lopp. Toppvalet är oförändrat; vinsten ligger i att CS-andelen fördelas bättre över fältet.

Varje komponent ensam på testdelen (log-loss): jämnhet 2,20, streck 2,24, galopp 2,41, form 2,46, odds 2,96, klass 3,17, tid 3,52, distans 4,04, vinstprocent 5,18, kusk 6,19. Toppvalssiffror för galopp och kusk ensamma är missvisande (många lika värden räknas som delad etta) och redovisas inte.

### Varför föll distans och odds bort

- **Distans** ger 0 till alla hästar som aldrig sprungit distansen (faktor 0,6 → 0 efter min–max). Det straffar för hårt och gör CS-andelen sämre.
- **Odds** normaliseras linjärt i odds, så en häst på 3 gånger och en på 6 gånger skiljer lika lite som 30 och 33. Strecket bär redan samma information i bättre form.

### Kuskform och galopprisk (frågan i #69)

Data finns nu (kusk-% för 90–95 % av hästarna sedan juni, senaste fem för alla), men ingen av dem får vikt. Kuskform rankad inom fältet fångar mest samma sak som strecket, och galopprisken från fem starter är för grov. Klass får en liten vikt.

### Värde-märket

Märket kräver CS > 55. På testperioden får 250 hästar CS > 55 med de nya vikterna mot 282 med de gamla; vinnare bland dem 71 mot 73. Märket blir något mer sällsynt och något träffsäkrare.

## Ej gjort

- **Spårtabellen** (#69, sista punkten) ligger kvar. Den har vikt 0 i CS och kräver fler starter per spår och bana innan en datadriven tabell går att skatta.
- **Lagrad CS** räknas om först när ändringen är deployad (`/admin` → "Räkna om alla CS-poäng" eller `npm run recompute-formscore`), så att gamla och nya omgångar får samma vikter.

## Slutsats

CS blir i praktiken strecket med en liten justering för form, jämnhet och klass. Det är vad datan stöder. Den oberoende bedömningen av hästarna finns i Grundchans, som inte påverkas.
