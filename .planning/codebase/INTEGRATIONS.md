# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**AWS AppSync (GraphQL API):**
- API for executing queries, mutations, and subscriptions
- Schema defined in `infra/schema.graphql` (currently minimal/placeholder)
- Context type: `AppSyncContext` exported from `packages/core/src/types.ts`
- Lambda resolvers in `packages/functions/src/resolvers/`

**Next.js Deployment:**
- Vercel (implied by Next.js setup and deployment templates in `packages/frontend/src/app/page.tsx`)
- Alternative: AWS Lambda with Next.js adapter (SST supported)

## Data Storage

**Databases:**
- AWS DynamoDB
  - Client: `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
  - Version: 3.1009.0+
  - Configuration: Managed via SST (`sst.config.ts`)
  - Not yet defined in infrastructure (placeholder `async run() {}` in sst.config.ts)

**File Storage:**
- Not detected - No S3 or file storage client imports found

**Caching:**
- Not detected - No caching layer configured

## Authentication & Identity

**Auth Provider:**
- AWS AppSync built-in authentication
- Identity model: `AppSyncContext.identity` provides:
  - `sub` - Subject identifier
  - `issuer` - Token issuer
  - `claims` - Custom claims (key-value record)
- Likely: API Key, IAM, or Cognito (exact provider not configured yet)

**Implementation Notes:**
- Auth context passed to Lambda resolvers via `AppSyncContext`
- No third-party auth SDK (Auth0, Firebase, etc.) detected

## Frontend API Communication

**HTTP Client:**
- TanStack React Query 5.90.21 - Handles API requests and caching
- Specific endpoint configuration not yet implemented (no API URL found)
- Likely targets AppSync endpoint via fetch/axios

**Internationalization Service:**
- next-intl 4.8.3 - Handles multi-language content
- Translation keys defined in `packages/core/src/i18n.ts`
- Keys structure:
  ```
  common:
    - loading
    - error
    - save
    - cancel
    - delete
  ```

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar service found

**Logs:**
- CloudWatch (implicit through AWS Lambda)
- Frontend console logging (not configured explicitly)
- No structured logging SDK detected

**Performance Monitoring:**
- Core Web Vitals ESLint rules enforced via `eslint-config-next/core-web-vitals`
- No dedicated APM tool (New Relic, DataDog, etc.) detected

## CI/CD & Deployment

**Hosting:**
- AWS (primary)
  - Compute: Lambda (via SST)
  - API: AppSync
  - Database: DynamoDB
- Vercel (possible frontend-only alternative based on Next.js templates)

**Infrastructure as Code:**
- SST (Serverless Stack) 4.2.7 - Defines all AWS resources
- Deployment stages: dev and production (configured in `sst.config.ts`)
  - Production stage protected: `protect: ["production"].includes(input?.stage)`
  - Non-production removal policy: `removal: input?.stage === "production" ? "retain" : "remove"`

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar config found

## Environment Configuration

**Environment Variables:**
- Not visible in repository (.env* files gitignored)
- SST likely injects:
  - AppSync endpoint URL
  - DynamoDB table names
  - AWS region and deployment stage
  - Lambda execution role ARN

**Required Variables (inferred):**
- `APPSYNC_ENDPOINT` - GraphQL API endpoint (for TanStack Query)
- `AWS_REGION` - AWS region for SDK clients
- `STAGE` - Deployment stage (dev/production)

**Secrets Location:**
- AWS Secrets Manager or SST parameter store (not visible in code)
- No `.env` file in repository

## Webhooks & Callbacks

**Incoming:**
- AppSync subscriptions for real-time updates (type `Subscription` in schema)
- Not yet implemented (placeholder schema)

**Outgoing:**
- Not detected - No outbound webhook configuration found

## External Font Services

**Google Fonts:**
- Geist font family (sans and monospace)
- Loaded via `next/font/google` in `packages/frontend/src/app/layout.tsx`
- Automatically optimized by Next.js

## Component Libraries & Assets

**Icon Library:**
- Lucide React 0.577.0 - All icon needs
- Configured in `packages/frontend/components.json` via shadcn

**UI Component Registry:**
- shadcn/ui - Copy-paste component library
- Style: base-nova
- Icon set: Lucide
- CSS framework: Tailwind CSS with CSS variables
- Alias paths configured for components, utils, hooks, lib

## Third-Party Analytics & Tools

**Not Detected:**
- Google Analytics
- Segment
- Amplitude
- Posthog
- Or other analytics/tracking services

---

*Integration audit: 2026-03-13*
