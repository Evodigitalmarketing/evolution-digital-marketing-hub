import { describe, it, expect } from "vitest";
import { priceQuote, getRateCard, validateRateCard } from "../src/lib/pricing/engine";
import type { LabelSpec } from "../src/lib/pricing/types";

const base: LabelSpec = {
  widthIn: 3, heightIn: 4, material: "semi_gloss_poly", adhesive: "permanent",
  coating: "gloss_laminate", printMethod: "full_colour", quantity: 2000,
  core: "3", fanfold: false, perforation: false,
};

describe("rate card", () => {
  it("validates", () => expect(validateRateCard(getRateCard())).toEqual([]));
});

describe("priceQuote", () => {
  it("is deterministic", () => {
    const a = priceQuote(base), b = priceQuote(base);
    expect(a).toEqual(b);
  });
  it("prices a standard job and gives alternatives", () => {
    const r = priceQuote(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subtotal).toBeGreaterThan(0);
    expect(r.lineItems.map(i => i.code)).toContain("print_setup");
    expect(r.lineItems.map(i => i.code)).not.toContain("die"); // 3x4 is standard
    expect(r.alternatives.length).toBeGreaterThan(0);
    expect(r.turnaroundBusinessDays).toBe(5);
  });
  it("charges a die for odd sizes and warns about the nearest standard", () => {
    const r = priceQuote({ ...base, widthIn: 3.2, heightIn: 4.1 });
    if (!r.ok) throw new Error("expected ok");
    expect(r.lineItems.map(i => i.code)).toContain("die");
    expect(r.warnings[0]).toMatch(/standard 3" × 4"/);
  });
  it("enforces minimum order", () => {
    const r = priceQuote({ ...base, quantity: 250, printMethod: "blank", coating: "none", material: "direct_thermal", widthIn: 1, heightIn: 1 });
    if (!r.ok) throw new Error("expected ok");
    expect(r.subtotal).toBe(getRateCard().limits.minOrderValue);
  });
  it("routes out-of-range to a human with readable reasons", () => {
    const r = priceQuote({ ...base, quantity: 400000, material: "other" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.length).toBe(2);
  });
  it("blocks laminate on direct thermal", () => {
    const r = priceQuote({ ...base, material: "direct_thermal" });
    expect(r.ok).toBe(false);
  });
  it("per-thousand price falls with quantity", () => {
    const a = priceQuote({ ...base, quantity: 1000 }), b = priceQuote({ ...base, quantity: 10000 });
    if (!a.ok || !b.ok) throw new Error();
    expect(b.perLabel).toBeLessThan(a.perLabel);
  });
});

describe("large runs", () => {
  it("auto-quotes 80,000", () => {
    const r = priceQuote({ ...base, quantity: 80000 });
    expect(r.ok).toBe(true);
  });
});

describe("shapes", () => {
  it("rounded corners cost nothing extra", () => {
    const a = priceQuote(base), b = priceQuote({ ...base, shape: "rounded" });
    if (!a.ok || !b.ok) throw new Error();
    expect(b.subtotal).toBe(a.subtotal);
  });
  it("standard circle has no die; odd circle does", () => {
    const a = priceQuote({ ...base, shape: "circle", widthIn: 3, heightIn: 3 });
    const b = priceQuote({ ...base, shape: "circle", widthIn: 2.75, heightIn: 2.75 });
    if (!a.ok || !b.ok) throw new Error();
    expect(a.lineItems.map(i => i.code)).not.toContain("die");
    expect(b.lineItems.map(i => i.code)).toContain("die");
  });
  it("custom shape goes to a person", () => {
    expect(priceQuote({ ...base, shape: "custom" }).ok).toBe(false);
  });
});
