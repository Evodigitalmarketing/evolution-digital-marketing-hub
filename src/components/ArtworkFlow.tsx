"use client";

import { useState } from "react";
import type { Quote } from "@/lib/quotes/model";

const BLEED_IN = 0.125;
const SAFE_IN = 0.0625;

export function ArtworkFlow({ initial }: { initial: Quote }) {
  const [quote, setQuote] = useState<Quote>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rights, setRights] = useState(false);
  const spec = quote.recommendation.spec;

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/quotes/${quote.id}/artwork`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setQuote(j.quote);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/quotes/${quote.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setQuote(j.quote);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!quote.price.ok) return null;

  const art = quote.artwork;
  const stage = quote.status === "paid" ? 4 : quote.status === "proof_approved" ? 3 : art?.preflight.ok ? 2 : 1;

  return (
    <div className="on-cream rounded-2xl bg-cream text-navy p-5 space-y-5">
      <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        {["Artwork", "Proof", "Pay"].map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${stage >= i + 1 ? "text-navy" : "text-ink-soft"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${stage > i + 1 ? "bg-lime text-navy" : stage === i + 1 ? "bg-navy text-cream" : "bg-cream-2"}`}>
              {stage > i + 1 ? "✓" : i + 1}
            </span>
            {s}
            {i < 2 && <span className="w-6 border-t border-navy/20" />}
          </li>
        ))}
      </ol>

      {err && <div className="rounded-xl bg-paper border-l-4 border-[#d9534f] p-3 text-sm">{err}</div>}

      {/* Step 1: upload */}
      {stage <= 1 && (
        <div>
          <h3 className="text-lg">Upload your print file</h3>
          <p className="mt-1 text-sm text-ink-soft">
            PDF, AI or EPS preferred. PNG or JPG works at 300 dpi. Set your page to{" "}
            <b>
              {(spec.widthIn + 2 * BLEED_IN).toFixed(3)}" × {(spec.heightIn + 2 * BLEED_IN).toFixed(3)}"
            </b>{" "}
            (that's your {spec.widthIn}" × {spec.heightIn}" label plus {BLEED_IN}" bleed on each side). I'll check it the moment it lands.
          </p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy/30 bg-paper px-4 py-8 text-center hover:border-lime-ink">
            <span className="font-extrabold text-navy">{busy ? "Checking your file…" : "Tap to choose a file"}</span>
            <span className="mt-1 text-xs text-ink-soft">PDF, AI, EPS, PNG or JPG</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.tif,.tiff,application/pdf,image/*"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {art && !art.preflight.ok && (
            <div className="mt-3 rounded-xl bg-paper border-l-4 border-[#e0794f] p-3 text-sm">
              <div className="font-extrabold">A couple of things to fix in {art.fileName}</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {art.preflight.issues.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-soft">Fix and upload again, or reply to your quote email and a person will help. Your price doesn't change.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: proof */}
      {stage === 2 && art && (
        <div>
          <h3 className="text-lg">Check your proof</h3>
          <p className="mt-1 text-sm text-ink-soft">
            This is your artwork at label size. The outer dashed line is the bleed (trimmed off); the inner dashed line is
            the safe area (keep text inside it). Colours on screen are a guide only; print is CMYK and can differ slightly.
          </p>
          <ProofView art={art} widthIn={spec.widthIn} heightIn={spec.heightIn} />
          <ul className="mt-3 space-y-1 text-xs text-ink-soft">
            {art.preflight.notes.map((n, i) => (
              <li key={i}>✓ {n}</li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span>
              I own or am licensed to print this artwork, I've checked spelling and layout, and I understand screen colours can
              differ from print.
            </span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              disabled={!rights || busy}
              onClick={() => post({ rightsConfirmed: true })}
              className="btn flex-1"
            >
              Approve proof
            </button>
            <label className="btn ghost flex-1 cursor-pointer">
              Upload a different file
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {/* Step 3: pay */}
      {stage === 3 && (
        <div>
          <h3 className="text-lg">Proof approved. Ready to order.</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Approved {new Date(quote.proof!.approvedAt).toLocaleString("en-CA")}. Checkout is where shipping and tax are added;
            the label price is exactly what's quoted.
          </p>
          <button
            disabled={busy}
            onClick={() => post({ action: "pay" })}
            className="btn mt-4 w-full"
          >
            Continue to secure checkout
          </button>
          <p className="mt-2 text-center text-xs text-ink-soft">
            Demo: in production this creates the order in Label Source's store and opens Stripe checkout.
          </p>
        </div>
      )}

      {stage === 4 && (
        <div className="rounded-xl bg-navy text-cream p-5">
          <h3 className="text-xl">Order placed. <span className="text-lime">Thank you.</span></h3>
          <p className="mt-2 text-sm text-cream/85">
            {quote.recommendation.plainSummary}. We'll email a confirmation and tracking when it ships (about{" "}
            {quote.price.turnaroundBusinessDays} business days).
            {quote.recommendation.humanReview && " One of our team will confirm the regulatory details with you before it prints."}
          </p>
        </div>
      )}
    </div>
  );
}

function ProofView({ art, widthIn, heightIn }: { art: NonNullable<Quote["artwork"]>; widthIn: number; heightIn: number }) {
  const fullW = widthIn + 2 * BLEED_IN;
  const fullH = heightIn + 2 * BLEED_IN;
  const pct = (inches: number, total: number) => `${(inches / total) * 100}%`;
  return (
    <div className="mt-3 rounded-xl bg-navy p-4 sm:p-6">
      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <div className="relative w-full shadow-lg" style={{ aspectRatio: `${fullW} / ${fullH}`, background: "#fff" }}>
          {art.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art.dataUrl} alt="Artwork proof" className="absolute inset-0 h-full w-full object-fill" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-sm text-ink-soft p-4">
              <span className="font-semibold text-ink">{art.fileName}</span>
              <span>Vector file: prepress renders the final proof image. Dimensions checked.</span>
            </div>
          )}
          {/* trim line */}
          <div
            className="absolute border border-dashed border-[#ff6b5b]/90 pointer-events-none"
            style={{ left: pct(BLEED_IN, fullW), top: pct(BLEED_IN, fullH), right: pct(BLEED_IN, fullW), bottom: pct(BLEED_IN, fullH) }}
          />
          {/* safe area */}
          <div
            className="absolute border border-dashed border-[#4fb3ff]/80 pointer-events-none"
            style={{
              left: pct(BLEED_IN + SAFE_IN, fullW),
              top: pct(BLEED_IN + SAFE_IN, fullH),
              right: pct(BLEED_IN + SAFE_IN, fullW),
              bottom: pct(BLEED_IN + SAFE_IN, fullH),
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-cream/75">
          <span>
            <span className="inline-block h-2 w-4 border-t border-dashed border-[#ff6b5b] align-middle" /> trim {widthIn}" × {heightIn}"
          </span>
          <span>
            <span className="inline-block h-2 w-4 border-t border-dashed border-[#4fb3ff] align-middle" /> safe area
          </span>
        </div>
      </div>
    </div>
  );
}
