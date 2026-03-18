import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { docClient } from "./index";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

/**
 * Verify the caller is the session host by checking hostSecretHash against
 * the SESSION item in DynamoDB. Throws "Unauthorized" if the check fails.
 *
 * Extracted from qa.ts and clipboard.ts where identical copies existed.
 * Single source of truth — imported by qa.ts, clipboard.ts, and any new resolvers.
 */
export async function verifyHostSecret(sessionCode: string, hostSecretHash: string): Promise<void> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionCode}`,
        SK: `SESSION#${sessionCode}`,
      },
    }),
  );
  if (!result.Item || result.Item.hostSecretHash !== hostSecretHash) {
    throw new Error("Unauthorized");
  }
}
