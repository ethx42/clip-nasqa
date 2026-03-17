# Nasqa Live

## What This Is

A real-time session tool for speakers and presenters. The host creates a temporary live session where they push code snippets and text to a shared clipboard, while the audience asks questions, upvotes, and interacts — all anonymous, no accounts, no friction. Sessions auto-expire after 24 hours. Production-hardened with quality gates, CI/CD, error handling, SEO, and accessibility.

## Core Value

The live clipboard and Q&A must work in real-time with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails.

## Requirements

### Validated

- ✓ Marketing landing page with CTA to create session — v1.0
- ✓ Anonymous session creation with title, slug, hostSecret — v1.0
- ✓ Host secret SHA-256 hashed, displayed once on creation — v1.0
- ✓ Host URL with hash fragment secret — v1.0
- ✓ QR code for participant scanning — v1.0
- ✓ 24-hour TTL auto-cleanup — v1.0
- ✓ Real-time clipboard with Shiki dual-theme highlighting (SSR) — v1.0
- ✓ Q&A with upvoting, reply threading, speaker badges — v1.0
- ✓ Community moderation (50% threshold) + host superuser + auto-ban — v1.0
- ✓ Device fingerprint identity tracking — v1.0
- ✓ i18n (en/es/pt) with locale-prefixed routing — v1.0
- ✓ Theme system (dark/light) with no layout shift — v1.0
- ✓ Optimistic UI < 100ms, broadcast < 200ms — v1.0
- ✓ Rate limiting (host 10/min, participant 3/min) — v1.0
- ✓ SST Ion IaC with `sst deploy` — v1.0
- ✓ Pre-commit hooks (Husky + lint-staged + Prettier + TypeScript strict) — v1.1
- ✓ 74-test Vitest suite (schemas, resolvers, components) — v1.1
- ✓ GitHub Actions CI with 4 parallel jobs gating every PR — v1.1
- ✓ Error boundaries (global-error, error, not-found) with structured errors — v1.1
- ✓ safeAction network resilience wrapper on all 15 server action call sites — v1.1
- ✓ Pino structured JSON logging in Lambda resolvers — v1.1
- ✓ SEO: robots.txt, sitemap.xml, dynamic OG images, generateMetadata, JSON-LD — v1.1
- ✓ Accessibility: semantic landmarks, ARIA labels, skip-to-content, aria-live — v1.1
- ✓ Reactions backend: EMOJI_PALETTE, handleReact resolver, rate limiting, ban check — v1.2 (Phase 9)

### Active

- [ ] ReactionBar component with optimistic toggle, ARIA, 44px touch targets (RXN-10-13)
- [ ] Shared `formatRelativeTime` + `useSessionMutations` hook extraction (STRUC-01, STRUC-02, STRUC-06)
- [ ] SnippetCard extraction, QAPanel sort dedup, QuestionCard variants (STRUC-03-05)
- [ ] Vote button fill states, identity chip, own-question indicator (UXINT-01-07)
- [ ] ARIA tablist on mobile tabs, aria-live on NewContentBanner, aria-pressed on votes (A11Y-04-07)

### Out of Scope

- User accounts or persistent login — sessions are ephemeral by design
- Translation of user-generated content — i18n covers UI chrome only
- Participant snippet posting — clipboard is host-only
- Session persistence beyond 24 hours — TTL is a feature, not a limitation
- Mobile native apps — web-first, responsive design
- Emoji picker library — bundle budget (80kB); fixed 6-emoji palette prevents abuse
- "Who reacted" tooltip — privacy concern for anonymous sessions
- Reactions affecting sort order — upvotes handle ranking; reactions are sentiment only
- E2E tests on every PR — 5-15 min; run on main only
- WCAG AAA — Level AA is realistic; AAA conflicts with real-time UI

## Current Milestone: v1.2 Reactions

**Goal:** Add emoji reactions to Questions and Replies — lightweight sentiment beyond upvotes.

**Status:** Phase 9 (backend) complete. Phase 10 (frontend UI) next.

## Future Milestone: v1.3 Participant & Host UX Refactor

**Goal:** Decompose monolithic components, eliminate duplication, improve accessibility and interaction design.

## Context

- **Stack**: Next.js 16 + SST Ion (AWS) + DynamoDB + AppSync
- **Codebase**: 8,056 LOC TypeScript across 3 packages (core, frontend, functions)
- **Test suite**: 98 tests passing (74 v1.1 + 25 v1.2 reaction tests)
- **Scale target**: 50-500 concurrent participants per session
- **Auth model**: No accounts. Host via hashed secret. Participants via device fingerprint
- **Quality gates**: Pre-commit lint+format+typecheck, CI on every PR
- **Known tech debt**: Bundle size 156.7kB (aws-amplify ~68kB), pre-commit skips frontend typecheck, no tests for error boundaries/SEO

## Constraints

- **Tech stack**: Next.js 16 + SST Ion + DynamoDB + AppSync — non-negotiable
- **TTL**: All data expires in 24 hours — no archival, no export
- **Bundle**: < 80kB gzipped initial JS payload (currently exceeded by aws-amplify)
- **Latency**: < 200ms for real-time broadcast across all clients
- **Locales**: en, es, pt only

## Key Decisions

| Decision                                    | Rationale                                                           | Outcome                                            |
| ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Single-table DynamoDB                       | Minimize read latency for session-scoped data                       | ✓ Good — single scan serves entire session         |
| Single AppSync subscription channel         | Reduces connection overhead; union type keeps it typed              | ✓ Good — reactions reuse same channel              |
| Device fingerprint over IP                  | Conference WiFi would cause false positives                         | ✓ Good — works across shared networks              |
| Host-only clipboard                         | Keeps feed curated and relevant to presentation                     | ✓ Good                                             |
| Shiki dual-theme SSR                        | No layout shift on theme toggle, no client JS                       | ✓ Good — Shiki absent from client bundle           |
| 50% downvote threshold                      | Balance community moderation without easy censorship                | ✓ Good                                             |
| aws-amplify for AppSync client              | Official SDK for WebSocket subscriptions                            | ⚠️ Revisit — 68kB gzipped exceeds budget alone     |
| Static OG image → dynamic per-session       | Phase 8 decision: brand consistency first, then added dynamic route | ✓ Good — both exist now                            |
| safeAction wrapper                          | Network failures need graceful handling                             | ✓ Good — 15 call sites protected                   |
| Pino at module level in Lambda              | Avoid re-init on warm starts                                        | ✓ Good — structured logs in CloudWatch             |
| EMOJI_PALETTE as single source of truth     | Zod + TypeScript + runtime all derived from one array               | ✓ Good — extending palette auto-updates everything |
| Separate rate-limit namespace for reactions | Don't consume question submission budget                            | ✓ Good — `reaction#` prefix isolates limits        |
| continue-on-error for bundle-size CI job    | aws-amplify exceeds budget; can't block PRs                         | ⚠️ Revisit — remove when amplify replaced          |
| noValidate on landing form                  | Route all validation through server action for unified toast UX     | ✓ Good                                             |

---

_Last updated: 2026-03-17 after v1.1 Enterprise Hardening milestone_
