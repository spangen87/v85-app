# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Large, monolithic component files:**
- Issue: `HorseCard.tsx` (776 lines) and `RaceList.tsx` (327 lines) contain mixed concerns (rendering, data fetching, state management, calculations). Hard to test and maintain.
- Files: `components/HorseCard.tsx`, `components/RaceList.tsx`
- Impact: Difficult to unit test individual behaviors, increased cognitive load, harder to reuse UI logic
- Fix approach: Extract smaller components (ScoreBadge, StatisticsSummary, ResultsDisplay) into separate files; move state management logic to custom hooks

**Deprecated formscore wrapper still in use:**
- Issue: `calculateFormscore()` in `lib/formscore.ts` (line 140) is marked deprecated but no migration plan. Wrapper function obscures the new Composite Score API.
- Files: `lib/formscore.ts` (lines 140-143)
- Impact: Future developer confusion; two parallel scoring implementations to maintain
- Fix approach: Remove deprecated wrapper, update all callers to use `calculateCompositeScore()` with explicit `RaceContext` parameter

**Duplicate type definitions:**
- Issue: `Starter` interface defined in multiple files: `components/HorseCard.tsx` (lines 20-68), `components/RaceList.tsx` (lines 19-62), each with slight variations
- Files: `components/HorseCard.tsx`, `components/RaceList.tsx`, `lib/actions/`
- Impact: Type inconsistencies, harder to ensure schema changes propagate everywhere
- Fix approach: Create single source of truth in `lib/types.ts`, export and reuse across components

**Commented-out migrations in schema:**
- Issue: `supabase/schema.sql` (lines 75-111) contains dozens of commented ALTER TABLE commands rather than proper versioned migrations
- Files: `supabase/schema.sql`
- Impact: Unclear which schema version is currently deployed; hard to rollback or replay migrations; fragile on new environments
- Fix approach: Create separate versioned migration files (e.g., `supabase/migration_v2_schema_expansion.sql`) with proper metadata

---

## Known Bugs

**Race condition in horse stats fetch:**
- Symptoms: If two API requests fetch the same horse simultaneously, `last_5_results` may be overwritten with partial data. HorseCard.tsx triggers fetch on demand without debouncing.
- Files: `components/HorseCard.tsx` (lines 307-320), `app/api/horses/[horseId]/starts/route.ts`
- Trigger: Click "Hämta från ATG" multiple times rapidly on same horse
- Workaround: Disable button after first click (already partially done, but state reset on card re-render could cause issues)
- Fix approach: Add fetch-in-flight state that persists across re-renders; use AbortController to cancel stale requests

**Missing error boundary at app level:**
- Symptoms: If a component crashes, page shows blank or React error overlay. No error.tsx recovery page exists.
- Files: `app/` (no error.tsx found)
- Trigger: Component throws uncaught error
- Impact: Poor user experience; errors not visible in production builds
- Fix approach: Create `app/error.tsx` with fallback UI; consider creating error boundaries in `app/(authenticated)/error.tsx` and `app/api/` route error handlers

**Time parsing brittleness:**
- Symptoms: `parseTimeToSeconds()` in `lib/analysis.ts` handles `"1:12,4"` and `"1:12.4"` but may fail on edge cases like `"0:59,9"` or malformed times from ATG API changes
- Files: `lib/analysis.ts` (referenced in `lib/formscore.ts` line 84)
- Trigger: ATG API returns unexpected time format
- Workaround: Returns null/0, silently degrades time-based scoring
- Fix approach: Add comprehensive time format validation with explicit error logging; create test suite for edge cases

**last_5_results fallback silently hides API failures:**
- Symptoms: When `fetchHorseStarts()` returns empty, system falls back to cached DB data without alerting user. Stale data used for calculations.
- Files: `app/api/games/fetch/route.ts` (lines 55-65), `lib/atg.ts` (line 187)
- Trigger: ATG API rate-limiting or temporary outage; catch block at line 225 silently returns []
- Impact: Composite Score may be based on week-old data
- Fix approach: Log data staleness explicitly; add "last updated" timestamp to returned data; alert user when using cached data

---

## Security Considerations

**No input validation on horse/game ID parameters:**
- Risk: While Supabase RLS prevents unauthorized reads/writes, malformed IDs could cause 500 errors or trigger unexpected ATG API behavior
- Files: `app/api/horses/[horseId]/starts/route.ts` (line 20), `app/api/games/[gameId]/results/route.ts`, `lib/atg.ts` (fetchGame, fetchHorseStarts)
- Current mitigation: Next.js route params are URL-safe by design; ATG API rejects bad IDs
- Recommendations: Add UUID/ID format validation at route handler entry; use Zod for type-safe param parsing

**Supabase service role key exposed in environment:**
- Risk: `.env.local` contains service role key (private — not visible in .gitignore check, but dangerous if leaked)
- Current mitigation: Env var only used in Route Handlers (server-side), never exposed to client
- Recommendations: Ensure NEXT_PUBLIC_* vars are truly public-only; audit all uses of `createServiceClient()`

