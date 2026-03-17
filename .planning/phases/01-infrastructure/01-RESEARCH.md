# Phase 1: Infrastructure - Research

**Researched:** 2026-03-14
**Domain:** SST Ion v4 + AppSync + DynamoDB single-table + Lambda resolvers
**Confidence:** HIGH (stack verified from codebase package.json + official SST/AWS docs)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- JavaScript resolvers (not VTL, not pure Lambda)
- Enhanced server-side filtering for subscription session isolation (not argument-based)
- API key authentication for all requests — host secret validated inside resolver logic, not at the auth layer
- Hybrid resolver strategy: simple reads resolve directly to DynamoDB, writes go through Lambda for validation and business logic
- On-demand billing mode (pay-per-request) — handles session spikes without pre-provisioning
- Single-table design as specified in PROJECT.md (PK: SESSION#slug)
- Types generated from GraphQL schema (codegen) — single source of truth
- Dev environment only for now (no staging, no prod yet)
- AWS region: us-east-1
- Deploy command: `npm run deploy` wrapper script that runs pre-checks (lint, type-check) then `sst deploy`
- Single-command deploy is a hard requirement — no manual AWS Console steps

### Claude's Discretion

- Schema management approach (schema-first vs code-first)
- Subscription event type pattern (true union vs tagged union with AWSJSON)
- Error response format (standard GraphQL errors vs result union types)
- API key lifecycle management
- Batch operation implementation (clearClipboard)
- GSI decisions based on access pattern analysis
- TTL attribute name
- DynamoDB backup strategy (PITR or none)
- Resolver file organization in monorepo
- Infrastructure file splitting strategy
- Resource naming convention
- SST stage naming convention

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                      | Research Support                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| INFRA-01 | DynamoDB single-table design (PK: SESSION#slug, SK: METADATA \| SNIPPET# \| QUESTION# \| REPLY#) | Table key schema, TTL config, On-demand billing via SST Dynamo component                  |
| INFRA-02 | AppSync WebSocket subscriptions via single union-type SessionUpdate channel per session          | AppSync schema design, @aws_subscribe directive, enhanced filter resolver                 |
| INFRA-03 | AppSync subscription validates non-null sessionSlug to prevent cross-session leakage             | extensions.setSubscriptionFilter with eq operator in JavaScript resolver response handler |
| INFRA-04 | SST Ion IaC: `sst deploy` provisions all AWS resources without manual intervention               | sst.config.ts run() function, sst.aws.AppSync + sst.aws.Dynamo + sst.aws.Function         |
| INFRA-09 | ULID for sortable DynamoDB sort keys (reverse-chronological feeds)                               | ulid npm package (v2.3.0+), monotonicFactory for same-millisecond ordering                |

</phase_requirements>

---

## Summary

Phase 1 provisions the AWS backend using SST Ion v4 so all feature work starts from a known-good infrastructure baseline. The existing codebase is already scaffolded with an `sst.config.ts` stub, an empty GraphQL schema at `infra/schema.graphql`, and skeleton `@nasqa/functions` and `@nasqa/core` packages — but none of the actual resources are wired up yet.

The three primary IaC work items are: (1) define a `sst.aws.Dynamo` table with PK/SK string keys and a TTL attribute; (2) define a `sst.aws.AppSync` API pointing to `infra/schema.graphql` with API key auth and a Lambda data source; (3) expand the GraphQL schema to include the full type set (Session, Snippet, Question, Reply, SessionUpdate) plus stub resolvers. Additionally, `ulid`, `qrcode`, and `@aws-amplify/api-graphql` packages must be installed into their respective workspace packages.

The user decision to use JavaScript resolvers (not VTL) is directly supported by SST Ion's `addResolver` API with a `code` property. Enhanced subscription filtering via `extensions.setSubscriptionFilter` is the correct server-side isolation mechanism confirmed by official AWS AppSync docs. The tagged-union approach (`type SessionUpdate { type: String!, payload: AWSJSON! }`) is the recommended subscription event pattern because AppSync's native GraphQL union support in subscriptions is inconsistent across configurations.

**Primary recommendation:** Implement SST resources in `sst.config.ts` run(), keep the GraphQL schema schema-first at `infra/schema.graphql`, and place JavaScript resolver code files in `infra/resolvers/`.

---

## Standard Stack

### Core

| Library                  | Version                                  | Purpose                                        | Why Standard                                                                              |
| ------------------------ | ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| sst                      | 4.2.7 (installed)                        | IaC — provisions AppSync, DynamoDB, Lambda     | Ion v4 uses Pulumi backend, eliminates CloudFormation drift; already in root package.json |
| @aws-sdk/client-dynamodb | 3.1009.0 (installed in @nasqa/functions) | Low-level DynamoDB client                      | Modular v3 SDK; tree-shaken                                                               |
| @aws-sdk/lib-dynamodb    | 3.1009.0 (installed in @nasqa/functions) | DynamoDB Document client                       | Auto-converts JS objects to DynamoDB AttributeValue format                                |
| ulid                     | ^2.3.0 (NOT YET INSTALLED)               | Lexicographically sortable IDs for SK ordering | Time-ordered, monotonic, no GSI needed for chron queries                                  |
| zod                      | 4.3.6 (installed in @nasqa/core)         | Input validation in resolvers                  | Single schema source shared between frontend and backend                                  |

### Supporting

| Library                  | Version                    | Purpose                                          | When to Use                                                              |
| ------------------------ | -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| @aws-amplify/api-graphql | ^6.x (NOT YET INSTALLED)   | AppSync WebSocket subscription client (frontend) | Phase 1 installs package only; used in Phase 3 for SubscriptionProvider  |
| qrcode                   | ^1.5.4 (NOT YET INSTALLED) | QR code SVG generation                           | Phase 1 installs package only; used in Phase 2 for session creation page |
| @types/qrcode            | ^1.5.5 (NOT YET INSTALLED) | TypeScript types for qrcode                      | Dev dependency in packages/frontend                                      |

### Alternatives Considered

| Instead of                                | Could Use                  | Tradeoff                                                                                                    |
| ----------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Tagged union `{ type, payload: AWSJSON }` | True GraphQL union type    | Native union inconsistently supported by AppSync subscriptions — tagged union is pragmatic and always works |
| JavaScript resolvers (APPSYNC_JS runtime) | VTL templates              | Locked by user decision; JS is more readable/testable                                                       |
| On-demand billing                         | Provisioned capacity       | On-demand handles bursts without pre-planning; locked by user decision                                      |
| Schema-first (`infra/schema.graphql`)     | Code-first (construct API) | Schema-first is standard for AppSync; enables IDE tooling and codegen                                       |

**Installation:**

```bash
# In packages/functions — ULID for resolver SK generation
npm install ulid --workspace=packages/functions

# In packages/frontend — subscription client and QR code (install now, use later)
npm install @aws-amplify/api-graphql qrcode --workspace=packages/frontend
npm install -D @types/qrcode --workspace=packages/frontend
```

---

## Architecture Patterns

### Recommended Project Structure

```
nasqa-clip/
├── sst.config.ts              # IaC entry point — run() wires all resources
├── infra/
│   ├── schema.graphql         # GraphQL schema — source of truth (ALREADY EXISTS, needs expansion)
│   └── resolvers/             # JavaScript resolver files (APPSYNC_JS runtime)
│       ├── subscription-onSessionUpdate.js   # Enhanced filter resolver
│       └── query-stub.js      # Stub resolver for health check
├── packages/
│   ├── core/src/
│   │   ├── types.ts           # Entity interfaces (expand from stub)
│   │   └── schemas.ts         # Zod schemas (expand from stub)
│   └── functions/src/
│       └── resolvers/         # Lambda resolver handlers (writes/mutations)
│           └── example.ts     # Existing stub — replace with real resolvers per phase
└── package.json               # Workspace root — add deploy script
```

### Pattern 1: SST Ion Resource Definition in sst.config.ts

**What:** All AWS resources defined in the `run()` function of `sst.config.ts`. DynamoDB table created first (no dependencies), then AppSync (depends on table ARN), then Lambda functions (depend on table).
**When to use:** Always — this is the SST Ion pattern.

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: "nasqa-clip",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // 1. DynamoDB table — no dependencies
    const table = new sst.aws.Dynamo("NasqaTable", {
      fields: {
        PK: "string",
        SK: "string",
      },
      primaryIndex: { hashKey: "PK", rangeKey: "SK" },
      ttl: "TTL",
      // On-demand billing: use transform to pass billingMode to the underlying resource
      transform: {
        table: {
          billingMode: "PAY_PER_REQUEST",
        },
      },
    });

    // 2. AppSync API — depends on table ARN for data source
    const api = new sst.aws.AppSync("NasqaApi", {
      schema: "infra/schema.graphql",
      // API key auth is the default when no auth block is specified
      // or configure explicitly via transform if needed
    });

    // 3. Lambda data source (for mutations/writes)
    const lambdaDS = api.addDataSource({
      name: "lambdaDS",
      lambda: {
        handler: "packages/functions/src/resolvers/index.handler",
        environment: {
          TABLE_NAME: table.name,
        },
        link: [table],
      },
    });

    // 4. Subscription resolver (JavaScript — enhanced filter)
    api.addResolver("Subscription onSessionUpdate", {
      dataSource: "NONE", // Subscriptions use NONE data source
      code: `
        import { util, extensions } from '@aws-appsync/utils';
        export function request(ctx) { return { payload: null }; }
        export function response(ctx) {
          extensions.setSubscriptionFilter(
            util.transform.toSubscriptionFilter({
              sessionSlug: { eq: ctx.args.sessionSlug }
            })
          );
          return null;
        }
      `,
    });

    return {
      apiUrl: api.url,
      apiKey: api.apiKey,
      tableName: table.name,
    };
  },
});
```

**Source:** https://sst.dev/docs/component/aws/app-sync/ + https://sst.dev/docs/component/aws/dynamo/ (HIGH confidence for resource shapes; MEDIUM confidence for `transform.table.billingMode` — verify during implementation as this uses Pulumi's underlying `aws.dynamodb.Table` args)

### Pattern 2: JavaScript Resolver for AppSync Subscriptions (Enhanced Filter)

**What:** The subscription resolver uses the APPSYNC_JS runtime to apply enhanced server-side filtering. It does NOT back onto a real data source — it uses a NONE data source type. The filter ensures only events matching the subscriber's `sessionSlug` argument are delivered.
**When to use:** For the `Subscription.onSessionUpdate` field only.

```javascript
// infra/resolvers/subscription-onSessionUpdate.js
// Source: https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html
import { extensions, util } from "@aws-appsync/utils";

