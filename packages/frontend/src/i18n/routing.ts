import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  localeDetection: true,
  localeCookie: {
    maxAge: 365 * 24 * 60 * 60,
  },
});
