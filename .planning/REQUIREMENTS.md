# Requirements: Nasqa Live

**Defined:** 2026-03-17
**Core Value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices

## v2.0 Requirements

Requirements for Performance & Instant Operations milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Lambda resolver runs at 256MB memory with arm64 architecture to reduce cold starts
- [x] **INFRA-02**: SSR page load deduplicates `getSession` and `getSessionData` calls via `React.cache()` (2 DynamoDB calls instead of 4)
- [x] **INFRA-03**: Session page exports `force-dynamic` to prevent accidental cross-request caching

### Mutation Path

- [x] **MUT-01**: Participant mutations (addQuestion, upvoteQuestion, addReply, downvoteQuestion, react) execute directly from client to AppSync without Netlify Server Action hop
- [x] **MUT-02**: Host mutations (pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) remain as Server Actions for hostSecretHash security
- [x] **MUT-03**: Shared `graphqlMutation()` client utility handles AppSync HTTP POST with error parsing
- [x] **MUT-04**: `safeClientMutation()` wrapper provides consistent error handling with toast feedback
- [x] **MUT-05**: Remaining Server Actions lazy-load `getTranslations()` only in error paths

### Optimistic UI

- [x] **OPT-01**: Host snippet push appears instantly in clipboard via optimistic dispatch before server confirmation
- [x] **OPT-02**: Snippet reducer deduplicates optimistic entries using content-fingerprint matching (mirrors question pattern)
- [x] **OPT-03**: Failed snippet push rolls back optimistic entry and restores input content

### URL & Routing

- [x] **URL-01**: Session codes are 6-digit numeric (collision-free with 24h TTL, pool of 1M codes)
- [x] **URL-02**: Session URL flattened from `/[locale]/session/[slug]` to `/[locale]/[code]` (e.g., `/es/482913`)
- [x] **URL-03**: Host URL follows same pattern: `/[locale]/[code]/host#secret`
- [x] **URL-04**: Dedicated `/join` page with code entry field for voice-dictation scenarios
- [x] **URL-05**: QR code updated to resolve to flat URL format
- [x] **URL-06**: DynamoDB key migrated from `SESSION#word-slug` to `SESSION#482913`
- [x] **URL-07**: `createSession` Server Action generates 6-digit numeric code with collision check instead of word-pair slug
- [x] **URL-08**: Session-specific OG image route relocated from `session/[slug]/opengraph-image.tsx` to `[code]/opengraph-image.tsx` and updated to display numeric code

### Real-time UX

- [x] **UX-01**: QA panel sort debounce reduced from 1000ms to 300ms for faster perceived ordering
- [x] **UX-02**: Question card layout animations remain smooth at 300ms debounce (no teleporting)

### Client Highlighting

- [x] **SHIKI-01**: Host input syntax preview renders client-side using Shiki core with JavaScript regex engine
- [x] **SHIKI-02**: Language grammars load lazily via dynamic import (only languages in SUPPORTED_LANGUAGES)
- [x] **SHIKI-03**: Shiki bundle contribution stays under 15kB gzipped (fine-grained imports, no full bundle)
- [x] **SHIKI-04**: `renderHighlight` Server Action removed after client-side migration
- [x] **SHIKI-05**: Language auto-detection rewritten with stricter heuristics — plain text defaults to "text", URLs not misidentified as YAML, casual text not misidentified as JavaScript; only assigns language when confidence is high (multiple signals required)
- [x] **SHIKI-06**: Host can manually override detected language via a dropdown selector (SUPPORTED_LANGUAGES list) when auto-detection is wrong
- [x] **SHIKI-07**: Host input clears cleanly after push — no residual "selected text" visual artifact from the transparent textarea/backdrop overlay

## v2.1 Requirements

Requirements for Edit & Delete milestone. Each maps to roadmap phases.

### Edit & Delete — Questions & Replies

- [x] **EDIT-01**: Author can edit their own question within 5 minutes of posting (createdAt + 5min window)
- [x] **EDIT-02**: Author can edit their own reply within 5 minutes of posting
- [x] **EDIT-03**: Author can delete their own question within 5 minutes of posting (soft-delete)
- [x] **EDIT-04**: Author can delete their own reply within 5 minutes of posting (soft-delete)
- [x] **EDIT-05**: Host can edit any question or reply at any time (superuser)
- [x] **EDIT-06**: Host can delete any question or reply at any time (superuser, soft-delete)
- [x] **EDIT-07**: Edited posts display an "edited" indicator with timestamp
- [x] **EDIT-08**: Edits and deletes broadcast in real-time via AppSync subscription