export function request(ctx) {
  // Subscriptions always return { payload: null }
  return { payload: null };
}

export function response(ctx) {
  // Non-null guard — rejects subscriptions without a slug
  if (!ctx.args.sessionSlug) {
    util.error("sessionSlug argument is required", "Unauthorized");
  }

  // Server-side filter: only deliver events for the subscriber's session
  extensions.setSubscriptionFilter(
    util.transform.toSubscriptionFilter({
      sessionSlug: { eq: ctx.args.sessionSlug },
    }),
  );

  return null;
}
```

**Critical:** Once `extensions.setSubscriptionFilter()` is called, argument-based filtering is DISABLED and only the enhanced filter applies. This is why server-side enhanced filtering was chosen over argument-based filtering — it cannot be bypassed by a null argument from the client.

**Source:** https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html (HIGH confidence)

### Pattern 3: DynamoDB Single-Table Key Design

**What:** All entities share one DynamoDB table. PK is always `SESSION#{slug}`. SK prefix determines entity type. ULID provides time-ordered SK values without a GSI.
**When to use:** For every DynamoDB write in the project.

```typescript
// Exact SK patterns confirmed in ARCHITECTURE.md
// PK                    SK                              Entity
// SESSION#<slug>        METADATA                        Session record
// SESSION#<slug>        SNIPPET#<ulid>                  Snippet
// SESSION#<slug>        QUESTION#<ulid>                 Question
// SESSION#<slug>        REPLY#<qUlid>#<rUlid>           Reply
// SESSION#<slug>        BAN#<fingerprint>               Banned participant
// RATELIMIT#<slug>#<fp> MINUTE#<minuteEpoch>            Rate limit counter

// ULID generation in Lambda resolvers:
import { ulid } from "ulid";

const sk = `SNIPPET#${ulid()}`; // e.g., "SNIPPET#01HN7MFQZ3KTBCTP9J8QX4Y6WS"
```

**Note on `monotonicFactory`:** For normal usage (one write per request), `ulid()` alone is sufficient. `monotonicFactory` is only needed when generating multiple ULIDs within the same millisecond in a tight loop — not needed for this phase.

### Pattern 4: GraphQL Schema Design (Tagged Union for SessionUpdate)

**What:** Use a tagged union type (`{ type: String!, payload: AWSJSON! }`) instead of a native GraphQL union for the subscription return type. This avoids AppSync's inconsistent union support in subscriptions.
**When to use:** For `SessionUpdate` subscription return type.

```graphql
# infra/schema.graphql
# Source: ARCHITECTURE.md (verified against AppSync union limitation)

schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

# Core entity types
type Session {
  slug: String!
  title: String!
  isActive: Boolean!
  createdAt: AWSTimestamp!
  TTL: AWSTimestamp!
}

type Snippet {
  id: String! # ULID
  sessionSlug: String!
  type: String! # "text" | "code"
  content: String!
  language: String # null for text snippets
  createdAt: AWSTimestamp!
}

type Question {
  id: String! # ULID
  sessionSlug: String!
  text: String!
  fingerprint: String!
  authorName: String
  upvoteCount: Int!
  downvoteCount: Int!
  isHidden: Boolean!
  isFocused: Boolean!
  isBanned: Boolean!
  createdAt: AWSTimestamp!
}

type Reply {
  id: String! # ULID
  questionId: String!
  sessionSlug: String!
  text: String!
  isHostReply: Boolean!
  fingerprint: String!
  createdAt: AWSTimestamp!
}

# Discriminated union for real-time events
enum SessionEventType {
  SNIPPET_ADDED
  SNIPPET_DELETED
  CLIPBOARD_CLEARED
  QUESTION_ADDED
  QUESTION_UPDATED
  REPLY_ADDED
  PARTICIPANT_BANNED
}

# Tagged union: type discriminator + JSON payload
# Avoids AppSync's inconsistent native union subscription support
type SessionUpdate {
  eventType: SessionEventType!
  sessionSlug: String!
  payload: AWSJSON!
}

