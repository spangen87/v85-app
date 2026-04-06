# Domain Pitfalls

**Domain:** Bulk result fetching + admin-configurable track data for ATG horse racing analysis app
**Researched:** 2026-04-05
**Confidence:** HIGH — all findings grounded directly in codebase evidence from `lib/atg.ts`, `app/api/games/[gameId]/results/route.ts`, `app/api/games/fetch/route.ts`, `lib/formscore.ts`, `lib/analysis.ts`, `.planning/codebase/CONCERNS.md`

---

## Critical Pitfalls

Mistakes that cause data corruption, user-invisible failures, or require rewrites.

---

### Pitfall 1: Fire-and-forget bulk fetch with no partial failure model

**What goes wrong:** The bulk "Hämta alla resultat" button fires N concurrent POST requests to `/api/games/[gameId]/results`. If requests 1, 3, 5 succeed and 2, 4, 6 fail (ATG 429 or 503), the UI either (a) reports total success because some succeeded, or (b) reports total failure. In both cases the user does not know which rounds are still missing results and must manually investigate.

**Why it happens:** `ResultsButton.tsx` already models a single fire-and-wait pattern with a single success/error string. Extending it to N rounds with `Promise.all()` inherits the same all-or-nothing reporting. `fetchGameResults()` in `lib/atg.ts` throws on non-OK HTTP status — it does not return a structured error alongside a result. There is no per-item success tracking.

**Consequences:**
- Partial evaluation data. The evaluation page (`app/(authenticated)/evaluation/page.tsx`) computes hit rates from `starters` rows where `finish_position IS NOT NULL`. A round where the bulk fetch silently failed contributes zero denominator rows, skewing accuracy statistics upward.
- The user may believe results are complete and make betting decisions on incomplete evaluation data.

**Prevention:**
- Model bulk fetch as an array of `{ gameId, status: 'success' | 'failed' | 'no-results-yet', updated?, error? }` items.
- Use `Promise.allSettled()` instead of `Promise.all()` so individual failures do not abort the batch.
- Return a summary: "X av Y omgångar uppdaterade. Misslyckades: [datum]."
- Persist per-game fetch status so a retry only retries failed rounds.

**Detection:** User sees evaluation hit rate that looks suspiciously high; opening individual rounds shows some have no result rows.

---

### Pitfall 2: ATG rate limiting destroys bulk fetch silently

**What goes wrong:** ATG does not publish rate limits. The codebase already notes "assumed 60 req/min per IP" (`CONCERNS.md`, Scaling Limits section). A bulk fetch of 10 rounds fires 10 POST requests to `/api/games/[gameId]/results`, each of which calls `fetchGameResults()` which calls `fetch(ATG_BASE/games/[gameId])`. That is 10 ATG API calls in rapid succession, all from the same server IP.

`fetchGameResults()` throws when `!res.ok` — a 429 response causes an uncaught throw that the results route handler catches and returns as HTTP 500. From the client's perspective, a rate-limited round looks identical to a genuine server error.

**Why it happens:**
- `lib/atg.ts` lines 296–303: `fetchGameResults()` uses a bare `fetch()` with no retry, no exponential backoff, and no 429-specific handling.
- The existing single-round flow does not hit this because users click manually with seconds between clicks.
- Bulk fetching removes the human delay.

**Consequences:**
- A burst of 10 simultaneous ATG fetches from server-side Next.js route handlers hits ATG from a single IP simultaneously. Even if individual round fetches would succeed when spread over time, the burst pattern may trigger ATG's rate limiter.
- Failed fetches return HTTP 500 indistinguishable from real errors.

**Prevention:**
- Serialize bulk fetches with sequential execution and a 500–1000ms delay between each ATG call (not `Promise.all`).
- Alternatively: expose a single server-side bulk endpoint that processes rounds sequentially with delay, rather than having the client fire N parallel requests.
- Add 429-specific handling in `fetchGameResults()`: detect HTTP 429, wait (Retry-After header if present, otherwise 2s), retry once.
- Log ATG response status codes in the results route for operational visibility.

