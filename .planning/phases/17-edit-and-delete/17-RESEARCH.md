# Phase 17: Edit & Delete - Research

**Researched:** 2026-03-18
**Domain:** Real-time edit/delete mutations — DynamoDB schema extension, GraphQL mutations, Lambda resolver enforcement, frontend inline editing UI with 5-minute window and host superuser, real-time broadcast via AppSync subscriptions
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                     | Research Support                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EDIT-01 | Author can edit their own question within 5 minutes of posting (createdAt + 5min window)        | Lambda: `UpdateCommand` with `ConditionExpression` on `createdAt`; fingerprint ownership check                                                                      |
| EDIT-02 | Author can edit their own reply within 5 minutes of posting                                     | Same pattern as EDIT-01, target `REPLY#id` SK                                                                                                                       |
| EDIT-03 | Author can delete their own question within 5 minutes (soft-delete)                             | DynamoDB `UpdateCommand` SET `deletedAt = :now`; Lambda fingerprint + time-window guard                                                                             |
| EDIT-04 | Author can delete their own reply within 5 minutes (soft-delete)                                | Same pattern as EDIT-03, target `REPLY#id` SK                                                                                                                       |
| EDIT-05 | Host can edit any question or reply at any time (superuser)                                     | Lambda: `verifyHostSecret` bypasses time-window check; skip fingerprint match                                                                                       |
| EDIT-06 | Host can delete any question or reply at any time (superuser, soft-delete)                      | Same `verifyHostSecret` path; soft-delete with `deletedAt`                                                                                                          |
| EDIT-07 | Edited posts display an "edited" indicator with timestamp                                       | `editedAt` field on Question/Reply types; frontend renders badge in author row                                                                                      |
| EDIT-08 | Edits and deletes broadcast in real-time via AppSync subscription                               | New event types (`QUESTION_EDITED`, `REPLY_EDITED`, `QUESTION_DELETED`, `REPLY_DELETED`) added to `SessionEventType`; subscription `@aws_subscribe` list updated    |
| EDIT-09 | Host can edit clipboard snippets (content and/or language)                                      | New `editSnippet` mutation; Lambda resolver with `verifyHostSecret`; `UpdateCommand` on `SNIPPET#id` SK                                                             |
| EDIT-10 | Edited snippets display an "edited" indicator                                                   | `editedAt` on `SnippetItem`; SnippetCard renders badge                                                                                                              |
| EDIT-11 | DynamoDB schema supports edit/delete fields without migration                                   | DynamoDB is schemaless — add `editedAt`, `deletedAt`, `editedContent` as optional attributes on existing items; `getSessionData` must filter out soft-deleted items |
| EDIT-12 | GraphQL schema adds editQuestion, editReply, deleteQuestion, deleteReply, editSnippet mutations | `infra/schema.graphql` additions; `SessionEventType` enum additions; `sst.config.ts` resolver registrations                                                         |
| EDIT-13 | Lambda resolvers enforce 5-minute author window and host superuser bypass                       | Time-window: `Date.now()/1000 - item.createdAt <= 300`; bypass: `hostSecretHash` param present → call `verifyHostSecret`                                            |

</phase_requirements>

---

## Summary

Phase 17 adds edit and delete capabilities across all three content types: questions, replies, and clipboard snippets. The architecture follows the established pattern in the codebase precisely — all mutations flow through the single Lambda resolver (`packages/functions/src/resolvers/index.ts`), broadcast `SessionUpdate` events via AppSync subscriptions, and are handled by the `useSessionState` reducer on the frontend.

The backend work is well-defined: DynamoDB is schemaless so no migration is needed — three new optional attributes (`editedAt`, `deletedAt`, `editedContent`) are simply written to existing items via `UpdateCommand`. The GraphQL schema needs five new mutations and four new event types. The Lambda resolver gets two new authorization paths: a fingerprint + 5-minute-window check for participants, and a `verifyHostSecret` bypass for the host (the `verifyHostSecret` function already exists identically in both `qa.ts` and `clipboard.ts` — it should be extracted to `index.ts` or a shared file for Phase 17).

