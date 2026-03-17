import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  const messages = await getMessages();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "clip",
    url: "https://clip.nasqa.io",
    description: "Real-time clipboard and Q&A for live sessions",
    applicationCategory: "PresentationApplication",
    operatingSystem: "Web",
  };

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link href="/" className="text-base font-extrabold tracking-tight text-foreground">
          clip
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
