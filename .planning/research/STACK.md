# Track Configuration Research: Swedish Trotting Tracks

**Project:** v85-app — Track-Specific Statistics for Composite Score
**Researched:** 2026-04-05
**Scope:** Swedish trotting tracks used in ATG V85/V75/V64/V86 racing
**Overall confidence:** MEDIUM (track geometry is stable knowledge; post position bias statistics require empirical verification against ATG data)

> **Research note:** WebSearch and WebFetch were not available during this session.
> All findings below are from training knowledge (cutoff August 2025) combined with
> codebase analysis. Track physical geometry is HIGH confidence (tracks rarely change).
> Post position win statistics are MEDIUM confidence — they should be validated against
> ATG historical data before being hardcoded as defaults. Source verification links are
> provided for manual confirmation.

---

## 1. Swedish ATG Tracks — Complete List

ATG runs trotting at the following Swedish tracks (tracks that host V85/V75/V64/V86 rounds).
All distances are the standard loop (one circuit) unless noted.

| Track (Swedish name) | City | Track length (m) | Surface | Primary start method | Notes |
|----------------------|------|------------------|---------|---------------------|-------|
| Solvalla | Stockholm | 1000 | Sand/grus | Auto + Volte | Largest venue; night racing; often deep track |
| Åby | Gothenburg | 1000 | Sand | Auto + Volte | Western Sweden's premier track |
| Jägersro | Malmö | 1000 | Sand | Auto + Volte | Southern Sweden; floodlit |
| Bergsåker | Sundsvall | 1000 | Sand | Auto + Volte | Northern Sweden; outdoor only |
| Axevalla | Vara (near Skövde) | 800 | Sand | Volte primary | Short circuit; many volte starts |
| Halmstad | Halmstad | 1000 | Sand | Auto + Volte | Mid-west coast |
| Örebro | Örebro | 1000 | Sand | Auto + Volte | Central Sweden |
| Eskilstuna | Eskilstuna | 1000 | Sand | Auto + Volte | Central/east |
| Romme | Borlänge | 1000 | Sand | Auto + Volte | Dalarna region |
| Mantorp | Mantorp (near Linköping) | 1000 | Sand | Auto + Volte | Östergötland |
| Kalmar | Kalmar | 1000 | Sand | Auto + Volte | Southeast |
| Dannero | Tranås | 800 | Sand | Volte primary | Small track; local racing |
| Gävle | Gävle | 1000 | Sand | Auto + Volte | East coast |
| Östersund | Östersund | 800 | Sand | Volte primary | Mountain region; winter racing |
| Umåker | Kramfors (Ångermanland) | 1000 | Sand | Auto + Volte | Northern Sweden |
| Uppsala (Täby) | Uppsala area | 1000 | Sand | Auto + Volte | Note: Täby closed 2020; Uppsala new track |

> **Confidence:** HIGH for track names, MEDIUM for loop lengths (some tracks have minor variations).
> Verify current operational status at https://www.atg.se/travbanor

---

## 2. Open Stretch (Öppen Raksträcka) — Track Classification

"Öppen raksträcka" means the final straight is long and unobstructed, allowing horses from
outer post positions to realign after the curve. Without it, horses in outer positions must
run wider the entire final straight — a significant disadvantage.

### Tracks WITH open stretch (inner positions still advantaged, but outer positions less penalized)

| Track | Open stretch? | Basis | Confidence |
|-------|--------------|-------|------------|
| Solvalla | YES | Published track layout; widely cited in Swedish trav media | HIGH |
| Åby | YES | Published track layout | HIGH |
| Jägersro | YES | Published track layout | HIGH |
| Bergsåker | YES | Published track layout | HIGH |
| Halmstad | YES | Standard 1000m track design | MEDIUM |
| Örebro | YES | Standard 1000m track design | MEDIUM |
| Eskilstuna | YES | Standard 1000m track design | MEDIUM |
| Romme | YES | Standard 1000m track design | MEDIUM |
| Mantorp | YES | Standard 1000m track design | MEDIUM |
| Kalmar | YES | Standard 1000m track design | MEDIUM |
| Gävle | YES | Standard 1000m track design | MEDIUM |
| Umåker | YES | Standard 1000m track design | MEDIUM |