The frontend complexity is concentrated in the question and reply card components. The inline edit UX already exists in `SnippetCard` (edit textarea, save/cancel buttons, edit-start/end callbacks) — that exact pattern should be replicated in `QuestionCardParticipant`, `QuestionCardHost`, and `ReplyList`. Soft-deleted items need to be filtered at data-load time (in `getSessionData`) and hidden reactively (via a new `QUESTION_DELETED`/`REPLY_DELETED` reducer action). The 5-minute window must be computed client-side for showing/hiding UI controls and enforced server-side in the Lambda resolver.

**Primary recommendation:** Follow the established SNIPPET_EDIT pattern in `SnippetCard` and `useHostSnippetPush` for all UI patterns; follow the `handleBanQuestion`/`restoreQuestion` resolver pattern for Lambda authorization; new event types broadcast real-time changes through the existing single `onSessionUpdate` subscription without any subscription changes needed beyond adding mutation names to `@aws_subscribe`.

---

## Standard Stack

### Core (already in project — no new dependencies)

| Library                 | Version  | Purpose                                                       | Why Standard                                          |
| ----------------------- | -------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `@aws-sdk/lib-dynamodb` | existing | `UpdateCommand` for edit/soft-delete writes                   | Already used across all resolvers                     |
| AppSync GraphQL         | existing | Schema-first mutations + subscription broadcast               | Project's real-time transport                         |
| `ulid`                  | existing | ID generation (already used in resolvers)                     | Consistent with project                               |
| `next-intl`             | existing | i18n strings for new UI states (edit, edited, delete confirm) | Already wired in all components                       |
| `@base-ui/react/dialog` | existing | Delete confirmation modal                                     | Already used in `QuestionCardHost` for ban confirm    |
| `framer-motion`         | existing | Animate edited/deleted state transitions                      | Already in question cards                             |
| `lucide-react`          | existing | `Pencil`, `Trash2`, `Check`, `X` icons                        | Already used in `SnippetCard`                         |
| `sonner`                | existing | Error toasts on mutation failure                              | Already in `useHostMutations` / `useSessionMutations` |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Structure Changes

```
packages/
├── core/src/
│   └── types.ts                         # Add editedAt, deletedAt, editedContent to interfaces
│                                        # Add QUESTION_EDITED, REPLY_EDITED, QUESTION_DELETED,
│                                        # REPLY_DELETED, SNIPPET_EDITED to SessionEventType
├── functions/src/resolvers/
│   ├── index.ts                         # Add cases for 5 new mutations; extract verifyHostSecret
│   ├── qa.ts                            # Add editQuestion, editReply, deleteQuestion, deleteReply
│   ├── clipboard.ts                     # Add editSnippet
│   └── __tests__/
│       └── edit-delete.test.ts          # New test file for edit/delete resolvers
├── frontend/src/
│   ├── lib/graphql/
│   │   └── mutations.ts                 # Add EDIT_QUESTION, EDIT_REPLY, DELETE_QUESTION,
│   │                                    # DELETE_REPLY, EDIT_SNIPPET
│   ├── actions/
│   │   ├── qa.ts (new or extend)        # deleteQuestion, deleteReply Server Actions (host path)
│   │   └── snippet.ts                   # editSnippet Server Action
│   ├── hooks/
│   │   ├── use-session-state.ts         # Add QUESTION_EDITED, REPLY_EDITED, QUESTION_DELETED,
│   │   │                                # REPLY_DELETED, SNIPPET_EDITED actions to reducer
│   │   ├── use-session-updates.ts       # Handle 4 new event types in subscription switch
│   │   ├── use-session-mutations.ts     # Add handleEditQuestion, handleEditReply,
│   │   │                                # handleDeleteQuestion, handleDeleteReply
│   │   └── use-host-mutations.ts        # Add handleEditAnyQuestion, handleEditAnyReply,
│   │                                    # handleDeleteAnyQuestion, handleDeleteAnyReply
│   ├── components/session/
│   │   ├── question-card-participant.tsx # Add inline edit UI + 5-min window button visibility
│   │   ├── question-card-host.tsx       # Add host superuser edit/delete buttons
│   │   ├── reply-list.tsx               # Add inline edit UI per reply (own + host)
│   │   └── snippet-card.tsx             # Add editedAt indicator badge; editSnippet for confirmed
infra/
└── schema.graphql                       # 5 new mutations + 4 new event types
```

