# Domain Pitfalls

**Domain:** Real-time presentation session tool (Q&A, live clipboard, anonymous participants)
**Researched:** 2026-03-13
**Confidence:** MEDIUM — AppSync and DynamoDB limits verified via official docs; Shiki, next-intl/SST interaction, and optimistic UI patterns rely on training data and architectural reasoning with LOW→MEDIUM confidence.

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or complete feature failure.

---

### Pitfall 1: AppSync Stale Connections and Missing Keep-Alive Handling

**What goes wrong:** AppSync sends periodic `ka` (keep-alive) messages. If the client does not monitor whether a `ka` has arrived within `connectionTimeoutMs` (acknowledged in `connection_ack`, default 300,000ms / 5 minutes), the connection silently goes stale. Audience members on conference WiFi with spotty network will see a frozen UI with no indication they are disconnected.

**Why it happens:** AppSync automatically shuts down connections after 24 hours. Network interruptions (conference WiFi, mobile switching from WiFi to cellular) can drop the underlying TCP connection without the browser emitting a WebSocket close event. The AWS Amplify subscription client handles this automatically; a custom `aws-appsync` WebSocket client does not.

**Consequences:** Audience members miss real-time snippets and questions without knowing it. The product's core value proposition — sub-200ms live broadcast — silently breaks.

**Warning signs:**
- Users reporting "I stopped seeing updates"
- WebSocket frames visible in DevTools but no `ka` messages arriving
- Connection state in UI shows "connected" but events stop

**Prevention:**
- Use the official `aws-appsync` or Amplify subscription client — it handles keep-alive monitoring, reconnection with exponential backoff, and jitter automatically. Per official docs: "If there is a network error, the client should do a jittered exponential backoff."
- If using a custom client: track `lastKaReceived` timestamp; if `Date.now() - lastKaReceived > connectionTimeoutMs`, explicitly close and reconnect.
- Expose a visible connection-status indicator to the audience ("Live" / "Reconnecting...").

**Phase:** WebSocket / real-time infrastructure phase (before any feature that depends on subscriptions).

---

### Pitfall 2: Single AppSync Subscription Channel Carrying All Event Types — Argument Null Semantics

**What goes wrong:** The project uses a single union-type `SessionUpdate` subscription channel per session, filtered by session slug argument. AppSync has a critical semantic: passing `null` as a subscription argument means "subscribe to events where that field IS null," not "subscribe to all events." Omitting the argument means "subscribe to all." Getting this wrong means a client may receive updates for every session in the system.

**Why it happens:** The distinction between `onSessionUpdate(sessionSlug: null)` and `onSessionUpdate(sessionSlug: "my-slug")` is non-obvious and not enforced at compile time. A developer testing with a null argument will receive unexpected events.

**Consequences:** Cross-session data leakage. Audience members of session A could receive snippets from session B. In production with multiple concurrent sessions, this is a security and privacy failure.

**Warning signs:**
- Subscription receiving events with unexpected `sessionSlug` values in tests
- More subscription events than expected during load testing with multiple sessions

**Prevention:**
- Always pass the session slug as a non-null, non-undefined string in subscription arguments.
- Add a resolver-level filter (VTL or JavaScript resolver) that rejects events whose `sessionSlug` does not match the subscribed value — do not rely solely on argument filtering.
- Test with two concurrent sessions and verify isolation.

**Phase:** GraphQL schema and subscription design phase.

---

### Pitfall 3: DynamoDB Hot Partition from Session-Scoped Write Bursts

**What goes wrong:** All writes for a session use `PK: SESSION#<slug>`. During a popular session, the host rapidly posts snippets while 500 audience members simultaneously vote and submit questions. All writes land on a single DynamoDB partition, which is hard-limited to 1,000 write units/second. A burst of upvotes (many concurrent `UpdateItem` calls) can exhaust the partition capacity and cause throttling.

**Why it happens:** Single-table design collapses all session data behind one PK prefix. The "uniform partition access" principle from official DynamoDB docs is violated during a session spike.

**Consequences:** `ProvisionedThroughputExceededException` errors during peak moments. Upvotes fail silently or cause retry storms. The 24-hour TTL window for sessions means this is most severe during the session itself — exactly when it must work.

**Warning signs:**
- DynamoDB CloudWatch metrics showing `ConsumedWriteCapacityUnits` near provisioned limit
- `SystemErrors` and throttle metrics spiking during demo
- Upvote responses taking >500ms

