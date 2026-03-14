'use client';

import '../lib/appsync-client'; // Initialize Amplify
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      {children}
      <Toaster position="bottom-center" richColors />
    </ThemeProvider>
  );
}
