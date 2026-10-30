import { SIZE_SUGGESTIONS, type Needs } from "../advisor/needs";
import { parseQuantity, parseSize } from "./parse";
import { extractFromBrief } from "./interpret";

export { parseQuantity, parseSize };

// The guided conversation. Needs-first: the customer talks about their product,
// the advisor turns it into a spec. Each step is data so the same flow can run
// on the web portal, over SMS, or inside an LLM agent as its tool schema.

export type StepKind = "chips" | "multichips" | "quantity" | "size" | "text" | "contact";

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export interface Step {
  id: string;
  kind: StepKind;
  prompt: (n: Needs) => string;
  options?: Option[];
  placeholder?: string;
  skipIf?: (n: Needs) => boolean;
  apply: (n: Needs, answer: string | string[]) => Needs;
  ack?: (n: Needs) => string | undefined; // short plain-language reaction after the answer
}

const CATEGORY: Option[] = [
  { id: "food_beverage", label: "Food or drink" },
  { id: "cosmetics", label: "Cosmetics or skincare" },
  { id: "candles_home", label: "Candles or home goods" },
  { id: "cannabis", label: "Cannabis" },
  { id: "shipping_barcode", label: "Shipping or barcodes" },
  { id: "industrial_chemical", label: "Industrial or chemical" },
  { id: "medical", label: "Medical or supplements" },
  { id: "other", label: "Something else" },
];

const SURFACE: Option[] = [
  { id: "glass", label: "Glass bottle or jar" },
  { id: "rigid_plastic", label: "Hard plastic bottle or tub" },
  { id: "squeeze_plastic", label: "Squeeze bottle or tube" },
  { id: "metal", label: "Metal tin or can" },
  { id: "paper_box", label: "Box or carton" },
  { id: "bag_pouch", label: "Bag or pouch" },
  { id: "other", label: "Something else" },
];

const ENVIRONMENT: Option[] = [
  { id: "indoor_dry", label: "Indoors, stays dry" },
  { id: "fridge", label: "In the fridge" },
  { id: "freezer", label: "In the freezer" },
  { id: "wet", label: "Gets wet (shower, sink, ice bucket)" },
  { id: "outdoor", label: "Outdoors" },
  { id: "heat", label: "Near heat (candle, engine, dishwasher)" },
  { id: "handled", label: "Handled a lot" },
];

const LOOK: Option[] = [
  { id: "full_colour", label: "Full colour", hint: "photos, gradients, any colours" },
  { id: "one_colour", label: "One colour", hint: "simple logo or text" },
  { id: "clear_look", label: "Clear 'no-label' look", hint: "design appears printed on the container" },
  { id: "blank", label: "Blank, I'll print them myself" },
];

const APPLICATION: Option[] = [
  { id: "by_hand", label: "By hand" },
  { id: "own_printer", label: "I print them on my own label printer" },
  { id: "applicator", label: "With a label applicator machine" },
  { id: "unsure", label: "Not sure yet" },
];

const ARTWORK: Option[] = [
  { id: "print_ready", label: "Yes, I have a print-ready file" },
  { id: "logo_only", label: "I have a logo, not a full label design" },
  { id: "need_design", label: "I need a design made" },
  { id: "unsure", label: "Not sure what I have" },
];

const QUANTITY: Option[] = [
  { id: "250", label: "250" },
  { id: "500", label: "500" },
  { id: "1000", label: "1,000" },
  { id: "2500", label: "2,500" },
  { id: "5000", label: "5,000" },
  { id: "10000", label: "10,000" },
];

