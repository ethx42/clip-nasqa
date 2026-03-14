# Requirements: Nasqa Live

**Defined:** 2026-03-13
**Core Value:** The live clipboard and Q&A must work in real-time with sub-200ms latency across all connected devices

## v1 Requirements

### Session

- [x] **SESS-01**: User can create a session by entering a title (max 50 chars), receiving a slug (kebab-case) and hostSecret (UUIDv4)
- [x] **SESS-02**: Host secret is displayed on the creation page for copying before navigating away
- [x] **SESS-03**: Host secret is hashed (SHA-256) before storage in DynamoDB; raw secret returned once
- [x] **SESS-04**: Host URL uses hash fragment (`#secret=...`) to avoid server log leakage
- [x] **SESS-05**: QR code is generated for the session URL so participants can scan to join
- [x] **SESS-06**: All records (Session, Snippet, Question, Reply) have expiresAt TTL (current epoch + 86400)
- [x] **SESS-07**: Read paths filter expired items at application layer (DynamoDB TTL can delay up to 48h)

### Clipboard

- [x] **CLIP-01**: Host can push text snippets to the live clipboard feed
- [x] **CLIP-02**: Host can push code snippets with a language attribute
- [x] **CLIP-03**: Code snippets are syntax-highlighted using Shiki (server-side rendering only, never in client bundle)
- [x] **CLIP-04**: Shiki supports dual themes (light/dark) via CSS variables to prevent layout shift on theme toggle
- [x] **CLIP-05**: Clipboard feed displays in reverse-chronological order with the latest snippet as the "Hero"
- [x] **CLIP-06**: Host can delete individual snippets (authenticated by hostSecret)
- [x] **CLIP-07**: Host can clear the entire clipboard (authenticated by hostSecret)

### Q&A

- [x] **QA-01**: Participant can submit a question anonymously (max 500 chars)
- [x] **QA-02**: Participant can upvote questions; votes use DynamoDB atomic increments (ADD)
- [x] **QA-03**: Client tracks votes in localStorage to prevent UI-level double-voting
- [x] **QA-04**: Questions display sorted by upvote count
- [x] **QA-05**: Host or participant can reply to a question (one-level deep threading only)
- [x] **QA-06**: Speaker replies are visually distinct with a "Speaker" badge and emerald border
- [x] **QA-07**: Host can toggle isFocused on a question, pinning it to the top of all participants' views
- [x] **QA-08**: Focused question displays with a pulsing glow animation

### Moderation

- [x] **MOD-01**: Each participant is assigned a device fingerprint (localStorage UUIDv4 token) on first visit
- [x] **MOD-02**: Host can instantly ban any question or comment (content hidden for all participants)
- [x] **MOD-03**: Host can permanently ban a participant by device fingerprint (blocked from posting)
- [x] **MOD-04**: Participants can thumbs-down a question/comment
- [x] **MOD-05**: Content receiving thumbs-down from >= 50% of connected audience is auto-hidden
- [x] **MOD-06**: Participant with 3 banned posts (by audience consensus or host action) is auto-blocked from posting

### Identity

- [x] **IDENT-01**: Participants can optionally provide a display name and email
- [x] **IDENT-02**: Display name appears next to participant's questions and comments
- [x] **IDENT-03**: Email is stored but never displayed publicly

### UI/UX

- [x] **UI-01**: Dark mode theme: Background Zinc-950, Text Zinc-50, Borders Zinc-800
- [x] **UI-02**: Light mode theme: Background White, Text Zinc-900, Borders Zinc-200
- [x] **UI-03**: Accent color Emerald-500 for active/live elements
- [x] **UI-04**: Theme toggle via next-themes with no layout shift
- [x] **UI-05**: Marketing landing page explaining Nasqa Live with CTA to create session

### i18n

