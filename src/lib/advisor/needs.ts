// What the customer actually tells us. Everything here is in their words, not
// print terminology. The advisor turns this into a LabelSpec.

export type Category =
  | "food_beverage"
  | "cosmetics"
  | "candles_home"
  | "cannabis"
  | "shipping_barcode"
  | "industrial_chemical"
  | "medical"
  | "other";

export type Surface = "glass" | "rigid_plastic" | "squeeze_plastic" | "metal" | "paper_box" | "bag_pouch" | "other";

export type Environment =
  | "indoor_dry"
  | "fridge"
  | "freezer"
  | "wet"
  | "outdoor"
  | "heat"
  | "handled";

export type Look = "full_colour" | "one_colour" | "clear_look" | "blank";

export type Application = "by_hand" | "own_printer" | "applicator" | "unsure";

export type ArtworkStatus = "print_ready" | "logo_only" | "need_design" | "unsure";

export interface Needs {
  productDescription?: string;
  category?: Category;
  surface?: Surface;
  environment: Environment[];
  look?: Look;
  removable?: boolean;
  quantity?: number;
  widthIn?: number;
  heightIn?: number;
  shape?: "rectangle" | "rounded" | "circle" | "oval" | "custom";
  notes?: string; // anything a person should see (special requests)
  sizeHelp?: string; // the container they described, if they asked for size help
  application?: Application;
  printerMakeModel?: string;
  artwork?: ArtworkStatus;
  contact?: { name?: string; email?: string; phone?: string; company?: string };
}

export const REGULATED: Category[] = ["cannabis", "industrial_chemical", "medical"];

// Size suggestions by common container. Shown when the customer asks for help.
export const SIZE_SUGGESTIONS: Array<{ id: string; label: string; widthIn: number; heightIn: number; note: string }> = [
  { id: "bottle_small", label: "Small bottle (100–250 ml)", widthIn: 3, heightIn: 2, note: "wraps most of the way around a small bottle" },
  { id: "bottle_medium", label: "Bottle (250–500 ml)", widthIn: 4, heightIn: 3, note: "a standard front label on a beer, sauce or kombucha bottle" },
  { id: "bottle_large", label: "Large bottle (750 ml – 1 L)", widthIn: 4, heightIn: 4, note: "front label on a wine-sized bottle" },
  { id: "jar_small", label: "Small jar or tin lid", widthIn: 2, heightIn: 2, note: "round or square, fits a 2\" lid" },
  { id: "jar_medium", label: "Jar (250–500 ml)", widthIn: 3, heightIn: 3, note: "front of a mason-style jar" },
  { id: "candle", label: "Candle jar", widthIn: 3, heightIn: 3, note: "front of a typical 8–10 oz candle" },
  { id: "tube", label: "Tube or lip balm", widthIn: 2, heightIn: 1, note: "wraps a small tube" },
  { id: "pouch", label: "Pouch or bag", widthIn: 4, heightIn: 6, note: "front panel of a stand-up pouch" },
  { id: "box", label: "Box or carton", widthIn: 4, heightIn: 3, note: "a product or ingredient panel" },
  { id: "shipping", label: "Shipping label", widthIn: 4, heightIn: 6, note: "standard 4×6 thermal shipping label" },
  { id: "barcode", label: "Barcode / price label", widthIn: 2.25, heightIn: 1.25, note: "standard retail barcode size" },
];