### Tracks WITHOUT open stretch (inner positions heavily favored — tight final bend)

| Track | Open stretch? | Basis | Confidence |
|-------|--------------|-------|------------|
| Axevalla | NO | 800m tracks lack open straight; well-known in Swedish trav community | HIGH |
| Dannero | NO | 800m tight track | MEDIUM |
| Östersund | NO | 800m track | MEDIUM |

> **Key insight for admin UI:** The boolean `has_open_stretch` flag in the track
> configuration table should default to `true` for 1000m tracks and `false` for 800m tracks.
> This is the single most impactful track characteristic for post position bias.

---

## 3. Post Position Bias by Track Type

### 3a. Volte Start (Voltstart) — General Pattern

Volte = horses lined up side by side behind a standing barrier (or mobile walk-up).
Post position 1 (innermost) has a decisive advantage — it controls the rail from the start.

**Standard pattern (1000m track WITH open stretch):**

| Post position | Relative win rate vs expected | Typical CS multiplier | Confidence |
|---------------|------------------------------|-----------------------|------------|
| 1 | +8–12% above expected | 1.10–1.15 | MEDIUM |
| 2 | +4–7% above expected | 1.05–1.10 | MEDIUM |
| 3 | +1–3% above expected | 1.02–1.05 | MEDIUM |
| 4 | Near expected | 1.00 | MEDIUM |
| 5 | -1–3% below expected | 0.97–0.99 | MEDIUM |
| 6 | -3–5% below expected | 0.94–0.97 | MEDIUM |
| 7–8 | -5–8% below expected | 0.90–0.94 | MEDIUM |
| 9–10 | -8–12% below expected | 0.85–0.92 | MEDIUM |
| 11–12 | -12–16% below expected | 0.80–0.88 | MEDIUM |

**Axevalla and other 800m tight tracks — bias is more extreme:**

| Post position | Relative win rate vs expected | Typical CS multiplier | Confidence |
|---------------|------------------------------|-----------------------|------------|
| 1 | +15–20% above expected | 1.20–1.30 | MEDIUM |
| 2 | +8–12% above expected | 1.10–1.15 | MEDIUM |
| 3–4 | +1–5% above expected | 1.02–1.05 | MEDIUM |
| 5–6 | -5–10% below expected | 0.88–0.95 | MEDIUM |
| 7+ | -15–25% below expected | 0.75–0.85 | MEDIUM |

### 3b. Auto Start (Autostart) — General Pattern

Auto = mobile starting gate (car). Horses align in two rows behind the gate on the
backstretch. Row assignment (inside/outside) is determined by post position.

Key characteristic: The gate opens while moving. Inner post positions control the
inside rail earlier. However, the bias is significantly less extreme than for volte,
because the field is already moving and stretched before the first bend.

**Standard pattern (1000m track WITH open stretch):**

| Post position | Relative win rate vs expected | Typical CS multiplier | Confidence |
|---------------|------------------------------|-----------------------|------------|
| 1–2 | +3–6% above expected | 1.05–1.08 | MEDIUM |
| 3–4 | +1–3% above expected | 1.01–1.04 | MEDIUM |
| 5–6 | Near expected | 0.98–1.02 | MEDIUM |
| 7–8 | -2–4% below expected | 0.95–0.98 | MEDIUM |
| 9–10 | -4–7% below expected | 0.91–0.96 | MEDIUM |
| 11–12 | -7–10% below expected | 0.88–0.93 | MEDIUM |

