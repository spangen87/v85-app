# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5 - Used throughout the application for type-safe development
- JavaScript (via React/Next.js) - Frontend and runtime execution

**Secondary:**
- SQL - Supabase schema migrations and database operations
- CSS - Tailwind CSS utility classes

## Runtime

**Environment:**
- Node.js (version specified via Next.js 16 requirements)

**Package Manager:**
- npm (required for npm scripts)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI component framework
- Tailwind CSS v4 - Utility-first CSS framework

**Testing:**
- Jest 30.2.0 - Unit and integration test runner
- ts-jest 29.4.6 - TypeScript support for Jest
- @types/jest 30.0.0 - Type definitions for Jest

**Build/Dev:**
- Next.js built-in Turbopack - Fast module bundler (configured in `next.config.ts`)
- TypeScript compiler - Type checking and transpilation

**PWA/Service Worker:**
- Serwist 9.5.6 - Service worker toolkit
- @serwist/next 9.5.6 - Next.js integration for Serwist

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.98.0 - Official Supabase client library for data operations
- @supabase/ssr 0.8.0 - Supabase server-side rendering utilities for cookie management in Next.js

**Infrastructure:**
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind CSS v4
- eslint 9 - Code linting and style enforcement
- eslint-config-next 16.1.6 - ESLint preset optimized for Next.js (Core Web Vitals + TypeScript)

**Type Definitions:**
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions

## Configuration

**Environment:**
- Supabase configuration via environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase project URL (browser-safe)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key for client auth (browser-safe)
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-only secret key for admin operations (server/route handlers only)
- All env vars are injected at runtime via Next.js environment variable system

**Build:**
- `next.config.ts` - Next.js configuration with Serwist PWA setup
- `tsconfig.json` - TypeScript compiler options targeting ES2017, configured with Next.js plugin
- `jest.config.js` - Jest test runner configuration with ts-jest preset
- `postcss.config.mjs` - PostCSS pipeline configured with Tailwind CSS v4
- `eslint.config.mjs` - ESLint configuration using new flat config format (ESLint 9)

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- npm for dependency management
- Modern browser with ES2017+ support for development server
- Service Worker support for PWA testing (Chrome, Firefox, Edge, Safari 16+)

**Production:**
- Node.js runtime for Next.js server deployment
- Supabase backend (PostgreSQL + Row Level Security)
- Browser support: Modern browsers (ES2017+) with Service Worker capability
- Served over HTTPS required for PWA and Supabase Auth

## Development Scripts

```bash
npm run dev      # Start Next.js development server on http://localhost:3000
npm run build    # Production build (creates .next/ optimized bundle)
npm run start    # Start production server (requires npm run build first)
npm run lint     # Run ESLint checks
npx jest         # Run test suite (finds lib/__tests__/*.test.ts)
```

## Build Output

- Production build creates `.next/` directory with:
  - Optimized server components
  - Static assets
  - Service worker manifest for Serwist
  - Next.js runtime code
- Service worker built to `public/sw.js` by Serwist integration

---

*Stack analysis: 2026-04-05*
