import { getQuote } from "@/lib/quotes/store";
import { ownerEmail } from "@/lib/notify/email";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = await getQuote(id.toUpperCase());
  if (!q) return new Response("not found", { status: 404 });
  const m = ownerEmail(q);
  const subject = m.subject.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const banner = `<div style="font-family:Helvetica,Arial;background:#1f2536;color:#f4f1e4;padding:10px 16px;font-size:13px">Email preview · <b>Subject:</b> ${subject}</div>`;
  const html = m.html.replace(/<body([^>]*)>/, (_all, attrs: string) => `<body${attrs}>${banner}`);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
