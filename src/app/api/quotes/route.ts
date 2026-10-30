import { NextResponse } from "next/server";
import { createQuote } from "@/lib/quotes/create";
import type { Needs } from "@/lib/advisor/needs";


export async function POST(req: Request) {
  let body: { needs?: Needs; channel?: "web" | "sms" | "email" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.needs) return NextResponse.json({ error: "needs required" }, { status: 400 });
  const needs: Needs = { ...body.needs, environment: body.needs.environment ?? [] };
  if (needs.quantity != null && (!Number.isFinite(needs.quantity) || needs.quantity <= 0))
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  const quote = await createQuote(needs, body.channel ?? "web");
  return NextResponse.json({ quote });
}
