import { NextResponse } from 'next/server';
import { tableName } from '@/lib/dynamo';

export async function GET() {
  const env = {
    hasAccessKey: !!process.env.MY_AWS_ACCESS_KEY_ID,
    accessKeyPrefix: process.env.MY_AWS_ACCESS_KEY_ID?.slice(0, 4) ?? '(missing)',
    hasSecretKey: !!process.env.MY_AWS_SECRET_ACCESS_KEY,
    region: process.env.MY_AWS_REGION ?? process.env.AWS_REGION ?? '(fallback us-east-1)',
    tableName: tableName(),
    nodeEnv: process.env.NODE_ENV,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
  };

  // Try a quick DynamoDB call to verify connectivity
  let dynamoStatus: string;
  try {
    const { docClient } = await import('@/lib/dynamo');
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    await docClient.send(
      new GetCommand({
        TableName: tableName(),
        Key: { PK: 'HEALTH_CHECK', SK: 'HEALTH_CHECK' },
      })
    );
    dynamoStatus = 'ok';
  } catch (err) {
    dynamoStatus = `${(err as Error).name}: ${(err as Error).message}`;
  }

  return NextResponse.json({ env, dynamoStatus });
}