**Detection:** Multiple simultaneous 500 responses when running bulk fetch; ATG API calls returning 429 in server logs.

---

### Pitfall 3: CS stored in DB is computed without track config; changing config does not update stored scores

**What goes wrong:** `calculateCompositeScore()` is called in `app/api/games/fetch/route.ts` (line 126) and the resulting `formscore` value is written to the `starters` table. This is a snapshot at fetch time. The CS formula currently has a hardcoded static track bias table (`TRACK_BIAS_VOLTE` in `lib/analysis.ts` lines 77–81) and a dynamic horse-history component, but no per-track open-stretch or short-race-distance modifiers.

When track configuration is added to Supabase and CS is adjusted to incorporate it, all previously stored `formscore` values become stale — they were calculated without the track factor. The evaluation page reads `formscore` from `starters` directly (line 156 of `evaluation/page.tsx`). Old rounds will be evaluated with the pre-config CS score while new rounds use the post-config score. This makes the evaluation comparison invalid.

**Why it happens:** CS is computed once at fetch time and stored. It is not recomputed when inputs change. This is a known architectural issue (see `CONCERNS.md`, Performance Bottlenecks: "Cache Composite Score in database alongside starters").

**Consequences:**
- Evaluation statistics mix two incompatible scoring systems across rounds.
- A "before/after config" comparison is impossible to isolate.
- Users may believe their track config improved the model when what they are seeing is a recency bias from different scoring algorithms.

**Prevention (option A — preferred for MVP):** Do not store the track-config-adjusted CS in `formscore`. Keep `formscore` as the track-config-agnostic base score. Compute the track-adjusted CS only at display time in `AnalysisPanel.tsx` and `HorseCard.tsx`, client-side. The evaluation page continues to use the base `formscore` for consistency across rounds.

**Prevention (option B — if evaluation must use adjusted CS):** Add a `cs_with_track` column to `starters`. Add a `track_config_version` integer to the `track_configs` table. When config changes, trigger a background recompute job that updates `cs_with_track` for all starters on affected tracks. The evaluation page shows a warning when rounds have mixed config versions.

**Detection:** Evaluation hit rate changes after track config is saved, even for old rounds that were already evaluated.

---

### Pitfall 4: RLS for track config allows any authenticated user to read but the permission boundary for write is ambiguous

**What goes wrong:** The existing RLS pattern in `schema.sql` is binary: `authenticated` users can SELECT, `service_role` can do everything. There is no concept of "admin" or "group owner" at the database level for a shared track-config table.

Track configuration is meant to be admin-editable per the project requirements: "Bankonfiguration kräver att användaren är admin/ägare av sällskap (RLS)" (`PROJECT.md`). But the groups table has a `created_by` foreign key — there is no global app-admin role, only group owners. If track configs are global (not per-group), then any group owner could modify them, or conversely, nobody can without service_role.

**Why it happens:** The app does not have a concept of app-level admin separate from group-level owner. Adding a globally shared config table forces a decision that the existing RLS model has not addressed.

**Consequences:**
- If RLS allows all `authenticated` users to INSERT/UPDATE track config: any user can corrupt the pre-populated data.
- If RLS requires `service_role` only: no user can edit track config from the UI without going through a route handler that uses `createServiceClient()`, which bypasses all RLS — meaning the route handler itself must enforce who is allowed to call it.
- If permission check is only in the React component (hide edit button for non-admins), a direct POST to the route handler bypasses it.

**Prevention:**
- Decide scope: is track config global (one config for all users) or per-group (each group can override)?
- If global: create an `app_admins` table (user_id FK to auth.users), add RLS policy `using (auth.uid() in (select user_id from app_admins))` for UPDATE/INSERT on track_configs. Seed the admin with a known user ID.
- If per-group: add `group_id` to track_configs, add RLS policy that allows UPDATE only if `auth.uid() = (select created_by from groups where id = group_id)`.
- The route handler that saves track config must always re-verify the caller's identity against Supabase auth, not trust client-side claims. Do not use `createServiceClient()` for user-initiated writes — use the user's session client and rely on RLS to enforce.

