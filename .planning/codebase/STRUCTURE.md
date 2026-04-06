# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
project-root/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout: ThemeProvider, metadata, SW registration
│   ├── globals.css                # Tailwind imports
│   ├── manifest.ts                # PWA manifest
│   ├── sw.ts                       # Service worker registration
│   ├── (authenticated)/           # Protected route group (requires login)
│   │   ├── layout.tsx             # Adds TopNav, BottomNav, InstallPrompt
│   │   ├── page.tsx               # Home: game picker, race tabs, analysis
│   │   ├── evaluation/            # System accuracy evaluation page
│   │   ├── manual/                # Help/manual page
│   │   ├── system/                # (Older systems view, may be deprecated)
│   │   └── sallskap/[groupId]/    # Group detail page: forum, notes, members
│   ├── api/                       # Route handlers (HTTP endpoints)
│   │   ├── games/
│   │   │   ├── fetch/route.ts     # POST: ingest ATG game data
│   │   │   ├── available/route.ts # GET: list available games from ATG
│   │   │   ├── upcoming/route.ts  # GET: upcoming games
│   │   │   └── [gameId]/results/  # GET: race results after finish
│   │   └── horses/[horseId]/
│   │       └── starts/route.ts    # GET: horse's race history
│   ├── login/page.tsx             # Email/password login form
│   └── join/[inviteCode]/         # Group invitation link handler
│
├── components/                     # React components
│   ├── HorseCard.tsx              # Single horse with form score, expandable details
│   ├── MainPageClient.tsx         # Main page root (CC), orchestrates race list + system mode
│   ├── RaceList.tsx               # Race view, renders cards, sorting/filtering
│   ├── AnalysisPanel.tsx          # Distance + track factor analysis per race
│   ├── TopFiveRanking.tsx         # Top 5 horses by composite score widget
│   ├── GamePickerBar.tsx          # Game selection dropdown
│   ├── GameSelector.tsx           # Game selector component
│   ├── RaceTabBar.tsx             # Race tabs for quick navigation
│   ├── RaceTabContext.tsx         # React Context for active race number
│   ├── BottomNav.tsx              # Mobile bottom navigation
│   ├── TopNav.tsx                 # Top navigation bar
│   ├── ThemeToggle.tsx            # Dark/light mode toggle
│   ├── ThemeProvider.tsx          # Theme context + localStorage
│   ├── CollapsibleControls.tsx    # Mobile-collapsible sort/filter panel
│   ├── ResultsButton.tsx          # Button to fetch race results
│   ├── AutoLoadUpcoming.tsx       # Auto-fetch next V85/V86 if none loaded
│   ├── UsefulLinks.tsx            # Links to ATG, etc.
│   ├── InstallPrompt.tsx          # PWA install banner
│   ├── StartCountdown.tsx         # Timer to race start
│   ├── SystemDrawer.tsx           # Drawer for system selection UI
│   ├── SaveSystemDialog.tsx       # Modal to finalize draft → system
│   ├── SystemsPageClient.tsx      # View user's systems page
│   ├── SystemSidebar.tsx          # Sidebar for system horse selection
│   ├── NavActiveLink.tsx          # Active link styling helper
│   ├── groups/                    # Group (sällskap) features
│   │   ├── UserMenu.tsx           # User profile dropdown
│   │   ├── ProfileForm.tsx        # Edit display name modal
│   │   ├── GroupList.tsx          # List user's groups with codes
│   │   ├── CreateGroupForm.tsx    # Create new group modal
│   │   ├── JoinGroupForm.tsx      # Join group by code modal
│   │   └── GroupAdminModal.tsx    # Manage group settings (ATG link, members)
│   ├── notes/                     # Horse note features
│   │   ├── HorseNotes.tsx         # Toggle + list notes for one horse
│   │   ├── NoteForm.tsx           # Input form: text, label, group choice
│   │   ├── NoteItem.tsx           # Rendered note with reply UI
│   │   └── NoteLabel.tsx          # Color badge (red|orange|yellow|green|blue|purple)
│   └── sallskap/                  # Group detail page tabs
│       ├── TabBar.tsx             # Forum | Anteckningar | Sällskap tabs
│       ├── admin/AdminTab.tsx     # Group settings
│       ├── forum/ForumTab.tsx     # Discussion threads per race
│       ├── notes/NotesTab.tsx     # Group notes view
│       ├── activity/              # Recent activity feed
│       └── spel/                  # Group's shared systems for race
│
├── lib/                            # Shared logic & data access
│   ├── types.ts                   # TypeScript interfaces (Group, GameSystem, HorseNote, etc.)
│   ├── analysis.ts                # Core analysis: distance signal, track factor
│   ├── formscore.ts               # Composite Score (CS) calculation: 30% form + 20% win% + 15% odds + ...
│   ├── atg.ts                     # ATG API client, row pricing, types (AtgStarter, AtgRace, HorseStart)
│   ├── systems.ts                 # (Minimal) system-related utilities
│   ├── systemsHelpers.ts          # (Minimal) helper functions
│   ├── supabase/
│   │   ├── server.ts              # createClient() for server, createServiceClient() for admin
│   │   └── client.ts              # createClient() for browser (SSR mode)
│   ├── actions/                   # Server Actions (all DB mutations)
│   │   ├── groups.ts              # Group CRUD: create, join, update, getProfile
│   │   ├── notes.ts               # HorseNote CRUD: create, update, delete, getNotesForHorse
│   │   ├── posts.ts               # GroupPost CRUD: create, get for game/group
│   │   ├── systems.ts             # GameSystem CRUD: create, publish draft, delete, get user/group systems
│   │   ├── sallskap.ts            # (Minimal) group-related actions
│   │   └── bets.ts                # (Older) betting-related actions
│   └── __tests__/                 # Jest unit tests
│       ├── analysis.test.ts
│       ├── formscore.test.ts
│       └── ...
│
├── supabase/                      # Database schema & migrations
│   ├── schema.sql                 # Current schema (games, races, starters, profiles, groups, etc.)
│   ├── migration_v*.sql           # Migration scripts in order
│
├── public/                        # Static assets
│   ├── apple-touch-icon.png       # PWA icon
│   └── ...
│
├── .planning/
│   └── codebase/                  # Architecture documentation
│
├── package.json                   # Dependencies (Next.js, React, Tailwind, Jest, ts-jest, etc.)
├── tsconfig.json                  # TypeScript config (paths: "@/*" → src root)
├── next.config.ts                 # Next.js config (Serwist PWA plugin)
├── jest.config.js                 # Jest + ts-jest config
├── eslint.config.mjs              # ESLint rules
└── CLAUDE.md                      # Project instructions

