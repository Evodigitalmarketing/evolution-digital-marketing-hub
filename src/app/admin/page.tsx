export const dynamic = "force-dynamic";
import Link from "next/link";
import { listQuotes } from "@/lib/quotes/store";
import { getRateCard } from "@/lib/pricing/engine";


const cad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const STATUS_LABEL: Record<string, string> = {
  quoted: "Quoted, awaiting artwork",
  needs_human: "Needs a person",
  artwork_uploaded: "Artwork in",
  proof_approved: "Proof approved",
  paid: "Paid",
  expired: "Expired",
};

export default async function Admin() {
  const quotes = await listQuotes(200);
  const card = getRateCard();
  const total = quotes.filter((q) => q.price.ok).length;
  const paid = quotes.filter((q) => q.status === "paid");
  const human = quotes.filter((q) => q.status === "needs_human");
  const revenue = paid.reduce((s, q) => s + (q.price.ok ? q.price.subtotal : 0), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Quotes</h1>
          <p className="text-sm text-muted">
            Rate card <b>{card.version}</b> · min order {cad(card.limits.minOrderValue)} · quotes valid {card.limits.quoteValidDays} days
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <Stat label="Quotes" value={String(quotes.length)} />
          <Stat label="Auto-priced" value={quotes.length ? `${Math.round((total / quotes.length) * 100)}%` : "–"} />
          <Stat label="Paid" value={String(paid.length)} />
          <Stat label="Revenue" value={cad(revenue)} />
        </div>
      </div>

      {human.length > 0 && (
        <div className="rounded-xl border border-coral bg-coral/15 p-3 text-sm">
          <b>{human.length}</b> quote{human.length > 1 ? "s" : ""} waiting for a person. Reasons are listed on each.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Quote</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">What</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {quotes.map((q) => (
              <tr key={q.id} className="align-top">
                <td className="px-3 py-2 font-mono">
                  <Link className="text-navy underline" href={`/quote/${q.id}`}>
                    {q.id}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <div>{q.needs.contact?.name || "–"}</div>
                  <div className="text-xs text-muted">{q.needs.contact?.email || q.needs.contact?.phone}</div>
                </td>
                <td className="px-3 py-2 max-w-md">
                  <div>{q.recommendation.plainSummary}</div>
                  {q.needs.productDescription && <div className="text-xs text-muted line-clamp-2">“{q.needs.productDescription}”</div>}
                  {!q.price.ok && <div className="text-xs text-red-700">Needs human: {q.price.reasons.join("; ")}</div>}
                  {q.recommendation.humanReview && <div className="text-xs text-red-700">Regulated category: confirm compliance before print</div>}
                </td>
                <td className="px-3 py-2 text-right font-medium">{q.price.ok ? cad(q.price.subtotal) : "–"}</td>
                <td className="px-3 py-2">{STATUS_LABEL[q.status] ?? q.status}</td>
                <td className="px-3 py-2 text-xs text-muted">{new Date(q.createdAt).toLocaleString("en-CA")}</td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted" colSpan={6}>
                  No quotes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Demo admin view, no login. Production: owner login, GHL pipeline sync, rate-card reload, pause switch.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <div className="text-lg font-bold text-navy">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
