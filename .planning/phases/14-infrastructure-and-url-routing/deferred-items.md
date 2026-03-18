# Phase 14 — Deferred Items

## Pre-existing Out-of-Scope Issues

### Partial sessionSlug → sessionCode rename in packages/functions

**Discovered during:** 14-01 final docs commit (pre-commit hook typecheck)
**Scope:** Out of scope for 14-01 — these changes are intended for Plan 14-02 (URL routing)
**Status:** Unstaged working tree changes, not blocking any 14-01 deliverables

**Affected files:**

- `packages/functions/src/resolvers/qa.ts`
- `packages/functions/src/resolvers/moderation.ts`
- `packages/functions/src/resolvers/reactions.ts`
- `packages/functions/src/resolvers/clipboard.ts`
- `packages/core/src/schemas.ts`
- `packages/core/src/types.ts`
- `packages/core/src/__tests__/schemas.test.ts`
- `infra/schema.graphql`
- `infra/resolvers/subscription-onSessionUpdate.js`

**Nature:** Partial rename of `sessionSlug` → `sessionCode`/`sessionCode` in Lambda resolver args and types — the rename is incomplete, causing TypeScript errors in `packages/functions`.

**Resolution:** These changes are the subject of Plan 14-02 (URL routing). Plan 14-02 should pick up these unstaged changes and complete the rename atomically.
