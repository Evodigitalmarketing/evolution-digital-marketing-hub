export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuote } from "@/lib/quotes/store";
import { QuoteCard } from "@/components/QuoteCard";
import { ArtworkFlow } from "@/components/ArtworkFlow";
import { isExpired } from "@/lib/quotes/model";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id.toUpperCase());
  if (!quote) notFound();
  const expired = isExpired(quote);

  return (
    <section className="text-cream flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-lime">
            ← New quote
          </Link>
          <span className="text-xs text-cream/70">
            {quote.needs.contact?.name ? `Prepared for ${quote.needs.contact.name}` : "Your quote"} ·{" "}
            {new Date(quote.createdAt).toLocaleDateString("en-CA")}
          </span>
        </div>

        <div>
          <h1 className="display text-[clamp(40px,6vw,64px)]">
            <span className="block text-lime">Quote {quote.id}.</span>
            <span className="block text-cream">Firm for 30 days.</span>
          </h1>
        </div>

        {quote.needs.productDescription && (
          <div className="rounded-2xl bg-navy-deep/70 border border-cream/15 px-4 py-3 text-sm">
            <span className="font-bold text-lime">You told us:</span> “{quote.needs.productDescription}”
          </div>
        )}

        {expired && (
          <div className="rounded-2xl bg-cream text-navy p-4 text-sm">
            This quote expired on {new Date(quote.expiresAt).toLocaleDateString("en-CA")}. Prices may have changed.{" "}
            <Link href="/" className="font-bold underline">
              Start a fresh quote
            </Link>
            ; it takes two minutes.
          </div>
        )}

        <QuoteCard quote={quote} compact />
        {!expired && <ArtworkFlow initial={quote} />}

        <p className="text-center text-xs text-cream/60">
          Share this page with anyone who needs to sign off. Questions? Reply to your quote email or text us; a person reads
          every message.
        </p>
      </div>
    </section>
  );
}