type Query {
  # Stub for schema compilation
  _empty: String
}

type Mutation {
  # Stub mutations — full implementations in later phases
  _stub: String
}

type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate @aws_subscribe(mutations: ["_stub"])
}
```

**Note:** The `@aws_subscribe` directive lists mutation names. Add real mutation names as they are implemented in later phases. The stub `_stub` mutation ensures the subscription field compiles without error in Phase 1.

### Anti-Patterns to Avoid

- **Argument-based subscription filtering only:** AppSync null-argument semantics mean `onSessionUpdate(sessionSlug: null)` subscribes to ALL sessions. Always use enhanced server-side filtering (`extensions.setSubscriptionFilter`) as the enforcement mechanism (INFRA-03 requirement).
- **Deploying via SST v2 CDK patterns:** SST Ion v4 uses `sst.aws.*` constructors in `run()`, NOT `new Stack()` or CDK constructs. The APIs are completely different.
- **Using `@aws-sdk/client-dynamodb` directly:** Always use `DynamoDBDocumentClient` from `@aws-sdk/lib-dynamodb` — it handles AttributeValue marshaling automatically.
- **Putting Lambda handler path as a relative string from cwd:** SST Ion Lambda paths must be relative to the `sst.config.ts` location, not the calling file.
- **Using VTL for subscription resolver:** The decision is JavaScript resolvers. Use `APPSYNC_JS` runtime with `request`/`response` exports.

---

## Don't Hand-Roll

| Problem                                | Don't Build                           | Use Instead                                                    | Why                                                                                                                                                       |
| -------------------------------------- | ------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sortable time-ordered IDs              | Custom timestamp+random string        | `ulid` package                                                 | ULID spec handles monotonicity, collision avoidance, and correct lexicographic ordering — edge cases in custom implementations cause silent sort failures |
| DynamoDB attribute marshaling          | Manual `{ S: "value" }` construction  | `DynamoDBDocumentClient` from `@aws-sdk/lib-dynamodb`          | Raw client requires every attribute to be typed; Document client auto-marshals JS objects                                                                 |
| AppSync subscription session isolation | Custom topic-per-session architecture | `extensions.setSubscriptionFilter` in subscription JS resolver | Server-side enhanced filtering is built-in AppSync; custom topic management requires connection tracking Lambda and external state                        |
| IaC resource provisioning              | Manual AWS Console clicks             | `sst deploy` via `sst.config.ts`                               | Locked user requirement; all resources reproducible and version-controlled                                                                                |
| QR code SVG generation                 | Canvas drawing code                   | `qrcode` npm package (server-side `toString('svg')`)           | QR encoding spec is complex; `qrcode` handles error correction levels, version selection, and SVG output                                                  |

**Key insight:** AppSync subscription filtering is the most commonly hand-rolled in error. The enhanced filter approach was explicitly chosen to avoid the argument-null-semantics trap — don't implement custom session isolation logic.

---

## Common Pitfalls

### Pitfall 1: DynamoDB On-Demand Billing Not Set (Default is Provisioned)

**What goes wrong:** If `transform.table.billingMode` is not explicitly set, SST Ion's `Dynamo` component may create the table with provisioned throughput. On-demand is locked in user decisions.
**Why it happens:** SST Ion's `Dynamo` component does not expose a first-class `billing` property — you must use the `transform.table` escape hatch to pass Pulumi `aws.dynamodb.TableArgs` directly.
**How to avoid:** Set `transform: { table: { billingMode: "PAY_PER_REQUEST" } }` in the Dynamo constructor. Verify post-deploy that the table shows "On-demand" in the AWS Console.
**Warning signs:** `ProvisionedThroughputExceededException` errors during testing; table in Console shows `BillingMode: PROVISIONED` with 5 RCU/5 WCU defaults.

### Pitfall 2: Subscription Resolver NONE Data Source

**What goes wrong:** Using a Lambda or DynamoDB data source for the subscription resolver causes runtime errors — AppSync subscription resolvers must use the NONE data source type.
**Why it happens:** Subscription resolvers in AppSync don't invoke a backing data source; they only register filters and return null.
**How to avoid:** Declare the subscription resolver with `dataSource: "NONE"` (or the SST Ion equivalent for a local resolver with no data source). The resolver body only calls `extensions.setSubscriptionFilter` and returns null.
**Warning signs:** AppSync returns "Resolver mapping template execution error" on subscription connect; resolver logs show "data source invocation failed."

### Pitfall 3: @aws_subscribe Mutation Names Must Match Exactly

**What goes wrong:** The `@aws_subscribe(mutations: [...])` directive requires exact mutation field names as they appear in the schema. A typo or name mismatch means the subscription never triggers.
**Why it happens:** Schema compilation succeeds even with names that don't match real mutations. AppSync doesn't warn at deploy time.
**How to avoid:** In Phase 1 stubs, use `_stub` as a placeholder. As mutations are added in later phases, update the `@aws_subscribe` list to include each mutation by its exact schema name. Test by calling a mutation and verifying the subscription event fires.
**Warning signs:** Subscription connects successfully but no events are received after mutations.

### Pitfall 4: `ulid` Package Types

**What goes wrong:** The `ulid` package (v2.x) includes TypeScript types but early v2 versions required `@types/ulid` separately. Installing the wrong combination causes type errors.
**Why it happens:** Type bundling was added partway through the v2 lifecycle.
**How to avoid:** Install `ulid@^2.3.0`. The current v3.0.1 release bundles types. If using v2, check whether `@types/ulid` is needed by verifying `import { ulid } from 'ulid'` compiles with no type errors.
**Warning signs:** TypeScript error "Could not find a declaration file for module 'ulid'".

### Pitfall 5: SST Ion Stage Naming and Region

**What goes wrong:** SST Ion defaults the stage to the local developer's username. If AWS credentials are set for a different region than us-east-1, resources are created in the wrong region.
**Why it happens:** SST reads region from the AWS profile/environment. The sst.config.ts doesn't force a region unless explicitly set.
**How to avoid:** Either set `AWS_REGION=us-east-1` in the deploy script, or add `region: "us-east-1"` to the app config. The `npm run deploy` script should enforce this.
**Warning signs:** AppSync and DynamoDB appear in an unexpected region; cross-region latency increases; SST output shows wrong region.

### Pitfall 6: Extended TTL Delay — Items Readable After Expiry

**What goes wrong:** DynamoDB TTL deletion is best-effort and may lag by hours. A session with a 24h TTL could still be returned by queries for up to 48h after the TTL timestamp.
**Why it happens:** DynamoDB TTL is a background sweep process, not a hard expiry gate (confirmed in official AWS docs).
**How to avoid:** All read resolvers (implemented in later phases) must include a filter expression: `FilterExpression: "TTL > :now"` where `:now` is the current Unix epoch. Phase 1 must ensure the TTL attribute name is consistent across all item writes so later phases can rely on it.
**Warning signs:** Expired session data appears in queries during testing; old data appears when slug is reused.

---

## Code Examples

Verified patterns from official sources:

### SST Ion Dynamo Table Definition

```typescript
// Source: https://sst.dev/docs/component/aws/dynamo/ (HIGH confidence)
const table = new sst.aws.Dynamo("NasqaTable", {
  fields: {
    PK: "string",
    SK: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
  ttl: "TTL",
  transform: {
    table: {
      billingMode: "PAY_PER_REQUEST",
    },
  },
});
```

### SST Ion AppSync with Lambda Data Source

```typescript
// Source: https://sst.dev/docs/component/aws/app-sync/ (HIGH confidence)
const api = new sst.aws.AppSync("NasqaApi", {
  schema: "infra/schema.graphql",
});

const lambdaDS = api.addDataSource({
  name: "lambdaDS",
  lambda: {
    handler: "packages/functions/src/resolvers/index.handler",
    environment: {
      TABLE_NAME: table.name,
    },
    link: [table], // Grants Lambda IAM permissions to the table
  },
});
```

### AppSync JavaScript Resolver (Subscription with Enhanced Filter)

```javascript
// Source: https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html (HIGH confidence)
// File: infra/resolvers/subscription-onSessionUpdate.js
import { extensions, util } from "@aws-appsync/utils";

export function request(ctx) {
  return { payload: null };
}

export function response(ctx) {
  if (!ctx.args.sessionSlug) {
    util.error("sessionSlug is required", "Unauthorized");
  }
  extensions.setSubscriptionFilter(
    util.transform.toSubscriptionFilter({
      sessionSlug: { eq: ctx.args.sessionSlug },
    }),
  );
  return null;
}
```

### DynamoDB Document Client (Lambda resolver pattern)

```typescript
// Source: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html (HIGH confidence)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Write a session metadata item
await docClient.send(
  new PutCommand({
    TableName: process.env.TABLE_NAME!,
    Item: {
      PK: `SESSION#${slug}`,
      SK: "METADATA",
      title,
      hostSecretHash,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000),
      TTL: Math.floor(Date.now() / 1000) + 86400,
    },
  }),
);
```

### ULID Generation

```typescript
// Source: https://www.npmjs.com/package/ulid (HIGH confidence — official npm)
import { ulid } from "ulid";