```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router pages and API routes
- Contains: Server components, route handlers, middleware
- Key files: `layout.tsx` (root), `(authenticated)/layout.tsx`, `(authenticated)/page.tsx`

**components/:**
- Purpose: Reusable React components (mostly Client Components)
- Contains: UI components, context providers, hooks
- Key files: `MainPageClient.tsx` (root of interactive page), `HorseCard.tsx`, `AnalysisPanel.tsx`

**lib/:**
- Purpose: Shared business logic, data access, utilities
- Contains: Analysis algorithms, Supabase client setup, server actions, TypeScript types
- Key files: `analysis.ts`, `formscore.ts`, `atg.ts`, `actions/` (all DB operations)

**lib/actions/:**
- Purpose: Server-side-only data mutations (all use "use server")
- Contains: Authenticated operations with RLS enforcement
- Key files: `groups.ts`, `notes.ts`, `systems.ts`, `posts.ts`

**supabase/:**
- Purpose: Database schema and migrations
- Contains: SQL schema, migration scripts
- Key files: `schema.sql` (current state), `migration_v*.sql` (history)

**lib/__tests__/:**
- Purpose: Jest unit tests
- Contains: Test files co-located as `*.test.ts`
- Coverage: Core algorithms (analysis, formscore)

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML, theme provider, service worker registration
- `app/(authenticated)/layout.tsx`: Protected route wrapper with nav
- `app/(authenticated)/page.tsx`: Home page with game picker and race analysis
- `app/login/page.tsx`: Authentication entry point
- `app/api/games/fetch/route.ts`: External data ingestion endpoint

**Configuration:**
- `tsconfig.json`: Path aliases (`@/*` → root), strict mode
- `next.config.ts`: Serwist PWA plugin, build config
- `jest.config.js`: Test runner with ts-jest
- `.env` (not committed): Supabase URLs and keys
- `package.json`: Dependencies (Next.js 16, React 19, Tailwind 4, Jest, ts-jest)

**Core Logic:**
- `lib/analysis.ts`: Distance factor, track factor, life record parsing
- `lib/formscore.ts`: Composite Score calculation (30% form + 20% win% + 15% odds + ...)
- `lib/atg.ts`: ATG API client, ATG type definitions, row pricing

**Data Access:**
- `lib/supabase/server.ts`: Server/service client setup
- `lib/supabase/client.ts`: Browser client setup (SSR mode)
- `lib/actions/groups.ts`: Profile, groups CRUD, membership
- `lib/actions/systems.ts`: Game system draft/publish, RLS queries
- `lib/actions/notes.ts`: Horse note CRUD
- `lib/actions/posts.ts`: Forum post CRUD

**Testing:**
- `lib/__tests__/analysis.test.ts`: Distance signal, track factor tests
- `lib/__tests__/formscore.test.ts`: Composite score calculation tests
- Run: `npm test` or `npx jest`

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js requirement)
- Layout: `layout.tsx` (Next.js requirement)
- Route handlers: `route.ts` (Next.js requirement)
- Components: PascalCase, e.g., `HorseCard.tsx`, `MainPageClient.tsx`
- Utilities: camelCase, e.g., `atg.ts`, `formscore.ts`
- Server actions: camelCase, e.g., `groups.ts`, `systems.ts`
- Tests: `*.test.ts`, e.g., `analysis.test.ts`

**Directories:**
- Route groups: parentheses, e.g., `(authenticated)`, `(public)`
- Dynamic routes: brackets, e.g., `[gameId]`, `[groupId]`, `[inviteCode]`
- Feature folders: plural, e.g., `components/notes/`, `lib/actions/`
- API routes: descriptive, e.g., `api/games/fetch/`, `api/horses/[horseId]/starts/`

**Variables & Functions:**
- Functions: camelCase, e.g., `calculateCompositeScore()`, `createSystem()`
- Constants: UPPER_SNAKE_CASE, e.g., `FORM_WEIGHTS`, `TRACK_BIAS_VOLTE`
- Types: PascalCase, e.g., `GameSystem`, `SystemSelection`, `AtgStarter`
- Boolean: prefix `is*`, `has*`, e.g., `isDraft`, `hasError`
- React hooks: prefix `use*`, e.g., `useRaceTab()`, `useState()`

## Where to Add New Code

**New Feature (Multi-file Feature):**
- Primary code: Create folder under `components/` (if UI) or `lib/` (if logic)
  - Example: `components/newFeature/`, `lib/actions/newFeature.ts`
- Tests: `lib/__tests__/newFeature.test.ts`
- Types: Add to `lib/types.ts` if shared, or inline in component
- Server actions: `lib/actions/newFeature.ts` (always "use server")

**New Component:**
- Implementation: `components/NewComponent.tsx`
- If client-side interactive: Mark with `"use client"`
- If server component: No directive (default)
- If sub-components: Create folder, e.g., `components/newFeature/SubComponent.tsx`

**New Page:**
- Protected page: `app/(authenticated)/newPage/page.tsx`
- Public page: `app/newPage/page.tsx` (outside `(authenticated)`)
- With dynamic route: `app/(authenticated)/parent/[id]/page.tsx`
- Optional layout: `app/(authenticated)/parent/layout.tsx`

**New API Endpoint:**
- Route: `app/api/resource/[id]/action/route.ts`
- Export `GET`, `POST`, `PUT`, `DELETE` as needed
- Use `createServiceClient()` for elevated permissions
- Return `NextResponse.json(data, { status: 200 })`

**New Database Table:**
- Add to `supabase/migration_v<N>_<description>.sql`
- Create migration: `supabase migration new <description>`
- Add RLS policy if data is user/group-scoped
- Update TypeScript types in `lib/types.ts`

**Utilities & Helpers:**
- Shared helpers: `lib/helpers.ts` or topical file, e.g., `lib/formatting.ts`
- Analysis logic: `lib/analysis.ts` or `lib/formscore.ts`
- API integration: `lib/atg.ts`

**Server Actions:**
- All database mutations: `lib/actions/<feature>.ts`
- Must have `"use server"` directive at top
- Always check `getAuthUser()` or `supabase.auth.getUser()`
- Return data or throw `Error` with message

## Special Directories

**lib/__tests__/:**
- Purpose: Jest unit tests for core algorithms
- Generated: No (committed to repo)
- Committed: Yes
- Run: `npm test` or `npx jest`

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes (build-time)
- Committed: No (.gitignore)

**public/:**
- Purpose: Static assets served at root
- Files: PWA icons, manifest, images
- Access: `/filename` from browser

**supabase/:**
- Purpose: Database schema and migrations
- Schema is version-controlled; migrations run sequentially
- Never edit committed migrations; create new ones for changes

---

*Structure analysis: 2026-04-05*
