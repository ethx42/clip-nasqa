---
phase: 03-real-time-core
plan: 06
subsystem: ui
tags: [real-time, websocket, appsync, shiki, framer-motion, poppins, q-and-a, clipboard]

# Dependency graph
requires:
  - phase: 03-real-time-core
    provides: All Phase 3 plans 01-05 — subscription wiring, UI components, host actions, animations
provides:
  - Human verification approval of complete Phase 3 real-time core
  - Post-verification UI fixes: animation polish, sort debouncing, full font/visual overhaul
affects: [04-moderation-and-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Poppins font via next/font/google for consistent visual identity across all views"
    - "1s debounced sort for Q&A vote reordering — prevents chaotic card movement on rapid votes"
    - "Static emerald glow shadow (box-shadow) for focused question pin — no animate-pulse jitter"

key-files:
  created: []
  modified:
    - packages/frontend/src/app/layout.tsx
    - packages/frontend/src/components/QAPanel/QuestionCard.tsx
    - packages/frontend/src/components/ClipboardPanel/index.tsx
    - packages/frontend/src/app/session/[slug]/page.tsx

key-decisions:
  - "Removed animate-pulse from focused question pin — static emerald glow shadow is visually cleaner and avoids distraction during live talks"
  - "Debounced Q&A sort by 1s — immediate re-sort on every vote caused cards to jump constantly; debounce gives smooth UX while preserving real-time feel"
  - "Switched to Poppins font with increased text sizes across all components — improves readability on projected screens and mobile"

patterns-established:
  - "Use static shadow/glow for persistent highlight states, not animate-pulse"
  - "Debounce list re-sorts on high-frequency events (votes, likes) to prevent layout thrash"

requirements-completed: [CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05, CLIP-06, CLIP-07, QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08, INFRA-02, INFRA-03, INFRA-06, INFRA-07, INFRA-08]

# Metrics
duration: human-verify
completed: 2026-03-14
---

# Phase 3 Plan 06: Human Verification Summary

**Phase 3 real-time core approved after human verification; post-approval fixes addressed animation polish, Q&A sort debouncing, and a full Poppins font/visual hierarchy overhaul**

## Performance

- **Duration:** Human verification checkpoint (not timed execution)
- **Started:** 2026-03-14
- **Completed:** 2026-03-14
- **Tasks:** 1 (checkpoint:human-verify — approved)
- **Files modified:** ~4 (post-verification fixes)

## Accomplishments

- Human verified complete Phase 3 end-to-end: live clipboard, Shiki highlighting, Q&A with upvoting/replies, host moderation, connection status, Framer Motion animations
- Fixed three post-verification issues discovered during user review before final approval
- Phase 3 real-time core is complete and approved

## Task Commits

Post-verification fixes committed before approval:

1. **Focus/pin animation fix** - removed `animate-pulse` from focused question, replaced with static emerald `box-shadow` glow
2. **Q&A vote sort debounce** - added 1s debounced sort to prevent chaotic card movement on rapid upvotes
3. **UI/font overhaul** - switched to Poppins font via `next/font/google`, increased text sizes, improved visual hierarchy across all components

Earlier in-flight fixes (committed during gap-closure before checkpoint):
- `169d4cf` fix(03-06): prevent question duplication from optimistic + subscription
- `ae51911` fix(03-06): prevent vote double-counting and reply duplication
- `fc2cc19` fix(03-06): handle AWSJSON double-encoding and add snippet expand/collapse
- `f8722b2` fix(03-06): create resolver Lambda separately to fix handler misconfiguration
- `d319874` fix(03-06): use direct fetch for Server Action mutations instead of Amplify client
- `66c04d1` fix(03-06): use Amplify Hub for connection status instead of waiting for first event

## Files Created/Modified

- `packages/frontend/src/app/layout.tsx` - Added Poppins font, updated global type scale
- `packages/frontend/src/components/QAPanel/QuestionCard.tsx` - Static emerald glow for focused state, debounced sort, larger text
- `packages/frontend/src/components/ClipboardPanel/index.tsx` - Visual hierarchy improvements
- `packages/frontend/src/app/session/[slug]/page.tsx` - Font and layout adjustments

## Decisions Made

- Removed `animate-pulse` from focused question pin — the constant pulsing was distracting during live talks; a static emerald shadow communicates "pinned" without movement
- Q&A sort debounced at 1s — rapid upvoting caused cards to jump on every click, breaking the reading flow; 1s delay preserves real-time feel while eliminating layout thrash
- Poppins selected for improved legibility on projected screens and mobile; larger text sizes support audience viewing distances

## Deviations from Plan

### Post-Verification Fixes (User-Requested)

These fixes were requested by the user during verification and applied before final approval:

**1. Focus animation polish**
- **Found during:** Human verification review
- **Issue:** `animate-pulse` on focused question card was distracting and jittery during talks
- **Fix:** Replaced with static `box-shadow` using emerald color — visually clear without motion
- **Files modified:** QuestionCard.tsx

**2. Q&A vote reordering debounce**
- **Found during:** Human verification review
- **Issue:** Cards re-sorted immediately on every vote, causing chaotic movement in Q&A feed
- **Fix:** Added 1s debounced sort — cards settle after vote activity pauses
- **Files modified:** QAPanel or QuestionCard component

**3. UI/font overhaul**
- **Found during:** Human verification review
- **Issue:** Default font and text sizes insufficient for projected/mobile readability
- **Fix:** Switched to Poppins font, increased text sizes throughout, improved visual hierarchy
- **Files modified:** layout.tsx, multiple UI components

---

**Total deviations:** 3 user-requested fixes applied post-checkpoint before approval
**Impact on plan:** All fixes improved UX polish with no scope creep. Phase 3 approved after fixes.

## Issues Encountered

Gap-closure work before checkpoint (6 fix commits) addressed:
- AWSJSON double-encoding in subscription payloads
- Optimistic insert deduplication vs subscription events
- Vote double-counting from race conditions
- Lambda handler misconfiguration in resolver setup
- Amplify Hub used for connection status (more reliable than waiting for first subscription event)

## User Setup Required

None - no external service configuration required beyond what was established in earlier Phase 3 plans.

## Next Phase Readiness

- Phase 3 real-time core is fully complete and verified
- All requirements CLIP-01 through CLIP-07, QA-01 through QA-08, INFRA-02/03/06/07/08 are satisfied
- Phase 4 (moderation and polish) can begin: downvote threshold, WAF rate limiting, connected-count tracking
- Known constraint: 80KB bundle target unachievable with aws-amplify subscription library (68KB gz) — documented and accepted

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*
