import Link from "next/link";
import type { Quote } from "@/lib/quotes/model";
import { techSummary } from "@/lib/advisor/recommend";

const cad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export function QuoteCard({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  const { price, recommendation: rec } = quote;
  const expires = new Date(quote.expiresAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

  if (!price.ok) {
    return (
      <div className="on-cream rounded-2xl bg-paper text-navy p-5 shadow-[0_2px_10px_rgba(42,49,68,.08)] border border-navy/10">
        <span className="eyebrow">Quote {quote.id}</span>
        <h2 className="mt-2 text-xl">One of our team will price this one</h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          Your request includes {listJoin(price.reasons)}. That's outside what I can price automatically, so a person will
          send you a firm quote within one business day. Everything you told me is saved with it.
        </p>
        <div className="mt-4 rounded-xl bg-cream p-3 text-sm">
          <b>What you asked for:</b> {rec.plainSummary}
        </div>
      </div>
    );
  }

  return (
    <div className="on-cream rounded-2xl bg-paper text-navy p-5 shadow-[0_2px_10px_rgba(42,49,68,.08)] border border-navy/10">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">Quote {quote.id}</span>
        {price.rateCardVersion.includes("placeholder") && (
          <span title="Sample prices for this preview. Label Source's own rate card goes here." className="rounded-full bg-navy text-lime px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase">
            Demo pricing
          </span>
        )}
      </div>
      <h2 className="mt-2 text-xl leading-snug">{rec.plainSummary}</h2>

      <div className="mt-4 flex items-baseline justify-between border-t-2 border-navy pt-3">
        <span className="font-bold">Your price</span>
        <span className="text-right">
          <strong className="display text-[44px] tabular-nums text-navy">{cad(price.subtotal)}</strong>
          <span className="block text-xs text-ink-soft">{cad(price.perLabel)} per label</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-cream px-3 py-1">Ships in {price.turnaroundBusinessDays} business days</span>
        <span className="rounded-full bg-cream px-3 py-1">Firm until {expires}</span>
        <span className="rounded-full bg-cream px-3 py-1">Tax &amp; shipping at checkout</span>
      </div>

      {rec.flags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rec.flags.map((f, i) => (
            <li key={i} className="flex gap-2.5 rounded-xl bg-cream border-l-4 border-lime p-3 text-sm">
              {f.text}
            </li>
          ))}
        </ul>
      )}

      {price.alternatives.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-bold">Nearby quantities</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {price.alternatives.map((a) => (
              <div key={a.quantity} className="rounded-xl bg-cream p-2.5 text-sm">
                <div className="font-extrabold">{a.quantity.toLocaleString()}</div>
                <div className="tabular-nums">{cad(a.subtotal)}</div>
                <div className="text-xs text-ink-soft">{cad(a.perLabel)} each</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2 text-sm">
        <details>
          <summary className="font-bold">Why this price</summary>
          <ul className="mt-2 divide-y divide-navy/10 rounded-xl bg-cream px-3">
            {price.lineItems.map((li) => (
              <li key={li.code} className="py-2">
                <div className="flex justify-between gap-3">
                  <span>{li.label}</span>
                  <span className="font-bold tabular-nums">{cad(li.amount)}</span>
                </div>
                <div className="text-xs text-ink-soft">{li.explain}</div>
              </li>
            ))}
            {price.warnings.map((w, i) => (
              <li key={`w${i}`} className="py-2 text-xs">
                <b>Tip:</b> {w}
              </li>
            ))}
          </ul>
        </details>

        <details>
          <summary className="font-bold">Why we chose these materials</summary>
          <ul className="mt-2 space-y-1.5 rounded-xl bg-cream p-3">
            {rec.reasons.map((r, i) => (
              <li key={i}>{r.text}</li>
            ))}
          </ul>
        </details>

        <details>
          <summary className="font-bold">Technical spec</summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-cream p-3">
            {techSummary(rec.spec).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-1 text-xs text-ink-soft">Priced with rate card {price.rateCardVersion}.</div>
        </details>
      </div>

      {!compact && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href={`/quote/${quote.id}`} className="btn flex-1">
            Upload artwork &amp; order
          </Link>
          <Link href={`/quote/${quote.id}`} className="btn ghost flex-1">
            Open my quote link
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
