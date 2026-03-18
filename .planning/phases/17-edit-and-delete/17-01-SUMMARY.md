---
phase: 17-edit-and-delete
plan: "01"
subsystem: backend
tags: [graphql, dynamodb, lambda, resolvers, auth, soft-delete]
dependency_graph:
  requires: []
  provides:
    - editQuestion mutation (GraphQL + Lambda)
    - deleteQuestion mutation (GraphQL + Lambda)
    - editReply mutation (GraphQL + Lambda)
    - deleteReply mutation (GraphQL + Lambda)
    - editSnippet mutation (GraphQL + Lambda)
    - QUESTION_EDITED, QUESTION_DELETED, REPLY_EDITED, REPLY_DELETED, SNIPPET_EDITED event types
    - editedAt field on Question, Reply, Snippet types
    - soft-delete filter in getSessionData
  affects:
    - packages/frontend (plans 02 and 03 depend on this backend contract)
tech_stack:
  added: []
  patterns:
    - shared verifyHostSecret in resolvers/shared.ts (single source of truth)
    - dual-path auth: fingerprint+5min-window for participants, verifyHostSecret for host
    - soft-delete via deletedAt attribute (not hard delete)
    - ExpressionAttributeNames to alias 'text' reserved word in DynamoDB
key_files:
  created:
    - packages/functions/src/resolvers/shared.ts
  modified:
    - packages/core/src/types.ts
    - infra/schema.graphql
    - sst.config.ts
    - packages/functions/src/resolvers/index.ts
    - packages/functions/src/resolvers/qa.ts
    - packages/functions/src/resolvers/clipboard.ts
decisions:
  - verifyHostSecret extracted to shared.ts — was duplicated in qa.ts and clipboard.ts; now single definition imported by both plus new resolvers
  - soft-delete chosen over hard delete — items survive TTL cleanup, deletion events stable, audit trail preserved; filter added to getSessionData TTL check
  - dual-path auth in single mutation — one mutation accepts either fingerprint or hostSecretHash; host path skips time window; participant path enforces both ownership and 300s window
  - editSnippet has no time window — host is superuser for snippets per EDIT-09; no participant path for snippet edit
metrics:
  duration: "3 minutes"
  tasks_completed: 2
  files_modified: 6
  files_created: 1
  completed_date: "2026-03-18"
---

# Phase 17 Plan 01: Backend Infrastructure for Edit and Delete Summary

Backend contract established: 5 GraphQL mutations with Lambda resolvers enforcing fingerprint ownership, 5-minute author window, and host superuser bypass via shared verifyHostSecret; soft-deleted items filtered from getSessionData; editedAt timestamps mapped in session data projection.

## Tasks Completed

| Task | Name                                                                        | Commit  | Key Files                                      |
| ---- | --------------------------------------------------------------------------- | ------- | ---------------------------------------------- |
| 1    | Types, GraphQL schema, and SST config for edit/delete                       | bf40bdf | types.ts, schema.graphql, sst.config.ts        |
| 2    | Lambda resolvers — edit/delete with auth enforcement and soft-delete filter | 890f50c | shared.ts (new), qa.ts, clipboard.ts, index.ts |

## What Was Built

### Task 1: Type System, Schema, and Infrastructure Registration

**packages/core/src/types.ts:**

- Added `editedAt?: number` and `deletedAt?: number` to `QuestionItem`, `ReplyItem`, and `SnippetItem` DynamoDB interfaces
- Added `authorName?: string` to `ReplyItem` (was missing per research Pitfall 8 — it was written to DynamoDB in addReply but not declared in the TypeScript interface)
- Added `editedAt?: number` to application-level `Question`, `Reply`, and `Snippet` interfaces
- Added 5 new values to `SessionEventType` enum: `QUESTION_EDITED`, `QUESTION_DELETED`, `REPLY_EDITED`, `REPLY_DELETED`, `SNIPPET_EDITED`
- Added 5 new mutation argument interfaces: `EditQuestionArgs`, `DeleteQuestionArgs`, `EditReplyArgs`, `DeleteReplyArgs`, `EditSnippetArgs`

**infra/schema.graphql:**

- Added `editedAt: AWSTimestamp` to `Question`, `Reply`, and `Snippet` types
- Added 5 new event types to `SessionEventType` enum
- Added 5 new mutations with exact signatures from research
- Extended `@aws_subscribe(mutations: [...])` list to include all 5 new mutation names

**sst.config.ts:**

- Registered 5 new `api.addResolver` calls for the new mutations (all pointing to `lambdaDS`)

### Task 2: Lambda Resolver Implementation

**packages/functions/src/resolvers/shared.ts (new):**

- Extracted `verifyHostSecret` from qa.ts and clipboard.ts (identical duplicates)
- Single exported function imported by qa.ts, clipboard.ts, and any future resolvers

**packages/functions/src/resolvers/qa.ts:**

- Added `editQuestion`: GetCommand to fetch item, dual-path auth (fingerprint+300s OR verifyHostSecret), UpdateCommand with `ExpressionAttributeNames: { "#text": "text" }` to avoid DynamoDB reserved word, returns `QUESTION_EDITED` event
- Added `deleteQuestion`: Same dual-path auth, UpdateCommand SET `deletedAt`, returns `QUESTION_DELETED` event
- Added `editReply`: Same pattern as editQuestion targeting `REPLY#replyId` SK, returns `REPLY_EDITED` event
- Added `deleteReply`: Same pattern as deleteQuestion targeting `REPLY#replyId` SK, returns `REPLY_DELETED` event
- Removed local `verifyHostSecret` definition; imports from `./shared`

**packages/functions/src/resolvers/clipboard.ts:**

- Added `editSnippet`: verifyHostSecret (host-only, no time window), conditional language update, UpdateCommand with `#content` alias (content is not a reserved word but aliased for consistency), returns `SNIPPET_EDITED` event
- Removed local `verifyHostSecret` definition; imports from `./shared`

**packages/functions/src/resolvers/index.ts:**

- Extended TTL filter to also exclude `deletedAt` items: `(!item.TTL || item.TTL > now) && !item.deletedAt`
- Added `editedAt: item.editedAt ?? null` to snippets, questions, and replies mappings in `getSessionData`
- Added 5 new imports from qa.ts and clipboard.ts
- Added 5 new cases to the handler switch statement

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes for both `packages/core` and `packages/functions`
- GraphQL schema has exactly 5 new mutations and 5 new event types
- `@aws_subscribe` list includes all 5 new mutation names
- `sst.config.ts` has 5 new `addResolver` calls
- `getSessionData` filters `deletedAt` items and maps `editedAt` for snippets, questions, and replies
- `verifyHostSecret` defined in one shared location (`resolvers/shared.ts`), imported by `qa.ts` and `clipboard.ts`
- No local `verifyHostSecret` definitions remain in qa.ts or clipboard.ts

## Self-Check: PASSED

All created/modified files verified to exist. Both commits confirmed in git log.
