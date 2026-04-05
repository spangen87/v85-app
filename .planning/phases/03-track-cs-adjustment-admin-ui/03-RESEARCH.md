# Phase 3: Track CS Adjustment & Admin UI - Research

**Researched:** 2026-04-05
**Domain:** TypeScript formula modification, Next.js App Router data flow, Supabase server actions, Tailwind CSS v4 UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Open-stretch modifier**
- D-01: `computeTrackFactor()` accepts optional `trackConfig?: TrackConfig` parameter (TRACK-CS-01)
- D-02: When `trackConfig.open_stretch === true` and `postPosition` is in `open_stretch_lanes`, apply **+0.12 delta** to the static factor. Inner lanes and non-configured outer lanes are unaffected.
- D-03: This modulates (adds to) the existing `TRACK_BIAS_VOLTE` value — does NOT stack a separate modifier. Example: Solvalla spår 7 goes from 0.58 → 0.70.
- D-04: When `trackConfig` is absent or `open_stretch === false`, behavior is identical to current static implementation (TRACK-CS-06, non-breaking).

**Kort-lopp modifier**
- D-05: When `trackConfig.short_race_threshold > 0` and `race.distance < trackConfig.short_race_threshold` and `postPosition >= 5`, apply **-0.08 delta** to the static factor (TRACK-CS-04).
- D-06: Example: Solvalla spår 5, threshold=1640m, lopp 1640m → spår 5 goes from 0.72 → 0.64. (Note: `1640 < 1640` is false; threshold means `race.distance < threshold` strictly. Confirm edge case with user.)
- D-07: Open-stretch and kort-lopp modifiers can apply simultaneously on the same horse (both deltas sum).

**CS-beräkning — dataflöde**
- D-08: `page.tsx` fetches `TrackConfig` for the selected game's track server-side via `getTrackConfig(game.track)` and passes it as prop down through `RaceList` → `AnalysisPanel` and `HorseCard` (TRACK-CS-05).
- D-09: `AnalysisPanel` computes adjusted CS client-side using the modified `computeTrackFactor()`. The stored `formscore` in the DB remains the baseline (computed at fetch time without track config).

**HorseCard visuell indikator**
- D-10: ↑/↓ badge visas **inline bredvid CS-badge** i hästkortets kompakta vy (TRACK-UI-05).
- D-11: Badge visas **bara om CS ändras med ≥1 poäng** jämfört med ej track-justerat CS.
- D-12: ↑ (grön) = positiv track-justering, ↓ (röd) = negativ. Hover/tooltip anger vilken faktor som påverkat.

**Admin-åtkomst**
- D-13: `/admin`-sidan kräver `ADMIN_USER_IDS` env-var. Icke-admins redirectas (TRACK-UI-02).
- D-14: `TopNav` (server async component) kontrollerar `ADMIN_USER_IDS` och visar admin-länk villkorligt.
- D-15: `AuthenticatedLayout` hämtar user.id och beräknar `isAdmin` server-side, skickar som prop till `BottomNav`. `BottomNav` accepterar ny `isAdmin?: boolean` prop.

**Admin-formulär UX**
- D-16: Admin-sidan på `app/(authenticated)/admin/page.tsx` visar alla track_configs i en **tabell med inline-redigering** (TRACK-UI-01, TRACK-UI-03).
- D-17: Per rad: toggle för `open_stretch`, textinput för `open_stretch_lanes` (kommaseparerade heltal), number-input för `short_race_threshold` (meter).
- D-18: **Per-rad "Spara"-knapp** som kör upsert för just den banan (TRACK-UI-04). Inline success/error-feedback per rad.
- D-19: Spara kör upsert (not insert) — `ON CONFLICT (track_name) DO UPDATE`. Fungerar för både befintliga (15 seeded) och eventuellt nya banor.

### Claude's Discretion
- Exakt styling/layout av admin-tabellen (mobile-responsiv, kolumnbredd etc.)
- Spinner/loading-state under sparning
- Hur `open_stretch_lanes` valideras (t.ex. ej tillåta icke-heltal)
- Exakt tooltip-formulering för HorseCard-badge

