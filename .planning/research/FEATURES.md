# Feature Research

**Domain:** Emoji reactions on Q&A posts in live audience engagement tools (Nasqa Live v1.2)
**Researched:** 2026-03-15
**Confidence:** MEDIUM — Competitive analysis via platform docs and WebSearch; no Context7 coverage for domain-specific UX patterns. Implementation specifics for DynamoDB/AppSync are HIGH confidence (existing codebase already uses these patterns for upvotes).

---

## Context: What Already Exists

The following features are already implemented in v1.0/v1.1 and are NOT in scope for v1.2:

- Real-time Q&A with AppSync WebSocket subscriptions (single SessionUpdate union channel)
- Upvote/downvote ranking with DynamoDB atomic increments
- Community moderation: 50% downvote threshold auto-hide, host ban, 3-strike auto-ban
- Device fingerprint (localStorage token) for anonymous participant identity + dedup
- One-level reply threading with speaker badges
- Focus mode (host pins a question)
- Rate limiting via DynamoDB minute-bucket counters (3 questions/min per device)
- Optimistic UI with < 100ms internal state updates

**v1.2 adds emoji reactions as a sentiment layer on top of this existing infrastructure — it does not replace or modify the voting system.**

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that participants in any live Q&A or audience engagement tool assume exist once reactions are introduced. Missing these makes reactions feel broken or half-shipped.

| Feature                                            | Why Expected                                                                                                                                                                                                                         | Complexity | Notes                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------ |
| Fixed emoji palette (5–8 emojis)                   | All comparable tools use a fixed set — Zoom uses 6, Mentimeter uses 5, Slido polls use a defined set. An open picker is never standard in live Q&A; one-tap access is the expectation                                                | LOW        | v1.2 spec defines 👍 ❤️ 🎉 😂 🤔 👀 — well-aligned with industry norm                                        |
| Toggle own reaction on/off                         | Clicking an active reaction to deactivate it is universal (GitHub, Slack, Discord, all major tools). Users expect clicking an already-active emoji removes their reaction                                                            | LOW        | DynamoDB Set dedup pattern: add device token on react, remove on un-react. Same model as existing upvote Set |
| Real-time count update visible to all participants | Participants expect reaction counts to update live without refresh — Pigeonhole, Slido, Zoom all propagate reactions in real time                                                                                                    | MEDIUM     | Fits existing AppSync SessionUpdate subscription; add REACTION_UPDATED event to union type                   |
| Reactions visible on both Questions and Replies    | Tools that support threading expect reactions at both levels. Slido applies reactions to poll answers; Pigeonhole attaches them to Q&A items. Single-level reactions would feel inconsistent given Nasqa already has reply threading | LOW        | Same code path for both; attach reaction sets to QUESTION# and REPLY# DynamoDB items                         |
| Count display inline with emoji                    | Users expect to see "👍 12" format — count badge next to the emoji. This is the universal display pattern (GitHub, Slack, Linear, Notion)                                                                                            | LOW        | Render count from DynamoDB Set `.size`; hide count when 0 to reduce clutter                                  |
| One reaction per user per emoji type               | The "one of each emoji per person" model is table stakes — stacking the same emoji to inflate counts is not done in any surveyed tool. Each user gets one slot per emoji                                                             | LOW        | DynamoDB Set of device fingerprints enforces this naturally; same pattern as upvotes                         |

### Differentiators (Competitive Advantage)

Features that go beyond what existing tools offer, given Nasqa Live's specific context.

