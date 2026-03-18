# Phase 15: Mutation Path and Client Utilities - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Participant mutations (addQuestion, upvoteQuestion, downvoteQuestion, addReply, react) bypass the Netlify Server Action layer and call AppSync directly from the browser via shared typed utilities. Host mutations remain as Server Actions to protect hostSecretHash. Shared `graphqlMutation()` and `safeClientMutation()` utilities provide consistent error handling with toast feedback. Surviving Server Actions lazy-load `getTranslations()` only in error paths.

</domain>

<decisions>
## Implementation Decisions

### Error Feedback UX

- Rate-limit errors: toast with static message ("Too many attempts. Wait a moment.") — no live countdown
- Ban errors: toast on each attempt ("You've been restricted from participating in this session")
- Network errors: action-specific with connectivity awareness (e.g., "No internet connection" when offline vs "Failed to submit question" on server error). Claude decides exact granularity per error type.
- Toast position: bottom-center, auto-dismiss after 4 seconds
- Toasts are dismissible via tap/swipe
- Rate-limit toasts replace previous (no stacking)
- Success mutations: silent — the UI change (question appearing, vote count updating) IS the feedback
- Vote conflicts: silent reconciliation — sync to server state without notifying user
- Failed mutations: preserve input text so user can retry without retyping
- Submit button: disable + brief spinner while waiting for AppSync response
- Toast styling: use existing toast library, but align styles with the design system
- Error messages: fully localized via next-intl `useTranslations` hook (client-side)
- Error logging: console.error in dev + `reportError()` in production

### Security Boundary

- API key + endpoint URL in client bundle is acceptable (already public via subscription connection)
- Claude's Discretion: whether to add CORS/origin restriction (assess risk vs effort)
- Client-side validation: yes (text length, empty strings) for instant feedback; Lambda remains authoritative
- Input sanitization: trim whitespace only on client; server handles deeper sanitization
- Fingerprint approach: Claude's Discretion (keep localStorage UUID or assess alternatives)
- Host mutation guard: type-level enforcement — `graphqlMutation` TypeScript types only accept participant mutation names; calling with a host mutation is a compile error
- Auth config: `graphqlMutation` accepts an auth config object (`{ type: 'api-key', key }` or `{ type: 'jwt', token }`) to future-proof for SSO/Cognito migration

### Migration Strategy

- All 5 participant mutations migrated at once (not incrementally) — they all use the same utility
- Old participant Server Action code deleted entirely after migration — no dead code
- Host mutations (pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) remain as Server Actions untouched

### Offline/Retry Behavior

- One silent retry after 1 second before showing error toast
- If retry also fails, show action-specific error toast
- No persistent offline banner — errors surface only on action attempt
- No mutation queuing — fail and let user retry manually

### Claude's Discretion

- Exact toast library choice (use what exists in the project)
- CORS/origin restriction decision
- Fingerprint mechanism assessment
- Offline detection approach (navigator.onLine vs fetch failure)
- Internal architecture of `graphqlMutation` and `safeClientMutation`

</decisions>

<specifics>
## Specific Ideas

- "I want it to feel like the mutation just happened" — no visible delay between action and feedback
- Auth config object should be designed so swapping API key for JWT (when SSO comes) is a config change, not a rewrite
- Toast error messages should give just enough info to know what went wrong — if offline, say so; if rate limited, say so; don't expose technical details

</specifics>

<deferred>
## Deferred Ideas

- Freemium/premium message length limits — configurable per tier, like X.com (future milestone)
- SSO/sign-in integration with Cognito User Pools — replaces API key auth, enables user-ID-based banning (future milestone)
- CloudWatch alarm on AppSync 4xx/5xx error rate for abuse detection (future infra phase)
- API key auto-rotation with CloudWatch Events + SSM Parameter Store (future infra phase)
- API key TTL set to 365 days with 30-day expiration reminder alarm (future infra task)

</deferred>

---

_Phase: 15-mutation-path-and-client-utilities_
_Context gathered: 2026-03-18_
