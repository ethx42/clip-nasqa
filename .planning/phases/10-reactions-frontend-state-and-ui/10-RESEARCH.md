# Phase 10: Reactions Frontend State and UI — Research

**Researched:** 2026-03-16
**Domain:** React state management, optimistic UI, ARIA accessibility, real-time subscription wiring
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Primary Reference: Slack**
The entire reaction UX should mirror Slack's model. Slack is the authoritative reference for how reactions look, feel, and behave.

**Emoji Set**

- 6 emojis: 👍 ❤️ 🎉 😂 🤔 👀
- Backend keys (EMOJI_PALETTE): `thumbsup`, `heart`, `party`, `laugh`, `thinking`, `eyes`
- Order is fixed as listed above

**Reaction Bar Layout**

- No full bar shown by default — only a small add-reaction trigger button (smiley face icon)
- When reactions exist on an item, they appear individually as inline pills (emoji + count) in a horizontal row
- New reactions are added to the render as they accumulate — not all shown upfront
- Count displayed to the right of each emoji: `👍 3`
- All reaction buttons are uniform size (no scaling by count)
- Reaction bar lives inside the card footer, below content, with standard spacing (12-16px from content)
- Always visible on both QuestionCard and ReplyCard — no hover-only behavior

**Add-Reaction Trigger**

- Small smiley face / ➕ icon always visible
- Clicking opens an inline expansion showing the 6 emoji options (not a popover)
- Auto-closes after picking one emoji
- Used for both first reaction and adding additional reaction types

**Optimistic Toggle Feel (Slack-style)**

- Tap feedback: subtle background highlight — no dramatic animation, emoji gets a tinted pill/chip background
- Silent revert if server rejects (no toast, no error UI)
- 300ms debounce on rapid toggles before sending mutation to server
- When subscription event arrives with different count: instant swap (no number animation)

**Own-Reaction Highlight**

- Your active reaction: tinted pill background using neutral gray (not brand indigo)
- Inactive reactions: transparent/no background
- Removing your reaction: instant un-highlight, no fade animation
- If you're the last to remove a specific emoji, that button disappears (zero-count hide rule)

**Host Behavior**

- Host can react same as any participant — no special badge or visual distinction
- Reactions are count-only — no tooltip showing who reacted (anonymous)

**Count Overflow**

- Display exact count up to 99, then show "99+"
- Button width is fixed regardless of count — no layout shifts

### Claude's Discretion

