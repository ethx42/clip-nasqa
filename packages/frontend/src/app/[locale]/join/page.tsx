import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { JoinForm } from "@/components/join/join-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Join a session | nasqa",
    description: "Enter the 6-digit session code to join a live nasqa session.",
    robots: { index: true, follow: true },
    openGraph: {
      title: "Join a session | nasqa",
      description: "Enter the 6-digit session code to join a live session.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Join a session | nasqa",
      description: "Enter the 6-digit session code to join a live session.",
    },
  };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  const { code: initialCode } = await searchParams;
  const t = await getTranslations("join");

  return (
    <>
      <AppHeader />
      <JoinForm
        locale={locale}
        tagline={t("tagline")}
        invalidCodeMessage={t("invalidCode")}
        sessionEndedMessage={t("sessionEnded")}
        initialCode={initialCode}
      />
    </>
  );
}
