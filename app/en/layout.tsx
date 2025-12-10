import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

/**
 * /en - Global Extension Layout (Completely Independent)
 * Isolated from Korean version - no shared navigation, footer, or providers
 */

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "CruiseDot AI - Travel Survival Tool for Korea",
  description: "Your AI-powered travel companion for navigating Korea. Taxi cards, price checks, navigation, and instant translation.",
  keywords: ["Korea travel", "AI travel assistant", "taxi Korea", "price check Korea", "Korea navigation", "Korean translator"],
  openGraph: {
    title: "CruiseDot AI - Travel Survival Tool",
    description: "Navigate Korea like a local with AI assistance",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white antialiased`}>
        <main className="h-full">
          {children}
        </main>
      </body>
    </html>
  );
}
