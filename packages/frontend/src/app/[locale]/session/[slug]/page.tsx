import { notFound } from "next/navigation";

import { SessionLivePage } from "@/components/session/session-live-page";
import { getSession, getSessionData } from "@/lib/session";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession(slug);

  if (!session) notFound();

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
