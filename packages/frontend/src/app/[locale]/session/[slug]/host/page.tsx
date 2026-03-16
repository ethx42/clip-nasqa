import { notFound } from "next/navigation";

import { HostToolbar } from "@/components/session/host-toolbar";
import { SessionLiveHostPage } from "@/components/session/session-live-host-page";
import { getBaseUrl } from "@/lib/base-url";
import { getSession, getSessionData } from "@/lib/session";

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ raw?: string }>;
}) {
  const { slug } = await params;
  const { raw } = await searchParams;
  const session = await getSession(slug);

  if (!session) notFound();

  const { snippets, questions, replies } = await getSessionData(slug);
  const baseUrl = await getBaseUrl();
  const participantUrl = `${baseUrl}/session/${slug}`;

  return (
    <SessionLiveHostPage
      session={session}
      sessionSlug={slug}
      rawSecret={raw}
      initialSnippets={snippets}
      initialQuestions={questions}
      initialReplies={replies}
      hostToolbar={<HostToolbar participantUrl={participantUrl} />}
    />
  );
}
