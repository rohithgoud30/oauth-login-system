import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "OAuth Login System",
    template: "%s | OAuth Login System",
  },
  description:
    "Educational OAuth authentication system with complete flow visibility for learning purposes",
  keywords: [
    "OAuth",
    "Authentication",
    "Next.js",
    "Educational",
    "Discord",
    "Google",
    "GitHub",
  ],
  authors: [{ name: "OAuth Learning System" }],
  creator: "OAuth Learning System",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    title: "OAuth Login System - Learn OAuth 2.0",
    description:
      "Educational OAuth authentication system with complete flow visibility",
    siteName: "OAuth Login System",
  },
  twitter: {
    card: "summary_large_image",
    title: "OAuth Login System",
    description: "Learn OAuth 2.0 with complete flow visibility",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          {children}
        </div>
      </body>
    </html>
  );
}
