---
phase: 18-header-and-navigation
plan: 01
subsystem: ui
tags:
  [header, navigation, hamburger-menu, theme-toggle, language-switcher, css-variables, next-intl]

# Dependency graph
requires: []
provides:
  - AppHeader component with 56px height, logo, session context slot, hamburger, and profile
  - HamburgerMenu dropdown with labeled dark mode toggle and language switcher
  - LiveIndicator reworked to vertical stack layout
  - --header-height CSS variable in globals.css
  - All calc(100dvh-73px) replaced with calc(100dvh-var(--header-height))
  - i18n keys for darkMode, language, leaveSession, leaveConfirm, about in all 3 locales
affects:
  [session-shell, session-live-page, session-live-host-page, layout, all pages with height calc]

# Tech tracking
tech-stack:
  added: []
  patterns: [CSS variable for layout dimensions, AppHeader slot-based composition pattern]

key-files:
  created:
    - packages/frontend/src/components/app-header.tsx
    - packages/frontend/src/components/hamburger-menu.tsx
  modified:
    - packages/frontend/src/components/session/live-indicator.tsx
    - packages/frontend/src/app/globals.css
    - packages/frontend/src/app/[locale]/layout.tsx
    - packages/frontend/src/components/session/session-shell.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json

key-decisions:
  - "AppHeader uses slot-based composition (sessionContext, shareSlot props) so session-specific content can be injected in plan 02 without modifying AppHeader itself"
  - "Leave session confirmation uses base-ui Dialog (not window.confirm) per CLAUDE.md rules — triggered only when sessionContext prop is present"
  - "SessionShell title/liveIndicator/hostToolbar props removed in this plan; SessionLivePage and SessionLiveHostPage still hold those values for re-wiring in plan 02"
  - "LiveIndicator moves to vertical stack (dot on top, text below) to fit compactly next to session title in 56px header"
  - "--header-height placed in a separate :root block before the palette :root block for clarity"

patterns-established:
  - "Layout dimensions via CSS variables: all height calculations use var(--header-height) instead of hardcoded px values"
  - "AppHeader slot pattern: sessionContext and shareSlot props allow pages to inject context without AppHeader knowing page details"

requirements-completed:
  - HDR-01
  - HDR-04

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 18 Plan 01: Header and Navigation — Unified Header Bar Summary

**Single 56px AppHeader with hamburger dropdown (dark mode + language), slot-based session context, and CSS variable migration from hardcoded 73px**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-19T04:57:24Z
- **Completed:** 2026-03-19T05:01:46Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Created AppHeader component (56px, bg-muted, shadow-sm) with logo, CLIP text, session context slot, share slot, hamburger, and profile
- Created HamburgerMenu with labeled dark mode toggle switch (indigo-500 active) and inline language switcher
- Reworked LiveIndicator to vertical stack: pulsing dot on top, uppercase text below in text-[10px] tracking-widest
- Established --header-height: 56px CSS variable; migrated all hardcoded 73px references in 5 files
- Removed SessionShell internal header and cleaned up title/liveIndicator/hostToolbar props

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppHeader, HamburgerMenu, and rework LiveIndicator** - `5b349c5` (feat)
2. **Task 2: Replace old layout header and remove SessionShell internal header** - `83433d9` (feat)

**Plan metadata:** (to be committed next)

## Files Created/Modified

- `packages/frontend/src/components/app-header.tsx` - Unified 56px header with leave-session Dialog, logo link, session/share slots, HamburgerMenu, IdentityEditor
- `packages/frontend/src/components/hamburger-menu.tsx` - Dropdown with dark mode labeled toggle and LanguageSwitcher
- `packages/frontend/src/components/session/live-indicator.tsx` - Vertical stack layout (dot on top, label below)
- `packages/frontend/src/app/globals.css` - Added --header-height: 56px in :root
- `packages/frontend/src/app/[locale]/layout.tsx` - Replaced inline header with AppHeader; removed ThemeToggle/LanguageSwitcher imports
- `packages/frontend/src/components/session/session-shell.tsx` - Removed internal header block; removed title/liveIndicator/hostToolbar props; updated height calc
- `packages/frontend/src/components/session/session-live-page.tsx` - Stopped passing removed props to SessionShell
- `packages/frontend/src/components/session/session-live-host-page.tsx` - Stopped passing removed props to SessionShell
- `packages/frontend/src/app/[locale]/page.tsx` - 73px → var(--header-height)
- `packages/frontend/src/app/[locale]/[code]/page.tsx` - 73px → var(--header-height)
- `packages/frontend/src/app/[locale]/[code]/host/page.tsx` - 73px → var(--header-height)
- `packages/frontend/src/app/[locale]/not-found.tsx` - 73px → var(--header-height)
- `packages/frontend/src/components/join/join-form.tsx` - 73px → var(--header-height)
- `packages/frontend/messages/en.json` / `es.json` / `pt.json` - Added darkMode, language, leaveSession, leaveConfirm, about keys

## Decisions Made

- AppHeader uses slot-based composition (sessionContext, shareSlot) to stay generic; session wiring happens in plan 02
- Leave session dialog uses base-ui Dialog (not window.confirm), conditionally triggered by sessionContext presence
- SessionLivePage and SessionLiveHostPage retain liveIndicator/hostToolbar variables (not yet wired to AppHeader — deferred to plan 02)
- CSS variable placed in a dedicated :root block before palette variables for readability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AppHeader and HamburgerMenu are ready; plan 02 will wire sessionContext (title + LiveIndicator) and shareSlot (HostToolbar) from session pages into AppHeader
- SessionLivePage and SessionLiveHostPage still hold liveIndicator/hostToolbar values for plan 02 re-wiring
- CSS variable foundation in place for any future layout adjustments

## Self-Check: PASSED

All required files found:

- packages/frontend/src/components/app-header.tsx
- packages/frontend/src/components/hamburger-menu.tsx
- .planning/phases/18-header-and-navigation/18-01-SUMMARY.md

All commits verified:

- 5b349c5 (Task 1)
- 83433d9 (Task 2)

---

_Phase: 18-header-and-navigation_
_Completed: 2026-03-19_
