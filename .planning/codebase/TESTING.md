# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Jest 30.2.0
- Preset: `ts-jest` (TypeScript support)
- Config: `jest.config.js` (root)

**Assertion Library:**
- Jest built-in assertions (expect API)

**Run Commands:**
```bash
npm run test                # Run all tests (not in package.json - use npx jest)
npx jest                    # Run all tests in lib/__tests__/
npx jest --watch            # Watch mode
npx jest --coverage         # Coverage report
```

## Test File Organization

**Location:**
- Co-located in `lib/__tests__/` directory
- Mirrors `lib/` structure (e.g., `lib/analysis.ts` → `lib/__tests__/analysis.test.ts`)

**Naming:**
- `[module].test.ts` format
- Current test files:
  - `lib/__tests__/analysis.test.ts`
  - `lib/__tests__/formscore.test.ts`
  - `lib/__tests__/systems.test.ts`

**Structure:**
```
lib/
├── analysis.ts
├── formscore.ts
├── systems.ts
└── __tests__/
    ├── analysis.test.ts
    ├── formscore.test.ts
    └── systems.test.ts
```

## Test Structure

**Suite Organization:**
- Use `describe("FunctionName", () => { ... })` for grouping related tests
- One describe block per exported function/feature
- Organize chronologically by component complexity

**Patterns:**

```typescript
describe("parseTimeToSeconds", () => {
  it("parsar 1:12,4 korrekt", () => {
    expect(parseTimeToSeconds("1:12,4")).toBe(72.4);
  });

  it("returnerar null för ogiltigt format", () => {
    expect(parseTimeToSeconds("ogiltigt")).toBeNull();
  });
});
```

**Setup Pattern:**
- Use helper functions for test data: `makeStarter(overrides)` factory pattern
- Define constants at describe-block scope: `const defaultRace = { distance: 2140, ... }`
- Example from `formscore.test.ts`:
  ```typescript
  function makeStarter(overrides: Partial<AtgStarter> = {}): AtgStarter {
    return {
      start_number: 1,
      horse_id: "h1",
      // ... 40+ properties
      ...overrides,
    };
  }

  const defaultRace = { distance: 2140, start_method: "auto", field_size: 10 };
  ```

**Teardown Pattern:**
- Not used — tests are stateless and clean
- No fixtures or database setup needed (pure functions)

**Assertion Pattern:**
- Use specific matchers for clarity:
  - `.toBe()` for exact value matches
  - `.toBeGreaterThan()`, `.toBeCloseTo()` for numeric comparisons
  - `.toHaveLength()` for array size
  - `.toBeNull()` for null checks
  - `.toBeGreaterThanOrEqual()` for boundary testing

## Mocking

**Framework:**
- Jest mocks (not used in current codebase)
- No explicit mock setup files

**Patterns:**
- Not currently used — tests focus on pure algorithmic functions
- No external API mocking needed for analysis tests
- If added: Would use `jest.mock()` for HTTP calls in route handlers

**What to Mock:**
- External API calls (ATG, Supabase) — not tested in current suite
- Dependencies with side effects — currently none

**What NOT to Mock:**
- Pure calculation functions (all current test targets)
- Array operations and data transformations
- Math operations and scoring algorithms

## Fixtures and Factories

**Test Data:**
- Use factory function pattern: `makeStarter(overrides)`
- Provides sensible defaults and allows selective overrides
- Example from `formscore.test.ts`:
  ```typescript
  function makeStarter(overrides: Partial<AtgStarter> = {}): AtgStarter {
    return {
      start_number: 1,
      post_position: 1,
      horse_id: "h1",
      horse_name: "Test",
      horse_age: 5,
      // ... all required fields with realistic defaults
      ...overrides,
    };
  }

  // Usage:
  const starters = [
    makeStarter(),
    makeStarter({ start_number: 2, odds: 10 })
  ];
  ```

**Location:**
- Defined at top of test file, before describe blocks
- Within same test file (no separate fixture files)
- Constants (`defaultRace`, `SEX_LABEL`) at describe scope

## Coverage

