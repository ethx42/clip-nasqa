"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { code: "en", label: "EN", language: "English" },
  { code: "es", label: "ES", language: "Spanish" },
  { code: "pt", label: "PT", language: "Portuguese" },
] as const;

type Locale = (typeof LOCALES)[number]["code"];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleLocaleChange(newLocale: Locale) {
    const qs = searchParams.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target, { locale: newLocale });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex w-full rounded-lg border border-border bg-muted p-0.5 text-sm"
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => handleLocaleChange(l.code)}
          aria-label={`Switch to ${l.language}`}
          aria-current={locale === l.code ? "true" : undefined}
          className={`flex-1 rounded-md py-1.5 text-center text-sm font-medium transition-colors ${
            locale === l.code
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
