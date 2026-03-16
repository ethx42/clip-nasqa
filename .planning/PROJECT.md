# Nasqa Live

## What This Is

A real-time session tool for speakers and presenters. The host creates a temporary live session where they push code snippets and text to a shared clipboard, while the audience asks questions, upvotes, and interacts — all anonymous, no accounts, no friction. Sessions auto-expire after 24 hours.

## Core Value

The live clipboard and Q&A must work in real-time with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Marketing landing page explaining Nasqa Live with CTA to create session
- [ ] Anonymous session creation with title input (max 50 chars), slug generation, and UUIDv4 hostSecret
- [ ] Host secret displayed on creation page for copying; hashed (SHA-256) before storage
- [ ] Host URL with embedded secret as query param for bookmark-based re-entry
- [ ] QR code generation for participants to scan and join
- [ ] 24-hour TTL auto-cleanup on all records (Session, Snippet, Question, Reply)
- [ ] Reverse-chronological snippet feed with "Hero" (latest) prominence
- [ ] Host-only snippet posting (text and code with language attribute)
- [ ] Shiki syntax highlighting with dual-theme support (light/dark, no layout shift)
- [ ] Host can delete individual snippets or clear entire clipboard (verified by hostSecret)
- [ ] Anonymous question submission (max 500 chars)
- [ ] Real-time upvoting with DynamoDB atomic increments; localStorage prevents double-voting
- [ ] Community moderation: thumbs-down votes >= 50% of connected audience auto-hides content
- [ ] Auto-ban: 3 banned posts (by audience or host) blocks participant from posting
- [ ] Host superuser: can instantly ban content or permanently ban participants (by device fingerprint)
- [ ] Device fingerprint (localStorage token) for anonymous participant identity tracking
- [ ] One-level deep reply threading; speaker replies visually distinct (emerald border + "Speaker" badge)
- [ ] Focus state: host toggles isFocused on a question, pinning it with pulsing glow animation
- [ ] Optional participant identity: name displayed on posts, email stored but not shown
- [ ] DynamoDB single-table design (PK: SESSION#slug, SK patterns: METADATA, SNIPPET#, QUESTION#, REPLY#)
- [ ] AppSync WebSocket subscriptions via single union-type SessionUpdate channel per session
- [ ] i18n with next-intl (en, es, pt) — UI labels only, not user-generated content
- [ ] Locale-based routing via middleware (e.g., /en/live/myslug), browser-detected default with en fallback
- [ ] Theme system via next-themes (Dark: Zinc-950/Zinc-50/Zinc-800, Light: White/Zinc-900/Zinc-200, Accent: Emerald-500)
- [ ] Optimistic UI with < 100ms internal state updates, < 200ms global broadcast
- [ ] Initial JS payload < 80kB gzipped; Next.js Server Components for session shell
- [ ] Rate limiting: host 10 snippets/min, public 3 questions/min
- [ ] IaC via SST Ion: `sst deploy` provisions all AWS resources without manual intervention

### Out of Scope

- User accounts or persistent login — sessions are ephemeral by design
- Translation of user-generated content — i18n covers UI chrome only
- Participant snippet posting — clipboard is host-only
- Session persistence beyond 24 hours — TTL is a feature, not a limitation
- Mobile native apps — web-first, responsive design

## Current Milestone: v1.1 Enterprise Hardening

**Goal:** Harden the codebase for production reliability and developer experience — testing, CI/CD, error handling, monitoring, code quality gates, accessibility, and SEO.

**Target features:**

- Testing infrastructure (Vitest + React Testing Library)
- CI/CD pipeline (GitHub Actions: lint, typecheck, test, deploy)
- Error boundaries (error.tsx, graceful fallbacks)
- Monitoring/observability (Sentry error tracking, structured logging)
- Pre-commit hooks (Husky + lint-staged)
- Dynamic SEO (Open Graph, per-session metadata)
- Accessibility improvements (ARIA labels, keyboard navigation, semantic HTML)

## Next Milestone: v1.2 Reactions

**Goal:** Add emoji reactions to Questions and Replies so participants can express sentiment beyond upvotes — lightweight engagement signals that complement the existing voting system without affecting sort order.

**Target features:**

- Fixed 6-emoji palette (👍 ❤️ 🎉 😂 🤔 👀) — no emoji picker (bundle budget)
- Reactions on Questions and Replies (not Snippets)
- DynamoDB atomic dedup (same Set pattern as existing votes)
- Real-time propagation via existing SessionUpdate subscription
- Rate limiting and ban enforcement for reactions
- Optimistic UI with same patterns as vote system

## Future Milestone: v1.3 Participant & Host UX Refactor

**Goal:** Decompose monolithic session components, eliminate code duplication, and implement interaction improvements across both participant and host views — making the interface honest, accessible, and structurally sound.

**Target features:**

- Extract `useSessionMutations` hook from SessionLivePage (270-line God Orchestrator → 40-line composition root)
- Shared `formatRelativeTime` utility (deduplicate from 3 files)
- Extract `SnippetCard` to own file, memoize `repliesByQuestion` grouping
- Remove duplicate sorting from QAPanel (accept pre-sorted, own only debounced visual stability)
- Split `QuestionCard` into state-specific variants (normal, banned, hidden)
- Identity chip in QAInput (avatar + name, click to edit)
- ARIA tablist semantics for SessionShell mobile tabs
- Auto-expand replies for focused questions, merge reply action into reply section
- Vote button animation + mutual-exclusion visual feedback
- Enhanced empty states with contextual copy
- Visual "own question" indicator (left border)
- `aria-live` on NewContentBanner, `active:scale-95` on vote buttons

## Context

- **Stack**: Next.js 16 + SST Ion (AWS) + DynamoDB + AppSync
- **Existing codebase**: SST project scaffolding already in place (see `.planning/codebase/`)
- **Scale target**: 50-500 concurrent participants per session
- **Auth model**: No user accounts. Host authenticated via hashed secret. Participants identified by device fingerprint (localStorage token)
- **Moderation model**: Dual-layer — community voting (50% threshold) + host superuser powers. 3-strike auto-ban for participants
- **Real-time protocol**: AppSync GraphQL subscriptions over WebSocket, single channel per session with union-type events

## Constraints

- **Tech stack**: Next.js 16 + SST Ion + DynamoDB + AppSync — non-negotiable
- **TTL**: All data expires in 24 hours — no archival, no export
- **Bundle**: < 80kB gzipped initial JS payload
- **Latency**: < 200ms for real-time broadcast across all clients
- **Locales**: en, es, pt only for v1

## Key Decisions

| Decision                            | Rationale                                                                      | Outcome   |
| ----------------------------------- | ------------------------------------------------------------------------------ | --------- |
| Single-table DynamoDB               | Minimize read latency, simplify access patterns for session-scoped data        | — Pending |
| Single AppSync subscription channel | Reduces connection overhead; union type keeps it typed                         | — Pending |
| Device fingerprint over IP          | Shared networks (conference WiFi) would cause false positives with IP tracking | — Pending |
| Host-only clipboard                 | Keeps the feed curated and relevant to the presentation                        | — Pending |
| Shiki dual-theme                    | Prevents layout shift on theme toggle, better UX than CSS-only approach        | — Pending |
| 50% downvote threshold              | Balances community moderation power without making it too easy to censor       | — Pending |

---

_Last updated: 2026-03-16 after milestone v1.3 definition_
