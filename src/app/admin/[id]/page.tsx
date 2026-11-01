export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote } from "@/lib/quotes/store";
import { STATUS } from "@/lib/admin/status";
import { QuoteCard } from "@/components/QuoteCard";
import { emailEnabled } from "@/lib/notify/email";

const EVENT_LABEL: Record<string, string> = {
  created: "Quote started",
  priced: "Priced automatically",
  escalated: "Flagged for a person",
  preflight_passed: "Artwork passed preflight",
  preflight_failed: "Artwork needs fixes",
  proof_approved: "Proof approved",
  paid: "Paid",
};

export default async function AdminQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuote(id.toUpperCase());
  if (!q) notFound();
  const st = STATUS[q.status] ?? { label: q.status, cls: "bg-cream" };
  const c = q.needs.contact ?? {};

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 space-y-5">
      <Link href="/admin" className="text-sm font-bold text-lime">
        ← All quotes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-[clamp(38px,5vw,56px)] text-cream">
          {c.name || "Unnamed"} <span className="text-lime">· {q.id}</span>
        </h1>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_420px] items-start">
        <div className="space-y-5">
          <div className="rounded-2xl bg-cream text-navy p-5">
            <div className="eyebrow">Customer</div>
            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <div><b>{c.name || "–"}</b>{c.company ? ` · ${c.company}` : ""}</div>
              <div>{c.email ? <a className="underline" href={`mailto:${c.email}`}>{c.email}</a> : "–"}</div>
              <div>{c.phone ? <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a> : "–"}</div>
              <div>Channel: {q.channel}</div>
            </div>
            {q.needs.productDescription && <p className="mt-3 text-sm">“{q.needs.productDescription}”</p>}
            {q.needs.notes && <p className="mt-2 text-sm"><b>Notes for the team:</b> {q.needs.notes}</p>}
          </div>

          <div className="rounded-2xl bg-cream text-navy p-5">
            <div className="eyebrow">Conversation</div>
            {q.transcript?.length ? (
              <div className="mt-3 flex flex-col gap-2 max-h-[560px] overflow-y-auto scroll-thin">
                {q.transcript.map((t, i) => (
                  <div key={i} className={`msg whitespace-pre-line ${t.role === "user" ? "them" : "us"}`}>
                    {t.text.replace(/\*\*/g, "")}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">This quote came through the quick-question flow, so there's no free-form conversation to show. Answers are in the spec.</p>
            )}
          </div>

          <div className="rounded-2xl bg-cream text-navy p-5">
            <div className="eyebrow">Timeline</div>
            <ol className="mt-3 space-y-2 text-sm">
              {q.events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime-ink" />
                  <span>
                    <b>{EVENT_LABEL[e.type] ?? e.type}</b>{" "}
                    <span className="text-ink-soft">{new Date(e.at).toLocaleString("en-CA", { timeZone: "America/Winnipeg" })}</span>
                    {e.detail && <span className="block text-xs text-ink-soft">{e.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <QuoteCard quote={q} compact />
          <div className="rounded-2xl bg-navy-deep/70 border border-cream/15 p-4 text-sm text-cream/85">
            <div className="font-bold text-cream">Email to the team</div>
            <p className="mt-1">
              {emailEnabled() ? "Sent to your quotes inbox when this quote came in." : "Email sending isn't switched on yet; this is what would land in your inbox."}
            </p>
            <Link href={`/admin/email/${q.id}`} className="btn mt-3 !py-2 !text-sm">
              Preview the email
            </Link>
            <Link href={`/quote/${q.id}`} className="ml-3 text-sm font-bold text-lime underline">
              Customer view
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