**Prevention:**
- Use DynamoDB On-Demand (PAY_PER_REQUEST) billing mode instead of provisioned throughput. On-Demand handles burst traffic without pre-provisioning and scales automatically.
- Implement write coalescing for upvotes: rather than one `UpdateItem` per upvote click, batch updates server-side on a short interval (100–250ms) per question, then write the aggregated delta.
- Rate limit the public API: 3 questions/min (already specified in PROJECT.md) reduces sustained write pressure.
- Keep per-session data under the 1,000 WCU/s limit by design: 500 participants × 3 upvotes/min = 25 WCU/s — well within limits, but simultaneous bursts at session start can spike higher.

**Phase:** DynamoDB schema and infrastructure phase.

---

### Pitfall 4: DynamoDB GSI Write Throttling Blocking Base Table Writes

**What goes wrong:** If a GSI is used (e.g., for querying questions sorted by upvote count or by creation time across the session), its write capacity must be provisioned at or above the base table write capacity. If the GSI is under-provisioned, DynamoDB throttles ALL writes to the base table, not just GSI-related ones. This is one of the most counterintuitive DynamoDB behaviors.

**Why it happens:** DynamoDB writes to the GSI synchronously as part of the base table write. If the GSI can't absorb the write, the entire transaction is throttled.

**Consequences:** All question submissions, upvotes, and snippet posts stop working even though base table capacity appears available. The failure is not obvious from base table metrics.

**Warning signs:**
- Base table consumed WCU far below limit but write errors increasing
- GSI `ConsumedWriteCapacityUnits` at or near provisioned limit
- Unexplained write failures during periods with moderate traffic

**Prevention:**
- Use On-Demand billing for both base table and all GSIs — eliminates capacity planning entirely.
- If using GSIs, provision GSI write capacity ≥ base table write capacity.
- Prefer scan + filter over GSI for the 24-hour session lifespan: at 500 participants, the total item count per session is bounded (~50 snippets + ~200 questions + replies). A paginated Query on the base PK with filter is cheaper than a GSI.
- Design access patterns before creating GSIs. For this project, all reads are session-scoped (PK = `SESSION#<slug>`), which means a GSI may not be needed at all.

**Phase:** DynamoDB schema design phase.

---

### Pitfall 5: DynamoDB TTL Does Not Delete Immediately — Expired Items Still Readable

**What goes wrong:** The project relies on 24-hour TTL to auto-expire sessions and all associated data. Official DynamoDB documentation states items are deleted "within a few days" of their TTL timestamp — not within minutes. Expired items remain queryable via Query and Scan until the background sweep deletes them.

**Why it happens:** DynamoDB TTL is a best-effort background process. It prioritizes availability and performance over strict time-bounded deletion.

**Consequences:** After a session's 24-hour TTL, the host could re-enter the session using their bookmarked URL and see old data. A new session with the same slug (if slug reuse is possible) could surface expired data from the previous session.

**Warning signs:**
- Manually expiring items in testing and observing them still present hours later
- A "deleted" session reappearing in participant views

**Prevention:**
- Add a `status` or `expiresAt` attribute to every session item. On all read paths, include a filter expression: `expiresAt > :now` to exclude expired items.
- Use a unique slug generation strategy that makes slug collision after 24 hours statistically impossible (UUIDv4 fragment recommended over human-readable slugs alone).
- Do not rely on TTL for access control. The host secret hash provides the actual security boundary.

**Phase:** DynamoDB schema design phase.

---

### Pitfall 6: Shiki Bundle Exceeding the 80kB Gzipped Budget

**What goes wrong:** Shiki ships with hundreds of languages and themes bundled together. Importing from `shiki` or `shiki/core` without fine-grained tree shaking pulls in multi-megabyte grammars into the client bundle. Even with lazy loading, the initial parse and render of the highlighter can exceed the 80kB JS budget constraint.

**Why it happens:** TextMate grammars are large JSON blobs; each language grammar is 20–200kB uncompressed. Shiki's default bundle imports all of them.

**Consequences:** The initial JS payload constraint (< 80kB gzipped) is violated. Page TTI degrades. On slow conference WiFi, participants experience a multi-second blank or unstyled code snippet.

**Warning signs:**
- `next build` output showing large chunk sizes in `_next/static/chunks/`
- `@next/bundle-analyzer` report showing Shiki in the initial bundle
- Lighthouse "Reduce unused JavaScript" flagging Shiki grammars

