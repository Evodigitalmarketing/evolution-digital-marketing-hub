import { NextResponse } from "next/server";
import { getQuote } from "@/lib/quotes/store";


export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quote = await getQuote(id.toUpperCase());
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ quote });
}
