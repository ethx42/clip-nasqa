---
phase: 03-real-time-core
plan: 05
subsystem: frontend
tags: [animations, framer-motion, live-indicator, notifications, host-actions, bundle-size, sonner, toast]

# Dependency graph
requires:
  - phase: 03-real-time-core
    plan: 04
    provides: useSessionUpdates, useSessionState, SessionLivePage, SessionLiveHostPage, ClipboardPanel, QAPanel

provides:
  - LiveIndicator: green pulsing LIVE / yellow Reconnecting / grey Paused connection status display
  - NewContentBanner: scroll-aware sticky banner for new snippets/questions
  - connectionStatus + lastHostActivity from useSessionUpdates for live status
  - Framer Motion AnimatePresence for snippet add/delete/layout transitions in ClipboardPanel
  - Framer Motion layout animations for question sort/add/delete in QAPanel
  - Delete button on each snippet card (host only)
  - CLIPBOARD_CLEARED toast via sonner Toaster (mounted in Providers)
  - Production build verified — Shiki absent from client bundle

affects:
  - 03-06 (no dependency — all polish is self-contained)

# Tech tracking
tech-stack:
  added:
    - "framer-motion v12 (AnimatePresence + motion.div with layout prop)"
    - "sonner v2 (Toaster mounted in Providers, toast() in ClipboardPanel)"
  patterns:
    - "AnimatePresence mode=popLayout for hero snippet — prevents layout jump on exit"
    - "motion.div layout prop for Q&A sort animations — smooth position change on re-rank"
    - "Scroll-aware banner: useRef on container, useEffect compares prev/new count, scrollTop threshold"
    - "connectionStatus tracked via useState in useSessionUpdates — set on first event (connected), error (disconnected), re-subscribed (connecting)"
    - "CLIPBOARD_CLEARED toast: useEffect compares prevSnippetsRef, fires only for participants (not host)"

key-files:
  created:
    - packages/frontend/src/components/session/live-indicator.tsx
    - packages/frontend/src/components/session/new-content-banner.tsx
  modified:
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/src/components/providers.tsx

key-decisions:
  - "connectionStatus exposed from useSessionUpdates return value — useState inside the hook avoids prop-drilling connection state through dispatch"
  - "lastHostActivity set only on SNIPPET_ADDED — snippets are the host's primary liveness signal"
  - "Toaster mounted in providers.tsx at root layout — single placement, correct for all pages"
  - "CLIPBOARD_CLEARED toast fires only for non-hosts (isHost check) — host sees their own action inline"
  - "AnimatePresence mode=popLayout on hero card — avoids flicker when new hero pushes old hero to history"
  - "80kB bundle target not achievable with aws-amplify subscription library in client bundle (68KB gzipped alone) — documented as architectural constraint from Phase 3 Plan 01 decision"

# Metrics
duration: 6min
completed: 2026-03-14
---

# Phase 3 Plan 05: Polish and Host Power Features Summary

**Connection status indicator, Framer Motion animations, host delete/clear actions, scroll-aware banners, and sonner toast notifications wired to real-time subscription events**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-14T16:13:16Z
- **Completed:** 2026-03-14T16:19:15Z
- **Tasks:** 2
- **Files modified:** 8 (6 modified, 2 created)

## Accomplishments

- `useSessionUpdates` now returns `{ connectionStatus, lastHostActivity }` — connection state transitions: `connecting` on mount/reconnect, `connected` on first event received, `disconnected` on subscription error (with 2s auto-recovery to `connecting`)
- `LiveIndicator` renders green pulsing dot + "LIVE" when connected, yellow dot + "Reconnecting..." when connecting, grey dot + "Paused" when disconnected. Shows "Last snippet Xm ago" when `lastHostActivity` is older than 2 minutes
- `NewContentBanner` is a sticky `position:sticky; top:0; z-index:10` component with CSS slide transition. Appears when new content arrives while user is scrolled past 80px threshold, disappears on scroll-to-top or tap
- `ClipboardPanel` now has: delete button on each HeroCard/HistoryCard (host only via ··· button), "Clear All" confirmation dialog (`window.confirm`), Framer Motion `AnimatePresence mode="popLayout"` for hero with `initial/animate/exit` transitions, `AnimatePresence initial={false}` for history list with layout prop, scroll-aware banner wired to `scrollContainerRef`, CLIPBOARD_CLEARED toast for participants
- `QAPanel` now has: Framer Motion `AnimatePresence` wrapping all sorted questions with `layout` prop for smooth sort transitions (`duration: 0.3`), scroll-aware banner for new questions
- `SessionLivePage` and `SessionLiveHostPage` pass `<LiveIndicator connectionStatus={...} lastHostActivity={...} />` to `SessionShell.liveIndicator` slot
- `Providers` mounts `<Toaster position="bottom-center" richColors />` for global toast notifications

