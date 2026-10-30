"use client";

import { useEffect, useRef, useState } from "react";
import type { Needs } from "@/lib/advisor/needs";
import { STEPS, nextStep, parseQuantity, parseSize } from "@/lib/conversation/steps";
import type { Quote } from "@/lib/quotes/model";
import { QuoteCard } from "./QuoteCard";

type Msg =
  | { role: "assistant"; text: string }
  | { role: "user"; text: string }
  | { role: "quote"; quote: Quote };

export function QuoteChat() {
  const [needs, setNeeds] = useState<Needs>({ environment: [] });
  const [stepIdx, setStepIdx] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: STEPS[0].prompt({ environment: [] }) }]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const step = stepIdx >= 0 ? STEPS[stepIdx] : null;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  async function say(texts: string[]) {
    for (const t of texts) {
      setTyping(true);
      await new Promise((r) => setTimeout(r, Math.min(900, 250 + t.length * 6)));
      setTyping(false);
      setMsgs((m) => [...m, { role: "assistant", text: t }]);
    }
  }

  async function answer(raw: string | string[], display: string) {
    if (!step || typing) return;
    setError(null);
    const updated = step.apply(needs, raw);
    setNeeds(updated);
    setMsgs((m) => [...m, { role: "user", text: display }]);
    setText("");
    setMulti([]);

    const lines: string[] = [];
    const ack = step.ack?.(updated);
    if (ack) lines.push(ack);

    const ni = nextStep(updated, stepIdx);
    if (ni === -1) {
      setStepIdx(-1);
      lines.push("Putting your quote together…");
      await say(lines);
      await finish(updated);
      return;
    }
    lines.push(STEPS[ni].prompt(updated));
    setStepIdx(ni);
    await say(lines);
  }

  async function finish(n: Needs) {
    setTyping(true);
    try {
      const r = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs: n, channel: "web" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "quote failed");
      const q: Quote = j.quote;
      setTyping(false);
      const intro = q.price.ok
        ? `Here's your firm price. I've written out why I chose each material under the quote, and the nearby quantities in case a bigger run makes sense. Your quote link is ${q.id}.`
        : `This one needs a person, and that's fine. Here's what I've saved for them.`;
      setMsgs((m) => [...m, { role: "assistant", text: intro }, { role: "quote", quote: q }]);
      if (q.price.ok) {
        await say([
          n.artwork === "print_ready"
            ? "When you're ready, upload your print file and I'll check it against the label size, then show you a proof to approve before you pay."
            : "You can upload artwork any time from your quote link. If you need design help, our team will quote that separately.",
        ]);
      }
      setDone(true);
    } catch (e) {
      setTyping(false);
      setError((e as Error).message);
    }
  }

  function submitText() {
    if (!step) return;
    const v = text.trim();
    if (!v) return;
    if (step.kind === "quantity") {
      const q = parseQuantity(v);
      if (!q) return setError("Just a number is fine, like 2500 or 10k.");
      return answer(String(q), q.toLocaleString() + " labels");
    }
    if (step.kind === "size") {
      const s = parseSize(v);
      if (!s) return setError('Type it as width x height in inches, like 3 x 4, or pick a container below.');
      return answer(`${s.w}x${s.h}`, `${s.w}" × ${s.h}"`);
    }
    answer(v, v);
  }

  function submitContact() {
    if (!contact.email && !contact.phone) return setError("An email or a phone number, so I can send the link.");
    answer([contact.name, contact.email, contact.phone], [contact.name, contact.email, contact.phone].filter(Boolean).join(" · "));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-40 space-y-3">
        {msgs.map((m, i) =>
          m.role === "quote" ? (
            <div key={i} className="rise">
              <QuoteCard quote={m.quote} />
            </div>
          ) : (
            <div key={i} className={`rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user" ? "bg-navy text-white rounded-br-md" : "bg-cream text-ink rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-cream px-4 py-3 flex gap-1">
              <span className="dot h-2 w-2 rounded-full bg-navy" />
              <span className="dot h-2 w-2 rounded-full bg-navy" />
              <span className="dot h-2 w-2 rounded-full bg-navy" />
            </div>
          </div>
        )}
        {done && (
          <div className="pt-2 text-center">
            <button onClick={() => window.location.reload()} className="text-sm font-semibold text-navy underline">
              Start another quote
            </button>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {step && !typing && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-3 space-y-2">
            {error && <div className="text-sm text-red-700">{error}</div>}

            {(step.kind === "chips" || step.kind === "quantity" || step.kind === "size") && step.options && (
              <div className="flex flex-wrap gap-2">
                {step.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => answer(o.id, o.hint && step.kind === "size" ? `${o.label} (${o.hint})` : o.label)}
                    className="rounded-full border border-navy/30 bg-white px-3.5 py-2 text-sm font-medium text-navy hover:bg-cream active:bg-lime/40"
                    title={o.hint}
                  >
                    {o.label}
                    {o.hint && step.kind !== "size" && <span className="ml-1 text-xs text-muted">· {o.hint}</span>}
                  </button>
                ))}
              </div>
            )}

            {step.kind === "multichips" && step.options && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {step.options.map((o) => {
                    const on = multi.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o.id) : [...m, o.id]))}
                        className={`rounded-full border px-3.5 py-2 text-sm font-medium ${
                          on ? "border-navy bg-navy text-white" : "border-navy/30 bg-white text-navy hover:bg-cream"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={multi.length === 0}
                  onClick={() =>
                    answer(
                      multi,
                      multi.map((id) => step.options!.find((o) => o.id === id)?.label).join(", "),
                    )
                  }
                  className="w-full rounded-xl bg-lime px-4 py-3 font-semibold text-navy disabled:opacity-40"
                >
                  That's everything
                </button>
              </div>
            )}

            {step.kind === "contact" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={inputCls} placeholder="Your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                <input className={inputCls} placeholder="Email" type="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                <input className={inputCls} placeholder="Mobile (for texts)" type="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                <button onClick={submitContact} className="sm:col-span-3 rounded-xl bg-lime px-4 py-3 font-semibold text-navy">
                  Show my price
                </button>
              </div>
            )}

            {(step.kind === "text" || step.kind === "quantity" || step.kind === "size") && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitText();
                }}
              >
                <input
                  className={inputCls + " flex-1"}
                  placeholder={step.placeholder ?? (step.kind === "quantity" ? "Or type a quantity" : step.kind === "size" ? 'Or type a size, e.g. 3 x 4' : "Type your answer")}
                  value={text}
                  inputMode={step.kind === "quantity" ? "numeric" : "text"}
                  onChange={(e) => setText(e.target.value)}
                  autoFocus={step.kind === "text"}
                />
                <button type="submit" className="rounded-xl bg-navy px-4 py-3 font-semibold text-white">
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-lime/50";
