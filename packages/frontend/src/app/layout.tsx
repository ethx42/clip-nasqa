import type { Metadata } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";

import "./globals.css";

import { Providers } from "@/components/providers";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clip.nasqa.io"),
  title: {
    default: "Clip — Real-Time Clipboard and Q&A for Live Sessions",
    template: "%s — clip",
  },
  description:
    "Share code snippets and collect audience questions in real time. No sign-up required — create a session, share the link, and engage your audience instantly.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    siteName: "clip",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} ${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
