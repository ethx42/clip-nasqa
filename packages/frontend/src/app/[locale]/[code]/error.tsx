"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { AppHeader } from "@/components/app-header";
import { reportError } from "@/lib/report-error";

function isConnectionError(error: Error & { digest?: string }): boolean {
  if (error.digest) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("websocket") ||
    msg.includes("subscription") ||
    msg.includes("fetch") ||
    msg.includes("connection") ||
    msg.includes("offline")
  );
}

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    reportError(error);
  }, [error]);

  const connectionLost = isConnectionError(error);

  return (
    <>
      <AppHeader />
      <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {connectionLost ? t("connectionLost") : t("serverError")}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {connectionLost ? t("connectionLostDesc") : t("serverErrorDesc")}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ minHeight: "44px" }}
        >
          {t("tryAgain")}
        </button>
      </div>
    </>
  );
}
