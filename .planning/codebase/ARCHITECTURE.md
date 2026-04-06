# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Server-driven Next.js 16 App Router with client-side React interactivity and Supabase backend

**Key Characteristics:**
- Server Components (SC) for data loading and layout, Client Components (CC) for interactive features
- Server Actions for all database mutations and API interactions
- Route Handlers (API endpoints) for external ATG race data fetching
- Context API for local client state (race tabs)
- PostgreSQL with Row Level Security (RLS) for multi-tenant data isolation

## Layers

**Presentation Layer (React Components):**
- Purpose: Render UI, handle user interactions, manage local component state
- Location: `components/` (pages use layout wrapping at `app/`)
- Contains: React components (`.tsx`), context providers, hooks
- Depends on: `lib/types`, `lib/analysis`, `lib/actions`
- Used by: Next.js App Router pages

**Page Layer (Server Components + Client Roots):**
- Purpose: Orchestrate data fetching, construct page layouts, hydrate with initial state
- Location: `app/(authenticated)/page.tsx`, `app/(authenticated)/sallskap/[groupId]/page.tsx`, etc.
- Contains: Async server components, layout definitions, data fetching
- Depends on: `lib/actions`, `lib/supabase/server`, presentation components
- Used by: Next.js routing system

**API Layer (Route Handlers):**
- Purpose: Fetch external data from ATG, serve HTTP endpoints
- Location: `app/api/games/fetch/`, `app/api/horses/[horseId]/starts/`, `app/api/games/available/`
- Contains: POST/GET handlers for data ingestion and computation
- Depends on: `lib/atg`, `lib/analysis`, `lib/supabase/server`
- Used by: Client-side fetch calls, scheduled tasks

**Business Logic Layer:**
- Purpose: Core domain algorithms and data transformations
- Location: `lib/analysis.ts`, `lib/formscore.ts`, `lib/atg.ts`
- Contains: Race analysis, composite scoring, distance/track factors, ATG API client
- Depends on: TypeScript types, no external dependencies
- Used by: API routes, components, server actions

**Data Access Layer (Server Actions):**
- Purpose: Encapsulate all Supabase operations with authentication checks
- Location: `lib/actions/` (groups.ts, notes.ts, posts.ts, systems.ts, sallskap.ts)
- Contains: Database queries, mutations, RLS-protected operations
- Depends on: `lib/supabase/server`, `lib/types`
- Used by: Pages, client components (via form/button handlers)

**Database Layer:**
- Purpose: Persistent storage with RLS for data isolation
- Connection: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (browser)
- Schema: `supabase/schema.sql`, migrations: `supabase/migration_v*.sql`
- Tables: games, races, starters, horses, profiles, groups, group_members, horse_notes, group_posts, game_systems

## Data Flow

**Game Fetch & Analysis Flow:**

1. User clicks "Hämta spel" on home page (`MainPageClient.tsx`)
2. Calls `POST /api/games/fetch` with `{ gameType, gameId }`
3. Route handler (`app/api/games/fetch/route.ts`):
   - Calls `fetchGame()` from `lib/atg.ts` → ATG API
   - Iterates races, calls `fetchHorseStarts()` for horse history
   - Saves to Supabase: `games`, `races`, `starters` tables
   - Preserves `last_5_results`, `finish_position`, `finish_time` from previous fetch
4. Component re-fetches via server component (`HomePage` → `getRaces()`)
5. Renders race grid with `RaceList` containing `HorseCard` components

**Composite Score (CS) Calculation:**

1. User views `HorseCard` or `AnalysisPanel` (both CC)
2. Data loaded server-side: starters with `formscore` pre-computed in DB (from `route.ts`)
3. Client-side display: `AnalysisPanel.tsx` reads `formscore` and computes derived metrics:
   - Distance signal: `computeDistanceSignal()` from `lib/analysis.ts`
   - Track factor: `computeTrackFactor()` from `lib/analysis.ts`
   - Form component: normalized scores from `lib/formscore.ts`

**System Draft Auto-Save Flow:**

1. User enters system selection mode in `MainPageClient` (CC)
2. Selection state → `systemSelections` useState
3. useEffect debounces 3s, calls `updateDraft()` or `createSystem()` (server actions)
4. Server action calls Supabase, updates `game_systems` table
5. `draftSaveStatus` UI shows saving state

**Group Forum & Notes Flow:**