- [x] **I18N-01**: UI labels translated using next-intl (en, es, pt)
- [x] **I18N-02**: Locale-based routing via middleware (e.g., /en/live/myslug)
- [x] **I18N-03**: Default locale is browser-detected, falling back to en
- [x] **I18N-04**: Translation covers UI chrome only, not user-generated content
- [x] **I18N-05**: All translation keys reside in /messages/*.json

### Infrastructure

- [x] **INFRA-01**: DynamoDB single-table design (PK: SESSION#slug, SK: METADATA | SNIPPET# | QUESTION# | REPLY#)
- [x] **INFRA-02**: AppSync WebSocket subscriptions via single union-type SessionUpdate channel per session
- [x] **INFRA-03**: AppSync subscription validates non-null sessionSlug to prevent cross-session leakage
- [x] **INFRA-04**: SST Ion IaC: `sst deploy` provisions all AWS resources without manual intervention
- [x] **INFRA-05**: Rate limiting: host 10 snippets/min, public 3 questions/min
- [x] **INFRA-06**: Optimistic UI with < 100ms internal state updates
- [x] **INFRA-07**: Global broadcast latency < 200ms
- [x] **INFRA-08**: Initial JS payload < 80kB gzipped (Next.js Server Components for session shell)
- [x] **INFRA-09**: ULID for sortable DynamoDB sort keys (reverse-chronological feeds)

## v2 Requirements

### Engagement

- **ENG-01**: Polls (multiple choice, word cloud)
- **ENG-02**: Emoji reactions on snippets
- **ENG-03**: Session analytics (question count, participation rate)

### Export

- **EXP-01**: Host can export session Q&A as markdown before expiry
- **EXP-02**: Host can extend session TTL beyond 24h

### Identity

- **IDENT-04**: Gravatar integration from participant email
- **IDENT-05**: OAuth sign-in for hosts (persistent sessions across devices)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / persistent login | Sessions are ephemeral by design |
| Translation of user-generated content | i18n covers UI chrome only |
| Participant snippet posting | Clipboard is host-only to keep feed curated |
| Session persistence beyond 24h (v1) | TTL is a feature, not a limitation |
| Mobile native apps | Web-first, responsive design |
| Real-time chat | Dilutes Q&A focus, adds complexity |
| Slide control / presentation sync | Out of scope — Nasqa is a companion tool |
| Nested threads (> 1 level) | One-level replies keep UI clean |
| Video/audio content | Storage/bandwidth costs disproportionate to value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESS-01 | Phase 2 | Complete |
| SESS-02 | Phase 2 | Complete |
| SESS-03 | Phase 2 | Complete |
| SESS-04 | Phase 2 | Complete |
| SESS-05 | Phase 2 | Complete |
| SESS-06 | Phase 2 | Complete |
| SESS-07 | Phase 2 | Complete |
| CLIP-01 | Phase 3 | Complete |
| CLIP-02 | Phase 3 | Complete |
| CLIP-03 | Phase 3 | Complete |
| CLIP-04 | Phase 3 | Complete |
| CLIP-05 | Phase 3 | Complete |
| CLIP-06 | Phase 3 | Complete |
| CLIP-07 | Phase 3 | Complete |
| QA-01 | Phase 3 | Complete |
| QA-02 | Phase 3 | Complete |
| QA-03 | Phase 3 | Complete |
| QA-04 | Phase 3 | Complete |
| QA-05 | Phase 3 | Complete |
| QA-06 | Phase 3 | Complete |
| QA-07 | Phase 3 | Complete |
| QA-08 | Phase 3 | Complete |
| MOD-01 | Phase 4 | Complete |
| MOD-02 | Phase 4 | Complete |
| MOD-03 | Phase 4 | Complete |
| MOD-04 | Phase 4 | Complete |
| MOD-05 | Phase 4 | Complete |
| MOD-06 | Phase 4 | Complete |
| IDENT-01 | Phase 4 | Complete |
| IDENT-02 | Phase 4 | Complete |
| IDENT-03 | Phase 4 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| UI-05 | Phase 2 | Complete |
| I18N-01 | Phase 4 | Complete |
| I18N-02 | Phase 4 | Complete |
| I18N-03 | Phase 4 | Complete |
| I18N-04 | Phase 4 | Complete |
| I18N-05 | Phase 4 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 3 | Complete |
| INFRA-03 | Phase 3 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 4 | Complete |
| INFRA-06 | Phase 3 | Complete |
| INFRA-07 | Phase 3 | Complete |
| INFRA-08 | Phase 3 | Complete |
| INFRA-09 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