### Pattern 1: Lambda Resolver — Author Window + Host Superuser

**What:** Every edit/delete resolver receives either `fingerprint` (participant path) or `hostSecretHash` (host path). If `hostSecretHash` is present, call `verifyHostSecret` and skip the time window. If `fingerprint` is present, verify ownership and enforce the 5-minute window.

**When to use:** All five new mutations.

**Example:**

```typescript
// packages/functions/src/resolvers/qa.ts
export async function editQuestion(args: EditQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, questionId, text, fingerprint, hostSecretHash } = args;

  // Fetch the item first to verify ownership and time window
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
    }),
  );

  if (!result.Item) throw new Error("Question not found");

  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);

  if (hostSecretHash) {
    // Host superuser path — verify host, no time restriction
    await verifyHostSecret(sessionCode, hostSecretHash);
  } else {
    // Participant path — verify fingerprint + 5-minute window
    if (item.fingerprint !== fingerprint) throw new Error("Unauthorized");
    if (now - (item.createdAt as number) > 300) throw new Error("EDIT_WINDOW_EXPIRED");
  }

  if (text.length > 500) throw new Error("Question text exceeds 500 character limit");

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
      UpdateExpression: "SET #text = :text, editedAt = :editedAt",
      ExpressionAttributeNames: { "#text": "text" },
      ExpressionAttributeValues: { ":text": text, ":editedAt": now },
    }),
  );

  return {
    eventType: "QUESTION_EDITED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ questionId, text, editedAt: now }),
  };
}
```

### Pattern 2: Soft Delete (not hard delete)

**What:** Requirements say "soft-delete." Write `deletedAt` timestamp to the DynamoDB item. The `getSessionData` Lambda query already filters on `TTL` — extend that filter to also exclude items where `deletedAt` is set. The subscription broadcasts `QUESTION_DELETED` / `REPLY_DELETED`, and the frontend reducer removes the item from state.

**Why soft-delete:** Allows the host to see deletion events, prevents ghost subscription events from reappearing (the item still exists but is filtered), and leaves an audit trail.

**DynamoDB filter in `getSessionData`:**

```typescript
// In getSessionData (index.ts), extend the TTL filter:
const items = (result.Items ?? []).filter(
  (item) => (!item.TTL || item.TTL > now) && !item.deletedAt,
);
```

### Pattern 3: Reducer Actions for New Events

**What:** The `useSessionState` reducer in `use-session-state.ts` needs four new action types that mirror existing patterns.

**Example:**

```typescript
// In SessionAction union (use-session-state.ts):
| { type: "QUESTION_EDITED"; payload: { questionId: string; text: string; editedAt: number } }
| { type: "QUESTION_DELETED"; payload: { questionId: string } }
| { type: "REPLY_EDITED"; payload: { replyId: string; text: string; editedAt: number } }
| { type: "REPLY_DELETED"; payload: { replyId: string } }
| { type: "SNIPPET_EDITED"; payload: { snippetId: string; content: string; language?: string; editedAt: number } }

// In reducer:
case "QUESTION_EDITED": {
  const { questionId, text, editedAt } = action.payload;
  return {
    ...state,
    questions: state.questions.map((q) =>
      q.id === questionId ? { ...q, text, editedAt } : q
    ),
  };
}
case "QUESTION_DELETED": {
  return {
    ...state,
    questions: state.questions.filter((q) => q.id !== action.payload.questionId),
  };
}
```

### Pattern 4: 5-Minute Window Client-Side Visibility

**What:** The edit/delete action buttons should only be visible to the author within the 5-minute window. Compute this from `question.createdAt` against `Date.now() / 1000`.

