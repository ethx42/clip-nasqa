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

    // 4. Lambda data source (for mutations — Phase 3 adds real handlers)
    const lambdaDS = api.addDataSource({
      name: "lambdaDS",
      lambda: {
        handler: "packages/functions/src/resolvers/index.handler",
        environment: {
          TABLE_NAME: table.name,
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
        link: [table],
      },
    });

    // 5. NONE data source (for subscription resolver — no backing resource needed)
    const noneDS = api.addDataSource({
      name: "noneDS",
    });

    // 6. Stub resolver for Query._empty (DynamoDB data source — always returns null)
    api.addResolver("Query _empty", {
      dataSource: dynamoDS.name,
      code: readFileSync("infra/resolvers/query-stub.js", "utf-8"),
    });

    // 7. Subscription resolver — enhanced server-side filter (NONE data source)
    // CRITICAL: Uses extensions.setSubscriptionFilter for session isolation.
    // Argument-based filtering alone has a null-slug bypass vulnerability.
    api.addResolver("Subscription onSessionUpdate", {
      dataSource: noneDS.name,
      code: readFileSync("infra/resolvers/subscription-onSessionUpdate.js", "utf-8"),
    });

    return {
      apiUrl: api.url,
      tableName: table.name,
    };
  },
});
