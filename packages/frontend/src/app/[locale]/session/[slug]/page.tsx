import Link from 'next/link';
import { getSession } from '@/lib/session';
import { SessionShell } from '@/components/session/session-shell';
import { ClipboardPanel } from '@/components/session/clipboard-panel';
import { QAPanel } from '@/components/session/qa-panel';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession(slug);

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-49px)] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Session not found or expired
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This session may have ended or the link is incorrect.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          Create a new session
        </Link>
      </div>
    );
  }

  return (
    <SessionShell
      title={session.title}
      clipboardSlot={<ClipboardPanel />}
      qaSlot={<QAPanel />}
    />
  );
}