### Edit & Delete — Clipboard Snippets

- [x] **EDIT-09**: Host can edit their own clipboard snippets (content and/or language)
- [x] **EDIT-10**: Edited snippets display an "edited" indicator

### Infrastructure

- [x] **EDIT-11**: DynamoDB schema supports edit/delete fields (editedAt, deletedAt, editedContent) without migration
- [x] **EDIT-12**: GraphQL schema adds editQuestion, editReply, deleteQuestion, deleteReply, editSnippet mutations
- [x] **EDIT-13**: Lambda resolvers enforce 5-minute author window and host superuser bypass via fingerprint/hostSecretHash validation

## v2.2 Requirements

Requirements for UX Overhaul milestone. Each maps to roadmap phases.

### Visual & Layout

- [ ] **VIS-01**: Q&A and clipboard items render as Slack-style segments (not cards), preserving all existing information and actions
- [ ] **VIS-02**: Cards/segments and buttons use less rounded corners and less padding
- [ ] **VIS-03**: All icon buttons (copy, pin, ban, upvote, etc.) are grouped consistently in segments and across the app
- [ ] **VIS-04**: Copy-content buttons in segments are icon-only (no text) and clearly indicate they copy the link; clipboard number is first in visual hierarchy
- [ ] **VIS-05**: Button groups are laid out consistently everywhere in the app

### Header

- [x] **HDR-01**: Single header bar replaces the current two-bar layout
- [ ] **HDR-02**: Header left side shows: logo, app name, session name, and "Live" indicator on one line
- [ ] **HDR-03**: Header right side shows (right to left): hamburger menu, profile icon (with current options), user's first name
- [x] **HDR-04**: Hamburger menu contains theme toggle and language selector (and anything else from the removed second bar)

### Functionality

- [ ] **FUNC-01**: Superuser delete removes Q&As from the database (hard delete, not just UI removal)
- [ ] **FUNC-02**: Q&A text supports line breaks (rich text / multi-line)
- [ ] **FUNC-03**: Share dialog shows session code in addition to QR code and link
- [ ] **FUNC-04**: Voting uses Reddit-style layout: up button, count in the middle, down button (consistent everywhere)
- [ ] **FUNC-05**: Pin and ban icons and behavior are properly aligned and consistent in Q&A
- [ ] **FUNC-06**: All icon-only buttons have clear hover tooltips explaining the action

### Audience View

- [ ] **AUD-01**: "Clipboard" and "Q&A" section headers are visible in the audience view
- [ ] **AUD-02**: Audience can collapse Q&A (e.g., drawer); clipboard from host has priority when Q&A is collapsed

### Inputs & Forms

- [ ] **INP-01**: QA input shows avatar, name, and "Ask a question" (translated) as placeholder when the input is empty
- [ ] **INP-02**: All "send content" buttons support Cmd+Enter / Ctrl+Enter as submit shortcut
- [ ] **INP-03**: Form buttons use one word maximum or icon only

### Deferred (future milestones)

- **BUNDLE-01**: Replace aws-amplify with lighter AppSync WebSocket client (eliminate 68kB)
- **BUNDLE-02**: Host mutations moved client-side after dedicated security review
- **MON-01**: Sentry error tracking integration (deferred from v1.1)
- **A11Y-02**: ARIA tablist role on mobile tab navigation
- **A11Y-03**: aria-live region on NewContentBanner for screen reader announcements

## Out of Scope