1. User navigates to sallskap detail page (`app/(authenticated)/sallskap/[groupId]/page.tsx`)
2. Renders `SallskapPageClient` (CC) with tabs: Forum, Anteckningar, Sällskap
3. Each tab calls server actions: `getPosts()`, `getNotes()`, `getGroupMembers()`
4. RLS policy enforces: user must be group member to read/write
5. Form submissions call `createPost()`, `createNote()`, `updateNote()` from `lib/actions/`

**State Management:**

- **Server state:** Supabase (games, races, starters, systems, notes, posts)
- **Client state:** React useState (form inputs, UI toggles, selection state)
- **Global client state:** React Context (race tab via `RaceTabContext.tsx`)
- **Client cache:** Next.js data cache, SWR via browser fetch with revalidatePath

## Key Abstractions

**HorseStarter (Database):**
- Purpose: Represents one horse in one race with all ATG and computed metrics
- Examples: `components/HorseCard.tsx`, `app/(authenticated)/page.tsx`
- Pattern: Fetched as joined query (`races.starters`), includes horses.name

**SystemSelection:**
- Purpose: User's chosen horses for one race in a betting system
- Examples: `lib/types.ts`, `MainPageClient.tsx`
- Pattern: Array of `{ race_number, horses: [{ horse_id, start_number, horse_name }] }`

**GameSystem (Draft vs Published):**
- Purpose: User's multi-race selection with row count and optional group sharing
- Examples: `lib/types.ts`, `lib/actions/systems.ts`
- Pattern: `is_draft: true` for auto-saved work, `is_draft: false` for finalized systems

**LifeRecord:**
- Purpose: Horse's best race result per distance category + start method
- Examples: `lib/analysis.ts`, `lib/atg.ts`
- Pattern: Parsed from ATG; used for distance/track factor calculations

**Group & GroupMember:**
- Purpose: Multi-user sällskap with RLS-enforced membership
- Examples: `components/sallskap/`, `lib/actions/groups.ts`
- Pattern: Group contains invite_code; members join via code; RLS checks membership on queries

## Entry Points

**Application Root:**
- Location: `app/layout.tsx`
- Triggers: Page load
- Responsibilities: Wraps with ThemeProvider, registers SW, sets metadata

**Authenticated Layout:**
- Location: `app/(authenticated)/layout.tsx`
- Triggers: Any route under `/` (not `/login` or `/join`)
- Responsibilities: Adds TopNav, BottomNav, InstallPrompt; wraps with RaceTabProvider

**Home Page (Main Analysis):**
- Location: `app/(authenticated)/page.tsx`
- Triggers: User navigates to `/` after login
- Responsibilities: Fetches games, races, drafts; renders game picker, race tabs, analysis UI

**API: Game Fetch:**
- Location: `app/api/games/fetch/route.ts`
- Triggers: POST from `MainPageClient` or scheduled task
- Responsibilities: Ingests ATG race data, computes formscore, upserts Supabase

**API: Horse Starts:**
- Location: `app/api/horses/[horseId]/starts/route.ts`
- Triggers: GET from `AnalysisPanel.tsx` or history panel
- Responsibilities: Fetches historical race results for one horse from ATG

**Login Page:**
- Location: `app/login/page.tsx`
- Triggers: Unauthenticated user attempts access
- Responsibilities: Email/password sign-in form

**Group Join Page:**
- Location: `app/join/[inviteCode]/page.tsx`
- Triggers: User clicks invite link
- Responsibilities: Join group by code, redirect to home

## Error Handling

**Strategy:** Try-catch in server actions, error state in client components, console.error for logging

**Patterns:**
- Server actions throw `Error` with message; caught in client try-catch
- API routes return `NextResponse.json({ error: "message" }, { status: 4xx })`
- Client components display error in UI: `{error && <p className="text-red-400">{error}</p>}`
- Form handlers log errors to console, show user-friendly messages

## Cross-Cutting Concerns

**Logging:** Minimal. Errors logged to console via `console.error()`. No dedicated logger.

**Validation:** Type-safe via TypeScript; Supabase schema validation; no explicit Zod/Valibot validation layer visible.

**Authentication:** Supabase Auth (email/password). `createClient()` auto-hydrates session via cookies. `redirect("/login")` in server components for protection.

**Authorization:** Supabase RLS policies on tables (e.g., `game_systems`, `horse_notes`, `group_posts`). Server actions may perform additional checks (e.g., `getAuthUser()` before operations).

---

*Architecture analysis: 2026-04-05*
