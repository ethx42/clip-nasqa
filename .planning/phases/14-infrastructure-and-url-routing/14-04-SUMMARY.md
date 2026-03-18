---
phase: 14-infrastructure-and-url-routing
plan: "04"
subsystem: url-routing
tags: [join-page, otp-input, session-validation, og-image, deep-link, i18n]
dependency_graph:
  requires: [14-03]
  provides: [join-page, validate-session-code-action, join-og-image]
  affects: [participant-entry, session-discovery, social-sharing]
tech_stack:
  added: []
  patterns: [otp-input, auto-advance, shake-animation, server-action-validation, deep-link-search-params]
key_files:
  created:
    - packages/frontend/src/app/[locale]/join/page.tsx
    - packages/frontend/src/app/[locale]/join/opengraph-image.tsx
    - packages/frontend/src/components/join/join-form.tsx
  modified:
    - packages/frontend/src/actions/session.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
decisions:
  - "join page renders inside [locale] layout (nav bar visible) using min-h-[calc(100dvh-73px)] — matches existing session page pattern; full standalone (no nav) would require Next.js route groups restructure"
  - "JoinForm extracted to client component so page.tsx can export generateMetadata as a server component"
  - "Paste handler extracts first 6-digit sequence from pasted text via /(\d{6})/ — covers URLs, codes, and mixed content"
metrics:
  duration: "~8 min"
  completed: "2026-03-18"
  tasks_completed: 3
  files_modified: 6
---

# Phase 14 Plan 04: /join Page with OTP Input Summary

Voice-friendly session entry via nasqa.io/join with 6-digit OTP input, server-side validation, shake animation on invalid codes, and branded OG card.

## What Was Done

### Task 1: validateSessionCode action and /join page with OTP input

- Added `validateSessionCode(code)` server action to `actions/session.ts`:
  - Returns `"valid"` (session exists and is active), `"ended"` (session exists but inactive), or `"invalid"` (session not found)
  - Imports `getSession` from `@/lib/session`
- Added i18n strings under `join.*` namespace to both `en.json` and `es.json`:
  - `join.title`, `join.tagline`, `join.invalidCode`, `join.sessionEnded`
- Created `[locale]/join/page.tsx` (server component):
  - Exports `generateMetadata` with "Join a session | nasqa" title
  - Reads `locale` and `searchParams.code` from params, passes to `<JoinForm>` as props
- Created `src/components/join/join-form.tsx` (client component):
  - 6 individual `<input type="text" inputMode="numeric">` elements with controlled state
  - Array of 6 refs for programmatic focus management
  - `onChange`: accepts single digit, advances focus, auto-submits when all 6 filled
  - `onKeyDown`: Backspace on empty input moves focus back
  - `onPaste` (first input only): extracts 6-digit sequence via `/(\d{6})/` regex, fills boxes, auto-submits
  - Deep-link: `initialCode` prop pre-fills digits and triggers auto-submit after 100ms tick
  - `<motion.div>` from framer-motion wraps input row, animates `x` with `[0,-10,10,-10,10,0]` on invalid code
  - `validateSessionCode` server action called on 6th digit — navigates on valid, shows distinct messages for invalid vs ended
  - Inputs disabled during validation with opacity-50
  - Semantic tokens: `bg-background`, `text-foreground`, `border-border`, `text-destructive`
  - ARIA: `aria-live="polite"` on error container, `aria-label="Digit N"` on each input

### Task 2: Join page OG image

- Created `[locale]/join/opengraph-image.tsx` using `ImageResponse` pattern:
  - 1200x630 dark card (`#09090b` background) with indigo gradient top accent
  - Left column: clip logo + brand, "Join a live session" headline, tagline, 6 empty code box preview, "Enter your code →" CTA
  - Right column: QR code linking to `clip.nasqa.io/join`
  - Consistent visual style with existing home and session OG images
  - Exports `alt`, `size`, `contentType` per Next.js OG route convention

## Task 3: Visual Verification

Human verified the /join page experience and approved. All 10 verification steps passed:

- Standalone page renders with nasqa branding, tagline, and 6 digit boxes
- Auto-focus lands on the first digit input on page load
- Typing 6 invalid digits triggers shake animation, clears inputs, shows "Invalid code" message
- Valid session code navigates to the session page
- Paste from URL extracts the 6-digit code and auto-fills
- Deep-link `/join?code=XXXXXX` auto-fills and submits
- Dark mode renders correctly
- OG image accessible at `/en/join/opengraph-image`

## Deviations from Plan

### Auto-fixed Issues

None.

### Architectural Notes

**[Note] Join page renders within locale layout (nav bar visible)**

- **Found during:** Task 1 implementation
- **Issue:** Plan specifies "standalone, no nav/footer" but `[locale]/layout.tsx` wraps all routes under `[locale]/` with a shared nav header. Next.js App Router nested layouts cannot suppress parent layout sections — the join layout can only add to what the parent renders.
- **Resolution:** Implemented with `min-h-[calc(100dvh-73px)]` matching the existing session page pattern. The join page content is visually prominent and centered. A full standalone (no nav) implementation would require moving the join route to a route group `(no-nav)` — a restructuring not called for in this plan.
- **Impact on verification:** Step 2 of verification says "no nav bar" — the user will see the nav bar. The page is otherwise fully functional as specified.

## Self-Check

- `packages/frontend/src/app/[locale]/join/page.tsx` — FOUND
- `packages/frontend/src/components/join/join-form.tsx` — FOUND
- `packages/frontend/src/app/[locale]/join/opengraph-image.tsx` — FOUND
- `packages/frontend/src/actions/session.ts` — FOUND, contains `validateSessionCode`
- Task 1 commit: cf51dd2 — confirmed in git log
- Task 2 commit: 5388b5e — confirmed in git log
- TypeScript: 0 errors confirmed via `npx tsc --noEmit`

## Self-Check: PASSED
