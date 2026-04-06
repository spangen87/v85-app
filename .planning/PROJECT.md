# v85-app

## What This Is

Next.js-app för analys av ATG-travspel (V85 m.fl.). Ger spelare verktyg för att ranka hästar via Formscore (FS) och Composite Score (CS) — nu med banspecifika faktorer (open stretch, korta lopp) — föra anteckningar i sällskap, diskutera omgångar i ett forum och utvärdera systemets träffsäkerhet mot verkliga resultat. Målgruppen är travspelande sällskap som delar analys och vill fatta bättre beslut inför spel.

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
- ✓ Masskämtning av resultat direkt i utvärderingsvyn (en knapp för alla omgångar utan fullständiga resultat) — v1.0
- ✓ Banstatistik: admin-vy för att konfigurera spårfaktorer per bana (förifyld med känd data) — v1.0
- ✓ Open stretch-faktor: konfigurerbart vilka spår som gynnas per bana — v1.0
- ✓ Kort lopp-faktor: konfigurerbar distansgräns per bana — v1.0
- ✓ CS justeras av banspecifika faktorer (spårbonus/malus) — v1.0
- ✓ Visuell indikation i hästkortet när banfaktorer påverkat CS — v1.0

### Active

*(Inga aktiva krav för v1.1 ännu — definieras i nästa milestone)*

### Out of Scope

- Startvinge-faktor — prioriteras bort för v1, kan läggas till i v2 (STARTVINGE-01/02)
- Realtidsnotiser — hög komplexitet, ej kärna
- Mobilapp (native) — webb-först, mobil senare
- Videomaterial / mediainbäddning — inte relevant för domänen
- Lagring av track-justerat CS i DB — CS förblir client-computed för att undvika cross-algorithm dataproblem
- Per-sällskap bankonfiguration — global konfiguration räcker för v1

## Context

**v1.0 skeppat 2026-04-06.**

Brownfield-projekt med befintlig kodbas. v1.0 lade till:
- `track_configs` Supabase-tabell (migration v9) med 15 svenska travbanor
- Bulk results-knapp i utvärderingsvyn med sekventiell hämtning och tre-status-feedback
- Banspecifika CS-justeringar i `computeTrackFactor()` (open stretch +0.12, korta lopp -0.08)
- Admin-sida `/admin` åtkomstskyddad via `ADMIN_USER_IDS` env-var
- `TrackAdjustmentBadge` i HorseCard + Spårfaktor-kolumn i AnalysisPanel

Analysalgoritmerna finns i `lib/analysis.ts` och `lib/formscore.ts`. CS beräknas client-side — bankonfigurerade justeringar läses från `track_configs` via server action och skickas ned som prop.

Supabase-schemat utökas med migrationer i `supabase/migration_v<N>_<namn>.sql`.

Uppskattad kodbas: ~69 filer ändrade i v1.0, ~11k rader tillagda.

## Constraints

- **Tech stack**: Next.js 16 + React 19 + TypeScript + Supabase + Tailwind CSS v4 — ingen ny teknik
- **Databas**: Alla ändringar via migration-filer, inte direkta schema-redigeringar
- **Språk**: Allt UI-text på svenska
- **Säkerhet**: Admin-funktioner kräver `ADMIN_USER_IDS` env-var (server-side check + RLS service_role)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Banfaktorer konfigurerbara (ej hårdkodade) | Bandata kan vara felaktig eller ändras; admin ska kunna korrigera | ✓ Fungerade — 15 banor seedade, admin kan korrigera |
| Förifylla med känd bandata | Minskar manuellt arbete; admin behöver bara korrigera avvikelser | ✓ Bekräftat — seed + admin-UI är rätt mönster |
| CS-justering client-side only | CS lagras aldrig i DB — undviker cross-algorithm dataproblem | ✓ Bra beslut, prop-threading fungerade rent |
| Open stretch reducerar inner-banebias (modifierar TRACK_BIAS_VOLTE) | Ersätter, staplas inte — D-01 i CONTEXT.md | ✓ Implementerat, 8 TDD-tester gröna |
| Open stretch + korta lopp för v1, startvinge till v2 | Mest påtagliga faktorer för v1 | ✓ Rätt prioritering |
| `track_name` TEXT PRIMARY KEY (matchar games.track exakt) | Enkel join utan extra ID-kolumn | ✓ Verifierat mot live games-tabell |
| Migration appliceras manuellt via Supabase Dashboard | SUPABASE_ACCESS_TOKEN ej satt i env | ✓ Accepterad begränsning — dokumenterat i deferred-items |
| BulkResultsButton: router.refresh() en gång efter hela batchen | Undviker onödiga server-rerenders | ✓ Fungerade — UX smidig |
| deleteGame server action: service client (bypass RLS) + auth-gate | games-tabellen tillåter endast service_role-skrivning | ✓ Rätt mönster — återanvänder tracks.ts-mönster |

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
*Last updated: 2026-04-06 after v1.0 milestone*
