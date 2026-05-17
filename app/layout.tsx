import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "shipgraph — see your team's actual shape",
  description:
    "Paste any GitHub repo. We render its contributors as a force-directed graph — who's pairing, who's siloed, who's been carrying. No signup.",
  openGraph: {
    title: "shipgraph",
    description: "see your team's actual shape, from any GitHub repo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-bg/75 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <LogoMark size={22} />
              <span className="font-mono text-[13px] font-semibold tracking-tight text-text-strong">
                shipgraph
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="px-2.5 py-1 text-text-muted hover:text-text transition-colors"
              >
                home
              </Link>
              <Link
                href="/about"
                className="px-2.5 py-1 text-text-muted hover:text-text transition-colors"
              >
                about
              </Link>
              <a
                href="https://github.com/Smokeybear10/shipgraph"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-text-muted hover:text-text transition-colors"
              >
                source ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
