import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";

export default async function NotFound() {
  const t = await getTranslations("pages");

  return (
    <>
      <AppHeader />
      <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col items-center justify-center px-6 text-center">
        {/* Subtle radial glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative space-y-6">
          <p className="text-7xl font-extrabold tracking-tight text-primary/20 sm:text-9xl">404</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t("sessionNotFound")}
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
            {t("sessionNotFoundDesc")}
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-md bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.98]"
              style={{ minHeight: "44px" }}
            >
              {t("createNewSession")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
