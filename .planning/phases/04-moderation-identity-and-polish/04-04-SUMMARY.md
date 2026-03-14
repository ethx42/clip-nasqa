---
phase: 04-moderation-identity-and-polish
plan: 04
subsystem: frontend
tags: [identity, i18n, language-switcher, join-modal, authorName, graphql, session]
dependency_graph:
  requires:
    - phase: 04-02
      provides: LanguageSwitcher, IdentityEditor, JoinModal, useIdentity hook, shouldShowJoinModal
    - phase: 04-03
      provides: QuestionCard with moderation UI, QAPanel, session state reducer
  provides:
    - LanguageSwitcher rendered in session-shell header and locale layout header
    - IdentityEditor rendered in session-shell header
    - JoinModal on first participant session visit (sessionStorage guard)
    - authorName threaded from useIdentity through addQuestionAction and addReplyAction
    - authorName in ADD_QUESTION and ADD_REPLY GraphQL mutations
    - QuestionCard displays authorName or Anonymous for non-own questions
  affects: []
tech_stack:
  added: []
  patterns:
    - "useIdentity().name passed as authorName to Server Actions — client identity flows server-side for DynamoDB writes"
    - "shouldShowJoinModal() + useEffect pattern — checks sessionStorage on mount to show modal once per browser session"
    - "JoinModal wrapped in fragment alongside SessionShell — modal portal overlays entire screen without wrapping shell layout"

key-files:
  created: []
  modified:
    - packages/frontend/src/components/session/session-shell.tsx
    - packages/frontend/src/app/[locale]/layout.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/src/actions/qa.ts
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/components/session/question-card.tsx

key-decisions:
  - "LanguageSwitcher placed in both session-shell header (for session pages) and locale layout header (for landing page) — locale layout covers all routes including session"
  - "JoinModal open state controlled by useEffect checking shouldShowJoinModal — avoids hydration mismatch from reading sessionStorage on server"
  - "authorName passed as optional param (not required) — backward compatible with existing question/reply submissions"
  - "QuestionCard shows authorName for non-own questions; Anonymous (translated) when authorName absent; You badge for own questions"

requirements-completed:
  - IDENT-01
  - IDENT-02
  - I18N-01

duration: ~8min
completed: 2026-03-14
---

# Phase 4 Plan 04: Identity + Language Switcher Integration Summary

**LanguageSwitcher and IdentityEditor wired into session header; JoinModal on first visit; authorName threaded through addQuestionAction/addReplyAction and GraphQL mutations; QuestionCard shows author display name**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14T00:08:00Z
- **Tasks:** 1 of 2 complete (Task 2 is human-verify checkpoint)
- **Files modified:** 7

## Accomplishments

- `SessionShell` header now renders `[LiveIndicator] [spacer] [IdentityEditor] [LanguageSwitcher]` — all session pages (participant and host) get identity and language controls
- `LocaleLayout` header now renders `LanguageSwitcher | ThemeToggle` — landing page and success page get locale switching
- `SessionLivePage` mounts `JoinModal` on first visit (sessionStorage `nasqa_join_shown_${slug}` flag via `shouldShowJoinModal`) and passes `authorName` from `useIdentity` to question and reply submissions
- `SessionLiveHostPage` also threads `authorName` through addQuestion and addReply — hosts can optionally set a display name
- `addQuestionAction` and `addReplyAction` accept optional `authorName?: string` parameter passed through to GraphQL variables
- `ADD_QUESTION` and `ADD_REPLY` GraphQL mutation strings updated with `$authorName: String` variable declaration and argument pass-through
- `QuestionCard` metadata row shows author name (or `identity.anonymous` translation) for non-own questions

## Task Commits

1. **Task 1: Wire identity + language switcher + thread authorName** - `04163bc` (feat)

## Files Created/Modified

- `packages/frontend/src/components/session/session-shell.tsx` - Added LanguageSwitcher + IdentityEditor imports and render in header
- `packages/frontend/src/app/[locale]/layout.tsx` - Added LanguageSwitcher import and render in global header
- `packages/frontend/src/components/session/session-live-page.tsx` - useIdentity, JoinModal state + useEffect, authorName threaded through handleAddQuestion and handleReply
- `packages/frontend/src/components/session/session-live-host-page.tsx` - useIdentity, authorName threaded through handleAddQuestion and handleReply
- `packages/frontend/src/actions/qa.ts` - authorName? added to addQuestionAction and addReplyAction args
- `packages/frontend/src/lib/graphql/mutations.ts` - $authorName: String added to ADD_QUESTION and ADD_REPLY mutation strings
- `packages/frontend/src/components/session/question-card.tsx` - authorName display in metadata row with tIdentity('anonymous') fallback

## Decisions Made

- LanguageSwitcher placed in both session-shell header and locale layout header — covers all page types
- JoinModal open state driven by `useEffect` + `shouldShowJoinModal()` — avoids SSR hydration mismatch
- `authorName` is optional in all call sites — backwards compatible, never required
- QuestionCard shows `You` badge for own questions (fingerprint match), then `authorName` for named others, then `Anonymous` (translated) as final fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Task 2 is a human-verify checkpoint: deploy with `npm run deploy` then verify all Phase 4 features across i18n, identity, moderation, and rate limiting.

---
*Phase: 04-moderation-identity-and-polish*
*Completed: 2026-03-14*
