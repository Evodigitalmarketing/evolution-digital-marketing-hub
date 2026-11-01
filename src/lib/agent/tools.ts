import type Anthropic from "@anthropic-ai/sdk";
import type { Needs } from "../advisor/needs";
import { recommend } from "../advisor/recommend";
import { KNOWLEDGE, KNOWLEDGE_TOPICS } from "../advisor/knowledge";
import { priceQuote, getRateCard } from "../pricing/engine";
import { createQuote } from "../quotes/create";
import type { Quote } from "../quotes/model";

// Tools the conversational agent can call. The agent never computes a price:
// every number it shows comes from preview_price or create_quote.

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_needs",
    description:
      "Record what the customer has told you about their label job. Call this every time the customer gives or changes any detail, even several at once. Only include fields you learned or changed. Returns the full current record and which details are still missing.",
    input_schema: {
      type: "object",
      properties: {
        productDescription: { type: "string", description: "The product in the customer's words." },
        category: {
          type: "string",
          enum: ["food_beverage", "cosmetics", "candles_home", "cannabis", "shipping_barcode", "industrial_chemical", "medical", "other"],
        },
        surface: { type: "string", enum: ["glass", "rigid_plastic", "squeeze_plastic", "metal", "paper_box", "bag_pouch", "other"], description: "What the label is applied to." },
        environment: {
          type: "array",
          items: { type: "string", enum: ["indoor_dry", "fridge", "freezer", "wet", "outdoor", "heat", "handled"] },
          description: "Every condition the label will face. Replaces the previous list.",
        },
        look: { type: "string", enum: ["full_colour", "one_colour", "clear_look", "blank"] },
        removable: { type: "boolean" },
        quantity: { type: "integer", minimum: 1 },
        widthIn: { type: "number", description: "Label width in inches. Convert mm (÷25.4)." },
        heightIn: { type: "number", description: "Label height in inches." },
        shape: { type: "string", enum: ["rectangle", "rounded", "circle", "oval", "custom"] },
        finish: { type: "string", enum: ["gloss", "matte", "uv", "none"], description: "Only if the customer states a preference; otherwise the advisor picks the right protection." },
        sizeConfirmed: { type: "boolean", description: "True once the customer gave or agreed to the size. A size you only suggested is not confirmed." },
        application: { type: "string", enum: ["by_hand", "own_printer", "applicator", "unsure"] },
        printerMakeModel: { type: "string" },
        artwork: { type: "string", enum: ["print_ready", "logo_only", "need_design", "unsure"] },
        contactName: { type: "string" },
        contactEmail: { type: "string" },
        contactPhone: { type: "string" },
        contactCompany: { type: "string" },
        notes: { type: "string", description: "Special requests a person at Label Source should see." },
      },
    },
  },
  {
    name: "preview_price",
    description:
      "Price the current job with Label Source's pricing engine without saving a quote. Use it to compare options the customer asks about (e.g. matte vs gloss, 2,500 vs 5,000) or after a change to an existing quote. Optional overrides price a variation without changing the record.",
    input_schema: {
      type: "object",
      properties: {
        overrides: {
          type: "object",
          description: "Same fields as update_needs (quantity, widthIn, heightIn, shape, look, environment, removable…) applied only to this preview.",
        },
      },
    },
  },
  {
    name: "create_quote",
    description:
      "Save a firm, numbered quote for the current job and show it to the customer as a quote card. Requires the label size, quantity and an email or phone. Call again after the customer changes something to issue an updated quote.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "explain",
    description: "Get Label Source's own plain-language explanation of a topic so you can answer a customer question accurately.",
    input_schema: {
      type: "object",
      properties: { topic: { type: "string", enum: KNOWLEDGE_TOPICS } },
      required: ["topic"],
    },
  },
];

export interface AgentState {
  needs: Needs;
  quoteId?: string;
}

export function missingFields(n: Needs): string[] {
  const m: string[] = [];
  if (!n.productDescription && !n.category) m.push("what the product is");
  if (!n.category) m.push("product category");
  if (n.category !== "shipping_barcode" && !n.surface) m.push("what the label goes on");
  if (n.category !== "shipping_barcode" && n.environment.length === 0) m.push("where the product lives (fridge, wet, outdoors, dry shelf…)");
  if (!n.look) m.push("look (full colour, one colour, clear, blank)");
  if (!n.quantity) m.push("quantity");
  if (n.widthIn == null || n.heightIn == null) m.push("label size");
  else if (!n.sizeConfirmed) m.push("customer to confirm the suggested label size");
  if (!n.application) m.push("how labels are applied (hand, own printer, applicator)");
  if (n.application === "own_printer" && !n.printerMakeModel) m.push("printer make and model");
  if (n.look !== "blank" && !n.artwork) m.push("whether they have print-ready artwork");
  if (!n.contact?.email && !n.contact?.phone) m.push("contact (name and email or mobile) to send the quote link");
  return m;
}

