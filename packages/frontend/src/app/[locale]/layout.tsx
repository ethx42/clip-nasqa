import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  const messages = await getMessages();
  const t = await getTranslations("session");

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
      {/* Skip-to-content link — visible only on keyboard focus */}
      <a
        href="#qa-feed"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {t("skipToQaFeed")}
      </a>
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