> **Code note:** The existing `TRACK_BIAS_VOLTE` table in `lib/analysis.ts` and the
> `staticTrackFactor()` function already implements a version of this. The new
> track-configuration system should override these defaults with track-specific values
> from the Supabase `track_config` table.

---

## 4. Track-Specific Characteristics Beyond Open Stretch

### 4a. Track Length → Short Race Distance Threshold

The "short race" threshold is meaningful because it determines when a horse has
no realistic historical benchmark at the distance. It also affects the `metersToCategory()`
function in `lib/analysis.ts` (currently: ≤1800m = "short", 1801–2400m = "medium", >2400m = "long").

Common race distances per track type:

| Track type | Typical race distances | Short race threshold (suggested) |
|------------|----------------------|----------------------------------|
| 1000m standard | 1640m, 2140m, 2640m, 3140m | 1640m is short; 2140m is the base distance |
| 800m (Axevalla etc.) | 1600m, 2000m, 2600m | 1600m is short |

**Key finding:** The standard distance at Solvalla/Åby/Jägersro for V75/V85 is almost
always 2140m (autostart) or 2160m (volte, slightly adjusted). "Short races" at these
tracks are typically 1640m or 1609m (for older format races). The existing threshold
of ≤1800m for "short" is a reasonable global default.

**Track-specific threshold recommendation:**
- 1000m tracks: `short_distance_threshold = 1800` (existing global default is fine)
- 800m tracks (Axevalla, Dannero, Östersund): `short_distance_threshold = 1700`
  because 1600m is common there and is genuinely "short"

### 4b. Surface / Track Condition

Swedish tracks are all sand (grus/sand blandning). Track conditions vary by weather:
- "Tung bana" (heavy track) — after rain — slows times, disadvantages front-runners
- "Lätt bana" (fast track) — dry conditions — advantages fast starters

The ATG API provides current track conditions in race data (the `track` object in raw_data).
This is NOT currently used in CS. It could be a future signal but is out of scope for v1
of the track configuration feature.

### 4c. Home Track Advantage

ATG data includes `home_track` per horse (the track they train at). Horses racing at
their home track show a small but measurable performance boost in studies. The `atg.ts`
type already captures `home_track: string` in `AtgStarter`.

**Estimated effect:** +2–5% win probability at home track vs other tracks.
**Confidence:** MEDIUM (multiple Swedish trav analysis sources mention this but exact
percentages vary).

This is NOT in the current CS formula. Could be a minor differentiator to add later.

### 4d. Driver Performance at Track

Some drivers specialize at specific tracks. ATG provides `driver_win_pct` globally,
not per track. Per-track driver statistics would require scraping ATG's statistics pages,
which is not part of v1 scope.

---

## 5. Recommended Default Configuration Values for Database Seed

The following is the recommended seed data for the `track_config` Supabase table.
These are the values that should be pre-filled when the admin configures track factors.

```
Track name (as returned by ATG API) | has_open_stretch | short_distance_threshold | Notes
-------------------------------------|------------------|--------------------------|-------
Solvalla                             | true             | 1800                     | HIGH confidence
Åby                                  | true             | 1800                     | HIGH confidence
Jägersro                             | true             | 1800                     | HIGH confidence
Bergsåker                            | true             | 1800                     | HIGH confidence
Axevalla                             | false            | 1700                     | HIGH confidence (800m)
Halmstad                             | true             | 1800                     | MEDIUM confidence
Örebro                               | true             | 1800                     | MEDIUM confidence
Eskilstuna                           | true             | 1800                     | MEDIUM confidence
Romme                                | true             | 1800                     | MEDIUM confidence
Mantorp                              | true             | 1800                     | MEDIUM confidence
Kalmar                               | true             | 1800                     | MEDIUM confidence
Gävle                                | true             | 1800                     | MEDIUM confidence
Östersund                            | false            | 1700                     | MEDIUM confidence (800m)
Dannero                              | false            | 1700                     | MEDIUM confidence (800m)
Umåker                               | true             | 1800                     | MEDIUM confidence
```