| Feature                                                      | Value Proposition                                                                                                                                                                                                                                                                                                                   | Complexity | Notes                                                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Reactions pinned to individual Q&A items (not session-level) | No surveyed tool attaches reactions to specific questions in a Q&A thread. Slido reactions are on poll answer options; Mentimeter reactions float across the whole slide; Pigeonhole and Zoom reactions are session-level ambient signals. Per-item reactions let hosts see which questions resonated — not just general crowd mood | LOW        | Already designed into v1.2 spec; the data model difference is the differentiator, not the UI                      |
| Reactions on threaded replies (not just top-level questions) | No competitor applies per-item reactions at the reply level. Useful when a speaker gives a direct reply — participants can react to the answer, not just the question                                                                                                                                                               | LOW        | Reply items already stored with REPLY# SK; attach reactionSets attribute; same rendering component                |
| Reactions complement upvotes semantically (separate signal)  | Most tools conflate reactions with voting or don't have both. Nasqa's explicit separation — upvotes drive sort order, reactions express sentiment — gives hosts richer signal without polluting ranking. A 🤔 and a 👍 mean different things; averaging them into a score would be meaningless                                      | LOW        | Already designed into spec; the key constraint is to never let reactions touch sort order                         |
| Reactions blocked for banned participants                    | No surveyed tool applies moderation/ban status to reactions — they treat reactions as lower-stakes than posts. Nasqa Live can apply existing ban enforcement to reactions, consistent with the 3-strike model and preventing ban evasion via reaction spam                                                                          | MEDIUM     | Rate limit: 10 reactions/min per device; ban check: reuse existing fingerprint → ban status lookup before writing |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature                                              | Why Requested                                                                                      | Why Problematic                                                                                                                                                                                                                      | Alternative                                                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating/flying emoji animation on reaction click    | Feels celebratory; used by Facebook Live, Daily.co, Mentimeter, Pigeonhole — "makes it feel alive" | Adds animation bundle weight; distracting at high reaction velocity in a focused Q&A context; introduces motion sensitivity concerns (WCAG 2.3.3); conflicts with the 80kB bundle budget constraint                                  | Static count increment with a brief CSS `scale` pulse on the emoji button (2-3 lines of Tailwind, zero JS bundle cost)                                   |
| Full emoji picker (open emoji set)                   | Users often want to express with any emoji; "why only 6?"                                          | Requires an emoji picker library (~20–50kB gzipped); inconsistent cross-platform rendering (varies by OS emoji font); slows to render at scale; directly violates the 80kB initial JS budget                                         | Fixed 6-emoji palette satisfies 95% of sentiment expression needs in a Q&A context. All surveyed tools cap at 5–8                                        |
| Reactions influence sort order ("most reacted" sort) | "Most reacted questions should bubble up" seems intuitive                                          | Mixing sentiment signal into ranking destroys the intentionality of the existing upvote system. 🤔 and ❤️ have opposite valences — you cannot average emoji counts. Would require a new sort mode UI, increasing host cognitive load | Keep reactions as annotation-only; upvote delta exclusively drives sort order. Add "most reacted" sort only after explicit user demand, as a v2+ feature |
| Multiple reactions of the same emoji from one user   | Power users want to express strong agreement ("I agree so much I'll upvote 5 times")               | Inflates counts dishonestly; easy to game at conferences; undermines the signal value of reaction counts for hosts; no surveyed tool allows this                                                                                     | One reaction per device token per emoji, enforced by DynamoDB Set — same pattern as upvote dedup                                                         |
| Per-session host toggle to enable/disable reactions  | Hosts in formal settings might want to suppress reactions                                          | Adds configuration surface area without clear demand; for a 24h ephemeral tool, host controls should remain minimal; increases host UX complexity                                                                                    | Reactions are on by default. If a host dislikes them they can instruct participants to ignore the feature. Not worth the UI/infra cost at this stage     |
| Reaction analytics export or leaderboard             | "Most reacted question" report for event organizers                                                | All data expires in 24h by design — export is meaningless; adds backend aggregation complexity (separate read path) for data that will be gone; out of scope for ephemeral session model                                             | Not applicable; Nasqa is not an analytics platform                                                                                                       |
| Reactions on Snippets (clipboard items)              | Consistent: if questions have reactions, why not snippets?                                         | Snippets are host-curated content, not audience participation surfaces. Adding reactions to snippets changes the power dynamic — host content should not be publicly rated. Keeps the clipboard's one-directional design intent      | Scope reactions to Questions and Replies only, as specified                                                                                              |

---

## Feature Dependencies

