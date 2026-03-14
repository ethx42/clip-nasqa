/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nasqa-live",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const { readFileSync } = await import("fs");
    // 1. DynamoDB single-table — PK/SK composite key, TTL attribute, on-demand billing
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

    // 2. AppSync GraphQL API — schema-first, API key authentication
    const api = new sst.aws.AppSync("NasqaApi", {
      schema: "infra/schema.graphql",
    });

    // 3. DynamoDB data source (for stub Query resolver)
    const dynamoDS = api.addDataSource({
      name: "dynamoDS",
      dynamodb: table.arn,
    });

    // 4. Lambda function for resolvers (created separately to avoid handler bug with inline lambda)
    const resolverFn = new sst.aws.Function("ResolverFn", {
      handler: "packages/functions/src/resolvers/index.handler",
      environment: {
        TABLE_NAME: table.name,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      link: [table],
    });

    // 5. Lambda data source referencing the function
    const lambdaDS = api.addDataSource({
      name: "lambdaDS",
      lambda: resolverFn.arn,
    });

    // 6. NONE data source (for subscription resolver — no backing resource needed)
    const noneDS = api.addDataSource({
      name: "noneDS",
    });

    // 7. Stub resolver for Query._empty (DynamoDB data source — always returns null)
    api.addResolver("Query _empty", {
      dataSource: dynamoDS.name,
      code: readFileSync("infra/resolvers/query-stub.js", "utf-8"),
    });

    // 8. Subscription resolver — enhanced server-side filter (NONE data source)
    // CRITICAL: Uses extensions.setSubscriptionFilter for session isolation.
    // Argument-based filtering alone has a null-slug bypass vulnerability.
    api.addResolver("Subscription onSessionUpdate", {
      dataSource: noneDS.name,
      code: readFileSync("infra/resolvers/subscription-onSessionUpdate.js", "utf-8"),
    });

    // 9. Mutation resolvers — all routes through Lambda data source
    api.addResolver("Mutation pushSnippet", { dataSource: lambdaDS.name });
    api.addResolver("Mutation deleteSnippet", { dataSource: lambdaDS.name });
    api.addResolver("Mutation clearClipboard", { dataSource: lambdaDS.name });
    api.addResolver("Mutation addQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Mutation upvoteQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Mutation addReply", { dataSource: lambdaDS.name });
    api.addResolver("Mutation focusQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Mutation banQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Mutation banParticipant", { dataSource: lambdaDS.name });
    api.addResolver("Mutation downvoteQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Mutation restoreQuestion", { dataSource: lambdaDS.name });
    api.addResolver("Query getSessionData", { dataSource: lambdaDS.name });

    // 10. Next.js site linked to DynamoDB table — passes AppSync config as env vars
    const site = new sst.aws.Nextjs("NasqaSite", {
      path: "packages/frontend",
      link: [table],
      environment: {
        NEXT_PUBLIC_APPSYNC_URL: api.url,
        NEXT_PUBLIC_APPSYNC_API_KEY: api.apiKey,
        NEXT_PUBLIC_AWS_REGION: "us-east-1",
      },
    });

    return {
      apiUrl: api.url,
      tableName: table.name,
      siteUrl: site.url,
    };
  },
});
