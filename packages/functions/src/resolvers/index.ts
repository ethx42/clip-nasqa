import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { AppSyncResolverContext } from "@nasqa/core";

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });
export const docClient = DynamoDBDocumentClient.from(client);

// AppSync Lambda resolver handler
// fieldName is the mutation field being resolved (e.g., "createSession")
export const handler = async (event: AppSyncResolverContext): Promise<unknown> => {
  const fieldName = (event as unknown as { info: { fieldName: string } }).info?.fieldName;

  // Stub — Phase 3 adds real mutation routing here
  // Each mutation will be a case in this switch
  switch (fieldName) {
    default:
      throw new Error(`Unhandled field: ${fieldName}`);
  }
};
