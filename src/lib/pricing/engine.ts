import type {
  LabelSpec,
  LineItem,
  OutOfRange,
  PriceResult,
  PricedQuote,
  RateCard,
} from "./types";
import placeholder from "./rate-card.placeholder.json";

// ---------------------------------------------------------------------------
// Rate card loading. For the demo the card ships with the app. In production
// it is loaded from the owners' Google Sheet on a schedule, validated, and
// versioned; every quote records the version that priced it.
// ---------------------------------------------------------------------------

let cached: RateCard | null = null;

export function getRateCard(): RateCard {
  if (!cached) {
    const card = placeholder as unknown as RateCard;
    const problems = validateRateCard(card);
    if (problems.length) {
      throw new Error("Rate card failed validation:\n" + problems.join("\n"));
    }
    cached = card;
  }
  return cached;
}

export function validateRateCard(card: RateCard): string[] {
  const problems: string[] = [];
  if (!card.version) problems.push("version missing");
  if (!card.sizeBands?.length) problems.push("no size bands");
  const bandIds = new Set(card.sizeBands.map((b) => b.id));
  for (const [material, bands] of Object.entries(card.basePrice)) {
    for (const id of bandIds) {
      const breaks = bands[id];
      if (!breaks?.length) {
        problems.push(`${material}: no quantity breaks for band ${id}`);
        continue;
      }
      let lastQty = -1;
      let lastPrice = Infinity;
      for (const b of breaks) {
        if (b.minQty <= lastQty) problems.push(`${material}/${id}: breaks not ascending`);
        if (b.pricePerThousand > lastPrice)
          problems.push(`${material}/${id}: price rises at qty ${b.minQty}`);
        if (b.pricePerThousand <= 0) problems.push(`${material}/${id}: non-positive price`);
        lastQty = b.minQty;
        lastPrice = b.pricePerThousand;
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

function sizeBandFor(card: RateCard, sqIn: number) {
  return card.sizeBands.find((b) => sqIn <= b.maxSqIn) ?? null;
}

function breakFor(breaks: { minQty: number; pricePerThousand: number }[], qty: number) {
  let chosen = breaks[0];
  for (const b of breaks) if (qty >= b.minQty) chosen = b;
  return chosen;
}

export function isStandardDie(card: RateCard, w: number, h: number, shape: LabelSpec["shape"] = "rectangle") {
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
  if (shape === "circle") return eq(w, h) && (card.dies.standardCircles ?? []).some((d) => eq(d, w));
  if (shape === "oval")
    return (card.dies.standardOvals ?? []).some((d) => (eq(d.widthIn, w) && eq(d.heightIn, h)) || (eq(d.widthIn, h) && eq(d.heightIn, w)));
  return card.dies.standardSizes.some(
    (d) => (eq(d.widthIn, w) && eq(d.heightIn, h)) || (eq(d.widthIn, h) && eq(d.heightIn, w)),
  );
}

export function turnaroundFor(card: RateCard, qty: number, rush?: boolean) {
  if (rush && card.rush.available) return card.rush.businessDays;
  for (const t of card.turnaround) if (qty <= t.maxQuantity) return t.businessDays;
  return card.turnaround[card.turnaround.length - 1].businessDays;
}

// ---------------------------------------------------------------------------
// Range check: anything a human has to quote. Reasons are written for the
// customer, since the agent repeats them verbatim.
// ---------------------------------------------------------------------------

export function outOfRangeReasons(card: RateCard, spec: LabelSpec): string[] {
  const r: string[] = [];
  const L = card.limits;
  if (spec.material === "other") r.push("a material that isn't on our standard list");
  if (spec.core === "other") r.push("a non-standard core size");
  if (spec.shape === "custom") r.push("a custom die-cut shape");
  if (spec.shape === "circle" && Math.abs(spec.widthIn - spec.heightIn) > 0.01) r.push("a circle that isn't the same width and height");
  if (spec.widthIn < L.minWidthIn || spec.widthIn > L.maxWidthIn)
    r.push(`a width outside ${L.minWidthIn}" to ${L.maxWidthIn}"`);
  if (spec.heightIn < L.minHeightIn || spec.heightIn > L.maxHeightIn)
    r.push(`a height outside ${L.minHeightIn}" to ${L.maxHeightIn}"`);
  if (spec.quantity < L.minQuantity) r.push(`fewer than ${L.minQuantity} labels`);
  if (spec.quantity > L.maxQuantity)
    r.push(`more than ${L.maxQuantity.toLocaleString()} labels (we price large runs by hand so you get the best rate)`);
  if (spec.rush && !card.rush.available) r.push("a rush turnaround");
  const sqIn = spec.widthIn * spec.heightIn;
  if (!sizeBandFor(card, sqIn)) r.push("a label larger than our standard size range");
  for (const rule of card.materialRules) {
    if (rule.material !== spec.material) continue;
    if (rule.disallowedAdhesives?.includes(spec.adhesive))
      r.push(`${label(spec.adhesive)} adhesive on ${label(spec.material)}`);
    if (rule.disallowedPrintMethods?.includes(spec.printMethod))
      r.push(`${label(spec.printMethod)} on ${label(spec.material)}`);
    if (rule.disallowedCoatings?.includes(spec.coating))
      r.push(`${label(spec.coating)} on ${label(spec.material)}`);
  }
  return r;
}

// ---------------------------------------------------------------------------
// The price. Pure function of (card, spec).
// ---------------------------------------------------------------------------

export function priceQuote(spec: LabelSpec, card: RateCard = getRateCard()): PriceResult {
  const reasons = outOfRangeReasons(card, spec);
  if (reasons.length) {
    const out: OutOfRange = { ok: false, rateCardVersion: card.version, reasons };
    return out;
  }
  const priced = priceInRange(spec, card);
  // Alternatives: the neighbouring quantity breaks, so the customer sees the levers.
  const band = priced.sizeBand;
  const breaks = card.basePrice[spec.material as Exclude<LabelSpec["material"], "other">][band];
  const alternatives = breaks
    .map((b) => b.minQty)
    .filter((q) => q !== spec.quantity && q >= card.limits.minQuantity && q <= card.limits.maxQuantity)
    .filter((q) => q > spec.quantity || q >= spec.quantity / 4)
    .slice(0, 4)
    .map((q) => {
      const alt = priceInRange({ ...spec, quantity: q }, card);
      return { quantity: q, subtotal: alt.subtotal, perLabel: alt.perLabel };
    });
  return { ...priced, alternatives };
}

function priceInRange(spec: LabelSpec, card: RateCard): PricedQuote {
  const sqIn = round2(spec.widthIn * spec.heightIn);
  const band = sizeBandFor(card, sqIn)!;
  const material = spec.material as Exclude<LabelSpec["material"], "other">;
  const thousands = spec.quantity / 1000;
  const items: LineItem[] = [];
  const warnings: string[] = [];
  const shape = spec.shape ?? "rectangle";

  const brk = breakFor(card.basePrice[material][band.id], spec.quantity);
  const base = brk.pricePerThousand * thousands;
  items.push({
    code: "base",
    label: `${label(material)} stock, ${shape === "circle" ? `${spec.widthIn}" circle` : `${spec.widthIn}" × ${spec.heightIn}"`}${shape === "rounded" ? ", rounded corners" : shape === "oval" ? " oval" : ""}`,
    amount: round2(base),
    explain: `${spec.quantity.toLocaleString()} labels at $${brk.pricePerThousand}/1,000 for ${band.label} on ${label(material)}. Price per thousand drops at ${nextBreak(card, material, band.id, spec.quantity)}.`,
  });

  const print = card.printUplift[spec.printMethod];
  if (print.perThousandPct > 0) {
    items.push({
      code: "print",
      label: label(spec.printMethod),
      amount: round2(base * (print.perThousandPct / 100)),
      explain: `Printing adds ${print.perThousandPct}% to the stock price for ${label(spec.printMethod).toLowerCase()}.`,
    });
  }
  if (print.setup > 0) {
    items.push({
      code: "print_setup",
      label: "Print setup",
      amount: print.setup,
      explain: "One-time setup for the press run. Same on every order size, so larger runs spread it thinner.",
    });
  }

  const adh = card.adhesiveUplift[spec.adhesive];
  if (adh.perThousandPct > 0) {
    items.push({
      code: "adhesive",
      label: `${label(spec.adhesive)} adhesive`,
      amount: round2(base * (adh.perThousandPct / 100)),
      explain: `${label(spec.adhesive)} adhesive costs ${adh.perThousandPct}% more than standard permanent.`,
    });
  }

  const coat = card.coatingUplift[spec.coating];
  if (coat.perThousandPct > 0) {
    items.push({
      code: "coating",
      label: label(spec.coating),
      amount: round2(base * (coat.perThousandPct / 100)),
      explain: `${label(spec.coating)} protects the print from scuffs and moisture; adds ${coat.perThousandPct}%.`,
    });
  }

  if (spec.perforation) {
    items.push({
      code: "perf",
      label: "Perforation",
      amount: round2(card.optionCharges.perforationPerThousand * thousands),
      explain: `Perforation between labels, $${card.optionCharges.perforationPerThousand}/1,000.`,
    });
  }
  if (spec.fanfold) {
    items.push({
      code: "fanfold",
      label: "Fanfold",
      amount: round2(card.optionCharges.fanfoldPerThousand * thousands),
      explain: `Fanfold stacking instead of rolls, $${card.optionCharges.fanfoldPerThousand}/1,000.`,
    });
  }

  const newDie = spec.newDie ?? !isStandardDie(card, spec.widthIn, spec.heightIn, shape);
  if (newDie) {
    items.push({
      code: "die",
      label: "Custom die",
      amount: card.dies.newDieCharge,
      explain: `${shape === "circle" ? `A ${spec.widthIn}" circle` : shape === "oval" ? `A ${spec.widthIn}" × ${spec.heightIn}" oval` : `${spec.widthIn}" × ${spec.heightIn}"`} isn't one of our standard sizes, so a cutting die is made once. Reorders of the same size don't pay it again.`,
    });
    const near = shape === "rectangle" || shape === "rounded" ? nearestStandardDie(card, spec.widthIn, spec.heightIn) : null;
    if (near) warnings.push(`A standard ${near.widthIn}" × ${near.heightIn}" label would avoid the $${card.dies.newDieCharge} die charge.`);
  }

  if (spec.rush && card.rush.available) {
    const runningSubtotal = items.reduce((s, i) => s + i.amount, 0);
    items.push({
      code: "rush",
      label: `Rush (${card.rush.businessDays} business days)`,
      amount: round2(runningSubtotal * (card.rush.upliftPct / 100)),
      explain: `Rush turnaround adds ${card.rush.upliftPct}%.`,
    });
  }

  let subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  if (subtotal < card.limits.minOrderValue) {
    items.push({
      code: "min_order",
      label: "Minimum order adjustment",
      amount: round2(card.limits.minOrderValue - subtotal),
      explain: `Our minimum order is $${card.limits.minOrderValue}. Adding labels usually costs very little at this point.`,
    });
    subtotal = card.limits.minOrderValue;
  }

  return {
    ok: true,
    rateCardVersion: card.version,
    spec: { ...spec, shape, newDie },
    sqIn,
    sizeBand: band.id,
    lineItems: items,
    subtotal,
    perLabel: round2(subtotal / spec.quantity * 100) / 100,
    turnaroundBusinessDays: turnaroundFor(card, spec.quantity, spec.rush),
    alternatives: [],
    warnings,
  };
}

function nextBreak(card: RateCard, material: Exclude<LabelSpec["material"], "other">, band: string, qty: number) {
  const nxt = card.basePrice[material][band].find((b) => b.minQty > qty);
  return nxt ? `${nxt.minQty.toLocaleString()} ($${nxt.pricePerThousand}/1,000)` : "no higher break";
}

function nearestStandardDie(card: RateCard, w: number, h: number) {
  let best: { widthIn: number; heightIn: number } | null = null;
  let bestD = Infinity;
  for (const d of card.dies.standardSizes) {
    const dist = Math.abs(d.widthIn - w) + Math.abs(d.heightIn - h);
    if (dist < bestD && dist <= 0.75) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

// Plain-language labels for every enum value. These are what the customer sees.
export function label(v: string): string {
  const map: Record<string, string> = {
    thermal_transfer: "Thermal transfer paper",
    direct_thermal: "Direct thermal paper",
    semi_gloss_poly: "Semi-gloss white poly",
    clear_poly: "Clear poly",
    white_vinyl: "White vinyl",
    white_bopp: "White BOPP (waterproof film)",
    other: "Other material",
    permanent: "Permanent",
    removable: "Removable",
    freezer: "Freezer-grade",
    extreme_temp: "Extreme temperature",
    extreme_moisture: "Extreme moisture",
    rectangle: "Rectangle, square corners",
    rounded: "Rectangle, rounded corners",
    circle: "Circle",
    oval: "Oval",
    custom: "Custom die-cut shape",
    none: "No coating",
    gloss_laminate: "Gloss laminate",
    matte_laminate: "Matte laminate",
    uv: "UV coating",
    blank: "Blank (no printing)",
    one_colour: "1-colour print",
    two_colour: "2-colour print",
    full_colour: "Full-colour print",
    full_colour_white: "Full colour with white underprint",
  };
  return map[v] ?? v;
}
