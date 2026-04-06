---
phase: 1
slug: foundation-db-schema-types
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 + ts-jest 29.4.6 |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `npx jest lib/__tests__/track_config.test.ts` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest lib/__tests__/track_config.test.ts`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green + `npx tsc --noEmit` clean
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | TRACK-DB-01 | — | Table exists with correct columns | manual (SQL) | `SELECT count(*) FROM track_configs` in Supabase Dashboard | N/A | ⬜ pending |
| 1-01-02 | 01 | 1 | TRACK-DB-02 | — | 15 rows seeded with correct data | manual (SQL) | `SELECT count(*) FROM track_configs` | N/A | ⬜ pending |
| 1-01-03 | 01 | 1 | TRACK-DB-03 | — | TrackConfig interface compiles without errors | unit | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | TRACK-DB-04 | — | getTrackConfig("Solvalla") returns typed object | unit | `npx jest lib/__tests__/track_config.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | TRACK-DB-04 | — | getTrackConfig("Unknown") returns null | unit | `npx jest lib/__tests__/track_config.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 1 | TRACK-DB-05 | T-RLS-01 | Anon key write blocked by RLS | manual | Test via Supabase Dashboard using anon key token | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/track_config.test.ts` — stubs/tests for TRACK-DB-04 (getTrackConfig returns typed object / null)

*TypeScript compile check is implicit in ts-jest — no separate Wave 0 config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Table exists with correct columns | TRACK-DB-01 | Requires live Supabase DB access | Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'track_configs'` in Supabase Dashboard SQL Editor |
| 15 rows seeded | TRACK-DB-02 | Requires live Supabase DB access | Run `SELECT count(*) FROM track_configs` in Supabase Dashboard |
| Anon key write blocked | TRACK-DB-05 | Requires live Supabase auth context | In Supabase Dashboard, use anon key token and attempt `INSERT INTO track_configs ...` — expect 403/RLS error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
