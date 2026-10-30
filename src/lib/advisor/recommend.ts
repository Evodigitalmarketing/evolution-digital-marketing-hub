import type { LabelSpec, Material, Adhesive, Coating, PrintMethod } from "../pricing/types";
import { label } from "../pricing/engine";
import { REGULATED, type Needs } from "./needs";

// The advisor: turns what the customer told us into a technical spec, and
// explains every choice in one plain sentence. These rules are the "how the
// owners advise customers" knowledge base and are meant to be reviewed and
// signed off by Label Source. Placeholder rules for the demo.

export interface Recommendation {
  spec: LabelSpec;
  plainSummary: string; // "2,000 waterproof glossy labels, 3 × 4 in, full colour, on rolls"
  reasons: Array<{ field: keyof LabelSpec | "general"; text: string }>;
  flags: Array<{ kind: "regulated" | "artwork" | "size_help" | "printer"; text: string }>;
  humanReview: boolean; // true when a person must check before printing
}

export function recommend(n: Needs): Recommendation {
  const env = new Set(n.environment);
  const reasons: Recommendation["reasons"] = [];
  const flags: Recommendation["flags"] = [];

  // --- material -----------------------------------------------------------
  let material: Material;
  const wetish = env.has("wet") || env.has("outdoor") || env.has("freezer") || env.has("fridge") || n.surface === "squeeze_plastic";
  if (n.category === "shipping_barcode" || n.application === "own_printer") {
    material = n.look === "blank" && n.category === "shipping_barcode" ? "direct_thermal" : "thermal_transfer";
    reasons.push({
      field: "material",
      text:
        material === "direct_thermal"
          ? "Shipping and barcode labels print best on direct thermal paper: no ribbon needed, and the print lasts the life of a shipment."
          : "Because you'll print on these with your own label printer, we're using thermal transfer paper, which takes a crisp print from a ribbon and doesn't fade.",
    });
  } else if (n.look === "clear_look") {
    material = "clear_poly";
    reasons.push({ field: "material", text: "For the 'no-label' look we print on clear film so only your design shows against the container." });
  } else if (env.has("outdoor") && env.has("heat")) {
    material = "white_vinyl";
    reasons.push({ field: "material", text: "Outdoors with heat is the toughest spot for a label, so we're using white vinyl, which handles sun, rain and temperature swings." });
  } else if (wetish) {
    material = "white_bopp";
    reasons.push({
      field: "material",
      text: `Your labels will ${describeWet(env, n)}, so we're recommending a waterproof white film instead of paper. It won't wrinkle, tear or smear when it gets damp.`,
    });
  } else {
    material = "semi_gloss_poly";
    reasons.push({ field: "material", text: "For an indoor product that stays dry, semi-gloss white is the standard choice: bright, sharp colour at the best price." });
  }

  // --- adhesive -----------------------------------------------------------
  let adhesive: Adhesive = "permanent";
  if (n.removable) {
    adhesive = "removable";
    reasons.push({ field: "adhesive", text: "You asked for labels that peel off cleanly, so we're using a removable adhesive." });
  } else if (env.has("freezer")) {
    adhesive = "freezer";
    reasons.push({ field: "adhesive", text: "Standard glue lets go in a freezer. Freezer-grade adhesive stays stuck well below zero, even if applied to a cold surface." });
  } else if (env.has("heat")) {
    adhesive = "extreme_temp";
    reasons.push({ field: "adhesive", text: "Because of the heat, we're using a high-temperature adhesive so the label doesn't slide or lift." });
  } else if (env.has("wet") && (n.surface === "squeeze_plastic" || n.surface === "bag_pouch")) {
    adhesive = "extreme_moisture";
    reasons.push({ field: "adhesive", text: "Wet conditions on a flexible surface call for an extreme-moisture adhesive so the edges don't lift." });
  } else {
    reasons.push({ field: "adhesive", text: "A standard permanent adhesive is all this needs." + (env.has("fridge") ? " It's fine in a fridge." : "") });
  }

  // --- coating ------------------------------------------------------------
  let coating: Coating = "none";
  if (material === "direct_thermal" || material === "thermal_transfer") {
    coating = "none";
  } else if (env.has("wet") || env.has("outdoor") || env.has("handled") || env.has("freezer")) {
    coating = "gloss_laminate";
    reasons.push({ field: "coating", text: "We're adding a clear glossy laminate over the print. It's what stops ink smearing or scuffing when the label gets wet or handled a lot." });
  } else if (n.category === "cosmetics" || n.category === "candles_home") {
    coating = "gloss_laminate";
    reasons.push({ field: "coating", text: "A glossy laminate gives cosmetics and home products a finished, retail look and protects against oils and fingerprints." });
  } else {
    reasons.push({ field: "coating", text: "No protective coating needed for a dry, indoor label. Adding one later is an easy upgrade." });
  }

  // --- print --------------------------------------------------------------
  let printMethod: PrintMethod;
  if (n.look === "blank") printMethod = "blank";
  else if (n.look === "one_colour") printMethod = "one_colour";
  else if (material === "clear_poly") printMethod = "full_colour_white";
  else printMethod = "full_colour";
  if (printMethod === "full_colour_white")
    reasons.push({ field: "printMethod", text: "On clear film, colours need a layer of white printed underneath or they look washed out. We include that white underprint." });
  else if (printMethod === "full_colour")
    reasons.push({ field: "printMethod", text: "Full-colour printing: photos, gradients and any number of colours at one price." });
  else if (printMethod === "one_colour")
    reasons.push({ field: "printMethod", text: "One-colour printing keeps the cost down for simple designs." });

  // --- size ---------------------------------------------------------------
  const widthIn = n.widthIn ?? 3;
  const heightIn = n.heightIn ?? 4;
  if (n.widthIn == null || n.heightIn == null) {
    flags.push({ kind: "size_help", text: "Size still needs confirming. We've priced a 3\" × 4\" label as a starting point." });
  }

  // --- roll / printer options ---------------------------------------------
  const ownPrinter = n.application === "own_printer";
  const core: LabelSpec["core"] = ownPrinter ? "1" : "3";
  if (ownPrinter) {
    reasons.push({ field: "core", text: "Desktop label printers usually take a 1\" core; we'll confirm against your printer model before printing." });
    flags.push({ kind: "printer", text: n.printerMakeModel ? `Roll set up for: ${n.printerMakeModel}. We'll confirm core and wind direction before printing.` : "We'll confirm your printer make and model so the roll is wound correctly." });
  } else {
    reasons.push({ field: "core", text: "Labels come on 3\" core rolls, the standard for hand application and label applicators." });
  }

  // --- regulated / artwork flags --------------------------------------------
  let humanReview = false;
  if (n.category && REGULATED.includes(n.category)) {
    humanReview = true;
    flags.push({
      kind: "regulated",
      text: "This type of product has labelling rules. Your price is firm, and one of our team will check the regulatory details with you before anything prints.",
    });
  }
  if (n.artwork === "need_design" || n.artwork === "logo_only") {
    flags.push({ kind: "artwork", text: "You don't have a print-ready file yet. We'll quote the printing now; our design team can quote the artwork separately." });
  }

  const spec: LabelSpec = {
    widthIn,
    heightIn,
    material,
    adhesive,
    coating,
    printMethod,
    quantity: n.quantity ?? 1000,
    core,
    fanfold: false,
    perforation: false,
    windDirection: ownPrinter ? 4 : undefined,
  };

  return { spec, plainSummary: plainSummary(spec), reasons, flags, humanReview };
}

