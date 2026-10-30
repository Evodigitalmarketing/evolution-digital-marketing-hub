import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Label Source · Instant Quote",
  description: "Describe your product, get a firm price for custom printed labels, upload your artwork and order. Canadian-made labels from Label Source, Winnipeg.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a3144",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <header className="bg-navy text-white">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">Label Source</span>
              <span className="text-xs text-white/70 hidden sm:inline">Let us be your source.</span>
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider bg-lime text-navy px-2 py-1 rounded">
              Instant quote
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="text-center text-xs text-muted py-4 px-4">
          Label Source · Winnipeg, MB · Canadian-owned and operated · Quotes are firm for 30 days on the spec shown.
        </footer>
      </body>
    </html>
  );
}
