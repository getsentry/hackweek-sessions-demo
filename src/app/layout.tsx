import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SentryUser } from "@/components/sentry-user";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentry Next.js Demo",
  description:
    "A small Next.js app instrumented with Sentry errors, tracing, logs, metrics and Session Replay.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SentryUser />
        <SiteNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-muted">
            Errors · Tracing · Logs · Metrics · Replay
          </div>
        </footer>
      </body>
    </html>
  );
}
