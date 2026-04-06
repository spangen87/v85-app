# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `HorseCard.tsx`, `AnalysisPanel.tsx`)
- Utility/lib files: camelCase or kebab-case (e.g., `analysis.ts`, `formscore.ts`, `atg.ts`)
- Test files: `[filename].test.ts` (e.g., `analysis.test.ts`)
- API routes: match Next.js convention with `route.ts` (e.g., `app/api/games/fetch/route.ts`)

**Functions:**
- camelCase for regular functions and exports (e.g., `calculateCompositeScore`, `parseTimeToSeconds`, `computeDistanceSignal`)
- camelCase for helper functions (e.g., `normalize`, `placeScore`, `staticTrackFactor`)
- Private helpers: prefixed underscore or kept lowercase (e.g., `metersToCategory`)

**Variables:**
- camelCase for local variables and function parameters (e.g., `raceMeters`, `postPosition`, `formComponents`)
- ALL_CAPS for constants, especially Record/mapping objects (e.g., `FORM_WEIGHTS`, `DIST_LABEL`, `TRACK_BIAS_VOLTE`, `SEX_LABEL`)
- Prefix `existing`, `old`, `valid`, `unique` when filtering/transforming collections

**Types:**
- PascalCase for all type/interface names (e.g., `AtgStarter`, `LifeRecord`, `DistanceSignal`, `RaceContext`, `Group`, `HorseNote`)
- camelCase for type properties (e.g., `horse_id`, `post_position`, `last_5_results`) — uses snake_case to match database columns
- `type` declarations for unions/aliases (e.g., `type NoteLabel = "red" | "orange"...`)

## Code Style

**Formatting:**
- ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No dedicated Prettier config (uses ESLint defaults)
- Imports organized by groups: external packages, then relative paths with `@/` alias

**Linting:**
- ESLint config: `eslint.config.mjs` (flat config format)
- TypeScript strict mode enabled (`strict: true`)
- Target: ES2017

## Import Organization

**Order:**
1. External packages (e.g., `import { useState } from "react"`)
2. Next.js utilities (e.g., `import { NextResponse } from "next/server"`)
3. Type imports from external (e.g., `import type { ReactNode } from "react"`)
4. Relative imports with `@/` alias (e.g., `import { fetchGame } from "@/lib/atg"`)
5. Type imports from relative paths (e.g., `import type { Group } from "@/lib/types"`)

**Path Aliases:**
- `@/*` resolves to project root (configured in `tsconfig.json`)
- Used for `lib/`, `components/`, and `app/` imports
- Preferred over relative `../` paths

**Example from `AnalysisPanel.tsx`:**
```typescript
"use client";

import { computeDistanceSignal, type LifeRecord, type DistanceSignal } from "@/lib/analysis";
```

## Error Handling

**Patterns:**
- Route handlers: Return `NextResponse.json({ error: "..." }, { status: 400 })` for client errors
- Server actions: Return objects with `{ error: string | null, data?: T }` shape
- Console warnings for non-critical issues (e.g., `console.warn([context] Message)`)
- Try-catch in async operations with explicit error messages
- Validation before processing: Check `!gameId` before using it
- Null coalescing and fallback values: Use `?? defaultValue` for missing data

**Example from `route.ts`:**
```typescript
if (!gameId) {
  return NextResponse.json({ error: "gameId krävs" }, { status: 400 });
}

try {
  const game = await fetchGame(gameType, gameId);
  // Process...
} catch (err) {
  return NextResponse.json({ error: err.message }, { status: 500 });
}
```

**Example from `groups.ts`:**
```typescript
export async function updateProfile(displayName: string): Promise<{ error: string | null }> {
  const user = await getAuthUser();
  if (!user) return { error: "Inte inloggad" };
  // Process...
  if (error) return { error: error.message };
  return { error: null };
}
```

## Logging

**Framework:** `console` (no specialized logging library)