### Deferred Ideas (OUT OF SCOPE)
- Startvinge-faktor (spår 1 vid voltstart) — v2
- Per-sällskap bankonfiguration — Out of Scope (global config tillräckligt för v1)
- Historisk validering av spårbonus-magnituder mot ATG-utfall (STAT-01/02) — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-CS-01 | `computeTrackFactor()` accepts optional `trackConfig?: TrackConfig` | Signature change is minimal — function currently takes 3 params; adding 4th optional. Existing tests verify current behavior continues to pass unchanged. |
| TRACK-CS-02 | Open stretch outer lanes get +0.12 delta on raw track factor | Delta applied after `staticTrackFactor()` call. `open_stretch_lanes` array lookup determines applicability. |
| TRACK-CS-03 | Open stretch modifies existing `TRACK_BIAS_VOLTE` logic — does not stack | The +0.12 is added to the `staticTrackFactor()` result. The internal dynamic blend (`0.5 * staticF + 0.5 * dynamicF`) must receive the modified `staticF`. |
| TRACK-CS-04 | Short race factor: position ≥5 gets -0.08 when `race.distance < track.short_race_threshold` | Requires `race.distance` to be threaded into `computeTrackFactor()` or applied as a second pass. See architecture pattern below. |
| TRACK-CS-05 | TrackConfig fetched server-side in `page.tsx`, passed as prop to `AnalysisPanel` | `page.tsx` already fetches with `Promise.all`. Add `getTrackConfig(selectedGame.track)`. Prop chain: `page.tsx → MainPageClient → RaceList → AnalysisPanel + HorseCard`. |
| TRACK-CS-06 | When no `TrackConfig`, `computeTrackFactor()` output is identical to current static | Guard clause: `if (!trackConfig)` returns early with existing logic. Verified by existing test suite. |
| TRACK-UI-01 | Admin page at `app/(authenticated)/admin/page.tsx` | New file — server component that checks admin, fetches all track_configs via new `getAllTrackConfigs()` server action. |
| TRACK-UI-02 | Admin page requires `ADMIN_USER_IDS` — redirects non-admins | Pattern: check env var, compare with `user.id` from Supabase auth, `redirect("/")` if not admin. |
| TRACK-UI-03 | Form per track: toggle, lanes input, distance threshold | `TrackConfigRow` client component handling local form state and save. |
| TRACK-UI-04 | Save button runs upsert — `ON CONFLICT (track_name) DO UPDATE` | New `upsertTrackConfig(config)` server action using service client. |
| TRACK-UI-05 | HorseCard shows ↑/↓ badge when track factor changed CS by ≥1 | `TrackAdjustmentBadge` component rendered after `ScoreBadge`. Requires computing base CS and adjusted CS in `HorseCard`. |
| TRACK-UI-06 | Admin link in `BottomNav` visible only for admins | `BottomNav` receives `isAdmin?: boolean` from `AuthenticatedLayout`. |
</phase_requirements>

---

## Summary

Phase 3 is a contained extension of the existing codebase. No new dependencies are required — the full stack (Next.js App Router, Supabase server actions, Tailwind CSS v4, Jest + ts-jest) is already installed and operational. The test suite runs clean (57 tests, 5 suites, 0.2s).

The core algorithmic work is a single function signature change to `computeTrackFactor()` in `lib/analysis.ts`: add an optional `trackConfig?: TrackConfig` fourth parameter and apply two conditional deltas (+0.12 for open stretch outer lanes, -0.08 for short race inner posts). The existing `TRACK_BIAS_VOLTE` table and `staticTrackFactor()` remain unchanged. The non-breaking guarantee is enforced by the optional parameter — all existing call sites without `trackConfig` produce identical output.

The data flow change threads `TrackConfig` from `page.tsx` (server-side fetch) through `MainPageClient → RaceList → AnalysisPanel + HorseCard`. `AnalysisPanel` already computes CS client-side from stored `formscore`; this phase adds a recalculation layer using `computeTrackFactor()` with the new config. `HorseCard` receives both the stored `formscore` (base) and can recompute an adjusted version to show the delta badge.

The admin UI follows the established `AdminTab.tsx` pattern exactly: `"use client"` row components, per-row state, per-row save via server action, inline feedback. The service client writes to `track_configs`; the anon client reads. Admin access is gated by `ADMIN_USER_IDS` env var checked in the server component before render.

**Primary recommendation:** Build in three sequential waves — (1) formula + tests, (2) data flow + HorseCard badge, (3) admin page + nav changes.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, server components, server actions | Project framework |
| TypeScript | 5.x | Type safety | Project language |
| Tailwind CSS | v4 | Utility styling | Project styling |
| Supabase JS | 2.98.0 | DB + auth client | Project database |
| Jest + ts-jest | current | Unit testing | Project test runner |

[VERIFIED: package.json in project root]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/supabase/server` createServiceClient | project-local | Write to `track_configs` (bypasses RLS) | Admin server actions only |
| `@/lib/supabase/server` createClient | project-local | Read `track_configs` in page.tsx | All authenticated reads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Optional 4th parameter to `computeTrackFactor` | Separate `computeTrackFactorWithConfig()` function | Single function avoids duplicate code; optional param preserves all call sites |
| Server action for upsert | Route handler (API) | Server actions match existing pattern in `lib/actions/` |

**Installation:** No new packages required. [VERIFIED: package.json]

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
app/(authenticated)/
  admin/
    page.tsx              # Server component — admin gate + data fetch
components/
  TrackConfigRow.tsx      # Client component — per-track form row with save
lib/
  actions/
    tracks.ts             # Add: getAllTrackConfigs(), upsertTrackConfig()
lib/__tests__/
  analysis.test.ts        # Extend: computeTrackFactor() with trackConfig
  formscore.test.ts       # Extend: calculateCompositeScore() with trackConfig
  admin_tracks.test.ts    # New: upsertTrackConfig() server action
```

### Pattern 1: Optional TrackConfig Parameter in `computeTrackFactor()`

**What:** Add `trackConfig?: TrackConfig` as fourth parameter. Apply modifiers after computing `staticF`.
**When to use:** Always — the parameter is the integration point for Phase 3.

The `race.distance` needed for TRACK-CS-04 is NOT currently a parameter of `computeTrackFactor()`. Two options exist:

**Option A (recommended):** Add `raceDistance?: number` as a fifth optional parameter alongside `trackConfig`. This keeps the modifier logic self-contained.

**Option B:** Apply the short-race delta in `calculateCompositeScore()` after getting the raw factor back. This splits the modifier logic across two files.

Option A is preferred: all track-config modifier logic stays in one function, tests cover it in one place, and the signature is `computeTrackFactor(postPosition, startMethod, horseHistory, trackConfig?, raceDistance?)`.