- Exact spacing values within the design system scale
- Add-reaction trigger icon choice (smiley vs plus — as long as it mirrors Slack's affordance)
- Skeleton loading state for reaction bars during initial data fetch
- Exact animation timing for inline expansion of emoji picker
- Error state handling for subscription disconnects

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                       | Research Support                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| RXN-10 | Inline ReactionBar component renders below Question and Reply content with per-emoji count badges | ReactionBar component consuming `reactionCounts` AWSJSON from Question/Reply; zero-count hide rule   |
| RXN-11 | User's own active reactions are visually highlighted (distinct from unselected state)             | `reactedByMe` map from REACTION_UPDATED payload + localStorage per-session tracking for initial load |
| RXN-12 | Toggling a reaction applies optimistic UI update before server confirmation                       | New `REACTION_UPDATED` action in useSessionState reducer + 300ms debounce + silent rollback          |
| RXN-13 | Reaction buttons have ARIA labels and meet 44px minimum touch target for mobile                   | next-intl i18n pattern for aria-label interpolation; min-h-11 / min-w-11 Tailwind classes            |

</phase_requirements>

## Summary

Phase 10 is a pure frontend phase — the backend is done. All 6 emoji reaction counts are already returned via `reactionCounts: AWSJSON` in `Question` and `Reply` types, and the `REACTION_UPDATED` event is already being dispatched (currently falling through to the `default` warn case in `useSessionUpdates`). The phase work is: (1) wire the REACTION_UPDATED event into state, (2) build the `ReactionBar` component with Slack-style UX, (3) integrate it into `QuestionCard` and `ReplyList`, and (4) add i18n keys in all three locales.

The state management pattern is already established: `useReducer` in `use-session-state.ts` with typed `SessionAction` union, optimistic dispatch with delta application, and subscription confirmation that overwrites with authoritative server values. Reactions follow the identical pattern — dispatch `REACTION_UPDATED_OPTIMISTIC` immediately, debounce the mutation, on REACTION_UPDATED subscription event overwrite counts. The `useFingerprint` hook tracks per-session voted IDs in localStorage; the same approach (a separate `reactions:{sessionSlug}:{itemId}` key storing a Set of emoji keys the user has reacted with) enables the initial active-state highlight before the first subscription event confirms it.

The `GET_SESSION_DATA` GraphQL query in `mutations.ts` does not yet include `reactionCounts` in the question/reply selection sets — this is a required fix in Wave 1 to ensure SSR-loaded data populates reaction counts. The `ReactionCounts` type (`{ thumbsup, heart, party, laugh, thinking, eyes }`) and `EMOJI_PALETTE` constant are both already in `@nasqa/core/schemas` and ready to import.

**Primary recommendation:** Extend `useSessionState` with a `REACTION_UPDATED` action, add a `useReactionState` local hook (per-card optimistic overrides + debounce), build `ReactionBar` as a self-contained component receiving counts + own-reaction map, wire into card footers, and add i18n keys. No new npm packages are needed.

## Standard Stack

### Core (already installed)

| Library       | Version   | Purpose                                                          | Why Standard                             |
| ------------- | --------- | ---------------------------------------------------------------- | ---------------------------------------- |
| React 19      | 19.2.3    | Component model, hooks, useReducer                               | Project foundation                       |
| next-intl     | ^4.8.3    | i18n aria-label strings in en/es/pt                              | Project i18n standard                    |
| Tailwind CSS  | ^4        | Styling reaction pills, touch targets                            | Project styling standard                 |
| `@nasqa/core` | workspace | `EMOJI_PALETTE`, `EmojiKey`, `ReactionCounts`, `EmojiKey` type   | Single source of truth for emoji palette |
| framer-motion | ^12.36.0  | Inline emoji picker expansion animation (at Claude's discretion) | Already installed                        |
| lucide-react  | ^0.577.0  | Add-reaction trigger icon (SmilePlus or Plus)                    | Project icon standard                    |

### Supporting

| Library       | Version | Purpose                                                              | When to Use                      |
| ------------- | ------- | -------------------------------------------------------------------- | -------------------------------- |
| `clsx` / `cn` | ^2.1.1  | Conditional class composition for active pill state                  | Every pill class toggle          |
| `sonner`      | ^2.0.7  | Already used for error toasts — NOT used for reaction silent reverts | Only if future non-silent errors |

### Alternatives Considered

| Instead of                           | Could Use                 | Tradeoff                                                                                      |
| ------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------- |
| Local debounce with `useRef`         | External debounce library | `useRef`-based debounce is zero-dependency and sufficient for 300ms single-trigger case       |
| `reactedByMe` from subscription only | localStorage tracking     | localStorage allows correct highlight on initial SSR load before first REACTION_UPDATED event |

**Installation:** No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended File Structure for Phase 10

```
packages/frontend/src/
├── components/session/
│   └── reaction-bar.tsx          # NEW: self-contained ReactionBar component
├── hooks/
│   └── use-reaction-state.ts     # NEW: per-item optimistic reaction state + debounce
├── actions/
│   └── reactions.ts              # NEW: reactAction server action (appsyncMutation wrapper)
├── lib/graphql/
│   └── mutations.ts              # MODIFY: add reactionCounts to GET_SESSION_DATA query
└── hooks/
    ├── use-session-state.ts      # MODIFY: add REACTION_UPDATED action + reducer case
    └── use-session-updates.ts    # MODIFY: add REACTION_UPDATED subscription case
```

Additionally:

```
packages/frontend/messages/
├── en.json   # MODIFY: add reactions.*  keys
├── es.json   # MODIFY: add reactions.*  keys
└── pt.json   # MODIFY: add reactions.*  keys
```

### Pattern 1: Extend useSessionState with REACTION_UPDATED

**What:** Add a new action type that updates `reactionCounts` on the target question or reply. The subscription delivers authoritative server counts — overwrite optimistic counts when the event arrives.

**When to use:** When the AppSync REACTION_UPDATED event fires (from any client, not just the current user).

**Backend contract for REACTION_UPDATED payload:**

```typescript
// Source: 09-01-SUMMARY.md — handleReact resolver return shape
{
  targetId: string; // question or reply ID
  targetType: "QUESTION" | "REPLY";
  emoji: EmojiKey; // which emoji was toggled
  counts: ReactionCounts; // authoritative full counts after toggle
  reactedByMe: Record<EmojiKey, boolean>; // only the toggling user's state
}
```

Note: `reactedByMe` in the REACTION_UPDATED event is only meaningful for the user who triggered the reaction. Other clients' `use-reaction-state.ts` already track their own state via localStorage — they should ignore the `reactedByMe` field from subscription events they didn't initiate.

**Reducer action (add to SessionAction union):**

```typescript
// Source: patterns established by QUESTION_UPDATED action in use-session-state.ts
| {
    type: "REACTION_UPDATED";
    payload: {
      targetId: string;
      targetType: "QUESTION" | "REPLY";
      counts: ReactionCounts;
    };
  }
```

**Reducer case (question path):**

```typescript
case "REACTION_UPDATED": {
  const { targetId, targetType, counts } = action.payload;
  const countsJson = JSON.stringify(counts);
  if (targetType === "QUESTION") {
    return {
      ...state,
      questions: state.questions.map((q) =>
        q.id === targetId ? { ...q, reactionCounts: countsJson } : q
      ),
    };
  }
  // REPLY path — same pattern on state.replies
  return {
    ...state,
    replies: state.replies.map((r) =>
      r.id === targetId ? { ...r, reactionCounts: countsJson } : r
    ),
  };
}
```

**In useSessionUpdates, add the REACTION_UPDATED case:**

```typescript
// Source: pattern from existing QUESTION_UPDATED case in use-session-updates.ts
case "REACTION_UPDATED": {
  const { targetId, targetType, counts } = parsed as {
    targetId: string;
    targetType: "QUESTION" | "REPLY";
    counts: ReactionCounts;
  };
  stableDispatch({
    type: "REACTION_UPDATED",
    payload: { targetId, targetType, counts },
  });
  break;
}
```

**IMPORTANT:** The `reactedByMe` field from the subscription payload must NOT be dispatched to the reducer. Each client manages its own reaction state locally via `useReactionState`. Dispatching `reactedByMe` from other clients' events would corrupt the current user's highlights.

### Pattern 2: useReactionState Hook (per-card optimistic state)

**What:** A component-level hook managing the optimistic overlay for a single card's reactions. Tracks which emojis the current user has reacted with locally, applies a 300ms debounce before sending the mutation, and silently rolls back on server error.

**When to use:** Instantiated inside ReactionBar (one instance per card).

```typescript
// Source: pattern modeled on useFingerprint + upvote optimistic pattern in session-live-page.tsx
interface UseReactionStateOptions {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  initialCounts: ReactionCounts;
  fingerprint: string;
}

// localStorage key: reactions:{sessionSlug}:{targetId}
// Value: JSON array of EmojiKey strings the user has reacted with
```

**Key behaviors:**

1. On mount: read `reactions:{sessionSlug}:{targetId}` from localStorage → initialize `activeEmojis: Set<EmojiKey>`
2. On toggle: immediately flip the active state in local set + apply count delta to local `optimisticCounts` state
3. Debounce the mutation call 300ms using `useRef` setTimeout
4. On REACTION_UPDATED arrival (counts from reducer): overwrite `optimisticCounts` with authoritative server counts (no local count management needed after server confirms)
5. On mutation error: silently revert the local toggle (no toast — per CONTEXT.md decision)

**The `optimisticCounts` override approach:**

- Keep a `localOverrideCounts: ReactionCounts | null` state, initialized to `null`
- On optimistic toggle: set `localOverrideCounts` to the modified counts
- After 300ms debounce fires and mutation succeeds: clear `localOverrideCounts` (subscription event will update state.questions[*].reactionCounts anyway)
- In render: `const displayCounts = localOverrideCounts ?? parsedCounts` where `parsedCounts` comes from `JSON.parse(question.reactionCounts ?? '{}')`

### Pattern 3: ReactionBar Component

**What:** Renders the existing active reactions as pills + the add-reaction trigger. Self-contained — receives parsed counts and the active state from `useReactionState`.

**Props shape:**

```typescript
interface ReactionBarProps {
  counts: ReactionCounts; // authoritative (or optimistic) counts
  activeEmojis: Set<EmojiKey>; // which emojis THIS user has reacted with
  onToggle: (emoji: EmojiKey) => void;
  className?: string;
}
```

**Render logic:**

1. Filter `EMOJI_PALETTE` to entries where `counts[key] > 0` — these are the visible pills
2. Map each to a `<button>` pill: emoji character + count string + active background if `activeEmojis.has(key)`
3. Always render the add-reaction trigger button (SmilePlus icon from lucide-react)
4. Clicking add-reaction trigger toggles inline expansion of all 6 emoji buttons
5. Clicking any emoji in the inline picker calls `onToggle(key)` and closes the picker

**Count display helper:**

```typescript
function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}
```

### Pattern 4: Integrating reactionCounts into Question and Reply types

**What:** `Question` and `Reply` in `@nasqa/core/types.ts` currently have no `reactionCounts` field, but the GraphQL schema already declares `reactionCounts: AWSJSON` on both types. The TypeScript types need updating, and the `GET_SESSION_DATA` query selection set must include `reactionCounts`.

**TypeScript type update (packages/core/src/types.ts):**

```typescript
// Add to Question interface:
reactionCounts?: string; // AWSJSON — JSON.stringify({ thumbsup: N, ... }), absent if all zero

// Add to Reply interface:
reactionCounts?: string; // same shape
```

**GraphQL query update (packages/frontend/src/lib/graphql/mutations.ts):**

```typescript
// Add reactionCounts to GET_SESSION_DATA questions and replies selection sets
questions {
  id
  ...existing fields...
  reactionCounts   // ADD THIS
}
replies {
  id
  ...existing fields...
  reactionCounts   // ADD THIS
}
```

**Parse helper (utility in reaction-bar.tsx or lib):**

```typescript
import type { ReactionCounts } from "@nasqa/core";
import { EMOJI_KEYS } from "@nasqa/core";

function parseReactionCounts(raw: string | undefined | null): ReactionCounts {
  if (!raw) return Object.fromEntries(EMOJI_KEYS.map((k) => [k, 0])) as ReactionCounts;
  try {
    return JSON.parse(raw) as ReactionCounts;
  } catch {
    return Object.fromEntries(EMOJI_KEYS.map((k) => [k, 0])) as ReactionCounts;
  }
}
```

### Pattern 5: REACT GraphQL Mutation

**What:** A new `REACT` mutation string constant + `reactAction` server action following the established `actions/*.ts` pattern.

```typescript
// packages/frontend/src/lib/graphql/mutations.ts — add:
export const REACT = `
  mutation React(
    $sessionSlug: String!
    $targetId: String!
    $targetType: ReactionTargetType!
    $emoji: String!
    $fingerprint: String!
  ) {
    react(
      sessionSlug: $sessionSlug
      targetId: $targetId
      targetType: $targetType
      emoji: $emoji
      fingerprint: $fingerprint
    ) {
      eventType
      sessionSlug
      payload
    }
  }
`;
```

```typescript
// packages/frontend/src/actions/reactions.ts
"use server";

import { appsyncMutation } from "@/lib/appsync-server";
import { REACT } from "@/lib/graphql/mutations";

export async function reactAction(args: {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  emoji: string;
  fingerprint: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await appsyncMutation(REACT, args);
    return { success: true };
  } catch {
    return { success: false };
  }
}
```

Note: No error toast on failure — per CONTEXT.md ("Silent revert if server rejects"). The action returns `success: false` and the hook rolls back the optimistic state silently.

### Pattern 6: i18n Keys for ARIA Labels

**What:** Reaction buttons need aria-label strings in en, es, and pt. The pattern follows the existing `tSession("upvoteQuestion")` approach using `useTranslations("session")` inside the component.

**Keys to add to all three message files:**

```json
"reactions": {
  "react": "React",
  "addReaction": "Add reaction",
  "emojiLabel": "{emoji}: {count, plural, one {# reaction} other {# reactions}}",
  "emojiLabelActive": "{emoji} (active): {count, plural, one {# reaction} other {# reactions}}",
  "thumbsup": "Thumbs up",
  "heart": "Heart",
  "party": "Party",
  "laugh": "Laugh",
  "thinking": "Thinking",
  "eyes": "Eyes"
}
```

**aria-label construction in ReactionBar:**

```typescript
const t = useTranslations("reactions");
// For each visible pill:
aria-label={t("emojiLabel", { emoji: t(key), count: counts[key] })}
aria-pressed={activeEmojis.has(key)}
```

**For the add-reaction trigger:**

```typescript
aria-label={t("addReaction")}
aria-expanded={pickerOpen}
```

### Pattern 7: Wire ReactionBar into QuestionCard and ReplyList

**QuestionCard:** Add `ReactionBar` in the card footer area, below the existing action row (reply count + reply button). Pass down:

- `sessionSlug`, `fingerprint` as existing props
- No new prop additions needed — `ReactionBar` + `useReactionState` co-locate their state

**ReplyList:** Currently `ReplyList` receives only `replies: Reply[]` and `isHost: boolean`. ReplyList must become aware of `sessionSlug` and `fingerprint` to pass down to ReactionBar for each reply. These two props need to be added.

**Integration in session-live-page.tsx:** No changes needed — `sessionSlug` and `fingerprint` already flow through to `QAPanel` → `QuestionCard` → `ReplyList`. Only `ReplyList`'s props signature expands.

### Anti-Patterns to Avoid

- **Emoji characters as Lucide icons:** The DESIGN_SYSTEM.md anti-pattern "Emoji as icons (use Lucide React)" applies to UI chrome icons. The reaction pills use literal emoji characters (`👍`, `❤️`) which is intentional and explicitly decided in CONTEXT.md. Use Lucide only for the add-reaction trigger icon.
- **Dispatching reactedByMe from subscription to the reducer:** The REACTION_UPDATED event's `reactedByMe` field is computed on the server for the toggling user only. Other clients receiving this event must not use it to update their own active state. Each client tracks its own active state via localStorage + optimistic local state.
- **Animating count numbers:** CONTEXT.md says "instant swap (no number animation)" when subscription events arrive. Do not use framer-motion's AnimatePresence for count changes.
- **Showing reaction bar above content:** CONTEXT.md specifies "below content" in card footer.
- **Scaling buttons by count:** All 6 buttons uniform size — no big-emoji-for-popular-reaction design.
- **Using brand indigo for active highlight:** Active reactions use neutral gray background, not indigo. Per CONTEXT.md: "neutral gray (not brand indigo)". Suggested: `bg-muted/60` or `bg-muted` from semantic tokens.
- **Using a popover for the emoji picker:** The picker is an inline expansion, not a floating popover. This avoids z-index conflicts and matches the Slack reference.
- **Including toast errors for reactions:** Silent revert only. No `toast.error()` call in the reaction action handler.

## Don't Hand-Roll

| Problem                  | Don't Build                       | Use Instead                                                      | Why                                                                                          |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Debounce logic           | Custom `setTimeout` state machine | `useRef`-based debounce (simple pattern, no library needed)      | 300ms single-trigger case needs no external library; `clearTimeout` on cleanup is sufficient |
| AWSJSON parse safety     | Custom recursive parser           | Single `JSON.parse` with try/catch fallback                      | AppSync AWSJSON is never nested beyond one level for reactionCounts                          |
| Active emoji persistence | IndexedDB or session-scoped state | localStorage key `reactions:{slug}:{id}` (same pattern as votes) | Already consistent with fingerprint + vote tracking pattern in `useFingerprint`              |
| i18n plural forms        | Custom count formatters           | next-intl ICU message format `{count, plural, ...}`              | Already used for `replyCount` key — exact same pattern                                       |

**Key insight:** The codebase already has all the infrastructure (mutation pattern, localStorage tracking, subscription dispatch, i18n) — this phase is applying existing patterns to a new feature, not inventing anything new.

## Common Pitfalls

### Pitfall 1: reactedByMe Leak from Subscription Events

**What goes wrong:** The REACTION_UPDATED payload contains `reactedByMe: Record<EmojiKey, boolean>` which reflects the toggling user's active state. If this is dispatched globally, every client's UI will show incorrect highlights whenever any other user reacts.

**Why it happens:** The backend correctly returns `reactedByMe` for the toggling user to confirm their own state. This is a personal confirmation signal, not a broadcast signal.

**How to avoid:** In `useSessionUpdates`, extract only `{ targetId, targetType, counts }` from the payload and dispatch. The `reactedByMe` field from subscription events is discarded. Each client maintains its own active state via localStorage + `useReactionState`.

**Warning signs:** All users see their reaction highlighted after any user reacts to an item.

### Pitfall 2: Stale Counts After Optimistic + Subscription Race

**What goes wrong:** User toggles emoji A. Optimistic update sets `localOverrideCounts.thumbsup = 4`. Subscription event arrives with `counts.thumbsup = 3` (server has different state). The optimistic count is now wrong.

**Why it happens:** The subscription event is the authoritative server state. Local override should be cleared when the subscription confirms.

**How to avoid:** When `counts` from `state.questions[id].reactionCounts` changes (detected via `useEffect` dependency), clear `localOverrideCounts`. The parsed reducer counts are always authoritative after a subscription event.

**Warning signs:** Count displays never settle to server value; persistent drift between UI and other clients.

### Pitfall 3: Double Debounce on Rapid Toggles

**What goes wrong:** User clicks thumbsup rapidly 3 times in 300ms. The debounce fires once, sending the mutation. But the optimistic state has been toggled 3 times (odd → back to original state). The mutation sends the "wrong" toggle direction.

**Why it happens:** Debounce collapses all taps but the local state has been flipped multiple times.

**How to avoid:** Track the toggle direction in the debounce ref — on each rapid tap, cancel the pending timeout and set a new one with the current local active state. The mutation always uses the current `activeEmojis` state at fire time, not a snapshot from the first tap.

**Warning signs:** After rapid tapping, the reaction state reverts unexpectedly.

### Pitfall 4: reactionCounts Missing from Initial SSR Data

**What goes wrong:** The `GET_SESSION_DATA` query in `mutations.ts` does not include `reactionCounts` in the questions/replies selection sets. All reaction counts on initial page load are empty/undefined. Only subscription events populate counts.

**Why it happens:** The GraphQL selection set must be explicitly updated — the schema already supports the field but the client query never requests it.

**How to avoid:** In Wave 1 (or a preparatory task), update `GET_SESSION_DATA` to include `reactionCounts` in both the `questions { ... }` and `replies { ... }` blocks. Verify by checking initial page load shows correct counts for sessions with existing reactions.

**Warning signs:** Page load shows zero reactions; after any new reaction event, counts suddenly appear.

### Pitfall 5: Missing reactionCounts on Question/Reply TypeScript Interfaces

**What goes wrong:** `packages/core/src/types.ts` `Question` and `Reply` interfaces lack `reactionCounts?: string`. The compiler allows `question.reactionCounts` access but the field is typed `undefined` everywhere, causing `JSON.parse` type errors.

**Why it happens:** Phase 9 added the field to the GraphQL schema but the TypeScript types were not updated (the DynamoDB item types don't need it, but the application interfaces do).

**How to avoid:** As part of Wave 1, add `reactionCounts?: string` to both `Question` and `Reply` interfaces in `@nasqa/core/types.ts`. Re-run `npm run typecheck` to confirm clean compilation.

**Warning signs:** TypeScript errors like "Property 'reactionCounts' does not exist on type 'Question'".

### Pitfall 6: Emoji Character Encoding in EMOJI_PALETTE vs CONTEXT.md

**What goes wrong:** CONTEXT.md listed emojis as `👍 ❤️ 😂 😮 🙏 👀`. The actual `EMOJI_PALETTE` in `packages/core/src/schemas.ts` uses keys and emoji characters `thumbsup:👍, heart:❤️, party:🎉, laugh:😂, thinking:🤔, eyes:👀`. The CONTEXT.md emoji list is the desired display UX; the backend palette is the canonical implementation.

**Why it happens:** The discussion used the approximate emoji set; the Phase 9 implementation finalized it.

**How to avoid:** Always use `EMOJI_PALETTE` from `@nasqa/core/schemas` as the single source of truth for both the emoji character and the key. Never hardcode emoji literals in the component.

**Warning signs:** Reaction bar shows wrong emoji for a given key, or a key that exists in the backend doesn't render.

## Code Examples

Verified patterns from official sources:

### Parsing AWSJSON reactionCounts (project pattern)

```typescript
// Source: established by 09-02-SUMMARY.md decision — "Phase 10 client JSON.parse()s it"
import type { ReactionCounts } from "@nasqa/core";
import { EMOJI_KEYS } from "@nasqa/core";

function parseReactionCounts(raw: string | undefined | null): ReactionCounts {
  const zero = Object.fromEntries(EMOJI_KEYS.map((k) => [k, 0])) as ReactionCounts;
  if (!raw) return zero;
  try {
    return { ...zero, ...(JSON.parse(raw) as Partial<ReactionCounts>) };
  } catch {
    return zero;
  }
}
```

### Optimistic reaction toggle (following upvote pattern in session-live-page.tsx)

```typescript
// Source: modeled on handleUpvote in packages/frontend/src/components/session/session-live-page.tsx
async function handleReaction(emoji: EmojiKey) {
  const isActive = activeEmojis.has(emoji);
  const nextActive = new Set(activeEmojis);
  // 1. Optimistic local toggle
  if (isActive) {
    nextActive.delete(emoji);
  } else {
    nextActive.add(emoji);
  }
  setActiveEmojis(nextActive);
  persistActiveEmojis(nextActive); // localStorage

  // 2. Debounce mutation
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    const result = await reactAction({ sessionSlug, targetId, targetType, emoji, fingerprint });
    if (!result.success) {
      // Silent rollback — no toast
      setActiveEmojis(activeEmojis);
      persistActiveEmojis(activeEmojis);
    }
    // On success: subscription event arrives and overwrites optimistic counts in reducer
  }, 300);
}
```

### ARIA-labelled reaction pill button (following project's aria-label pattern)

```typescript
// Source: modeled on aria-label pattern in question-card.tsx (upvote button)
import { useTranslations } from "next-intl";
import { EMOJI_PALETTE } from "@nasqa/core";

const t = useTranslations("reactions");

{EMOJI_PALETTE.filter((e) => counts[e.key] > 0).map((e) => (
  <button
    key={e.key}
    onClick={() => onToggle(e.key)}
    aria-label={t("emojiLabel", { emoji: t(e.key), count: counts[e.key] })}
    aria-pressed={activeEmojis.has(e.key)}
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
      "text-sm min-h-11 min-w-11",  // 44px touch target
      "transition-colors",
      activeEmojis.has(e.key)
        ? "bg-muted text-foreground"          // neutral gray highlight for own reaction
        : "bg-transparent text-muted-foreground hover:bg-muted/40",
    )}
  >
    <span aria-hidden="true">{e.emoji}</span>
    <span className="tabular-nums text-xs font-semibold">
      {counts[e.key] > 99 ? "99+" : counts[e.key]}
    </span>
  </button>
))}
```

### localStorage active emoji tracking (following useFingerprint pattern)

```typescript
// Source: modeled on useFingerprint.ts — votes:{sessionSlug} key pattern
const REACTIONS_KEY = (sessionSlug: string, targetId: string) =>
  `reactions:${sessionSlug}:${targetId}`;

function loadActiveEmojis(sessionSlug: string, targetId: string): Set<EmojiKey> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY(sessionSlug, targetId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as EmojiKey[]);
  } catch {
    return new Set();
  }
}

function persistActiveEmojis(sessionSlug: string, targetId: string, emojis: Set<EmojiKey>): void {
  localStorage.setItem(REACTIONS_KEY(sessionSlug, targetId), JSON.stringify([...emojis]));
}
```

### useSessionState SessionAction addition

```typescript
// Source: existing SessionAction type union in use-session-state.ts
// Add to the union:
| {
    type: "REACTION_UPDATED";
    payload: {
      targetId: string;
      targetType: "QUESTION" | "REPLY";
      counts: ReactionCounts;
    };
  }
```

## State of the Art

| Old Approach                                                 | Current Approach                          | When Changed         | Impact                                                            |
| ------------------------------------------------------------ | ----------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| Polling for reaction counts                                  | Real-time subscription `REACTION_UPDATED` | Phase 9              | Zero-poll architecture, counts arrive within subscription latency |
| `reactionCounts` not in GET_SESSION_DATA response            | Must add to selection set                 | Wave 1 of this phase | Initial load blank until first subscription event — fix required  |
| `Question`/`Reply` TypeScript types without `reactionCounts` | Must add `reactionCounts?: string`        | Wave 1 of this phase | Type errors if not fixed before ReactionBar implementation        |

**Deprecated/outdated:**

- `EMOJI_PALETTE` from CONTEXT.md emoji list: The CONTEXT.md listed approximate display emojis (👍 ❤️ 😂 😮 🙏 👀). The authoritative set in `@nasqa/core/schemas.ts` is `thumbsup:👍, heart:❤️, party:🎉, laugh:😂, thinking:🤔, eyes:👀`. Always use the palette constant.

## Open Questions

1. **Should `useReactionState` live in `reaction-bar.tsx` or as a separate hook file?**
   - What we know: The hook has enough logic (localStorage init, debounce ref, optimistic counts) to warrant a separate file per project conventions
   - What's unclear: Whether the hook is reusable beyond ReactionBar
   - Recommendation: Create `packages/frontend/src/hooks/use-reaction-state.ts` as a standalone hook, similar to `use-fingerprint.ts`

2. **How does `useReactionState` receive authoritative count updates from the reducer?**
   - What we know: `state.questions[id].reactionCounts` changes when REACTION_UPDATED arrives; the ReactionBar receives this as a prop
   - What's unclear: Whether a `useEffect` comparing previous vs current counts is needed to clear `localOverrideCounts`, or whether the optimistic counts are abandoned after debounce fires
   - Recommendation: Clear `localOverrideCounts` when the debounce fires (success or failure), regardless of subscription timing. The prop `counts` (from reducer) is always used for display once `localOverrideCounts` is null.

3. **Do replies need `fingerprint` passed to them for ReactionBar?**
   - What we know: `ReplyList` currently takes `replies: Reply[]` and `isHost: boolean`. `fingerprint` is available in `SessionLivePage` and `SessionLiveHostPage`
   - What's unclear: Whether passing fingerprint + sessionSlug to ReplyList is the right pattern, or whether we should lift reaction handlers up
   - Recommendation: Add `sessionSlug: string` and `fingerprint: string` to `ReplyListProps` — consistent with how QuestionCard already receives these.

## Sources

### Primary (HIGH confidence)

- `packages/core/src/schemas.ts` — EMOJI_PALETTE, EmojiKey, EMOJI_KEYS, emojiKeySchema (verified in codebase)
- `packages/core/src/types.ts` — ReactionCounts, ReactArgs, SessionEventType.REACTION_UPDATED (verified in codebase)
- `packages/frontend/src/hooks/use-session-state.ts` — SessionAction union, reducer pattern, hook return (verified in codebase)
- `packages/frontend/src/hooks/use-session-updates.ts` — subscription event dispatch pattern, parseAwsJson helper (verified in codebase)
- `packages/frontend/src/hooks/use-fingerprint.ts` — localStorage tracking pattern (verified in codebase)
- `packages/frontend/src/components/session/session-live-page.tsx` — optimistic mutation + rollback pattern (verified in codebase)
- `.planning/phases/09-reactions-data-model-and-backend/09-01-SUMMARY.md` — REACTION_UPDATED payload contract: `{ targetId, targetType, emoji, counts, reactedByMe }`
- `.planning/phases/09-reactions-data-model-and-backend/09-02-SUMMARY.md` — reactionCounts AWSJSON serialization decision
- `infra/schema.graphql` — react mutation signature, ReactionTargetType enum (verified in codebase)
- `packages/frontend/src/lib/graphql/mutations.ts` — GET_SESSION_DATA query missing reactionCounts (verified gap in codebase)
- `packages/frontend/messages/en.json` — existing i18n key patterns, session namespace (verified in codebase)
- `packages/frontend/DESIGN_SYSTEM.md` — pill/badge styles, touch targets, semantic color tokens (verified in codebase)

### Secondary (MEDIUM confidence)

- Slack reaction UX model — referenced in CONTEXT.md as the authoritative UX reference; behavior described in CONTEXT.md decisions section
- `vitest.config.ts` — frontend test project uses jsdom + @testing-library/react (verified in codebase)

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and in use; no new dependencies needed
- Architecture: HIGH — patterns directly extend existing proven patterns (useSessionState, useFingerprint, appsyncMutation); gaps confirmed by codebase inspection
- Pitfalls: HIGH — pitfalls 4 and 5 are confirmed bugs found by reading the actual code (GET_SESSION_DATA missing reactionCounts, types.ts missing the field); pitfalls 1–3 are pattern-specific to optimistic state management

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (stable — no fast-moving dependencies; all stack is already locked)
