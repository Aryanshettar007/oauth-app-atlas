import type { Metadata } from "next";
import Link from "next/link";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Logo } from "@/components/Logo";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "OAuth App Atlas",
  description:
    "For every Composio toolkit: can you ship on the managed OAuth app, and if you need your own, what it takes to get it approved.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 px-3 pt-3">
          <header className="mx-auto max-w-6xl card px-3 sm:px-4 h-12 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Link href="/" className="font-semibold tracking-tight flex items-center gap-2 text-[15px]">
              <Logo size={24} />
              OAuth App Atlas
              <span className="tag-grad hidden sm:inline-block"><span>for Composio</span></span>
            </Link>
            <nav className="flex items-center gap-4 sm:gap-6 text-sm text-muted">
              <Link href="/#library" className="hover:text-ink">Toolkits</Link>
              <Link href="/method" className="hover:text-ink">Method</Link>
              <Link href="/generate" className="hidden sm:inline-block btn-primary px-3 py-1.5 text-sm">Research an app</Link>
            </nav>
          </header>
        </div>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line text-xs text-muted mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row gap-2 sm:justify-between">
            <span>Guides are researched by an agent and may be wrong. Each one shows what was tested, what is documented, and what is uncertain.</span>
            <span className="font-mono">Toolkit data from the Composio API · not an official Composio page</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