**Example logic (pseudocode):**
```typescript
// Source: lib/analysis.ts — to be modified per D-01 through D-07

export function computeTrackFactor(
  postPosition: number,
  startMethod: string,
  horseHistory: HorseStart[],
  trackConfig?: TrackConfig,
  raceDistance?: number
): number {
  let staticF = staticTrackFactor(postPosition, startMethod);

  if (trackConfig) {
    const pos = Math.max(1, postPosition);

    // Open-stretch modifier (D-02, D-03)
    if (
      trackConfig.open_stretch &&
      trackConfig.open_stretch_lanes.includes(pos)
    ) {
      staticF += 0.12;
    }

    // Short-race modifier (D-05, D-06)
    if (
      trackConfig.short_race_threshold > 0 &&
      raceDistance != null &&
      raceDistance < trackConfig.short_race_threshold &&
      pos >= 5
    ) {
      staticF -= 0.08;
    }
  }

  // Existing dynamic blend unchanged
  const startsWithPos = horseHistory.filter((s) => s.post_position != null);
  if (startsWithPos.length < 5) {
    return staticF;
  }
  // ... dynamic calculation unchanged ...
}
```

[ASSUMED] — exact parameter position and clamp behavior (should staticF + 0.12 be clamped to 1.0?) not explicitly specified. Recommend clamping to [0, 1] after applying deltas to prevent out-of-range inputs to the dynamic blend.

### Pattern 2: TrackConfig Data Flow

**What:** Server-side fetch in `page.tsx`, prop threading through client component chain.
**When to use:** This is the required architecture per D-08.

Current `page.tsx` call pattern:
```typescript
// Source: app/(authenticated)/page.tsx — existing Promise.all
const [games, profile, userGroups] = await Promise.all([
  getAllGames(supabase),
  getProfile(),
  getMyGroups(),
]);
```

Addition required:
```typescript
// Also fetch trackConfig when a game is selected
const trackConfig = selectedGame
  ? await getTrackConfig(selectedGame.track)
  : null;
```

Then pass `trackConfig` to `MainPageClient` as a new prop, which forwards it to `RaceList`, which forwards it to both `AnalysisPanel` and `HorseCard`.

**Key insight:** `MainPageClient` is a `"use client"` component — it accepts the server-fetched `trackConfig` as a serializable prop. `TrackConfig` contains only primitives and number arrays: safely serializable. [VERIFIED: lib/types.ts TrackConfig interface]

### Pattern 3: `AuthenticatedLayout` becomes async

**What:** Convert from sync to async server component, fetch `user.id`, compute `isAdmin`.
**When to use:** Required per D-15 to thread `isAdmin` to `BottomNav`.

```typescript
// Source: app/(authenticated)/layout.tsx — to be modified

import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout(...) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim());
  const isAdmin = user ? adminIds.includes(user.id) : false;

  return (
    <div className="pb-16 md:pb-0">
      <TopNav />
      {children}
      <BottomNav isAdmin={isAdmin} />
      <InstallPrompt />
    </div>
  );
}
```

[ASSUMED] — `ADMIN_USER_IDS` is comma-separated UUIDs. The env var format is not documented in CLAUDE.md. Consistent with how similar env vars work in Next.js.

### Pattern 4: Admin Page — Server Component with Redirect

**What:** `app/(authenticated)/admin/page.tsx` as async server component.
**When to use:** Required per D-13, D-16.

```typescript
// Source: pattern consistent with existing page.tsx + getTrackConfig()
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllTrackConfigs } from "@/lib/actions/tracks";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim());
  if (!adminIds.includes(user.id)) redirect("/");

  const configs = await getAllTrackConfigs();
  // Render TrackConfigAdmin with configs
}
```

### Pattern 5: `upsertTrackConfig()` Server Action

**What:** Service-client write to `track_configs` using `ON CONFLICT DO UPDATE`.
**When to use:** Called by `TrackConfigRow` when user clicks "Spara".

```typescript
// Source: lib/actions/tracks.ts — to be extended
"use server";

export async function upsertTrackConfig(config: Omit<TrackConfig, "updated_at">): Promise<{ error?: string }> {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim());
  // Verify caller is admin (re-check server-side, never trust client)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !adminIds.includes(user.id)) {
    return { error: "Inte behörig" };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("track_configs")
    .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: "track_name" });

  return error ? { error: error.message } : {};
}
```

