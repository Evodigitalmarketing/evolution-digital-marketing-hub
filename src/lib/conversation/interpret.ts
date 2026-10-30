import { SIZE_SUGGESTIONS, type Needs } from "../advisor/needs";
import { parseQuantity, parseSize } from "./steps";

// Free-text understanding for every step, so the customer can type instead of
// tapping, override a suggestion ("30 ml"), or front-load the whole brief in
// the first message. Rule-based for the demo; the LLM layer (phase 1b) sits on
// top of these same functions and falls back to them.

export interface Interpretation {
  value?: string | string[]; // what to feed step.apply
  display: string; // how to echo it in the user bubble
  note?: string; // something the assistant says back ("Going with 3 x 2 for a 250 ml bottle")
  clarify?: string; // couldn't understand: ask again with this
}

const has = (t: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(t));

// ------------------------------------------------------------------ category
export function guessCategory(t: string): Needs["category"] | undefined {
  if (has(t, "cannabis", "weed", "thc", "cbd", "pre.?roll", "edible", "dispensar")) return "cannabis";
  if (has(t, "shipping", "barcode", "upc", "sku", "warehouse", "inventory", "asset tag", "address label")) return "shipping_barcode";
  if (has(t, "supplement", "vitamin", "medical", "pharma", "clinic", "capsule", "gummies", "protein")) return "medical";
  if (has(t, "chemical", "industrial", "cleaner", "solvent", "lubricant", "pesticide", "fertiliz", "paint")) return "industrial_chemical";
  if (has(t, "candle", "soap", "home", "diffuser", "wax melt", "room spray", "laundry")) return "candles_home";
  if (has(t, "cosmetic", "skincare", "skin care", "lotion", "serum", "balm", "beauty", "shampoo", "conditioner", "cream", "oil", "perfume", "fragrance", "deodorant")) return "cosmetics";
  if (has(t, "sauce", "food", "drink", "beverage", "beer", "wine", "cider", "coffee", "tea", "kombucha", "jam", "honey", "syrup", "spice", "snack", "bakery", "bread", "cookie", "juice", "water", "soda", "meat", "jerky", "cheese", "pickle", "salsa", "granola", "chocolate", "candy", "maple", "mead", "spirits", "whisky", "vodka", "gin")) return "food_beverage";
  return undefined;
}

// ------------------------------------------------------------------ surface
export function guessSurface(t: string): Needs["surface"] | undefined {
  if (has(t, "squeeze", "tube", "flip.?top")) return "squeeze_plastic";
  if (has(t, "glass", "mason", "jar")) return "glass";
  if (has(t, "tin", "can\\b", "cans\\b", "aluminum", "aluminium", "metal", "steel")) return "metal";
  if (has(t, "box", "carton", "sleeve", "cardboard", "kraft", "paper bag")) return "paper_box";
  if (has(t, "pouch", "bag", "sachet", "mylar", "zip")) return "bag_pouch";
  if (has(t, "plastic", "pet\\b", "hdpe", "tub", "jug", "bottle")) return "rigid_plastic";
  return undefined;
}

// ------------------------------------------------------------------ environment
export function guessEnvironment(t: string): Needs["environment"] {
  const env: Needs["environment"] = [];
  if (has(t, "freez", "frozen", "ice cream")) env.push("freezer");
  if (has(t, "fridge", "refrigerat", "chill", "cold", "cooler")) env.push("fridge");
  if (has(t, "wet", "water", "shower", "bath", "sink", "ice bucket", "condensation", "waterproof", "rain", "moist", "damp")) env.push("wet");
  if (has(t, "outdoor", "outside", "sun", "uv", "patio", "garden", "weather")) env.push("outdoor");
  if (has(t, "heat", "hot\\b", "candle", "dishwasher", "engine", "oven", "microwave", "warm")) env.push("heat");
  if (has(t, "handled", "handling", "passed around", "rough", "scuff", "reusable", "refill")) env.push("handled");
  if (has(t, "dry", "shelf", "indoor", "pantry", "cupboard", "office", "retail")) env.push("indoor_dry");
  return [...new Set(env)];
}

