// Plain-language answers the assistant can give. This is the start of the
// "how Label Source advises customers" knowledge base: placeholder wording for
// the demo, to be reviewed and replaced after the working session with the owners.

export const KNOWLEDGE: Record<string, { title: string; text: string }> = {
  materials: {
    title: "Label materials",
    text: [
      "Semi-gloss white paper: bright, sharp colour at the best price. Great for dry, indoor products (boxes, jars on a shelf). Not for anything that gets wet.",
      "White BOPP (waterproof film): a thin plastic face that won't tear, wrinkle or smear when wet. The go-to for fridges, coolers, bathrooms, squeeze bottles and most food and cosmetic products.",
      "Clear film: transparent, so only your design shows. Gives the 'no-label' look on glass and clear plastic. Colours are printed over a layer of white so they stay bright.",
      "White vinyl: the toughest face stock, for outdoors, sun, heat and rough handling.",
      "Thermal transfer paper: for customers who print their own labels on a thermal printer with a ribbon (barcodes, lot numbers, shipping). Sharp and long-lasting.",
      "Direct thermal paper: prints with heat alone, no ribbon. Ideal for shipping labels; the print fades over months in sunlight, so not for long-life product labels.",
    ].join("\n"),
  },
  adhesives: {
    title: "Adhesives",
    text: [
      "Permanent: the standard. Stays put on clean, dry surfaces at room temperature or in a fridge.",
      "Removable: peels off cleanly without residue. For price stickers, temporary or reusable containers.",
      "Freezer-grade: stays stuck well below zero, even when applied to cold or frosty surfaces. Normal glue lets go in a freezer.",
      "High-temperature: for labels near heat, like candles, engines or dishwashers.",
      "Extreme-moisture: for wet, flexing surfaces like squeeze bottles in a shower, so edges don't lift.",
    ].join("\n"),
  },
  finishes: {
    title: "Finishes (laminate and coatings)",
    text: [
      "Gloss laminate: a clear protective film over the print. Shiny, vivid colour, and stops ink smearing or scuffing when the label is wet or handled.",
      "Matte laminate: the same protection with a soft, non-shiny look. Popular for premium cosmetics, coffee and spirits.",
      "UV coating: a lighter protective varnish. Cheaper than laminate, good scuff resistance, less water protection.",
      "No coating: fine for dry, indoor labels that aren't handled much.",
    ].join("\n"),
  },
  printing: {
    title: "Print options",
    text: [
      "Full colour (CMYK): photos, gradients and any number of colours at one price.",
      "One or two colours: cheaper for simple text or logo designs.",
      "White underprint: on clear or metallic stock we print a layer of white under your colours so they stay bright instead of see-through.",
      "Blank: no printing; you print them yourself on your own printer.",
    ].join("\n"),
  },
  shapes: {
    title: "Shapes and corners",
    text: [
      "Rectangles and squares are standard. Rounded corners (usually 1/8\" radius) cost nothing extra and look more finished.",
      "Circles and ovals are popular for jar lids and bottle necks. We have common sizes on hand; an unusual size needs a cutting die, which is a one-time charge and reorders don't pay it again.",
      "Custom shapes (die-cut to your logo outline) are quoted by a person.",
    ].join("\n"),
  },
  sizing: {
    title: "Choosing a size",
    text: [
      "Measure the flat area where the label will sit (on a bottle, the straight part between the curves), then subtract a little so it doesn't overhang.",
      "Common sizes: 2\" × 1\" for small dropper bottles and tubes, 3\" × 2\" for 100–250 ml bottles, 4\" × 3\" for 250–500 ml bottles and jars, 3\" × 3\" or 3\" circles for candles and jar fronts, 4\" × 6\" for shipping labels and pouches.",
      "Sticking to a standard size avoids a one-time die charge.",
    ].join("\n"),
  },
  rolls: {
    title: "Rolls, cores and wind direction",
    text: [
      "Labels come on rolls. The core is the cardboard tube in the middle: 3\" is standard for hand application and applicator machines; desktop printers usually need 1\".",
      "Wind direction is which way the label faces as it comes off the roll. It only matters if you use a printer or an applicator; we confirm it against your machine before printing.",
    ].join("\n"),
  },
  artwork: {
    title: "Artwork files",
    text: [
      "Best: a vector PDF, AI or EPS file with fonts converted to outlines. PNG or JPG works if it's at least 300 dpi at the final label size.",
      "Add 1/8\" (0.125\") of bleed on every side, meaning extend the background past the edge so there's no white sliver when it's trimmed. Keep text 1/16\" inside the edge.",
      "After you upload, we check the file automatically and show you a proof to approve before you pay.",
      "No print-ready file? Label Source's design team can create one; that's quoted separately.",
    ].join("\n"),
  },
  turnaround_and_ordering: {
    title: "Turnaround, minimums and ordering",
    text: [
      "Standard turnaround is about 5 business days for small runs, 7 for up to 10,000, 10 for up to 50,000 and 15 above that, after proof approval.",
      "There's a minimum order value; tiny runs are adjusted up to it, and adding labels at that point usually costs very little.",
      "Quotes are firm for 30 days. You approve a proof and pay online; shipping is calculated at checkout and we ship Canada-wide from Winnipeg.",
    ].join("\n"),
  },
  regulated: {
    title: "Regulated products",
    text: "Food, cannabis, cosmetics, supplements and chemicals have labelling rules (ingredient lists, warnings, bilingual text). We can't give legal advice, but our team checks the label against the common requirements with you before anything prints.",
  },
};

export const KNOWLEDGE_TOPICS = Object.keys(KNOWLEDGE);
