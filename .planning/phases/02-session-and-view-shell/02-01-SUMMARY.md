---
phase: 02-session-and-view-shell
plan: 01
subsystem: ui
tags: [next-themes, next-intl, tailwind, shadcn, react, sst, i18n, theme]

# Dependency graph
requires:
  - phase: 01-infrastructure
    provides: DynamoDB table (NasqaTable) and SST project structure
provides:
  - Zinc/Emerald CSS variable palette for light and dark modes
  - ThemeProvider (class-based) wrapping the entire app
  - ThemeToggle component (sun/moon icons, no hydration mismatch)
  - next-intl middleware routing all pages under [locale] segment
  - [locale]/layout.tsx with NextIntlClientProvider
  - Translation stubs for en/es/pt (landing, common, session namespaces)
  - SST NasqaSite Nextjs resource linked to DynamoDB table
affects:
  - 02-landing-page
  - 02-session-create
  - 02-session-view
  - 03-realtime

# Tech tracking
tech-stack:
  added:
    - next-themes (already in package.json — wired in this plan)
    - next-intl (already in package.json — wired in this plan)
    - random-word-slugs (newly installed)
  patterns:
    - "ThemeProvider wrapped in providers.tsx client component — required for RSC root layout"
    - "useSyncExternalStore for mounted state in theme toggle — avoids react-hooks/set-state-in-effect lint error"
    - "next-intl 4.x pattern: getRequestConfig with async requestLocale"
    - "[locale] segment routing with createMiddleware and browser detection"

key-files:
  created:
    - packages/frontend/src/components/providers.tsx
    - packages/frontend/src/components/theme-toggle.tsx
    - packages/frontend/src/middleware.ts
    - packages/frontend/src/i18n/request.ts
    - packages/frontend/src/app/[locale]/layout.tsx
    - packages/frontend/src/app/[locale]/page.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
  modified:
    - packages/frontend/src/app/globals.css
    - packages/frontend/src/app/layout.tsx
    - packages/frontend/next.config.ts
    - sst.config.ts

key-decisions:
  - "ThemeProvider lives in providers.tsx client wrapper, not layout.tsx — RSC root layouts cannot use hooks directly"
  - "useSyncExternalStore for mounted detection in ThemeToggle — eliminates setState-in-effect lint error while preserving hydration safety"
  - "radius set to 0.75rem (playful rounded aesthetic) as decided in planning"
  - "NasqaSite Nextjs resource added to sst.config.ts with link: [table] — makes Resource.NasqaTable.name available server-side"

patterns-established:
  - "Client-only state: use useSyncExternalStore with empty subscribe and server/client snapshot pair"
  - "All pages live under [locale] segment — root app/ only has layout.tsx and globals.css"
  - "Translation files in packages/frontend/messages/{locale}.json loaded via i18n/request.ts"

requirements-completed: [UI-01, UI-02, UI-03, UI-04]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 2 Plan 01: Theme System and i18n Foundation Summary

**Zinc/Emerald theme with next-themes class toggling, next-intl [locale] routing, en/es/pt stubs, and SST NasqaSite table link — all foundations required by every subsequent page**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T00:08:24Z
- **Completed:** 2026-03-14T00:11:36Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Zinc/Emerald CSS variable palette wired into shadcn's existing CSS var system (both :root and .dark)
- next-themes ThemeProvider wrapping the entire app with class-based toggling and no hydration shift
- ThemeToggle component with sun/moon icons and layout-shift-free server-rendering placeholder
- next-intl middleware routing all pages under /en, /es, /pt with browser locale detection
- Locale layout providing NextIntlClientProvider; translation stubs for all three locales
- SST NasqaSite Nextjs resource linked to DynamoDB table (makes table name available server-side)
- random-word-slugs installed for session slug generation in later plans

## Task Commits

1. **Task 1: Theme system — CSS vars, ThemeProvider, theme toggle** - `1e2eaf1` (feat)
2. **Task 2: i18n routing, SST table link, locale layout** - `84ab94d` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `packages/frontend/src/app/globals.css` - Zinc/Emerald palette overrides for :root and .dark, radius 0.75rem
- `packages/frontend/src/app/layout.tsx` - Updated metadata, Providers wrapper, suppressHydrationWarning on html
- `packages/frontend/src/components/providers.tsx` - Client wrapper with ThemeProvider (attribute=class)
- `packages/frontend/src/components/theme-toggle.tsx` - Sun/Moon toggle, useSyncExternalStore mounted pattern
- `packages/frontend/src/middleware.ts` - next-intl createMiddleware with en/es/pt and browser detection
- `packages/frontend/src/i18n/request.ts` - next-intl 4.x getRequestConfig loading locale messages
- `packages/frontend/next.config.ts` - Wrapped with createNextIntlPlugin pointing to i18n/request.ts
- `packages/frontend/src/app/[locale]/layout.tsx` - NextIntlClientProvider + header with ThemeToggle
- `packages/frontend/src/app/[locale]/page.tsx` - Minimal placeholder (replaces root app/page.tsx)
- `packages/frontend/messages/en.json` - English stubs: landing, common, session namespaces
- `packages/frontend/messages/es.json` - Spanish translations
- `packages/frontend/messages/pt.json` - Portuguese translations
- `sst.config.ts` - NasqaSite Nextjs resource added with link: [table] and siteUrl in return

## Decisions Made
- ThemeProvider lives in a `providers.tsx` client component wrapper — RSC root layouts cannot import hooks
- Used `useSyncExternalStore` for the mounted state in ThemeToggle instead of `useState` + `useEffect` to satisfy the `react-hooks/set-state-in-effect` ESLint rule while preserving identical hydration-safe behavior
- `--radius` set to `0.75rem` for the playful rounded aesthetic (per Phase 1 planning decision)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced useState+useEffect with useSyncExternalStore in ThemeToggle**
- **Found during:** Task 2 verification (ESLint pass)
- **Issue:** `setMounted(true)` inside `useEffect` triggered `react-hooks/set-state-in-effect` ESLint error
- **Fix:** Replaced with `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` — functionally equivalent, lint-clean
- **Files modified:** `packages/frontend/src/components/theme-toggle.tsx`
- **Verification:** `eslint src` passes with 0 errors
- **Committed in:** `84ab94d` (Task 2 commit)

**2. [Rule 3 - Blocking] Cleared stale .next cache before TypeScript check**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `.next/types/validator.ts` referenced deleted `app/page.js` — stale cached type artifact after moving page to [locale]/page.tsx
- **Fix:** `rm -rf packages/frontend/.next` then re-ran tsc
- **Files modified:** None (cache deletion only)
- **Verification:** TypeScript passes with no errors

---

**Total deviations:** 2 auto-fixed (1 bug/lint, 1 blocking cache)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered
- `npx next lint` CLI invocation fails in this monorepo setup (treats args as directory path) — used `eslint src --config eslint.config.mjs` directly via node_modules as equivalent

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All foundations are in place for Plan 02 (landing page) and beyond
- Every page will have ThemeToggle in header, correct palette, and i18n support
- SST NasqaSite resource is wired but requires AWS credentials to deploy (blocked same as Plan 01-03)

---
*Phase: 02-session-and-view-shell*
*Completed: 2026-03-14*
