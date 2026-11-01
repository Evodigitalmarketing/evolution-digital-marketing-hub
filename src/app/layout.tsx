import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://palevioletred-viper-239162.hostingersite.com"),
  title: "Instant Label Quote | Label Source",
  openGraph: {
    title: "Custom labels, priced in minutes | Label Source",
    description: "Tell us about your product, get a firm price for custom printed labels, and order online. Printed in Winnipeg, shipped Canada-wide.",
    siteName: "Label Source",
    type: "website",
  },
  description:
    "Describe your product, get a firm price for custom printed labels, upload your artwork and order. Canadian-made labels from Label Source, Winnipeg.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a3144",
};

const NAV = [
  { href: "https://labelsource.ca/shop/", label: "Shop Now" },
  { href: "https://labelsource.ca/our-label-products/", label: "Custom Products" },
  { href: "https://labelsource.ca/services/", label: "Services" },
  { href: "https://labelsource.ca/contact-us/", label: "Contact" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sen:wght@400;700;800&display=swap" />
      </head>
      <body className="min-h-screen flex flex-col">
        <header>
          <div className="mx-auto max-w-6xl px-5 pt-5 pb-3 flex items-center justify-between gap-6">
            <Link href="/" aria-label="Label Source instant quote" className="block shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/Label-Source-Logo-Light.svg" alt="Label Source" className="h-12 sm:h-14 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-7 text-[16px]">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="text-white/90 hover:text-lime transition-colors">
                  {n.label}
                </a>
              ))}
              <Link href="/" className="text-lime font-bold">
                Instant Quote
              </Link>
            </nav>
            <a href="tel:2048880444" className="md:hidden text-lime font-bold text-sm">
              204.888.0444
            </a>
          </div>
          <div className="mx-auto max-w-6xl px-5">
            <div className="dashed-rule md:ml-[30%] flex justify-end items-center gap-2 pt-2 text-lime text-[15px] tracking-wide">
              <span className="hidden sm:inline">Custom labels, quoted &amp; shipped Canada-wide: 204.888.0444</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/Maple-Leaf-Green-Icon.svg" alt="" className="h-5 w-5" />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="mt-10 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-6 flex flex-wrap justify-between gap-3 text-[13px] text-cream/70">
            <span>© Label Source · Winnipeg, MB · Proudly Canadian owned and operated</span>
            <span>Quotes are firm for 30 days on the spec shown. Tax and shipping at checkout.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
