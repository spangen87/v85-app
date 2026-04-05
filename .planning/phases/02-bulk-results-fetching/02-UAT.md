---
status: complete
phase: 02-bulk-results-fetching
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md
started: 2026-04-05T18:20:00Z
updated: 2026-04-05T18:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Alla laddade omgångar visas i listan
expected: Navigera till /evaluation. Sektionen "Laddade omgångar" visas och listar alla hämtade omgångar — inklusive de som saknar resultat, inte bara de med rättade avdelningar.
result: issue
reported: "Det flesta rättas korrekt. Men märker att tex V65 eller V64 ligger kvar i listan. Men de har ju inte 8 lopp så de är egentligen hämtade. Så det bör anpassas efter hur många lopp det är i aktuella tävlingen."
severity: major
fix_applied: "Added Query D (finish_position only, no formscore filter) for has_results check — commit 8e7a2c0"

### 2. Statusbadgar Klar / Saknar resultat
expected: Omgångar där alla avdelningar är rättade visar grön "Klar"-badge. Omgångar som saknar resultat visar gul "Saknar resultat"-badge.
result: pass

### 3. has_results kräver att alla avdelningar är klara
expected: En omgång som är delvis rättad (t.ex. 3 av 7 avdelningar har resultat) visas med gul "Saknar resultat"-badge, inte grön "Klar". (Detta täcker bugfixen som gjordes under verifiering.)
result: pass

### 4. Knappen "Hämta alla resultat" visas med korrekt antal
expected: Ovanför omgångslistan syns knappen "Hämta alla resultat (N)" där N är antalet omgångar utan resultat. Om inga omgångar saknar resultat visas knappen som inaktiv eller dold.
result: pass

### 5. Sekventiell hämtning — alla omgångar visas direkt med "Väntar..."
expected: Klicka på knappen. Alla väntande omgångar visas omedelbart med "Väntar..."-status. Varje omgång uppdateras sedan sekventiellt till sin slutstatus (inte avslöjad en i taget utan fördröjning i listan).
result: pass

### 6. HTTP 422 ger gul "Inte redo" — inte ett fel
expected: En omgång vars lopp ännu inte körts klart returnerar HTTP 422 från API:et. Den omgångens status visas som gul "Inte redo"-badge, inte röd "Fel".
result: skipped
reason: Kan inte trigga ett pågående lopp just nu för att verifiera 422-beteendet.

### 6b. Norska tävlingar som inte kan hämtas fastnar utan felmarkering
expected: En omgång som misslyckas med hämtning (t.ex. norska tävlingar som API:et inte stöder) visas med röd felstatus och tas bort från "väntande"-listan. Användaren kan ta bort sådana omgångar manuellt om de inte ska visas.
result: issue
reported: "Vissa tävlingar från Norge hämtas inte. De ligger som saknar resultat och det görs nya försök varje gång. Det framgår aldrig att det inte går. Borde försvinna från listan och markeras som fel, och jag borde kunna ta bort dem."
severity: major

### 6c. Listan "Laddade omgångar" är expanderad som standard — bör vara minimerad
expected: Listan "Laddade omgångar" är kollapsad/minimerad som standard och kan expanderas vid behov. Den är för lång för att visas fullt ut som standard.
result: issue
reported: "Vill att listan med laddade omgångar är minimerad som standard. Det blir en lång lista."
severity: minor

### 7. Knappen inaktiveras under hämtning och återaktiveras efter
expected: Direkt efter klick blir knappen inaktiv och byter text till "Hämtar...". Efter att batchen är klar återaktiveras knappen (eller texten ändras till "Alla resultat hämtade" om inga väntande omgångar kvarstår).
result: pass

## Summary

total: 9
passed: 5
issues: 3
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "V65/V64-omgångar med alla avdelningar rättade visas som klara"
  status: failed
  reason: "User reported: V65/V64 låg kvar i listan trots att alla lopp var hämtade"
  severity: major
  test: 1
  root_cause: "has_results använde Query B (formscore-filtrerad) för att räkna avdelningar med resultat — V65/V64-starters saknar formscore → resultRaceCount=0 → has_results=false"
  artifacts:
    - path: "app/(authenticated)/evaluation/page.tsx"
      issue: "racesWithResultsByGame byggdes från rows (Query B, formscore != null) istället för finish_position-only query"
  missing:
    - "Query D: starters med finish_position utan formscore-filter för has_results-beräkningen"
  fix_commit: "8e7a2c0"

- truth: "Omgångar som inte kan hämtas (t.ex. norska tävlingar) markeras med permanent felstatus och kan tas bort"
  status: failed
  reason: "User reported: Norska tävlingar hämtas inte — de ligger kvar som 'Saknar resultat' och nya försök görs varje gång. Det framgår aldrig att det inte går. Borde markeras som fel och kunna tas bort."
  severity: major
  test: 6b
  root_cause: ""
  artifacts: []
  missing:
    - "Permanent error state i BulkResultsButton när fetch misslyckas med icke-422 fel"
    - "Möjlighet att ta bort/dölja enskilda omgångar från listan"

- truth: "Listan 'Laddade omgångar' är minimerad/kollapsad som standard"
  status: failed
  reason: "User reported: Listan blir för lång — vill att den är minimerad som standard."
  severity: minor
  test: 6c
  root_cause: ""
  artifacts: []
  missing:
    - "Kollapsbar sektion för 'Laddade omgångar' med collapsed som defaulttillstånd"
