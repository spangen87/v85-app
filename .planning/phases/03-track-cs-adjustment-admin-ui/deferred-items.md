# Deferred Items — Phase 03

## Pre-existing lint errors (out of scope for 03-04)

These ESLint errors exist in files not touched by plan 03-04. They are pre-existing and should be addressed in a separate cleanup task.

| File | Line | Rule | Description |
|------|------|------|-------------|
| components/InstallPrompt.tsx | 30 | react-hooks/set-state-in-effect | setState() called synchronously in effect |
| components/RaceList.tsx | 101 | react-hooks/set-state-in-effect | setState() called synchronously in effect |
| components/ThemeProvider.tsx | 21 | react-hooks/set-state-in-effect | setState() called synchronously in effect |
| lib/actions/sallskap.ts | 34 | @typescript-eslint/no-unused-vars | '_groupId' defined but never used |

Discovered during: Plan 03-04 final verification (npm run lint)
