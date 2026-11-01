export const dynamic = "force-dynamic";
import Link from "next/link";
import { listQuotes } from "@/lib/quotes/store";
import { getRateCard } from "@/lib/pricing/engine";
import type { Quote } from "@/lib/quotes/model";
import { STATUS } from "@/lib/admin/status";

const cad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });



function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

const afterHours = (q: Quote) => {
  const d = new Date(q.createdAt);
  const h = Number(d.toLocaleString("en-CA", { hour: "numeric", hour12: false, timeZone: "America/Winnipeg" }));
  const day = d.toLocaleString("en-CA", { weekday: "short", timeZone: "America/Winnipeg" });
  return h < 8 || h >= 17 || day === "Sat" || day === "Sun";
};

export default async function Admin() {
  const quotes = await listQuotes(200);
  const card = getRateCard();
  const priced = quotes.filter((q) => q.price.ok);
  const value = priced.reduce((s, q) => s + (q.price.ok ? q.price.subtotal : 0), 0);
  const paid = quotes.filter((q) => q.status === "paid");
  const human = quotes.filter((q) => q.status === "needs_human");
  const after = quotes.filter(afterHours).length;
  const progressed = quotes.filter((q) => ["artwork_uploaded", "proof_approved", "paid"].includes(q.status)).length;

  const stats = [
    { n: String(quotes.length), l: "quotes", s: "all channels" },
    { n: cad(value), l: "quoted value", s: `${priced.length} priced automatically` },
    { n: quotes.length ? `${Math.round((after / quotes.length) * 100)}%` : "–", l: "after hours", s: "evenings & weekends" },
    { n: String(progressed), l: "moving to order", s: `${paid.length} paid` },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow !text-lime">Owner view</span>
          <h1 className="display mt-2 text-[56px] text-cream">
            Your <span className="text-lime">quotes.</span>
          </h1>
          <p className="text-sm text-cream/75">
            Every conversation, price and order in one place. Rate card <b className="text-cream">{card.version}</b> · minimum order ${card.limits.minOrderValue} · quotes firm {card.limits.quoteValidDays} days.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn !py-2.5 !text-sm">
            Try the customer side
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl bg-cream text-navy p-4">
            <div className="display text-[38px] leading-none">{s.n}</div>
            <div className="mt-2 font-extrabold">{s.l}</div>
            <div className="text-xs text-ink-soft">{s.s}</div>
          </div>
        ))}
      </div>

      {human.length > 0 && (
        <div className="rounded-2xl bg-[#f3c7b8] text-[#5a1f0e] px-4 py-3 text-sm">
          <b>{human.length}</b> quote{human.length > 1 ? "s" : ""} waiting on you: the assistant collected everything and flagged why it couldn't auto-price.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-paper text-navy">
        <table className="w-full text-sm">
          <thead className="bg-navy-deep text-cream text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {quotes.map((q) => {
              const st = STATUS[q.status] ?? { label: q.status, cls: "bg-cream" };
              return (
                <tr key={q.id} className="align-top hover:bg-cream/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/${q.id}`} className="font-extrabold underline decoration-lime decoration-2 underline-offset-4">
                      {q.needs.contact?.name || "Unnamed"}
                    </Link>
                    {q.needs.contact?.company && <div className="text-xs">{q.needs.contact.company}</div>}
                    <div className="text-xs text-ink-soft">{q.needs.contact?.email || q.needs.contact?.phone || "–"}</div>
                    <div className="mt-1 font-mono text-[11px] text-ink-soft">{q.id}</div>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="font-bold">{q.recommendation.plainSummary}</div>
                    {q.needs.productDescription && <div className="text-xs text-ink-soft line-clamp-2">“{q.needs.productDescription}”</div>}
                    {!q.price.ok && <div className="mt-1 text-xs text-[#b4432f]">Why: {q.price.reasons.join("; ")}</div>}
                    {q.recommendation.humanReview && <div className="mt-1 text-xs text-[#b4432f]">Regulated product: check compliance before print</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums">{q.price.ok ? cad(q.price.subtotal) : "–"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    {q.transcript && <div className="mt-1 text-[11px] text-ink-soft">{q.transcript.filter((t) => t.role === "user").length} messages</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft whitespace-nowrap">
                    {ago(q.createdAt)}
                    {afterHours(q) && <div className="mt-1 inline-block rounded bg-navy text-lime px-1.5 py-0.5 text-[10px] font-bold">AFTER HOURS</div>}
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-ink-soft" colSpan={5}>
                  No quotes yet. <Link href="/" className="underline">Try one</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-cream/60">Demo owner view without a login. Production adds owner login, the GoHighLevel pipeline, a pause switch and rate-card updates from your sheet.</p>
    </div>
  );
}
