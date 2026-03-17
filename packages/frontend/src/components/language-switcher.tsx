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
    <div role="group" aria-label="Language" className="flex items-center gap-1 text-sm">
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted-foreground/40">
              |
            </span>
          )}
          <button
            onClick={() => handleLocaleChange(l.code)}
            aria-label={`Switch to ${l.language}`}
            aria-current={locale === l.code ? "true" : undefined}
            className={
              locale === l.code
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}
