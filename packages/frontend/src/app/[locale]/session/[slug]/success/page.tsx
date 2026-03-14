import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { QRCodeDisplay } from '@/components/session/qr-code';
import { CopyButton } from '@/components/session/copy-button';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ raw?: string }>;
}) {
  const { slug } = await params;
  const { raw } = await searchParams;
  const t = await getTranslations('session');

  const session = await getSession(slug);
  if (!session) {
    notFound();
  }

  const participantUrl = `${baseUrl}/session/${slug}`;
  const hostUrl = `${baseUrl}/session/${slug}/host#secret=${raw ?? ''}`;

  if (!raw) {
    return (
      <div className="flex min-h-[calc(100vh-49px)] flex-col items-center justify-center px-4 text-center">
        <p className="text-lg text-muted-foreground">
          This page is only available immediately after session creation.
        </p>
        <Link
          href="/"
          className="mt-4 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {t('sessionCreated')}
        </span>
      </div>

      {/* Host Secret */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Host Secret
        </p>
        <p className="mb-3 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('secretWarning')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-amber-100 px-3 py-2 font-mono text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {raw}
          </code>
          <CopyButton value={raw} label={t('copySecret')} />
        </div>
      </div>

      {/* Host URL */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('hostUrl')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {hostUrl}
          </code>
          <CopyButton value={hostUrl} label="Copy URL" />
        </div>
      </div>

      {/* Participant URL */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('participantUrl')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {participantUrl}
          </code>
          <CopyButton value={participantUrl} label="Copy URL" />
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('qrCode')} — {t('participantUrl')}
        </p>
        <QRCodeDisplay url={participantUrl} size={200} />
      </div>

      {/* Go to Host View */}
      <Link
        href={`/session/${slug}/host#secret=${raw}`}
        className="block w-full rounded-2xl bg-emerald-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        Go to Host View
      </Link>
    </div>
  );
}
