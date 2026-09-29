import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/toaster";
import { AuthSessionProvider } from "@/components/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BunnyMetrics — Privacy-first analytics for indie makers",
    template: "%s · BunnyMetrics",
  },
  description:
    "Cookie-less web analytics with a 1.4kb script. No consent banner, no PII, no bloat. Understand who visits your site and what makes them leave — in 60 seconds.",
  keywords: [
    "privacy analytics",
    "cookie-less analytics",
    "lightweight analytics",
    "indie hacker analytics",
    "GDPR analytics",
    "Plausible alternative",
    "Fathom alternative",
    "open source analytics",
  ],
  authors: [{ name: "BunnyMetrics" }],
  creator: "BunnyMetrics",
  applicationName: "BunnyMetrics",
  category: "technology",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "BunnyMetrics",
    title: "BunnyMetrics — Privacy-first analytics for indie makers",
    description:
      "A 1.4kb cookie-less analytics script. No banners, no PII, no bloat. Free forever for 10k events/month.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BunnyMetrics — Privacy-first analytics for indie makers",
    description:
      "A 1.4kb cookie-less analytics script. No banners, no PII, no bloat.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} dark`}
    >
      <body className="min-h-dvh bg-background font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            {children}
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
