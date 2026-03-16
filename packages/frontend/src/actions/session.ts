"use server";

import { createHash, randomUUID } from "node:crypto";

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { docClient, tableName } from "@/lib/dynamo";

const MAX_SLUG_RETRIES = 3;

export async function createSession(formData: FormData): Promise<ActionResult | never> {
  const t = await getTranslations("actionErrors");

  const raw = (formData.get("title") as string | null)?.trim().slice(0, 50);
  const title = raw?.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  const locale = await getLocale();

  if (!title) {
    return { success: false, error: t("titleRequired") };
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

      // PutCommand succeeded — redirect to host view with raw secret
      redirectUrl = `/${locale}/session/${slug}/host?raw=${rawSecret}`;
      break;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        continue;
      }
      return { success: false, error: t("unexpectedError") };
    }
  }

  if (!redirectUrl) {
    return { success: false, error: t("slugGenerationFailed") };
  }

  // redirect() throws NEXT_REDIRECT internally — must be called outside try/catch
  redirect(redirectUrl);
}
