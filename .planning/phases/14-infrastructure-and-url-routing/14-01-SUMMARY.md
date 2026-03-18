---
phase: 14-infrastructure-and-url-routing
plan: 01
subsystem: infra
tags: [lambda, arm64, react-cache, dynamodb, framer-motion, ssr, a11y]

# Dependency graph
requires: []
provides:
  - Lambda ResolverFn configured at 256MB arm64 for lower cold-start cost
  - React.cache deduplication for getSession and getSessionData (halved SSR DynamoDB reads)
  - force-dynamic export on both session page files (no cross-request caching)
  - QA sort debounce reduced from 1000ms to 300ms
  - Layout animation respects prefers-reduced-motion via useReducedMotion hook
affects: [14-02, 15-performance-and-client-mutations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React.cache wrapping of server-side DynamoDB fetch functions for per-request deduplication"
    - "useReducedMotion hook gating layout and transition props for accessibility compliance"
    - "force-dynamic export to opt session pages out of Next.js static caching"

key-files:
  created: []
  modified:
    - sst.config.ts
    - packages/frontend/src/lib/session.ts
    - packages/frontend/src/app/[locale]/session/[slug]/page.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx
    - packages/frontend/src/components/session/qa-panel.tsx

key-decisions:
  - "256MB chosen over 512MB for Lambda — AWS August 2025 pricing bills INIT phase at invocation rate, making 512MB double cold-start cost"
  - "React.cache used rather than manual memoization — cache() provides request-scoped deduplication with zero boilerplate"
  - "Layout animation duration aligned to 300ms to match debounce — prevents visual mismatch between sort trigger and card movement"

patterns-established:
  - "React.cache pattern: wrap exported async server functions with cache() from react for automatic SSR request deduplication"
  - "Reduced-motion pattern: gate layout and transition props via useReducedMotion(), zero duration rather than omitting animation entirely"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, UX-01, UX-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 14 Plan 01: Infrastructure and UX Perf — SSR Deduplication, Lambda Config, QA Animation Summary

**Lambda arm64 at 256MB, React.cache SSR request deduplication halving DynamoDB reads, and QA vote-reorder animation aligned to a 300ms debounce with full prefers-reduced-motion support**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T03:53:14Z
- **Completed:** 2026-03-17T03:55:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Lambda ResolverFn now uses 256MB memory and arm64 architecture, reducing cold-start costs
- `getSession` and `getSessionData` wrapped with React.cache — same slug within one SSR render now triggers at most 1 DynamoDB call each (was 2 per function call)
- Both session page files export `force-dynamic` to prevent cross-request state contamination in SSR cache
- QA sort debounce reduced from 1000ms to 300ms for snappier vote-driven reordering
- `useReducedMotion` hook gates layout animation — users with prefers-reduced-motion get instant reorder, zero duration transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Lambda arm64 + 256MB and React.cache SSR deduplication** - `79c3885` (feat)
2. **Task 2: QA debounce 300ms with reduced-motion-aware layout animation** - `0018c7c` (feat)

## Files Created/Modified

- `sst.config.ts` - Added `memory: "256 MB"` and `architecture: "arm64"` to ResolverFn
- `packages/frontend/src/lib/session.ts` - Added `import { cache } from "react"`, wrapped `getSession` and `getSessionData` with `cache()`
- `packages/frontend/src/app/[locale]/session/[slug]/page.tsx` - Added `export const dynamic = "force-dynamic"`
- `packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx` - Added `export const dynamic = "force-dynamic"`
- `packages/frontend/src/components/session/qa-panel.tsx` - Reduced debounce to 300ms, added `useReducedMotion`, conditional layout/transition props

## Decisions Made

- 256MB chosen over 512MB — AWS August 2025 INIT phase billing makes 512MB double the cold-start cost at our traffic level
- React.cache preferred over manual memoization — provides request-scoped deduplication automatically without additional state management
- Layout transition duration aligned to 300ms debounce — a 400ms layout animation after a 300ms debounce trigger would cause a perceptible visual lag mismatch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Infrastructure baseline established — Lambda and SSR optimizations complete
- Plan 02 (URL routing: slug → code rename) can proceed without dependencies on this plan
- QA panel animation groundwork is in place; any future Framer Motion work on question cards should extend the `prefersReduced` pattern

---

_Phase: 14-infrastructure-and-url-routing_
_Completed: 2026-03-17_
