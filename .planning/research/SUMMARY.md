# Project Research Summary

**Project:** v85-app — Bulk Results Fetching + Track-Specific CS Adjustment
**Domain:** Brownfield Next.js + Supabase sports analysis app (Swedish trotting)
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH (architecture HIGH, domain data MEDIUM)

## Executive Summary

This milestone adds two independent but complementary features to an existing, well-structured
Next.js + Supabase application. The codebase has established patterns for everything needed:
server actions for DB writes, parallel server fetches in page.tsx, client-side CS computation
in AnalysisPanel, and admin gating via isCreator in AdminTab. Both features slot into these
existing patterns without requiring new primitives or architectural changes.

The recommended approach for bulk results fetching is a sequential server-side endpoint (not
parallel client-side promises) with a three-way status model per round (success / not-ready /
error). ATG rate limiting is the dominant risk — the existing single-round flow avoids it by
requiring manual user clicks; bulk fetching removes that natural throttle and must replace it
with an explicit 500ms delay between ATG calls. Use `Promise.allSettled` so partial failures
do not abort the batch and are reported individually to the user.

The recommended approach for track-specific CS adjustment is to apply track config as an
additive offset inside `computeTrackFactor()` before the existing normalization pipeline — not
as a post-hoc CS point addition. This preserves the 0-100 CS scale and field-relative ranking
guarantee. The adjusted CS must remain client-side only (not stored in `starters`) to avoid
cross-algorithm evaluation comparisons between old and new rounds. Pre-seed 10-15 known Swedish
ATG tracks in the migration with sensible defaults; the admin UI exists to correct them, not to
replace domain knowledge.

## Key Findings

### Recommended Stack

No new dependencies are required. Both features use the existing stack: Next.js Server
Components and Server Actions for data fetching and writes, Supabase PostgreSQL for the new
`track_configs` table, and TypeScript interfaces for the data contracts. The `computeTrackFactor()`
function in `lib/analysis.ts` is the single integration point for CS adjustment.

**Core technologies for this milestone:**
- Supabase PostgreSQL: new `track_configs` table with RLS — consistent with existing table conventions in schema.sql
- Next.js Server Actions: `lib/actions/tracks.ts` for track config fetch and upsert — mirrors `lib/actions/groups.ts` pattern
- Client-side CS computation: `computeTrackFactor()` signature extension with optional `TrackConfig` param — additive, backward-compatible
- `Promise.allSettled`: bulk fetch orchestration — prevents silent partial failures from `Promise.all`

### Expected Features

**Must have (table stakes):**
- `track_configs` DB table with migration — enables all other track-config work
- Sequential bulk results fetch with per-round status reporting — the core evaluation UX improvement
- `computeTrackFactor()` extended to accept optional `TrackConfig` — the CS adjustment integration point
- Open-stretch boolean modifier for volte races — primary positional effect
- Short-race-distance threshold modifier — secondary positional effect
- HorseCard visual indicator (directional icon, not numeric delta) — communicates when track factor changed a horse's CS
- Admin "Bankonfiguration" section in AdminTab — sällskaps-owner can review and correct pre-filled values
- Pre-seeded defaults for 10-15 Swedish ATG tracks — Solvalla, Åby, Jägersro, Bergsåker, Eskilstuna, Mantorp, Romme, Örebro, Halmstad, Kalmar, Gävle

**Should have (improves usability):**
- Three-way bulk fetch status: success / inte redo (422) / fel (5xx) — avoids confusing 422 with errors
- Idempotency guard on bulk fetch button (disabled while running) — prevents double-firing
- `source` column on `track_configs` ('seeded' vs 'user_configured') with UI signal — admin knows which values need verification
- 429 detection and single retry with backoff in `fetchGameResults()` — defensive against ATG rate limit

**Defer to v2+:**
- Per-post-position custom override in admin UI — too granular for reliable calibration
- Track condition (tung/lätt bana) in CS — ATG API field availability unconfirmed, out of scope
- Home track advantage factor — data exists but effect size unvalidated
- Driver per-track statistics — requires ATG scraping, not in v1 scope
- Third factor (startvinge/wing draw) — explicitly out of scope in PROJECT.md

### Architecture Approach

Both features extend the existing server-fetch-to-client-prop data flow. Track config is
fetched in the Server Component (page.tsx) as a fourth parallel fetch alongside games, profile,
and groups, then passed as a prop through MainPageClient to AnalysisPanel and HorseCard. No
client-side Supabase calls. Admin authorization for track config uses an environment variable
admin list (`ADMIN_USER_IDS`) rather than a new DB role — sufficient for an app with one or
two real admins and avoids a schema migration just for authorization.

**Major components:**
1. `lib/actions/tracks.ts` — server actions: `getTrackConfig(trackName)`, `upsertTrackConfig(data)`
2. `lib/analysis.ts → computeTrackFactor()` — extended with optional `TrackConfig` param; additive offset clamped to [0,1]
3. `lib/types.ts → TrackConfig` — defines the interface; DB column names must match from day one
4. `app/(authenticated)/admin/page.tsx` + `TrackConfigClient.tsx` — global admin UI (not nested under sällskap)
5. Bulk results endpoint — either a new route or server action that executes rounds sequentially with delay
6. `EvaluationPanel.tsx` — bulk fetch trigger with per-round status display

