---
phase: 03
slug: track-cs-adjustment-admin-ui
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-06
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server → client (TrackConfig) | `page.tsx` fetches TrackConfig server-side via `getTrackConfig()`; passed as serialized prop to client components | Non-sensitive config data (track names, distances, lane lists) |
| Layout → BottomNav | `AuthenticatedLayout` computes `isAdmin` server-side; passed as boolean prop | Boolean flag only — no user data |
| Admin form → server action | `TrackConfigRow` submits validated form data to `upsertTrackConfig` server action | Validated track config fields |
| Service role boundary | `upsertTrackConfig` uses `createServiceClient()` with `SUPABASE_SERVICE_ROLE_KEY` | Write operations to `track_configs` table — server-only key never exposed to client |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-3-01-01 | Tampering | `computeTrackFactor()` delta values | accept | Deltas are compile-time constants (+0.12, -0.08), not configurable per-request. No runtime injection path. | closed |
| T-3-01-02 | Denial of Service | `open_stretch_lanes.includes()` | accept | Array is a small integer list from DB, bounded by track config. No O(n²) risk. | closed |
| T-3-02-01 | Information Disclosure | TrackConfig in page props | accept | TrackConfig is non-sensitive config data. All authenticated users can read it via RLS policy established in Phase 1. | closed |
| T-3-02-02 | Tampering | Client-side CS delta computation | accept | Delta is cosmetic display only. CS stored in DB is unaffected — track-adjusted CS is never persisted (per requirements). | closed |
| T-3-03-01 | Elevation of Privilege | `/admin` route | mitigate | Server component checks `ADMIN_USER_IDS` env var against `user.id` before any render. Non-admins redirected to `/`. Verified in `app/(authenticated)/admin/page.tsx` lines 7–18. | closed |
| T-3-03-02 | Tampering | `upsertTrackConfig` server action | mitigate | Uses `createServiceClient()` — `SUPABASE_SERVICE_ROLE_KEY` is server-only. RLS blocks anon writes. Verified in `lib/actions/tracks.ts`. | closed |
| T-3-03-03 | Tampering | `open_stretch_lanes` input | mitigate | Client-side validation: each token must parse as integer 1–20. Invalid input blocks save with inline error. Verified in `components/admin/TrackConfigRow.tsx` lines 24–33. | closed |
| T-3-03-04 | Information Disclosure | Admin page reveals track config data | accept | Track config (names, distances) is non-sensitive. All authenticated users can read it via RLS. Admin page adds write capability, not new information. | closed |
| T-3-04-01 | Elevation of Privilege | `isAdmin` prop passed to `BottomNav` | accept | `isAdmin` is a display hint only. Real authorization is in `admin/page.tsx` server-side redirect. Client-side manipulation only reveals a nav link that leads to a redirect. | closed |
| T-3-04-02 | Information Disclosure | Admin tab reveals admin status | accept | Knowing you are an admin is not sensitive. `ADMIN_USER_IDS` is a server-only env var, never serialized to client. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-3-01-01 | Compile-time constants with no injection path — accept is appropriate | Plan threat model | 2026-04-06 |
| AR-03-02 | T-3-01-02 | Bounded small array, O(n) cost — DoS risk negligible | Plan threat model | 2026-04-06 |
| AR-03-03 | T-3-02-01 | Non-sensitive config data accessible to all authenticated users via existing RLS | Plan threat model | 2026-04-06 |
| AR-03-04 | T-3-02-02 | Track-adjusted CS is display-only and never persisted — tampering has no persistent effect | Plan threat model | 2026-04-06 |
| AR-03-05 | T-3-03-04 | Track names and distances are non-sensitive; admin write capability is the meaningful distinction | Plan threat model | 2026-04-06 |
| AR-03-06 | T-3-04-01 | Real authorization enforced server-side; nav visibility is UX only | Plan threat model | 2026-04-06 |
| AR-03-07 | T-3-04-02 | Admin identity not sensitive; env var never reaches client | Plan threat model | 2026-04-06 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-06 | 10 | 10 | 0 | gsd-secure-phase (orchestrator — all mitigations verified in code) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