const snippetId = ulid(); // "01HN7MFQZ3KTBCTP9J8QX4Y6WS"
const sk = `SNIPPET#${snippetId}`;

// Sorting: ULIDs with the same timestamp prefix sort lexicographically
// DynamoDB Query with SK begins_with "SNIPPET#" returns snippets in creation order
```

### npm run deploy Wrapper Script

```json
// package.json — root workspace
{
  "scripts": {
    "dev": "npm run dev --workspace=packages/frontend",
    "build": "npm run build --workspace=packages/frontend",
    "lint": "npm run lint --workspace=packages/frontend",
    "typecheck": "npm run typecheck --workspace=packages/core && npm run typecheck --workspace=packages/functions",
    "deploy": "npm run lint && npm run typecheck && AWS_REGION=us-east-1 sst deploy"
  }
}
```

---

## State of the Art

| Old Approach                                  | Current Approach                                                        | When Changed   | Impact                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| SST v2 (CDK-based)                            | SST Ion v4 (Pulumi-based)                                               | 2024           | `sst.aws.*` component API replaces CDK constructs; no more CloudFormation drift        |
| VTL mapping templates                         | JavaScript resolvers (APPSYNC_JS runtime)                               | 2022 (GA 2023) | Full JS/TS logic in resolvers; testable and readable; eliminates VTL's arcane syntax   |
| `aws-appsync` npm package                     | `@aws-amplify/api-graphql`                                              | 2023           | `aws-appsync` is unmaintained; Amplify v6 is the current supported subscription client |
| AppSync argument-based subscription filtering | Enhanced subscription filtering with `extensions.setSubscriptionFilter` | 2021           | Server-enforced filtering; argument-null bypass impossible                             |

**Deprecated/outdated:**

- `aws-appsync` npm package: unmaintained, do not use — use `@aws-amplify/api-graphql`
- VTL (Velocity Template Language) resolvers: still supported but superseded by JavaScript resolvers — locked out by user decision anyway
- SST v2 CDK `AppSyncApi` construct: different API surface — do not reference v2 docs

---

## Open Questions

1. **SST Ion `transform.table.billingMode` exact API**
   - What we know: SST's `Dynamo` component exposes a `transform` property that passes through to the underlying Pulumi `aws.dynamodb.Table` resource
   - What's unclear: Whether `billingMode: "PAY_PER_REQUEST"` is the exact string Pulumi expects, or if it differs from the CloudFormation/CDK value
   - Recommendation: During implementation, verify by running `sst deploy` with the flag and confirming table billing mode in AWS Console. Fallback: check `aws.dynamodb.Table` Pulumi docs for the exact billingMode string.

2. **SST Ion AppSync API key output property name**
   - What we know: AppSync resources in SST Ion return an `url` property; the API key property name is not confirmed in official docs fetched
   - What's unclear: Whether it's `api.apiKey`, `api.key`, or accessed via `sst.aws.AppSync.apiKey` output
   - Recommendation: Check SST Ion AppSync component outputs at https://sst.dev/docs/component/aws/app-sync/ during implementation. May need to use the `transform` escape hatch to access the raw Pulumi resource's API key output.

3. **`dataSource: "NONE"` API in SST Ion addResolver**
   - What we know: AppSync subscription resolvers require a NONE data source; SST Ion's `addResolver` accepts a `dataSource` property
   - What's unclear: Whether SST Ion automatically handles NONE data source or if you must explicitly add it via `addDataSource({ name: "noneDS", type: "NONE" })` first
   - Recommendation: The SST Ion docs show Lambda data sources as the primary example. Check if NONE is a special string value or needs a separate data source registration. May need to use `api.addDataSource({ name: "noneDS" })` with no lambda/dynamodb property.

4. **`link` property availability on Lambda inside `addDataSource`**
   - What we know: SST Ion Lambda functions defined standalone use `link: [table]` for IAM permissions
   - What's unclear: Whether the inline Lambda definition inside `addDataSource` supports the `link` property or requires manual IAM grants
   - Recommendation: If `link` is not available inline, use `table.permissions` or `table.name` passed as environment variable with manual IAM policy via `transform`.

---

## Sources

### Primary (HIGH confidence)

- https://sst.dev/docs/component/aws/app-sync/ — AppSync component API, addDataSource, addResolver
- https://sst.dev/docs/component/aws/dynamo/ — Dynamo component API, fields, primaryIndex, ttl, transform
- https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html — extensions.setSubscriptionFilter API, filter object shape, operators
- https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html — JavaScript resolver request/response signature, ctx shape, @aws-appsync/utils imports
- https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-enhanced-filtering.html — Enhanced subscription filtering mechanics
- `/Users/santiago.torres/codebases/personal/nasqa-clip/packages/functions/package.json` — confirmed @aws-sdk versions 3.1009.0
- `/Users/santiago.torres/codebases/personal/nasqa-clip/package.json` — confirmed sst 4.2.7, zod 4.3.6
- `.planning/research/STACK.md` — stack decisions, alternatives considered (researched 2026-03-13)
- `.planning/research/ARCHITECTURE.md` — DynamoDB key design, subscription architecture, build order (researched 2026-03-13)
- `.planning/research/PITFALLS.md` — known pitfalls by phase (researched 2026-03-13)

### Secondary (MEDIUM confidence)

- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html — TTL delay behavior (best-effort deletion, up to 48h lag)
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html — On-demand billing mode behavior
- AppSync NONE data source for subscription resolvers — confirmed via architectural reasoning + multiple official AppSync examples; specific SST Ion API for NONE data source needs validation

### Tertiary (LOW confidence)

- `transform.table.billingMode: "PAY_PER_REQUEST"` exact string — derived from Pulumi AWS provider DynamoDB docs; needs verification during implementation
- SST Ion AppSync `api.apiKey` output property name — not confirmed in fetched docs; verify during implementation

---

## Metadata

**Confidence breakdown:**

- Standard stack (libraries/versions): HIGH — verified from installed package.json files
- DynamoDB table design: HIGH — confirmed in ARCHITECTURE.md + official AWS docs
- SST Ion resource API (Dynamo, AppSync): HIGH for core APIs; MEDIUM for edge cases (billingMode transform, NONE data source, apiKey output)
- JavaScript resolver pattern: HIGH — confirmed in official AWS AppSync docs
- Enhanced subscription filtering: HIGH — confirmed in official AWS AppSync docs
- Package installation commands: HIGH — workspace structure confirmed from codebase

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (SST Ion updates frequently; re-verify SST component API if > 30 days old)
