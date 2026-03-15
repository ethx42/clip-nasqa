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
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- SST v4 CLI (`npx sst`)

## Local Development Setup

### 1. Create IAM user and configure AWS CLI

#### Create the IAM user (AWS Console)

1. Go to **IAM → Users → Create user**
2. User name: `nasqa-dev` (or any name you prefer)
3. In **Set permissions**, choose **Attach policies directly** and add these AWS managed policies:
   - `AmazonDynamoDBFullAccess`
   - `AWSAppSyncAdministrator`
   - `AWSLambda_FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonS3FullAccess`
   - `IAMFullAccess`
   - `AWSCloudFormationFullAccess`
   - `AmazonSSMFullAccess`
4. Create the user, then go to **Security credentials → Create access key**
5. Choose **Command Line Interface (CLI)** and save the access key and secret key

> **Tip:** For a tighter setup you can create a custom policy instead of using full-access managed policies. The services SST needs are: AppSync, DynamoDB, Lambda, CloudFront, S3, IAM, CloudFormation, SSM, STS, and IoT (for SST live mode).

#### Configure the AWS CLI profile

```bash
aws configure --profile nasqa
```

It will prompt for:

```
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: us-east-1
Default output format: json
```

Verify the profile works:

```bash
aws sts get-caller-identity --profile nasqa
```

### 2. Install dependencies

```bash
npm install
```

### 3. Deploy the backend (first time)

SST deploys the AWS resources (DynamoDB, AppSync, Lambda) to your personal stage:

```bash
AWS_PROFILE=nasqa npx sst deploy
```

Note the outputs: `apiUrl`, `apiKey`, and `tableName`. You will need them in the next step.

> **If the API key expired or is missing**, you can create a new one manually:
>
> ```bash
> # Find the API ID
> AWS_PROFILE=nasqa aws appsync list-graphql-apis \
>   --query "graphqlApis[?contains(name, 'NasqaApi')].apiId" --output text
>
> # Create a new key (valid for 1 year)
> AWS_PROFILE=nasqa aws appsync create-api-key --api-id <API_ID> \
>   --expires $(python3 -c "import time; print(int(time.time()) + 365*24*3600)")
> ```

### 4. Configure frontend environment

Copy the example and fill in your values:

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

Edit `packages/frontend/.env.local` with the SST outputs from step 3 and your AWS credentials from step 1:

```env
NEXT_PUBLIC_APPSYNC_URL=<apiUrl from sst deploy output>
NEXT_PUBLIC_APPSYNC_API_KEY=<apiKey from sst deploy output>
NEXT_PUBLIC_AWS_REGION=us-east-1
MY_AWS_ACCESS_KEY_ID=<your-aws-access-key>
MY_AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
MY_AWS_REGION=us-east-1
NASQA_TABLE_NAME=<tableName from sst deploy output>
```

> **Note:** We use the `MY_AWS_*` prefix instead of `AWS_*` because Netlify reserves `AWS_*` variables. The DynamoDB client in `lib/dynamo.ts` reads these at runtime for SSR data fetching.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Backend (SST → AWS)

Deploy backend infrastructure (DynamoDB, AppSync, Lambda) to production:

```bash
AWS_PROFILE=nasqa npx sst deploy --stage production
```

SST handles:
- DynamoDB table with TTL and on-demand billing
- AppSync GraphQL API with API key auth
- Lambda resolver function

### Frontend (Netlify)

The Next.js frontend is deployed on Netlify. Configure these environment variables in Netlify's dashboard (**Site settings → Environment variables**):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APPSYNC_URL` | AppSync endpoint URL |
| `NEXT_PUBLIC_APPSYNC_API_KEY` | AppSync API key |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1` |
| `MY_AWS_ACCESS_KEY_ID` | AWS access key for DynamoDB SSR |
| `MY_AWS_SECRET_ACCESS_KEY` | AWS secret key for DynamoDB SSR |
| `MY_AWS_REGION` | `us-east-1` |
| `NASQA_TABLE_NAME` | DynamoDB table name from SST output |

Netlify auto-deploys from the `main` branch. The build config lives in `packages/frontend/netlify.toml`.

### Remove a stage

```bash
AWS_PROFILE=nasqa npx sst remove --stage <stage-name>
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check core and functions packages |
| `AWS_PROFILE=nasqa npm run deploy` | Lint, typecheck, and deploy backend to your personal stage |

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
