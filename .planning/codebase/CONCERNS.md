# Codebase Concerns

**Analysis Date:** 2026-03-13

## Early-Stage Project Risks

**Incomplete Infrastructure:**
- Issue: SST configuration is a skeleton with no actual infrastructure defined
- Files: `sst.config.ts`
- Impact: The entire backend infrastructure (AppSync, DynamoDB, Lambda) is not configured, meaning the application cannot deploy or run end-to-end
- Fix approach: Complete the `run()` function in `sst.config.ts` with AppSync API, Lambda functions, and DynamoDB table definitions

**Empty GraphQL Schema:**
- Issue: GraphQL schema contains only placeholder `_empty` fields for Query, Mutation, and Subscription types
- Files: `infra/schema.graphql`
- Impact: No actual GraphQL operations are defined; frontend cannot query or mutate data from backend
- Fix approach: Define concrete GraphQL types and operations based on application requirements

**No Real Backend Handlers:**
- Issue: Only a stub example handler exists with hardcoded response
- Files: `packages/functions/src/resolvers/example.ts`, `packages/functions/src/index.ts`
- Impact: No actual business logic implemented; resolver mappings to GraphQL operations are missing
- Fix approach: Implement actual resolver functions and wire them to GraphQL schema operations

## Test Coverage Gaps

**Zero Test Files:**
- What's not tested: Entire codebase lacks test files (no `.test.ts`, `.spec.ts`, or test configurations)
- Files: All source files in `packages/`
- Risk: No test infrastructure exists; bugs introduced during development will not be caught; refactoring is unsafe
- Priority: **High** - Testing infrastructure must be established before significant feature development

**No Test Configuration:**
- Issue: No Jest, Vitest, or other test runner configured
- Files: No test config found (no `jest.config.ts`, `vitest.config.ts`, etc.)
- Impact: Unable to run tests; no coverage reporting possible
- Fix approach: Set up test runner (recommend Vitest for monorepo), add test configuration files, establish baseline coverage targets

## Type Safety Issues

**TypeScript Configuration Mismatch:**
- Issue: Root `tsconfig.json` targets ES2022 but frontend `tsconfig.json` targets ES2017; inconsistent module resolution strategies
- Files: `tsconfig.json`, `packages/frontend/tsconfig.json`
- Impact: Potential type errors when using ES2022 features in packages consumed by frontend; inconsistent type checking across monorepo
- Fix approach: Standardize TypeScript target and module resolution across all packages; use root config as single source of truth

**Incomplete Path Aliases:**
- Issue: Root `tsconfig.json` only defines `@nasqa/core` paths; frontend uses `@/*` paths; functions package gets no path aliases
- Files: `tsconfig.json`, `packages/frontend/tsconfig.json`, `packages/functions/tsconfig.json`
- Impact: Inconsistent import patterns; `@nasqa/functions` cannot be imported as expected in frontend or other packages
- Fix approach: Add `@nasqa/functions` and `@nasqa/frontend` paths to root config; ensure all packages can reference each other consistently

## Missing Critical Infrastructure

**No Environment Configuration System:**
- Issue: No environment variable handling, configuration management, or runtime config loading
- Files: Entire codebase
- Impact: Cannot distinguish between development, staging, and production environments; no way to inject secrets safely
- Fix approach: Implement environment variable validation using Zod schemas; add `.env` file handling for development

**No API Integration Layer:**
- Issue: Frontend has React Query installed but no API client or request configuration exists
- Files: `packages/frontend/package.json` lists `@tanstack/react-query` but no corresponding API client in `packages/frontend/src`
- Impact: Frontend cannot make requests to backend; React Query hooks have no endpoints to call
- Fix approach: Create API client layer that abstracts GraphQL/HTTP calls; set up React Query configuration and hooks

**No Authentication Handling:**
- Issue: No authentication mechanism exists despite AWS/AppSync being configured in stack
- Files: Entire backend and frontend
- Impact: No way to secure endpoints or identify users; all data is world-readable
- Fix approach: Integrate Cognito (AWS auth) or alternative provider; add auth guard middleware to resolvers and frontend routes

## Performance & Scalability Concerns

**N+1 Query Risk in GraphQL Resolvers:**
- Issue: AppSync resolvers are not using DataLoader or batching patterns
- Files: `packages/functions/src/resolvers/example.ts` - pattern to be extended
- Impact: Nested queries will cause multiple database round-trips per request, causing performance degradation at scale
- Fix approach: Implement DataLoader for GraphQL resolvers to batch database queries

**Large Button Component Styling:**
- Issue: Button variant definitions in `buttonVariants` CVA consume 43 lines with deeply nested Tailwind selectors
- Files: `packages/frontend/src/components/ui/button.tsx` (lines 8-43)
- Impact: Component is difficult to maintain and test; CSS specificity conflicts are likely; bundle size impact from redundant class definitions
- Fix approach: Extract complex variant combinations into separate component variants; use CSS custom properties for dynamic values

**No Build Output Optimization:**
- Issue: Next.js config is empty; no optimization, image handling, or bundle analysis configured
- Files: `packages/frontend/next.config.ts`
- Impact: Production builds will not be optimized; images not served at correct resolutions; bundle size unmanaged
- Fix approach: Enable compression, image optimization, and bundle analysis; set up monitoring for performance regressions

## Security Concerns

**Hardcoded Response in Example Handler:**
- Issue: Lambda handler returns hardcoded JSON without validation or error handling
- Files: `packages/functions/src/resolvers/example.ts`
- Impact: No error boundaries; exceptions will crash handler; response format is not validated against schema
- Fix approach: Wrap all handlers in try-catch; validate responses with Zod before returning; implement proper error response format