### Critical Pitfalls

1. **ATG rate limiting from concurrent bulk fetches** — Use sequential execution with 500ms
   delay between ATG calls, not `Promise.all`. A burst of 10 simultaneous server-side requests
   to ATG from the same IP will likely trigger rate limiting; individual failures return HTTP 500
   indistinguishable from real errors.

2. **Silent partial failures in bulk fetch** — Use `Promise.allSettled` and model each round
   as `{ gameId, status: 'success' | 'not-ready' | 'error' }`. Report results per-round.
   Suppress 422 (not ready yet) from the error count — it is not a failure.

3. **Track-adjusted CS stored in DB creates cross-algorithm evaluation** — Do not store the
   track-config-adjusted CS in the `starters.formscore` column. Apply the track adjustment
   client-side only at display time. This keeps evaluation statistics consistent across rounds
   regardless of when track config was set or changed.

4. **RLS write permission undefined for track config** — Track config is global state, not
   per-group. Decide the authorization model before writing the migration. Recommended: env var
   admin list in the server action; RLS restricts writes to `service_role`; the server action
   enforces the admin check before using the service client.

5. **open-stretch factor double-applies post-position bias** — The existing `TRACK_BIAS_VOLTE`
   table already penalizes outer posts. The open-stretch config must reduce (modulate) that
   existing penalty for positions 4-8, not stack an additional modifier on top of it. Define
   clearly whether the config replaces or modulates the static table values before implementing.

## Implications for Roadmap

Based on research, suggested phase structure (3 phases):

### Phase 1: Foundation — DB Schema and Types

**Rationale:** All other work depends on the `track_configs` table and the `TrackConfig`
TypeScript interface. Defining the TS interface first ensures DB column names match from day
one (Pitfall 10 prevention). This phase has zero user-visible output but is the prerequisite
for Phases 2 and 3.

**Delivers:** Migration file creating `track_configs` table with RLS + seed data for 10-15
Swedish tracks. `TrackConfig` interface in `lib/types.ts`. Server actions in `lib/actions/tracks.ts`.

**Addresses:** Table stakes item — track_configs table; anti-pattern prevention — TypeScript
interface defined before migration SQL.

**Avoids:** Pitfall 10 (DB/TS naming mismatch), Pitfall 4 (RLS ambiguity — decide scope here),
Pitfall 6 (stale seed data — add `source` column now).

**Research flag:** None — pattern is directly derivable from existing schema.sql conventions.

### Phase 2: Bulk Results Fetching

**Rationale:** Self-contained feature with no dependency on track config. Can be built and
tested independently. The dominant risks (rate limiting, partial failures, 422 handling) are
well-understood from codebase inspection and have clear solutions. Delivering this first gives
users immediate value in the evaluation view.

**Delivers:** Sequential bulk fetch endpoint (server action or new route handler) with 500ms
inter-request delay. EvaluationPanel bulk-fetch button with per-round status display
(success/not-ready/error). Idempotency guard. `gradeSystemsForGame` impact assessed and
handled.

**Addresses:** Must-have — sequential bulk fetch with status reporting; three-way status model;
idempotency guard.

**Avoids:** Pitfall 1 (partial failure invisible), Pitfall 2 (ATG rate limiting), Pitfall 5
(422 treated as error), Pitfall 7 (gradeSystemsForGame N-times cost), Pitfall 9 (double-click
race condition).

**Research flag:** None — patterns are clear. Verify `gradeSystemsForGame` cost in `lib/systems.ts`
before deciding whether to defer or run once after batch.

### Phase 3: Track-Specific CS Adjustment and Admin UI

**Rationale:** Builds on Phase 1 foundation. The CS adjustment is the analytically complex part —
the interaction between the existing `TRACK_BIAS_VOLTE` table, the open-stretch modifier, and the
short-race modifier must be specified precisely before implementation. The admin UI is straightforward
once the server action and type exist.

**Delivers:** Extended `computeTrackFactor()` with optional `TrackConfig` parameter. Open-stretch
and short-race modifiers applied as additive offsets inside the existing normalization pipeline.
HorseCard directional indicator icon (boost/penalty/null). CS tooltip updated. Admin
"Bankonfiguration" section in AdminTab. Global admin page at `/admin`.

**Addresses:** Must-have — CS adjustment, visual indicator, admin form; anti-features explicitly
excluded (numeric delta, per-position override, separate CS column).

**Avoids:** Pitfall 3 (track-adjusted CS stored in DB — keep client-side only), Pitfall 8
(double-applying bias — define modulate vs replace in implementation spec).

**Research flag:** The exact magnitude values (±0.10-0.15 offset on the 0-1 factor scale) are
MEDIUM confidence estimates. Flag for empirical calibration after first deployment — the admin UI
exists precisely to support this. The open-stretch modifier interaction with `TRACK_BIAS_VOLTE`
needs an explicit specification document (even a short one) before coding starts.

