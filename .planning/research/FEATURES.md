# Feature Landscape: Track-Specific Post Position Factors

**Domain:** Horse racing analysis — CS adjustment via configurable track factors
**Researched:** 2026-04-05
**Milestone context:** Subsequent milestone on existing v85-app

---

## Codebase Baseline

Before describing what to build, the relevant existing behavior must be stated precisely so the feature is correctly scoped.

### How CS is currently computed

`lib/formscore.ts → calculateCompositeScore()` produces a 0–100 score per horse with these weights:

| Component | Weight | How computed |
|-----------|--------|--------------|
| Senaste form | 30% | Weighted average of last-5 placements |
| Vinstprocent | 20% | Win rate current/prev year |
| Odds-index | 15% | Inverse normalized within field |
| Tidindex | 15% | Best time normalized within field |
| Konsistens | 10% | win% * 0.6 + place% * 0.4 |
| Distansfaktor | 5% | life_records mapped via computeDistanceSignal() |
| Spårfaktor | 5% | computeTrackFactor() → static post-position table + optional history blend |

The track factor component is already normalized relative to the field (min-max within the race). It produces a 0–1 value per horse, then scaled to contribute 5% of the 0–100 CS.

### What the new feature must change

The `computeTrackFactor()` function in `lib/analysis.ts` uses a single hardcoded table (TRACK_BIAS_VOLTE) that assumes inner posts are always better. This is true for standard volt-start on a tight track, but two track conditions override this:

1. **Öppen raksträcka (open stretch):** The starting straight before the first curve is long enough that horses from outer positions can establish position before bunching occurs. Outer posts (nominally positions 5–8+) are less penalized than the generic table assumes. Some analyses treat positions 4–7 as near-neutral on such tracks.

2. **Korta lopp (short race):** Races at or below a configurable distance threshold (typically 1600–1700 m in Swedish trotting). The shorter the race, the less time outer horses have to recover from a bad start position — so the positional penalty is sharper than the generic table. Inner bias is amplified.

These two adjustments work in opposite directions: open stretch softens the inner bias; short race sharpens it. Both must be per-track and configurable because ATG tracks differ significantly (Solvalla, Åby, Jägersro, Bergsåker, etc. have different layouts and distance norms).

---

## Table Stakes

Features that must work for the milestone to be considered complete.

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| `track_configs` database table | Stores open-stretch flag and short-race threshold per track | Low | New Supabase table + RLS |
| Admin UI: track configuration form | Sällskaps-owner can toggle open-stretch and set short-race cutoff | Medium | Slot into existing AdminTab pattern |
| Pre-filled defaults | Known ATG tracks ship with sensible defaults so admin rarely needs to touch anything | Low-Medium | Hardcoded seed data per track name |
| CS adjustment in calculateCompositeScore() | The track config modifies how the 5% track-factor component behaves | Medium | Must not change the 0–100 scale |
| Visual indicator in HorseCard | User sees which horses had their CS adjusted by a track factor | Low | Badge or icon, not an extra number |
| CS tooltip updated | The clickable CS badge explanation must mention the track factors | Low | One-line text change in HorseCard |

---

## Feature Details

### 1. Track Config Table Schema

```sql
create table track_configs (
  id uuid primary key default uuid_generate_v4(),
  track_name text not null unique,    -- Matches games.track and races identifiers
  open_stretch boolean not null default false,
  short_race_threshold_meters integer not null default 1640,
  created_by uuid references auth.users(id),
  updated_at timestamptz default now()
);
```

**Confidence:** HIGH — this is a straightforward Supabase table pattern consistent with the existing schema style.

**RLS rules needed:**
- All authenticated users can SELECT (needed for CS calculation client-side)
- Only the record creator (sällskaps-owner) can UPDATE their own rows
- Service role can INSERT (for pre-filling defaults via a seed migration)

The constraint `track_name unique` allows upsert-on-conflict when seeding defaults.

### 2. Bonus Magnitude Approach: Absolute CS Points (Not Percentage)

**Recommendation: apply the track config as a modifier to the raw track factor before it enters the existing normalized 0–1 → 5%-weight pipeline, not as a post-hoc point addition to CS.**

**Why:** The existing CS pipeline normalizes the track factor relative to the field. If you instead add raw points to the final CS (e.g., "open stretch gives +3 CS to horses in positions 4–7"), you break the relative ranking guarantee — a horse could end up with CS > 100, and the adjustment is invisible to the normalization step.

The correct integration point is inside `computeTrackFactor()`. The function should accept an optional `TrackConfig` parameter and return a modified raw factor that the existing normalization then handles correctly:

```
open_stretch = true:
  For volte start: reduce the slope of TRACK_BIAS_VOLTE for positions 4–8.
  Concretely: positions 4–8 receive a factor boost of +0.15 to the static raw value
  before the dynamic/static blend.

short_race (distance < threshold):
  For both start methods: increase the slope penalty for outer positions.
  Concretely: positions 5–12 receive a factor penalty of -0.10 to the static raw value.
```

These deltas are applied to the raw 0–1 factor, which is then clamped to [0,1] before entering the normalization step. The CS scale stays intact.

**Magnitude rationale:** The existing TRACK_BIAS_VOLTE range spans 1.00 (pos 1) to 0.30 (pos 12) — a spread of 0.70. A ±0.10–0.15 delta on positions in the middle of the field is meaningful (roughly 14–21% of total range) without being extreme. These numbers are consistent with the research literature on harness racing positional effects, where open-stretch tracks measurably narrow but do not eliminate the inner advantage.

**Confidence:** MEDIUM — magnitude values (±0.10–0.15) are reasoned from the existing scale, not empirically validated against ATG race outcomes. They should be treated as a starting calibration, with the admin config allowing correction once users observe outcomes.

### 3. Open Stretch Factor: Expected Behavior

| Post position | No open stretch (current) | Open stretch = true |
|---------------|--------------------------|---------------------|
| 1–3 | Highest raw factors (0.88–1.00) | Unchanged — inner advantage already best |
| 4–7 | Mid-range (0.58–0.80 for volte) | Boosted by +0.15, capped at 1.0 |
| 8–12 | Low (0.30–0.52 for volte) | Boosted by +0.10, still lower than inner |

For autostart, the effect is dampened (consistent with how `staticTrackFactor` already reduces volte bias by 40% for auto). Apply the boost at 60% magnitude for auto starts.

The practical interpretation: on an open-stretch track, picking a horse at post 5–6 in a volte race is not as bad as the default table suggests. The CS for those horses rises slightly, which may move them up in Top 5 rankings relative to inner-post horses with similar other components.

### 4. Short Race Factor: Expected Behavior

Short-race threshold is configurable per track (default 1640 m, matching the shortest common V85 race distances in Sweden). When `distance < threshold`:

| Post position | Normal race | Short race |
|---------------|-------------|------------|
| 1–3 | Highest raw factors | Unchanged |
| 4–6 | Mid-range | Penalized by -0.10 |
| 7–12 | Low | Penalized by -0.10 to -0.15 |

The amplified inner bias reflects that in a sprint-distance race, the horse from post 9 on a volte start essentially cannot cover the extra ground and recover.

Only apply when `race.distance < threshold`. The check uses the `race.distance` already available in `RaceContext` passed to `calculateCompositeScore()`.

### 5. Visual Indicator in HorseCard

**Recommendation: a small icon/badge in the existing header row of HorseCard, visible only when the horse's CS was modified by a track factor.**

The current HorseCard header shows: start number | horse name + driver | streck% | odds | CS badge

Add a track-factor indicator between the horse name area and the CS badge. Display conditions:

- Show when `trackFactorApplied === true` (passed as a prop from the parent, computed alongside CS)
- Show direction: up-arrow icon (green) when open-stretch boosted the horse, down-arrow (orange) when short-race penalized
- On hover/tap, show tooltip: "Spårfördel: öppen raksträcka" or "Spårfaktor: kort lopp"

**Do not show the numeric delta.** Showing "+2.1 CS" is confusing because the adjustment enters the normalization pipeline — the actual CS change depends on the entire field composition and is not a fixed number. A directional icon is honest and sufficient.

Implementation: pass a `trackFactorModifier: 'boost' | 'penalty' | null` prop to HorseCard. The AnalysisPanel (or MainPageClient) computes CS and sets this prop based on whether a track config was applied and in which direction.

The existing `isValue` prop already uses a border-color change as a visual signal. The track-factor indicator should be a small inline icon in the header, not another border (too much border variation becomes unreadable).

### 6. Admin Configuration Interface

The admin UI lives in `components/sallskap/admin/AdminTab.tsx` under a new section, following the existing pattern of `<section>` blocks with `<h2>` headings and scoped form components.

**New section: "Bankonfiguration"**

Fields exposed in the form:

| Field | UI Control | Default | Explanation shown to user |
|-------|-----------|---------|--------------------------|
| Bana | Read-only text (from current game context) | — | Identifies which track is being configured |
| Öppen raksträcka | Toggle/checkbox | false | "Hästarna startar på en lång raksträcka — yttre spår straffas mindre" |
| Kort lopp-gräns (meter) | Number input, 1400–2000 | 1640 | "Lopp kortare än detta behandlas som korta lopp — yttre spår straffas mer" |
| Spara-knapp | Button | — | Upserts to track_configs |