**No Input Validation on Resolvers:**
- Issue: AppSyncContext in types defines `arguments: Record<string, unknown>` with no schema validation
- Files: `packages/core/src/types.ts`, `packages/functions/src/resolvers/example.ts`
- Impact: SQL injection, invalid data type attacks possible; no guardrails on resolver input
- Fix approach: Add Zod schemas for each resolver input; validate all arguments at resolver entry point

**Exposed Example Infrastructure:**
- Issue: Example handler and stub schema are committed and deployed to production
- Files: `packages/functions/src/resolvers/example.ts`, `infra/schema.graphql`
- Impact: Leaks application structure to potential attackers
- Fix approach: Remove example handlers before production deployment; implement authentication and rate limiting

**No CORS Configuration:**
- Issue: No cross-origin resource sharing configuration visible
- Files: `sst.config.ts`, `packages/frontend/next.config.ts`
- Impact: Frontend may not be able to call backend if deployed to different domain; or backend is too permissive
- Fix approach: Configure AppSync CORS headers in SST; validate `Origin` header in production

## Architectural Issues

**No Error Handling Pattern:**
- Issue: No error boundary components in React, no consistent error response format from backend
- Files: `packages/frontend/src/app/layout.tsx` (no error.tsx), `packages/functions/src/resolvers/example.ts` (no error handling)
- Impact: Unhandled exceptions crash the application; users see browser error pages instead of graceful error messages
- Fix approach: Add `error.tsx` file to frontend; implement error response middleware for resolvers; standardize error schema in Zod

**Missing Data Persistence Layer:**
- Issue: AWS SDK is imported in functions package but never used; no ORM or query builder
- Files: `packages/functions/package.json` has `@aws-sdk/client-dynamodb` but no usage in `packages/functions/src`
- Impact: No way to persist or retrieve data; backend cannot function as designed
- Fix approach: Implement DynamoDB client initialization; create data access layer with typed queries using AWS SDK

**Fragmented Monorepo Without Shared Utilities:**
- Issue: Three packages (`core`, `frontend`, `functions`) with minimal shared code; `core` only exports i18n stubs and empty schemas
- Files: `packages/core/src/index.ts` exports schemas, types, i18n but no actual shared business logic
- Impact: Code duplication across packages; difficult to maintain consistency; `core` package doesn't justify existence yet
- Fix approach: Define and implement core business logic in `@nasqa/core`; use it from both frontend and functions packages

## Dependency & Build Concerns

**Unused Dependencies:**
- Issue: Multiple dependencies installed but not used in code (e.g., `framer-motion`, `sonner`, `shiki`)
- Files: `packages/frontend/package.json`
- Impact: Bloated bundle; security surface area increased; maintenance burden from unused transitive dependencies
- Fix approach: Audit which libraries are actually needed; remove unused packages or create stories/examples for their use

**Missing Build Artifacts Output:**
- Issue: No build output directory structure defined or checked into version control
- Files: Root `tsconfig.json` defines `outDir: "./dist"` but no `.gitignore` entry for dist folder usage per package
- Impact: Unclear where compiled code goes; potential for uncommitted build files or missing artifacts in CI
- Fix approach: Ensure each package has its own `dist/` in `.gitignore`; set up build script that validates artifacts exist

**ESLint Configuration Incomplete:**
- Issue: Frontend ESLint config uses `eslint-config-next` but only for web vitals and TypeScript; no code style rules
- Files: `packages/frontend/eslint.config.mjs`
- Impact: No enforcement of code style (naming, spacing, complexity); inconsistent code quality; pre-commit hooks likely missing
- Fix approach: Add more ESLint rules; set up `@typescript-eslint` rules; add pre-commit hook to lint on commit

## Deployment & Operations Gaps

**No Environment Separation Strategy:**
- Issue: SST config has production vs. non-production logic but no corresponding CI/CD pipeline defined
- Files: `sst.config.ts` (lines 7-8 show stage awareness)
- Impact: No clear path for staging environment; unclear how to promote code safely to production
- Fix approach: Define staging and production stage configurations; set up GitHub Actions or similar CI for deployment

**Missing Monitoring & Observability:**
- Issue: No logging infrastructure, error tracking (e.g., Sentry), or metrics collection configured
- Files: Entire codebase
- Impact: Production issues will be invisible; difficult to debug customer-reported problems; no performance insights
- Fix approach: Integrate CloudWatch (AWS) for logs; add error tracking service; instrument critical functions

**No Database Migrations:**
- Issue: DynamoDB table structure is not defined as code; no migration system for schema changes
- Files: `sst.config.ts` (infrastructure not defined)
- Impact: Schema changes are manual and error-prone; rolling back changes is difficult
- Fix approach: Define DynamoDB tables in SST with versioning; implement schema change process

## Code Quality & Maintainability

**Placeholder Page Content:**
- Issue: Home page is default Next.js template with placeholder text and external links
- Files: `packages/frontend/src/app/page.tsx`
- Impact: Application doesn't demonstrate real functionality; misleading for users/reviewers
- Fix approach: Replace with actual application content or feature showcase

**Metadata Not Updated:**
- Issue: Root layout still has default metadata from create-next-app
- Files: `packages/frontend/src/app/layout.tsx` (lines 15-18: `title: "Create Next App"`)
- Impact: SEO issues; unprofessional appearance in browser tabs and search results
- Fix approach: Update metadata with actual application name and description; consider using `next-intl` for i18n support

**No Documentation:**
- Issue: No README, API documentation, or architectural diagrams explaining the system
- Files: Root repository
- Impact: New developers cannot understand system architecture; setup process is unclear; deployment is not documented
- Fix approach: Create comprehensive README with architecture overview; add API documentation for GraphQL schema; document setup steps

---

*Concerns audit: 2026-03-13*