function describeWet(env: Set<string>, n: Needs) {
  if (env.has("freezer")) return "live in a freezer";
  if (env.has("outdoor")) return "be outdoors";
  if (env.has("wet")) return "get wet";
  if (env.has("fridge")) return "sit in a fridge, where condensation forms";
  if (n.surface === "squeeze_plastic") return "be on a squeeze bottle that flexes";
  return "see moisture";
}

export function plainSummary(s: LabelSpec): string {
  const bits: string[] = [];
  bits.push(`${s.quantity.toLocaleString()}`);
  if (s.material === "white_bopp" || s.material === "white_vinyl") bits.push("waterproof");
  if (s.material === "clear_poly") bits.push("clear");
  if (s.coating === "gloss_laminate") bits.push("glossy");
  if (s.coating === "matte_laminate") bits.push("matte");
  if (s.material === "thermal_transfer" || s.material === "direct_thermal") bits.push("thermal");
  bits.push("labels,");
  bits.push(`${s.widthIn}" × ${s.heightIn}",`);
  bits.push(
    s.printMethod === "blank"
      ? "blank,"
      : s.printMethod === "one_colour"
        ? "1-colour print,"
        : "full colour,",
  );
  bits.push(s.fanfold ? "fanfolded" : "on rolls");
  return bits.join(" ");
}

export function techSummary(s: LabelSpec): Array<[string, string]> {
  return [
    ["Size", `${s.widthIn}" × ${s.heightIn}"`],
    ["Material", label(s.material)],
    ["Adhesive", label(s.adhesive)],
    ["Finish", label(s.coating)],
    ["Print", label(s.printMethod)],
    ["Quantity", s.quantity.toLocaleString()],
    ["Core", s.core === "other" ? "Other" : `${s.core}"`],
    ["Format", s.fanfold ? "Fanfold" : "Rolls"],
    ...(s.windDirection ? [["Wind", `Position ${s.windDirection}`] as [string, string]] : []),
  ];
}
