import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.MY_AWS_REGION ?? process.env.AWS_REGION ?? "us-east-1",
    ...(process.env.MY_AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
      },
    }),
  }),
);

/**
 * Returns the DynamoDB table name.
 * SST Ion exposes linked resource names via env vars in the form SST_{ResourceName}_name.
 * NASQA_TABLE_NAME can override for local dev / manual testing.
 * Fallback to 'NasqaTable' for safety.
 */
export function tableName(): string {
  return process.env.NASQA_TABLE_NAME ?? process.env.SST_NasqaTable_name ?? "NasqaTable";
}
