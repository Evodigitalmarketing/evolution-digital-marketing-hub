"use client";

import { useEffect, useRef, useState } from "react";
import type { Needs } from "@/lib/advisor/needs";
import { STEPS, nextStep } from "@/lib/conversation/steps";
import { interpretAnswer } from "@/lib/conversation/interpret";
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
    answer([contact.name, contact.email, contact.phone], [contact.name, contact.email, contact.phone].filter(Boolean).join(" · "));
  }

  const showInput = step && step.kind !== "contact";

  return (
    <section className="bg-navy text-cream flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-6 flex flex-col">
        <div className="mb-4">
          <span className="eyebrow">Instant quote</span>
          <h1 className="mt-3 text-[clamp(28px,5vw,44px)]">
            Tell us about your product. <span className="text-lime">We'll do the label part.</span>
          </h1>
          <p className="mt-3 text-cream/85 max-w-[60ch]">
            Describe what you sell in your own words. We pick the right material, give you a firm price, check your artwork
            and take the order. No label jargon required.
          </p>
        </div>

        <div className="bg-navy-deep border border-cream/10 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,.35)] flex flex-col flex-1 min-h-[520px]">
          <div className="flex justify-between items-center text-xs text-cream/70 px-5 pt-4 pb-2">
            <span>
              <b className="text-cream">Label Source</b> · quote assistant
            </span>
            <span>Replies in seconds</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-2.5">
            {msgs.map((m, i) =>
              m.role === "quote" ? (
                <div key={i} className="rise self-stretch">
                  <QuoteCard quote={m.quote} />
                </div>
              ) : (
                <div key={i} className={`rise msg ${m.role === "user" ? "them" : "us"}`}>
                  {m.text}
                </div>
              ),
            )}
            {typing && (
              <div className="msg us flex gap-1 py-3">
                <span className="dot h-2 w-2 rounded-full bg-cream" />
                <span className="dot h-2 w-2 rounded-full bg-cream" />
                <span className="dot h-2 w-2 rounded-full bg-cream" />
              </div>
            )}
            {done && (
              <button onClick={() => window.location.reload()} className="self-center mt-2 text-sm font-bold text-lime underline">
                Start another quote
              </button>
            )}
            <div ref={bottom} />
          </div>

          {step && !typing && (
            <div className="border-t border-cream/10 px-4 py-3 space-y-2.5">
              {error && <div className="text-sm text-[#ffb3a1]">{error}</div>}

              {step.options && step.kind !== "multichips" && (
                <div className="flex flex-wrap gap-2">
                  {step.options.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => answer(o.id, o.hint && step.kind === "size" ? `${o.label} (${o.hint})` : o.label)}
                      className="chip"
                      title={o.hint}
                    >
                      {o.label}
                      {o.hint && step.kind !== "size" && <span className="ml-1 font-normal text-cream/60">· {o.hint}</span>}
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="field" placeholder="Your name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  <input className="field" placeholder="Email" type="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  <input className="field" placeholder="Mobile (for texts)" type="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  <button onClick={submitContact} className="btn sm:col-span-3">
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
                          ? 'Or type a size (3 x 4) or container ("30 ml bottle")'
                          : step.kind === "multichips"
                            ? "Or describe it: fridge, outdoors, gets wet…"
                            : "Or type your answer")
                    }
                    value={text}
                    inputMode={step.kind === "quantity" ? "numeric" : "text"}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button type="submit" className="btn px-5">
                    Send
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-cream/60 text-center">
          You can type at any point instead of tapping. Unusual job? We'll say so and a person will quote it.
        </p>
      </div>
    </section>
  );
}