**Access control:** Only `isCreator` sees the form inputs; other members see read-only values (consistent with how `GroupNameForm` is conditionally rendered in AdminTab).

**Pre-fill behavior:** On mount, the form fetches the existing `track_configs` row for the current track. If no row exists, defaults are shown. When the user saves, it upserts (insert-or-update on `track_name`). This avoids requiring an explicit "add track" step.

The track name comes from the game context (already available as `games.track`). The admin does not manually type the track name.

**Confidence:** HIGH — this pattern is directly observable in the existing AdminTab codebase.

---

## Anti-Features

Features to explicitly NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-post-position custom override | Too granular; admin cannot calibrate reliably | Use the two aggregate factors (open stretch + short race) |
| Separate "banfaktors-CS" column shown in UI | Confusing to show two CS numbers | Single CS with a directional icon indicator |
| Numeric delta display (+3 CS) | Delta is field-relative, not a fixed number | Directional icon only |
| Automatic track detection from ATG metadata | ATG API does not expose open-stretch or race-type fields reliably | Admin toggle; pre-filled with sensible defaults |
| Third factor (startvinge/wing draw) | Deferred to v2 per PROJECT.md Out of Scope | Design table schema to accept additional factor columns later |
| Global short-race threshold | Some tracks have atypical distance norms | Per-track threshold in the config table |

---

## Feature Dependencies

```
track_configs table (DB migration)
  → TrackConfig TypeScript type
      → computeTrackFactor() signature extended
          → calculateCompositeScore() accepts optional track config
              → AnalysisPanel fetches track config and passes to CS calc
                  → trackFactorModifier prop computed and passed to HorseCard
                      → visual indicator rendered in HorseCard header

track_configs table (DB migration)
  → track_configs Supabase action (fetch + upsert)
      → TrackConfigForm component
          → AdminTab new "Bankonfiguration" section
```

---

## MVP Recommendation

Build in this order:

1. **Database migration** — `track_configs` table with RLS. Seed known Swedish ATG tracks with defaults (open_stretch=false, short_race_threshold=1640 for most; open_stretch=true for tracks known to have long home stretches such as Solvalla, Jägersro and Åby — pre-fill from domain knowledge, admin can correct).

2. **TypeScript type + CS function extension** — Add `TrackConfig` interface to `lib/types.ts`. Extend `computeTrackFactor()` to accept optional `TrackConfig`. Keep the function signature backward-compatible (parameter optional, existing behavior unchanged when undefined).

3. **AnalysisPanel wiring** — Fetch `track_configs` row for the current game's track. Pass to `calculateCompositeScore()`. Compute `trackFactorModifier` per horse. Pass modifier as prop to HorseCard.

4. **HorseCard visual indicator** — Add the directional icon prop and render in the header row. Update CS tooltip text.

5. **Admin form** — `TrackConfigForm` component + Supabase server action for upsert. Wire into AdminTab.

**Defer:** Seeding all possible track names exhaustively. Ship with the most common tracks (Solvalla, Åby, Jägersro, Eskilstuna, Bergsåker, Mantorp, Romme, Örebro, Halmstad, Kalmar) and fall back to defaults for unknown track names.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| CS integration point | HIGH | Based on direct code reading of formscore.ts and analysis.ts |
| Magnitude of ±0.10–0.15 | MEDIUM | Reasoned from existing scale; needs empirical calibration against ATG outcomes |
| Database schema pattern | HIGH | Consistent with existing Supabase tables in schema.sql |
| Admin UI pattern | HIGH | Directly mirrors existing AdminTab section pattern |
| Visual indicator approach | HIGH | Consistent with existing HorseCard badge conventions |
| Open-stretch track list | MEDIUM | Based on domain knowledge of Swedish trotting tracks; admin-correctable |

---

## Sources

- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/lib/analysis.ts` — computeTrackFactor, staticTrackFactor, TRACK_BIAS_VOLTE
- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/lib/formscore.ts` — calculateCompositeScore, component weights and normalization pipeline
- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/components/HorseCard.tsx` — ScoreBadge, isValue prop, card header structure
- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/components/sallskap/admin/AdminTab.tsx` — admin section pattern, isCreator gating
- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/supabase/schema.sql` — table/RLS conventions
- `/Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös/.planning/PROJECT.md` — active requirements, out-of-scope items, key decisions
