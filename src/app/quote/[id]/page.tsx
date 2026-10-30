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
    <div className="mx-auto w-full max-w-3xl px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-navy">
          ← New quote
        </Link>
        <span className="text-xs text-muted">
          {quote.needs.contact?.name ? `Prepared for ${quote.needs.contact.name}` : "Your quote"} ·{" "}
          {new Date(quote.createdAt).toLocaleDateString("en-CA")}
        </span>
      </div>

      {quote.needs.productDescription && (
        <div className="rounded-xl bg-cream px-4 py-3 text-sm">
          <span className="font-semibold">You told us:</span> “{quote.needs.productDescription}”
        </div>
      )}

      {expired ? (
        <div className="rounded-xl border border-coral bg-coral/15 p-4 text-sm">
          This quote expired on {new Date(quote.expiresAt).toLocaleDateString("en-CA")}. Prices may have changed;{" "}
          <Link href="/" className="font-semibold underline">
            start a fresh quote
          </Link>{" "}
          and it takes two minutes.
        </div>
      ) : null}

      <QuoteCard quote={quote} compact />
      {!expired && <ArtworkFlow initial={quote} />}

      <p className="text-center text-xs text-muted">
        Share this page with anyone who needs to sign off. Questions? Reply to your quote email or text us; a person reads every message.
      </p>
    </div>
  );
}
