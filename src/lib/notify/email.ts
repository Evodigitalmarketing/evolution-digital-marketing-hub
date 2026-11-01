import nodemailer from "nodemailer";
import type { Quote } from "../quotes/model";
import { techSummary } from "../advisor/recommend";

// Owner notification. Sends through SMTP when SMTP_HOST / SMTP_USER / SMTP_PASS /
// NOTIFY_TO are set; otherwise it's a no-op and the email can still be previewed at
// /admin/email/[id]. Failures never block the customer.

const cad = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NOTIFY_TO);
}

export function siteUrl() {
  return (process.env.SITE_URL || "https://palevioletred-viper-239162.hostingersite.com").replace(/\/$/, "");
}

export type NotifyKind = "new_quote" | "needs_human" | "artwork" | "proof_approved" | "paid";

export function ownerEmail(q: Quote, kind: NotifyKind = q.price.ok ? "new_quote" : "needs_human") {
  const c = q.needs.contact ?? {};
  const who = [c.name, c.company].filter(Boolean).join(", ") || "A customer";
  const total = q.price.ok ? cad(q.price.subtotal) : "needs a person";
  const subjects: Record<NotifyKind, string> = {
    new_quote: `New quote ${q.id}: ${total} · ${who}`,
    needs_human: `Needs a person: ${q.id} · ${who}`,
    artwork: `Artwork uploaded on ${q.id} · ${who}`,
    proof_approved: `Proof approved on ${q.id} · ${who}`,
    paid: `Order paid: ${q.id} · ${total}`,
  };
  const headline: Record<NotifyKind, string> = {
    new_quote: "A customer just got an instant quote.",
    needs_human: "This one needs you. The assistant couldn't auto-price it.",
    artwork: "Artwork came in and passed preflight.",
    proof_approved: "The customer approved their proof.",
    paid: "Paid. Ready for production.",
  };
  const link = `${siteUrl()}/quote/${q.id}`;
  const admin = `${siteUrl()}/admin/${q.id}`;
  const rows = techSummary(q.recommendation.spec)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6178">${esc(k)}</td><td style="padding:4px 0;font-weight:700">${esc(v)}</td></tr>`)
    .join("");
  const flags = q.recommendation.flags.map((f) => `<li>${esc(f.text)}</li>`).join("");
  const reasons = !q.price.ok ? `<p style="margin:12px 0 0;color:#b4432f"><b>Why:</b> ${esc(q.price.reasons.join("; "))}</p>` : "";
  const notes = q.needs.notes ? `<p style="margin:12px 0 0"><b>Customer notes:</b> ${esc(q.needs.notes)}</p>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f4f1e4;font-family:Sen,Helvetica,Arial,sans-serif;color:#2a3144">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#2a3144;color:#f4f1e4;border-radius:16px 16px 0 0;padding:18px 22px">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#c7d903;font-weight:700">Label Source · Instant Quote</div>
    <div style="font-size:20px;font-weight:800;margin-top:6px">${esc(headline[kind])}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:22px">
    <table style="width:100%;border-collapse:collapse"><tr>
      <td><div style="font-size:12px;color:#5b6178">Quote ${q.id}</div><div style="font-size:17px;font-weight:800;margin-top:2px">${esc(q.recommendation.plainSummary)}</div></td>
      <td style="text-align:right;vertical-align:top"><div style="font-size:26px;font-weight:800">${esc(total)}</div>${q.price.ok ? `<div style="font-size:12px;color:#5b6178">${cad(q.price.perLabel)} / label · ships ${q.price.turnaroundBusinessDays} days</div>` : ""}</td>
    </tr></table>
    ${reasons}
    <div style="margin-top:16px;padding:14px;background:#f4f1e4;border-radius:12px">
      <div style="font-weight:800">${esc(who)}</div>
      <div style="font-size:14px">${[c.email, c.phone].filter(Boolean).map((x) => esc(String(x))).join(" · ") || "no contact details"}</div>
      ${q.needs.productDescription ? `<div style="font-size:14px;margin-top:6px;color:#5b6178">“${esc(q.needs.productDescription)}”</div>` : ""}
    </div>
    <table style="margin-top:14px;font-size:14px;border-collapse:collapse">${rows}</table>
    ${flags ? `<ul style="margin:12px 0 0;padding-left:18px;font-size:14px">${flags}</ul>` : ""}
    ${notes}
    <div style="margin-top:20px">
      <a href="${admin}" style="display:inline-block;background:#c7d903;color:#2a3144;font-weight:800;text-decoration:none;padding:12px 20px;border-radius:999px">Open in owner view</a>
      <a href="${link}" style="display:inline-block;margin-left:8px;color:#2a3144;font-weight:700;padding:12px 8px">See what the customer sees</a>
    </div>
  </div>
  <p style="font-size:12px;color:#5b6178;text-align:center;margin-top:14px">Sent by the Label Source quote assistant · channel: ${q.channel}</p>
</div></body></html>`;

  const text = `${headline[kind]}\n\nQuote ${q.id}: ${q.recommendation.plainSummary}\nTotal: ${total}\nCustomer: ${who} ${[c.email, c.phone].filter(Boolean).join(" · ")}\n\nOwner view: ${admin}\nCustomer view: ${link}`;
  return { subject: subjects[kind], html, text };
}

export async function notifyOwner(q: Quote, kind?: NotifyKind) {
  if (!emailEnabled()) return { sent: false, reason: "email not configured" };
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const m = ownerEmail(q, kind);
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.NOTIFY_TO, subject: m.subject, html: m.html, text: m.text, replyTo: q.needs.contact?.email });
    return { sent: true };
  } catch (e) {
    console.error("notify failed", e);
    return { sent: false, reason: (e as Error).message };
  }
}
