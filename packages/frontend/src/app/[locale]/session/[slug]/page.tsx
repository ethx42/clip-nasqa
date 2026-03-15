import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { SessionLivePage } from "@/components/session/session-live-page";
import { getSession, getSessionData } from "@/lib/session";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("pages");
  const session = await getSession(slug);

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-49px)] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("sessionNotFound")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("sessionNotFoundDesc")}</p>
        <Link
          href="/"
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          {t("createNewSession")}
        </Link>
      </div>
    );
  }

  const { snippets, questions, replies } = await getSessionData(slug);

  return (
    <SessionLivePage
      session={session}
      sessionSlug={slug}
      initialSnippets={snippets}
      initialQuestions={questions}
      initialReplies={replies}
    />
  );
}