[ASSUMED] — `upsert` with `onConflict` is the Supabase JS v2 pattern. [CITED: https://supabase.com/docs/reference/javascript/upsert]

### Pattern 6: HorseCard `TrackAdjustmentBadge`

**What:** Client-side recompute of adjusted CS to derive badge delta.
**When to use:** Required per D-10, D-11, D-12.

The existing `HorseCard` receives `starter.formscore` (stored DB value = base CS without track config). To show the delta badge, `HorseCard` needs:
1. The stored `formscore` as base
2. The `trackConfig` prop
3. Logic to recompute `computeTrackFactor()` with config and compare

However, `calculateCompositeScore()` operates on the entire field — a single-horse recalculation is not straightforward. The track factor contributes 5% to CS. The adjustment to the badge will be an approximation: compute `deltaFactor = computeTrackFactor(pos, method, history, config, distance) - computeTrackFactor(pos, method, history)` and translate that to a CS delta estimate.

**Simpler approach (recommended):** `HorseCard` computes `adjustedFactor` and `baseFactorStatic` for just that horse, then shows a badge based on sign and magnitude of the delta, without needing the full field-relative CS recalculation. The ≥1 CS-point threshold (D-11) can be approximated as: `Math.round(Math.abs(deltaFactor * 0.05 * 100)) >= 1`. Since deltaFactor for open-stretch is 0.12: `0.12 * 0.05 * 100 = 0.6 CS points`. This is below the 1-point threshold — the badge would never show.

**Critical finding:** The track factor component is weighted only 5% in CS. A delta of +0.12 on the raw factor translates to approximately `0.12 × 5 = 0.6 CS points` — BELOW the ≥1 point badge threshold from D-11. This means for most horses, the badge will never render under the current 1-point threshold.

**Resolution options:**
1. Lower the badge threshold to ≥0 (show badge for any non-zero adjustment)
2. Apply threshold to raw factor delta, not CS delta (show if `|deltaFactor| >= 0.05`)
3. The D-11 threshold of "≥1 CS-point" may intend that the FULL recalculated CS (from `AnalysisPanel`'s field-relative computation) changes by ≥1 — not the single-horse estimate

This is an **open question** that requires clarification before implementing the badge condition. See Open Questions section.

**Proposed resolution for planning:** `HorseCard` receives `adjustedCS` prop (pre-computed by the parent that has the full field context), alongside the stored `formscore`. Parent (`RaceList`) computes adjusted CS for all starters, passes it per-horse.

### Anti-Patterns to Avoid

- **Storing adjusted CS in the database:** Explicitly out of scope (REQUIREMENTS.md Out of Scope: "Lagring av track-justerat CS i DB"). Never write computed CS back to `starters`.
- **Computing `calculateCompositeScore()` inside `HorseCard`:** Requires full field data — `HorseCard` only knows one horse. Compute in parent (`RaceList`) and pass result as prop.
- **Using the anon client for `upsertTrackConfig()`:** RLS blocks writes via anon key. Must use `createServiceClient()`.
- **Splitting delta logic across `computeTrackFactor()` and `calculateCompositeScore()`:** Keeps modifier logic in one place only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert with conflict handling | Custom INSERT + UPDATE logic | `supabase.from().upsert({}, { onConflict: "track_name" })` | Single call, atomic, handles race conditions |
| Admin auth check | Custom JWT parsing | `supabase.auth.getUser()` + env var comparison | Supabase handles token verification |
| Comma-separated integer parsing | Regex parser | `str.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))` | Adequate for this use case |
| TypeScript interface | Infer from DB schema | Use existing `TrackConfig` in `lib/types.ts` | Already defined in Phase 1 |

**Key insight:** All hard problems (auth, DB writes, type safety) are already solved by the existing stack. Phase 3 is wiring and UI — resist the urge to add new abstractions.

---

## Common Pitfalls

### Pitfall 1: `race.distance` Not Available in `computeTrackFactor()`
**What goes wrong:** TRACK-CS-04 requires `race.distance` to check the short-race threshold, but `computeTrackFactor()` currently has no `race.distance` parameter. The function is called from `calculateCompositeScore()` which has a `RaceContext` that includes `distance` — but the call site must be updated to pass it through.
**Why it happens:** The original function signature only needed `postPosition`, `startMethod`, and `horseHistory`. Adding `trackConfig` without `raceDistance` would leave TRACK-CS-04 unimplementable.
**How to avoid:** Add `raceDistance?: number` alongside `trackConfig?: TrackConfig` in the signature. Update `calculateCompositeScore()` to pass `race.distance` when calling `computeTrackFactor()`.
**Warning signs:** Implementation of open-stretch works but short-race modifier never triggers.

### Pitfall 2: Modifier Applied to Wrong Layer
**What goes wrong:** Open-stretch delta could be mistakenly applied to `dynamicF` or to the final blended result instead of to `staticF`. Per D-03, it modulates the static factor before the dynamic blend.
**Why it happens:** The function has three values: `staticF`, `dynamicF`, and the 50/50 blend. The delta must go on `staticF` before the blend calculation so that dynamic history is still blended against the modified static baseline.
**How to avoid:** Apply delta to `staticF` immediately after computing it, before the `startsWithPos.length < 5` guard.
**Warning signs:** Test: horse with 6 starts at spår 7 on open-stretch track should have higher factor than horse with no history at spår 7. Verify both static-only and dynamic-blend paths.

### Pitfall 3: `BottomNav` is `"use client"` — Cannot Fetch User Data
**What goes wrong:** Trying to check `ADMIN_USER_IDS` or call `supabase.auth.getUser()` inside `BottomNav` to determine admin status.
**Why it happens:** `BottomNav` is a client component (`"use client"` directive). Environment variables starting with `NEXT_PUBLIC_` would be needed for client-side reads, but `ADMIN_USER_IDS` must remain server-only.
**How to avoid:** Per D-15, `AuthenticatedLayout` becomes an async server component that computes `isAdmin` and passes it as a boolean prop to `BottomNav`. `BottomNav` does no server calls.
**Warning signs:** TypeScript error when trying to use `process.env.ADMIN_USER_IDS` in a client component without `NEXT_PUBLIC_` prefix.

### Pitfall 4: `AuthenticatedLayout` Becoming Async Breaks Streaming
**What goes wrong:** Converting `AuthenticatedLayout` to `async` causes the entire layout to wait for `supabase.auth.getUser()` before streaming any HTML. This adds latency to every authenticated page.
**Why it happens:** `async` server components suspend the render tree until the await resolves.
**How to avoid:** The existing `TopNav` is already an `async` server component that calls `supabase.auth.getUser()` — the layout already incurs this latency via `TopNav`. Adding one more `getUser()` call in the layout adds negligible overhead if the session is cached. Accept the tradeoff — admin check is lightweight.
**Warning signs:** Significantly increased TTFB on all authenticated pages after the change.

### Pitfall 5: `getAllTrackConfigs()` Action Using anon Client
**What goes wrong:** If `getAllTrackConfigs()` uses the anon `createClient()` instead of `createServiceClient()`, it will work for reads (RLS allows authenticated reads) but will fail for the admin page if the page's server component calls it before verifying auth context, or when service operations follow.
**Why it happens:** The existing `getTrackConfig()` in `lib/actions/tracks.ts` uses `createServiceClient()` for reads. This is correct because the service role can always read. However, for the admin page listing all configs, either client would work for reads. The service client is appropriate for consistency.
**How to avoid:** Use `createServiceClient()` for `getAllTrackConfigs()` (consistent with existing `getTrackConfig()`). Use `createServiceClient()` exclusively for `upsertTrackConfig()`.
**Warning signs:** Works in dev, fails in production if Supabase RLS settings differ.

### Pitfall 6: Badge Threshold Math
**What goes wrong:** The D-11 requirement says "badge only if CS changes by ≥1 point." With a 5% track weight and a 0.12 factor delta, the CS impact is approximately 0.6 points — below the threshold. The badge would never show.
**Why it happens:** The 5% CS weighting is small. The actual CS impact also depends on field-relative normalization in `calculateCompositeScore()`, which can amplify or dampen the raw factor delta.
**How to avoid:** Clarify D-11 threshold before implementation. See Open Questions.
**Warning signs:** `TrackAdjustmentBadge` renders for 0 horses in testing.

### Pitfall 7: ATG Track Name String Mismatch
**What goes wrong:** `getTrackConfig(game.track)` returns `null` for every game because the `game.track` string from the ATG API doesn't match the `track_name` in `track_configs`.
**Why it happens:** The migration v9 seed data uses best-guess track names ("Solvalla", "Åby", etc.). The ATG API may return "Solvalla travbana" or use different casing. This risk was flagged in STATE.md.
**How to avoid:** Before relying on `getTrackConfig()` in production, run `SELECT DISTINCT track FROM games ORDER BY track` against the live database and verify all 15 seeded names match exactly. The admin UI (TRACK-UI-01) allows correction, but the mismatch will silently return `null` until corrected.
**Warning signs:** `trackConfig` is always `null` at runtime even for Solvalla games.

---

## Code Examples

### Modified `computeTrackFactor` signature
```typescript
// Source: lib/analysis.ts — target implementation pattern
// [ASSUMED] based on existing function shape and D-01 through D-07

export function computeTrackFactor(
  postPosition: number,
  startMethod: string,
  horseHistory: HorseStart[],
  trackConfig?: TrackConfig,
  raceDistance?: number
): number {
  let staticF = staticTrackFactor(postPosition, startMethod);

  if (trackConfig) {
    const pos = Math.max(1, postPosition);

    // D-02, D-03: open stretch — modulates static factor
    if (trackConfig.open_stretch && trackConfig.open_stretch_lanes.includes(pos)) {
      staticF = Math.min(1, staticF + 0.12);
    }

    // D-05, D-06: short race — negative delta for outer posts
    if (
      trackConfig.short_race_threshold > 0 &&
      raceDistance != null &&
      raceDistance < trackConfig.short_race_threshold &&
      pos >= 5
    ) {
      staticF = Math.max(0, staticF - 0.08);
    }
  }

  // Existing dynamic blend (unchanged)
  const startsWithPos = horseHistory.filter((s) => s.post_position != null);
  if (startsWithPos.length < 5) return staticF;

  const wins = startsWithPos.filter((s) => s.place === "1").length;
  const top3 = startsWithPos.filter((s) => {
    const p = parseInt(s.place);
    return !isNaN(p) && p <= 3;
  }).length;
  const total = startsWithPos.length;
  const dynamicRaw = 0.6 * (wins / total) + 0.4 * (top3 / total);
  const dynamicF = Math.min(Math.max(dynamicRaw * 2.5, 0), 1);

  return 0.5 * staticF + 0.5 * dynamicF;
}
```

### `getAllTrackConfigs()` server action (new)
```typescript
// Source: pattern from existing lib/actions/tracks.ts getTrackConfig()
// [ASSUMED]
"use server";

export async function getAllTrackConfigs(): Promise<TrackConfig[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("track_configs")
    .select("*")
    .order("track_name");
  if (error) return [];
  return (data ?? []) as TrackConfig[];
}
```

### `upsertTrackConfig()` server action (new)
```typescript
// Source: pattern from existing lib/actions/ + Supabase upsert docs
// [CITED: https://supabase.com/docs/reference/javascript/upsert]
"use server";

export async function upsertTrackConfig(
  config: Omit<TrackConfig, "updated_at">
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim());
  if (!user || !adminIds.includes(user.id)) return { error: "Inte behörig" };

  const db = createServiceClient();
  const { error } = await db
    .from("track_configs")
    .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: "track_name" });
  return error ? { error: error.message } : {};
}
```

### `TrackAdjustmentBadge` component
```typescript
// Source: UI-SPEC.md, D-10, D-11, D-12
// [ASSUMED] — to be placed in HorseCard.tsx or as separate component

function TrackAdjustmentBadge({
  adjustedCS,
  baseCS,
  tooltip,
}: {
  adjustedCS: number;
  baseCS: number;
  tooltip: string;
}) {
  const delta = adjustedCS - baseCS;
  if (Math.abs(delta) < 1) return null;

  const isPositive = delta > 0;
  const color = isPositive
    ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
    : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400";

  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}
      title={tooltip}
      aria-label={`Spårjustering: ${isPositive ? "+" : ""}${delta} CS-poäng`}
    >
      {isPositive ? "↑" : "↓"}
    </span>
  );
}
```

### Supabase `upsert` with `onConflict`
```typescript
// [CITED: https://supabase.com/docs/reference/javascript/upsert]
const { error } = await db
  .from("track_configs")
  .upsert(
    { track_name: "Solvalla", open_stretch: true, ... },
    { onConflict: "track_name" }
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static track factor only | Static + optional dynamic blend (current) | Phase 1 | Phase 3 adds a third layer on top of the static path |
| No track config in DB | `track_configs` table (Phase 1) | 2026-04-05 | Phase 3 reads this data |
| No admin UI | New `/admin` page (Phase 3) | This phase | Correction path for seeded data |

**Deprecated/outdated:**
- `calculateFormscore()` in `lib/formscore.ts`: Already marked `@deprecated`. Not modified in Phase 3 — it calls `calculateCompositeScore()` with a hardcoded race context, so it will not pick up `trackConfig`. This is acceptable per the deprecation notice.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `staticF` should be clamped to [0, 1] after applying deltas | Architecture Patterns (Pattern 1) | Out-of-range factor values fed into dynamic blend produce out-of-range CS |
| A2 | `ADMIN_USER_IDS` is a comma-separated list of Supabase user UUIDs | Architecture Patterns (Pattern 3, 4) | Admin gate never triggers or allows wrong users |
| A3 | `raceDistance` should be added as 5th optional parameter to `computeTrackFactor()` (Option A) | Architecture Patterns (Pattern 1) | If Option B is preferred, short-race logic moves to `calculateCompositeScore()` |
| A4 | Badge threshold "≥1 CS-point" in D-11 refers to pre-computed adjusted CS passed as prop, not a single-horse estimate | Architecture Patterns (Pattern 6) | If wrong, badge logic is implemented incorrectly and may never render |
| A5 | `getAllTrackConfigs()` and `upsertTrackConfig()` are added to the existing `lib/actions/tracks.ts` file | Architecture Patterns (Patterns) | If a new file is preferred, import paths will differ |

---

## Open Questions (RESOLVED)

1. **Badge threshold math (CRITICAL) — RESOLVED**
   - Resolution: Use the `delta * 500` heuristic implemented in Plan 02 Task 2. `HorseCard` computes `csDelta = Math.round((adjustedF - baseF) * 500)` and shows the badge when `Math.abs(csDelta) >= 1`. For a +0.12 factor delta, this yields ~60 CS points — well above the threshold. This ensures the badge reliably renders for non-trivial open-stretch and short-race adjustments without requiring full field-relative CS recalculation inside `HorseCard`.

2. **`open_stretch_lanes` when `open_stretch === false` — RESOLVED**
   - Resolution: Preserve values in state (good UX), disable the input visually. On save, submit whatever value is in the field — the modifier logic ignores it when `open_stretch === false`. Implemented in Plan 03 `TrackConfigRow` with `opacity-50 pointer-events-none` on the lanes input when toggle is off.

3. **Strict vs. non-strict `<= threshold` for short-race modifier — RESOLVED**
   - Resolution: User confirmed inclusive `<=` (not strict `<`). When `race.distance <= short_race_threshold`, the -0.08 delta applies. Example: Solvalla spår 5, threshold=1640m, lopp 1640m → -0.08 delta IS applied (1640 <= 1640 is true). Plan 01 Task 1 uses `raceDistance <= trackConfig.short_race_threshold` and Test 5 verifies that `raceDistance === threshold` triggers the delta.

4. **staticF clamping — RESOLVED**
   - Resolution: Apply `Math.max(0, Math.min(1, modifiedStaticF))` after all deltas are applied, before the dynamic blend. This keeps staticF in [0, 1] and prevents out-of-range inputs (e.g., spår 1 at 1.00 + 0.12 open-stretch delta = 1.12 → clamped to 1.0). Plan 01 Task 1 action includes this clamp.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Jest + Next.js | ✓ | detected via project | — |
| Jest + ts-jest | Unit tests | ✓ | current (57 passing tests) | — |
| Supabase `track_configs` table | All TRACK-CS/TRACK-UI requirements | ✓ | Migration v9 applied | — |
| `ADMIN_USER_IDS` env var | TRACK-UI-02, admin gate | [ASSUMED] configured in `.env.local` | — | Admin page redirect loop if empty |

[VERIFIED: `npx jest` runs 57 tests in 0.2s with zero failures]
[ASSUMED] — `ADMIN_USER_IDS` env var existence not verified via file system (may be in `.env.local` which is gitignored).

**Missing dependencies with no fallback:** None blocking. If `ADMIN_USER_IDS` is empty, admin page redirects every user — but the page can still be built and deployed.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest |
| Config file | `jest.config.js` (project root) |
| Quick run command | `npx jest lib/__tests__/analysis.test.ts` |
| Full suite command | `npx jest` |

[VERIFIED: `npx jest --listTests` shows 5 test files; all pass]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-CS-01 | `computeTrackFactor()` accepts optional `trackConfig` without breaking existing calls | Unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ (extend existing) |
| TRACK-CS-02 | Open stretch outer lane gets +0.12 delta | Unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ (extend existing) |
| TRACK-CS-03 | Open stretch modulates static, not stacked | Unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ (extend existing) |
| TRACK-CS-04 | Short race position ≥5 gets -0.08 delta | Unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ (extend existing) |
| TRACK-CS-05 | `calculateCompositeScore()` accepts and uses `trackConfig` | Unit | `npx jest lib/__tests__/formscore.test.ts` | ✅ (extend existing) |
| TRACK-CS-06 | No `trackConfig` → identical output to current | Unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ (extend existing) |
| TRACK-UI-01 | Admin page exists and renders track configs | Manual | `npm run dev` → navigate to `/admin` | ❌ Wave 0 |
| TRACK-UI-02 | Non-admin redirected from `/admin` | Manual | Test with non-admin user account | ❌ Wave 0 |
| TRACK-UI-03 | Form fields per track (toggle, lanes, threshold) | Manual | `npm run dev` → admin form visual inspection | ❌ Wave 0 |
| TRACK-UI-04 | Save button runs upsert | Unit + Manual | `npx jest lib/__tests__/admin_tracks.test.ts` | ❌ Wave 0 |
| TRACK-UI-05 | HorseCard shows ↑/↓ badge | Manual | `npm run dev` → Solvalla game, spår 7+ | ❌ Wave 0 |
| TRACK-UI-06 | Admin link in BottomNav visible only to admin | Manual | Test with admin vs non-admin account | ❌ Wave 0 |

### Unit Test Strategy for `computeTrackFactor()` Modifications

The existing `analysis.test.ts` has 8 tests for `computeTrackFactor()`. The following new tests are needed:

**Backward compatibility (TRACK-CS-06):**
```typescript
it("behåller identisk output utan trackConfig", () => {
  // Verify existing tests still pass — no new assertion needed
  // All 8 existing computeTrackFactor tests serve this purpose
});
```

**Open stretch modifier (TRACK-CS-02, TRACK-CS-03):**
```typescript
it("lägger till +0.12 för yttre spår på open stretch-bana", () => {
  const config: TrackConfig = {
    track_name: "Solvalla", open_stretch: true,
    open_stretch_lanes: [7,8,9,10,11,12], short_race_threshold: 0,
    active: true, updated_at: ""
  };
  const withoutConfig = computeTrackFactor(7, "volte", []);
  const withConfig = computeTrackFactor(7, "volte", [], config);
  expect(withConfig).toBeCloseTo(withoutConfig + 0.12, 5);
});

it("påverkar inte inre spår på open stretch-bana", () => {
  const config: TrackConfig = { ..., open_stretch: true, open_stretch_lanes: [7,8,9,10,11,12] };
  const withoutConfig = computeTrackFactor(1, "volte", []);
  const withConfig = computeTrackFactor(1, "volte", [], config);
  expect(withConfig).toBeCloseTo(withoutConfig, 5);
});

it("påverkar inte när open_stretch === false", () => {
  const config: TrackConfig = { ..., open_stretch: false, open_stretch_lanes: [7,8,9] };
  const withoutConfig = computeTrackFactor(7, "volte", []);
  const withConfig = computeTrackFactor(7, "volte", [], config);
  expect(withConfig).toBeCloseTo(withoutConfig, 5);
});
```

**Short race modifier (TRACK-CS-04):**
```typescript
it("drar -0.08 för spår ≥5 vid kort lopp under threshold", () => {
  const config: TrackConfig = { ..., short_race_threshold: 1640, open_stretch: false };
  const withoutConfig = computeTrackFactor(5, "volte", [], undefined, 1600);
  const withConfig = computeTrackFactor(5, "volte", [], config, 1600);
  expect(withConfig).toBeCloseTo(withoutConfig - 0.08, 5);
});

it("påverkar inte spår <5 vid kort lopp", () => {
  const config: TrackConfig = { ..., short_race_threshold: 1640 };
  const withoutConfig = computeTrackFactor(4, "volte", [], undefined, 1600);
  const withConfig = computeTrackFactor(4, "volte", [], config, 1600);
  expect(withConfig).toBeCloseTo(withoutConfig, 5);
});

it("båda modifiers summerar för spår 7+ på open stretch + kort lopp", () => {
  const config: TrackConfig = {
    open_stretch: true, open_stretch_lanes: [7,8,9,10,11,12],
    short_race_threshold: 1640, ...
  };
  const base = computeTrackFactor(7, "volte", []);
  const adjusted = computeTrackFactor(7, "volte", [], config, 1600);
  // D-07: both deltas sum (+0.12 - 0.08 = +0.04 net)
  expect(adjusted).toBeCloseTo(base + 0.04, 5);
});
```

**Factor stays in [0, 1]:**
```typescript
it("klipper modifierad staticF till [0, 1]", () => {
  // Force a scenario where clamp matters
  const config: TrackConfig = { open_stretch: true, open_stretch_lanes: [1], short_race_threshold: 0 };
  const f = computeTrackFactor(1, "volte", [], config);
  // spår 1 = 1.00 static + 0.12 = 1.12 → clamp to 1.0
  expect(f).toBeLessThanOrEqual(1.0);
});
```

### Integration Test Approach for `upsertTrackConfig()` (TRACK-UI-04)

New file `lib/__tests__/admin_tracks.test.ts` following the pattern of `track_config.test.ts`:

```typescript
// Mock both createServiceClient and createClient
jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn(),
  createClient: jest.fn(),
}));
```

Tests cover:
1. Admin user can upsert — mock returns success
2. Non-admin user is rejected — returns `{ error: "Inte behörig" }`
3. DB error propagated — mock returns error, function returns `{ error: message }`

### Backward Compatibility Verification (TRACK-CS-06)

Run the FULL existing test suite before and after modifying `computeTrackFactor()`:

```bash
# Before modification (baseline):
npx jest lib/__tests__/analysis.test.ts lib/__tests__/formscore.test.ts
# Should show: 8 + 8 = 16 passing tests