| Feature                                       | Reason                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Replacing aws-amplify SDK                     | 68kB bundle issue is orthogonal to latency; requires separate evaluation        |
| Host mutations client-side                    | `hostSecretHash` in Network tab is a security risk; needs dedicated review      |
| Lambda provisioned concurrency                | Cost-prohibitive for low-traffic app; 256MB memory is sufficient                |
| Edge functions for SSR                        | Netlify edge would add complexity; current SSR latency is acceptable            |
| WebSocket connection pooling                  | AppSync manages connections; no user-level optimization available               |
| Service worker caching                        | Real-time app needs fresh data; SW caching would cause staleness                |
| Full component library extraction             | Scope creep — extract only what's needed                                        |
| WCAG AAA compliance                           | Level AA is realistic; AAA conflicts with real-time UI                          |
| Translated URL paths (`/sesion/`, `/sessao/`) | Enterprise consensus: don't translate functional paths; breaks link sharing     |
| Localized word slugs                          | Breaks cross-language sharing, URL encoding issues, dictionary maintenance cost |
| Custom vanity domain                          | Future consideration (e.g., `nasqa.io`); not needed for v2.0                    |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| INFRA-01    | Phase 14 | Complete |
| INFRA-02    | Phase 14 | Complete |
| INFRA-03    | Phase 14 | Complete |
| MUT-01      | Phase 15 | Complete |
| MUT-02      | Phase 15 | Complete |
| MUT-03      | Phase 15 | Complete |
| MUT-04      | Phase 15 | Complete |
| MUT-05      | Phase 15 | Complete |
| OPT-01      | Phase 16 | Complete |
| OPT-02      | Phase 16 | Complete |
| OPT-03      | Phase 16 | Complete |
| UX-01       | Phase 14 | Complete |
| UX-02       | Phase 14 | Complete |
| SHIKI-01    | Phase 16 | Complete |
| SHIKI-02    | Phase 16 | Complete |
| SHIKI-03    | Phase 16 | Complete |
| SHIKI-04    | Phase 16 | Complete |
| SHIKI-05    | Phase 16 | Complete |
| SHIKI-06    | Phase 16 | Complete |
| SHIKI-07    | Phase 16 | Complete |
| URL-01      | Phase 14 | Complete |
| URL-02      | Phase 14 | Complete |
| URL-03      | Phase 14 | Complete |
| URL-04      | Phase 14 | Complete |
| URL-05      | Phase 14 | Complete |
| URL-06      | Phase 14 | Complete |
| URL-07      | Phase 14 | Complete |
| URL-08      | Phase 14 | Complete |
| EDIT-01     | Phase 17 | Complete |
| EDIT-02     | Phase 17 | Complete |
| EDIT-03     | Phase 17 | Complete |
| EDIT-04     | Phase 17 | Complete |
| EDIT-05     | Phase 17 | Complete |
| EDIT-06     | Phase 17 | Complete |
| EDIT-07     | Phase 17 | Complete |
| EDIT-08     | Phase 17 | Complete |
| EDIT-09     | Phase 17 | Complete |
| EDIT-10     | Phase 17 | Complete |
| EDIT-11     | Phase 17 | Complete |
| EDIT-12     | Phase 17 | Complete |
| EDIT-13     | Phase 17 | Complete |
| HDR-01      | Phase 18 | Complete |
| HDR-02      | Phase 18 | Pending  |
| HDR-03      | Phase 18 | Pending  |
| HDR-04      | Phase 18 | Complete |
| VIS-01      | Phase 19 | Pending  |
| VIS-02      | Phase 19 | Pending  |
| VIS-03      | Phase 19 | Pending  |
| VIS-04      | Phase 19 | Pending  |
| VIS-05      | Phase 19 | Pending  |
| FUNC-04     | Phase 19 | Pending  |
| FUNC-05     | Phase 19 | Pending  |
| FUNC-06     | Phase 19 | Pending  |
| FUNC-01     | Phase 20 | Pending  |
| FUNC-02     | Phase 20 | Pending  |
| FUNC-03     | Phase 20 | Pending  |
| AUD-01      | Phase 20 | Pending  |
| AUD-02      | Phase 20 | Pending  |
| INP-01      | Phase 21 | Pending  |
| INP-02      | Phase 21 | Pending  |
| INP-03      | Phase 21 | Pending  |

**Coverage:**

- v2.0 requirements: 28 total — Mapped to phases: 28 — Unmapped: 0
- v2.1 requirements: 13 total — Mapped to phases: 13 — Unmapped: 0
- v2.2 requirements: 20 total — Mapped to phases: 20 — Unmapped: 0

---

_Requirements defined: 2026-03-17_
_Last updated: 2026-03-18 after roadmap creation (phases 18-21)_