```
[Device Fingerprint (existing)]
    └──required by──> [Reaction dedup (one per emoji per user)]
                          └──required by──> [Toggle-off own reaction]

[AppSync SessionUpdate subscription (existing)]
    └──required by──> [Real-time reaction count broadcast]
                          └──required by──> [Count display for all participants]

[DynamoDB reaction storage (new: reactionSets attribute on Question/Reply items)]
    └──required by──> [Real-time reaction count broadcast]

[Existing rate limiter pattern (minute-bucket counters)]
    └──extends to──> [Reaction rate limiting (10/min per device)]

[Existing ban enforcement (fingerprint → ban status check)]
    └──extends to──> [Reactions blocked for banned participants]

[Reply threading (existing)]
    └──enhanced by──> [Reactions on Replies]

[Focus mode question card (existing)]
    └──enhanced by──> [Reactions visible on focused question card — no extra work]

[Optimistic UI pattern (existing, used by upvotes)]
    └──reused by──> [Optimistic reaction toggle]
```

### Dependency Notes

- **Reaction dedup requires device fingerprint:** The existing localStorage token is the identity unit for "one reaction per user per emoji." This is already the model for upvotes — reactions use the exact same Set-of-fingerprints pattern, just keyed per emoji.
- **Real-time broadcast fits existing subscription:** Reaction events must be added to the SessionUpdate union type as a new event variant (e.g., `REACTION_UPDATED`). No new WebSocket channels or AppSync resolvers needed beyond what the union type already supports.
- **Rate limiting extends existing:** The existing question rate limiter (minute-bucket DynamoDB counter) should be extended to reactions. A higher ceiling (~10 reactions/min) is appropriate since reactions are lower-stakes than question submissions.
- **Reactions on Replies has no extra infra dependency:** REPLY# items are already in DynamoDB; reactions are a new attribute (`reactionSets: { [emoji]: Set<deviceToken> }`). Same data shape as Questions.
- **Optimistic UI is already patterned:** The upvote flow does optimistic local increment then reconciles on broadcast. Reaction toggle uses the same pattern: local state flips immediately, server write confirms, subscription broadcast reconciles all clients.

---

## MVP Definition

### Launch With (v1.2)

Minimum viable reactions feature. All P1 items; the concept is not shippable without these.

- [ ] Fixed 6-emoji palette (👍 ❤️ 🎉 😂 🤔 👀) rendered on each Question card
- [ ] Same palette on each Reply card
- [ ] Toggle own reaction on/off (one per emoji per device fingerprint)
- [ ] Real-time count propagation via existing AppSync subscription (REACTION_UPDATED event)
- [ ] Inline count display ("👍 3") hidden when count is 0
- [ ] Rate limiting for reactions (10/min per device — new minute-bucket counter)
- [ ] Reactions blocked for banned participants (reuse existing ban status check before DynamoDB write)
- [ ] Optimistic UI: local toggle state flips instantly; reconcile on subscription broadcast

### Add After Validation (v1.x)

- [ ] ARIA labels for reaction buttons (e.g., `aria-label="React with thumbs up, 3 reactions"`) — accessibility polish; add after core feature is working
- [ ] i18n aria-label strings (en/es/pt) — low effort once base label is in place

### Future Consideration (v2+)

- [ ] "Most reacted" secondary sort toggle — only build with clear user demand; risks conflating sentiment and ranking
- [ ] Custom emoji palette per session (host configuration) — host UX complexity not warranted for v1; ephemeral sessions make this lower value
- [ ] Reaction analytics / export — requires session persistence beyond 24h (explicitly out of scope)
- [ ] Floating emoji animations — consider only if user feedback strongly requests it AND bundle budget allows after v1.2 ships

---

## Feature Prioritization Matrix

| Feature                              | User Value | Implementation Cost | Priority                             |
| ------------------------------------ | ---------- | ------------------- | ------------------------------------ |
| Fixed palette reactions on Questions | HIGH       | LOW                 | P1                                   |
| Reactions on Replies                 | HIGH       | LOW                 | P1 — same component, same data shape |
| Toggle own reaction on/off           | HIGH       | LOW                 | P1                                   |
| Real-time count for all participants | HIGH       | MEDIUM              | P1                                   |
| Inline count display (hide at 0)     | HIGH       | LOW                 | P1                                   |
| Rate limiting for reactions          | MEDIUM     | LOW                 | P1 — reuses existing infra           |
| Ban enforcement for reactions        | MEDIUM     | LOW                 | P1 — reuses existing check           |
| Optimistic UI                        | HIGH       | LOW                 | P1 — already have the pattern        |
| ARIA labels for reaction buttons     | MEDIUM     | LOW                 | P2                                   |
| i18n aria-label strings              | LOW        | LOW                 | P2                                   |
| Floating emoji animation             | LOW        | MEDIUM              | P3 — bundle budget risk              |
| Full emoji picker                    | LOW        | HIGH                | P3 — do not build for v1.2           |
| "Most reacted" sort                  | LOW        | MEDIUM              | P3 — needs explicit demand           |

