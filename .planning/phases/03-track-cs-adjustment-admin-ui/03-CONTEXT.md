# Phase 3: Track CS Adjustment & Admin UI - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire track configuration into `computeTrackFactor()` so CS rankings reflect track-specific post-position bias. Add visual indicator on horse cards when a track factor changed a horse's CS. Provide a global admin page where configured admins can review and correct the pre-seeded track values.

Track-adjusted CS is client-computed only — never stored in `starters`. Admin UI is the correction path for migration v9 seed data.

</domain>

<decisions>
## Implementation Decisions

### Open-stretch modifier
- **D-01:** `computeTrackFactor()` accepts optional `trackConfig?: TrackConfig` parameter (TRACK-CS-01)
- **D-02:** When `trackConfig.open_stretch === true` and `postPosition` is in `open_stretch_lanes`, apply **+0.12 delta** to the static factor (`staticTrackFactor()` result). Inner lanes and non-configured outer lanes are unaffected.
- **D-03:** This modulates (adds to) the existing `TRACK_BIAS_VOLTE` value — does NOT stack a separate modifier. Example: Solvalla spår 7 goes from 0.58 → 0.70.
- **D-04:** When `trackConfig` is absent or `open_stretch === false`, behavior is identical to current static implementation (TRACK-CS-06, non-breaking).

### Kort-lopp modifier
- **D-05:** When `trackConfig.short_race_threshold > 0` and `race.distance < trackConfig.short_race_threshold` and `postPosition >= 5`, apply **-0.08 delta** to the static factor (TRACK-CS-04).
- **D-06:** Example: Solvalla spår 5, threshold=1640m, lopp 1640m → spår 5 goes from 0.72 → 0.64.
- **D-07:** Open-stretch and kort-lopp modifiers can apply simultaneously on the same horse (both deltas sum).

### CS-beräkning — dataflöde
- **D-08:** `page.tsx` fetches `TrackConfig` for the selected game's track server-side via `getTrackConfig(game.track)` and passes it as prop down through `RaceList` → `AnalysisPanel` and `HorseCard` (TRACK-CS-05).
- **D-09:** `AnalysisPanel` computes adjusted CS client-side using the modified `computeTrackFactor()`. The stored `formscore` in the DB remains the baseline (computed at fetch time without track config).

### HorseCard visuell indikator
- **D-10:** ↑/↓ badge visas **inline bredvid CS-badge** i hästkortets kompakta vy (TRACK-UI-05).
- **D-11:** Badge visas **bara om CS ändras med ≥1 poäng** jämfört med ej track-justerat CS. Ingen badge vid marginell påverkan.
- **D-12:** ↑ (grön) = positiv track-justering, ↓ (röd) = negativ. Hover/tooltip anger vilken faktor som påverkat ("Open stretch: +0.12", "Kort lopp: -0.08").

### Admin-åtkomst
- **D-13:** `/admin`-sidan kräver `ADMIN_USER_IDS` env-var. Icke-admins redirectas (TRACK-UI-02).
- **D-14:** `TopNav` (server async component) kontrollerar `ADMIN_USER_IDS` och visar admin-länk villkorligt — enkel server-side check.
- **D-15:** `AuthenticatedLayout` hämtar user.id och beräknar `isAdmin` server-side, skickar som prop till `BottomNav`. `BottomNav` accepterar ny `isAdmin?: boolean` prop. Admin-länk visas bara för admins (TRACK-UI-06).

### Admin-formulär UX
- **D-16:** Admin-sidan på `app/(authenticated)/admin/page.tsx` visar alla track_configs i en **tabell med inline-redigering** (TRACK-UI-01, TRACK-UI-03).
- **D-17:** Per rad: toggle för `open_stretch`, textinput för `open_stretch_lanes` (kommaseparerade heltal), number-input för `short_race_threshold` (meter).
- **D-18:** **Per-rad "Spara"-knapp** som kör upsert för just den banan (TRACK-UI-04). Inline success/error-feedback per rad.
- **D-19:** Spara kör upsert (not insert) — `ON CONFLICT (track_name) DO UPDATE`. Fungerar för både befintliga (15 seeded) och eventuellt nya banor.

