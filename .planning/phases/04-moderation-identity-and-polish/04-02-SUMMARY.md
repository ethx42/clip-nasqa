---
phase: 04-moderation-identity-and-polish
plan: 02
subsystem: frontend
tags: [i18n, identity, language-switcher, localization, localStorage]
dependency_graph:
  requires: []
  provides:
    - i18n routing with persistent locale cookie
    - language switcher component (EN|ES|PT)
    - complete en/es/pt translation files (moderation + identity + session keys)
    - useIdentity hook (localStorage, email client-only)
    - JoinModal (first-entry, session-scoped show-once)
    - IdentityEditor (mid-session popover)
  affects:
    - packages/frontend/src/middleware.ts
    - packages/frontend/src/i18n/routing.ts
    - packages/frontend/src/i18n/navigation.ts
tech_stack:
  added:
    - next-intl defineRouting (centralized locale config)
    - next-intl createNavigation (typed router for locale switching)
    - "@base-ui/react Dialog (JoinModal)"
    - "@base-ui/react Popover (IdentityEditor)"
    - lucide-react User icon
  patterns:
    - localStorage identity storage (nasqa_identity key)
    - sessionStorage show-once flag per session slug
    - Typed locale union from routing config
key_files:
  created:
    - packages/frontend/src/i18n/routing.ts
    - packages/frontend/src/i18n/navigation.ts
    - packages/frontend/src/components/language-switcher.tsx
    - packages/frontend/src/hooks/use-identity.ts
    - packages/frontend/src/components/session/join-modal.tsx
    - packages/frontend/src/components/session/identity-editor.tsx
  modified:
    - packages/frontend/src/middleware.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "next-intl createNavigation typed router used in language-switcher — ensures locale param is type-safe and router.replace is locale-aware"
  - "shouldShowJoinModal() exported as utility from join-modal.tsx — lets session page check sessionStorage before controlling open state"
  - "Email never included in setIdentity server calls — hook enforces client-only constraint (IDENT-03)"
  - "@base-ui/react Dialog for JoinModal (full-screen overlay), Popover for IdentityEditor (lightweight inline trigger)"
metrics:
  duration: "2.5 min"
  completed: "2026-03-14"
  tasks: 2
  files_created: 6
  files_modified: 4
---

# Phase 4 Plan 02: i18n routing, language switcher, complete translations, identity system Summary

**One-liner:** next-intl defineRouting with 1-year cookie + EN|ES|PT switcher + complete moderation/identity translations + localStorage identity hook, join modal, and identity editor

## What Was Built

### Task 1: i18n routing + language switcher + complete translations (97957ff)

**i18n routing centralized** — `src/i18n/routing.ts` creates `defineRouting` with `locales: ['en', 'es', 'pt']`, `defaultLocale: 'en'`, and `localeCookie: { maxAge: 365 * 24 * 60 * 60 }` for a 1-year persistent cookie. All locale config lives in one place.

**i18n navigation** — `src/i18n/navigation.ts` exports `{ Link, redirect, usePathname, useRouter }` via `createNavigation(routing)`. These typed exports make locale-aware navigation safe.

**Middleware refactored** — `src/middleware.ts` now imports `routing` from `@/i18n/routing` and passes it to `createMiddleware(routing)`. Inline locale array removed.

**Language switcher** — `src/components/language-switcher.tsx` renders EN | ES | PT buttons. Active locale is `font-semibold text-foreground`; inactive locales use `text-muted-foreground` with hover transition. Uses `useRouter().replace(pathname, { locale })` from `@/i18n/navigation`.

**Translation files** — All three message files extended with:
- `moderation` namespace: questionRemoved, hiddenByCommunity, show, banParticipant, banQuestion, blockedFromPosting, confirmBan, confirmBanQuestion, cancel
- `identity` namespace: whatsYourName, displayName, email, skip, joinSession, editProfile, anonymous, save, clear
- `common` additions: rateLimitExceeded, tryAgain, confirm, cancel, save, clear
- `session` additions: newContent, dismiss, liveNow, connectedParticipants, askQuestion, submitQuestion, upvote, reply, replyPlaceholder, submitReply, noQuestions, clipboardEmpty, clipboardCleared

### Task 2: useIdentity hook + JoinModal + IdentityEditor (9528448)

**useIdentity hook** — `src/hooks/use-identity.ts` manages `nasqa_identity` in localStorage. Reads on mount, writes on `setIdentity(name?, email?)`, removes on `clearIdentity()`. Returns `{ name, email, hasIdentity, setIdentity, clearIdentity }`. Email is never passed to any server-bound call (IDENT-03 enforced).

**JoinModal** — `src/components/session/join-modal.tsx` uses `@base-ui/react` Dialog primitive. Shows when `open` prop is true (controlled by parent). Two optional inputs: display name (50 chars max) and email (100 chars max), pre-filled from useIdentity. Buttons: "Join session" (saves + closes) and "Skip" (closes without saving). Marks `nasqa_join_shown_${sessionSlug}` in sessionStorage to avoid re-showing within same browser session. Also exports `shouldShowJoinModal(slug)` utility.

**IdentityEditor** — `src/components/session/identity-editor.tsx` uses `@base-ui/react` Popover, triggered by a `User` icon button. Pre-fills name/email from useIdentity. "Save" updates identity, "Clear" removes it. Lightweight popover pattern fits the session header without a full overlay.

## Verification

- `npx tsc --noEmit --project packages/frontend/tsconfig.json` passes
- `routing.ts` exports `routing` with `localeCookie.maxAge = 31536000`
- `navigation.ts` exports `Link`, `redirect`, `usePathname`, `useRouter`
- `middleware.ts` imports `routing` from `@/i18n/routing`
- `language-switcher.tsx` uses `useRouter` from `@/i18n/navigation`
- All three message files have matching key structures (moderation + identity + common + session)
- `useIdentity` reads/writes `nasqa_identity` localStorage key
- `JoinModal` sets `nasqa_join_shown_${slug}` in sessionStorage
- Email is never included in any server-bound operation

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files verified:

- packages/frontend/src/i18n/routing.ts — FOUND
- packages/frontend/src/i18n/navigation.ts — FOUND
- packages/frontend/src/components/language-switcher.tsx — FOUND
- packages/frontend/src/hooks/use-identity.ts — FOUND
- packages/frontend/src/components/session/join-modal.tsx — FOUND
- packages/frontend/src/components/session/identity-editor.tsx — FOUND

Commits verified:

- 97957ff: feat(04-02): i18n routing, language switcher, and complete translations
- 9528448: feat(04-02): useIdentity hook, JoinModal, and IdentityEditor
