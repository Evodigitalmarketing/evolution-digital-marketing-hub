import Link from "next/link";
import type { Quote } from "@/lib/quotes/model";
import { techSummary } from "@/lib/advisor/recommend";

const cad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export function QuoteCard({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  const { price, recommendation: rec } = quote;
  const expires = new Date(quote.expiresAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

  if (!price.ok) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Quote {quote.id}</div>
        <h2 className="mt-1 text-lg font-bold">One of our team will price this one</h2>
        <p className="mt-2 text-sm text-ink/80">
          Your request includes {listJoin(price.reasons)}. That's outside what I can price automatically, so a person
          will send you a firm quote within one business day. Everything you told me is saved with it.
        </p>
        <div className="mt-4 rounded-xl bg-cream p-3 text-sm">
          <div className="font-semibold">What you asked for</div>
          <div className="text-ink/80">{rec.plainSummary}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Quote {quote.id}</div>
          <h2 className="mt-1 text-lg font-bold leading-snug">{rec.plainSummary}</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-navy">{cad(price.subtotal)}</div>
          <div className="text-xs text-muted">{cad(price.perLabel)} per label</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-cream px-2.5 py-1">Ships in {price.turnaroundBusinessDays} business days</span>
        <span className="rounded-full bg-cream px-2.5 py-1">Firm until {expires}</span>
        <span className="rounded-full bg-cream px-2.5 py-1">Tax and shipping at checkout</span>
      </div>

      {rec.flags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rec.flags.map((f, i) => (
            <li key={i} className="flex gap-2 rounded-xl border border-coral/60 bg-coral/15 p-3 text-sm">
              <span aria-hidden>!</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      )}

      {price.alternatives.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold">Nearby quantities</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {price.alternatives.map((a) => (
              <div key={a.quantity} className="rounded-xl border border-line p-2.5 text-sm">
                <div className="font-semibold">{a.quantity.toLocaleString()}</div>
                <div className="text-ink/80">{cad(a.subtotal)}</div>
                <div className="text-xs text-muted">{cad(a.perLabel)} each</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm font-semibold text-navy">Why this price</summary>
        <ul className="mt-2 divide-y divide-line text-sm">
          {price.lineItems.map((li) => (
            <li key={li.code} className="py-2">
              <div className="flex justify-between gap-3">
                <span>{li.label}</span>
                <span className="font-medium">{cad(li.amount)}</span>
              </div>
              <div className="text-xs text-muted">{li.explain}</div>
            </li>
          ))}
          {price.warnings.map((w, i) => (
            <li key={`w${i}`} className="py-2 text-xs text-ink/80">
              Tip: {w}
            </li>
          ))}
        </ul>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-navy">Why we chose these materials</summary>
        <ul className="mt-2 space-y-1.5 text-sm text-ink/85">
          {rec.reasons.map((r, i) => (
            <li key={i}>• {r.text}</li>
          ))}
        </ul>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-navy">Technical spec</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {techSummary(rec.spec).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 text-xs text-muted">Priced with rate card {price.rateCardVersion}.</div>
      </details>

      {!compact && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/quote/${quote.id}`}
            className="flex-1 rounded-xl bg-lime px-4 py-3 text-center font-semibold text-navy hover:bg-lime-dark"
          >
            Upload artwork and order
          </Link>
          <Link
            href={`/quote/${quote.id}`}
            className="flex-1 rounded-xl border border-navy px-4 py-3 text-center font-semibold text-navy hover:bg-cream"
          >
            Save quote link
          </Link>
        </div>
      )}
    </div>
  );
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}