**Detection:** Route handler for saving track config accessible by any authenticated user; manual POST with a different user's session succeeds.

---

## Moderate Pitfalls

---

### Pitfall 5: "No results yet" (422) treated as error in bulk fetch aggregation

**What goes wrong:** The existing results route returns HTTP 422 with `{ error: "Inga resultat tillgängliga ännu..." }` when `!gameResults.is_complete`. In `ResultsButton.tsx` this is handled as a special non-error state. In a bulk fetch implementation that processes responses, 422 must be explicitly distinguished from 5xx errors — a 422 means "not ready yet" (normal) while 5xx means "something broke" (actionable).

If a bulk implementation uses a generic `!res.ok` check, it will classify 422 as a failure and report it to the user as an error, creating confusion when rounds simply haven't finished racing yet.

**Prevention:**
- The bulk fetch result model must include a three-way status: `success`, `not-ready` (422), and `error` (4xx/5xx other).
- Show "not-ready" rounds differently in the UI — neutral, not red — with a label like "Resultat ej tillgängliga ännu."
- Do not retry 422 in the same bulk session; the race hasn't finished.

---

### Pitfall 6: Pre-populated track data hardcoded in migration becomes a source of truth mismatch

**What goes wrong:** The plan is to pre-populate track config with known Swedish track data in the migration SQL. If ATG later changes a track's configuration (adds an open stretch to a previously non-open track, changes a distance threshold), the hardcoded seed data is wrong. Users who rely on "it came pre-filled so it must be correct" will not think to verify or override it.

**Why it happens:** Seed data in migrations is easy to write once and forget. There is no mechanism to update seed data without writing a new migration, and there is no UI signal to users that the pre-filled value may be stale.

**Prevention:**
- Add a `source` column to track_configs: `'seeded'` vs `'user_configured'`. Visually differentiate seeded vs user-edited rows in the admin UI (e.g., "Förifyllt — kontrollera mot aktuell baninfo").
- Add a `last_verified_at` timestamp that admins update when they confirm a value is current.
- Do NOT treat seeded values as authoritative defaults in CS calculation — treat them as "best guess" and note the uncertainty in the UI.

---

### Pitfall 7: Bulk fetch triggers `gradeSystemsForGame()` for every round, causing N sequential DB operations

**What goes wrong:** The results route handler (line 81 of `results/route.ts`) calls `gradeSystemsForGame(supabase, gameId)` after updating starters. This is a non-fatal call but it runs synchronously within the request. For a bulk fetch of 10 rounds, this call runs 10 times. If `gradeSystemsForGame` does significant DB work per call (joining systems, computing scores), the bulk fetch becomes much slower than 10 × single-fetch time.

**Prevention:**
- Verify what `gradeSystemsForGame` does in `lib/systems.ts` before implementing bulk fetch.
- If it is expensive, consider running it once after all bulk fetches complete, or fire it as a background task (non-awaited).
- The existing `try/catch` already isolates failures, which is correct — maintain that isolation.

---

### Pitfall 8: CS track factor currently uses only static post-position bias; new track config adds a second adjustment layer that may double-apply

**What goes wrong:** `computeTrackFactor()` in `lib/analysis.ts` already applies a post-position bias (heavier penalty for outer posts in volt start). The proposed open-stretch and short-race-distance factors are additional track-specific adjustments. If both are applied multiplicatively without care, a horse at post 8 on an open-stretch track gets penalized by the post-position table AND receives no open-stretch bonus correction, effectively applying the volt-start bias to a track where inside/outside doesn't matter.

**Prevention:**
- Clearly define whether open-stretch config *replaces* or *modulates* the static `TRACK_BIAS_VOLTE` values.
- If open stretch: the post-position bias should be reduced or neutralized for volt-start races (since open stretch equalizes starting positions).
- Document the interaction explicitly in `lib/analysis.ts` before implementing, as the existing `TRACK_BIAS_VOLTE` table is opaque about its assumptions.
- Test with extreme inputs: post position 12 on an open-stretch volt-start track should not result in a near-zero CS component.

