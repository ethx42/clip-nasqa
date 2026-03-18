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

- [ ] **OPT-01**: Host snippet push appears instantly in clipboard via optimistic dispatch before server confirmation
- [ ] **OPT-02**: Snippet reducer deduplicates optimistic entries using content-fingerprint matching (mirrors question pattern)
- [ ] **OPT-03**: Failed snippet push rolls back optimistic entry and restores input content

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

- [ ] **SHIKI-01**: Host input syntax preview renders client-side using Shiki core with JavaScript regex engine
- [ ] **SHIKI-02**: Language grammars load lazily via dynamic import (only languages in SUPPORTED_LANGUAGES)
- [ ] **SHIKI-03**: Shiki bundle contribution stays under 15kB gzipped (fine-grained imports, no full bundle)
- [ ] **SHIKI-04**: `renderHighlight` Server Action removed after client-side migration
- [ ] **SHIKI-05**: Language auto-detection rewritten with stricter heuristics — plain text defaults to "text", URLs not misidentified as YAML, casual text not misidentified as JavaScript; only assigns language when confidence is high (multiple signals required)
- [ ] **SHIKI-06**: Host can manually override detected language via a dropdown selector (SUPPORTED_LANGUAGES list) when auto-detection is wrong
- [ ] **SHIKI-07**: Host input clears cleanly after push — no residual "selected text" visual artifact from the transparent textarea/backdrop overlay

## v2.1 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Bundle Optimization

- **BUNDLE-01**: Replace aws-amplify with lighter AppSync WebSocket client (eliminate 68kB)
- **BUNDLE-02**: Host mutations moved client-side after dedicated security review

### Monitoring

- **MON-01**: Sentry error tracking integration (deferred from v1.1)

### Accessibility

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
| OPT-01      | Phase 16 | Pending  |
| OPT-02      | Phase 16 | Pending  |
| OPT-03      | Phase 16 | Pending  |
| UX-01       | Phase 14 | Complete |
| UX-02       | Phase 14 | Complete |
| SHIKI-01    | Phase 16 | Pending  |
| SHIKI-02    | Phase 16 | Pending  |
| SHIKI-03    | Phase 16 | Pending  |
| SHIKI-04    | Phase 16 | Pending  |
| SHIKI-05    | Phase 16 | Pending  |
| SHIKI-06    | Phase 16 | Pending  |
| SHIKI-07    | Phase 16 | Pending  |
| URL-01      | Phase 14 | Complete |
| URL-02      | Phase 14 | Complete |
| URL-03      | Phase 14 | Complete |
| URL-04      | Phase 14 | Complete |
| URL-05      | Phase 14 | Complete |
| URL-06      | Phase 14 | Complete |
| URL-07      | Phase 14 | Complete |
| URL-08      | Phase 14 | Complete |

**Coverage:**

- v2.0 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---

_Requirements defined: 2026-03-17_
_Last updated: 2026-03-17 after roadmap creation (phases 14-16)_
