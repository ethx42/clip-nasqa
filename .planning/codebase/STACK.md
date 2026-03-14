# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript 5.x - Used across all packages (frontend, core, functions)
- JavaScript (ESM) - Configuration files and build tooling

**Secondary:**
- GraphQL - Schema definition for API (no-op schema in `infra/schema.graphql`)

## Runtime

**Environment:**
- Node.js 24.13.0+
- Browser (React 19.2.3 via Next.js)

**Package Manager:**
- npm 11.6.2
- Lockfile: `package-lock.json` present
- Workspace mode: Monorepo using npm workspaces (`packages/*`)

## Frameworks

**Core:**
- Next.js 16.1.6 - React framework for frontend (`packages/frontend`)
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**State & Data Fetching:**
- TanStack React Query 5.90.21 - Server state management and data synchronization
- Zod 4.3.6 - Schema validation (used in `packages/core`)

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind
- Framer Motion 12.36.0 - Animation library
- Class Variance Authority 0.7.1 - Composable class utility
- Tailwind Merge 3.5.0 - Utility deduplication
- tw-animate-css 1.4.0 - Additional animation utilities

**UI Components:**
- Lucide React 0.577.0 - Icon library (used across monorepo)
- @base-ui/react 1.3.0 - Unstyled, accessible component primitives
- shadcn 4.0.6 - Copy-paste UI components (base-nova style)
- Sonner 2.0.7 - Toast/notification library

**Internationalization:**
- next-intl 4.8.3 - i18n routing and translations for Next.js

**Theming:**
- next-themes 0.4.6 - Dark mode and theme management

**Code Highlighting:**
- Shiki 4.0.2 - Syntax highlighting library

**Utilities:**
- clsx 2.1.1 - Conditional CSS class composition

## AWS & Backend

**Runtime:**
- AWS Lambda - Target runtime for functions (`packages/functions`)
- AWS AppSync - GraphQL API (indicated by AppSyncContext in core types)
- AWS DynamoDB - Database (via SDK client)

**AWS SDKs:**
- @aws-sdk/client-dynamodb 3.1009.0 - DynamoDB client
- @aws-sdk/lib-dynamodb - DynamoDB library for document operations

**Infrastructure as Code:**
- SST (Serverless Stack) 4.2.7 - AWS infrastructure management
  - Config file: `sst.config.ts`
  - Deployment: AWS region-based, stage support (dev/production)

## Build & Development Tools

**Bundling & Build:**
- Next.js built-in bundler (Webpack)
- TypeScript compiler for type checking

**Linting & Code Quality:**
- ESLint 9.x - JavaScript linting
  - Config: `packages/frontend/eslint.config.mjs`
  - Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

**CSS Processing:**
- PostCSS - CSS transformations
  - Config: `packages/frontend/postcss.config.mjs`

**Component Generation:**
- shadcn/ui CLI - Component scaffolding
  - Config: `packages/frontend/components.json` (base-nova style, CSS variables, lucide icons)

## Configuration Files

**Root Level:**
- `package.json` - Monorepo workspaces definition
- `tsconfig.json` - Base TypeScript config with path aliases for `@nasqa/core`
- `sst.config.ts` - AWS infrastructure definition
- `.gitignore` - Excludes `node_modules`, `.next`, `.sst`, `dist`, `.env*`

**Frontend Package:**
- `packages/frontend/tsconfig.json` - Extended TypeScript config with `@/*` path alias
- `packages/frontend/next.config.ts` - Minimal Next.js configuration
- `packages/frontend/eslint.config.mjs` - ESLint flat config
- `packages/frontend/postcss.config.mjs` - PostCSS configuration with Tailwind plugin
- `packages/frontend/components.json` - shadcn component registry
- `packages/frontend/package.json` - Frontend dependencies

**Core Package:**
- `packages/core/package.json` - Shared types and schemas

**Functions Package:**
- `packages/functions/package.json` - AWS Lambda functions and AppSync resolvers

## Environment & Configuration

**Environment Variables:**
- Not detected in current codebase (placeholder stage)
- `.env*` files are gitignored and not committed
- SST handles stage-specific configuration (dev/production)

**Secrets:**
- Managed by AWS SST framework (not visible in repository)
- Likely AWS IAM for Lambda execution and AppSync access

## Platform Requirements

**Development:**
- Node.js 24.13.0+ (pinned by system version)
- npm 11.6.2+
- TypeScript 5.x support required
- macOS/Linux/Windows with Node.js runtime

**Production:**
- AWS Account with AppSync, Lambda, DynamoDB capabilities
- SST deployment pipeline to AWS
- CloudFront or API Gateway for frontend distribution
- DynamoDB tables provisioned via SST

**Deployment Target:**
- AWS (AppSync, Lambda, DynamoDB)
- Frontend served via Next.js on AWS (Vercel or self-hosted via Lambda@Edge)

## Package Manager Configuration

**Workspaces:**
- Root workspace: `packages/*`
- Scripts delegated to frontend package:
  - `npm run dev` → builds frontend dev server
  - `npm run build` → builds frontend production
  - `npm run lint` → runs frontend linter

---

*Stack analysis: 2026-03-13*
