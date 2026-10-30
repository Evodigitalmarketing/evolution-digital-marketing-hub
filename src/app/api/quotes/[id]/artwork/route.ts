import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getQuote, saveQuote } from "@/lib/quotes/store";
import { preflight } from "@/lib/artwork/preflight";


export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quote = await getQuote(id.toUpperCase());
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!quote.price.ok) return NextResponse.json({ error: "quote needs a human first" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const spec = quote.recommendation.spec;
  const result = await preflight({ name: file.name, mime: file.type, bytes }, spec.widthIn, spec.heightIn);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);

  quote.artwork = { ...result, uploadedAt: new Date().toISOString(), storedPath: `sha256:${hash}` };
  quote.status = "artwork_uploaded";
  quote.proof = undefined;
  quote.events.push({
    at: quote.artwork.uploadedAt,
    type: result.preflight.ok ? "preflight_passed" : "preflight_failed",
    detail: `${file.name} (${bytes.length} bytes)` + (result.preflight.ok ? "" : `: ${result.preflight.issues.join(" | ")}`),
  });
  await saveQuote(quote);
  return NextResponse.json({ quote });
}