type Input = Record<string, unknown>;

export function applyUpdate(n: Needs, input: Input): Needs {
  const out: Needs = { ...n, environment: [...n.environment] };
  const keys = ["productDescription", "category", "surface", "look", "removable", "quantity", "widthIn", "heightIn", "shape", "finish", "sizeConfirmed", "application", "printerMakeModel", "artwork", "notes"] as const;
  for (const k of keys) if (input[k] !== undefined && input[k] !== null) (out as unknown as Record<string, unknown>)[k] = input[k];
  if (Array.isArray(input.environment)) out.environment = input.environment as Needs["environment"];
  if (input.shape === "circle" && out.widthIn && (out.heightIn == null || out.heightIn !== out.widthIn)) out.heightIn = out.widthIn;
  const c = { ...(out.contact ?? {}) };
  if (input.contactName) c.name = String(input.contactName);
  if (input.contactEmail) c.email = String(input.contactEmail);
  if (input.contactPhone) c.phone = String(input.contactPhone);
  if (input.contactCompany) c.company = String(input.contactCompany);
  if (Object.keys(c).length) out.contact = c;
  if (out.notes && n.notes && out.notes !== n.notes && !String(input.notes ?? "").includes(n.notes)) out.notes = `${n.notes} · ${input.notes}`;
  return out;
}

function priceSummary(n: Needs) {
  const rec = recommend(n);
  const p = priceQuote(rec.spec);
  if (!p.ok) return { quotable: false, needsPerson: p.reasons, spec: rec.plainSummary };
  return {
    quotable: true,
    spec: rec.plainSummary,
    priceCAD: p.subtotal,
    perLabelCAD: p.perLabel,
    shipsInBusinessDays: p.turnaroundBusinessDays,
    lineItems: p.lineItems.map((l) => ({ item: l.label, cad: l.amount, why: l.explain })),
    nearbyQuantities: p.alternatives,
    tips: p.warnings,
    materialChoices: rec.reasons.map((r) => r.text),
    flags: rec.flags.map((f) => f.text),
    rateCardVersion: p.rateCardVersion,
  };
}

export async function runTool(
  name: string,
  input: Input,
  state: AgentState,
  channel: Quote["channel"],
): Promise<{ result: unknown; state: AgentState; quote?: Quote }> {
  switch (name) {
    case "update_needs": {
      const needs = applyUpdate(state.needs, input);
      return { result: { recorded: needs, stillMissing: missingFields(needs) }, state: { ...state, needs } };
    }
    case "preview_price": {
      const o = (input.overrides ?? {}) as Input;
      const n = applyUpdate(state.needs, o);
      if (n.widthIn == null || n.heightIn == null || !n.quantity)
        return { result: { error: "Need at least a label size and quantity to price." }, state };
      return { result: priceSummary(n), state };
    }
    case "create_quote": {
      const n = state.needs;
      if (n.widthIn == null || n.heightIn == null || !n.quantity)
        return { result: { error: "Need a label size and quantity first." }, state };
      if (!n.contact?.email && !n.contact?.phone)
        return { result: { error: "Ask for their name and an email or mobile number first, so the quote link can be sent." }, state };
      if (!n.sizeConfirmed)
        return { result: { error: "The customer hasn't confirmed the label size yet. Ask them to confirm it (or give their own) before issuing the quote." }, state };
      const quote = await createQuote(n, channel);
      return {
        result: {
          quoteId: quote.id,
          shownToCustomerAsCard: true,
          firmFor: `${getRateCard().limits.quoteValidDays} days`,
          ...priceSummary(n),
        },
        state: { ...state, quoteId: quote.id },
        quote,
      };
    }
    case "explain": {
      const k = KNOWLEDGE[String(input.topic)];
      return { result: k ?? { error: "unknown topic" }, state };
    }
    default:
      return { result: { error: `unknown tool ${name}` }, state };
  }
}
