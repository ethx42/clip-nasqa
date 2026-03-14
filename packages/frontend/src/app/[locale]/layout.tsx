import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-base font-extrabold tracking-tight text-foreground">nasqa</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
