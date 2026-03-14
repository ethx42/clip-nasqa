import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient } from "./index";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

/**
 * checkRateLimit: DynamoDB minute-bucket rate limiter.
 * @param key - unique key for the rate limit (e.g. fingerprint or hostSecretHash)
 * @param limit - maximum number of requests allowed in the window
 * @param windowSeconds - window size in seconds (default: 60)
 * @throws Error('RATE_LIMIT_EXCEEDED') if limit is exceeded
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds = 60
): Promise<void> {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowEpoch / windowSeconds) * windowSeconds;
  const ttl = bucket + windowSeconds * 2;

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `RATELIMIT#${key}`,
          SK: `BUCKET#${bucket}`,
        },
        UpdateExpression: "ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :limit",
        ExpressionAttributeNames: {
          "#count": "count",
          "#ttl": "TTL",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":ttl": ttl,
          ":limit": limit,
        },
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    throw err;
  }
}

/**
 * checkNotBanned: verifies a participant is not banned in a session.
 * @param sessionSlug - the session to check
 * @param fingerprint - participant fingerprint
 * @throws Error('PARTICIPANT_BANNED') if the participant is banned
 */
export async function checkNotBanned(
  sessionSlug: string,
  fingerprint: string
): Promise<void> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `BAN#${fingerprint}`,
      },
    })
  );

  if (result.Item?.isBanned === true) {
    throw new Error("PARTICIPANT_BANNED");
  }
}