**When to use:** `QuestionCardParticipant`, `QuestionCardHost` (for own questions), and `ReplyList` (for own replies).

**Example:**

```typescript
// In question card / reply list:
const now = Math.floor(Date.now() / 1000);
const withinEditWindow = now - question.createdAt < 300; // 5 minutes = 300 seconds
const isOwn = question.fingerprint === fingerprint;
const canEdit = isOwn && withinEditWindow;
const isHost = !!hostSecretHash; // host can always edit
const showEditButton = canEdit || isHost;
```

**Critical:** The window computation is client-side for UI only. The Lambda resolver ALWAYS re-enforces the window server-side. Never trust the client for authorization.

**Timer concern:** If a user loads the page with 4 minutes remaining, the button must disappear at minute 5 without a page reload. Use a `useEffect` with a `setTimeout` to force a re-render when the window expires:

```typescript
useEffect(() => {
  if (!isOwn || !withinEditWindow) return;
  const msRemaining = (question.createdAt + 300 - now) * 1000;
  const t = setTimeout(() => forceUpdate(), msRemaining);
  return () => clearTimeout(t);
}, [question.createdAt, isOwn]);
```

Force update via a `useState` counter increment: `const [, forceUpdate] = useReducer((n) => n + 1, 0)`.

### Pattern 5: Inline Edit UI for Questions and Replies

**What:** Mirrors the existing `SnippetCard` inline edit pattern exactly — textarea replaces rendered text, Save/Cancel buttons appear below, save dispatches optimistic update and fires mutation.

**Design constraint (CLAUDE.md):** No confirmation dialogs for edit. Direct manipulation — click edit, edit inline, save or cancel. The edit is reversible (cancel restores). Only destructive irreversible actions (delete) need a Dialog.

**Pattern (from existing SnippetCard):**

```typescript
const [isEditing, setIsEditing] = useState(false);
const [editText, setEditText] = useState(question.text);

// When editing mode activates:
<textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={500} />
<button onClick={handleSave}>Save</button>
<button onClick={() => setIsEditing(false)}>Cancel</button>
```

**For delete:** Must use `@base-ui/react/dialog` Dialog (never `window.confirm` per CLAUDE.md). The pattern already exists in `QuestionCardHost` for ban participant confirmation — reuse exactly that Dialog structure.

### Pattern 6: Edited Indicator Badge

**What:** When `editedAt` is set, show a small "(edited)" badge inline in the author row, similar to the "hidden" badge. Low-chrome — use `text-muted-foreground/60` and the `text-[11px]` size class.

**Where to add:** In the author row of `QuestionCardParticipant`, `QuestionCardHost`, and `ReplyList`, after the relative timestamp.

**Example:**

```tsx
{
  question.editedAt && (
    <span className="text-[11px] text-muted-foreground/60">{tSession("edited")}</span>
  );
}
```

### Pattern 7: Server Actions vs. Client Mutations (existing split)

The existing authorization split from Phase 15 applies to Phase 17:

| Mutation                            | Who calls     | Transport                               | Auth           |
| ----------------------------------- | ------------- | --------------------------------------- | -------------- |
| `editQuestion` (participant path)   | Client        | `graphqlMutation()` direct AppSync HTTP | fingerprint    |
| `editReply` (participant path)      | Client        | `graphqlMutation()` direct AppSync HTTP | fingerprint    |
| `deleteQuestion` (participant path) | Client        | `graphqlMutation()` direct AppSync HTTP | fingerprint    |
| `deleteReply` (participant path)    | Client        | `graphqlMutation()` direct AppSync HTTP | fingerprint    |
| `editQuestion` (host path)          | Server Action | `appsyncMutation()` server-side         | hostSecretHash |
| `editReply` (host path)             | Server Action | `appsyncMutation()` server-side         | hostSecretHash |
| `deleteQuestion` (host path)        | Server Action | `appsyncMutation()` server-side         | hostSecretHash |
| `deleteReply` (host path)           | Server Action | `appsyncMutation()` server-side         | hostSecretHash |
| `editSnippet`                       | Server Action | `appsyncMutation()` server-side         | hostSecretHash |