export const STEPS: Step[] = [
  {
    id: "product",
    kind: "text",
    prompt: () => "Hi, I'm the Label Source quote assistant. Tell me about your product and what the label is for, in your own words.",
    placeholder: "e.g. hot sauce in 250 ml glass bottles, selling at farmers markets",
    apply: (n, a) => {
      const text = String(a);
      const found = extractFromBrief(text);
      return { ...n, ...found, productDescription: text, environment: found.environment ?? n.environment };
    },
    ack: (n) => {
      const got: string[] = [];
      if (n.category) got.push(CATEGORY.find((o) => o.id === n.category)?.label.toLowerCase() ?? "");
      if (n.surface) got.push(SURFACE.find((o) => o.id === n.surface)?.label.toLowerCase() ?? "");
      if (n.environment.length) got.push(n.environment.map((e) => ENVIRONMENT.find((o) => o.id === e)?.label.toLowerCase()).join(", "));
      if (n.quantity) got.push(`${n.quantity.toLocaleString()} labels`);
      if (n.widthIn && n.heightIn) got.push(n.sizeHelp ? `about ${n.widthIn}" × ${n.heightIn}" for ${/\d/.test(n.sizeHelp) ? `a ${n.sizeHelp} container` : n.sizeHelp}` : `${n.widthIn}" × ${n.heightIn}"`);
      if (n.look) got.push(LOOK.find((o) => o.id === n.look)?.label.toLowerCase() ?? "");
      if (n.application) got.push(APPLICATION.find((o) => o.id === n.application)?.label.toLowerCase() ?? "");
      const base = got.filter(Boolean).length
        ? `Got it. I picked up: ${got.filter(Boolean).join(" · ")}. A couple more questions and you'll have a firm price.`
        : "Got it. A few quick questions so I recommend the right label, then you'll see a firm price.";
      return base;
    },
  },
  {
    id: "category",
    kind: "chips",
    prompt: () => "Which of these is closest to your product?",
    options: CATEGORY,
    skipIf: (n) => !!n.category,
    apply: (n, a) => ({ ...n, category: a as Needs["category"] }),
    ack: (n) =>
      n.category === "cannabis" || n.category === "industrial_chemical" || n.category === "medical"
        ? "Labels for that category have regulatory details. I can still give you a firm price; one of the team will check the compliance points with you before it prints."
        : undefined,
  },
  {
    id: "surface",
    kind: "chips",
    prompt: () => "What does the label go on?",
    options: SURFACE,
    skipIf: (n) => n.category === "shipping_barcode" || !!n.surface,
    apply: (n, a) => ({ ...n, surface: a as Needs["surface"] }),
  },
  {
    id: "environment",
    kind: "multichips",
    prompt: () => "Where will the product live? Pick everything that applies.",
    options: ENVIRONMENT,
    skipIf: (n) => n.category === "shipping_barcode" || n.environment.length > 0,
    apply: (n, a) => ({ ...n, environment: (Array.isArray(a) ? a : [a]) as Needs["environment"] }),
    ack: (n) => {
      const e = new Set(n.environment);
      if (e.has("freezer")) return "Freezer is the one that catches people out: normal labels lift when cold. I'll use a freezer-grade adhesive and a waterproof face.";
      if (e.has("wet") || e.has("outdoor")) return "Since it'll get wet, paper is out. I'll recommend a waterproof film with a protective gloss layer so the print doesn't smear.";
      if (e.has("fridge")) return "Fridges mean condensation, so I'll use a waterproof face stock rather than paper.";
      return undefined;
    },
  },
  {
    id: "look",
    kind: "chips",
    prompt: () => "How should the label look?",
    options: LOOK,
    skipIf: (n) => !!n.look,
    apply: (n, a) => ({ ...n, look: a as Needs["look"] }),
    ack: (n) =>
      n.look === "clear_look"
        ? "The clear look prints on transparent film with a layer of white under your colours so they stay bright. Looks great on glass."
        : undefined,
  },
  {
    id: "quantity",
    kind: "quantity",
    prompt: () => "How many labels do you need? Price per label drops at each quantity break, and I'll show you the nearby options.",
    options: QUANTITY,
    skipIf: (n) => !!n.quantity,
    apply: (n, a) => ({ ...n, quantity: parseQuantity(String(a)) ?? n.quantity }),
  },
  {
    id: "size",
    kind: "size",
    prompt: () =>
      "What size is the label? Type width × height in inches (like 3 x 4), or pick the container that matches yours and I'll suggest a size.",
    options: SIZE_SUGGESTIONS.map((s) => ({ id: s.id, label: s.label, hint: `${s.widthIn}" × ${s.heightIn}"` })),
    skipIf: (n) => n.widthIn != null && n.heightIn != null,
    apply: (n, a) => {
      const str = String(a);
      const sug = SIZE_SUGGESTIONS.find((s) => s.id === str);
      if (sug) return { ...n, widthIn: sug.widthIn, heightIn: sug.heightIn, sizeHelp: sug.label };
      const parsed = parseSize(str);
      return parsed ? { ...n, widthIn: parsed.w, heightIn: parsed.h, sizeHelp: n.sizeHelp } : n;
    },
    ack: (n) => (n.sizeHelp && SIZE_SUGGESTIONS.some((s) => s.label === n.sizeHelp) ? `For a ${n.sizeHelp.toLowerCase()}, ${n.widthIn}" × ${n.heightIn}" is a common size. Tip: measure the flat area where the label will sit; you can change the size any time.` : undefined),
  },
  {
    id: "application",
    kind: "chips",
    prompt: () => "How will the labels be applied?",
    options: APPLICATION,
    skipIf: (n) => (n.look === "blank" && n.category === "shipping_barcode") || !!n.application,
    apply: (n, a) => ({ ...n, application: a as Needs["application"] }),
  },
  {
    id: "printer",
    kind: "text",
    prompt: () => "What's the make and model of your label printer? (e.g. Zebra ZD420). That sets the roll core and the direction the labels unwind.",
    placeholder: "Zebra ZD420",
    skipIf: (n) => n.application !== "own_printer",
    apply: (n, a) => ({ ...n, printerMakeModel: String(a) }),
  },
  {
    id: "artwork",
    kind: "chips",
    prompt: () => "Do you have a design ready to print?",
    options: ARTWORK,
    skipIf: (n) => n.look === "blank" || !!n.artwork,
    apply: (n, a) => ({ ...n, artwork: a as Needs["artwork"] }),
    ack: (n) =>
      n.artwork === "need_design" || n.artwork === "logo_only"
        ? "No problem. I'll price the printing now, and our design team can quote the artwork separately. You can upload the file later from your quote link."
        : undefined,
  },
  {
    id: "contact",
    kind: "contact",
    prompt: () => "Last thing: where should I send your quote link so you can come back to it?",
    apply: (n, a) => {
      const [name, email, phone] = Array.isArray(a) ? a : String(a).split("|");
      return { ...n, contact: { name, email, phone } };
    },
  },
];


export function nextStep(n: Needs, afterIndex: number): number {
  for (let i = afterIndex + 1; i < STEPS.length; i++) {
    if (!STEPS[i].skipIf?.(n)) return i;
  }
  return -1;
}
