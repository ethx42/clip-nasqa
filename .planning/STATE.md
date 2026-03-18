# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.0 Performance & Instant Operations

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-17 — Milestone v2.0 started

## Performance Metrics

**Velocity:**

- Total plans completed: 37 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6)
- Average duration: 5 min
- Total execution time: ~2.5 hours

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [11-02] Used `useRef + useEffect` for questionsRef (not experimental `useEffectEvent`) — compatible with current React version, same correctness for async rollbacks
- [11-02] `authorName` typed as `string | undefined` in UseSessionMutationsParams to match `useIdentity` return type without forced non-null assertions at call sites
- [Phase 11]: Single formatRelativeTime utility with two overloads: short-token for Server Components, i18n-aware for Client Components; week bucket added at >=7d per user decision
- [Phase 12-02]: SnippetCard extracted as standalone 'use client' component with hero/compact variant prop; replaces both inline definition and legacy server component
- [Phase 12-02]: snippet-hero.tsx deleted — had zero importers; hero rendering now handled by SnippetCard variant='hero'
- [12-01]: Debounce stays in QAPanel — sortQuestions receives synthetic Question objects with debounced upvoteCount/isFocused merged in by the consumer; utility remains a pure function with zero React dependency
- [12-03]: AnimatePresence mode=wait with single string key (banned/hidden/normal) avoids compound key issue; facade pattern in question-card.tsx preserves backward compatibility for all consumers
- [13-01]: Upvote active state uses solid indigo bg (brand palette) not amber; downvote active uses muted gray (secondary action, not destructive); aria-pressed on toggle buttons for screen reader state announcement
- [13-02]: Identity row conditionally rendered when fingerprint present (avoids phantom spacing on hydration edge cases); border-l-only accent on own questions — no tint, no badge

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-17
Stopped at: Milestone v2.0 initialized — defining requirements
Resume at: Continue requirements definition
