import { getTranslations } from "next-intl/server";

import { createSession } from "@/actions/session";

export default async function Home() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-[calc(100vh-53px)] flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <div className="w-full max-w-3xl space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t("landing.headline")}
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t("landing.subtitle")}
          </p>

          {/* Inline session creation form */}
          <form
            action={createSession}
            className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-card p-5 shadow-xl shadow-emerald-500/10 ring-1 ring-border sm:flex-row sm:gap-3"
          >
            <input
              name="title"
              type="text"
              maxLength={50}
              placeholder={t("landing.placeholder")}
              required
              className="flex-1 rounded-xl border border-input bg-background px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-white transition hover:scale-[1.02] hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-[0.98]"
            >
              {t("landing.cta")}
            </button>
          </form>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border px-5 py-16">
        <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: "\u26A1",
              titleKey: "landing.featureClipboardTitle",
              descKey: "landing.featureClipboardDesc",
            },
            {
              icon: "\uD83D\uDCAC",
              titleKey: "landing.featureQaTitle",
              descKey: "landing.featureQaDesc",
            },
            {
              icon: "\uD83D\uDD13",
              titleKey: "landing.featureNoSignupTitle",
              descKey: "landing.featureNoSignupDesc",
            },
          ].map((feature) => (
            <li
              key={feature.titleKey}
              className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/20 bg-card p-8 text-center shadow-sm"
            >
              <span className="text-4xl text-emerald-500" aria-hidden="true">
                {feature.icon}
              </span>
              <h2 className="text-base font-bold text-foreground">{t(feature.titleKey)}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(feature.descKey)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
