import { NextResponse } from "next/server";
import { getQuote, saveQuote } from "@/lib/quotes/store";
import { isExpired } from "@/lib/quotes/model";


// Proof approval. Records who/when/which file, plus the artwork-rights confirmation.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quote = await getQuote(id.toUpperCase());
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (isExpired(quote)) return NextResponse.json({ error: "quote expired" }, { status: 410 });
  if (!quote.artwork?.preflight.ok) return NextResponse.json({ error: "artwork must pass preflight first" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { rightsConfirmed?: boolean; action?: "approve" | "pay" };

  if (body.action === "pay") {
    if (quote.status !== "proof_approved") return NextResponse.json({ error: "approve the proof first" }, { status: 400 });
    // Demo stub. Production: create the WooCommerce order via REST with the quoted
    // line items, then redirect to Woo checkout (Stripe). The order references quote.id
    // so the charged amount is always the quoted amount.
    quote.status = "paid";
    quote.events.push({ at: new Date().toISOString(), type: "paid", detail: "demo checkout stub" });
    await saveQuote(quote);
    return NextResponse.json({ quote });
  }

  if (!body.rightsConfirmed) return NextResponse.json({ error: "artwork rights must be confirmed" }, { status: 400 });
  quote.proof = {
    approvedAt: new Date().toISOString(),
    fileHash: quote.artwork.storedPath ?? "",
    rightsConfirmed: true,
  };
  quote.status = "proof_approved";
  quote.events.push({ at: quote.proof.approvedAt, type: "proof_approved", detail: quote.proof.fileHash });
  await saveQuote(quote);
  return NextResponse.json({ quote });
}
