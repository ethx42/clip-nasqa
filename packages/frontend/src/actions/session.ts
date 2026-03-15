"use server";

import { createHash, randomUUID } from "node:crypto";

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { docClient, tableName } from "@/lib/dynamo";

const MAX_SLUG_RETRIES = 3;

export async function createSession(formData: FormData): Promise<never> {
  const title = (formData.get("title") as string | null)?.trim().slice(0, 50);
  const locale = await getLocale();

  if (!title) {
    throw new Error("Session title is required");
  }

  const { generateSlug } = await import("random-word-slugs");

  let redirectUrl: string | null = null;

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug(2, { format: "kebab" });
    const rawSecret = randomUUID();
    const hashedSecret = createHash("sha256").update(rawSecret).digest("hex");
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
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );

      // PutCommand succeeded — set redirect target outside try block
      redirectUrl = `/${locale}/session/${slug}/success?raw=${rawSecret}`;
      break;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        continue;
      }
      throw err;
    }
  }

  if (!redirectUrl) {
    throw new Error("Failed to generate unique slug after maximum retries");
  }

  // redirect() throws NEXT_REDIRECT internally — must be called outside try/catch
  redirect(redirectUrl);
}
