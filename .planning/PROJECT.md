# v85-app

## What This Is

Next.js-app för analys av ATG-travspel (V85 m.fl.). Ger spelare verktyg för att ranka hästar via Formscore (FS) och Composite Score (CS), föra anteckningar i sällskap, diskutera omgångar i ett forum och utvärdera systemets träffsäkerhet mot verkliga resultat. Målgruppen är travspelande sällskap som delar analys och vill fatta bättre beslut inför spel.

## Core Value

Rätt häst på rätt plats — snabb, datadrivet underlag för att ranka hästar i V85 och liknande spel, utan manuellt arbete.

## Requirements

### Validated

- ✓ Autentisering med e-post/lösenord via Supabase Auth — existing
- ✓ Hämta och spara omgångar från ATG API (V85, V75, V64, V86) — existing
- ✓ Formscore (FS) beräkning per häst (form, vinstprocent, odds-index, bästa tid) — existing
- ✓ Composite Score (CS) beräkning med distansfaktor, värdeindex, konsistens — existing
- ✓ Hästkort med inline FS/CS och expanderbar detaljvy — existing
- ✓ Top 5-ranking baserat på CS — existing
- ✓ Sortering och filtrering av hästar (kollapsibel på mobil) — existing
- ✓ Sällskap: skapa/gå med/lämna grupper via inbjudningskod — existing
- ✓ Anteckningar per häst med etiketter och sällskapsval — existing
- ✓ Omgångsbundet diskussionsforum per sällskap — existing
- ✓ Utvärderingssida: hämta loppresultat och se systemets träffsäkerhet — existing
- ✓ PWA (installerbar, offline-redo) — existing
- ✓ Mörkt/ljust tema — existing
- ✓ Manual-sida (renderar MANUAL.md) — existing

### Active

- [ ] Masskämtning av resultat direkt i utvärderingsvyn (en knapp för alla omgångar utan fullständiga resultat)
- [ ] Banstatistik: admin-vy för att konfigurera spårfaktorer per bana (förifyld med känd data)
- [ ] Open stretch-faktor: konfigurerbart vilka spår som gynnas per bana
- [ ] Kort lopp-faktor: konfigurerbar distansgräns (per bana eller globalt)
- [ ] CS justeras av banspecifika faktorer (spårbonus/malus)
- [ ] Visuell indikation i hästkortet när banfaktorer påverkat CS

### Out of Scope

- Startvinge-faktor — prioriteras bort för v1, kan läggas till i v2
- Realtidsnotiser — hög komplexitet, ej kärna för v1
- Mobilapp (native) — webb-först, mobil senare
- Videomaterial / mediainbäddning — inte relevant för domänen

## Context

Brownfield-projekt med befintlig kodbas. Analysalgoritmerna finns i `lib/analysis.ts` och `lib/formscore.ts`. CS beräknas client-side i `AnalysisPanel.tsx` med stöd av `computeTrackFactor()` som redan finns i `lib/analysis.ts` men ännu inte hämtar banspecifik konfiguration.

Utvärderingssidan (`app/(authenticated)/evaluation/`) och `EvaluationPanel.tsx` hanterar redan resultatvisning men saknar bulk-hämtning. Resultat hämtas idag via `ResultsButton.tsx` per omgång på startsidan.

Supabase-schemat utökas med en ny tabell för bankonfiguration. Alla databasändringar görs som migrationer i `supabase/migration_v<N>_<namn>.sql`.

## Constraints

- **Tech stack**: Next.js 16 + React 19 + TypeScript + Supabase + Tailwind CSS v4 — ingen ny teknik
- **Databas**: Alla ändringar via migration-filer, inte direkta schema-redigeringar
- **Språk**: Allt UI-text på svenska
- **Säkerhet**: Bankonfiguration kräver att användaren är admin/ägare av sällskap (RLS)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Banfaktorer konfigurerbara (ej hårdkodade) | Bandata kan vara felaktig eller ändras; admin ska kunna korrigera | — Pending |
| Förifylla med känd bandata | Minskar manuellt arbete; admin behöver bara korrigera avvikelser | — Pending |
| CS-justering + visuell indikation | Påverkar ranking OCH visar tydligt varför — bättre beslutsstöd | — Pending |
| Open stretch + korta lopp för v1 | Mest påtagliga faktorer; startvinge deferred till v2 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*
