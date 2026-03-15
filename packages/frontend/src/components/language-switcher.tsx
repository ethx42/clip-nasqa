"use client";

import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "pt", label: "PT" },
] as const;

type Locale = (typeof LOCALES)[number]["code"];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleLocaleChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/40">|</span>}
          <button
            onClick={() => handleLocaleChange(l.code)}
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
