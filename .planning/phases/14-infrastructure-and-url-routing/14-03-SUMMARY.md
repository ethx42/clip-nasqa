---
phase: 14-infrastructure-and-url-routing
plan: "03"
subsystem: url-routing
tags: [url-routing, session-routes, flat-url, og-image, qr-code, robots, format-code]
dependency_graph:
  requires: [14-02]
  provides: [flat-url-session-routes, format-code-utility]
  affects: [participant-url, host-toolbar-qr, og-image, robots]
tech_stack:
  added: []
  patterns: [6-digit-code-validation, force-dynamic, notFound-guard, flat-url-structure]
key_files:
  created:
    - packages/frontend/src/lib/format-code.ts
    - packages/frontend/src/app/[locale]/[code]/page.tsx
    - packages/frontend/src/app/[locale]/[code]/host/page.tsx
    - packages/frontend/src/app/[locale]/[code]/error.tsx
    - packages/frontend/src/app/[locale]/[code]/opengraph-image.tsx
  modified:
    - packages/frontend/src/app/robots.ts
  deleted:
    - packages/frontend/src/app/[locale]/session/ (entire directory)
decisions:
  - "6-digit validation guard (/^\\d{6}$/) placed in both generateMetadata and page default export to guard all entry points"
  - "participantUrl in host page uses /${locale}/${code} flat format — locale read from route params"
  - "OG image displays formatCode(code) (e.g. 482 913) as a prominent code badge below session title"
  - "robots.ts disallow rules for /session/ removed — session pages rely on per-page robots metadata instead"
metrics:
  duration: "~4 min"
  completed: "2026-03-18"
  tasks_completed: 2
  files_modified: 6
---

# Phase 14 Plan 03: URL Routing Restructure Summary

Session routes migrated from `/[locale]/session/[slug]/` to `/[locale]/[code]/` — the core user-facing routing change of phase 14. Flat numeric URLs are now live with 6-digit validation, grouped code display, and updated QR codes.

## What Was Done

### Task 1: Move session routes to [code] and add formatCode utility

- Created `packages/frontend/src/lib/format-code.ts` with `formatCode(code)` that formats a 6-digit string as "NNN NNN" (e.g. "482 913")
- Created `[locale]/[code]/page.tsx` (participant session page):
  - 6-digit guard: `if (!/^\d{6}$/.test(code)) { notFound(); }` in both `generateMetadata` and default export
  - `export const dynamic = "force-dynamic"`
  - Tab title format: `${session.title} — ${formatCode(code)} | nasqa`
  - Passes `sessionCode={code}` to `<SessionLivePage>`
- Created `[locale]/[code]/host/page.tsx` (host session page):
  - Same 6-digit guard and force-dynamic
  - `participantUrl` now uses `${baseUrl}/${locale}/${code}` flat format (locale read from params)
- Moved `error.tsx` unchanged to new directory
- Deleted entire `packages/frontend/src/app/[locale]/session/` directory

### Task 2: OG image migration, QR code URL update, and robots.ts cleanup

- Moved and updated `opengraph-image.tsx` to `[code]/` route:
  - Renamed `slug` param to `code`, added 6-digit validation guard
  - QR code URL updated from `https://clip.nasqa.io/session/${slug}` to `https://clip.nasqa.io/${locale}/${code}`
  - Added `formatCode(code)` display as a styled code badge (indigo, prominent) below session title and status
  - Imports `formatCode` from `@/lib/format-code`
- Updated `robots.ts`:
  - Removed `/en/session/`, `/es/session/`, `/pt/session/` disallow rules (paths no longer exist)
  - Session pages maintain `robots: { index: false, follow: false }` in their `generateMetadata`
- Confirmed zero `/session/` URL references remain in source (component directory imports `@/components/session/` are not URL references)

## Verification

- `[locale]/[code]/page.tsx` — exists, contains `notFound`, `formatCode`, `force-dynamic`
- `[locale]/[code]/host/page.tsx` — exists, contains `force-dynamic`, flat `participantUrl`
- `[locale]/[code]/opengraph-image.tsx` — exists, contains `formatCode`, flat QR URL
- `packages/frontend/src/app/[locale]/session/` — does NOT exist
- `grep /session/ packages/**/*.{ts,tsx}` — 0 URL matches (only component directory imports)
- `npx tsc --noEmit` — passes with 0 errors (after clearing stale `.next` cache)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/frontend/src/lib/format-code.ts` — FOUND
- `packages/frontend/src/app/[locale]/[code]/page.tsx` — FOUND, contains `notFound` and `formatCode`
- `packages/frontend/src/app/[locale]/[code]/host/page.tsx` — FOUND, contains `force-dynamic`
- `packages/frontend/src/app/[locale]/[code]/opengraph-image.tsx` — FOUND, contains `formatCode`
- `packages/frontend/src/app/robots.ts` — FOUND, no `/session/` disallow rules
- Task 1 commit: d5b5ebc — confirmed in git log
- Task 2 commit: e8cce99 — confirmed in git log