**Prevention:**
- Use `createHighlighterCore` from `shiki/core` with explicit `createOnigurumaEngine` and only import the specific language grammars needed (e.g., `shiki/langs/javascript`, `shiki/langs/typescript`, `shiki/langs/python`).
- Render code highlighting server-side in a Next.js Server Component. The Shiki highlighter never ships to the client — only the pre-rendered HTML with inline styles ships. This eliminates Shiki from the client bundle entirely.
- Use `codeToHtml()` in a Server Component with the dual theme option (`themes: { light: 'github-light', dark: 'github-dark' }`) and CSS variable strategy to avoid layout shift on theme toggle without client-side JS.
- If client-side highlighting is unavoidable (e.g., live typing preview), lazy-load Shiki behind `React.lazy` + `Suspense` and only trigger the import after user interaction.

**Phase:** Snippet display / syntax highlighting phase.

---

## Moderate Pitfalls

---

### Pitfall 7: Optimistic UI Race Conditions with Real-Time Subscriptions

**What goes wrong:** The client applies an optimistic update (e.g., upvote count +1) immediately. Simultaneously, the AppSync subscription delivers the server-confirmed state, which may reflect a different upvote count (if other users voted in the same instant). The client must reconcile the optimistic state with the confirmed server state. Without explicit reconciliation, the UI can flicker, show stale counts, or get stuck in an intermediate state.

**Why it happens:** Two write paths exist for the same piece of state: (1) the optimistic local update, and (2) the subscription event. If reconciliation logic identifies the confirmed event by `questionId` but does not also clear the "pending" flag, both states coexist.

**Consequences:** Upvote counter shows wrong value. Users see the count jump backward. In worst case, a failed mutation leaves an optimistic vote applied permanently, causing phantom vote counts.

**Warning signs:**
- Upvote count flickering under rapid clicking
- Counts diverging between two open tabs viewing the same session
- Subscription events triggering unnecessary re-renders with stale data

**Prevention:**
- Use a "pending" state map keyed by item ID. When the subscription event arrives with the authoritative server state, replace the optimistic value and clear the pending flag atomically.
- For upvotes specifically: the server should return the new absolute count, not a delta. The client replaces its local count with the server value on subscription event receipt.
- Use `localStorage` to track voted question IDs. On subscription receipt, if the user has already voted, the server's count is authoritative — do not re-apply the optimistic delta.
- Test by opening two browser tabs and voting simultaneously; the final count in both tabs should converge to the same value.

**Phase:** Real-time subscription + optimistic UI phase.

---

### Pitfall 8: Fingerprint Spoofing and Vote Manipulation

**What goes wrong:** Participant identity is a `localStorage` token (device fingerprint). Any participant can open DevTools, clear localStorage, and generate a new fingerprint — effectively becoming a new anonymous user. This bypasses the 3-strike auto-ban and allows unlimited downvote spam to hide content.

**Why it happens:** Client-controlled identity is inherently spoofable. The design tradeoff (no accounts = no friction) creates a moderation surface.

**Consequences:** Coordinated downvote manipulation can auto-hide legitimate questions (50% downvote threshold). A banned participant can trivially re-enter. A participant can cast multiple upvotes on the same question.

**Warning signs:**
- A question being hidden despite positive sentiment from other participants
- The same question being submitted repeatedly with slightly different wording
- Upvote counts exceeding the number of connected participants

**Prevention:**
- Accept the tradeoff explicitly: this system is designed for semi-trusted live session audiences, not adversarial public internet. The host superuser ban is the primary moderation backstop.
- For upvotes: persist vote state server-side per question (count is in DynamoDB). Use `localStorage` as a UX hint only — always validate against server state on load.
- For downvote threshold: require multiple distinct fingerprints from different network origins (check `X-Forwarded-For`) to count toward the 50% threshold. Don't count consecutive rapid downvotes from the same session as distinct.
- Add a rate limit on downvote API calls per fingerprint per minute (e.g., max 5 downvotes/min).
- The host can always override community moderation. This is the final safety net.
- Do NOT attempt to make fingerprints cryptographically unforgeable without accounts — the complexity will not match the threat model of a live presentation.

**Phase:** Moderation system phase.

---

### Pitfall 9: next-intl Middleware and SST Ion CloudFront Deployment Conflicts

**What goes wrong:** next-intl middleware runs at the Next.js edge layer and redirects bare paths (e.g., `/live/myslug`) to locale-prefixed paths (e.g., `/en/live/myslug`). On SST Ion, Next.js is deployed behind CloudFront with middleware running in a Lambda@Edge or CloudFront Functions context. Middleware that relies on `Accept-Language` headers, cookies, or request rewrites can behave differently in the Lambda@Edge context versus the local dev server.

**Why it happens:** Lambda@Edge has a 1MB response size limit, a 128MB memory limit, and a 5-second timeout for viewer request functions. If next-intl middleware imports large locale message files, cold starts become slow. Additionally, CloudFront may cache redirected responses, causing all users to see the same locale regardless of their browser language.