### Claude's Discretion
- Exakt styling/layout av admin-tabellen (mobile-responsiv, kolumnbredd etc.)
- Spinner/loading-state under sparning
- Hur `open_stretch_lanes` valideras (t.ex. ej tillåta icke-heltal)
- Exakt tooltip-formulering för HorseCard-badge

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full spec för TRACK-CS-01 through TRACK-UI-06 (alla Phase 3 requirements)

### Befintlig kod — CS-beräkning
- `lib/analysis.ts` — `computeTrackFactor()`, `TRACK_BIAS_VOLTE`, `staticTrackFactor()` (modifiera dessa)
- `lib/formscore.ts` — `calculateCompositeScore()` som anropar `computeTrackFactor()` (lägga till TrackConfig-param)
- `app/api/games/fetch/route.ts` — Anropar `calculateCompositeScore()` vid fetch (läs för kontext, ändras ej)

### Befintlig kod — UI-komponenter
- `components/HorseCard.tsx` — `ScoreBadge` (inline CS-badge), lägg till track-indikator bredvid
- `components/AnalysisPanel.tsx` — Nuvarande CS-visning, behöver trackConfig-prop
- `components/RaceList.tsx` — Skickar starters till AnalysisPanel (lägg till trackConfig-passning)
- `components/BottomNav.tsx` — Lägg till isAdmin-prop och admin-länk
- `components/TopNav.tsx` — Lägg till villkorlig admin-länk

### Befintlig kod — Auth & layout
- `app/(authenticated)/layout.tsx` — Skicka isAdmin-prop till BottomNav
- `lib/actions/tracks.ts` — `getTrackConfig(trackName)` server action
- `lib/types.ts` — `TrackConfig` interface (TRACK-DB-03)

### Databasschema
- `supabase/migration_v9_track_configs.sql` — Tabell-definition, RLS-policies, seedad data (15 banor)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeTrackFactor(postPosition, startMethod, horseHistory)` i `lib/analysis.ts` — lägg till optional `trackConfig?` param, modifiera `staticTrackFactor()` internt
- `getTrackConfig(trackName)` i `lib/actions/tracks.ts` — klar server action, anropa i `page.tsx`
- `ScoreBadge` i `HorseCard.tsx` — befintlig inline CS-badge, bredvid denna läggs track-indikatorn
- `AdminTab.tsx` i `components/sallskap/admin/` — befintligt admin-formulär-mönster (sections, labels, form inputs) att följa för stilkonsistens
- `TopNav.tsx` — redan async server component med user-access; admin-länk läggs enkelt till villkorligt

### Established Patterns
- Server actions i `lib/actions/` för alla DB-operationer (server-side Supabase service client för admin writes)
- `"use client"` på interaktiva komponenter; server components för datahämtning och auth-check
- Tailwind CSS v4 — all styling inline via utility classes
- Inline success/error-feedback utan toast-bibliotek (se befintliga formulär)
- RLS-skrivpolicy: service_role krävs → server action med service client enforcar ADMIN_USER_IDS env-var

### Integration Points
- `page.tsx → getRaces()` returnerar `game.track` (ATG-sträng) — anropa `getTrackConfig(game.track)` i samma Promise.all
- TrackConfig passas som prop: `page.tsx` → `RaceList` → `AnalysisPanel` + `HorseCard`
- `AuthenticatedLayout` behöver bli `async` server component för att hämta user.id och skicka `isAdmin` till `BottomNav`
- Ny migration `migration_v10_*` behövs INTE för Phase 3 (tabellen finns); men om admin-sidan tillåter nya banor kan det krävas framöver

</code_context>

<specifics>
## Specific Ideas

- Open-stretch badge-preview: `"CS 74 ↑"` (inline, grön pil), hover: `"Open stretch: +0.12 (spår 10, Solvalla)"`
- Admin-tabell ska likna `AdminTab.tsx` i sällskap-admin: sections med `text-sm font-semibold text-gray-500 uppercase` headers
- Per-rad Spara-knapp ger omedelbar feedback: `"Sparad ✓"` i 2s, sedan normal state

</specifics>

<deferred>
## Deferred Ideas

- Startvinge-faktor (spår 1 vid voltstart) — definierat som v2 i REQUIREMENTS.md Out of Scope
- Per-sällskap bankonfiguration — Out of Scope (global config tillräckligt för v1)
- Historisk validering av spårbonus-magnituder mot ATG-utfall (STAT-01/02) — v2

</deferred>

---

*Phase: 03-track-cs-adjustment-admin-ui*
*Context gathered: 2026-04-05*
