# Phase 1: Infrastructure - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Provision the AWS backend (DynamoDB, AppSync, Lambda) via SST Ion so all feature work can begin without infrastructure unknowns. This phase delivers deployable infrastructure with stub resolvers — no feature logic, no frontend.

</domain>

<decisions>
## Implementation Decisions

### AppSync Schema Design
- JavaScript resolvers (not VTL, not pure Lambda)
- Enhanced server-side filtering for subscription session isolation (not argument-based)
- API key authentication for all requests — host secret validated inside resolver logic, not at the auth layer
- Hybrid resolver strategy: simple reads resolve directly to DynamoDB, writes go through Lambda for validation and business logic
- Error surfacing approach: Claude's discretion
- Subscription event type design (union vs tagged union): Claude's discretion
- API key rotation strategy: Claude's discretion
- Batch mutation approach (e.g., clearClipboard): Claude's discretion

### DynamoDB Table Config
- On-demand billing mode (pay-per-request) — handles session spikes without pre-provisioning
- Single-table design as specified in PROJECT.md (PK: SESSION#slug)
- GSI needs: Claude's discretion based on access patterns
- TTL attribute naming: Claude's discretion
- Backup strategy: Claude's discretion (data is ephemeral, 24h TTL)

### Project Structure
- Types generated from GraphQL schema (codegen) — single source of truth
- Lambda resolver location in monorepo: Claude's discretion
- SST infrastructure file organization: Claude's discretion
- Resource naming convention: Claude's discretion (follow SST Ion conventions)

### Deploy Environments
- Dev environment only for now (no staging, no prod yet)
- AWS region: us-east-1
- Deploy command: `npm run deploy` wrapper script that runs pre-checks (lint, type-check) then `sst deploy`
- Single-command deploy is a hard requirement — no manual AWS Console steps
- SST stage naming: Claude's discretion

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

</decisions>

<specifics>
## Specific Ideas

- "I want to deploy this with a single command" — `npm run deploy` with pre-checks is the contract
- Host secret is validated at the resolver level, not the AppSync auth level — API key covers all requests uniformly
- Enhanced filtering chosen specifically because argument-based filtering has the null-slug security trap (research flagged this)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure*
*Context gathered: 2026-03-14*