### Phase Ordering Rationale

- Phase 1 before Phase 3: the `track_configs` table and `TrackConfig` type are hard prerequisites
  for the CS integration work.
- Phase 2 is independent of Phases 1 and 3: bulk results fetch uses only existing DB structure and
  ATG API. It can be done in parallel with Phase 1 if desired, or sequentially for simplicity.
- Phase 3 last: depends on Phase 1 and benefits from having the data types locked down before
  touching the CS formula, which is the most sensitive calculation in the app.

### Research Flags

Phases likely needing deeper specification before coding:
- **Phase 3:** The interaction between `TRACK_BIAS_VOLTE` and the open-stretch/short-race
  modifiers needs explicit specification of "replace vs modulate" before implementation.
  Write a short spec with worked examples (post 1 and post 8 on open-stretch track, volte start)
  to verify the formula before touching `lib/analysis.ts`.

Phases with standard patterns (no additional research needed):
- **Phase 1:** Direct derivation from existing schema.sql table conventions and server action patterns.
- **Phase 2:** Route handler and `Promise.allSettled` patterns are well-established; codebase
  already handles 422 correctly in `ResultsButton.tsx` — extend that logic.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; all patterns exist in codebase |
| Features | HIGH | Scope is well-defined in PROJECT.md; anti-features explicitly called out |
| Architecture | HIGH | Based on direct codebase inspection of data flow and component boundaries |
| Pitfalls | HIGH | Grounded in specific code locations (file + line references); not speculative |
| Track domain data (open stretch) | HIGH for big 4 tracks, MEDIUM for others | Physical track characteristics are stable; Solvalla/Åby/Jägersro/Bergsåker well-documented |
| CS magnitude values (±0.10-0.15) | MEDIUM | Reasoned from existing scale, not empirically validated |
| ATG API track name strings | MEDIUM | Must verify exact strings against `games` table data before seeding |

**Overall confidence:** MEDIUM-HIGH — the engineering patterns are clear and high-confidence; the
domain-specific calibration values (CS magnitudes, per-track post-position multipliers) are
informed starting points that require empirical validation after deployment.

### Gaps to Address

- **ATG track name strings**: Verify the exact string values returned by the ATG API for each
  track (e.g. "Åby" vs "Åby travbana") by inspecting existing rows in the `games` table before
  writing the migration seed data. A mismatch means track config is never applied.

- **`gradeSystemsForGame` cost**: Check `lib/systems.ts` before implementing bulk fetch to
  determine whether running it N times per batch is expensive. If it is, run once after all
  rounds complete instead of per-round.

- **`TRACK_BIAS_VOLTE` modulate vs replace decision**: Before implementing Phase 3, decide
  whether open-stretch config reduces the existing static table's outer-position penalty or
  replaces it with a new slope. Document with worked examples. This decision affects how
  positions 4-8 on open-stretch tracks are scored and is not obvious from the existing code.

- **Uppsala track status**: Täby Galopp closed ~2020. Confirm whether Uppsala Travbana is
  operational and appears in ATG API responses before including in seed data.

- **CS magnitude calibration**: The ±0.10-0.15 additive offset values are initial estimates.
  Plan a post-deploy review after 3-4 rounds of real V85 data to compare CS rankings with
  actual finishing positions for outer-post horses on open-stretch vs tight tracks.

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `lib/analysis.ts` — `computeTrackFactor()`, `staticTrackFactor()`, `TRACK_BIAS_VOLTE` table
- `lib/formscore.ts` — `calculateCompositeScore()` weights and normalization pipeline
- `app/api/games/[gameId]/results/route.ts` — results route handler, `gradeSystemsForGame` call
- `lib/atg.ts:296-303` — `fetchGameResults()` error handling, no retry logic
- `supabase/schema.sql` — RLS patterns, table conventions
- `components/sallskap/admin/AdminTab.tsx` — admin section pattern, isCreator gating
- `components/HorseCard.tsx` — ScoreBadge, isValue prop, card header structure
- `app/(authenticated)/page.tsx` — parallel server fetch pattern
- `.planning/codebase/CONCERNS.md` — ATG rate limit assumption (60 req/min per IP)

### Secondary (MEDIUM confidence — domain knowledge)
- Swedish trotting track geometry (open stretch classification) — stable physical facts, ATG-confirmable
- Post-position win rate ranges — trotting domain literature; needs validation against ATG historical data
- `travronden.se/statistik/banor` — recommended source for per-track spårstatistik
- `atg.se/travbanor` — authoritative track list and current operational status

### Tertiary (LOW confidence — requires validation)
- Per-track CS multiplier magnitudes (±0.10-0.15) — reasoned from existing code scale, not empirical
- Home track advantage magnitude (+2-5%) — mentioned in domain sources but unquantified precisely
- Exact ATG rate limit threshold — assumed 60 req/min per IP, not officially published

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