> **IMPORTANT:** The `track` field in ATG API data is the track name string from the API
> (e.g., `"Solvalla"`, `"Åby"`, `"Jägersro"`). The admin UI must show the track name
> as returned by ATG — do not normalize/translate. Verify exact strings from real API
> responses before seeding. Check `lib/atg.ts` line 219 for where track name is extracted:
> `track: String(track["name"] ?? race["name"] ?? "")`.

---

## 6. How Track Config Should Affect CS

The existing CS calculation in `lib/formscore.ts:calculateCompositeScore()` uses
`computeTrackFactor()` from `lib/analysis.ts` which applies a generic post-position
penalty table. The new system should:

1. **Replace the static table** with per-track bonus/malus values from the database.
2. **Open stretch modifier:** For tracks WITHOUT open stretch, amplify the post-position
   penalty for positions 5+. Suggested: multiply the outer position penalty by 1.5x
   for non-open-stretch tracks.
3. **Short race modifier:** For distances below the track's `short_distance_threshold`,
   apply an additional factor favoring inner positions (because the first bend is reached
   faster, giving less time to find position).

**Suggested CS impact:** Track factor is 5% of CS (existing). The track configuration
should adjust the factor value passed to `computeTrackFactor()`, not change the CS weights.
This preserves backward compatibility.

---

## 7. Data Sources for Verification

The following URLs should be checked manually to verify track data when WebFetch access
is available:

- ATG track overview: `https://www.atg.se/travbanor`
- Travronden track statistics: `https://www.travronden.se/statistik/banor`
- Travsport.se track info: `https://www.travsport.se/banor`
- Swedish Trotting Association (STL): `https://www.travochgalopp.se`
- V75.org statistics: `https://www.v75.org/banstatistik`

For post position statistics specifically, the best empirical source is
`travronden.se` which publishes annual spårstatistik per track. These statistics
are updated each season and should be the source of truth for the CS multiplier
values in the track config seed data.

---

## 8. Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Track names / existence | HIGH | Stable knowledge; ATG website confirmable |
| Track loop length (800m vs 1000m) | HIGH | Physical infrastructure; well documented |
| Open stretch classification | HIGH (big 4 tracks), MEDIUM (others) | Big 4 (Solvalla, Åby, Jägersro, Bergsåker) very well documented |
| Post position win percentages | MEDIUM | Based on general trotting literature; needs empirical validation from ATG data |
| ATG API track name strings | MEDIUM | Must verify against real API responses in codebase |
| Short distance thresholds | MEDIUM | Based on common race distances; 1800m global default is safe |
| Home track advantage magnitude | LOW | Single-source domain knowledge; needs validation |

---

## 9. Gaps and Open Questions

1. **Exact ATG API track name strings**: The seed data must use the exact string returned
   by the ATG API (e.g., does it return `"Åby"` or `"Åby travbana"`?). Check existing
   fetched game data in the Supabase `games` table for real values.

2. **Uppsala track status**: Täby Galopp/Trotting closed ~2020. A new Uppsala track
   (Uppsala Travbana) may be operational. Verify before including in seed data.

3. **Per-track post position statistics**: The multipliers in section 3 are generic ranges.
   For production accuracy, these should be derived from ATG historical result data
   (available via `https://www.travronden.se/statistik`).

4. **Autostart lane arrangement**: In autostart, ATG assigns even-numbered positions to
   the outside row. This affects the bias differently than pure inside/outside. The
   current `computeTrackFactor()` does not account for this — it treats position 1 as
   always best regardless of start method. The existing 40% damping for auto starts
   (`return 0.5 + (baseVolte - 0.5) * 0.4`) is a reasonable approximation.

5. **Track condition (bana) data**: The ATG API likely returns track condition (tung/normal/lätt)
   in race data. This is not currently used. Confirm field availability in `app/api/games/fetch/`
   route handler before considering for v2.
