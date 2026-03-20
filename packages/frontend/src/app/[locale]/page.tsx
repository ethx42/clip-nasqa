"use client";

import { ClipboardList, MessageCircleQuestion, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { createSession } from "@/actions/session";
import { AppHeader } from "@/components/app-header";
import type { ActionResult } from "@/lib/action-result";

const FEATURES = [
  { icon: Zap, titleKey: "landing.featureClipboardTitle", descKey: "landing.featureClipboardDesc" },
  {
    icon: MessageCircleQuestion,
    titleKey: "landing.featureQaTitle",
    descKey: "landing.featureQaDesc",
  },
  {
    icon: ClipboardList,
    titleKey: "landing.featureNoSignupTitle",
    descKey: "landing.featureNoSignupDesc",
  },
] as const;

async function createSessionAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  const result = await createSession(formData);
  // createSession redirects on success (never returns), so result is always a failure
  return result ?? null;
}

export default function Home() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createSessionAction,
    null,
  );

  useEffect(() => {
    if (state && !state.success) {
      toast.error(state.error, { duration: 5000 });
    }
  }, [state]);

  return (
    <>
      <AppHeader />
      <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col">
        {/* Hero */}
        <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center lg:py-32">
          {/* Subtle radial glow behind hero */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          </div>

          <div className="relative w-full max-w-2xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("landing.headline")}
            </h1>
            <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">
              {t("landing.subtitle")}
            </p>

            <form
              action={formAction}
              noValidate
              className="mx-auto mt-10 flex w-full max-w-lg flex-col gap-3 sm:flex-row"
            >
              <input
                name="title"
                type="text"
                maxLength={50}
                placeholder={t("landing.placeholder")}
                className="flex-1 rounded-md border border-input bg-background px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("landing.cta")}
              </button>
            </form>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border px-6 py-20 lg:py-24">
          <ul className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.titleKey}
                className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
                <h2 className="text-base font-bold text-foreground">{t(feature.titleKey)}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(feature.descKey)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