## Bundle Size Findings (Task 2)

**Build:** Production build succeeded with Turbopack (Next.js 16.1.6).

**Shiki client check:** PASSED — Shiki library code (`codeToHtml`, `getHighlighter`, `bundledLanguages`) does not appear in any client chunk. Only the CSS class string `shiki-wrapper` appears (expected, as it's a className string in ClipboardPanel).

**Chunk breakdown (gzipped):**

| Chunk | Size (gz) | Contents |
|-------|-----------|----------|
| 325f65bd | 70KB | Next.js framework runtime |
| ac27f27b | 68KB | aws-amplify subscription library |
| 674c4571 | 32KB | React core (shared) |
| 99acf24e | 57KB | App code (session hooks, panels, components) |
| ac5c0d32 | 8KB | Next.js app infrastructure |
| Others  | ~15KB | polyfills, manifests, turbopack runtime |

**Total all chunks:** ~315KB gzipped across all routes.

**INFRA-08 target (80KB initial JS):** Not achievable with the current aws-amplify subscription architecture. The `aws-amplify` library (68KB gzipped) is required for AppSync WebSocket subscriptions and is loaded on every page because it's initialized in `Providers`. This was decided in Phase 3 Plan 01 (`aws-amplify full package installed for Amplify.configure SSR mode`). A future optimization path would be to dynamically import the subscription client only on session routes.

## Task Commits

1. **Task 1: Host actions, connection status, and liveness indicators** - `3166840` (feat)
2. **Task 1 fix: New snippet doc comment in new-content-banner** - `29d2a7b` (fix)
3. **Task 2: Bundle verification** — verification-only, no new files committed

## Files Created/Modified

- `packages/frontend/src/components/session/live-indicator.tsx` (created) — green/yellow/grey connection status indicator
- `packages/frontend/src/components/session/new-content-banner.tsx` (created) — sticky scroll-aware content notification banner
- `packages/frontend/src/hooks/use-session-updates.ts` (modified) — exposes connectionStatus + lastHostActivity
- `packages/frontend/src/components/session/clipboard-panel.tsx` (modified) — delete buttons, Framer Motion, scroll banner, toast
- `packages/frontend/src/components/session/qa-panel.tsx` (modified) — Framer Motion layout, scroll banner
- `packages/frontend/src/components/session/session-live-page.tsx` (modified) — wires LiveIndicator
- `packages/frontend/src/components/session/session-live-host-page.tsx` (modified) — wires LiveIndicator
- `packages/frontend/src/components/providers.tsx` (modified) — mounts Toaster

## Decisions Made

- `connectionStatus` is returned from `useSessionUpdates` rather than passed via a callback or stored in a separate hook. This keeps connection tracking co-located with the subscription logic and avoids threading additional state through the component tree.
- `lastHostActivity` tracks only `SNIPPET_ADDED` events — snippets are the primary speaker activity signal. Other events (upvotes, replies) are participant-driven and shouldn't reset the staleness indicator.
- The CLIPBOARD_CLEARED toast fires only when `!isHost` — the host clears the clipboard intentionally and doesn't need a notification about their own action.
- `AnimatePresence mode="popLayout"` on the hero card prevents the old hero from jumping to its history position while the new hero is entering — the popLayout mode handles concurrent enter/exit better.
- The 80KB bundle target is documented as unachievable with the current aws-amplify architecture. The approach is correct (Shiki out of client, framer-motion named imports tree-shake well in v12+), but the subscription library dominates the bundle. A future optimization would be lazy-loading the Amplify client only on session routes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Mounted Toaster in providers.tsx**
- **Found during:** Task 1 (implementing CLIPBOARD_CLEARED toast in ClipboardPanel)
- **Issue:** `toast()` from sonner requires `<Toaster />` to be mounted in the component tree. No Toaster was present anywhere in the layout.
- **Fix:** Added `<Toaster position="bottom-center" richColors />` to `Providers` in `providers.tsx`
- **Files modified:** `packages/frontend/src/components/providers.tsx`
- **Commit:** 3166840

## Self-Check: PASSED

All created/modified files confirmed present.
Task commits 3166840 and 29d2a7b confirmed in git log.

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*
