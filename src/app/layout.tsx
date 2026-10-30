import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Label Source · Instant Quote",
  description:
    "Describe your product, get a firm price for custom printed labels, upload your artwork and order. Canadian-made labels from Label Source, Winnipeg.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a3144",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sen:wght@400;700;800&display=swap" />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="bg-navy text-cream">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" aria-label="Label Source home" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/Label-Source-Logo-Light.svg" alt="Label Source" className="h-11 w-auto" />
            </Link>
            <div className="text-[13px] text-cream/80 flex gap-4 flex-wrap justify-end">
              <span className="hidden sm:inline">Proudly Canadian · Winnipeg &amp; Calgary</span>
              <span>
                Sales: <b className="text-lime">204-888-0444</b>
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="bg-navy-deep text-cream/75 text-[13px] px-4 py-6">
          <div className="mx-auto max-w-5xl flex flex-wrap justify-between gap-3">
            <span>© Label Source · Winnipeg, MB · Canadian-owned and operated</span>
            <span>Quotes are firm for 30 days on the spec shown. Tax and shipping at checkout.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
