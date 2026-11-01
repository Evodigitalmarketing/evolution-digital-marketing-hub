import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulated model: scripted responses that exercise the tool loop.
const script: unknown[] = [];
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: vi.fn(async () => script.shift()) };
  },
}));
vi.mock("../src/lib/quotes/store", () => {
  const m = new Map();
  return { saveQuote: async (q: { id: string }) => void m.set(q.id, q), getQuote: async (id: string) => m.get(id), listQuotes: async () => [...m.values()] };
});

import { runAgent } from "../src/lib/agent/run";
import { applyUpdate, missingFields } from "../src/lib/agent/tools";

const toolUse = (id: string, name: string, input: object) => ({ type: "tool_use", id, name, input });

beforeEach(() => { process.env.ANTHROPIC_API_KEY = "test"; script.length = 0; });

describe("agent loop", () => {
  it("records needs, creates a quote with engine prices, returns final text", async () => {
    script.push(
      { stop_reason: "tool_use", content: [{ type: "text", text: "Great, noting that." }, toolUse("t1", "update_needs", { productDescription: "hot sauce", category: "food_beverage", surface: "glass", environment: ["fridge"], look: "full_colour", quantity: 2500, widthIn: 3, heightIn: 2, sizeConfirmed: true, application: "by_hand", artwork: "print_ready", contactName: "Sam", contactEmail: "sam@x.ca" })] },
      { stop_reason: "tool_use", content: [toolUse("t2", "create_quote", {})] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Your quote is ready." }] },
    );
    const out = await runAgent([{ role: "user", text: "hot sauce, 2500, 3x2" }], { needs: { environment: [] } });
    expect(out.quote?.id).toMatch(/^LS-/);
    expect(out.quote?.price.ok).toBe(true);
    expect(out.state.quoteId).toBe(out.quote?.id);
    expect(out.reply).toContain("Your quote is ready.");
    expect(out.missing).toEqual([]);
  });

  it("refuses to create a quote without contact", async () => {
    script.push(
      { stop_reason: "tool_use", content: [toolUse("t1", "create_quote", {})] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "Can I get your email?" }] },
    );
    const out = await runAgent([{ role: "user", text: "price it" }], { needs: { environment: [], quantity: 1000, widthIn: 3, heightIn: 3 } });
    expect(out.quote).toBeUndefined();
  });
});

describe("applyUpdate", () => {
  it("merges and squares circles", () => {
    const n = applyUpdate({ environment: [] }, { shape: "circle", widthIn: 3, contactEmail: "a@b.c" });
    expect(n.heightIn).toBe(3);
    expect(n.contact?.email).toBe("a@b.c");
    expect(missingFields(n)).toContain("quantity");
  });
});