**Patterns:**
- Context prefix in square brackets: `console.warn([fetch] Message)`
- Used for data flow visibility (count of valid/deduped starters)
- Warnings for data quality issues (missing fields, duplicates)
- Logs include operational context (e.g., race number, counts)

**Example from `route.ts`:**
```typescript
console.warn(`[fetch] Avd ${race.race_number}: starter saknar horse_id — hoppas över`);
console.log(`[fetch] Avd ${race.race_number}: ATG=${race.starters.length}, giltiga=${validStarters.length}, unika=${uniqueStarters.length}`);
```

## Comments

**When to Comment:**
- Explain **why**, not what the code does
- Document algorithm choices (e.g., distance factors, weight distributions)
- Mark special cases and fallback logic
- Use for complex calculations with Swedish explanations

**JSDoc/TSDoc:**
- Used for public functions and exports
- Describe parameters, return value, and behavior
- Include context (e.g., "0–100 scale")
- Example from `analysis.ts`:
  ```typescript
  /**
   * Beräknar distanssignalen baserat på hästens rekord på distansen.
   * ×1.35 = vunnit på exakt distans+metod
   * ×1.1  = placerat exakt
   * ...
   */
  export function computeDistanceSignal(
    records: LifeRecord[],
    raceMeters: number,
    raceStartMethod: string
  ): DistanceSignal
  ```

**Block Comments:**
- Use `// --- Komponent N: Description ---` to mark logical sections
- Group related calculations under one banner comment
- Example from `formscore.ts`:
  ```typescript
  // --- Komponent 1: Senaste form (30%) ---
  const formComponents = starters.map((s) => {
    // Process...
  });
  ```

**Inline Comments:**
- Explain non-obvious logic: `// Fallback: prioritera innevarande år...`
- Mark deprecated code: `// @deprecated Använd...`
- Document data quality decisions: `// Bevara last_5_results, finish_position och finish_time`

## Function Design

**Size:** Functions typically 10–50 lines; complex calculations broken into helper functions

**Parameters:**
- Typed with interfaces when more than 3 parameters
- Use object destructuring for optional parameters
- Examples:
  - `computeDistanceSignal(records: LifeRecord[], raceMeters: number, raceStartMethod: string)`
  - `function makeStarter(overrides: Partial<AtgStarter> = {}): AtgStarter`

**Return Values:**
- Explicit types (no `any` — `strict: true`)
- Return objects for multiple values
- Nullable types marked with `| null`
- Examples:
  - `DistanceSignal` (object with `factor` and `label`)
  - `HorseStart[] | null`
  - `{ error: string | null; data?: T }`

## Module Design

**Exports:**
- Default export: Only for Next.js pages/layouts (`export default function Page()`)
- Named exports for all other code
- Type exports with `export type` or `export interface`

**Barrel Files:**
- Not used — import directly from source files
- Each component/module is self-contained

**Server Actions:**
- Declared with `"use server"` at top of file
- Return explicit types: `Promise<{ error: string | null; data?: T }>`
- Use `revalidatePath()` after data mutations
- Examples: `lib/actions/groups.ts`, `lib/actions/notes.ts`

**Route Handlers:**
- Use `NextRequest` and `NextResponse` from `next/server`
- Declare HTTP method: `export async function POST(request: NextRequest)`
- Return JSON with error/status codes
- Examples: `app/api/games/fetch/route.ts`, `app/api/horses/[horseId]/starts/route.ts`

## Client vs. Server Code

**Client Components:**
- Marked with `"use client"` at top
- Can use React hooks (useState, useContext)
- Examples: `HorseCard.tsx`, `AnalysisPanel.tsx`, `components/notes/`

**Server Components:**
- Default in Next.js App Router
- Can access databases and environment variables directly
- Examples: `app/(authenticated)/page.tsx`, `app/api/`

**Server Actions:**
- Functions in `lib/actions/` marked with `"use server"`
- Bridge between client and database
- Examples: `lib/actions/groups.ts`, `lib/actions/notes.ts`

---

*Convention analysis: 2026-04-05*
