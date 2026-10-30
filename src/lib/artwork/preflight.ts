import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import type { ArtworkRecord } from "../quotes/model";

// Automated preflight. Checks what a machine can check; anything it can't
// determine becomes a note for a human rather than a pass.
//
// Rules (placeholder values until Label Source confirms their spec):
//   - Accepted: PDF, AI, EPS (vector preferred); PNG, JPG, TIFF (raster) at >= 300 dpi at label size
//   - Bleed: 0.125" on every side
//   - Dimensions must match the label size + bleed within 0.05"

export const BLEED_IN = 0.125;
const MIN_DPI = 300;
const TOLERANCE_IN = 0.05;

const RASTER = new Set(["image/png", "image/jpeg", "image/tiff", "image/webp"]);

export async function preflight(
  file: { name: string; mime: string; bytes: Buffer },
  labelWidthIn: number,
  labelHeightIn: number,
): Promise<Omit<ArtworkRecord, "uploadedAt" | "storedPath">> {
  const issues: string[] = [];
  const notes: string[] = [];
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const wantW = labelWidthIn + 2 * BLEED_IN;
  const wantH = labelHeightIn + 2 * BLEED_IN;
  let pixelWidth: number | undefined;
  let pixelHeight: number | undefined;
  let effectiveDpi: number | undefined;
  let dataUrl: string | undefined;

  const isPdf = file.mime === "application/pdf" || ext === "pdf";
  const isAi = ext === "ai";
  const isEps = ext === "eps" || file.mime === "application/postscript";

  if (isPdf || isAi) {
    // .ai files saved with PDF compatibility parse as PDF; otherwise fall through to human check.
    try {
      const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
      const pages = doc.getPageCount();
      if (pages !== 1) issues.push(`The file has ${pages} pages; we need a single-page file with one label.`);
      const page = doc.getPage(0);
      const { width, height } = page.getSize(); // points, 72/in
      const wIn = width / 72;
      const hIn = height / 72;
      const matches =
        (close(wIn, wantW) && close(hIn, wantH)) || (close(wIn, wantH) && close(hIn, wantW));
      const matchesNoBleed =
        (close(wIn, labelWidthIn) && close(hIn, labelHeightIn)) ||
        (close(wIn, labelHeightIn) && close(hIn, labelWidthIn));
      if (matches) notes.push(`Page size ${wIn.toFixed(3)}" × ${hIn.toFixed(3)}" matches the label plus ${BLEED_IN}" bleed.`);
      else if (matchesNoBleed)
        issues.push(
          `Your file is exactly the label size (${wIn.toFixed(2)}" × ${hIn.toFixed(2)}"). Please add ${BLEED_IN}" of bleed on every side so the final page is ${wantW.toFixed(3)}" × ${wantH.toFixed(3)}".`,
        );
      else
        issues.push(
          `Page size is ${wIn.toFixed(2)}" × ${hIn.toFixed(2)}" but the label is ${labelWidthIn}" × ${labelHeightIn}" (we need ${wantW.toFixed(3)}" × ${wantH.toFixed(3)}" including bleed).`,
        );
      notes.push("Fonts and colour mode are confirmed by our prepress team before printing.");
    } catch {
      if (isAi) notes.push("Illustrator file received. It wasn't saved with PDF compatibility, so our prepress team will open it to confirm size and fonts.");
      else issues.push("We couldn't open this PDF. Please re-export it (PDF/X-4 is ideal) and upload again.");
    }
  } else if (isEps) {
    notes.push("EPS file received. Vector files print cleanly at any size; our prepress team will confirm the page size and fonts.");
  } else if (RASTER.has(file.mime)) {
    try {
      const img = sharp(file.bytes);
      const meta = await img.metadata();
      pixelWidth = meta.width;
      pixelHeight = meta.height;
      if (pixelWidth && pixelHeight) {
        // Effective dpi at the label size (the orientation that fits better).
        const dpiA = Math.min(pixelWidth / wantW, pixelHeight / wantH);
        const dpiB = Math.min(pixelWidth / wantH, pixelHeight / wantW);
        effectiveDpi = Math.round(Math.max(dpiA, dpiB));
        if (effectiveDpi < MIN_DPI)
          issues.push(
            `This image is ${pixelWidth} × ${pixelHeight} px, which is about ${effectiveDpi} dpi at ${labelWidthIn}" × ${labelHeightIn}". We need ${MIN_DPI} dpi (at least ${Math.ceil(wantW * MIN_DPI)} × ${Math.ceil(wantH * MIN_DPI)} px) or it will print soft.`,
          );
        else notes.push(`${pixelWidth} × ${pixelHeight} px gives about ${effectiveDpi} dpi at label size. Good.`);
        const ratioImg = pixelWidth / pixelHeight;
        const ratioWant = wantW / wantH;
        const ratioOk = close(ratioImg, ratioWant, 0.03) || close(ratioImg, 1 / ratioWant, 0.03);
        if (!ratioOk) issues.push("The image proportions don't match the label. It would be stretched or cropped; please resize the artwork to the label shape.");
      }
      if (meta.space && meta.space !== "cmyk") notes.push("Image is RGB. We convert to CMYK for press; bright blues and greens can shift slightly.");
      const preview = await img.resize({ width: 800, withoutEnlargement: true }).png().toBuffer();
      dataUrl = `data:image/png;base64,${preview.toString("base64")}`;
    } catch {
      issues.push("We couldn't read this image file. Please upload a PNG, JPG or PDF.");
    }
  } else {
    issues.push(`"${file.name}" isn't a file type we can print from. Please upload a PDF, AI, EPS, PNG or JPG.`);
  }

  if (file.bytes.length > 60 * 1024 * 1024) issues.push("File is over 60 MB. Please flatten or compress it.");

  return {
    fileName: file.name,
    mime: file.mime,
    bytes: file.bytes.length,
    pixelWidth,
    pixelHeight,
    effectiveDpi,
    dataUrl,
    preflight: { ok: issues.length === 0, issues, notes },
  };
}

function close(a: number, b: number, tol = TOLERANCE_IN) {
  return Math.abs(a - b) <= tol;
}
