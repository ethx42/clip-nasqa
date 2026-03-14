# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Monorepo with Layered + Serverless Architecture

**Key Characteristics:**
- Multi-package TypeScript monorepo using npm workspaces
- Separation of concerns across frontend, backend functions, and shared core
- Infrastructure-as-Code using SST (Serverless Stack) on AWS
- GraphQL API layer with AppSync for backend integration
- Full-stack type safety with shared type definitions

## Layers

**Presentation Layer (Frontend):**
- Purpose: User-facing web interface built with React and Next.js
- Location: `packages/frontend/src`
- Contains: React components, pages, layouts, UI components, utilities
- Depends on: React 19.2.3, Next.js 16.1.6, @tanstack/react-query, Tailwind CSS, shared types from @nasqa/core
- Used by: End users through browser

**API Layer (GraphQL):**
- Purpose: GraphQL schema definition and API surface
- Location: `infra/schema.graphql`
- Contains: Query, Mutation, and Subscription type definitions
- Depends on: AWS AppSync
- Used by: Frontend queries and backend resolvers

**Backend/Lambda Layer:**
- Purpose: Serverless Lambda functions that implement GraphQL resolver logic
- Location: `packages/functions/src`
- Contains: Lambda handler functions, resolver implementations
- Depends on: AWS SDK (DynamoDB client), @nasqa/core types, AppSync context
- Used by: AppSync resolvers to execute business logic

**Shared Core Layer:**
- Purpose: Shared types, schemas, validation rules, and i18n keys
- Location: `packages/core/src`
- Contains: TypeScript type definitions, Zod schemas, i18n constants
- Depends on: Zod v4.3.6 for runtime validation
- Used by: Frontend and functions packages

**Infrastructure Layer:**
- Purpose: Infrastructure definition and deployment configuration
- Location: `sst.config.ts`, `infra/`
- Contains: SST configuration, GraphQL schema, AWS resource definitions
- Depends on: SST v4.2.7, AWS services
- Used by: Deployment pipeline

## Data Flow

**Request/Response Flow:**

1. User interacts with Frontend (Next.js App)
2. Frontend component uses @tanstack/react-query to fetch data
3. Query is sent as GraphQL request via HTTP to AWS AppSync
4. AppSync routes request to appropriate Lambda resolver in `packages/functions/src/resolvers/`
5. Lambda resolver receives `AppSyncContext` with request arguments and identity info
6. Resolver accesses data via AWS DynamoDB using SDK
7. Resolver returns data
8. AppSync formats response per GraphQL schema
9. Frontend receives response and updates UI state via react-query

**Schema Validation Flow:**

1. Frontend validates user input using derived schemas from `@nasqa/core`
2. Backend Lambda resolver validates input using same Zod schemas
3. Shared `baseSchema` ensures consistent entity structure across layers (id, createdAt, updatedAt)

**State Management:**
- Frontend: @tanstack/react-query manages async state and caching
- Backend: DynamoDB acts as single source of truth for data persistence
- Cross-layer: Shared types via `@nasqa/core` ensure type consistency

## Key Abstractions

**AppSyncContext:**
- Purpose: Standard context object passed to all Lambda resolvers
- Example: `packages/functions/src/resolvers/example.ts`
- Pattern: TypeScript interface defining resolver event shape with typed arguments, identity, and claims

**BaseEntity Schema:**
- Purpose: Establishes consistent shape for all domain entities
- Pattern: Zod schema with uuid id and ISO datetime timestamps (createdAt, updatedAt)
- Used across both packages via shared export from `@nasqa/core`

**i18n Key System:**
- Purpose: Type-safe internationalization keys
- Pattern: Hierarchical object constants (e.g., `common.loading`, `common.error`)
- Prevents typos and enables IDE autocomplete

**Handler Export Pattern:**
- Purpose: Wrap resolver implementations for AWS Lambda
- Pattern: Named exports from resolvers, re-exported as handlers from package index
- Example: `example.ts` exports `handler` function, imported as `exampleHandler` in `packages/functions/src/index.ts`

## Entry Points

**Frontend Entry Point:**
- Location: `packages/frontend/src/app/layout.tsx` (Root Layout)
- Triggers: Page load, navigation via Next.js router
- Responsibilities: Metadata, font setup, CSS imports, wraps all pages

**Frontend Home Page:**
- Location: `packages/frontend/src/app/page.tsx`
- Triggers: Navigation to `/`
- Responsibilities: Renders homepage with instructional content

**Lambda Resolvers:**
- Location: `packages/functions/src/resolvers/*.ts`
- Triggers: AppSync directive mapping resolver to GraphQL field
- Responsibilities: Implement business logic for specific GraphQL operation

**Infrastructure Entry:**
- Location: `sst.config.ts`
- Triggers: SST deployment command
- Responsibilities: Define and provision AWS resources (AppSync, Lambda, DynamoDB)

## Error Handling

**Strategy:** Layer-specific with type safety

**Patterns:**
- Frontend: React error boundaries (implicit), component-level try-catch for async operations
- Backend: Lambda resolvers return HTTP status codes and JSON error bodies
- Validation: Zod schema parsing throws errors that propagate up for logging/user feedback

## Cross-Cutting Concerns

**Logging:** Not implemented - use console for development, CloudWatch for production via AWS Lambda integration

**Validation:** Zod schemas in `packages/core/src/schemas.ts` - share between frontend and backend to prevent mismatches

**Authentication:** AppSync Identity context provides user identity via `event.identity.sub`, issuer, and claims - passed to resolvers

**Type Safety:** Full TypeScript across all packages - extends root `tsconfig.json` in each workspace package

---

*Architecture analysis: 2026-03-13*
