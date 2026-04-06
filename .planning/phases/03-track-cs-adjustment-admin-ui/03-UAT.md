---
status: complete
phase: 03-track-cs-adjustment-admin-ui
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:01:00Z
---

## Current Test

[testing complete]

## Tests

### 1. TrackAdjustmentBadge i HorseCard
expected: Öppna startsidan med ett spel laddat. Om ett spår är konfigurerat med open_stretch-banor eller kort-lopp-tröskel, och en häst träffar en modifierare, ska ett grönt ↑ eller rött ↓-märke visas direkt efter ScoreBadge i kompakt vy. Tooltip visar t.ex. "Open stretch: +6 CS-poäng (spår 2, Solvalla)". Hästar utan träff visar inget märke.
result: pass
note: Röda pilar (kort lopp) syns — inga gröna denna omgång, vilket är korrekt beroende på data.

### 2. AnalysisPanel Spårfaktor-kolumn
expected: Öppna analyspanelen (klicka "Matematisk analys" eller "Utökad analys") för ett lopp på ett spår med trackConfig. En extra kolumn "Spårfaktor" ska synas i tabellen — visar det justerade faktorvärdet + ett +/- delta-märke när |delta| >= 0.01. Om inget trackConfig finns (okänt spår) ska kolumnen inte visas alls.
result: pass

### 3. BottomNav admin-flik
expected: Logga in som admin-användare (din user id i ADMIN_USER_IDS). Mobilnavet längst ner ska visa en 5:e flik med kugghjulsikon och texten "Admin". Länken ska leda till /admin. Logga in som vanlig användare — fliken ska inte synas.
result: pass

### 4. TopNav admin-länk
expected: Som admin-användare ska en "Admin"-länk synas i TopNav:en (desktopnavigation) bland de övriga länkarna. Som vanlig användare ska länken inte synas.
result: pass

### 5. Admin-sidan — innehåll och åtkomst
expected: Navigera till /admin som admin-användare. Sidan ska visa en lista med alla track_configs-rader från databasen (banamn, open_stretch-toggle, open_stretch_lanes, short_race_threshold). Om inga rader finns visas "Inga banor konfigurerade."
result: issue
reported: "Det stämmer. Men det framgår inte riktigt vad de olika inställningarna gör. Behöver vara tydligare."
severity: minor

### 6. Admin-gate — obehörig åtkomst
expected: Navigera till /admin som vanlig (icke-admin) användare, eller utan att vara inloggad. Du ska omdirigeras direkt — antingen till / eller /login — utan att admin-innehållet blinkar till.
result: pass

### 7. TrackConfigRow — redigering och spara
expected: På admin-sidan, redigera en rad: slå på/av open_stretch-toggle, ändra banor i textfältet (t.ex. "1,2,3"), ändra short_race_threshold. Klicka "Spara". Knappen ska visa laddningsläge kort, sedan bli grön och visa "Sparad" i ~2 sekunder, och slutligen återgå till normalläge. Nästa gång sidan laddas om ska ändringarna synas.
result: pass

### 8. TrackConfigRow — validering av banor
expected: I open_stretch_lanes-fältet, skriv in ett ogiltigt värde (t.ex. "1,abc,3" eller "0" eller "25"). Klicka Spara. Serverfunktionen ska INTE anropas — ett inline-felmeddelande ska visas under knappen. Fältet är inaktiverat (grått) när open_stretch-toggle är avslaget.
result: pass

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Admin-sidan visar tydligt vad varje inställning gör"
  status: closed
  reason: "User reported: Det framgår inte riktigt vad de olika inställningarna gör. Behöver vara tydligare."
  severity: minor
  test: 5
  resolution: "Added help text under each label in TrackConfigRow.tsx (03-05-PLAN.md)"
  closed_by: "03-05-SUMMARY.md"