**Consequences:** All users see one locale. Locale detection fails silently. Cold starts add 500–2000ms latency on first request. Locale-aware redirects cached by CloudFront serve the wrong locale to subsequent users.

**Warning signs:**
- All users consistently redirected to the same locale in production despite different browser settings
- Cold start latency on locale-detection routes significantly higher than other routes
- CloudFront cache-hit metrics high on paths that should be dynamic redirects

**Prevention:**
- Configure next-intl to use the lightweight approach: detect locale from the URL only (no `Accept-Language` detection) for the session view pages, since the host shares a direct URL with the locale already embedded (e.g., `https://nasqa.live/en/live/myslug`).
- Limit middleware to only run on routes that need locale detection (the landing page). Session pages have the slug in the path — exclude them from middleware with a precise `matcher`.
- Set `Cache-Control: no-store` on middleware responses that perform locale redirects to prevent CloudFront from caching them.
- Keep middleware lean: do not import translation files in middleware. Middleware should only redirect/rewrite URLs, not load content.
- Test in a staging SST deploy (not just `next dev`) before considering this solved.

**Phase:** i18n routing phase, and again during SST deployment / infrastructure phase.

---

### Pitfall 10: Host Secret Transmitted as Query Parameter — Leaks in Server Logs

**What goes wrong:** The host URL contains the secret as a query parameter (`?hostSecret=...`) for bookmark-based re-entry. AWS CloudFront, Lambda, and SST access logs record full request URLs including query parameters. Application monitoring tools (CloudWatch, third-party analytics) will capture and store the host secret in plaintext.

**Why it happens:** Convenience-driven design: embedding a secret in a URL is easy but fundamentally insecure because URLs are logged by default at every layer.

**Consequences:** A compromised log store exposes all host secrets. Any participant who sees the browser's address bar or URL autocomplete on a shared device can obtain the host secret.

**Prevention:**
- The secret is already hashed (SHA-256) before storage per PROJECT.md — but the raw secret is still transmitted in the URL.
- Verify the secret is transmitted only over HTTPS (enforced by CloudFront).
- Use hash fragments instead of query parameters (`#hostSecret=...`): hash fragments are not sent to the server, so they do not appear in any server logs.
- Alternatively, immediately redirect after re-entry: receive the secret from the URL, POST it to a session-specific endpoint to exchange it for a short-lived session cookie, then redirect to the same URL without the secret parameter.
- At minimum, exclude `hostSecret` from CloudFront access log fields and suppress it in CloudWatch logging.

**Phase:** Host authentication / session creation phase.

---

### Pitfall 11: AppSync 200 Subscriptions Per Connection Limit

**What goes wrong:** Official AppSync quotas allow 200 subscriptions per WebSocket connection. This project uses a single subscription per session per client, so this limit is not a concern for individual clients. However, if the Lambda resolver attempts to fan out subscription publishes by programmatically creating subscriptions server-side, this limit applies.

**Why it happens:** Architectural confusion between client-side subscriptions (200 per connection) and server-side mutation-triggered broadcasts. The single union-type channel design avoids this entirely.

**Consequences:** If the implementation deviates from the single-channel design and creates per-event-type subscriptions per client, browser tab reopening could exhaust the limit and cause silent subscription failures.

**Warning signs:**
- Subscriptions silently failing to receive events after the 200th active subscription in a client session
- No error thrown — events simply stop arriving

**Prevention:**
- Maintain the single `SessionUpdate` union-type channel design specified in PROJECT.md. Each client has exactly one active subscription per live session page.
- Never create dynamic subscriptions per feature (e.g., one for snippets, one for questions, one for upvotes). The union type handles all event types on one connection.

**Phase:** GraphQL schema design phase.

---

## Minor Pitfalls

---

### Pitfall 12: Community Moderation 50% Threshold Calculated Against Wrong Denominator

**What goes wrong:** The downvote threshold is "50% of connected audience." The number of connected audience members is not directly stored — it must be inferred from AppSync connection count or maintained separately. If the denominator is calculated wrong (e.g., using total session participants ever rather than currently connected), the threshold becomes meaningless.

**Prevention:**
- Track connected participant count via AppSync connection/disconnection events (Lambda resolvers can maintain a `CONNECTED_COUNT` item in DynamoDB with atomic increments/decrements).
- If counting connected participants is too complex for MVP, use a fixed threshold (e.g., 5 downvotes) combined with a percentage floor. This avoids the denominator problem for small sessions.

**Phase:** Moderation system phase.

---

### Pitfall 13: localStorage Fingerprint Absent in Safari Private Browsing

