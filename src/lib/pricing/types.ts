// Pricing engine types. The engine is deterministic: same spec + same rate card version = same price.
// The LLM / conversation layer never computes a price; it only calls `priceQuote`.

export type Material =
  | "thermal_transfer"
  | "direct_thermal"
  | "semi_gloss_poly"
  | "clear_poly"
  | "white_vinyl"
  | "white_bopp"
  | "other";

export type Adhesive =
  | "permanent"
  | "removable"
  | "freezer"
  | "extreme_temp"
  | "extreme_moisture";

export type Coating = "none" | "gloss_laminate" | "matte_laminate" | "uv";

export type PrintMethod =
  | "blank"
  | "one_colour"
  | "two_colour"
  | "full_colour"
  | "full_colour_white"; // CMYK + white underprint (clear stock)

export type CoreSize = "1" | "1.5" | "3" | "other";

export interface LabelSpec {
  widthIn: number;
  heightIn: number;
  material: Material;
  adhesive: Adhesive;
  coating: Coating;
  printMethod: PrintMethod;
  quantity: number;
  core: CoreSize;
  fanfold: boolean;
  perforation: boolean;
  windDirection?: number; // 1-8, zero-cost option
  rush?: boolean;
  newDie?: boolean; // engine sets this from the die list unless overridden
}

export interface QuantityBreak {
  minQty: number;
  pricePerThousand: number;
}

export interface SizeBand {
  id: string;
  label: string;
  maxSqIn: number; // band applies when sqIn <= maxSqIn
}

export interface RateCard {
  version: string; // e.g. "2026-10-30-placeholder"
  currency: "CAD";
  notes: string;
  limits: {
    minWidthIn: number;
    maxWidthIn: number;
    minHeightIn: number;
    maxHeightIn: number;
    minQuantity: number;
    maxQuantity: number; // above this, human quote
    minOrderValue: number; // CAD, before tax/shipping
    quoteValidDays: number;
  };
  sizeBands: SizeBand[];
  // base price per 1,000 labels, keyed by material -> sizeBand -> quantity breaks
  basePrice: Record<Exclude<Material, "other">, Record<string, QuantityBreak[]>>;
  printUplift: Record<PrintMethod, { perThousandPct: number; setup: number }>;
  adhesiveUplift: Record<Adhesive, { perThousandPct: number }>;
  coatingUplift: Record<Coating, { perThousandPct: number }>;
  optionCharges: {
    perforationPerThousand: number;
    fanfoldPerThousand: number;
    nonStandardCoreSetup: number;
  };
  dies: {
    standardSizes: Array<{ widthIn: number; heightIn: number }>;
    newDieCharge: number;
  };
  turnaround: Array<{ maxQuantity: number; businessDays: number }>;
  rush: { available: boolean; businessDays: number; upliftPct: number };
  materialRules: Array<{
    material: Material;
    disallowedAdhesives?: Adhesive[];
    disallowedPrintMethods?: PrintMethod[];
    disallowedCoatings?: Coating[];
  }>;
}

export interface LineItem {
  code: string;
  label: string;
  amount: number; // CAD
  explain: string; // plain-language reason, shown in "why this price"
}

export interface PricedQuote {
  ok: true;
  rateCardVersion: string;
  spec: LabelSpec;
  sqIn: number;
  sizeBand: string;
  lineItems: LineItem[];
  subtotal: number;
  perLabel: number;
  turnaroundBusinessDays: number;
  alternatives: Array<{ quantity: number; subtotal: number; perLabel: number }>;
  warnings: string[];
}

export interface OutOfRange {
  ok: false;
  rateCardVersion: string;
  reasons: string[]; // human-readable: why a person has to quote this
}

export type PriceResult = PricedQuote | OutOfRange;