// ------------------------------------------------------------------ look
export function guessLook(t: string): Needs["look"] | undefined {
  if (has(t, "blank", "unprinted", "no print", "print (them )?myself", "print (them )?ourselves")) return "blank";
  if (has(t, "clear", "transparent", "no.?label look", "see.?through")) return "clear_look";
  if (has(t, "one colou?r", "1 colou?r", "single colou?r", "black only", "black and white", "b&w", "one ink")) return "one_colour";
  if (has(t, "full colou?r", "4 colou?r", "four colou?r", "cmyk", "photo", "colou?rful", "colou?r print", "colou?r")) return "full_colour";
  return undefined;
}

// ------------------------------------------------------------------ application
export function guessApplication(t: string): Needs["application"] | undefined {
  if (has(t, "applicator", "machine", "automatic", "auto.?apply", "labeler", "labeller")) return "applicator";
  if (has(t, "zebra", "dymo", "rollo", "brother", "tsc", "sato", "datamax", "my (own )?printer", "own printer", "print (them|these) (myself|ourselves|in.?house)", "thermal printer", "label printer")) return "own_printer";
  if (has(t, "by hand", "hand apply", "hand.?applied", "manually", "ourselves", "myself", "staff")) return "by_hand";
  if (has(t, "not sure", "unsure", "don.?t know", "no idea")) return "unsure";
  return undefined;
}

// ------------------------------------------------------------------ artwork
export function guessArtwork(t: string): Needs["artwork"] | undefined {
  if (has(t, "need (a )?design", "no design", "don.?t have (a )?design", "design (it|one) for", "designer", "help with design", "from scratch")) return "need_design";
  if (has(t, "just (a |the )?logo", "only (a |the )?logo", "logo only", "have (a |the |my )?logo")) return "logo_only";
  if (has(t, "print.?ready", "\\.ai\\b", "\\.pdf\\b", "\\.eps\\b", "illustrator", "vector", "have (a |the |my )?(file|design|artwork)", "ready to go", "^yes", "^yep", "^yeah", "^ya\\b", "^i do")) return "print_ready";
  if (has(t, "not sure", "unsure", "don.?t know", "no idea", "maybe")) return "unsure";
  return undefined;
}

// ------------------------------------------------------------------ size
// Accepts "3 x 4", "3x4 in", "76 x 102 mm", or a container volume ("30 ml", "8 oz", "750ml bottle").
export function guessSize(t: string): { w: number; h: number; from: string } | undefined {
  const mm = t.match(/(\d+(?:\.\d+)?)\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*mm/i);
  if (mm) return { w: round(parseFloat(mm[1]) / 25.4), h: round(parseFloat(mm[2]) / 25.4), from: "mm" };
  const inches = parseSize(t);
  if (inches) return { w: inches.w, h: inches.h, from: "inches" };
  const vol = t.match(/(\d+(?:\.\d+)?)\s*(ml|millilit\w*|l\b|litre|liter|oz|ounce|fl ?oz|g\b|gram|kg)/i);
  if (vol) {
    let ml = parseFloat(vol[1]);
    const unit = vol[2].toLowerCase();
    if (unit.startsWith("l")) ml *= 1000;
    else if (unit.includes("oz") || unit.startsWith("ounce")) ml *= 29.57;
    else if (unit.startsWith("kg")) ml *= 1000;
    // grams ≈ ml for most products
    const s = sizeForVolume(ml);
    return { ...s, from: `${vol[1]} ${vol[2]}` };
  }
  if (has(t, "lip balm", "chapstick", "tube")) return { w: 2, h: 1, from: "a tube" };
  if (has(t, "dropper", "vial", "tincture", "roller", "small bottle", "mini", "sample")) return { w: 2, h: 1, from: "a small dropper bottle" };
  const named = SIZE_SUGGESTIONS.find((s) => has(t, s.id.replace("_", " ")));
  if (named) return { w: named.widthIn, h: named.heightIn, from: named.label.split(" (")[0].toLowerCase() };
  if (has(t, "large bottle", "big bottle", "growler", "wine")) return { w: 4, h: 4, from: "a large bottle" };
  if (has(t, "jar", "candle")) return { w: 3, h: 3, from: "a jar" };
  if (has(t, "bottle")) return { w: 4, h: 3, from: "a bottle" };
  if (has(t, "pouch", "bag")) return { w: 4, h: 6, from: "a pouch" };
  if (has(t, "box", "carton")) return { w: 4, h: 3, from: "a box" };
  if (has(t, "shipping")) return { w: 4, h: 6, from: "a shipping label" };
  return undefined;
}