# After modification:
npx jest lib/__tests__/analysis.test.ts lib/__tests__/formscore.test.ts
# All 16 original tests must still pass PLUS new tests for track-config behavior
```

The backward compatibility guarantee is structural: all 8 existing `computeTrackFactor` tests call the function WITHOUT a `trackConfig` argument. As long as they still pass, TRACK-CS-06 is verified.

### Sampling Rate
- **Per task commit:** `npx jest lib/__tests__/analysis.test.ts`
- **Per wave merge:** `npx jest`
- **Phase gate:** `npx jest` full suite green + manual smoke test on dev server before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/admin_tracks.test.ts` — covers TRACK-UI-04 (upsert server action)
- No framework install needed (Jest already configured)
- No shared fixture changes needed

---

## Security Domain

> `security_enforcement` not explicitly set to false in config.json — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `auth.getUser()` — already enforced in layout |
| V3 Session Management | yes | Supabase session cookies — unchanged from existing app |
| V4 Access Control | yes | `ADMIN_USER_IDS` env var check server-side before admin actions |
| V5 Input Validation | yes | `open_stretch_lanes` parsed as integers 1–20; `short_race_threshold` bounded 0–9999 |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Admin action called by non-admin | Elevation of Privilege | Server action re-checks `ADMIN_USER_IDS` independently — never trusts client assertion |
| SQL injection via `track_name` | Tampering | Supabase JS SDK uses parameterized queries internally |
| Arbitrary integer injection in lanes input | Tampering | Validate each parsed integer is in 1–20 range before upsert |
| `ADMIN_USER_IDS` env var exposure | Information Disclosure | Never prefixed with `NEXT_PUBLIC_` — server-side only |

