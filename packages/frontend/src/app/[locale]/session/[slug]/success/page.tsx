import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/session/copy-button";
import { QRCodeDisplay } from "@/components/session/qr-code";
import { getBaseUrl } from "@/lib/base-url";
import { getSession } from "@/lib/session";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ raw?: string }>;
}) {
  const { slug } = await params;
  const { raw } = await searchParams;
  const t = await getTranslations("session");
  const tPages = await getTranslations("pages");

  const session = await getSession(slug);
  if (!session) {
    notFound();
  }

  const baseUrl = await getBaseUrl();
  const participantUrl = `${baseUrl}/session/${slug}`;
  const hostUrl = `${baseUrl}/session/${slug}/host#secret=${raw ?? ""}`;

  if (!raw) {
    return (
      <div className="flex min-h-[calc(100vh-53px)] flex-col items-center justify-center px-5 text-center">
        <p className="text-lg text-muted-foreground">{tPages("pageExpired")}</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white hover:bg-emerald-600"
        >
          {tPages("goHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-5 py-12">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{session.title}</h1>
        <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {t("sessionCreated")}
        </span>
      </div>

      {/* Host Secret */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-950/30">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          {t("hostSecret")}
        </p>
        <p className="mb-4 text-base font-medium text-amber-800 dark:text-amber-300">
          {t("secretWarning")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 break-all rounded-xl bg-amber-100 px-4 py-3 font-mono text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {raw}
          </code>
          <CopyButton value={raw} label={t("copySecret")} />
        </div>
      </div>

      {/* Host URL */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("hostUrl")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 break-all rounded-xl bg-muted px-4 py-3 font-mono text-sm text-foreground">
            {hostUrl}
          </code>
          <CopyButton value={hostUrl} label={tPages("copyUrl")} />
        </div>
      </div>

      {/* Participant URL */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("participantUrl")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 break-all rounded-xl bg-muted px-4 py-3 font-mono text-sm text-foreground">
            {participantUrl}
          </code>
          <CopyButton value={participantUrl} label={tPages("copyUrl")} />
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("qrCode")} — {t("participantUrl")}
        </p>
        <QRCodeDisplay url={participantUrl} size={200} />
      </div>

      {/* Go to Host View */}
      <Link
        href={`/session/${slug}/host#secret=${raw}`}
        className="block w-full rounded-2xl bg-emerald-500 px-7 py-4 text-center text-base font-bold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {tPages("goToHostView")}
      </Link>
    </div>
  );
}
