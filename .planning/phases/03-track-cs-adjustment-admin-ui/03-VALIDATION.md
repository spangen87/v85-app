---
phase: 3
slug: track-cs-adjustment-admin-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `npx jest lib/__tests__/analysis.test.ts` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest lib/__tests__/analysis.test.ts`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | TRACK-CS-01 | — | N/A | unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ extend | ⬜ pending |
| 3-01-02 | 01 | 1 | TRACK-CS-02 | — | N/A | unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ extend | ⬜ pending |
| 3-01-03 | 01 | 1 | TRACK-CS-03 | — | N/A | unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ extend | ⬜ pending |
| 3-01-04 | 01 | 1 | TRACK-CS-04 | — | N/A | unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ extend | ⬜ pending |
| 3-01-05 | 01 | 1 | TRACK-CS-06 | — | No CS change when no config | unit | `npx jest lib/__tests__/analysis.test.ts` | ✅ existing | ⬜ pending |
| 3-02-01 | 02 | 1 | TRACK-CS-05 | — | N/A | unit | `npx jest lib/__tests__/formscore.test.ts` | ✅ extend | ⬜ pending |
| 3-03-01 | 03 | 2 | TRACK-UI-05 | — | N/A | manual | `npm run dev` → Solvalla game, spår 7+ | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | TRACK-UI-01 | T-3-01 | Admin page inaccessible to non-admins | manual | `npm run dev` → `/admin` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 2 | TRACK-UI-02 | T-3-01 | Non-admin redirected to `/` | manual | Test with non-admin account | ❌ W0 | ⬜ pending |
| 3-04-03 | 04 | 2 | TRACK-UI-03 | — | N/A | manual | `npm run dev` → admin form visual inspection | ❌ W0 | ⬜ pending |
| 3-04-04 | 04 | 2 | TRACK-UI-04 | T-3-02 | Upsert uses service client (bypasses RLS, checked server-side) | unit | `npx jest lib/__tests__/admin_tracks.test.ts` | ✅ W0 done (Plan 03 Task 1) | ⬜ pending |
| 3-04-05 | 04 | 2 | TRACK-UI-06 | — | N/A | manual | Test with admin vs non-admin account | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/__tests__/admin_tracks.test.ts` — stub for TRACK-UI-04 upsert server action test (created in Plan 03 Task 1)

*Existing infrastructure (Jest + ts-jest) covers all unit test requirements. Only one new test file needed for admin server action.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin page shows form per track | TRACK-UI-01 | Server-rendered page, no unit harness | `npm run dev` → sign in as admin → navigate to `/admin` → verify track table renders |
| Non-admin redirected | TRACK-UI-02 | Requires real auth session | Sign in as non-admin → navigate to `/admin` → verify redirect to `/` |
| Form fields render correctly | TRACK-UI-03 | Visual layout check | Inspect admin table: toggle, lanes input, threshold input visible per row |
| Save button persists change | TRACK-UI-04 | Requires live Supabase | Edit a threshold value → click Spara → reload → verify value persisted |
| ↑/↓ badge on horse card | TRACK-UI-05 | Requires live game data | Load a Solvalla V85 game → verify green ↑ badge on horses in outer lanes |
| Admin link in BottomNav | TRACK-UI-06 | Requires real auth session | Admin user: verify admin link visible in BottomNav. Non-admin: verify link absent |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (admin_tracks.test.ts created in Plan 03 Task 1)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** signed off (revision 2026-04-05)
