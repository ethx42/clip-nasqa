import Link from 'next/link';
import { getSession } from '@/lib/session';
import { SessionShell } from '@/components/session/session-shell';
import { ClipboardPanel } from '@/components/session/clipboard-panel';
import { QAPanel } from '@/components/session/qa-panel';
import { QRCodeDisplay } from '@/components/session/qr-code';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function HostToolbarPlaceholder({ participantUrl }: { participantUrl: string }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <QRCodeDisplay url={participantUrl} size={100} />
      <div className="flex flex-col justify-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Host Controls
        </p>
        <p className="text-sm text-muted-foreground">Phase 3</p>
      </div>
    </div>
  );
}

export default async function HostPage({
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

  const participantUrl = `${baseUrl}/session/${slug}`;

  return (
    <SessionShell
      title={session.title}
      isHost
      clipboardSlot={<ClipboardPanel isHost />}
      qaSlot={<QAPanel isHost />}
      hostToolbar={<HostToolbarPlaceholder participantUrl={participantUrl} />}
    />
  );
}