**Requirements:**
- No explicit coverage threshold enforced
- Focus on critical algorithmic functions:
  - `calculateCompositeScore` (primary scoring algorithm)
  - `parseTimeToSeconds` (time parsing)
  - `computeDistanceSignal` (distance factors)
  - `computeTrackFactor` (track position factors)
  - `consistencyScore` (consistency calculation)
  - `isWinningHorse` (result matching)

**View Coverage:**
```bash
npx jest --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual pure functions in `lib/`
- Approach: Arrange-Act-Assert pattern
- Examples: All current tests (`analysis.test.ts`, `formscore.test.ts`, `systems.test.ts`)
- Test data flows through calculations and assertions on outputs

**Integration Tests:**
- Scope: Not yet implemented
- Would test: Server actions + database (Supabase)
- Candidates: `lib/actions/groups.ts`, `lib/actions/notes.ts`
- Approach: Would use test database or mocked Supabase client

**E2E Tests:**
- Framework: Not implemented
- Not applicable for this codebase structure (Next.js app without explicit E2E suite)

## Common Patterns

**Async Testing:**
- Not used in current test suite (all functions are synchronous)
- If needed: Use `async/await` with Jest's automatic async handling
- Example pattern (not in current code):
  ```typescript
  it("fetches data", async () => {
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
  });
  ```

**Error Testing:**
- Test null/undefined handling with `.toBeNull()`, `.toBeUndefined()`
- Test edge cases and boundary conditions
- Example from `analysis.test.ts`:
  ```typescript
  it("returnerar null för null/undefined", () => {
    expect(parseTimeToSeconds(null)).toBeNull();
    expect(parseTimeToSeconds(undefined)).toBeNull();
  });

  it("returnerar null för ogiltigt format", () => {
    expect(parseTimeToSeconds("ogiltigt")).toBeNull();
  });
  ```

**Boundary Testing:**
- Test minimum/maximum values (e.g., track position 1 vs. 12)
- Test state transitions (e.g., <5 starters vs. ≥5 starters)
- Example from `formscore.test.ts`:
  ```typescript
  it("använder dynamisk faktor vid exakt 5 starter (gränsfall)", () => {
    const boundary5: HorseStart[] = [
      { place: "1", date: "2025-01-01", track: "Test", time: "1:12,0", post_position: 5 },
      // ... 4 more
    ];
    const factor = computeTrackFactor(5, "volte", boundary5);
    expect(factor).toBeGreaterThanOrEqual(0);
    expect(factor).toBeLessThanOrEqual(1.0);
  });
  ```

**Range Validation:**
- Verify outputs stay within expected bounds (0–100 scores, 0–1 factors)
- Example from `formscore.test.ts`:
  ```typescript
  it("returnerar poäng i intervallet 0–100", () => {
    const starters = [makeStarter(), makeStarter({ start_number: 2, odds: 10 })];
    const scores = calculateCompositeScore(starters, defaultRace);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
  ```

## Test Naming Convention

**Style:**
- Swedish language (matches codebase)
- Descriptive: "what it tests" format
- Examples:
  - `"parsar 1:12,4 korrekt"` (correct parsing)
  - `"returnerar null för ogiltigt format"` (null for invalid input)
  - `"ger faktor 1.35 om hästen vunnit på exakt distans+metod"` (specific factor)
  - `"viktar vinster (60%) tyngre än placeringar (40%)"` (weighting verification)

**Patterns:**
- Positive case: `"ger... när..."` (gives... when...)
- Negative case: `"returnerar null för..."` (returns null for...)
- Comparison: `"är högre än... för..."` (is higher than... for...)
- Edge case: `"gränsfall"` (boundary case), `"exakt 5 starter"`

## Test Data Strategy

**Realistic Data:**
- Use domain-accurate values (odds 2.0–20.0, places 1–99)
- Use Swedish contexts (track names: "Solvalla", "Åby")
- Format matches production (e.g., time strings "1:14,5")

**Simplified Data:**
- Minimal fields for tests (only what function needs)
- Override defaults to test specific scenarios
- Example: Test without `last_5_results` to verify fallback to win percentage

**Mutation Testing:**
- Tests verify relative changes: `expect(withRecord).toBeGreaterThan(withoutRecord)`
- Ensures algorithm applies factors correctly
- Prevents silent failures if calculations are removed

---

*Testing analysis: 2026-04-05*