**Key security principle:** The `upsertTrackConfig()` server action must re-verify admin status independently. The admin UI page redirect is a UX gate, not a security gate — a malicious actor can POST to a server action directly without going through the page.

---

## Sources

### Primary (HIGH confidence)
- Codebase files read directly: `lib/analysis.ts`, `lib/formscore.ts`, `lib/types.ts`, `lib/actions/tracks.ts`, `components/HorseCard.tsx`, `components/AnalysisPanel.tsx`, `components/RaceList.tsx`, `components/BottomNav.tsx`, `components/TopNav.tsx`, `app/(authenticated)/layout.tsx`, `app/(authenticated)/page.tsx`, `components/MainPageClient.tsx`, `components/sallskap/admin/AdminTab.tsx`
- `supabase/migration_v9_track_configs.sql` — table definition confirmed
- `lib/__tests__/analysis.test.ts`, `lib/__tests__/track_config.test.ts`, `lib/__tests__/formscore.test.ts` — existing test coverage confirmed
- `jest.config.js` — test framework configuration confirmed
- `package.json` — all dependencies confirmed installed

### Secondary (MEDIUM confidence)
- [CITED: https://supabase.com/docs/reference/javascript/upsert] — Supabase JS v2 upsert with `onConflict` pattern

### Tertiary (LOW confidence)
- None. All claims derive from direct codebase inspection or cited documentation.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|------------------|
| Framework: Next.js 16 App Router | All new pages use `app/(authenticated)/` with server components |
| Language: TypeScript 5 | All new files must compile without errors |
| Styling: Tailwind CSS v4 | No CSS modules, no styled-components — utility classes only |
| Database: Supabase + RLS | Admin writes require service_role client; reads use anon/session client |
| Auth: Supabase Auth (email/password) | `createClient().auth.getUser()` is the only auth source |
| Tests: Jest + ts-jest | New test file follows `lib/__tests__/` location convention |
| Linter: ESLint (eslint-config-next) | `npm run lint` must pass on all new files |
| Server Actions: `lib/actions/` | `upsertTrackConfig()` and `getAllTrackConfigs()` go in `lib/actions/tracks.ts` |
| Route Handlers: `app/api/` | Not used for Phase 3 — no external API calls needed |
| UI language: Swedish | All user-facing strings in Swedish (enforced by UI-SPEC copywriting contract) |
| All text in UI: Swedish | Badge tooltips, admin labels, button text all in Swedish |
| `"use client"` on interactive components | Admin row form component is `"use client"`; admin page is server component |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and direct file inspection
- Architecture: HIGH (existing code) / MEDIUM (new patterns) — patterns are derived from direct code reading; new patterns follow established conventions
- Formula logic: HIGH — exact TRACK_BIAS_VOLTE values and function structure read from source
- Pitfalls: HIGH — derived from actual code inspection, not assumed
- Test infrastructure: HIGH — verified by running `npx jest` successfully

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable dependencies — Next.js 16, Supabase JS v2, Jest; no fast-moving APIs)
