import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, tableName } from '@/lib/dynamo';

export interface Session {
  slug: string;
  title: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

export async function getSession(slug: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${slug}`,
        SK: `SESSION#${slug}`,
      },
    })
  );

  const item = result.Item;

  if (!item) {
    return null;
  }

  // TTL filter: DynamoDB may not immediately remove expired items;
  // filter at application layer to enforce 24h expiry (SESS-07)
  const now = Math.floor(Date.now() / 1000);
  if (item.TTL < now) {
    return null;
  }

  return {
    slug: item.slug as string,
    title: item.title as string,
    isActive: item.isActive as boolean,
    createdAt: item.createdAt as number,
    expiresAt: item.TTL as number,
  };
}