**No CSRF protection on server actions:**
- Risk: Server actions (groups.ts, notes.ts, posts.ts) modify data without explicit CSRF tokens, relying on Next.js's built-in mechanism
- Files: `lib/actions/groups.ts`, `lib/actions/notes.ts`, `lib/actions/posts.ts`
- Current mitigation: Next.js 16 includes CSRF protection in App Router server actions
- Recommendations: Document this assumption; consider explicit action authentication checks (e.g., verify user ID on each mutation)

---

## Performance Bottlenecks

**ATG API calls lack retry/backoff logic:**
- Problem: `fetchGame()`, `fetchHorseStarts()` fail hard on network errors; no exponential backoff or retry
- Files: `lib/atg.ts` (lines 154-161, 179-229, 296+)
- Cause: Simple `await fetch()` with no retry layer; caught exceptions just log warnings and return empty data
- Impact: High variance in "game fetch" endpoint latency; users experience 5-10s waits during rate limits
- Improvement path: Add retry logic with exponential backoff (500ms → 1s → 2s max) for 429/503 responses; document ATG rate limits

**Composite Score calculated on every route handler call:**
- Problem: `calculateCompositeScore()` (lib/formscore.ts) runs O(n²) operations (normalize per component, then aggregate). Called for every race on every fetch.
- Files: `app/api/games/fetch/route.ts` (line 126), `lib/formscore.ts` (lines 35-137)
- Cause: No caching; recomputes from scratch even if input data unchanged
- Impact: For V85 with 56 starters, roughly 1000+ arithmetic ops per fetch. Negligible on modern hardware but scales poorly if adding more races/complexity.
- Improvement path: Cache Composite Score in database alongside starters; invalidate only when new results/stats arrive. Consider memoizing min/max calculations.

**No pagination for large datasets:**
- Problem: `getHorseNotes()` in `lib/actions/notes.ts` fetches all notes for a horse without limit. `getGroupPosts()` likely same.
- Files: `lib/actions/notes.ts` (lines 35-70), `lib/actions/posts.ts`
- Impact: On horse with 100+ notes, payload bloats and sorting/filtering happens in-memory on client
- Improvement path: Implement cursor-based pagination; load first 20 notes, allow "load more"

**HorseCard expanded details trigger unbounded fetches:**
- Problem: Clicking "Hämta från ATG" on HorseCard fetches entire horse history (20 starts) without pagination or filtering. Happens on every card independently.
- Files: `components/HorseCard.tsx` (lines 307-320)
- Impact: 14 horses × 20 starts each = 280 API calls on V85 if user expands all cards. No request deduplication.
- Improvement path: Implement shared request cache (React Query / SWR); deduplicate by horse ID; pre-fetch top horses during race load

---

## Fragile Areas

**Parsing ATG API responses (especially when API contracts change):**
- Files: `lib/atg.ts` (entire file, especially parseGame, parseGameResults)
- Why fragile: Defensive parsing with fallbacks makes it unclear what format is expected. Lines 199-223 handle 4+ different time/place formats. If ATG changes field names, code breaks silently (returns empty/null).
- Safe modification: Add strict validation layer with Zod schemas; log ALL mismatches; fail loudly on unknown formats
- Test coverage: Unit tests exist (lib/__tests__/analysis.test.ts) but no tests for ATG parsing edge cases

**Distansfaktor calculation logic:**
- Files: `lib/analysis.ts` (lines 38-74), `lib/formscore.ts` (lines 102-108)
- Why fragile: Logic depends on life_records array format and presence of exact startmethod matches. If horse has no history on distance, drops to 0.6x multiplier (no way to overwrite). Hard to debug why Composite Score dropped for a horse.
- Safe modification: Document the fallback hierarchy explicitly; add logging when using default factors
- Test coverage: `lib/__tests__/analysis.test.ts` has basic tests but no edge cases (no records, single record, same method different distance)

**Supabase RLS policies assumed correct:**
- Files: `supabase/schema.sql` (lines 55-70)
- Why fragile: Policies are "service_role can do everything, authenticated users can only read". If someone adds a new table and forgets RLS policy, it's world-readable by default.
- Safe modification: Add comments documenting expected RLS for every new table; consider audit script to check all tables have appropriate policies

---

## Scaling Limits

**V85 with 7 races × 14 starters = 98 database rows per game:**
- Current capacity: Single Supabase free tier supports thousands of concurrent users
- Limit: If games data reaches millions of rows (years of history), query performance degrades without proper indexing
- Scaling path: Add database indexes on (game_id, race_number), (horse_id), (created_at); implement archival strategy (move games older than 1 year to cold storage)

**Browser storage for "local" PWA data:**
- Current capacity: IndexedDB limited to 50MB+ (browser-dependent)
- Limit: If users cache 100+ games locally, could exceed quota
- Scaling path: Implement quota management; add compression for cached JSON; add cleanup strategy

**ATG API rate limits:**
- Current capacity: Unknown exact limits; library assumes 60 req/min per IP
- Limit: If deployed to high-traffic environment, hitting 429 responses frequently
- Scaling path: Implement request queue per game type; document actual limits with ATG support; consider proxy/caching layer

---

## Dependencies at Risk

