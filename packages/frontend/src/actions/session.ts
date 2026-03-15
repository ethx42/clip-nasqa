'use server';

import { redirect } from 'next/navigation';
import { createHash, randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { getLocale } from 'next-intl/server';
import { docClient, tableName } from '@/lib/dynamo';

const MAX_SLUG_RETRIES = 3;

export async function createSession(formData: FormData): Promise<never> {
  const title = (formData.get('title') as string | null)?.trim().slice(0, 50);
  const locale = await getLocale();

  if (!title) {
    throw new Error('Session title is required');
  }

  // Debug: log env var availability (no secrets, just presence)
  console.log('[createSession] env check:', {
    hasAccessKey: !!process.env.MY_AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.MY_AWS_SECRET_ACCESS_KEY,
    region: process.env.MY_AWS_REGION ?? process.env.AWS_REGION ?? '(fallback us-east-1)',
    tableName: tableName(),
    locale,
  });

  const { generateSlug } = await import('random-word-slugs');

  let redirectUrl: string | null = null;

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug(2, { format: 'kebab' });
    const rawSecret = randomUUID();
    const hashedSecret = createHash('sha256').update(rawSecret).digest('hex');
    const now = Math.floor(Date.now() / 1000);

    try {
      await docClient.send(
        new PutCommand({
          TableName: tableName(),
          Item: {
            PK: `SESSION#${slug}`,
            SK: `SESSION#${slug}`,
            slug,
            title,
            hostSecretHash: hashedSecret,
            isActive: true,
            createdAt: now,
            TTL: now + 86400,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );

      // PutCommand succeeded — set redirect target outside try block
      redirectUrl = `/${locale}/session/${slug}/success?raw=${rawSecret}`;
      console.log('[createSession] success, redirecting to:', redirectUrl);
      break;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        console.log('[createSession] slug collision, retrying...');
        continue;
      }
      console.error('[createSession] DynamoDB error:', {
        name: (err as Error).name,
        message: (err as Error).message,
        code: (err as Record<string, unknown>).$metadata ?? (err as Record<string, unknown>).code,
      });
      throw err;
    }
  }

  if (!redirectUrl) {
    throw new Error('Failed to generate unique slug after maximum retries');
  }

  // redirect() throws NEXT_REDIRECT internally — must be called outside try/catch
  redirect(redirectUrl);
}
