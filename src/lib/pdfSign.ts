import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ContractField } from "./types";

export interface SignerFields {
  fullName?: string;
  address?: string;
  phone?: string;
}

/**
 * Stamps values directly at the field positions the admin placed on the
 * contract PDF. Coordinates are stored as ratios of the page size, so we
 * map them to the actual PDF point units of each page.
 */
export async function stampFieldsInPdf(
  pdfDataUrl: string,
  fields: ContractField[],
  values: Record<string, string>
): Promise<string> {
  if (!fields.length) return pdfDataUrl;
  try {
    const pdfBytes = Buffer.from(pdfDataUrl.split(",")[1] ?? "", "base64");
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const ink = rgb(0.05, 0.05, 0.1);

    for (const f of fields) {
      const value = values[f.id];
      if (!value) continue;
      const page = pages[(f.page ?? 1) - 1];
      if (!page) continue;
      const { width: pw, height: ph } = page.getSize();
      const x = f.xRatio * pw;
      const w = f.wRatio * pw;
      const h = f.hRatio * ph;
      // PDF origin is bottom-left, ratios are top-left.
      const y = ph - f.yRatio * ph - h;

      if (f.type === "signature") {
        try {
          const b64 = value.split(",")[1] ?? "";
          if (!b64) continue;
          const bytes = Buffer.from(b64, "base64");
          const img = value.includes("image/jpeg")
            ? await pdf.embedJpg(bytes)
            : await pdf.embedPng(bytes);
          // Fit signature inside the box preserving aspect ratio.
          const ratio = img.height / img.width;
          let drawW = w;
          let drawH = drawW * ratio;
          if (drawH > h) {
            drawH = h;
            drawW = drawH / ratio;
          }
          page.drawImage(img, {
            x: x + (w - drawW) / 2,
            y: y + (h - drawH) / 2,
            width: drawW,
            height: drawH,
          });
        } catch {
          /* skip bad signature image */
        }
      } else {
        const size = Math.min(h * 0.65, 12);
        page.drawText(value, {
          x: x + 2,
          y: y + (h - size) / 2,
          size,
          font,
          color: ink,
        });
      }
    }

    const out = await pdf.save();
    return `data:application/pdf;base64,${Buffer.from(out).toString("base64")}`;
  } catch {
    return pdfDataUrl;
  }
}

/**
 * Embeds the drawn signature image, signer name, date, and any filled-in
 * fields (legal name, address, phone) onto the last page of a contract PDF.
 * Returns a new base64 data URL. If the source PDF can't be parsed, returns
 * the original unchanged (signing still proceeds).
 */
export async function stampSignature(
  pdfDataUrl: string,
  signatureDataUrl: string,
  signerName: string,
  fields?: SignerFields
): Promise<string> {
  try {
    const pdfBytes = Buffer.from(pdfDataUrl.split(",")[1] ?? "", "base64");
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();
    const page = pages[pages.length - 1];
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const b64 = signatureDataUrl.split(",")[1] ?? "";
    const imgBytes = Buffer.from(b64, "base64");
    const sigImg = signatureDataUrl.includes("image/png")
      ? await pdf.embedPng(imgBytes)
      : await pdf.embedJpg(imgBytes);

    const sigW = 150;
    const sigH = (sigImg.height / sigImg.width) * sigW;
    const x = 60;
    let y = 70;

    // Field block first (above the signature) when supplied.
    const lines: Array<[string, string]> = [];
    if (fields?.fullName) lines.push(["Full legal name:", fields.fullName]);
    if (fields?.address) lines.push(["Address:", fields.address]);
    if (fields?.phone) lines.push(["Phone:", fields.phone]);

    const labelColor = rgb(0.35, 0.35, 0.4);
    const valueColor = rgb(0.15, 0.15, 0.2);

    if (lines.length > 0) {
      // Reserve vertical space for the field lines above the signature.
      const blockTopY = y + sigH + 14 + 14 * lines.length + 10;
      let ly = blockTopY;
      for (const [label, value] of lines) {
        page.drawText(label, {
          x,
          y: ly,
          size: 9,
          font: fontBold,
          color: labelColor,
        });
        page.drawText(value, {
          x: x + 90,
          y: ly,
          size: 9,
          font,
          color: valueColor,
        });
        ly -= 14;
      }
    }

    page.drawText("Signed by:", {
      x,
      y: y + sigH + 6,
      size: 9,
      font: fontBold,
      color: labelColor,
    });
    page.drawImage(sigImg, { x, y, width: sigW, height: sigH });
    page.drawLine({
      start: { x, y: y - 4 },
      end: { x: x + sigW, y: y - 4 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.75),
    });
    page.drawText(`${signerName} — ${new Date().toLocaleString()}`, {
      x,
      y: y - 16,
      size: 9,
      font,
      color: valueColor,
    });

    const out = await pdf.save();
    return `data:application/pdf;base64,${Buffer.from(out).toString("base64")}`;
  } catch {
    return pdfDataUrl;
  }
}
