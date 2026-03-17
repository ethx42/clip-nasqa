import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-indigo-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {t("skipToQaFeed")}
      </a>
      <header className="flex items-center justify-between border-b border-border px-6 py-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-indigo-500 dark:text-amber-400"
        >
          <svg
            viewBox="100 85 824 855"
            className="h-8 w-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth={65}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M582.687,151.44c88.633,46.208 124.112,154.761 79.876,244.395c-51.925,105.214 -114.549,232.104 -139.582,282.828c-6.796,13.77 -20.916,22.393 -36.269,22.151c-53.688,-0.848 -182.101,-2.876 -273.696,-4.323c-22.082,-0.349 -42.459,-11.945 -54.037,-30.752c-11.578,-18.807 -12.754,-42.223 -3.12,-62.096c50.081,-103.308 132.337,-272.989 191.142,-394.294c18.364,-37.882 51.28,-66.717 91.248,-79.936c39.969,-13.219 83.586,-9.697 120.916,9.764c7.802,4.067 15.667,8.168 23.523,12.263Z" />
            <path d="M422.18,872.922c-89.217,-45.069 -126.083,-153.16 -82.998,-243.352c50.574,-105.87 111.568,-233.551 135.95,-284.592c6.619,-13.856 20.627,-22.659 35.983,-22.613c53.694,0.161 182.123,0.545 273.729,0.819c22.085,0.066 42.609,11.401 54.426,30.058c11.817,18.657 13.294,42.056 3.915,62.051c-48.754,103.941 -128.831,274.661 -186.078,396.708c-17.877,38.114 -50.421,67.368 -90.217,81.098c-39.796,13.73 -83.455,10.767 -121.031,-8.215c-7.853,-3.967 -15.771,-7.967 -23.678,-11.961Z" />
          </svg>
          CLIP
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