---

## Minor Pitfalls

---

### Pitfall 9: Bulk fetch UI state needs idempotency guard

**What goes wrong:** If the user clicks "Hämta alla resultat" twice before the first batch completes, two concurrent bulk fetch operations run. Each fires requests for the same game IDs. Two simultaneous POSTs to the same results route for the same gameId run two concurrent `UPDATE starters SET finish_position...` operations. While this is not destructive (both write the same values), it wastes ATG API quota and doubles load.

**Prevention:**
- Disable the bulk fetch button while any bulk operation is in progress (same pattern as `ResultsButton.tsx`'s `loading` state).
- Set loading to `true` immediately on click, before any async work begins.

---

### Pitfall 10: Track config table name and column naming must align with CS formula parameter names from day one

**What goes wrong:** The CS formula in `formscore.ts` calls `computeTrackFactor(postPosition, startMethod, horseHistory)` — there are no track-level parameters in this signature yet. Adding track config requires either extending the function signature or passing a `trackConfig` object. If the DB column names chosen in the migration don't match the TypeScript interface chosen in `lib/analysis.ts`, there will be a translation layer of field remapping.

**Prevention:**
- Define the TypeScript `TrackConfig` interface in `lib/types.ts` before writing the migration SQL, so the migration column names match the interface from the start.
- Avoid abbreviations in column names that differ from the TypeScript property names (e.g., `open_str` in DB vs `openStretch` in TS causes unnecessary mapping).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Bulk fetch button (EvaluationPanel) | Partial failure invisible to user; 422 conflated with errors | Use `Promise.allSettled`; three-way status model |
| Bulk fetch concurrency | ATG rate limit triggered by burst from server IP | Sequential execution with 500ms delay between rounds |
| gradeSystemsForGame in bulk | N × expensive DB operation per bulk call | Profile first; run once after batch if expensive |
| Track config DB schema | RLS write permission not defined for non-service clients | Decide scope (global vs per-group) before migration |
| Track config pre-population | Seed data becomes stale silently | Add `source` + `last_verified_at` columns; UI signal |
| CS recalculation on config change | Stored `formscore` values become cross-algorithm | Keep track-adjusted CS client-side only (Option A) |
| open-stretch factor calculation | Double-applies post-position penalty on open-stretch tracks | Define replacement vs modulation explicitly; test edge cases |
| Track config TypeScript interface | DB column names diverge from TS property names | Define TS interface first, derive migration from it |

---

## Sources

All findings are grounded in direct codebase inspection. Confidence: HIGH.

| Evidence | Location | Finding |
|----------|----------|---------|
| `fetchGameResults()` throws on non-OK, no retry | `lib/atg.ts:296-303` | Rate limit 429 indistinguishable from error |
| `Promise.all()` pattern for horse starts fetch | `app/api/games/fetch/route.ts:100-113` | Burst ATG requests per race |
| `formscore` written to DB at fetch time | `app/api/games/fetch/route.ts:180, 186` | Stored CS becomes stale when config changes |
| Evaluation reads `formscore` from DB directly | `app/(authenticated)/evaluation/page.tsx:155-156` | Old rounds evaluated with pre-config scores |
| RLS pattern: `authenticated` read-only, `service_role` write all | `supabase/schema.sql:61-70` | No user-level write policy for track config |
| No global admin concept | `supabase/schema.sql`, `lib/actions/groups.ts` | Track config admin role undefined |
| `gradeSystemsForGame` called per result fetch | `app/api/games/[gameId]/results/route.ts:81-85` | Bulk fetch multiplies this cost |
| `TRACK_BIAS_VOLTE` static table already applied | `lib/analysis.ts:77-90` | New track factor risks double-applying bias |
| ATG rate limit assumed 60/min per IP | `.planning/codebase/CONCERNS.md` (Scaling Limits) | Confirmed concern, unverified official limit |
| 422 handled as special case in single-round flow | `components/ResultsButton.tsx:24-27` | Must be preserved in bulk flow |
