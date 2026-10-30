"use client";

import { useEffect, useRef, useState } from "react";
import type { Needs } from "@/lib/advisor/needs";
import { STEPS, nextStep } from "@/lib/conversation/steps";
import { interpretAnswer } from "@/lib/conversation/interpret";
import type { Quote } from "@/lib/quotes/model";
import { QuoteCard } from "./QuoteCard";

const STARTERS = [
  "Hot sauce in 250 ml glass bottles, kept in the fridge",
  "Soy candles in 8 oz glass jars",
  "4x6 shipping labels for our Zebra printer",
  "Coffee bags, full colour, about 2,500",
];

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
  const [contact, setContact] = useState({ name: "", company: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const step = stepIdx >= 0 ? STEPS[stepIdx] : null;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  useEffect(() => {
    if (!typing && step && step.kind !== "contact") inputRef.current?.focus();
  }, [typing, step]);

  async function say(texts: string[]) {
    for (const t of texts) {
      if (!t) continue;
      setTyping(true);
      await new Promise((r) => setTimeout(r, Math.min(900, 250 + t.length * 5)));
      setTyping(false);
      setMsgs((m) => [...m, { role: "assistant", text: t }]);
    }
  }

  async function answer(raw: string | string[], display: string, note?: string) {
    if (!step || typing) return;
    setError(null);
    const updated = step.apply(needs, raw);
    setNeeds(updated);
    setMsgs((m) => [...m, { role: "user", text: display }]);
    setText("");
    setMulti([]);

    const lines: string[] = [];
    if (note) lines.push(note);
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
        ? `Here's your price. It's firm for 30 days. I've written out why I chose each material under the quote, and the nearby quantities in case a bigger run makes sense. Your quote number is ${q.id}.`
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
    if (step.kind === "text") return answer(v, v);
    if (step.kind === "multichips" && multi.length && !v) return;
    const it = interpretAnswer(step.id, v, needs);
    if (it.clarify || it.value == null) {
      setMsgs((m) => [...m, { role: "user", text: v }]);
      setText("");
      void say([it.clarify ?? "Sorry, I didn't catch that."]);
      return;
    }
    answer(it.value, it.display, it.note);
  }

  function submitContact() {
    if (!contact.email && !contact.phone) return setError("An email or a mobile number, so I can send you the link.");
    answer([contact.name, contact.email, contact.phone, contact.company], [contact.name, contact.company, contact.email, contact.phone].filter(Boolean).join(" · "));
  }

  const showInput = step && step.kind !== "contact";

  return (
    <div className="panel flex flex-col h-[min(78vh,720px)] min-h-[560px] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy/10 bg-cream-2/60">
        <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/Maple-Leaf-Green-Icon.svg" alt="" className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-extrabold text-navy">Label Source quote assistant</div>
          <div className="text-xs text-ink-soft flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#46b450]" /> Online · firm prices in minutes
          </div>
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5">
        {msgs.map((m, i) =>
          m.role === "quote" ? (
            <div key={i} className="rise self-stretch my-1">
              <QuoteCard quote={m.quote} />
            </div>
          ) : (
            <div key={i} className={`rise msg ${m.role === "user" ? "them" : "us"}`}>
              {m.text}
            </div>
          ),
        )}
        {typing && (
          <div className="msg us flex gap-1 py-3.5">
            <span className="dot h-2 w-2 rounded-full bg-navy" />
            <span className="dot h-2 w-2 rounded-full bg-navy" />
            <span className="dot h-2 w-2 rounded-full bg-navy" />
          </div>
        )}
        {done && (
          <button onClick={() => window.location.reload()} className="self-center mt-2 text-sm font-bold text-navy underline">
            Start another quote
          </button>
        )}
        <div ref={bottom} />
      </div>

      {step && !typing && (
        <div className="border-t border-navy/10 bg-cream-2/60 px-4 py-3 space-y-2.5">
          {error && <div className="text-sm text-[#b4432f]">{error}</div>}

          {stepIdx === 0 && (
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((t) => (
                <button key={t} onClick={() => answer(t, t)} className="chip !font-normal">
                  {t}
                </button>
              ))}
            </div>
          )}

          {step.options && step.kind !== "multichips" && (
            <div className="flex flex-wrap gap-2 max-h-[132px] overflow-y-auto scroll-thin">
              {step.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => answer(o.id, o.hint && step.kind === "size" ? `${o.label} (${o.hint})` : o.label)}
                  className="chip"
                  title={o.hint}
                >
                  {o.label}
                  {o.hint && <span className="ml-1 font-normal text-ink-soft">· {o.hint}</span>}
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
                      className={`chip ${on ? "on" : ""}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {multi.length > 0 && (
                <button
                  onClick={() => answer(multi, multi.map((id) => step.options!.find((o) => o.id === id)?.label).join(", "))}
                  className="btn w-full"
                >
                  That's everything
                </button>
              )}
            </div>
          )}

          {step.kind === "contact" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="field square" placeholder="Your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <input className="field square" placeholder="Business (optional)" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
              <input className="field square" placeholder="Email" type="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <input className="field square" placeholder="Mobile (for texts)" type="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              <button onClick={submitContact} className="btn sm:col-span-2">
                Show my price
              </button>
            </div>
          )}

          {showInput && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitText();
              }}
            >
              <input
                ref={inputRef}
                className="field flex-1"
                placeholder={
                  step.placeholder ??
                  (step.kind === "quantity"
                    ? "Or type a quantity, like 2500 or 10k"
                    : step.kind === "size"
                      ? 'Or type a size (3 x 4) or "30 ml bottle"'
                      : step.kind === "multichips"
                        ? "Or describe it: fridge, outdoors, gets wet…"
                        : "Or type your answer")
                }
                value={text}
                inputMode={step.kind === "quantity" ? "numeric" : "text"}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" aria-label="Send" className="btn !px-4 shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