export function sizeForVolume(ml: number) {
  if (ml <= 15) return { w: 1.5, h: 0.75 };
  if (ml <= 30) return { w: 2, h: 1 };
  if (ml <= 60) return { w: 2, h: 1.5 };
  if (ml <= 120) return { w: 2.5, h: 2 };
  if (ml <= 250) return { w: 3, h: 2 };
  if (ml <= 500) return { w: 4, h: 3 };
  if (ml <= 1000) return { w: 4, h: 4 };
  return { w: 5, h: 4 };
}

const round = (n: number) => Math.round(n * 8) / 8; // nearest 1/8"

// ------------------------------------------------------------------ pull everything out of a free-text brief
export function extractFromBrief(t: string): Partial<Needs> {
  const out: Partial<Needs> = {};
  const cat = guessCategory(t);
  if (cat) out.category = cat;
  const surf = guessSurface(t);
  if (surf) out.surface = surf;
  const env = guessEnvironment(t);
  if (env.length) out.environment = env;
  const look = guessLook(t);
  if (look) out.look = look;
  const app = guessApplication(t);
  if (app) out.application = app;
  const art = guessArtwork(t);
  if (art && art !== "print_ready") out.artwork = art; // "yes" alone is too weak in a brief
  const qty = t.match(/(\d[\d,]*(?:\.\d+)?\s*k?)\s*(labels|pcs|pieces|units|stickers|qty|quantity|of them)/i) ?? t.match(/\b(?:need|want|order|about|around|approx\w*)\s+(\d[\d,]*\s*k?)\b/i);
  if (qty) {
    const n = parseQuantity(qty[1]);
    if (n && n >= 50) out.quantity = n;
  }
  const size = guessSize(t);
  if (size && (size.from === "inches" || size.from === "mm")) {
    out.widthIn = size.w;
    out.heightIn = size.h;
  } else if (size && /\d/.test(size.from)) {
    // a stated volume ("250ml", "8 oz") is specific enough; a bare "bottle" is not, so we still ask
    out.widthIn = size.w;
    out.heightIn = size.h;
    out.sizeHelp = size.from;
  }
  if (has(t, "removable", "peel off", "peelable", "temporary")) out.removable = true;
  return out;
}

// ------------------------------------------------------------------ per-step interpretation of a typed answer
export function interpretAnswer(stepId: string, text: string, needs: Needs): Interpretation {
  const t = text.trim();
  if (!t) return { display: "", clarify: "Type an answer or tap one of the options." };
  switch (stepId) {
    case "category": {
      const c = guessCategory(t);
      return c ? { value: c, display: t } : { value: "other", display: t, note: "I'll treat that as a general product label." };
    }
    case "surface": {
      const s = guessSurface(t);
      return s ? { value: s, display: t } : { value: "other", display: t };
    }
    case "environment": {
      const e = guessEnvironment(t);
      return e.length ? { value: e, display: t } : { display: t, clarify: "Where will it live? Fridge, freezer, outdoors, gets wet, near heat, or just a dry shelf?" };
    }
    case "look": {
      const l = guessLook(t);
      return l ? { value: l, display: t } : { display: t, clarify: "Full colour, one colour, a clear 'no-label' look, or blank?" };
    }
    case "quantity": {
      const q = parseQuantity(t);
      return q ? { value: String(q), display: `${q.toLocaleString()} labels` } : { display: t, clarify: "How many labels? A number like 2500 or 10k is perfect." };
    }
    case "size": {
      const s = guessSize(t);
      if (!s) return { display: t, clarify: 'Width x height in inches (3 x 4), in mm, or tell me the container ("30 ml bottle") and I\'ll suggest a size.' };
      if (s.from === "inches" || s.from === "mm") return { value: `${s.w}x${s.h}`, display: `${s.w}" × ${s.h}"` };
      return {
        value: `${s.w}x${s.h}`,
        display: t,
        note: `For ${/\d/.test(s.from) ? `a ${s.from} container` : s.from}, ${s.w}" × ${s.h}" is a common label size. If you know the exact flat area, type the size and I'll use that instead.`,
      };
    }
    case "application": {
      const a = guessApplication(t);
      return a ? { value: a, display: t } : { value: "unsure", display: t, note: "No problem, we'll confirm how they're applied before printing." };
    }
    case "printer":
      return { value: t, display: t };
    case "artwork": {
      const a = guessArtwork(t);
      return a ? { value: a, display: t } : { value: "unsure", display: t };
    }
    default:
      return { value: t, display: t };
  }
}