**Next.js 16 → newer major versions:**
- Risk: Tailwind CSS v4, React 19 are recent. Minor version updates may break unstable APIs.
- Impact: If Tailwind 5 releases with breaking changes, build fails
- Migration plan: Set up automated dependency security scanning (Dependabot); test major version bumps in CI before merging

**Serwist PWA integration (9.5.6):**
- Risk: Serwist is less mature than Workbox; fewer community resources for debugging service worker issues
- Impact: PWA offline mode may break unexpectedly; user installation fails silently
- Migration plan: Monitor Serwist releases; have fallback to Workbox-based approach if instability emerges

---

## Missing Critical Features

**No game results update mechanism:**
- Problem: System fetches game data but has no background job to poll for results. Users must manually click "Hämta resultat" after race finishes.
- Blocks: Can't show live leaderboard; notifications of won bets impossible
- Fix approach: Add cron job (e.g., using Supabase Edge Functions or external service) to fetch results every 5 min for today's games

**No user preferences/settings page:**
- Problem: All settings (theme, sorting, filtering) stored in localStorage with no persistence/sync across devices
- Blocks: Can't switch devices and retain preferences; no "save my favorite groups" feature
- Fix approach: Add `user_preferences` table; implement settings UI in new page `/settings`

**No notes/system backup or export:**
- Problem: Notes and systems exist only in Supabase with no way to export or backup locally
- Blocks: Can't archive old seasons; no data portability
- Fix approach: Add CSV/JSON export on group/user pages

---

## Test Coverage Gaps

**Server actions (groups.ts, notes.ts, posts.ts) untested:**
- What's not tested: Database writes, authorization checks, error handling in `lib/actions/`
- Files: `lib/actions/groups.ts`, `lib/actions/notes.ts`, `lib/actions/posts.ts`, `lib/actions/sallskap.ts`
- Risk: Regressions in group creation, note deletion silently break production. Authorization bugs could allow users to modify other users' data.
- Priority: High — these are critical data mutations
- Fix approach: Set up integration test suite with Supabase emulator; mock Supabase client in unit tests

**API route handlers not tested:**
- What's not tested: `/api/games/fetch`, `/api/games/[gameId]/results`, `/api/horses/[horseId]/starts` — error paths, malformed input
- Files: `app/api/games/fetch/route.ts`, `app/api/games/[gameId]/results/route.ts`, `app/api/horses/[horseId]/starts/route.ts`
- Risk: Unexpected HTTP status codes, malformed JSON responses delivered to client
- Priority: High — API is critical path for all game data
- Fix approach: Add route handler test suite with mock fetch; test both success and failure paths

**Component integration tests missing:**
- What's not tested: RaceList + HorseCard interaction, note submission workflow, group member operations
- Files: `components/RaceList.tsx`, `components/HorseCard.tsx`, `components/notes/`, `components/sallskap/`
- Risk: UI bugs caught only by manual QA
- Priority: Medium — unit tests for analysis logic exist, but no integration tests
- Fix approach: Add Vitest + React Testing Library tests for critical user workflows

**Edge cases in Composite Score calculation:**
- What's not tested: Zero starters, single starter, all ties in odds, missing life_records, track factor with incomplete history
- Files: `lib/formscore.ts` (lines 35-137), `lib/analysis.ts` (distance/track factor calculations)
- Risk: Scores calculated as NaN or Infinity in edge cases; sorting breaks
- Priority: Medium
- Fix approach: Add test cases for edge cases in analysis.test.ts

---

## Architectural Issues

**Unclear data flow for horse start history:**
- Problem: `HorseStart[]` data flows through three paths: (1) ATG fetch → route.ts → (2) stored in DB → (3) used in client components. No single source of truth. Comments say "used in-memory for spårfaktor analysis" (app/api/games/fetch/route.ts:107).
- Impact: Easy to accidentally pass stale or missing history to calculations
- Fix approach: Make history fetching explicit; either compute spårfaktor server-side or ensure history is always available client-side

**Mixed concerns in fetch route:**
- Problem: `app/api/games/fetch/route.ts` does: validation, ATG parsing, deduplication, database upsert, formscore calculation, and fallback logic — 196 lines in one handler
- Impact: Hard to test individual parts; logic reuse impossible
- Fix approach: Extract to service functions: `parseAtgGame()`, `deduplicateStarters()`, `computeScores()`, `persistGame()`

---

## Documentation Gaps

**No troubleshooting guide for ATG API failures:**
- Missing: What to do when ATG API is down, how long to wait, expected error messages
- Impact: Users confused when "Hämta spel" fails; devs don't know if it's a real bug
- Fix approach: Add troubleshooting section to MANUAL.md with ATG status page link

**Composite Score formula documentation unclear in UI:**
- Problem: HorseCard shows tooltip (lines 83-84) but formula differs from actual implementation. Says "form (30%)" but code shows 30% is correct; however, 5% distans + 5% spår doesn't match old comment about 7 components.
- Impact: Users confused about score calculation; devs unsure what formula to maintain
- Fix approach: Update tooltip to match exact weights; add verbose comment block at top of calculateCompositeScore

---

*Concerns audit: 2026-04-05*
