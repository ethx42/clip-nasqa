import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeToggle } from '@/components/theme-toggle';

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
      <header className="flex items-center justify-end border-b border-border px-4 py-2">
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
