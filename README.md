# Nasqa Live

Real-time clipboard and Q&A platform for live sessions. A speaker shares code snippets and text in real-time, while the audience asks questions, upvotes, and gets replies — all synchronized instantly via GraphQL subscriptions.

## Architecture

- **Frontend** — Next.js 15 (App Router) with Shiki syntax highlighting, Framer Motion animations, and AWS Amplify for real-time subscriptions
- **Backend** — AWS AppSync (GraphQL) with Lambda resolvers and DynamoDB (single-table design)
- **Infrastructure** — SST v4 (Ion) for IaC, deployment, and local development linking

```
packages/
  core/        # Shared types and i18n
  frontend/    # Next.js application
  functions/   # Lambda resolvers (clipboard, Q&A)
infra/
  schema.graphql                          # AppSync schema
  resolvers/                              # JS pipeline resolvers (subscription filter, stubs)
sst.config.ts                             # Infrastructure definition
```

## Prerequisites

- Node.js 22+
- npm 10+
- AWS CLI configured with a profile that has permissions for AppSync, DynamoDB, Lambda, and CloudFront
- SST v4 CLI (`npx sst`)

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Deploy the backend (first time)

SST deploys the AWS resources (DynamoDB, AppSync, Lambda) to your personal stage:

```bash
AWS_PROFILE=your-profile npx sst deploy
```

Note the `NasqaApi` URL from the output.

### 3. Get the AppSync API key

```bash
# Find the API ID
AWS_PROFILE=your-profile aws appsync list-graphql-apis \
  --query "graphqlApis[?contains(name, 'NasqaApi')].apiId" --output text

# List API keys
AWS_PROFILE=your-profile aws appsync list-api-keys --api-id <API_ID> --output json
```

If no keys exist, create one:

```bash
AWS_PROFILE=your-profile aws appsync create-api-key --api-id <API_ID> \
  --expires $(python3 -c "import time; print(int(time.time()) + 365*24*3600)")
```

### 4. Configure frontend environment

Create `packages/frontend/.env.local`:

```env
NEXT_PUBLIC_APPSYNC_URL=https://<your-api-id>.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_APPSYNC_API_KEY=da2-xxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1
```

### 5. Run the dev server

The frontend needs the DynamoDB table name at runtime for SSR data fetching:

```bash
NASQA_TABLE_NAME=<table-name-from-sst-output> npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Production deploy

```bash
AWS_PROFILE=your-profile AWS_REGION=us-east-1 npx sst deploy --stage production
```

SST handles:
- DynamoDB table with TTL and on-demand billing
- AppSync GraphQL API with API key auth
- Lambda resolver function
- Next.js site on CloudFront + Lambda@Edge

Environment variables (`NEXT_PUBLIC_APPSYNC_URL`, `NEXT_PUBLIC_APPSYNC_API_KEY`) are injected automatically into the deployed site by SST.

### Remove a stage

```bash
AWS_PROFILE=your-profile npx sst remove --stage <stage-name>
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check core and functions packages |
| `npm run deploy` | Lint, typecheck, and deploy to AWS |

## Project Structure

| Path | Description |
|------|-------------|
| `sst.config.ts` | SST infrastructure (DynamoDB, AppSync, Lambda, Next.js site) |
| `infra/schema.graphql` | GraphQL schema with mutations, subscriptions, and types |
| `packages/core/src/types.ts` | Shared TypeScript types (Snippet, Question, Reply, etc.) |
| `packages/functions/src/resolvers/` | Lambda handlers for all GraphQL mutations and queries |
| `packages/frontend/src/actions/` | Next.js Server Actions (call AppSync mutations via fetch) |
| `packages/frontend/src/hooks/` | Client hooks (session state, subscriptions, fingerprint) |
| `packages/frontend/src/components/session/` | Session UI components (clipboard, Q&A, live indicator) |
