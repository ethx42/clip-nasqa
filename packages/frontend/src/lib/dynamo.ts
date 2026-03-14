import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
);

/**
 * Returns the DynamoDB table name.
 * SST Ion exposes linked resource names via env vars in the form SST_{ResourceName}_name.
 * NASQA_TABLE_NAME can override for local dev / manual testing.
 * Fallback to 'NasqaTable' for safety.
 */
export function tableName(): string {
  return (
    process.env.NASQA_TABLE_NAME ??
    process.env.SST_NasqaTable_name ??
    'NasqaTable'
  );
}