**Priority key:**

- P1: Must have for launch
- P2: Should have, add when P1 is complete
- P3: Nice to have / explicitly deferred

---

## Competitor Feature Analysis

| Feature                         | Slido                               | Mentimeter             | Pigeonhole Live         | Zoom Webinar             | Nasqa Live v1.2         |
| ------------------------------- | ----------------------------------- | ---------------------- | ----------------------- | ------------------------ | ----------------------- |
| Where reactions attach          | Poll answer options (not Q&A items) | Whole slide (ambient)  | Session-level (ambient) | Meeting-level (ambient)  | Per-question, per-reply |
| Fixed palette size              | Defined set (Jan 2026 launch)       | 5 symbols              | Customizable, unlimited | 6 standard + extended    | 6 emojis (fixed)        |
| Toggle own reaction off         | Not confirmed                       | Not confirmed          | Not confirmed           | Yes                      | Yes (planned)           |
| One reaction per user per emoji | Not confirmed                       | Not confirmed          | Not confirmed           | Yes (implicit)           | Yes (Set dedup)         |
| Real-time count display         | Yes (on poll answers)               | Via floating animation | Via analytics           | Animation only, no count | Yes (count badge)       |
| Reactions affect sort order     | No                                  | No                     | No                      | N/A                      | No (by design)          |
| Reactions on replies            | No                                  | No                     | No                      | No                       | Yes (differentiator)    |
| Floating animation              | No (poll context)                   | Yes (side of screen)   | Yes (floats on screen)  | Yes (floats up)          | No (CSS pulse only)     |
| Rate limiting on reactions      | No details                          | No details             | No details              | Host can disable all     | Yes (10/min per device) |
| Ban enforcement on reactions    | No                                  | No                     | No                      | No                       | Yes (fingerprint-based) |

**Key insight (MEDIUM confidence):** No surveyed tool attaches reactions at the individual Q&A item level with per-question and per-reply granularity. Slido's reactions are on poll answer options; Mentimeter's float across the whole slide; Pigeonhole and Zoom reactions are session-level ambient signals not anchored to specific content. Nasqa Live's design — reactions pinned to specific items in a threaded Q&A — occupies a different design space and provides more actionable signal to hosts.

---

## Sources

- [Slido: Say it with an emoji](https://whatsnew.slido.com/en/say-it-with-an-emoji-)
- [Slido: What's New January 2026 — emoji reactions on poll answers](https://community.slido.com/product-news-announcements-108/what-s-new-in-slido-january-2026-7498)
- [Slido: Live Q&A features page](https://www.slido.com/features-live-qa)
- [Mentimeter: Reactions from the Audience (Help Center)](https://help.mentimeter.com/en/articles/8069507-reactions-from-the-audience)
- [Pigeonhole Live: Emoji Reactions feature page](https://pigeonholelive.com/features/reactions/)
- [Pigeonhole Live: Product Hunt listing (Q&As, Polls, Chats, Reactions)](https://www.producthunt.com/products/pigeonhole-live)
- [Zoom: Enabling or disabling webinar reactions](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0059191)
- [Zoom: In-meeting reactions overview (Tactiq)](https://tactiq.io/learn/zoom-reactions)
- [Ably: Emoji reactions for in-game chat with React — real-time dedup patterns](https://ably.com/blog/emojis-for-in-game-chat-with-react)
- [LiveLike: Do Reactions Increase Engagement?](https://livelike.com/do-social-media-reactions-increase-user-engagement/)
- [StreamShark: Live Reactions for real-time audience engagement](https://streamshark.io/blog/live-reactions-elevate-your-live-events-with-real-time-audience-engagement/)

---

_Feature research for: emoji reactions on Q&A items (Nasqa Live v1.2)_
_Researched: 2026-03-15_