**Key insight:** `hostSecretHash` must never appear in Network tab (Phase 15 decision). All host mutations remain Server Actions. Participant self-edit/delete can be client-side (fingerprint is not sensitive — it's already stored in DynamoDB and visible in question data).

### Anti-Patterns to Avoid

- **Hard delete instead of soft delete:** Deleting the DynamoDB item means the subscription event cannot reference it and creates race conditions with TTL cleanup. Use `UpdateCommand` to set `deletedAt`.
- **Time-window enforcement only on client:** The 5-minute window MUST be enforced in the Lambda resolver. The client check is UI-only.
- **Separate mutations for participant vs. host:** Use a single mutation with optional `hostSecretHash`. If `hostSecretHash` is provided, take the host path; if `fingerprint` is provided, take the participant path. This keeps the schema minimal.
- **`window.confirm` for delete confirmation:** Forbidden. Use `@base-ui/react/dialog` Dialog.
- **Using `@aws_subscribe` for new event types without adding to the mutations list:** The subscription `@aws_subscribe(mutations: [...])` list in `schema.graphql` MUST include the new mutation names. If omitted, the subscription will never fire for those events.
- **Forgetting to extract `verifyHostSecret`:** It is currently duplicated in `qa.ts` and `clipboard.ts`. Phase 17 adds a third caller. Extract it to `index.ts` (or a `shared.ts` file in resolvers) before writing new resolvers.

---

## Don't Hand-Roll

| Problem                    | Don't Build           | Use Instead                                                               | Why                                                                                     |
| -------------------------- | --------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Delete confirmation dialog | Custom modal          | `@base-ui/react/dialog` (already in project)                              | Already used in QuestionCardHost for ban confirm — exact same pattern                   |
| Inline edit textarea       | Custom editor         | Plain `<textarea>` with `resize-none` — same as SnippetCard               | No rich text needed; 500-char limit fits a textarea                                     |
| 5-minute countdown display | Animated timer        | `formatRelativeTime` + static "(X min left)" text (or just hide silently) | A countdown creates anxiety; simply hide the button when expired                        |
| Optimistic edit update     | Complex state machine | Direct `dispatch({ type: "QUESTION_EDITED", payload })` before mutation   | Pattern already works for upvotes and snippet edits                                     |
| New subscription           | Second WebSocket      | Add new event types to existing `onSessionUpdate`                         | AppSync subscription already established; adding to `@aws_subscribe` list is sufficient |

**Key insight:** Every primitive needed for Phase 17 already exists in the codebase. The work is assembly, not invention.

---

## Common Pitfalls

### Pitfall 1: `text` is a DynamoDB Reserved Word

**What goes wrong:** `UpdateExpression: "SET text = :text"` throws `ValidationException` at runtime.
**Why it happens:** DynamoDB reserves `text` as a keyword.
**How to avoid:** Always use `ExpressionAttributeNames`: `UpdateExpression: "SET #text = :text"` + `ExpressionAttributeNames: { "#text": "text" }`.
**Warning signs:** Lambda logs show `ValidationException: Value provided in ExpressionAttributeNames unused in expressions`.

### Pitfall 2: Subscription Not Firing for New Mutations

**What goes wrong:** `editQuestion` fires the Lambda, updates DynamoDB, returns a `SessionUpdate`, but connected clients never see the update.
**Why it happens:** The new mutation names (`editQuestion`, `editReply`, etc.) must be added to the `@aws_subscribe(mutations: [...])` list in `schema.graphql` AND new event types must be added to the `SessionEventType` enum.
**How to avoid:** After adding to schema, always run `sst deploy` and verify subscription events in AppSync console.
**Warning signs:** Mutation resolves successfully (200 response), but subscription handler's `switch(eventType)` never matches.

### Pitfall 3: Stale 5-Minute Window After Page Load

**What goes wrong:** User loads the page 4 minutes after posting. The "Edit" button appears. 1 minute later, the user clicks it, but the button should have disappeared. It didn't because no re-render was triggered.
**Why it happens:** React only re-renders when state or props change. A clock does not change props.
**How to avoid:** Use `useEffect` + `setTimeout` to schedule a forced re-render when the window expires (see Pattern 4 above).
**Warning signs:** Edit button remains visible after 5 minutes; Lambda returns `EDIT_WINDOW_EXPIRED` error.

### Pitfall 4: Soft-Deleted Items Reappearing After Page Reload

**What goes wrong:** User deletes a question, it disappears from the feed. They reload — it's back.
**Why it happens:** `getSessionData` in `index.ts` does not filter on `deletedAt`.
**How to avoid:** Add `&& !item.deletedAt` to the TTL filter in `getSessionData`.
**Warning signs:** Deleted questions reappear on page reload; `deletedAt` attribute is present in DynamoDB but items are still returned.

### Pitfall 5: EditedAt Not Included in getSessionData Projection

**What goes wrong:** Page loads, questions appear without their `editedAt` values, so "(edited)" badges never show.
**Why it happens:** `getSessionData` in `index.ts` manually maps item fields — if `editedAt` is not listed, it's omitted.
**How to avoid:** Add `editedAt: item.editedAt ?? null` (and same for `deletedAt`) to the question/reply/snippet mapping objects in `getSessionData`.
**Warning signs:** Subscription shows `editedAt` correctly (real-time updates work), but after reload the badge disappears.

### Pitfall 6: Race Between Optimistic Dispatch and Subscription Echo

**What goes wrong:** Author edits a question, optimistic dispatch updates text immediately, then the subscription echo arrives and creates a duplicate update.
**Why it happens:** The subscription fires for all clients including the author.
**How to avoid:** The reducer's `QUESTION_EDITED` case should use the same idempotency pattern as `QUESTION_UPDATED` — always apply the latest value, never guard with "only if not already set." Since the subscription payload matches the optimistic payload exactly, a second application of the same `text` and `editedAt` is a no-op effectively.

### Pitfall 7: ParticipantMutationName Type Guard Blocking Participant Edit Calls

**What goes wrong:** TypeScript compiler error when calling `graphqlMutation("editQuestion", ...)`.
**Why it happens:** `ParticipantMutationName` in `appsync-client.ts` is a union of allowed client-side mutation names. It does not include edit/delete mutations yet.
**How to avoid:** Add the four participant-path mutations to the `ParticipantMutationName` union: `"editQuestion" | "editReply" | "deleteQuestion" | "deleteReply"`.
**Warning signs:** TypeScript error `Argument of type '"editQuestion"' is not assignable to parameter of type 'ParticipantMutationName'`.

### Pitfall 8: Missing `authorName` in Reply Types

**What goes wrong:** `ReplyItem` and `Reply` interfaces in `types.ts` do not have `authorName`. The edit inline display shows blank where the author name should be.
**Why it happens:** `authorName` was added to `ReplyItem` in practice but may not be in the TypeScript interface (checking the current type: `ReplyItem` has `authorName` missing from the interface definition in `types.ts` — it is written to DynamoDB in `addReply` but not declared in the TypeScript type). This could cause issues when editing since the resolver's `GetCommand` response won't have it typed.
**How to avoid:** Verify `ReplyItem` in `types.ts` includes `authorName?: string` before writing the edit resolver.

---

## Code Examples

### GraphQL Schema Additions

```graphql
# Add to enum SessionEventType in infra/schema.graphql:
enum SessionEventType {
  # ... existing values ...
  QUESTION_EDITED
  QUESTION_DELETED
  REPLY_EDITED
  REPLY_DELETED
  SNIPPET_EDITED
}

# Add to type Question:
type Question {
  # ... existing fields ...
  editedAt: AWSTimestamp
}

# Add to type Reply:
type Reply {
  # ... existing fields ...
  editedAt: AWSTimestamp
}

# Add to type Snippet:
type Snippet {
  # ... existing fields ...
  editedAt: AWSTimestamp
}

# Add to type Mutation:
type Mutation {
  # ... existing mutations ...
  editQuestion(
    sessionCode: String!
    questionId: String!
    text: String!
    fingerprint: String
    hostSecretHash: String
  ): SessionUpdate!
  deleteQuestion(
    sessionCode: String!
    questionId: String!
    fingerprint: String
    hostSecretHash: String
  ): SessionUpdate!
  editReply(
    sessionCode: String!
    replyId: String!
    text: String!
    fingerprint: String
    hostSecretHash: String
  ): SessionUpdate!
  deleteReply(
    sessionCode: String!
    replyId: String!
    fingerprint: String
    hostSecretHash: String
  ): SessionUpdate!
  editSnippet(
    sessionCode: String!
    snippetId: String!
    content: String!
    language: String
    hostSecretHash: String!
  ): SessionUpdate!
}

# Update subscription @aws_subscribe list to include new mutations:
type Subscription {
  onSessionUpdate(sessionCode: String!): SessionUpdate
    @aws_subscribe(
      mutations: [
        "_stub"
        "pushSnippet"
        "deleteSnippet"
        "clearClipboard"
        "addQuestion"
        "upvoteQuestion"
        "addReply"
        "focusQuestion"
        "banQuestion"
        "banParticipant"
        "downvoteQuestion"
        "restoreQuestion"
        "react"
        "editQuestion"
        "deleteQuestion"
        "editReply"
        "deleteReply"
        "editSnippet"
      ]
    )
}
```

### sst.config.ts Additions

```typescript
// In sst.config.ts async run(), after existing resolver registrations:
api.addResolver("Mutation editQuestion", { dataSource: lambdaDS.name });
api.addResolver("Mutation deleteQuestion", { dataSource: lambdaDS.name });
api.addResolver("Mutation editReply", { dataSource: lambdaDS.name });
api.addResolver("Mutation deleteReply", { dataSource: lambdaDS.name });
api.addResolver("Mutation editSnippet", { dataSource: lambdaDS.name });
```

### Frontend Mutation String (mutations.ts additions)

```typescript
export const EDIT_QUESTION = `
  mutation EditQuestion($sessionCode: String!, $questionId: String!, $text: String!, $fingerprint: String, $hostSecretHash: String) {
    editQuestion(sessionCode: $sessionCode, questionId: $questionId, text: $text, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const DELETE_QUESTION = `
  mutation DeleteQuestion($sessionCode: String!, $questionId: String!, $fingerprint: String, $hostSecretHash: String) {
    deleteQuestion(sessionCode: $sessionCode, questionId: $questionId, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;
// ... EDIT_REPLY, DELETE_REPLY, EDIT_SNIPPET follow same pattern
```

### New i18n Keys Needed (en.json additions)

```json
{
  "session": {
    "editQuestion": "Edit",
    "deleteQuestion": "Delete",
    "editReply": "Edit",
    "deleteReply": "Delete",
    "edited": "(edited)",
    "editWindowExpired": "The 5-minute edit window has expired.",
    "confirmDeleteQuestion": "Delete this question?",
    "confirmDeleteQuestionDesc": "This cannot be undone.",
    "confirmDeleteReply": "Delete this reply?",
    "confirmDeleteReplyDesc": "This cannot be undone."
  },
  "actionErrors": {
    "editWindowExpired": "The 5-minute edit window has expired.",
    "failedEditQuestion": "Failed to edit question. Please try again.",
    "failedDeleteQuestion": "Failed to delete question.",
    "failedEditReply": "Failed to edit reply.",
    "failedDeleteReply": "Failed to delete reply.",
    "failedEditSnippet": "Failed to edit snippet."
  }
}
```

All new keys must also be added to `es.json` and `pt.json`.

---

## State of the Art

| Old Approach                                                        | Current Approach                                                               | When Changed                    | Impact                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Hard delete (DeleteCommand) for snippets                            | Soft delete (UpdateCommand + deletedAt) for all content                        | Phase 17 introduces soft delete | Items survive TTL cleanup; deletion events are reversible by host; audit trail preserved |
| Only SNIPPET_EDIT_START/END in reducer (inline optimistic pre-push) | QUESTION_EDITED, REPLY_EDITED, SNIPPET_EDITED as real-time subscription events | Phase 17                        | Edit state becomes a first-class event type; all clients update synchronously            |
| Edit only on optimistic (pre-confirmed) snippets                    | Edit on confirmed questions, replies, and snippets                             | Phase 17                        | Editing confirmed content requires a true mutation, not just deferring a push            |

**Deprecated/outdated:**

- `SNIPPET_EDIT_START` / `SNIPPET_EDIT_END` in the reducer: these are internal pre-push editing states for optimistic snippets. Phase 17's new `SNIPPET_EDITED` is a different event — it edits an already-confirmed (server-side) snippet. Both systems coexist.
- `isOptimistic` guard on SnippetCard edit button: currently only optimistic snippets have the edit button. Phase 17 adds edit for confirmed snippets too — the edit button condition changes from `isOptimistic && !isFailed` to `isHost && !isFailed` (host can always edit; no time window for snippets per EDIT-09 requirements).

---

## Open Questions

1. **Does the participant path for deleteQuestion/deleteReply need a confirmation dialog?**
   - What we know: CLAUDE.md forbids `window.confirm`; `@base-ui/react/dialog` must be used. The requirements say soft-delete.
   - What's unclear: Requirements don't specify whether participants see a confirmation before deleting their own post.
   - Recommendation: Use a confirmation Dialog for delete (irreversible from user perspective even if soft-deleted in DB). Use same Dialog pattern as host's ban participant confirm in `QuestionCardHost`. Edit needs no confirmation — it's reversible via Cancel.

2. **Should editedAt display a formatted timestamp tooltip, or just the "(edited)" badge?**
   - What we know: EDIT-07 says "edited indicator with timestamp." The requirements mention both "indicator" and "timestamp."
   - What's unclear: Whether the timestamp is inline text or a hover tooltip.
   - Recommendation: Use a `title` attribute on the "(edited)" span to show the full timestamp on hover — avoids visual clutter while satisfying the requirement. Example: `<span title={new Date(question.editedAt * 1000).toLocaleString()}>(edited)</span>`. This aligns with the design system's "involve as little design as possible" principle.

3. **What happens to reactions on a deleted question/reply?**
   - What we know: Reactions are stored as attributes on the question/reply item itself (not separate items). Soft-delete hides the item but does not remove reactions.
   - What's unclear: Requirements are silent on this edge case.
   - Recommendation: Reactions are irrelevant once an item is soft-deleted and filtered from all views. No special handling needed.

4. **What's the `editSnippet` time window?**
   - What we know: EDIT-09 says "Host can edit their own clipboard snippets" — no time window mentioned. EDIT-01 through EDIT-04 have the 5-minute window for participants.
   - What's unclear: Whether the host snippet edit also has a time window.
   - Recommendation: No time window for host snippet edits. The host is superuser for snippets. Matches existing pattern where the host controls the clipboard without time restrictions.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `infra/schema.graphql`, `packages/functions/src/resolvers/`, `packages/core/src/types.ts`, `packages/frontend/src/hooks/use-session-state.ts`, `packages/frontend/src/hooks/use-session-updates.ts`
- AWS DynamoDB reserved words list — `text` is a documented reserved word requiring ExpressionAttributeNames aliasing
- Project REQUIREMENTS.md — EDIT-01 through EDIT-13 requirements read verbatim

### Secondary (MEDIUM confidence)

- AppSync `@aws_subscribe` behavior — verified by existing subscription implementation in `infra/resolvers/subscription-onSessionUpdate.js` and project's working subscription
- Existing `verifyHostSecret` function pattern — identical implementations in `qa.ts` and `clipboard.ts` confirm the extraction pattern

### Tertiary (LOW confidence)

- None — all claims are verifiable from the codebase directly

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new dependencies; all patterns verified in existing code
- Architecture: HIGH — all patterns derived directly from existing resolver/hook/component code
- Pitfalls: HIGH — DynamoDB reserved word issue (`text`) and subscription `@aws_subscribe` list requirement are verified against the existing working code

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable architecture; no fast-moving dependencies)
