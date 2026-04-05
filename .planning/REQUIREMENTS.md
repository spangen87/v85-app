# Requirements: v85-app

**Defined:** 2026-04-05
**Core Value:** Rätt häst på rätt plats — snabb, datadrivet underlag för att ranka hästar i V85 och liknande spel, utan manuellt arbete.

## v1 Requirements

### Masskämtning av resultat (EVAL)

- [ ] **EVAL-01**: Utvärderingsvyn visar alla laddade omgångar med deras resultatstatus
- [ ] **EVAL-02**: Knapp "Hämta alla resultat" hämtar resultat för alla omgångar som saknar fullständigt resultat
- [ ] **EVAL-03**: Hämtning sker sekventiellt med fördröjning (ej parallellt) för att undvika ATG rate limiting
- [ ] **EVAL-04**: Varje omgång visar en av tre statusar: lyckades / ej klar ännu / fel
- [ ] **EVAL-05**: Partiell misslyckande hanteras graciöst — omgångar som lyckas visas, misslyckade markeras med felmeddelande

### Bankonfiguration — Databas & Typer (TRACK-DB)

- [x] **TRACK-DB-01**: Ny tabell `track_configs` i Supabase med kolumner för bannamn, open stretch (bool), open stretch-spår (array), kort lopp-gräns (int), aktiv (bool)
- [x] **TRACK-DB-02**: Tabell förifyld via migration med kända svenska travbanors konfiguration (15 banor)
- [x] **TRACK-DB-03**: TypeScript-interface `TrackConfig` definierat i `lib/types.ts`
- [x] **TRACK-DB-04**: Server Action `getTrackConfig(trackName)` i `lib/actions/`
- [x] **TRACK-DB-05**: RLS-policy: alla autentiserade kan läsa, skrivning kräver admin (via env-var `ADMIN_USER_IDS`)

### Bankonfiguration — CS-justering (TRACK-CS)

- [ ] **TRACK-CS-01**: `computeTrackFactor()` i `lib/analysis.ts` accepterar valfri `trackConfig?: TrackConfig`
- [ ] **TRACK-CS-02**: Open stretch reducerar innerbanebias — yttre spår (konfigurerat per bana) får positiv delta (±0.10–0.15) på raw track factor
- [ ] **TRACK-CS-03**: Öppen sträcka modifierar befintlig `TRACK_BIAS_VOLTE`-logik (ersätter/reducerar, staplas inte)
- [ ] **TRACK-CS-04**: Kort lopp-faktor: spår ≥ 5 får negativ delta när `race.distance < track.short_race_threshold`
- [ ] **TRACK-CS-05**: Bankonfiguration hämtas server-side i `page.tsx` och skickas som prop ned till `AnalysisPanel`
- [ ] **TRACK-CS-06**: Vid saknad konfiguration faller `computeTrackFactor()` tillbaka på befintlig statisk logik (icke-brytande ändring)

### Bankonfiguration — UI (TRACK-UI)

- [ ] **TRACK-UI-01**: Ny admin-sida på `app/(authenticated)/admin/page.tsx` för att visa och redigera bankonfiguration
- [ ] **TRACK-UI-02**: Admin-sida kräver `ADMIN_USER_IDS` env-var — visas bara för konfigurerade admin-användare
- [ ] **TRACK-UI-03**: Formulär per bana: toggle för open stretch, inmatning av gynnade spår, distansgräns
- [ ] **TRACK-UI-04**: Spara-knapp kör upsert (inte insert) — ändring av befintlig bana ändrar inte primary key
- [ ] **TRACK-UI-05**: Hästkortet visar riktningsikon (↑/↓) när bankfaktor påverkat CS med notis om vilken faktor
- [ ] **TRACK-UI-06**: Admin-länk läggs till i `BottomNav` (visas bara för admins)

## v2 Requirements

### Spårstatistik — Startvinge

- **STARTVINGE-01**: Startvinge-flagga per bana (gynnar spår 1 vid voltstart)
- **STARTVINGE-02**: CS-justering för startvinge tillämpas på spår 1

### Statistikvalidering

- **STAT-01**: Historisk validering av spårbonus-magnituder mot verkliga ATG-utfall
- **STAT-02**: Importverktyg för Travronden.se spårstatistik per bana och år

## Out of Scope

| Feature | Reason |
|---------|--------|
| Startvinge v1 | Deferred till v2 — open stretch + korta lopp täcker 80% av värdet |
| Realtidsnotiser | Hög komplexitet, ej kärna för v1 |
| Mobilapp (native) | Webb-först, mobil senare |
| Lagring av track-justerat CS i DB | CS förblir client-computed för att undvika cross-algorithm dataproblem |
| Per-sällskap bankonfiguration | Global konfiguration är tillräckligt; per-grupp är överkonstruerat för v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVAL-01 | Phase 2 | Pending |
| EVAL-02 | Phase 2 | Pending |
| EVAL-03 | Phase 2 | Pending |
| EVAL-04 | Phase 2 | Pending |
| EVAL-05 | Phase 2 | Pending |
| TRACK-DB-01 | Phase 1 | Complete |
| TRACK-DB-02 | Phase 1 | Complete |
| TRACK-DB-03 | Phase 1 | Complete |
| TRACK-DB-04 | Phase 1 | Complete |
| TRACK-DB-05 | Phase 1 | Complete |
| TRACK-CS-01 | Phase 3 | Pending |
| TRACK-CS-02 | Phase 3 | Pending |
| TRACK-CS-03 | Phase 3 | Pending |
| TRACK-CS-04 | Phase 3 | Pending |
| TRACK-CS-05 | Phase 3 | Pending |
| TRACK-CS-06 | Phase 3 | Pending |
| TRACK-UI-01 | Phase 3 | Pending |
| TRACK-UI-02 | Phase 3 | Pending |
| TRACK-UI-03 | Phase 3 | Pending |
| TRACK-UI-04 | Phase 3 | Pending |
| TRACK-UI-05 | Phase 3 | Pending |
| TRACK-UI-06 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after initial definition*
