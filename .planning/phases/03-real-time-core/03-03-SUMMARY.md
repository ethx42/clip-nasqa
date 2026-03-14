---
phase: 03-real-time-core
plan: 03
subsystem: frontend
tags: [qa, question-card, reply-list, qa-input, qa-panel, server-actions, appsync]

# Dependency graph
requires:
  - phase: 03-real-time-core
    plan: 01
    provides: appsyncClient, ADD_QUESTION, UPVOTE_QUESTION, ADD_REPLY, FOCUS_QUESTION mutations
  - phase: 02-session-and-view-shell
    provides: QAPanel placeholder, SessionShell slot architecture
affects:
  - 03-04 (SubscriptionProvider feeds questions/replies/votedIds props into QAPanel)
  - 03-05 (host delete action wires into QuestionCard host menu "Delete" item)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "QuestionCard uses Set<string> votedQuestionIds for O(1) vote state lookup"
    - "QAPanel groups replies into Map<questionId, Reply[]> before rendering"
    - "Sort: isFocused first, then upvoteCount desc, then createdAt desc"
    - "QAInput auto-resizes textarea 1-3 rows via scrollHeight calculation"
    - "Character counter only visible at 80%+ of limit (400/500); turns destructive at 490+"
    - "linkifyText utility from lib/linkify.tsx used in both question text and reply text"

key-files:
  created:
    - packages/frontend/src/actions/qa.ts
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/qa-input.tsx
  modified:
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/page.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx

key-decisions:
  - "QAPanel passes stub empty arrays to page routes — Plan 04 SubscriptionProvider will provide real data"
  - "formatRelativeTime implemented inline in question-card and reply-list (not shared util) — simple enough to not warrant extraction"
  - "focused state triggers ring-2 ring-emerald-500/50 animate-pulse — uses Tailwind animate-pulse via tw-animate-css"
  - "showReplies initial state = question.isFocused — focused questions auto-expand reply thread"

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 3 Plan 03: Q&A UI Components Summary

**QuestionCard with upvote/focus/host-menu, ReplyList with speaker badge, sticky QAInput with character counter, QAPanel with vote-sorted layout and empty state**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T15:57:49Z
- **Completed:** 2026-03-14T16:02:51Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Four Q&A Server Actions created: addQuestion (validates 500-char limit), upvoteQuestion (handles VOTE_CONFLICT), addReply (validates 500-char limit), focusQuestion (unfocuses when questionId omitted)
- QuestionCard displays upvote arrow (turns emerald when voted), vote count, question text with linkified URLs, relative timestamp, reply count toggle, inline Reply button + reply input (500-char limit), host three-dot menu with Focus/Unfocus and disabled Delete, "You" badge for own questions, emerald pulsing glow border with "Focused" label when isFocused
- ReplyList renders threaded replies with emerald left border and "Speaker" pill badge for host replies, linkified text
- QAInput is a sticky input bar with auto-resizing textarea (1-3 rows), character counter visible at 80%+ of limit (400/500) that turns destructive at 490+, Enter-to-submit, Send button disabled when empty or over limit
- QAPanel sorts questions with focused pinned first then upvoteCount descending then createdAt descending, groups replies into Map for O(1) lookup, shows "Be the first to ask a question!" empty state with icon, sticky QAInput outside scroll area

## Task Commits

1. **Task 1: Q&A Server Actions and question/reply display components** - `dbbc970` (feat)
2. **Task 2: Q&A input component and panel layout with vote sorting** - `ae11e0f` (feat)

## Files Created/Modified

- `packages/frontend/src/actions/qa.ts` - addQuestion, upvoteQuestion, addReply, focusQuestion Server Actions with validation and AppSync mutation calls
- `packages/frontend/src/components/session/question-card.tsx` - Full question card with upvote toggle, host menu, focused glow, inline reply input, ReplyList expansion
- `packages/frontend/src/components/session/reply-list.tsx` - Threaded reply list with Speaker badge and linkified text
- `packages/frontend/src/components/session/qa-input.tsx` - Sticky textarea input with character counter and Send button
- `packages/frontend/src/components/session/qa-panel.tsx` - Full panel with vote-sorted question list, empty state, sticky input
- `packages/frontend/src/app/[locale]/session/[slug]/page.tsx` - Updated to pass stub props to QAPanel/ClipboardPanel
- `packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx` - Updated to pass stub props to QAPanel/ClipboardPanel

## Decisions Made

- Pass empty stub arrays in session pages for now — Plan 04 SubscriptionProvider will provide real question/reply/fingerprint/votedIds data. Using stubs is cleaner than a conditional render since the components handle empty state internally.
- formatRelativeTime duplicated in question-card and reply-list rather than extracted to a shared utility — both files are small and the function is 8 lines. Will extract in Plan 05 if a third user appears.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated session page routes to satisfy QAPanel TypeScript interface**
- **Found during:** Task 2
- **Issue:** Existing `page.tsx` and `host/page.tsx` called `<QAPanel />` and `<QAPanel isHost />` with zero props; the new QAPanel requires sessionSlug, questions, replies, fingerprint, votedQuestionIds, onUpvote, onAddQuestion, onReply. ClipboardPanel similarly required sessionSlug and snippets props (from a prior plan's update).
- **Fix:** Added stub empty-array props to both pages with TODO comments pointing to Plan 04 wiring
- **Files modified:** `src/app/[locale]/session/[slug]/page.tsx`, `src/app/[locale]/session/[slug]/host/page.tsx`
- **Commits:** Included in ae11e0f

## Self-Check: PASSED

All 4 created files confirmed present. Task commits dbbc970 and ae11e0f verified in git log.

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*
