import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SessionLivePage } from "@/components/session/session-live-page";
import { getSession, getSessionData } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSession(slug);

  if (!session) {
    return { title: "Session not found" };
  }

  const { questions } = await getSessionData(slug);
  const questionCount = questions.length;

  const status = session.isActive
    ? `Live now — ${questionCount} questions asked`
    : `Ended — ${questionCount} questions`;

  return {
    title: session.title,
    description: status,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${session.title} by clip`,
      description: status,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${session.title} by clip`,
      description: status,
    },
  };
}

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