**What goes wrong:** Safari in Private Browsing mode throws a `QuotaExceededError` when attempting to write to `localStorage`, even if the quota has not been reached. Code that does not guard against this will crash, and participants on iPhones using Private Browse (common for anonymous-by-default audience behavior) will get errors.

**Prevention:**
- Wrap all `localStorage` reads/writes in try-catch.
- Fall back to an in-memory fingerprint for the current page session if `localStorage` is unavailable. Moderation consistency will be weaker but the page will not crash.
- Test on mobile Safari in Private Browsing before launch.

**Phase:** Participant identity / fingerprinting phase.

---

### Pitfall 14: Slug Collision Risk with Human-Readable Slugs

**What goes wrong:** If the session slug is derived only from the session title (e.g., "My Talk" → `my-talk`), two speakers creating sessions with the same title will collide. The first session's data would be overwritten or mixed.

**Prevention:**
- Append a UUIDv4 fragment to the slug (e.g., `my-talk-a3f7`). This is already partially implied by the UUIDv4 `hostSecret` in PROJECT.md.
- Alternatively, use a fully random UUID as the slug with no title derivation.
- Add a DynamoDB conditional write on session creation to detect collisions and retry with a new slug if one occurs.

**Phase:** Session creation phase.

---

### Pitfall 15: Missing GraphQL Subscription Filter on Session Slug Server-Side

**What goes wrong:** AppSync subscription argument filtering is client-declared, not server-enforced by default. A malicious client sending WebSocket messages with a modified subscription argument could subscribe to a different session's updates.

**Prevention:**
- Implement a Lambda subscription resolver that validates `sessionSlug` against the requesting client's context before allowing the subscription to activate.
- Add an AppSync JavaScript resolver for the `SessionUpdate` subscription that checks `ctx.args.sessionSlug` is non-null and non-empty.

**Phase:** GraphQL schema and AppSync resolver phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| GraphQL schema design | Null argument semantics (Pitfall 2) | Test subscription isolation between two sessions before any feature work |
| DynamoDB schema / infra | Hot partitions (Pitfall 3), GSI throttle (Pitfall 4), TTL delay (Pitfall 5) | Use On-Demand billing; filter expired items in application code |
| Host session creation | Secret in URL logs (Pitfall 10), slug collision (Pitfall 14) | Use hash fragments for secret; append UUID to slugs |
| Snippet display | Shiki bundle size (Pitfall 6) | Server-render Shiki; never ship highlighter to client |
| Real-time subscriptions | Stale connections (Pitfall 1), cross-session leakage (Pitfall 2) | Use Amplify client or implement keep-alive monitoring; add server-side filter |
| Optimistic UI | Race conditions (Pitfall 7) | Replace optimistic value with server authoritative value on subscription event |
| Moderation system | Fingerprint spoofing (Pitfall 8), wrong threshold denominator (Pitfall 12) | Track connected count in DynamoDB; rate-limit downvotes |
| i18n routing | Middleware + CloudFront caching (Pitfall 9) | Lean middleware; hash-fragment locale fallback; test on staging deploy |
| Participant identity | Safari Private Browsing crash (Pitfall 13) | Guard all localStorage calls with try-catch |
| AppSync connection mgmt | 200 subscriptions/connection limit (Pitfall 11), subscription filter bypass (Pitfall 15) | Single union channel; server-side slug validation in subscription resolver |

---

## Sources

- AWS AppSync WebSocket Client documentation (verified, HIGH confidence): https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html
- AWS AppSync Service Quotas — subscription and connection limits (verified, HIGH confidence): https://docs.aws.amazon.com/general/latest/gr/appsync.html
- AWS AppSync Subscription behaviors and argument null semantics (verified, HIGH confidence): https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AWS DynamoDB Partition Key Design best practices (verified, HIGH confidence): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- AWS DynamoDB GSI pitfalls and write throttling (verified, HIGH confidence): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS DynamoDB TTL delays and limitations (verified, HIGH confidence): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Next.js i18n routing documentation (verified, MEDIUM confidence): https://nextjs.org/docs/app/guides/internationalization
- Shiki bundle size, Server Component rendering strategy — training data + architectural reasoning (LOW confidence, needs validation against shiki.style/guide/bundles)
- next-intl + SST Ion middleware interaction — training data + architectural reasoning (LOW confidence, needs validation in staging deployment)
- Optimistic UI race conditions with subscriptions — training data + architectural reasoning (MEDIUM confidence, well-understood pattern)
- Safari Private Browsing localStorage behavior — training data (MEDIUM confidence, documented browser behavior)
- URL query parameter logging — architectural reasoning (MEDIUM confidence)
